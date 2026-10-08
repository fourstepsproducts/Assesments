import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
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

  const formatDate = (date) =>
    new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });

  if (loading) return <div className="center-content"><div className="spinner large" /></div>;
  if (error) return <div className="alert alert-error">{error}</div>;

  const statCards = [
    { label: 'Total Assessments', value: stats.totalAssessments, icon: '📋', color: 'blue' },
    { label: 'Total Participants', value: stats.totalParticipants, icon: '👥', color: 'green' },
    { label: 'Total Submissions', value: stats.totalSubmissions, icon: '📨', color: 'purple' },
    { label: 'Pending Evaluation', value: stats.pendingEvaluation, icon: '⏳', color: 'orange' },
  ];

  return (
    <div className="admin-dashboard">
      <div className="page-header">
        <h2>Dashboard Overview</h2>
        <p>Welcome back! Here's what's happening.</p>
      </div>

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

      <div className="dashboard-section">
        <div className="section-header">
          <h3>Recent Submissions</h3>
          <button
            className="btn-ghost btn-sm"
            onClick={() => navigate('/admin/results')}
          >
            View all →
          </button>
        </div>

        {stats.recentSubmissions.length === 0 ? (
          <div className="empty-state small">
            <p>No submissions yet.</p>
          </div>
        ) : (
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
                {stats.recentSubmissions.map((s, i) => (
                  <tr key={i}>
                    <td>{s.email}</td>
                    <td>{s.assessmentName}</td>
                    <td className="marks-cell">
                      {s.obtainedMarks} / {s.totalMarks}
                    </td>
                    <td>
                      <span className={`status-badge ${s.status === 'Completed' ? 'status-complete' : 'status-pending'}`}>
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
      </div>
    </div>
  );
}
