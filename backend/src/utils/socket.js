import { Server } from "socket.io";
import { verifyToken } from "./jwt.js";

let io = null;
const userSockets = new Map();
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:8080")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export function initializeSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
      methods: ["GET", "POST"],
      allowedHeaders: ["Content-Type", "Authorization"],
    },
    transports: ["websocket", "polling"],
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error("Authentication token not provided"));
    }

    try {
      const decoded = verifyToken(token);

      if (!decoded) {
        return next(new Error("Invalid or expired token"));
      }

      socket.userId = decoded.id;
      socket.userEmail = decoded.email;
      next();
    } catch (err) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.userId;

    socket.join(`user_${userId}`);

    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }

    userSockets.get(userId).add(socket.id);

    socket.on("disconnect", () => {
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
    throw new Error("Socket.io not initialized");
  }

  return io;
}

export function emitToUser(userId, event, data) {
  if (!io) {
    return;
  }

  io.to(`user_${userId}`).emit(event, data);
}

export function emitTransactionCreated(userId, transaction) {
  emitToUser(userId, "transaction:created", transaction);
}

export function emitTransactionUpdated(userId, transaction) {
  emitToUser(userId, "transaction:updated", transaction);
}

export function emitTransactionDeleted(userId, transactionId) {
  emitToUser(userId, "transaction:deleted", { id: transactionId });
}

export function emitStatsUpdated(userId, stats) {
  emitToUser(userId, "stats:updated", stats);
}
