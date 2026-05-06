import crypto from "crypto";
import pool from "../config/database.js";
import {
  PRIVACY_POLICY_VERSION,
  TERMS_OF_SERVICE_VERSION,
  hasAcceptedCurrentLegalDocuments,
} from "../config/legal.js";
import { hashPassword, comparePassword } from "../utils/password.js";
import { generateToken } from "../utils/jwt.js";
import { ensureDefaultPaymentMethodsForUser } from "../utils/paymentMethods.js";
import { sendEmailVerificationEmail } from "../utils/email.js";

const EMAIL_VERIFICATION_WINDOW_HOURS = 24;

function createEmailVerificationToken() {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const tokenExpiresAt = new Date(
    Date.now() + EMAIL_VERIFICATION_WINDOW_HOURS * 60 * 60 * 1000,
  );

  return {
    token,
    tokenHash,
    tokenExpiresAt,
  };
}

function serializeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    email_verified: user.email_verified,
    terms_of_service_accepted_at: user.terms_of_service_accepted_at,
    terms_of_service_version: user.terms_of_service_version,
    privacy_policy_accepted_at: user.privacy_policy_accepted_at,
    privacy_policy_version: user.privacy_policy_version,
    has_accepted_legal_documents: hasAcceptedCurrentLegalDocuments(user),
  };
}

// Register
export const register = async (req, res, next) => {
  const {
    name,
    email,
    password,
    termsAccepted,
    privacyAccepted,
    termsVersion,
    privacyVersion,
  } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      status: "ERROR",
      message: "Nome, email e password sao obrigatorios",
    });
  }

  if (
    termsAccepted !== true ||
    privacyAccepted !== true ||
    termsVersion !== TERMS_OF_SERVICE_VERSION ||
    privacyVersion !== PRIVACY_POLICY_VERSION
  ) {
    return res.status(400).json({
      status: "ERROR",
      message: "Voce precisa aceitar os Termos de Servico e a Politica de Privacidade atuais.",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    if (password.length < 6) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        status: "ERROR",
        message: "Senha deve ter pelo menos 6 caracteres",
      });
    }

    // Check if user exists
    const userExists = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [email],
    );

    if (userExists.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        status: "ERROR",
        message: "Email ja cadastrado",
      });
    }

    const passwordHash = await hashPassword(password);
    const { token, tokenHash, tokenExpiresAt } = createEmailVerificationToken();

    const result = await client.query(
      `INSERT INTO users (
        name,
        email,
        password_hash,
        email_verified,
        email_verification_token,
        email_verification_expires,
        terms_of_service_accepted_at,
        terms_of_service_version,
        privacy_policy_accepted_at,
        privacy_policy_version,
        legal_acceptance_ip,
        legal_acceptance_user_agent
      )
      VALUES ($1, $2, $3, FALSE, $4, $5, NOW(), $6, NOW(), $7, $8, $9)
      RETURNING
        id,
        name,
        email,
        email_verified,
        terms_of_service_accepted_at,
        terms_of_service_version,
        privacy_policy_accepted_at,
        privacy_policy_version`,
      [
        name.trim(),
        email,
        passwordHash,
        tokenHash,
        tokenExpiresAt,
        TERMS_OF_SERVICE_VERSION,
        PRIVACY_POLICY_VERSION,
        req.ip ?? null,
        req.get("user-agent")?.slice(0, 255) ?? null,
      ],
    );

    const user = result.rows[0];
    await ensureDefaultPaymentMethodsForUser(user.id, client);
    await sendEmailVerificationEmail(user.email, user.name, token);
    await client.query("COMMIT");

    res.status(201).json({
      status: "OK",
      message: "Conta criada. Confirme seu email antes de entrar.",
      requires_email_verification: true,
      user: serializeUser(user),
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Register error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Erro ao criar usuário",
    });
  } finally {
    client.release();
  }
};

// Login
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: "ERROR",
        message: "Email e password sao obrigatorios",
      });
    }

    const result = await pool.query(
      `SELECT
        id,
        name,
        email,
        password_hash,
        email_verified,
        terms_of_service_accepted_at,
        terms_of_service_version,
        privacy_policy_accepted_at,
        privacy_policy_version
      FROM users
      WHERE email = $1`,
      [email],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        status: "ERROR",
        message: "Credenciais invalidas",
      });
    }

    const user = result.rows[0];
    const passwordMatch = await comparePassword(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({
        status: "ERROR",
        message: "Credenciais invalidas",
      });
    }

    if (!user.email_verified) {
      return res.status(403).json({
        status: "ERROR",
        code: "EMAIL_NOT_VERIFIED",
        message: "Confirme seu email antes de entrar na conta",
      });
    }

    const token = generateToken(user.id, user.email);

    res.status(200).json({
      status: "OK",
      message: "Login realizado com sucesso",
      user: serializeUser(user),
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Erro ao fazer login",
    });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (typeof token !== "string" || token.length !== 64) {
      return res.status(400).json({
        status: "ERROR",
        message: "Token de verificacao invalido",
      });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const result = await pool.query(
      `UPDATE users
       SET email_verified = TRUE,
           email_verification_token = NULL,
           email_verification_expires = NULL
       WHERE email_verification_token = $1
         AND email_verification_expires > NOW()
         AND email_verified = FALSE
       RETURNING
         id,
         name,
         email,
         email_verified,
         terms_of_service_accepted_at,
         terms_of_service_version,
         privacy_policy_accepted_at,
         privacy_policy_version`,
      [tokenHash],
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        status: "ERROR",
      message: "Link de confirmacao invalido ou expirado",
      });
    }

    res.status(200).json({
      status: "OK",
      message: "Email confirmado com sucesso. Voce ja pode entrar na sua conta.",
      user: serializeUser(result.rows[0]),
    });
  } catch (error) {
    console.error("Verify email error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Erro ao confirmar email",
    });
  }
};

