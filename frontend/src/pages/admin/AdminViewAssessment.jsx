import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';

export default function AdminViewAssessment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('questions');

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [aRes, sRes] = await Promise.all([
        api.get(`/api/admin/assessments/${id}`),
        api.get(`/api/admin/results/${id}`),
      ]);
      setAssessment(aRes.data);
      setSubmissions(sRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) =>
    new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });

  if (loading) return <div className="center-content"><div className="spinner large" /></div>;
  if (!assessment) return <div className="alert alert-error">Assessment not found.</div>;

  return (
    <div className="view-assessment-page">
      <div className="page-header">
        <div>
          <button className="btn-ghost back-btn-sm" onClick={() => navigate('/admin/assessments')}>
            ← Back
          </button>
          <h2>{assessment.name}</h2>
          {assessment.description && <p>{assessment.description}</p>}
        </div>
        <button
          className="btn-secondary"
          onClick={() => navigate(`/admin/assessments/${id}/edit`)}
        >
          Edit Assessment
        </button>
      </div>

      <div className="assessment-info-bar">
        <span className="info-chip">📝 {assessment.questions?.length} Questions</span>
        <span className="info-chip">⭐ {assessment.totalMarks} Total Marks</span>
        <span className="info-chip">👥 {submissions.length} Submission{submissions.length !== 1 ? 's' : ''}</span>
        <span className="info-chip">📅 {formatDate(assessment.createdAt)}</span>
      </div>

      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === 'questions' ? 'active' : ''}`}
          onClick={() => setActiveTab('questions')}
        >
          Questions ({assessment.questions?.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'participants' ? 'active' : ''}`}
          onClick={() => setActiveTab('participants')}
        >
          Participants ({submissions.length})
        </button>
      </div>

      {activeTab === 'questions' && (
        <div className="questions-list">
          {assessment.questions?.map((q, i) => (
            <div key={q._id} className="view-question-card">
              <div className="view-question-header">
                <span className="question-number-badge">Q{i + 1}</span>
                <span className={`type-badge type-${q.type}`}>
                  {q.type === 'mcq' ? 'MCQ' : 'Input Box'}
                </span>
                <span className="marks-chip">{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
              </div>
              <p className="view-question-text">{q.question}</p>
              {q.type === 'mcq' && (
                <div className="view-options">
                  {q.options?.map((opt, oi) => (
                    <div
                      key={oi}
                      className={`view-option ${opt === q.correctAnswer ? 'correct-option' : ''}`}
                    >
                      <span className="option-letter">{String.fromCharCode(65 + oi)}</span>
                      <span>{opt}</span>
                      {opt === q.correctAnswer && <span className="correct-tick">✓ Correct</span>}
                    </div>
                  ))}
                </div>
              )}
              {q.type === 'input' && (
                <div className="input-type-notice">Manual evaluation required</div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'participants' && (
        <div className="participants-section">
          {submissions.length === 0 ? (
            <div className="empty-state small"><p>No submissions yet.</p></div>
          ) : (
            <div className="results-table-wrap">
              <table className="results-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Obtained Marks</th>
                    <th>Total Marks</th>
                    <th>Status</th>
                    <th>Submitted At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((s) => (
                    <tr key={s._id}>
                      <td>{s.email}</td>
                      <td>{s.obtainedMarks}</td>
                      <td>{s.totalMarks}</td>
                      <td>
                        <span className={`status-badge ${s.status === 'Completed' ? 'status-complete' : 'status-pending'}`}>
                          {s.status}
                        </span>
                      </td>
                      <td>{formatDate(s.submittedAt)}</td>
                      <td>
                        <button
                          className="btn-ghost btn-sm"
                          onClick={() => navigate(`/admin/results`)}
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
