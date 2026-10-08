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
  const [unansweredNumbers, setUnansweredNumbers] = useState([]);
  const [unansweredIds, setUnansweredIds] = useState([]);

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
    // Remove from unanswered lists if answered
    if (String(value || '').trim()) {
      setUnansweredIds((prev) => prev.filter((qId) => qId !== questionId));
      if (assessment) {
        const qIdx = assessment.questions.findIndex((q) => q._id === questionId);
        if (qIdx !== -1) {
          setUnansweredNumbers((prev) => prev.filter((num) => num !== qIdx + 1));
        }
      }
    }
  };

  const scrollToFirstUnanswered = () => {
    if (unansweredIds.length > 0) {
      const firstId = unansweredIds[0];
      const el = document.getElementById(`question-card-${firstId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setUnansweredNumbers([]);
    setUnansweredIds([]);

    if (!assessment) return;

    // MANDATORY QUESTIONS FRONTEND VALIDATION
    const missingNums = [];
    const missingIds = [];

    assessment.questions.forEach((q, idx) => {
      const val = String(answers[q._id] || '').trim();
      if (!val) {
        missingNums.push(idx + 1);
        missingIds.push(q._id);
      }
    });

    if (missingNums.length > 0) {
      setUnansweredNumbers(missingNums);
      setUnansweredIds(missingIds);
      setError('Please answer all questions before submitting.');

      // Scroll to first unanswered question smoothly
      const firstId = missingIds[0];
      const el = document.getElementById(`question-card-${firstId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setSubmitting(true);

    const formattedAnswers = Object.entries(answers).map(([questionId, answer]) => ({
      questionId,
      answer: String(answer || '').trim(),
    }));

    try {
      await api.post(`/api/assessments/${id}/submit`, { answers: formattedAnswers });
      setSubmitted(true);
    } catch (err) {
      if (err.response?.data?.unansweredQuestions) {
        const backendMissing = err.response.data.unansweredQuestions; // [5, 12, 18]
        setUnansweredNumbers(backendMissing);
        const mappedIds = backendMissing
          .map((num) => assessment.questions[num - 1]?._id)
          .filter(Boolean);
        setUnansweredIds(mappedIds);
        setError('Please answer all questions before submitting.');
      } else {
        setError(err.response?.data?.message || 'Submission failed. Please try again.');
      }
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
          <span>{assessment?.questions?.length} Questions (All Required)</span>
        </div>
      </header>

      <main className="take-assessment-main">
        {/* Unanswered Summary Error Banner */}
        {unansweredNumbers.length > 0 && (
          <div className="alert alert-error unanswered-summary-box">
            <div className="summary-box-title">
              ⚠️ Please answer all questions before submitting.
            </div>
            <div className="unanswered-list-wrap">
              <span>Unanswered questions:</span>
              <ul className="unanswered-bullet-list">
                {unansweredNumbers.map((num) => (
                  <li key={num}>• Question {num}</li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              className="btn-ghost btn-sm scrollTo-unanswered-btn"
              onClick={scrollToFirstUnanswered}
            >
              Go to first unanswered question →
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} id="assessment-form">
          {assessment?.questions?.map((q, idx) => {
            const isUnanswered = unansweredIds.includes(q._id);

            return (
              <div
                key={q._id}
                id={`question-card-${q._id}`}
                className={`question-card ${isUnanswered ? 'has-error' : ''}`}
              >
                <div className="question-card-header">
                  <div className="question-number">Question {idx + 1} *</div>
                  <span className="required-tag">Required</span>
                </div>

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
                      placeholder="Type your answer here... *"
                      value={answers[q._id]}
                      onChange={(e) => handleAnswerChange(q._id, e.target.value)}
                      className="answer-textarea"
                    />
                  </div>
                )}

                {isUnanswered && (
                  <div className="question-error-note">
                    ⚠️ Please answer this question
                  </div>
                )}
              </div>
            );
          })}

          {error && unansweredNumbers.length === 0 && (
            <div className="alert alert-error">{error}</div>
          )}

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
