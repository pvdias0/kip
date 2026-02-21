import { Server } from 'socket.io';
import { verifyToken } from './jwt.js';

let io = null;
const userSockets = new Map(); // Map<userId, Set<socketIds>>

export function initializeSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || ['https://kip.pvapps.com.br', 'http://localhost:3000', 'http://localhost:8080'],
      credentials: true,
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    },
    transports: ['websocket', 'polling'],
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  // Middleware de autenticação JWT
  io.use((socket, next) => {
    console.log('[Socket] 🔍 Middleware - verificando autenticação...');
    console.log('[Socket] Auth object:', socket.handshake.auth);
    
    const token = socket.handshake.auth.token;
    
    console.log('[Socket] Token recebido?', !!token);
    console.log('[Socket] Token (primeiros 20 chars):', token ? token.substring(0, 20) + '...' : 'NENHUM');
    
    if (!token) {
      console.warn('[Socket] ❌ Token não fornecido na conexão');
      return next(new Error('Token de autenticação não fornecido'));
    }

    try {
      const decoded = verifyToken(token);
      console.log('[Socket] 🔓 Token verificado:', decoded);
      
      if (!decoded) {
        console.warn('[Socket] ❌ Token inválido:', token.substring(0, 20) + '...');
        return next(new Error('Token inválido ou expirado'));
      }
      
      socket.userId = decoded.id; // JWT usa 'id' não 'userId'
      socket.userEmail = decoded.email;
      console.log(`[Socket] ✅ Usuário ${socket.userId} autenticado com sucesso`);
      next();
    } catch (err) {
      console.error('[Socket] ❌ Erro ao verificar token:', err.message);
      next(new Error('Erro na autenticação'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    console.log(`[Socket] ✅ Usuário autenticado ${userId} conectado: ${socket.id}`);

    // Join user room
    socket.join(`user_${userId}`);
    console.log(`[Socket] Usuário ${userId} entrou na sala: user_${userId}`);
    
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(socket.id);

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`[Socket] 🔌 Usuário ${userId} desconectado: ${socket.id}`);
      
      const userSocketSet = userSockets.get(userId);
      if (userSocketSet) {
        userSocketSet.delete(socket.id);
        if (userSocketSet.size === 0) {
          userSockets.delete(userId);
        }
      }
    });
  });

  return io;
}

export function getIO() {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}

export function emitToUser(userId, event, data) {
  if (!io) {
    console.warn(`[Socket] ⚠️  Socket.io not initialized, cannot emit ${event} to user ${userId}`);
    return;
  }
  
  console.log(`[Socket] 📤 Emitting "${event}" to user ${userId}`, data);
  io.to(`user_${userId}`).emit(event, data);
  console.log(`[Socket] ✅ Event "${event}" emitted to user ${userId}`);
}

export function emitTransactionCreated(userId, transaction) {
  emitToUser(userId, 'transaction:created', transaction);
}

export function emitTransactionUpdated(userId, transaction) {
  emitToUser(userId, 'transaction:updated', transaction);
}

export function emitTransactionDeleted(userId, transactionId) {
  emitToUser(userId, 'transaction:deleted', { id: transactionId });
}

export function emitStatsUpdated(userId, stats) {
  emitToUser(userId, 'stats:updated', stats);
}
