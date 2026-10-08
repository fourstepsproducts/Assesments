import express from 'express';
import {
  getAssessments,
  getAssessmentById,
  submitAssessment,
} from '../controllers/assessmentController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, getAssessments);
router.get('/:id', protect, getAssessmentById);
router.post('/:id/submit', protect, submitAssessment);

export default router;
