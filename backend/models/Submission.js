import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  questionText: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['mcq', 'input'],
    required: true,
  },
  answer: {
    type: String,
    default: '',
  },
  marksObtained: {
    type: Number,
    default: 0,
  },
  maxMarks: {
    type: Number,
    required: true,
    default: 0,
  },
  isEvaluated: {
    type: Boolean,
    default: false,
  },
});

const submissionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    assessmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assessment',
      required: true,
    },
    assessmentName: {
      type: String,
      required: true,
    },
    answers: [answerSchema],
    automaticMarks: {
      type: Number,
      default: 0,
    },
    manualMarks: {
      type: Number,
      default: 0,
    },
    obtainedMarks: {
      type: Number,
      default: 0,
    },
    totalMarks: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['Pending Evaluation', 'Completed'],
      default: 'Completed',
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate submission for the same user and assessment
submissionSchema.index({ userId: 1, assessmentId: 1 }, { unique: true });

const Submission = mongoose.model('Submission', submissionSchema);
export default Submission;
