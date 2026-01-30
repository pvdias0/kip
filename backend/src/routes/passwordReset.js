import express from "express";
import {
  forgotPassword,
  resetPassword,
  validateResetToken,
} from "../controllers/passwordResetController.js";

const router = express.Router();

router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/validate-token", validateResetToken);

export default router;
