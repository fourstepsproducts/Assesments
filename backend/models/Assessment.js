import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ['mcq', 'input'],
    required: true,
    default: 'mcq',
  },
  options: [
    {
      type: String,
      trim: true,
    },
  ],
  correctAnswer: {
    type: String,
    default: null, // Required for MCQ, null for input
  },
  marks: {
    type: Number,
    required: true,
    default: 1,
    min: 0,
  },
});

const assessmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    questions: [questionSchema],
    totalMarks: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to automatically calculate totalMarks
assessmentSchema.pre('save', function (next) {
  if (this.questions && this.questions.length > 0) {
    this.totalMarks = this.questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
  } else {
    this.totalMarks = 0;
  }
  next();
});

const Assessment = mongoose.model('Assessment', assessmentSchema);
export default Assessment;
