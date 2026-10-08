import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';

export default function AdminResults() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [manualMarkInputs, setManualMarkInputs] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [filterAssessment, setFilterAssessment] = useState('');

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      const res = await api.get('/api/admin/results');
      setSubmissions(res.data);
    } catch (err) {
      setError('Failed to load results.');
    } finally {
      setLoading(false);
    }
  };

  const openDetails = async (submission) => {
    setSelectedSubmission(submission);
    setSaveMsg('');
    // Pre-fill manual mark inputs for input questions
    const marks = {};
    submission.answers
      .filter((a) => a.type === 'input')
      .forEach((a) => {
        marks[a.questionId] = a.marksObtained || 0;
      });
    setManualMarkInputs(marks);
  };

  const handleManualMarkChange = (questionId, val) => {
    setManualMarkInputs((prev) => ({ ...prev, [questionId]: val }));
  };

  const handleSaveManualMarks = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const answerMarks = Object.entries(manualMarkInputs).map(
        ([questionId, marks]) => ({ questionId, marks: Number(marks) })
      );
      const res = await api.put(
        `/api/admin/submissions/${selectedSubmission._id}/manual-marks`,
        { answerMarks }
      );
      // Update in list
      setSubmissions((prev) =>
        prev.map((s) => (s._id === res.data._id ? res.data : s))
      );
      setSelectedSubmission(res.data);
      setSaveMsg('Marks saved successfully!');
    } catch (err) {
      setSaveMsg('Failed to save marks.');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (date) =>
    new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });

  const assessmentNames = [...new Set(submissions.map((s) => s.assessmentName))];
  const filtered = filterAssessment
    ? submissions.filter((s) => s.assessmentName === filterAssessment)
    : submissions;

  if (loading) return <div className="center-content"><div className="spinner large" /></div>;

  return (
    <div className="admin-results-page">
      <div className="page-header">
        <div>
          <h2>Results & Submissions</h2>
          <p>All student submissions and marks</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Filter */}
      <div className="results-filter">
        <select
          value={filterAssessment}
          onChange={(e) => setFilterAssessment(e.target.value)}
          id="filter-assessment"
        >
          <option value="">All Assessments</option>
          {assessmentNames.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>No submissions yet</h3>
          <p>Results will appear here once students complete assessments.</p>
        </div>
      ) : (
        <div className="results-table-wrap">
          <table className="results-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Assessment</th>
                <th>Auto Marks</th>
                <th>Manual Marks</th>
                <th>Obtained / Total</th>
                <th>Status</th>
                <th>Submitted At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s._id}>
                  <td className="email-cell">{s.email}</td>
                  <td>{s.assessmentName}</td>
                  <td>{s.automaticMarks}</td>
                  <td>
                    {s.manualMarks > 0 ? s.manualMarks : (
                      <span className="pending-label">Pending</span>
                    )}
                  </td>
                  <td className="marks-cell">
                    <strong>{s.obtainedMarks}</strong> / {s.totalMarks}
                  </td>
                  <td>
                    <span className={`status-badge ${s.status === 'Completed' ? 'status-complete' : 'status-pending'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td>{formatDate(s.submittedAt)}</td>
                  <td>
                    <button
                      className="btn-ghost btn-sm"
                      onClick={() => openDetails(s)}
                      id={`view-result-${s._id}`}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Submission Details Modal */}
      {selectedSubmission && (
        <div className="modal-overlay" onClick={() => setSelectedSubmission(null)}>
          <div
            className="modal modal-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h3>Submission Details</h3>
                <p className="modal-subtitle">
                  {selectedSubmission.email} — {selectedSubmission.assessmentName}
                </p>
              </div>
              <button className="modal-close" onClick={() => setSelectedSubmission(null)}>✕</button>
            </div>

            <div className="modal-marks-summary">
              <div className="marks-summary-item">
                <span>Auto Marks</span>
                <strong>{selectedSubmission.automaticMarks}</strong>
              </div>
              <div className="marks-summary-item">
                <span>Manual Marks</span>
                <strong>{selectedSubmission.manualMarks || 0}</strong>
              </div>
              <div className="marks-summary-item highlight">
                <span>Final Marks</span>
                <strong>{selectedSubmission.obtainedMarks} / {selectedSubmission.totalMarks}</strong>
              </div>
            </div>

            <div className="modal-answers">
              {selectedSubmission.answers?.map((a, i) => (
                <div key={i} className={`answer-row ${a.type === 'input' ? 'input-answer-row' : ''}`}>
                  <div className="answer-question">
                    <strong>Q{i + 1}:</strong> {a.questionText}
                    <span className={`type-badge type-${a.type}`}>
                      {a.type === 'mcq' ? 'MCQ' : 'Input'}
                    </span>
                  </div>
                  <div className="answer-given">
                    <span className="answer-label">Answer:</span>{' '}
                    {a.answer || <em className="no-answer">No answer given</em>}
                  </div>
                  {a.type === 'mcq' && (
                    <div className="auto-marks-label">
                      Auto Marks: {a.marksObtained} / {a.maxMarks}
                    </div>
                  )}
                  {a.type === 'input' && (
                    <div className="manual-marks-row">
                      <label htmlFor={`manual-${a.questionId}`}>
                        Manual Marks (max {a.maxMarks}):
                      </label>
                      <input
                        id={`manual-${a.questionId}`}
                        type="number"
                        min="0"
                        max={a.maxMarks}
                        value={manualMarkInputs[a.questionId] ?? 0}
                        onChange={(e) =>
                          handleManualMarkChange(a.questionId, e.target.value)
                        }
                        className="manual-marks-input"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {saveMsg && (
              <div className={`alert ${saveMsg.includes('success') ? 'alert-success' : 'alert-error'}`}>
                {saveMsg}
              </div>
            )}

            {selectedSubmission.answers?.some((a) => a.type === 'input') && (
              <div className="modal-footer">
                <button
                  className="btn-ghost"
                  onClick={() => setSelectedSubmission(null)}
                >
                  Close
                </button>
                <button
                  id="save-manual-marks-btn"
                  className="btn-primary"
                  onClick={handleSaveManualMarks}
                  disabled={saving}
                >
                  {saving ? <span className="btn-spinner" /> : 'Save Manual Marks'}
                </button>
              </div>
            )}
            {!selectedSubmission.answers?.some((a) => a.type === 'input') && (
              <div className="modal-footer">
                <button className="btn-primary" onClick={() => setSelectedSubmission(null)}>
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
