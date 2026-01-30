import express from "express";
import {
  getAllUsers,
  resetUserPassword,
} from "../controllers/adminController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// Proteger todas as rotas de admin
router.use(authMiddleware);

// Get all users
router.get("/users", getAllUsers);

// Reset user password
router.post("/users/reset-password", resetUserPassword);

export default router;
