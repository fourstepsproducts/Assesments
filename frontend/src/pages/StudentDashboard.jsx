import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAssessments();
  }, []);

  const fetchAssessments = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/assessments');
      setAssessments(res.data);
    } catch (err) {
      console.error('Fetch assessments error:', err);
      setError('Failed to load assessments. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="student-layout">
      {/* Header */}
      <header className="student-header">
        <div className="header-brand">
          <div className="logo-icon">A</div>
          <span className="logo-text">AssessHub</span>
        </div>
        <div className="header-right">
          <span className="user-email">{user?.email}</span>
          <button onClick={handleLogout} className="btn-ghost" id="logout-btn">
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="student-main">
        {/* Hero / Welcome Section */}
        <div className="hero-banner">
          <div className="hero-content">
            <h1 className="hero-title">Welcome back 👋</h1>
            <p className="hero-subtitle">
              Ready to test your knowledge? Complete the available assessments and submit your answers.
            </p>
          </div>
        </div>

        {/* Assessment Section */}
        <div className="assessment-section">
          <div className="section-header">
            <div>
              <h2 className="section-title">Available Assessments</h2>
              <p className="section-subtitle">
                Select an active assessment below to begin your test
              </p>
            </div>
            {!loading && assessments.length > 0 && (
              <span className="count-badge">{assessments.length} Total</span>
            )}
          </div>

          {loading && (
            <div className="center-content">
              <div className="spinner large" />
            </div>
          )}

          {error && <div className="alert alert-error">{error}</div>}

          {!loading && !error && assessments.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3>No assessments available</h3>
              <p>New assessments will appear here when they are published.</p>
            </div>
          )}

          {!loading && !error && assessments.length > 0 && (
            <div className="assessment-grid">
              {assessments.map((a) => (
                <div
                  key={a._id}
                  className={`assessment-card ${a.hasSubmitted ? 'card-completed' : 'card-available'}`}
                >
                  <div className="card-body">
                    <div className="card-top-row">
                      <h3 className="card-title">{a.name}</h3>
                      <span className={`status-pill ${a.hasSubmitted ? 'status-completed' : 'status-available'}`}>
                        {a.hasSubmitted ? '✓ Completed' : 'Available'}
                      </span>
                    </div>

                    <p className="card-description">
                      {a.description || 'No description provided for this assessment.'}
                    </p>

                    <div className="card-meta">
                      <span className="meta-badge">
                        <span className="meta-icon">📝</span>
                        {a.questionCount} Question{a.questionCount !== 1 ? 's' : ''}
                      </span>
                      <span className="meta-badge">
                        <span className="meta-icon">⭐</span>
                        {a.totalMarks} Marks
                      </span>
                    </div>
                  </div>

                  <div className="card-footer">
                    {a.hasSubmitted ? (
                      <button
                        id={`completed-${a._id}`}
                        className="btn-completed btn-full"
                        disabled
                      >
                        ✓ Completed
                      </button>
                    ) : (
                      <button
                        id={`participate-${a._id}`}
                        className="btn-primary btn-full"
                        onClick={() => navigate(`/assessment/${a._id}`)}
                      >
                        Participate
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
