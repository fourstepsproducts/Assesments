import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';

export default function AdminAssessments() {
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchAssessments();
  }, []);

  const fetchAssessments = async () => {
    try {
      const res = await api.get('/api/admin/assessments');
      setAssessments(res.data);
    } catch (err) {
      setError('Failed to load assessments.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/api/admin/assessments/${deleteId}`);
      setAssessments((prev) => prev.filter((a) => a._id !== deleteId));
      setDeleteId(null);
    } catch (err) {
      setError('Failed to delete assessment.');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (date) =>
    new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });

  if (loading) return <div className="center-content"><div className="spinner large" /></div>;

  return (
    <div className="admin-assessments">
      <div className="page-header">
        <div>
          <h2>Assessments</h2>
          <p>Manage all assessments</p>
        </div>
        <button
          id="create-assessment-btn"
          className="btn-primary"
          onClick={() => navigate('/admin/assessments/create')}
        >
          + Create Assessment
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {assessments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No assessments yet</h3>
          <p>Create your first assessment to get started.</p>
          <button
            className="btn-primary"
            onClick={() => navigate('/admin/assessments/create')}
          >
            Create Assessment
          </button>
        </div>
      ) : (
        <div className="admin-assessment-grid">
          {assessments.map((a) => (
            <div key={a._id} className="admin-assessment-card">
              <div className="card-body">
                <h3 className="card-title">{a.name}</h3>
                {a.description && (
                  <p className="card-description">{a.description}</p>
                )}
                <div className="card-meta">
                  <span className="meta-badge">
                    📝 {a.questions?.length || 0} Questions
                  </span>
                  <span className="meta-badge">
                    ⭐ {a.totalMarks} Marks
                  </span>
                  <span className="meta-badge">
                    📅 {formatDate(a.createdAt)}
                  </span>
                </div>
              </div>
              <div className="card-actions">
                <button
                  className="btn-ghost btn-sm"
                  onClick={() => navigate(`/admin/assessments/${a._id}`)}
                  id={`view-${a._id}`}
                >
                  View
                </button>
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => navigate(`/admin/assessments/${a._id}/edit`)}
                  id={`edit-${a._id}`}
                >
                  Edit
                </button>
                <button
                  className="btn-danger btn-sm"
                  onClick={() => setDeleteId(a._id)}
                  id={`delete-${a._id}`}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Assessment?</h3>
            <p>This will permanently delete the assessment and all its submissions. This action cannot be undone.</p>
            <div className="modal-actions">
              <button
                className="btn-ghost"
                onClick={() => setDeleteId(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                id="confirm-delete-btn"
                className="btn-danger"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? <span className="btn-spinner" /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
