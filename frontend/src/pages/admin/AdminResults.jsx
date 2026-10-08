import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AdminResults() {
  const navigate = useNavigate();

  // ── All submissions (unfiltered) ─────────────────────────────────────────
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Assessment dropdown ──────────────────────────────────────────────────
  const [assessments, setAssessments] = useState([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('');
  const [selectedAssessmentName, setSelectedAssessmentName] = useState('');

  // ── Per-assessment results ───────────────────────────────────────────────
  const [filteredSubmissions, setFilteredSubmissions] = useState([]);
  const [filteredLoading, setFilteredLoading] = useState(false);
  const [filteredError, setFilteredError] = useState('');

  // ── Manual marks modal ───────────────────────────────────────────────────
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [manualMarkInputs, setManualMarkInputs] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // ── Export ───────────────────────────────────────────────────────────────
  const [exportMsg, setExportMsg] = useState('');
  const [exportMsgType, setExportMsgType] = useState('');

  // ── Init ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchResults();
    fetchAssessments();
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

  const fetchAssessments = async () => {
    try {
      const res = await api.get('/api/admin/assessments');
      setAssessments(res.data);
    } catch {
      // non-critical
    }
  };

  // ── Assessment change ─────────────────────────────────────────────────────
  const handleAssessmentChange = useCallback(async (e) => {
    const id = e.target.value;
    const name = e.target.options[e.target.selectedIndex]?.text || '';
    setSelectedAssessmentId(id);
    setSelectedAssessmentName(id ? name : '');
    setExportMsg('');

    if (!id) {
      setFilteredSubmissions([]);
      return;
    }

    setFilteredLoading(true);
    setFilteredError('');
    try {
      const res = await api.get(`/api/admin/results/${id}`);
      setFilteredSubmissions(res.data);
    } catch {
      setFilteredError('Failed to load results for the selected assessment.');
      setFilteredSubmissions([]);
    } finally {
      setFilteredLoading(false);
    }
  }, []);

  // ── Derived stats for selected assessment ────────────────────────────────
  const filteredStats = selectedAssessmentId
    ? {
        totalParticipants: new Set(filteredSubmissions.map((s) => s.email)).size,
        totalSubmissions: filteredSubmissions.length,
        pendingEvaluation: filteredSubmissions.filter(
          (s) => s.status === 'Pending Evaluation'
        ).length,
      }
    : null;

  // ── Displayed rows ────────────────────────────────────────────────────────
  const displayedSubmissions = selectedAssessmentId ? filteredSubmissions : submissions;

  // ── Manual marks modal ────────────────────────────────────────────────────
  const openDetails = (submission) => {
    setSelectedSubmission(submission);
    setSaveMsg('');
    const marks = {};
    submission.answers
      ?.filter((a) => a.type === 'input')
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
      // Update both lists
      const updateList = (list) =>
        list.map((s) => (s._id === res.data._id ? res.data : s));
      setSubmissions(updateList);
      setFilteredSubmissions(updateList);
      setSelectedSubmission(res.data);
      setSaveMsg('Marks saved successfully!');
    } catch (err) {
      setSaveMsg('Failed to save marks.');
    } finally {
      setSaving(false);
    }
  };

  // ── Format helpers ────────────────────────────────────────────────────────
  const formatDate = (date) =>
    new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  // ── Export helpers ────────────────────────────────────────────────────────
  const showExportMsg = (msg, type) => {
    setExportMsg(msg);
    setExportMsgType(type);
    setTimeout(() => setExportMsg(''), 4000);
  };

  const buildExportRows = () =>
    filteredSubmissions.map((s) => ({
      Email: s.email || '—',
      'Participant Name': s.name || '—',
      Assessment: s.assessmentName || selectedAssessmentName,
      'Auto Marks': s.automaticMarks ?? '—',
      'Manual Marks': s.manualMarks ?? '—',
      'Marks Obtained': s.obtainedMarks ?? '—',
      'Total Marks': s.totalMarks ?? '—',
      Status: s.status || '—',
      'Submission Date': s.submittedAt ? formatDate(s.submittedAt) : '—',
    }));

  const handleDownloadExcel = () => {
    try {
      if (!filteredSubmissions.length) {
        showExportMsg('No data to export for this assessment.', 'error');
        return;
      }
      const rows = buildExportRows();
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [
        { wch: 32 }, { wch: 22 }, { wch: 28 }, { wch: 14 },
        { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 20 }, { wch: 18 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Results');
      const fileName = `Results_${selectedAssessmentName.replace(/\s+/g, '_')}_${Date.now()}.xlsx`;
      XLSX.writeFile(wb, fileName);
      showExportMsg('Excel file downloaded successfully!', 'success');
    } catch (err) {
      console.error('Excel export error:', err);
      showExportMsg('Failed to export Excel. Please try again.', 'error');
    }
  };

  const handleDownloadPDF = () => {
    try {
      if (!filteredSubmissions.length) {
        showExportMsg('No data to export for this assessment.', 'error');
        return;
      }

      const doc = new jsPDF({ orientation: 'landscape' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(99, 102, 241);
      doc.text('AssessHub — Results Report', 14, 18);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(71, 85, 105);
      doc.text(`Assessment: ${selectedAssessmentName}`, 14, 28);
      doc.text(
        `Generated: ${new Date().toLocaleDateString('en-IN', {
          day: '2-digit', month: 'long', year: 'numeric',
        })}`,
        14,
        35
      );

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(99, 102, 241);
      doc.text(
        `Total Submissions: ${filteredStats.totalSubmissions}   |   ` +
          `Participants: ${filteredStats.totalParticipants}   |   ` +
          `Pending Evaluation: ${filteredStats.pendingEvaluation}`,
        14,
        44
      );

      autoTable(doc, {
        startY: 50,
        head: [
          [
            'Email / Participant',
            'Assessment',
            'Marks Obtained',
            'Total Marks',
            'Status',
            'Submission Date',
          ],
        ],
        body: filteredSubmissions.map((s) => [
          s.email || '—',
          s.assessmentName || selectedAssessmentName,
          s.obtainedMarks ?? '—',
          s.totalMarks ?? '—',
          s.status || '—',
          s.submittedAt ? formatDate(s.submittedAt) : '—',
        ]),
        headStyles: {
          fillColor: [99, 102, 241],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 10,
        },
        bodyStyles: { fontSize: 9, textColor: [15, 23, 42] },
        alternateRowStyles: { fillColor: [238, 242, 255] },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 55 },
          2: { cellWidth: 32, halign: 'center' },
          3: { cellWidth: 28, halign: 'center' },
          4: { cellWidth: 38 },
          5: { cellWidth: 40 },
        },
        margin: { left: 14, right: 14 },
      });

      const fileName = `Results_${selectedAssessmentName.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
      doc.save(fileName);
      showExportMsg('PDF downloaded successfully!', 'success');
    } catch (err) {
      console.error('PDF export error:', err);
      showExportMsg('Failed to export PDF. Please try again.', 'error');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return <div className="center-content"><div className="spinner large" /></div>;

  return (
    <div className="admin-results-page">
      <div className="page-header">
        <div>
          <h2>Results &amp; Submissions</h2>
          <p>All student submissions and marks</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* ── Assessment filter + export bar ── */}
      <div className="results-filter-bar">
        <div className="filter-bar-left">
          <select
            id="results-assessment-select"
            className="filter-select"
            value={selectedAssessmentId}
            onChange={handleAssessmentChange}
          >
            <option value="">Select Assessment</option>
            {assessments.map((a) => (
              <option key={a._id} value={a._id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-bar-right">
          <button
            id="results-download-pdf"
            className="btn-export btn-export-pdf"
            disabled={!selectedAssessmentId || filteredLoading}
            onClick={handleDownloadPDF}
            title={!selectedAssessmentId ? 'Select an assessment first' : 'Download PDF'}
          >
            📄 Download PDF
          </button>
          <button
            id="results-download-excel"
            className="btn-export btn-export-excel"
            disabled={!selectedAssessmentId || filteredLoading}
            onClick={handleDownloadExcel}
            title={!selectedAssessmentId ? 'Select an assessment first' : 'Download Excel'}
          >
            📊 Download Excel
          </button>
        </div>
      </div>

      {/* Export message */}
      {exportMsg && (
        <div
          className={`alert ${exportMsgType === 'success' ? 'alert-success' : 'alert-error'} export-alert`}
        >
          {exportMsg}
        </div>
      )}

      {/* Filtered stats when an assessment is selected */}
      {selectedAssessmentId && filteredStats && !filteredLoading && (
        <div className="assessment-stats-bar">
          <div className="assessment-stats-item">
            <span className="ast-label">Submissions</span>
            <span className="ast-value">{filteredStats.totalSubmissions}</span>
          </div>
          <div className="assessment-stats-item">
            <span className="ast-label">Participants</span>
            <span className="ast-value">{filteredStats.totalParticipants}</span>
          </div>
          <div className="assessment-stats-item ast-warning">
            <span className="ast-label">Pending Evaluation</span>
            <span className="ast-value">{filteredStats.pendingEvaluation}</span>
          </div>
        </div>
      )}

      {/* Filtered loading */}
      {filteredLoading && (
        <div className="center-content" style={{ padding: '40px' }}>
          <div className="spinner" />
          <span style={{ marginLeft: 12, color: 'var(--text-secondary)', fontSize: 14 }}>
            Loading assessment results…
          </span>
        </div>
      )}

      {/* Filtered error */}
      {!filteredLoading && filteredError && (
        <div className="alert alert-error">{filteredError}</div>
      )}

      {/* Empty state */}
      {!filteredLoading && !filteredError && displayedSubmissions.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>
            {selectedAssessmentId
              ? `No submissions for "${selectedAssessmentName}"`
              : 'No submissions yet'}
          </h3>
          <p>
            {selectedAssessmentId
              ? 'No students have submitted this assessment yet.'
              : 'Results will appear here once students complete assessments.'}
          </p>
        </div>
      )}

      {/* Results table */}
      {!filteredLoading && !filteredError && displayedSubmissions.length > 0 && (
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
              {displayedSubmissions.map((s) => (
                <tr key={s._id}>
                  <td className="email-cell">{s.email}</td>
                  <td>{s.assessmentName}</td>
                  <td>{s.automaticMarks}</td>
                  <td>
                    {s.manualMarks > 0 ? (
                      s.manualMarks
                    ) : (
                      <span className="pending-label">Pending</span>
                    )}
                  </td>
                  <td className="marks-cell">
                    <strong>{s.obtainedMarks}</strong> / {s.totalMarks}
                  </td>
                  <td>
                    <span
                      className={`status-badge ${
                        s.status === 'Completed' ? 'status-complete' : 'status-pending'
                      }`}
                    >
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

      {/* ── Submission Details Modal ── */}
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
              <button className="modal-close" onClick={() => setSelectedSubmission(null)}>
                ✕
              </button>
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
                <strong>
                  {selectedSubmission.obtainedMarks} / {selectedSubmission.totalMarks}
                </strong>
              </div>
            </div>

            <div className="modal-answers">
              {selectedSubmission.answers?.map((a, i) => (
                <div
                  key={i}
                  className={`answer-row ${a.type === 'input' ? 'input-answer-row' : ''}`}
                >
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
              <div
                className={`alert ${
                  saveMsg.includes('success') ? 'alert-success' : 'alert-error'
                }`}
              >
                {saveMsg}
              </div>
            )}

            {selectedSubmission.answers?.some((a) => a.type === 'input') ? (
              <div className="modal-footer">
                <button className="btn-ghost" onClick={() => setSelectedSubmission(null)}>
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
            ) : (
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
