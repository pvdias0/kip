import crypto from "crypto";
import pool from "../config/database.js";
import { sendPasswordResetEmail } from "../utils/email.js";
import bcrypt from "bcryptjs";

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        status: "ERROR",
        message: "Email é obrigatório",
      });
    }

    // Check if user exists
    const userResult = await pool.query("SELECT id FROM users WHERE email = $1", [
      email,
    ]);

    if (userResult.rows.length === 0) {
      // Don't reveal if email exists or not (security best practice)
      return res.status(200).json({
        status: "OK",
        message: "Se o email existe em nossa base, você receberá um link de recuperação",
      });
    }

    const userId = userResult.rows[0].id;

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    const tokenExpiration = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save reset token to database
    await pool.query(
      "UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3",
      [resetTokenHash, tokenExpiration, userId]
    );

    // Send email
    await sendPasswordResetEmail(email, resetToken);

    res.status(200).json({
      status: "OK",
      message: "Se o email existe em nossa base, você receberá um link de recuperação",
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({
      status: "ERROR",
      message: "Erro ao processar solicitação de recuperação",
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token || !password || !confirmPassword) {
      return res.status(400).json({
        status: "ERROR",
        message: "Token, senha e confirmação são obrigatórios",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        status: "ERROR",
        message: "As senhas não conferem",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        status: "ERROR",
        message: "A senha deve ter pelo menos 6 caracteres",
      });
    }

    // Hash the token to compare with database
    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Find user with valid reset token
    const userResult = await pool.query(
      `SELECT id FROM users 
       WHERE reset_token = $1 AND reset_token_expires > NOW()`,
      [tokenHash]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({
        status: "ERROR",
        message: "Token inválido ou expirado",
      });
    }

    const userId = userResult.rows[0].id;

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password and clear reset token
    await pool.query(
      `UPDATE users 
       SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL 
       WHERE id = $2`,
      [hashedPassword, userId]
    );

    res.status(200).json({
      status: "OK",
      message: "Senha redefinida com sucesso! Você pode fazer login agora.",
    });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({
      status: "ERROR",
      message: "Erro ao redefinir senha",
    });
  }
};

export const validateResetToken = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        status: "ERROR",
        message: "Token é obrigatório",
      });
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const result = await pool.query(
      `SELECT id FROM users 
       WHERE reset_token = $1 AND reset_token_expires > NOW()`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        status: "ERROR",
        message: "Token inválido ou expirado",
      });
    }

    res.status(200).json({
      status: "OK",
      message: "Token válido",
    });
  } catch (err) {
    console.error("Validate token error:", err);
    res.status(500).json({
      status: "ERROR",
      message: "Erro ao validar token",
    });
  }
};