export const getProfile = async (req, res) => {
  res.status(200).json({
    status: "OK",
    user: serializeUser(req.user),
  });
};

export const acceptLegalDocuments = async (req, res) => {
  try {
    const { termsAccepted, privacyAccepted, termsVersion, privacyVersion } = req.body;

    if (
      termsAccepted !== true ||
      privacyAccepted !== true ||
      termsVersion !== TERMS_OF_SERVICE_VERSION ||
      privacyVersion !== PRIVACY_POLICY_VERSION
    ) {
      return res.status(400).json({
        status: "ERROR",
        message: "Os documentos legais atuais precisam ser aceitos integralmente.",
      });
    }

    const result = await pool.query(
      `UPDATE users
       SET terms_of_service_accepted_at = NOW(),
           terms_of_service_version = $1,
           privacy_policy_accepted_at = NOW(),
           privacy_policy_version = $2,
           legal_acceptance_ip = $3,
           legal_acceptance_user_agent = $4
       WHERE id = $5
       RETURNING
         id,
         name,
         email,
         email_verified,
         terms_of_service_accepted_at,
         terms_of_service_version,
         privacy_policy_accepted_at,
         privacy_policy_version`,
      [
        TERMS_OF_SERVICE_VERSION,
        PRIVACY_POLICY_VERSION,
        req.ip ?? null,
        req.get("user-agent")?.slice(0, 255) ?? null,
        req.user.id,
      ],
    );

    res.status(200).json({
      status: "OK",
      message: "Aceite registrado com sucesso.",
      user: serializeUser(result.rows[0]),
    });
  } catch (error) {
    console.error("Legal acceptance error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Erro ao registrar aceite legal",
    });
  }
};

export const updateProfile = async (req, res) => {
  const client = await pool.connect();

  try {
    const userId = req.user.id;
    const { name, email } = req.body;

    await client.query("BEGIN");

    const currentUserResult = await client.query(
      `SELECT
        id,
        name,
        email,
        email_verified,
        terms_of_service_accepted_at,
        terms_of_service_version,
        privacy_policy_accepted_at,
        privacy_policy_version
      FROM users
      WHERE id = $1`,
      [userId],
    );

    if (currentUserResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        status: "ERROR",
        message: "Usuario nao encontrado",
      });
    }

    const currentUser = currentUserResult.rows[0];
    const normalizedName = name.trim();
    const emailChanged = currentUser.email !== email;

    const emailConflict = await client.query(
      "SELECT id FROM users WHERE email = $1 AND id <> $2",
      [email, userId],
    );

    if (emailConflict.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        status: "ERROR",
        message: "Este email ja esta em uso",
      });
    }

    let updatedUser;

    if (emailChanged) {
      const { token, tokenHash, tokenExpiresAt } = createEmailVerificationToken();

      const updateResult = await client.query(
        `UPDATE users
         SET name = $1,
             email = $2,
             email_verified = FALSE,
             email_verification_token = $3,
             email_verification_expires = $4
         WHERE id = $5
         RETURNING
           id,
           name,
           email,
           email_verified,
           terms_of_service_accepted_at,
           terms_of_service_version,
           privacy_policy_accepted_at,
           privacy_policy_version`,
        [normalizedName, email, tokenHash, tokenExpiresAt, userId],
      );

      updatedUser = updateResult.rows[0];
      await sendEmailVerificationEmail(updatedUser.email, updatedUser.name, token);
    } else {
      const updateResult = await client.query(
        `UPDATE users
         SET name = $1
         WHERE id = $2
         RETURNING
           id,
           name,
           email,
           email_verified,
           terms_of_service_accepted_at,
           terms_of_service_version,
           privacy_policy_accepted_at,
           privacy_policy_version`,
        [normalizedName, userId],
      );

      updatedUser = updateResult.rows[0];
    }

    await client.query("COMMIT");

    res.status(200).json({
      status: "OK",
      message: emailChanged
        ? "Perfil atualizado. Confirme o novo email para entrar novamente."
        : "Perfil atualizado com sucesso",
      requires_email_verification: emailChanged,
      user: serializeUser(updatedUser),
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Update profile error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Erro ao atualizar perfil",
    });
  } finally {
    client.release();
  }
};

export const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (currentPassword === newPassword) {
      return res.status(400).json({
        status: "ERROR",
        message: "A nova senha deve ser diferente da atual",
      });
    }

    const result = await pool.query(
      "SELECT password_hash FROM users WHERE id = $1",
      [userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: "ERROR",
        message: "Usuario nao encontrado",
      });
    }

    const passwordMatch = await comparePassword(
      currentPassword,
      result.rows[0].password_hash,
    );

    if (!passwordMatch) {
      return res.status(401).json({
        status: "ERROR",
        message: "Senha atual incorreta",
      });
    }

    const newPasswordHash = await hashPassword(newPassword);

    await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [
      newPasswordHash,
      userId,
    ]);

    res.status(200).json({
      status: "OK",
      message: "Senha atualizada com sucesso",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Erro ao atualizar senha",
    });
  }
};
