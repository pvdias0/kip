import express from "express";
import {
  adjustBalance,
  createAccount,
  createDebt,
  createTransfer,
  deleteDebt,
  deleteTransfer,
  getOverview,
  listDebts,
  listTransfers,
  payDebt,
  updateAccount,
  updateDebt,
} from "../controllers/financeController.js";
import { authMiddleware, requireAcceptedLegalDocuments } from "../middleware/auth.js";

const router = express.Router();

router.use(authMiddleware);
router.use(requireAcceptedLegalDocuments);

router.get("/overview", getOverview);

router.post("/accounts", createAccount);
router.put("/accounts/:id", updateAccount);
router.post("/accounts/:id/adjust-balance", adjustBalance);

router.get("/transfers", listTransfers);
router.post("/transfers", createTransfer);
router.delete("/transfers/:id", deleteTransfer);

router.get("/debts", listDebts);
router.post("/debts", createDebt);
router.put("/debts/:id", updateDebt);
router.delete("/debts/:id", deleteDebt);
router.post("/debts/:id/payments", payDebt);

export default router;
