import express from "express";
import {
  acceptLegalDocuments,
  changePassword,
  getProfile,
  register,
  login,
  updateProfile,
  verifyEmail,
} from "../controllers/authController.js";
import {
  changePasswordValidation,
  legalAcceptanceValidation,
  registerValidation,
  loginValidation,
  profileUpdateValidation,
  validate,
} from "../middleware/validators.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

router.post("/register", registerValidation, validate, register);
router.post("/login", loginValidation, validate, login);
router.get("/verify-email", verifyEmail);
router.get("/profile", authMiddleware, getProfile);
router.post(
  "/legal-acceptance",
  authMiddleware,
  legalAcceptanceValidation,
  validate,
  acceptLegalDocuments,
);
router.put("/profile", authMiddleware, profileUpdateValidation, validate, updateProfile);
router.post(
  "/change-password",
  authMiddleware,
  changePasswordValidation,
  validate,
  changePassword,
);

export default router;
