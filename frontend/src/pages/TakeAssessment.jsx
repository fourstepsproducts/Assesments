import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function TakeAssessment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAssessment();
  }, [id]);

  const fetchAssessment = async () => {
    try {
      const res = await api.get(`/api/assessments/${id}`);
      setAssessment(res.data);
      // Init answers map
      const init = {};
      res.data.questions.forEach((q) => {
        init[q._id] = '';
      });
      setAnswers(init);
    } catch (err) {
      if (err.response?.status === 409) {
        setError('You have already completed this assessment.');
      } else if (err.response?.status === 404) {
        setError('Assessment not found.');
      } else {
        setError(err.response?.data?.message || 'Failed to load assessment. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const formattedAnswers = Object.entries(answers).map(([questionId, answer]) => ({
      questionId,
      answer,
    }));

    try {
      await api.post(`/api/assessments/${id}/submit`, { answers: formattedAnswers });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="center-content fullpage">
        <div className="spinner large" />
      </div>
    );
  }

  if (error && !assessment) {
    return (
      <div className="center-content fullpage">
        <div className="error-card">
          <div className="error-icon">⚠️</div>
          <h2>{error}</h2>
          <button className="btn-primary" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="center-content fullpage">
        <div className="success-card">
          <div className="success-icon">✅</div>
          <h2>Assessment Completed!</h2>
          <p className="success-message">
            Assessment completed successfully.
          </p>
          <button
            id="back-to-dashboard"
            className="btn-primary btn-lg"
            onClick={() => navigate('/dashboard')}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="take-assessment-layout">
      <header className="assessment-header">
        <button className="btn-ghost back-btn" onClick={() => navigate('/dashboard')}>
          ← Back
        </button>
        <div className="assessment-header-info">
          <h2>{assessment?.name}</h2>
          {assessment?.description && <p>{assessment.description}</p>}
        </div>
        <div className="assessment-meta-header">
          <span>{assessment?.questions?.length} Questions</span>
        </div>
      </header>

      <main className="take-assessment-main">
        <form onSubmit={handleSubmit} id="assessment-form">
          {assessment?.questions?.map((q, idx) => (
            <div key={q._id} className="question-card">
              <div className="question-number">Question {idx + 1}</div>
              <p className="question-text">{q.question}</p>

              {q.type === 'mcq' ? (
                <div className="options-list">
                  {q.options.map((opt, oi) => (
                    <label
                      key={oi}
                      className={`option-label ${answers[q._id] === opt ? 'selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name={`q_${q._id}`}
                        value={opt}
                        checked={answers[q._id] === opt}
                        onChange={() => handleAnswerChange(q._id, opt)}
                      />
                      <span className="option-letter">
                        {String.fromCharCode(65 + oi)}
                      </span>
                      <span className="option-text">{opt}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="input-answer-wrap">
                  <textarea
                    id={`input-${q._id}`}
                    rows={3}
                    placeholder="Type your answer here..."
                    value={answers[q._id]}
                    onChange={(e) => handleAnswerChange(q._id, e.target.value)}
                    className="answer-textarea"
                  />
                </div>
              )}
            </div>
          ))}

          {error && <div className="alert alert-error">{error}</div>}

          <div className="submit-section">
            <button
              type="submit"
              id="submit-assessment-btn"
              className="btn-primary btn-lg"
              disabled={submitting}
            >
              {submitting ? <span className="btn-spinner" /> : 'Submit Assessment'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
