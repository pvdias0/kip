import express from "express";
import {
  getAllUsers,
  resetUserPassword,
} from "../controllers/adminController.js";
import {
  authMiddleware,
  requireAcceptedLegalDocuments,
} from "../middleware/auth.js";

const router = express.Router();

// Proteger todas as rotas de admin
router.use(authMiddleware);
router.use(requireAcceptedLegalDocuments);

// Get all users
router.get("/users", getAllUsers);

// Reset user password
router.post("/users/reset-password", resetUserPassword);

export default router;
