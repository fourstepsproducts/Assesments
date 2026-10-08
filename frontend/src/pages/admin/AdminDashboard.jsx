import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AdminDashboard() {
  const navigate = useNavigate();

  // ── Global stats & submissions ──────────────────────────────────────────
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Assessments list (for dropdown) ────────────────────────────────────
  const [assessments, setAssessments] = useState([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('');
  const [selectedAssessmentName, setSelectedAssessmentName] = useState('');

  // ── Filtered submissions & derived stats ────────────────────────────────
  const [filteredSubmissions, setFilteredSubmissions] = useState([]);
  const [filteredLoading, setFilteredLoading] = useState(false);
  const [filteredError, setFilteredError] = useState('');

  // ── Export state ────────────────────────────────────────────────────────
  const [exportMsg, setExportMsg] = useState('');
  const [exportMsgType, setExportMsgType] = useState(''); // 'success' | 'error'

  // ── Init ────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchStats();
    fetchAssessments();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get('/api/admin/stats');
      setStats(res.data);
    } catch (err) {
      setError('Failed to load dashboard stats.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssessments = async () => {
    try {
      const res = await api.get('/api/admin/assessments');
      setAssessments(res.data);
    } catch {
      // non-critical — dropdown will just be empty
    }
  };

  // ── When assessment selected, fetch its submissions ─────────────────────
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

  // ── Derived stats for selected assessment ───────────────────────────────
  const filteredStats = selectedAssessmentId
    ? {
        totalParticipants: new Set(filteredSubmissions.map((s) => s.email)).size,
        totalSubmissions: filteredSubmissions.length,
        pendingEvaluation: filteredSubmissions.filter(
          (s) => s.status === 'Pending Evaluation'
        ).length,
      }
    : null;

  // ── Displayed stat cards ─────────────────────────────────────────────────
  const getStatCards = () => {
    if (!stats) return [];
    return [
      {
        label: 'Total Assessments',
        value: stats.totalAssessments,
        icon: '📋',
        color: 'blue',
      },
      {
        label: 'Total Participants',
        value: filteredStats ? filteredStats.totalParticipants : stats.totalParticipants,
        icon: '👥',
        color: 'green',
      },
      {
        label: 'Total Submissions',
        value: filteredStats ? filteredStats.totalSubmissions : stats.totalSubmissions,
        icon: '📨',
        color: 'purple',
      },
      {
        label: 'Pending Evaluation',
        value: filteredStats ? filteredStats.pendingEvaluation : stats.pendingEvaluation,
        icon: '⏳',
        color: 'orange',
      },
    ];
  };

  const formatDate = (date) =>
    new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  // ── Displayed submissions ─────────────────────────────────────────────────
  // When an assessment is selected, show its full results; else show recent 5
  const displayedSubmissions = selectedAssessmentId
    ? filteredSubmissions
    : stats?.recentSubmissions || [];

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
      // Column widths
      ws['!cols'] = [
        { wch: 32 }, { wch: 22 }, { wch: 28 },
        { wch: 16 }, { wch: 14 }, { wch: 18 }, { wch: 18 },
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

      // Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(99, 102, 241);
      doc.text('AssessHub — Results Report', 14, 18);

      // Assessment info
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

      // Summary
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

      // Table
      autoTable(doc, {
        startY: 50,
        head: [
          ['Email / Participant', 'Assessment', 'Marks Obtained', 'Total Marks', 'Status', 'Submission Date'],
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
  if (error) return <div className="alert alert-error">{error}</div>;

  const statCards = getStatCards();

  return (
    <div className="admin-dashboard">
      <div className="page-header">
        <h2>Dashboard Overview</h2>
        <p>Welcome back! Here's what's happening.</p>
      </div>

      {/* Stat cards — update when assessment is selected */}
      <div className="stats-grid">
        {statCards.map((card, i) => (
          <div key={i} className={`stat-card stat-${card.color}`}>
            <div className="stat-icon">{card.icon}</div>
            <div className="stat-body">
              <div className="stat-value">{card.value}</div>
              <div className="stat-label">{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Stats scope indicator */}
      {selectedAssessmentId && (
        <div className="filter-scope-note">
          📊 Participant, submission, and evaluation counts reflect the selected assessment only.
        </div>
      )}

      <div className="dashboard-section">
        {/* Section header */}
        <div className="section-header">
          <h3>
            {selectedAssessmentId ? 'Filtered Submissions' : 'Recent Submissions'}
          </h3>
          <button
            className="btn-ghost btn-sm"
            onClick={() => navigate('/admin/results')}
          >
            View all →
          </button>
        </div>

        {/* ── Assessment filter + export bar ── */}
        <div className="results-filter-bar">
          <div className="filter-bar-left">
            <select
              id="dashboard-assessment-select"
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
              id="dashboard-download-pdf"
              className="btn-export btn-export-pdf"
              disabled={!selectedAssessmentId || filteredLoading}
              onClick={handleDownloadPDF}
              title={!selectedAssessmentId ? 'Select an assessment first' : 'Download PDF'}
            >
              📄 Download PDF
            </button>
            <button
              id="dashboard-download-excel"
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
          <div className={`alert ${exportMsgType === 'success' ? 'alert-success' : 'alert-error'} export-alert`}>
            {exportMsg}
          </div>
        )}

        {/* Filtered loading */}
        {filteredLoading && (
          <div className="center-content" style={{ padding: '32px' }}>
            <div className="spinner" />
            <span style={{ marginLeft: 12, color: 'var(--text-secondary)', fontSize: 14 }}>
              Loading results…
            </span>
          </div>
        )}

        {/* Filtered error */}
        {!filteredLoading && filteredError && (
          <div className="alert alert-error" style={{ margin: '16px 24px' }}>
            {filteredError}
          </div>
        )}

        {/* Empty state for selected assessment with no submissions */}
        {!filteredLoading && selectedAssessmentId && !filteredError && filteredSubmissions.length === 0 && (
          <div className="empty-state small">
            <div className="empty-icon">📭</div>
            <p>No submissions found for <strong>{selectedAssessmentName}</strong>.</p>
          </div>
        )}

        {/* Table */}
        {!filteredLoading && !filteredError && displayedSubmissions.length > 0 && (
          <div className="results-table-wrap">
            <table className="results-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Assessment</th>
                  <th>Marks</th>
                  <th>Status</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {displayedSubmissions.map((s, i) => (
                  <tr key={s._id || i}>
                    <td>{s.email}</td>
                    <td>{s.assessmentName}</td>
                    <td className="marks-cell">
                      {s.obtainedMarks} / {s.totalMarks}
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Default empty state (no assessment selected, no recent submissions) */}
        {!filteredLoading && !selectedAssessmentId && displayedSubmissions.length === 0 && (
          <div className="empty-state small">
            <p>No submissions yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
