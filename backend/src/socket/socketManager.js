import { Server } from 'socket.io';
import { verifyToken } from '../utils/jwt.js';

let io;
const connectedUsers = new Map(); // userId -> Set of socketIds

export function initializeSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:8080',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
  });

  // Middleware de autenticação
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Token de autenticação não fornecido'));
    }

    try {
      const decoded = verifyToken(token);
      socket.userId = decoded.userId;
      socket.userEmail = decoded.email;
      next();
    } catch (err) {
      next(new Error('Token inválido'));
    }
  });

  // Conexão
  io.on('connection', (socket) => {
    console.log(`[Socket] Usuário ${socket.userId} conectado: ${socket.id}`);

    // Adicionar usuário aos conectados
    if (!connectedUsers.has(socket.userId)) {
      connectedUsers.set(socket.userId, new Set());
    }
    connectedUsers.get(socket.userId).add(socket.id);

    // Desconexão
    socket.on('disconnect', () => {
      console.log(`[Socket] Usuário ${socket.userId} desconectado: ${socket.id}`);
      const userSockets = connectedUsers.get(socket.userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          connectedUsers.delete(socket.userId);
        }
      }
    });
  });

  return io;
}

// Emitir evento para um usuário específico
export function emitToUser(userId, event, data) {
  if (io) {
    const userSockets = connectedUsers.get(userId);
    if (userSockets) {
      userSockets.forEach((socketId) => {
        io.to(socketId).emit(event, data);
      });
    }
  }
}

// Emitir evento para todos os usuários conectados
export function emitToAll(event, data) {
  if (io) {
    io.emit(event, data);
  }
}

// Obter instância do io
export function getIO() {
  return io;
}
