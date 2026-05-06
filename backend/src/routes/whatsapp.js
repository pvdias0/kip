import express from "express";

import {
  getUserWhatsAppProfile,
  getWhatsAppChannelStatus,
  receiveWhatsAppWebhook,
  upsertUserWhatsAppProfile,
  verifyWhatsAppWebhook,
} from "../controllers/whatsappController.js";
import {
  authMiddleware,
  requireAcceptedLegalDocuments,
} from "../middleware/auth.js";
import {
  validate,
  whatsappProfileValidation,
} from "../middleware/validators.js";

const router = express.Router();

router.get("/webhook", verifyWhatsAppWebhook);
router.post("/webhook", receiveWhatsAppWebhook);

router.get(
  "/status",
  authMiddleware,
  requireAcceptedLegalDocuments,
  getWhatsAppChannelStatus,
);

router.get(
  "/profile",
  authMiddleware,
  requireAcceptedLegalDocuments,
  getUserWhatsAppProfile,
);

router.put(
  "/profile",
  authMiddleware,
  requireAcceptedLegalDocuments,
  whatsappProfileValidation,
  validate,
  upsertUserWhatsAppProfile,
);

export default router;
