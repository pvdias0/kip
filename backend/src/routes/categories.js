import express from "express";
import {
  getCategories,
  createCategory,
  deleteCategory,
  getCategoriesByType,
} from "../controllers/categoryController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

router.get("/", getCategories);
router.post("/", createCategory);
router.delete("/:id", deleteCategory);
router.get("/:type", getCategoriesByType);

export default router;
