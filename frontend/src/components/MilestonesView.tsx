import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  listMilestones,
  getMilestone,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  listWorkItems,
  Milestone,
  WorkItem,
} from '../api';
import WorkItemView from './WorkItemView';
import MilestoneView from './MilestoneView';
import { formatDate } from '../utils';

export default function MilestonesView() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [selectedWorkItemId, setSelectedWorkItemId] = useState<string | null>(null);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [formData, setFormData] = useState<Partial<Milestone>>({
    name: '',
    description: '',
    target_date: '',
    work_items: [],
    status: 'pending',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [milestonesData, workItemsData] = await Promise.all([
        listMilestones(),
        listWorkItems(),
      ]);
      setMilestones(milestonesData);
      setWorkItems(workItemsData);
    } catch (error) {
      console.error('Error loading data:', error);
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
      loadData();
      toast.success(editingMilestone ? 'Milestone updated' : 'Milestone created');
    } catch (error) {
      console.error('Error saving milestone:', error);
      toast.error('Error saving milestone');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this milestone?')) return;
    try {
      await deleteMilestone(id);
      loadData();
      toast.success('Milestone deleted');
    } catch (error) {
      console.error('Error deleting milestone:', error);
      toast.error('Error deleting milestone');
    }
  }

  function handleWorkItemClick(workItemId: string) {
    setSelectedWorkItemId(workItemId);
  }

  function handleSeeWorkItems(milestoneId: string) {
    setSelectedMilestoneId(milestoneId);
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'achieved': return '#27ae60'; // Vibrant Green
      case 'at_risk': return '#f39c12';  // Vibrant Orange
      case 'missed': return '#e74c3c';   // Vibrant Red
      case 'pending': return '#3498db';  // Vibrant Blue
      default: return '#95a5a6';         // Vibrant Slate
    }
  }

  if (loading) {
    return <div className="view-loading">Loading milestones...</div>;
  }

  if (selectedMilestoneId) {
    return (
      <MilestoneView
        milestoneId={selectedMilestoneId}
        onClose={() => setSelectedMilestoneId(null)}
      />
    );
  }

  if (selectedWorkItemId) {
    return (
      <WorkItemView
        workItemId={selectedWorkItemId}
        onClose={() => setSelectedWorkItemId(null)}
      />
    );
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          Milestones
          <span 
            style={{ 
              cursor: 'help',
              fontSize: '0.875rem',
              color: '#64748b',
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              border: '1.5px solid #94a3b8',
              fontWeight: 'bold',
            }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            ?
            {showTooltip && (
              <div style={{
                position: 'absolute',
                top: '30px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: '#1e293b',
                color: 'white',
                padding: '12px 16px',
                borderRadius: '8px',
                fontSize: '0.875rem',
                width: '320px',
                zIndex: 1000,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                lineHeight: '1.5',
                textAlign: 'left',
                fontWeight: 'normal',
              }}>
                <div style={{ marginBottom: '8px' }}>
                  <strong style={{ color: '#f1f5f9' }}>Milestone:</strong> A significant project checkpoint or delivery target with a specific date and associated work items.
                </div>
                <div style={{ color: '#cbd5e1', fontSize: '0.8125rem' }}>
                  ✓ Helps track progress and delivery timelines for key objectives.
                </div>
                {/* Tooltip arrow */}
                <div style={{
                  position: 'absolute',
                  top: '-6px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '0',
                  height: '0',
                  borderLeft: '6px solid transparent',
                  borderRight: '6px solid transparent',
                  borderBottom: '6px solid #1e293b',
                }}></div>
              </div>
            )}
          </span>
        </h2>
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
              <span
                className="status-badge"
                style={{
                  backgroundColor: getStatusColor(milestone.status),
                }}
              >
                {milestone.status}
              </span>
            </div>
            <div className="card-body">
              <p className="card-description">{milestone.description}</p>
              <div className="card-meta">
                <div className="meta-item">
                  <span className="meta-label">Target Date:</span>
                  <span className="meta-value">
                    {formatDate(milestone.target_date)}
                  </span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Work Items:</span>
                  <span className="meta-value">{milestone.work_items.length}</span>
                </div>
              </div>
              {milestone.work_items.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <button
                    onClick={() => handleSeeWorkItems(milestone.id)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#8b7355',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.9em',
                      fontWeight: '500',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#6d5b45';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#8b7355';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <span>📋</span>
                    See Work Items ({milestone.work_items.length})
                  </button>
                </div>
              )}
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

