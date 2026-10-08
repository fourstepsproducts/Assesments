import express from 'express';
import {
  getDashboardStats,
  adminGetAssessments,
  adminGetAssessmentById,
  createAssessment,
  updateAssessment,
  deleteAssessment,
  getAllResults,
  getResultsByAssessment,
  getSubmissionById,
  updateManualMarks,
} from '../controllers/adminController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// All admin routes require auth + admin role
router.use(protect, adminOnly);

router.get('/stats', getDashboardStats);

router.get('/assessments', adminGetAssessments);
router.get('/assessments/:id', adminGetAssessmentById);
router.post('/assessments', createAssessment);
router.put('/assessments/:id', updateAssessment);
router.delete('/assessments/:id', deleteAssessment);

router.get('/results', getAllResults);
router.get('/results/:assessmentId', getResultsByAssessment);

router.get('/submissions/:submissionId', getSubmissionById);
router.put('/submissions/:submissionId/manual-marks', updateManualMarks);

export default router;
