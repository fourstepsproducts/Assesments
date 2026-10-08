import Assessment from '../models/Assessment.js';
import Submission from '../models/Submission.js';
import User from '../models/User.js';

// @desc    Get admin dashboard stats
// @route   GET /api/admin/stats
// @access  Admin
export const getDashboardStats = async (req, res) => {
  try {
    const totalAssessments = await Assessment.countDocuments();
    const totalSubmissions = await Submission.countDocuments();
    const totalParticipants = await Submission.distinct('email');
    const pendingEvaluation = await Submission.countDocuments({ status: 'Pending Evaluation' });

    // Recent submissions (last 5)
    const recentSubmissions = await Submission.find({})
      .sort({ submittedAt: -1 })
      .limit(5)
      .select('email assessmentName obtainedMarks totalMarks status submittedAt');

    res.json({
      totalAssessments,
      totalSubmissions,
      totalParticipants: totalParticipants.length,
      pendingEvaluation,
      recentSubmissions,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Server error fetching stats' });
  }
};

// @desc    Get all assessments (admin - full data)
// @route   GET /api/admin/assessments
// @access  Admin
export const adminGetAssessments = async (req, res) => {
  try {
    const assessments = await Assessment.find({}).sort({ createdAt: -1 });
    res.json(assessments);
  } catch (error) {
    console.error('Admin get assessments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get single assessment (admin - full data with correct answers)
// @route   GET /api/admin/assessments/:id
// @access  Admin
export const adminGetAssessmentById = async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id);
    if (!assessment) {
      return res.status(404).json({ message: 'Assessment not found' });
    }
    res.json(assessment);
  } catch (error) {
    console.error('Admin get assessment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create assessment
// @route   POST /api/admin/assessments
// @access  Admin
export const createAssessment = async (req, res) => {
  try {
    const { name, description, questions } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Assessment name is required' });
    }

    if (!questions || questions.length === 0) {
      return res.status(400).json({ message: 'At least one question is required' });
    }

    // Validate questions
    for (const q of questions) {
      if (!q.question || !q.question.trim()) {
        return res.status(400).json({ message: 'All questions must have question text' });
      }
      if (q.type === 'mcq' && (!q.correctAnswer || !q.correctAnswer.trim())) {
        return res.status(400).json({ message: 'MCQ questions must have a correct answer selected' });
      }
      if (q.type === 'mcq' && (!q.options || q.options.length < 2)) {
        return res.status(400).json({ message: 'MCQ questions must have at least 2 options' });
      }
    }

    const assessment = await Assessment.create({
      name: name.trim(),
      description: description?.trim() || '',
      questions,
    });

    res.status(201).json(assessment);
  } catch (error) {
    console.error('Create assessment error:', error);
    res.status(500).json({ message: 'Server error creating assessment' });
  }
};

// @desc    Update assessment
// @route   PUT /api/admin/assessments/:id
// @access  Admin
export const updateAssessment = async (req, res) => {
  try {
    const { name, description, questions } = req.body;

    const assessment = await Assessment.findById(req.params.id);
    if (!assessment) {
      return res.status(404).json({ message: 'Assessment not found' });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Assessment name is required' });
    }

    if (!questions || questions.length === 0) {
      return res.status(400).json({ message: 'At least one question is required' });
    }

    // Validate questions
    for (const q of questions) {
      if (!q.question || !q.question.trim()) {
        return res.status(400).json({ message: 'All questions must have question text' });
      }
      if (q.type === 'mcq' && (!q.correctAnswer || !q.correctAnswer.trim())) {
        return res.status(400).json({ message: 'MCQ questions must have a correct answer selected' });
      }
    }

    assessment.name = name.trim();
    assessment.description = description?.trim() || '';
    assessment.questions = questions;
    await assessment.save();

    res.json(assessment);
  } catch (error) {
    console.error('Update assessment error:', error);
    res.status(500).json({ message: 'Server error updating assessment' });
  }
};

// @desc    Delete assessment
// @route   DELETE /api/admin/assessments/:id
// @access  Admin
export const deleteAssessment = async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id);
    if (!assessment) {
      return res.status(404).json({ message: 'Assessment not found' });
    }

    await Assessment.deleteOne({ _id: req.params.id });
    // Also delete related submissions
    await Submission.deleteMany({ assessmentId: req.params.id });

    res.json({ message: 'Assessment deleted successfully' });
  } catch (error) {
    console.error('Delete assessment error:', error);
    res.status(500).json({ message: 'Server error deleting assessment' });
  }
};

// @desc    Get all results/submissions
// @route   GET /api/admin/results
// @access  Admin
export const getAllResults = async (req, res) => {
  try {
    const submissions = await Submission.find({})
      .sort({ submittedAt: -1 })
      .populate('userId', 'email');
    res.json(submissions);
  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({ message: 'Server error fetching results' });
  }
};

// @desc    Get results by assessment
// @route   GET /api/admin/results/:assessmentId
// @access  Admin
export const getResultsByAssessment = async (req, res) => {
  try {
    const submissions = await Submission.find({
      assessmentId: req.params.assessmentId,
    }).sort({ submittedAt: -1 });
    res.json(submissions);
  } catch (error) {
    console.error('Get results by assessment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get single submission details (admin)
// @route   GET /api/admin/submissions/:submissionId
// @access  Admin
export const getSubmissionById = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.submissionId);
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }
    res.json(submission);
  } catch (error) {
    console.error('Get submission error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update manual marks for input-box questions
// @route   PUT /api/admin/submissions/:submissionId/manual-marks
// @access  Admin
export const updateManualMarks = async (req, res) => {
  try {
    const { manualMarks, answerMarks } = req.body;
    // answerMarks: [{ questionId, marks }] - individual marks for each input question

    const submission = await Submission.findById(req.params.submissionId);
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Update individual answer marks for input questions
    if (answerMarks && Array.isArray(answerMarks)) {
      let totalManual = 0;
      for (const { questionId, marks } of answerMarks) {
        const answer = submission.answers.find(
          (a) => a.questionId.toString() === questionId
        );
        if (answer && answer.type === 'input') {
          answer.marksObtained = Number(marks) || 0;
          answer.isEvaluated = true;
          totalManual += answer.marksObtained;
        }
      }
      submission.manualMarks = totalManual;
    } else if (typeof manualMarks === 'number') {
      submission.manualMarks = manualMarks;
    }

    submission.obtainedMarks = submission.automaticMarks + submission.manualMarks;

    // Check if all input questions are evaluated
    const unevaluatedInputs = submission.answers.filter(
      (a) => a.type === 'input' && !a.isEvaluated
    );
    if (unevaluatedInputs.length === 0) {
      submission.status = 'Completed';
    }

    await submission.save();
    res.json(submission);
  } catch (error) {
    console.error('Update manual marks error:', error);
    res.status(500).json({ message: 'Server error updating marks' });
  }
};
