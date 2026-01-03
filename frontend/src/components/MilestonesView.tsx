import { useState, useEffect } from 'react';
import {
  listMilestones,
  getMilestone,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  Milestone,
} from '../api';

export default function MilestonesView() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [formData, setFormData] = useState<Partial<Milestone>>({
    name: '',
    description: '',
    target_date: '',
    work_items: [],
    status: 'pending',
  });

  useEffect(() => {
    loadMilestones();
  }, []);

  async function loadMilestones() {
    try {
      const data = await listMilestones();
      setMilestones(data);
    } catch (error) {
      console.error('Error loading milestones:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(milestone: Milestone) {
    setEditingMilestone(milestone);
    setFormData(milestone);
    setShowForm(true);
  }

  function handleNew() {
    setEditingMilestone(null);
    setFormData({
      name: '',
      description: '',
      target_date: '',
      work_items: [],
      status: 'pending',
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingMilestone) {
        await updateMilestone(editingMilestone.id, formData as Milestone);
      } else {
        const newMilestone: Milestone = {
          id: `milestone_${Date.now()}`,
          ...formData,
          target_date: formData.target_date || new Date().toISOString(),
          work_items: formData.work_items || [],
          status: formData.status || 'pending',
        } as Milestone;
        await createMilestone(newMilestone);
      }
      setShowForm(false);
      loadMilestones();
    } catch (error) {
      console.error('Error saving milestone:', error);
      alert('Error saving milestone');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this milestone?')) return;
    try {
      await deleteMilestone(id);
      loadMilestones();
    } catch (error) {
      console.error('Error deleting milestone:', error);
      alert('Error deleting milestone');
    }
  }

  if (loading) {
    return <div className="view-loading">Loading milestones...</div>;
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <h2>Milestones</h2>
        <button className="btn-primary" onClick={handleNew}>
          + New Milestone
        </button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{editingMilestone ? 'Edit Milestone' : 'New Milestone'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>Target Date *</label>
                <input
                  type="datetime-local"
                  value={formData.target_date ? new Date(formData.target_date).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setFormData({ ...formData, target_date: new Date(e.target.value).toISOString() })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="pending">Pending</option>
                  <option value="at_risk">At Risk</option>
                  <option value="achieved">Achieved</option>
                  <option value="missed">Missed</option>
                </select>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  {editingMilestone ? 'Update' : 'Create'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="cards-grid">
        {milestones.map((milestone) => (
          <div key={milestone.id} className="card">
            <div className="card-header">
              <h3>{milestone.name}</h3>
              <span className={`status-badge status-${milestone.status}`}>
                {milestone.status}
              </span>
            </div>
            <div className="card-body">
              <p className="card-description">{milestone.description}</p>
              <div className="card-meta">
                <div className="meta-item">
                  <span className="meta-label">Target Date:</span>
                  <span className="meta-value">
                    {new Date(milestone.target_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Work Items:</span>
                  <span className="meta-value">{milestone.work_items.length}</span>
                </div>
              </div>
            </div>
            <div className="card-actions">
              <button className="btn-icon" onClick={() => handleEdit(milestone)}>
                ✏️ Edit
              </button>
              <button className="btn-icon btn-danger" onClick={() => handleDelete(milestone.id)}>
                🗑️ Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {milestones.length === 0 && (
        <div className="empty-state">
          <p>No milestones found. Create your first milestone!</p>
        </div>
      )}
    </div>
  );
}

