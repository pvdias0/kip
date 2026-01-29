import { verifyToken } from '../utils/jwt.js';

export const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ status: 'ERROR', message: 'Token não fornecido' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ status: 'ERROR', message: 'Token inválido ou expirado' });
  }

  req.user = decoded;
  next();
};

export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  
  const status = err.status || 500;
  const message = err.message || 'Erro interno do servidor';

  res.status(status).json({
    status: 'ERROR',
    message,
  });
};
