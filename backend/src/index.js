import express from "express";
import cors from "cors";
import helmet from "helmet";
import http from "http";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pool, { testConnection } from "./config/database.js";
import { errorHandler } from "./middleware/auth.js";
import {
  authLimiter,
  apiLimiter,
  passwordResetLimiter,
} from "./middleware/rateLimiter.js";
import { initializeSocket } from "./utils/socket.js";
import authRoutes from "./routes/auth.js";
import categoriesRoutes from "./routes/categories.js";
import entriesRoutes from "./routes/entries.js";
import paymentMethodsRoutes from "./routes/paymentMethods.js";
import passwordResetRoutes from "./routes/passwordReset.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 3000;
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:8080")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

console.log("Port configured:", PORT);
console.log("DB config:", {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
});

initializeSocket(httpServer);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        scriptSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json({ limit: "10kb" }));
app.use("/api", apiLimiter);

app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Backend is running" });
});

app.get("/api/db-test", async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ status: "ERROR", message: "Not found" });
  }

  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      status: "OK",
      message: "Database connection succeeded",
      timestamp: result.rows[0].now,
    });
  } catch (err) {
    res.status(500).json({
      status: "ERROR",
      message: err.message,
    });
  }
});

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/forgot-password", passwordResetLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/auth", passwordResetRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/entries", entriesRoutes);
app.use("/api/payment-methods", paymentMethodsRoutes);

const frontendPath = path.join(__dirname, "../../frontend/dist");
const frontendEntryPoint = path.join(frontendPath, "index.html");

if (existsSync(frontendEntryPoint)) {
  app.use(express.static(frontendPath));
  app.use((req, res) => {
    res.sendFile(frontendEntryPoint);
  });
}

app.use(errorHandler);

const startServer = async () => {
  const dbConnected = await testConnection();

  if (!dbConnected) {
    console.error("Database is not accessible. Check the credentials and try again.");
    process.exit(1);
  }

  httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`WebSocket available on ws://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });
};

startServer();
