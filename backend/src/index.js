import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import pool, { testConnection } from "./config/database.js";
import { errorHandler } from "./middleware/auth.js";
import { initializeSocket } from "./utils/socket.js";
import { migrateCategories } from "./scripts/migrate-categories.js";
import { seedDefaultCategories } from "./scripts/seed-categories.js";
import authRoutes from "./routes/auth.js";
import categoriesRoutes from "./routes/categories.js";
import entriesRoutes from "./routes/entries.js";
import passwordResetRoutes from "./routes/passwordReset.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Initialize Socket.io
initializeSocket(httpServer);

// Middleware
app.use(
  cors({
    origin: ['https://kip.kler.app.br', 'http://localhost:3000', 'http://localhost:8080'],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json());

// Health check route
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Backend está rodando!" });
});

// Database test route
app.get("/api/db-test", async (req, res) => {
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

// API Routes
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
