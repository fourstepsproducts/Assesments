import Assessment from '../models/Assessment.js';
import Submission from '../models/Submission.js';

// @desc    Get all assessments (student view - includes hasSubmitted)
// @route   GET /api/assessments
// @access  Private (any logged-in user)
export const getAssessments = async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch user's existing submissions
    const userSubmissions = await Submission.find({ userId }).select('assessmentId');
    const submittedSet = new Set(
      userSubmissions.map((s) => s.assessmentId.toString())
    );

    // Aggregate assessments with question count
    const assessments = await Assessment.aggregate([
      {
        $project: {
          name: 1,
          description: 1,
          totalMarks: 1,
          createdAt: 1,
          questionCount: { $size: '$questions' },
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    const result = assessments.map((a) => ({
      _id: a._id,
      name: a.name,
      description: a.description,
      questionCount: a.questionCount,
      totalMarks: a.totalMarks,
      createdAt: a.createdAt,
      hasSubmitted: submittedSet.has(a._id.toString()),
    }));

    res.json(result);
  } catch (error) {
    console.error('Get assessments error:', error);
    res.status(500).json({ message: 'Server error fetching assessments' });
  }
};

// @desc    Get single assessment for student (no correct answers)
// @route   GET /api/assessments/:id
// @access  Private (any logged-in user)
export const getAssessmentById = async (req, res) => {
  try {
    const userId = req.user.id;
    const assessmentId = req.params.id;

    // Check if user has already submitted this assessment
    const existingSubmission = await Submission.findOne({ userId, assessmentId });
    if (existingSubmission) {
      return res.status(409).json({ message: 'You have already completed this assessment.' });
    }

    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      return res.status(404).json({ message: 'Assessment not found' });
    }

    // Strip correctAnswer from questions before sending to student
    const safeQuestions = assessment.questions.map((q) => ({
      _id: q._id,
      question: q.question,
      type: q.type,
      options: q.options,
    }));

    res.json({
      _id: assessment._id,
      name: assessment.name,
      description: assessment.description,
      totalMarks: assessment.totalMarks,
      questions: safeQuestions,
    });
  } catch (error) {
    console.error('Get assessment by id error:', error);
    res.status(500).json({ message: 'Server error fetching assessment' });
  }
};

// @desc    Submit an assessment
// @route   POST /api/assessments/:id/submit
// @access  Private (any logged-in user)
export const submitAssessment = async (req, res) => {
  try {
    const { answers } = req.body;
    const assessmentId = req.params.id;
    const userId = req.user.id;
    const email = req.user.email;

    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: 'Answers are required' });
    }

    // Check for duplicate submission before proceeding
    const existingSubmission = await Submission.findOne({ userId, assessmentId });
    if (existingSubmission) {
      return res.status(409).json({
        message: 'You have already completed this assessment.',
      });
    }

    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      return res.status(404).json({ message: 'Assessment not found' });
    }

    let automaticMarks = 0;
    let hasInputQuestions = false;
    const processedAnswers = [];

    for (const question of assessment.questions) {
      const studentAnswer = answers.find(
        (a) => a.questionId === question._id.toString()
      );
      const givenAnswer = studentAnswer ? studentAnswer.answer : '';

      let marksObtained = 0;
      let isEvaluated = false;

      if (question.type === 'mcq') {
        isEvaluated = true;
        if (
          givenAnswer &&
          givenAnswer.trim().toLowerCase() === question.correctAnswer?.trim().toLowerCase()
        ) {
          marksObtained = question.marks;
          automaticMarks += marksObtained;
        }
      } else {
        hasInputQuestions = true;
        isEvaluated = false;
        marksObtained = 0;
      }

      processedAnswers.push({
        questionId: question._id,
        questionText: question.question,
        type: question.type,
        answer: givenAnswer,
        marksObtained,
        maxMarks: question.marks,
        isEvaluated,
      });
    }

    const status = hasInputQuestions ? 'Pending Evaluation' : 'Completed';

    await Submission.create({
      userId,
      email,
      assessmentId,
      assessmentName: assessment.name,
      answers: processedAnswers,
      automaticMarks,
      manualMarks: 0,
      obtainedMarks: automaticMarks,
      totalMarks: assessment.totalMarks,
      status,
      submittedAt: new Date(),
    });

    res.status(201).json({
      message: 'Assessment completed successfully.',
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'You have already completed this assessment.',
      });
    }
    console.error('Submit assessment error:', error);
    res.status(500).json({ message: 'Server error during submission' });
  }
};
