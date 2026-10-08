import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';

const defaultQuestion = () => ({
  id: Date.now() + Math.random(),
  question: '',
  type: 'mcq',
  options: ['', '', '', ''],
  correctAnswer: '',
  marks: 2,
});

export default function AssessmentForm({ editMode = false }) {
  const navigate = useNavigate();
  const { id } = useParams();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState([defaultQuestion()]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(editMode);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (editMode && id) {
      loadAssessment();
    }
  }, [editMode, id]);

  const loadAssessment = async () => {
    try {
      const res = await api.get(`/api/admin/assessments/${id}`);
      const a = res.data;
      setName(a.name);
      setDescription(a.description || '');
      setQuestions(
        a.questions.map((q) => ({
          id: q._id,
          question: q.question,
          type: q.type,
          options: q.options?.length ? q.options : ['', '', '', ''],
          correctAnswer: q.correctAnswer || '',
          marks: q.marks,
        }))
      );
    } catch (err) {
      setError('Failed to load assessment for editing.');
    } finally {
      setFetchLoading(false);
    }
  };

  const totalMarks = questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);

  const addQuestion = () => {
    setQuestions([...questions, defaultQuestion()]);
  };

  const removeQuestion = (idx) => {
    if (questions.length === 1) return;
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const updateQuestion = (idx, field, value) => {
    const updated = [...questions];
    updated[idx] = { ...updated[idx], [field]: value };
    // Clear correctAnswer if type changes
    if (field === 'type') {
      updated[idx].correctAnswer = '';
      if (value === 'mcq' && (!updated[idx].options || updated[idx].options.length < 2)) {
        updated[idx].options = ['', '', '', ''];
      }
    }
    setQuestions(updated);
  };

  const updateOption = (qIdx, oIdx, value) => {
    const updated = [...questions];
    const opts = [...updated[qIdx].options];
    opts[oIdx] = value;
    // If correct answer was this option, update it too
    if (updated[qIdx].correctAnswer === updated[qIdx].options[oIdx]) {
      updated[qIdx] = { ...updated[qIdx], options: opts, correctAnswer: value };
    } else {
      updated[qIdx] = { ...updated[qIdx], options: opts };
    }
    setQuestions(updated);
  };

  const addOption = (qIdx) => {
    const updated = [...questions];
    updated[qIdx] = {
      ...updated[qIdx],
      options: [...updated[qIdx].options, ''],
    };
    setQuestions(updated);
  };

  const removeOption = (qIdx, oIdx) => {
    const updated = [...questions];
    const opts = updated[qIdx].options.filter((_, i) => i !== oIdx);
    // Clear correct answer if removed option was selected
    const newCorrect = updated[qIdx].correctAnswer === updated[qIdx].options[oIdx]
      ? '' : updated[qIdx].correctAnswer;
    updated[qIdx] = { ...updated[qIdx], options: opts, correctAnswer: newCorrect };
    setQuestions(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Validate
    if (!name.trim()) {
      setError('Assessment name is required.');
      setLoading(false);
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) {
        setError(`Question ${i + 1} text is required.`);
        setLoading(false);
        return;
      }
      if (q.type === 'mcq') {
        const filledOpts = q.options.filter((o) => o.trim());
        if (filledOpts.length < 2) {
          setError(`Question ${i + 1}: MCQ must have at least 2 options.`);
          setLoading(false);
          return;
        }
        if (!q.correctAnswer || !q.correctAnswer.trim()) {
          setError(`Question ${i + 1}: Please select a correct answer.`);
          setLoading(false);
          return;
        }
      }
      if (!q.marks || Number(q.marks) < 0) {
        setError(`Question ${i + 1}: Marks must be 0 or greater.`);
        setLoading(false);
        return;
      }
    }

    const payload = {
      name: name.trim(),
      description: description.trim(),
      questions: questions.map((q) => ({
        question: q.question.trim(),
        type: q.type,
        options: q.type === 'mcq' ? q.options.filter((o) => o.trim()) : [],
        correctAnswer: q.type === 'mcq' ? q.correctAnswer : null,
        marks: Number(q.marks),
      })),
    };

    try {
      if (editMode) {
        await api.put(`/api/admin/assessments/${id}`, payload);
        setSuccess('Assessment updated successfully!');
      } else {
        await api.post('/api/admin/assessments', payload);
        setSuccess('Assessment created successfully!');
      }
      setTimeout(() => navigate('/admin/assessments'), 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save assessment.');
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return <div className="center-content"><div className="spinner large" /></div>;
  }

  return (
    <div className="assessment-form-page">
      <div className="page-header">
        <div>
          <h2>{editMode ? 'Edit Assessment' : 'Create Assessment'}</h2>
          <p>{editMode ? 'Update the assessment details and questions' : 'Build a new assessment'}</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={handleSubmit} id="assessment-builder-form">
        {/* Assessment info */}
        <div className="form-card">
          <h3 className="form-card-title">Assessment Details</h3>
          <div className="form-group">
            <label htmlFor="assessment-name">Assessment Name *</label>
            <input
              id="assessment-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Python & ML Assessment"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="assessment-description">Description (optional)</label>
            <textarea
              id="assessment-description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this assessment..."
            />
          </div>
          <div className="total-marks-display">
            Total Marks: <strong>{totalMarks}</strong>
          </div>
        </div>

        {/* Questions */}
        {questions.map((q, qIdx) => (
          <div key={q.id} className="question-builder-card">
            <div className="question-builder-header">
              <span className="question-number-badge">Q{qIdx + 1}</span>
              <div className="question-type-selector">
                <label>Type:</label>
                <select
                  value={q.type}
                  onChange={(e) => updateQuestion(qIdx, 'type', e.target.value)}
                  id={`q-type-${qIdx}`}
                >
                  <option value="mcq">Multiple Choice</option>
                  <option value="input">Input Box</option>
                </select>
              </div>
              <div className="marks-inline">
                <label>Marks:</label>
                <input
                  type="number"
                  min="0"
                  value={q.marks}
                  onChange={(e) => updateQuestion(qIdx, 'marks', e.target.value)}
                  className="marks-input"
                  id={`q-marks-${qIdx}`}
                />
              </div>
              {questions.length > 1 && (
                <button
                  type="button"
                  className="remove-question-btn"
                  onClick={() => removeQuestion(qIdx)}
                  title="Remove question"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="form-group">
              <label htmlFor={`q-text-${qIdx}`}>Question *</label>
              <textarea
                id={`q-text-${qIdx}`}
                rows={2}
                value={q.question}
                onChange={(e) => updateQuestion(qIdx, 'question', e.target.value)}
                placeholder="Enter your question here..."
              />
            </div>

            {q.type === 'mcq' && (
              <>
                <div className="options-builder">
                  <label>Options *</label>
                  {q.options.map((opt, oIdx) => (
                    <div key={oIdx} className="option-row">
                      <span className="option-letter-badge">
                        {String.fromCharCode(65 + oIdx)}
                      </span>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                        placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                        id={`q-${qIdx}-opt-${oIdx}`}
                      />
                      {q.options.length > 2 && (
                        <button
                          type="button"
                          className="remove-option-btn"
                          onClick={() => removeOption(qIdx, oIdx)}
                          title="Remove option"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn-ghost btn-sm add-option-btn"
                    onClick={() => addOption(qIdx)}
                  >
                    + Add Option
                  </button>
                </div>

                <div className="form-group">
                  <label htmlFor={`q-correct-${qIdx}`}>Correct Answer *</label>
                  <select
                    id={`q-correct-${qIdx}`}
                    value={q.correctAnswer}
                    onChange={(e) => updateQuestion(qIdx, 'correctAnswer', e.target.value)}
                  >
                    <option value="">-- Select correct option --</option>
                    {q.options
                      .filter((o) => o.trim())
                      .map((opt, oi) => (
                        <option key={oi} value={opt}>
                          {String.fromCharCode(65 + q.options.indexOf(opt))}. {opt}
                        </option>
                      ))}
                  </select>
                </div>
              </>
            )}

            {q.type === 'input' && (
              <div className="input-type-notice">
                📝 Students will type their answer. This will be evaluated manually by admin.
              </div>
            )}
          </div>
        ))}

        <button
          type="button"
          id="add-question-btn"
          className="btn-secondary add-question-btn"
          onClick={addQuestion}
        >
          + Add Question
        </button>

        <div className="form-actions">
          <button
            type="button"
            className="btn-ghost"
            onClick={() => navigate('/admin/assessments')}
          >
            Cancel
          </button>
          <button
            type="submit"
            id="save-assessment-btn"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? <span className="btn-spinner" /> : editMode ? 'Update Assessment' : 'Save Assessment'}
          </button>
        </div>
      </form>
    </div>
  );
}
