import { useState, useEffect } from 'react';
import {
  listWorkItems,
  getWorkItem,
  createWorkItem,
  updateWorkItem,
  deleteWorkItem,
  listMilestones,
  WorkItem,
  Milestone,
} from '../api';

export default function WorkItemsView() {
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<WorkItem | null>(null);
  const [formData, setFormData] = useState<Partial<WorkItem>>({
    title: '',
    description: '',
    status: 'not_started',
    estimated_days: 0,
    assigned_to: [],
    dependencies: [],
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [items, milestoneData] = await Promise.all([
        listWorkItems(),
        listMilestones(),
      ]);
      setWorkItems(items);
      setMilestones(milestoneData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(item: WorkItem) {
    setEditingItem(item);
    setFormData(item);
    setShowForm(true);
  }

  function handleNew() {
    setEditingItem(null);
    setFormData({
      title: '',
      description: '',
      status: 'not_started',
      estimated_days: 0,
      assigned_to: [],
      dependencies: [],
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingItem) {
        await updateWorkItem(editingItem.id, formData as WorkItem);
      } else {
        const newItem: WorkItem = {
          id: `work_item_${Date.now()}`,
          ...formData,
          estimated_days: formData.estimated_days || 0,
          assigned_to: formData.assigned_to || [],
          dependencies: formData.dependencies || [],
        } as WorkItem;
        await createWorkItem(newItem);
      }
      setShowForm(false);
      loadData();
    } catch (error) {
      console.error('Error saving work item:', error);
      alert('Error saving work item');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this work item?')) return;
    try {
      await deleteWorkItem(id);
      loadData();
    } catch (error) {
      console.error('Error deleting work item:', error);
      alert('Error deleting work item');
    }
  }

  function getStatusColor(status: string) {
    const colors: Record<string, string> = {
      not_started: '#95a5a6',
      in_progress: '#3498db',
      blocked: '#e74c3c',
      completed: '#27ae60',
    };
    return colors[status] || '#95a5a6';
  }

  if (loading) {
    return <div className="view-loading">Loading work items...</div>;
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <h2>Work Items</h2>
        <button className="btn-primary" onClick={handleNew}>
          + New Work Item
        </button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{editingItem ? 'Edit Work Item' : 'New Work Item'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
              <div className="form-row">
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  >
                    <option value="not_started">Not Started</option>
                    <option value="in_progress">In Progress</option>
                    <option value="blocked">Blocked</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Estimated Days</label>
                  <input
                    type="number"
                    value={formData.estimated_days}
                    onChange={(e) => setFormData({ ...formData, estimated_days: parseFloat(e.target.value) })}
                    min="0"
                    step="0.5"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Milestone</label>
                <select
                  value={formData.milestone_id || ''}
                  onChange={(e) => setFormData({ ...formData, milestone_id: e.target.value || undefined })}
                >
                  <option value="">None</option>
                  {milestones.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  {editingItem ? 'Update' : 'Create'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Estimated Days</th>
              <th>Milestone</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {workItems.map((item) => (
              <tr key={item.id}>
                <td>
                  <div className="table-cell-title">{item.title}</div>
                  <div className="table-cell-subtitle">{item.description}</div>
                </td>
                <td>
                  <span
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(item.status) }}
                  >
                    {item.status}
                  </span>
                </td>
                <td>{item.estimated_days}</td>
                <td>
                  {milestones.find((m) => m.id === item.milestone_id)?.name || '-'}
                </td>
                <td>
                  <div className="table-actions">
                    <button className="btn-icon" onClick={() => handleEdit(item)}>
                      ✏️
                    </button>
                    <button className="btn-icon btn-danger" onClick={() => handleDelete(item.id)}>
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {workItems.length === 0 && (
        <div className="empty-state">
          <p>No work items found. Create your first work item!</p>
        </div>
      )}
    </div>
  );
}

