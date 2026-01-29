import pool from '../config/database.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateToken } from '../utils/jwt.js';

// Register
export const register = async (req, res, next) => {
  try {
    const { username, password, fullName } = req.body;

    // Validate inputs
    if (!username || !password || !fullName) {
      return res.status(400).json({
        status: 'ERROR',
        message: 'Username, password e fullName são obrigatórios',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        status: 'ERROR',
        message: 'Senha deve ter pelo menos 6 caracteres',
      });
    }

    // Check if user exists
    const userExists = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );

    if (userExists.rows.length > 0) {
      return res.status(409).json({
        status: 'ERROR',
        message: 'Usuário já existe',
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const result = await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
      [username, passwordHash]
    );

    const user = result.rows[0];
    const token = generateToken(user.id, user.username);

    res.status(201).json({
      status: 'OK',
      message: 'Usuário criado com sucesso',
      user: {
        id: user.id,
        email: user.username,
        fullName: fullName || username,
      },
      token,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Erro ao criar usuário',
    });
  }
};

// Login
export const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Validate inputs
    if (!username || !password) {
      return res.status(400).json({
        status: 'ERROR',
        message: 'Username e password são obrigatórios',
      });
    }

    // Find user
    const result = await pool.query(
      'SELECT id, username, password_hash FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        status: 'ERROR',
        message: 'Credenciais inválidas',
      });
    }

    const user = result.rows[0];

    // Verify password
    const passwordMatch = await comparePassword(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        status: 'ERROR',
        message: 'Credenciais inválidas',
      });
    }

    // Generate token
    const token = generateToken(user.id, user.username);

    res.status(200).json({
      status: 'OK',
      message: 'Login realizado com sucesso',
      user: {
        id: user.id,
        email: user.username,
        fullName: user.username,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Erro ao fazer login',
    });
  }
};
