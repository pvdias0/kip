import express from "express";
import {
  getPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  createPaymentAccount,
  updatePaymentAccount,
  deletePaymentAccount,
  linkPaymentAccount,
  unlinkPaymentAccount,
} from "../controllers/paymentMethodController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", getPaymentMethods);
router.post("/", createPaymentMethod);
router.put("/:id", updatePaymentMethod);
router.delete("/:id", deletePaymentMethod);

router.post("/accounts", createPaymentAccount);
router.put("/accounts/:id", updatePaymentAccount);
router.delete("/accounts/:id", deletePaymentAccount);

router.post("/:id/accounts", linkPaymentAccount);
router.delete("/:id/accounts/:accountId", unlinkPaymentAccount);

export default router;
