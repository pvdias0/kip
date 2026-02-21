import express from "express";
import cors from "cors";
import helmet from "helmet";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import pool, { testConnection } from "./config/database.js";
import { errorHandler } from "./middleware/auth.js";
import { authLimiter, apiLimiter, passwordResetLimiter } from "./middleware/rateLimiter.js";
import { initializeSocket } from "./utils/socket.js";
import { migrateCategories } from "./scripts/migrate-categories.js";
import { seedDefaultCategories } from "./scripts/seed-categories.js";
import authRoutes from "./routes/auth.js";
import categoriesRoutes from "./routes/categories.js";
import entriesRoutes from "./routes/entries.js";
import passwordResetRoutes from "./routes/passwordReset.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 3000;

console.log("🎯 Porta configurada:", PORT);
console.log("🔍 DB Config:", {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
});

// Initialize Socket.io
initializeSocket(httpServer);

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for better compatibility
}));

// CORS
app.use(
  cors({
    origin: ['https://kip.kler.app.br', 'http://localhost:3000', 'http://localhost:8080'],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Body parser with size limit (prevent large payload attacks)
app.use(express.json({ limit: '10kb' }));

// General API rate limiter
app.use('/api', apiLimiter);

// Health check route (no rate limit needed)
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Backend está rodando!" });
});

// Database test route (should be removed in production or protected)
app.get("/api/db-test", async (req, res) => {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ status: 'ERROR', message: 'Not found' });
  }
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      status: "OK",
      message: "Conexão com banco bem-sucedida",
      timestamp: result.rows[0].now,
    });
  } catch (err) {
    res.status(500).json({
      status: "ERROR",
      message: err.message,
    });
  }
});

// API Routes with rate limiting
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/forgot-password", passwordResetLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/auth", passwordResetRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/entries", entriesRoutes);

// Serve static files from frontend build directory
const frontendPath = path.join(__dirname, "../../frontend/dist");
app.use(express.static(frontendPath));

// SPA fallback - serve index.html for all non-API routes
app.use((req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// Error handler
app.use(errorHandler);

// Start server
const startServer = async () => {
  const dbConnected = await testConnection();

  if (!dbConnected) {
    console.error(
      "⚠️ Banco de dados não está acessível. Verifique as credenciais e tente novamente.",
    );
    process.exit(1);
  }

  // Run migrations
  await migrateCategories();

  // Seed default categories
  await seedDefaultCategories();

  httpServer.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
    console.log(`📝 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🗄️  DB Test: http://localhost:${PORT}/api/db-test`);
    console.log(`🔐 Auth routes: http://localhost:${PORT}/api/auth`);
    console.log(`📂 Categories: http://localhost:${PORT}/api/categories`);
    console.log(`📊 Entries: http://localhost:${PORT}/api/entries`);
  });
};

startServer();
