import express from 'express';
import {
  createEntry,
  getEntries,
  getEntryById,
  updateEntry,
  deleteEntry,
  getStats,
} from '../controllers/entryController.js';
import {
  authMiddleware,
  requireAcceptedLegalDocuments,
} from "../middleware/auth.js";
import {
  createEntryValidation,
  getEntriesValidation,
  updateEntryValidation,
  idParamValidation,
  validate,
} from '../middleware/validators.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);
router.use(requireAcceptedLegalDocuments);

router.post('/', createEntryValidation, validate, createEntry);
router.get('/', getEntriesValidation, validate, getEntries);
router.get('/stats', getEntriesValidation, validate, getStats);
router.get('/:id', idParamValidation, validate, getEntryById);
router.put('/:id', updateEntryValidation, validate, updateEntry);
router.delete('/:id', idParamValidation, validate, deleteEntry);

export default router;
