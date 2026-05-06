import pool from "../config/database.js";
import {
  PRIVACY_POLICY_VERSION,
  TERMS_OF_SERVICE_VERSION,
  hasAcceptedCurrentLegalDocuments,
} from "../config/legal.js";
import { verifyToken } from "../utils/jwt.js";

export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res
        .status(401)
        .json({ status: "ERROR", message: "Token nao fornecido" });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res
        .status(401)
        .json({ status: "ERROR", message: "Token invalido ou expirado" });
    }

    const result = await pool.query(
      `SELECT
        id,
        name,
        email,
        email_verified,
        terms_of_service_accepted_at,
        terms_of_service_version,
        privacy_policy_accepted_at,
        privacy_policy_version,
        legal_acceptance_ip,
        legal_acceptance_user_agent
      FROM users
      WHERE id = $1`,
      [decoded.id],
    );

    if (result.rows.length === 0) {
      return res
        .status(401)
        .json({ status: "ERROR", message: "Sessao invalida" });
    }

    const user = result.rows[0];

    if (user.email !== decoded.email) {
      return res.status(401).json({
        status: "ERROR",
        message: "Sessao invalida. Faca login novamente.",
      });
    }

    if (!user.email_verified) {
      return res.status(403).json({
        status: "ERROR",
        code: "EMAIL_NOT_VERIFIED",
        message: "Confirme seu email antes de acessar a conta",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Erro ao validar autenticacao",
    });
  }
};

export const requireAcceptedLegalDocuments = (req, res, next) => {
  if (hasAcceptedCurrentLegalDocuments(req.user)) {
    return next();
  }

  return res.status(403).json({
    status: "ERROR",
    code: "LEGAL_ACCEPTANCE_REQUIRED",
    message: "Aceite os Termos de Servico e a Politica de Privacidade para continuar.",
    required_versions: {
      terms_of_service: TERMS_OF_SERVICE_VERSION,
      privacy_policy: PRIVACY_POLICY_VERSION,
    },
  });
};

export const errorHandler = (err, req, res, next) => {
  console.error("Error:", err);

  const status = err.status || 500;
  const message = err.message || "Erro interno do servidor";

  res.status(status).json({
    status: "ERROR",
    message,
  });
};
