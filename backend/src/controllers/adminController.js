import pool from "../config/database.js";
import { hashPassword } from "../utils/password.js";

// Get all users
export const getAllUsers = async (req, res) => {
  try {
    const userId = req.user.id;

    // Verificar se o usuário é admin
    const adminCheck = await pool.query(
      "SELECT is_admin FROM users WHERE id = $1",
      [userId],
    );

    if (!adminCheck.rows[0]?.is_admin) {
      return res.status(403).json({
        status: "ERROR",
        message: "Apenas administradores podem acessar esta rota",
      });
    }

    const result = await pool.query(
      "SELECT id, name, email, email_verified, is_admin, created_at FROM users ORDER BY created_at DESC",
    );

    res.json({
      status: "OK",
      users: result.rows,
    });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Erro ao buscar usuários",
    });
  }
};

// Reset user password
export const resetUserPassword = async (req, res) => {
  try {
    const { targetUserId } = req.body;
    const adminId = req.user.id;

    // Verificar se o usuário é admin
    const adminCheck = await pool.query(
      "SELECT is_admin FROM users WHERE id = $1",
      [adminId],
    );

    if (!adminCheck.rows[0]?.is_admin) {
      return res.status(403).json({
        status: "ERROR",
        message: "Apenas administradores podem resetar senhas",
      });
    }

    // Verificar se o usuário alvo existe
    const userExists = await pool.query("SELECT id FROM users WHERE id = $1", [
      targetUserId,
    ]);

    if (userExists.rows.length === 0) {
      return res.status(404).json({
        status: "ERROR",
        message: "Usuário não encontrado",
      });
    }

    // Gerar nova senha aleatória
    const newPassword = Math.random().toString(36).slice(-10);
    const hashedPassword = await hashPassword(newPassword);

    // Atualizar senha no banco
    await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [
      hashedPassword,
      targetUserId,
    ]);

    res.json({
      status: "OK",
      message: "Senha resetada com sucesso",
      newPassword: newPassword,
      warning:
        "⚠️ Mostre esta senha ao usuário apenas uma vez. Ele deve alterá-la no login.",
    });
  } catch (error) {
    console.error("Reset user password error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Erro ao resetar senha",
    });
  }
};
