import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
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
import WorkItemView from './WorkItemView';

export default function WorkItemsView() {
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<WorkItem | null>(null);
  const [selectedWorkItemId, setSelectedWorkItemId] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [formData, setFormData] = useState<Partial<WorkItem>>({
    title: '',
    description: '',
    status: 'not_started',
    estimated_days: 0,
    assigned_to: [],
    dependencies: [],
    tags: [],
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
      tags: [],
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingItem) {
        const oldStatus = editingItem.status;
        const newStatus = formData.status || editingItem.status;
        
        // Optimistically update the list
        setWorkItems(prevItems =>
          prevItems.map(item =>
            item.id === editingItem.id ? { ...item, ...formData } as WorkItem : item
          )
        );
        setShowForm(false);
        
        const updated = await updateWorkItem(editingItem.id, formData as WorkItem);
        console.log('Work item updated via form:', updated);
        console.log('Metadata from form update:', updated._metadata);
        
        // Update with actual server response
        setWorkItems(prevItems =>
          prevItems.map(item =>
            item.id === editingItem.id ? updated : item
          )
        );
        
        // Show appropriate success message
        if (oldStatus !== newStatus) {
          toast.success(`Work item updated - Status changed to ${newStatus.replace('_', ' ')}`);
        } else {
          toast.success('Work item updated');
        }
        
        // Check if a risk was created
        if (updated._metadata?.risk_created) {
          const riskInfo = updated._metadata.risk_created;
          console.log('Risk info from form:', riskInfo);
          if ((riskInfo.created || riskInfo.updated) && riskInfo.blocked_item_name) {
            const action = riskInfo.created ? 'created' : 'updated';
            const milestoneText = riskInfo.milestone_name ? ` in ${riskInfo.milestone_name}` : '';
            toast(
              `Risk ${action}: "${riskInfo.blocked_item_name}" is blocked and affects ${riskInfo.dependent_count} dependent item(s)${milestoneText}`,
              { 
                icon: '⚠️',
                duration: 5000
              }
            );
          }
        }
      } else {
        const newItem: WorkItem = {
          id: `work_item_${Date.now()}`,
          ...formData,
          estimated_days: formData.estimated_days || 0,
          assigned_to: formData.assigned_to || [],
          dependencies: formData.dependencies || [],
          tags: formData.tags || [],
        } as WorkItem;
        await createWorkItem(newItem);
        setShowForm(false);
        loadData();
        toast.success('Work item created');
      }
    } catch (error) {
      console.error('Error saving work item:', error);
      // Reload data on error to revert optimistic update
      loadData();
      toast.error('Error saving work item');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this work item?')) return;
    try {
      await deleteWorkItem(id);
      loadData();
      toast.success('Work item deleted');
    } catch (error) {
      console.error('Error deleting work item:', error);
      toast.error('Error deleting work item');
    }
  }

  async function handleToggleComplete(item: WorkItem, e: React.ChangeEvent<HTMLInputElement>) {
    e.stopPropagation();
    // When checked, always set to completed. When unchecked, set to in_progress
    const newStatus = item.status === 'completed' ? 'in_progress' : 'completed';
    
    console.log(`Toggling work item ${item.id} from ${item.status} to ${newStatus}`);
    
    // Optimistically update the UI immediately
    setWorkItems(prevItems => 
      prevItems.map(wi => 
        wi.id === item.id ? { ...wi, status: newStatus } : wi
      )
    );
    
    try {
      const updated = await updateWorkItem(item.id, { ...item, status: newStatus });
      console.log('Work item updated successfully:', updated);
      console.log('Metadata:', updated._metadata);
      
      // Update with the actual server response
      setWorkItems(prevItems => 
        prevItems.map(wi => 
          wi.id === item.id ? updated : wi
        )
      );
      
      toast.success(`Work item ${newStatus.replace('_', ' ')}`);
      
      // Check if a risk was created
      if (updated._metadata?.risk_created) {
        const riskInfo = updated._metadata.risk_created;
        console.log('Risk info:', riskInfo);
        if (riskInfo.created || riskInfo.updated) {
          const action = riskInfo.created ? 'created' : 'updated';
          console.log('Showing risk notification:', action);
          const milestoneText = riskInfo.milestone_name ? ` in ${riskInfo.milestone_name}` : '';
          toast(
            `Risk ${action}: "${riskInfo.blocked_item_name}" is blocked and affects ${riskInfo.dependent_count} dependent item(s)${milestoneText}`,
            { 
              icon: '⚠️',
              duration: 5000
            }
          );
        }
      } else {
        console.log('No risk metadata found');
      }
    } catch (error) {
      console.error('Error toggling work item status:', error);
      // Revert the optimistic update on error
      await loadData();
      toast.error(`Error updating work item: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          Work Items
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
                  <strong style={{ color: '#f1f5f9' }}>Work Item:</strong> A task, story, or unit of work that contributes to project delivery, with estimates, dependencies, and status tracking.
                </div>
                <div style={{ color: '#cbd5e1', fontSize: '0.8125rem' }}>
                  ✓ Auto-creates risks when blocked items are detected.
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
              <div className="form-group">
                <label>Tags (comma-separated)</label>
                <input
                  type="text"
                  value={formData.tags?.join(', ') || ''}
                  onChange={(e) => {
                    const tagString = e.target.value;
                    const tags = tagString ? tagString.split(',').map(t => t.trim()).filter(t => t) : [];
                    setFormData({ ...formData, tags });
                  }}
                  placeholder="e.g., urgent, review"
                />
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
              <th style={{ width: '40px' }}></th>
              <th>Title</th>
              <th>Status</th>
              <th>Estimated Days</th>
              <th>Milestone</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {workItems.map((item) => (
              <tr 
                key={item.id}
                onClick={() => setSelectedWorkItemId(item.id)}
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f5f5f5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '';
                }}
              >
                <td onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={item.status === 'completed'}
                    onChange={(e) => handleToggleComplete(item, e as any)}
                    style={{ 
                      width: '18px', 
                      height: '18px', 
                      cursor: 'pointer',
                      accentColor: '#28a745'
                    }}
                  />
                </td>
                <td>
                  <div className="table-cell-title">{item.title}</div>
                  <div className="table-cell-subtitle">{item.description}</div>
                  {item.tags && item.tags.filter(t => t !== 'completed').length > 0 && (
                    <div style={{ marginTop: '4px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {item.tags.filter(t => t !== 'completed').map((tag, idx) => (
                        <span
                          key={idx}
                          style={{
                            fontSize: '0.7rem',
                            padding: '2px 6px',
                            backgroundColor: '#3498db',
                            color: 'white',
                            borderRadius: '3px',
                            fontWeight: 500
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td>
                  <span
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(item.status) }}
                  >
                    {item.status.replace('_', ' ')}
                  </span>
                </td>
                <td>{item.estimated_days}</td>
                <td>
                  {milestones.find((m) => m.id === item.milestone_id)?.name || '-'}
                </td>
                <td>
                  <div className="table-actions">
                    <button 
                      className="btn-icon" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(item);
                      }}
                    >
                      ✏️
                    </button>
                    <button 
                      className="btn-icon btn-danger" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item.id);
                      }}
                    >
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

      {/* Work Item Detail Modal */}
      {selectedWorkItemId && (
        <WorkItemView 
          workItemId={selectedWorkItemId} 
          onClose={() => setSelectedWorkItemId(null)} 
        />
      )}
    </div>
  );
}

