import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  getMilestone,
  updateMilestone,
  listWorkItems,
  listActors,
  updateWorkItem,
  Milestone,
  WorkItem,
  Actor,
} from '../api';
import WorkItemView from './WorkItemView';
import { formatDate } from '../utils';

interface MilestoneViewProps {
  milestoneId: string;
  onClose: () => void;
}

export default function MilestoneView({ milestoneId, onClose }: MilestoneViewProps) {
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [allWorkItems, setAllWorkItems] = useState<WorkItem[]>([]);
  const [actors, setActors] = useState<Actor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [selectedWorkItemId, setSelectedWorkItemId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Milestone>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadMilestoneDetails();
  }, [milestoneId]);

  async function loadMilestoneDetails() {
    setLoading(true);
    setError('');
    try {
      const [milestoneData, workItemsData, actorsData] = await Promise.all([
        getMilestone(milestoneId),
        listWorkItems(),
        listActors(),
      ]);

      setMilestone(milestoneData);
      setAllWorkItems(workItemsData);
      setActors(actorsData);

      // Get work items for this milestone
      const milestoneWorkItems = milestoneData.work_items
        .map(id => workItemsData.find(wi => wi.id === id))
        .filter((wi): wi is WorkItem => wi !== undefined);
      setWorkItems(milestoneWorkItems);

      if (!isEditing) {
        setFormData(milestoneData);
      }
    } catch (err: any) {
      console.error('Error loading milestone details:', err);
      setError(err.message || 'Failed to load milestone details');
    } finally {
      setLoading(false);
    }
  }

  function handleEdit() {
    setIsEditing(true);
    setFormData(milestone || {});
  }

  function handleCancelEdit() {
    setIsEditing(false);
    setFormData(milestone || {});
  }

  async function handleSave() {
    if (!milestone) return;
    setSaving(true);
    try {
      await updateMilestone(milestone.id, formData as Milestone);
      setIsEditing(false);
      await loadMilestoneDetails();
      toast.success('Milestone updated');
    } catch (err: any) {
      console.error('Error saving milestone:', err);
      toast.error('Error saving milestone: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  }

  function handleWorkItemClick(workItemId: string) {
    setSelectedWorkItemId(workItemId);
  }

  async function handleToggleComplete(workItem: WorkItem, e: React.MouseEvent) {
    e.stopPropagation();
    // When checked, always set to completed. When unchecked, set to in_progress
    const newStatus = workItem.status === 'completed' ? 'in_progress' : 'completed';
    
    try {
      await updateWorkItem(workItem.id, { ...workItem, status: newStatus });
      await loadMilestoneDetails();
      toast.success(`Work item marked as ${newStatus.replace('_', ' ')}`);
    } catch (err: any) {
      console.error('Error toggling work item status:', err);
      toast.error('Error updating work item: ' + (err.message || 'Unknown error'));
    }
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

  function getWorkItemStatusColor(status: string): string {
    switch (status) {
      case 'completed': return '#a8c5a0';
      case 'in_progress': return '#d4a574';
      case 'blocked': return '#c99b88';
      case 'not_started': return '#8b7355';
      default: return '#8b7355';
    }
  }

  function getActorName(actorId: string): string {
    const actor = actors.find(a => a.id === actorId);
    return actor ? actor.display_name : actorId;
  }


  if (selectedWorkItemId) {
    return (
      <WorkItemView
        workItemId={selectedWorkItemId}
        onClose={() => setSelectedWorkItemId(null)}
      />
    );
  }

  if (loading) {
    return (
      <div className="view-container">
        <div className="view-loading">Loading milestone details...</div>
      </div>
    );
  }

  if (error || !milestone) {
    return (
      <div className="view-container">
        <div className="view-header">
          <button className="btn-secondary" onClick={onClose} style={{ marginRight: '1rem' }}>
            ← Back
          </button>
          <h2>Error</h2>
        </div>
        <div style={{ padding: '20px', color: '#dc3545' }}>
          {error || 'Milestone not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <button className="btn-secondary" onClick={onClose} style={{ marginRight: '1rem' }}>
          ← Back to Milestones
        </button>
        <h2>{isEditing ? 'Edit Milestone' : milestone.name}</h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: 'auto' }}>
          {!isEditing ? (
            <button className="btn-icon" onClick={handleEdit} title="Edit">
              ✏️ Edit
            </button>
          ) : (
            <>
              <button 
                className="btn-primary" 
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button 
                className="btn-secondary" 
                onClick={handleCancelEdit}
                disabled={saving}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Basic Information */}
        <div className="detail-section" style={{ marginBottom: '30px' }}>
          <h3 className="detail-section-title">Basic Information</h3>
            {isEditing ? (
              <>
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={formData.description || ''}
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
                    value={formData.status || 'pending'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="pending">Pending</option>
                    <option value="at_risk">At Risk</option>
                    <option value="achieved">Achieved</option>
                    <option value="missed">Missed</option>
                  </select>
                </div>
              </>
            ) : (
              <>
                <div className="detail-row">
                  <div className="detail-label">Name</div>
                  <div className="detail-value">{milestone.name}</div>
                </div>
                <div className="detail-row">
                  <div className="detail-label">Description</div>
                  <div className="detail-value">{milestone.description || 'No description'}</div>
                </div>
                <div className="detail-row">
                  <div className="detail-label">Target Date</div>
                  <div className="detail-value">{formatDate(milestone.target_date)}</div>
                </div>
                <div className="detail-row">
                  <div className="detail-label">Status</div>
                  <div className="detail-value">
                    <span
                      className="status-badge"
                      style={{
                        backgroundColor: getStatusColor(milestone.status),
                      }}
                    >
                      {milestone.status}
                    </span>
                  </div>
                </div>
                <div className="detail-row">
                  <div className="detail-label">Work Items Count</div>
                  <div className="detail-value">{milestone.work_items.length}</div>
                </div>
              </>
            )}
          </div>

        {/* Work Items List */}
        {!isEditing && (
          <div className="detail-section">
            <h3 className="detail-section-title">Work Items ({workItems.length})</h3>
              {workItems.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#6c757d' }}>
                  No work items assigned to this milestone.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {workItems.map((workItem) => (
                    <div
                      key={workItem.id}
                      onClick={() => handleWorkItemClick(workItem.id)}
                      style={{
                        padding: '16px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        border: '2px solid #e0e0e0',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#fefbf7';
                        e.currentTarget.style.borderColor = '#d4a574';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#f8f9fa';
                        e.currentTarget.style.borderColor = '#e0e0e0';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                          <input
                            type="checkbox"
                            checked={workItem.status === 'completed'}
                            onClick={(e) => handleToggleComplete(workItem, e)}
                            style={{ 
                              width: '20px', 
                              height: '20px', 
                              cursor: 'pointer',
                              accentColor: '#a8c5a0',
                              marginTop: '2px',
                              flexShrink: 0
                            }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '600', fontSize: '1em', color: '#333', marginBottom: '6px' }}>
                              {workItem.title}
                            </div>
                            {workItem.description && (
                              <div style={{ fontSize: '0.9em', color: '#666', marginBottom: '8px' }}>
                                {workItem.description}
                              </div>
                            )}
                          </div>
                        </div>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            backgroundColor: getWorkItemStatusColor(workItem.status),
                            color: 'white',
                            fontSize: '0.75em',
                            fontWeight: '500',
                            marginLeft: '12px',
                          }}
                        >
                          {workItem.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.85em', color: '#666' }}>
                        {workItem.estimated_days > 0 && (
                          <div>
                            <strong>Estimated:</strong> {workItem.estimated_days} day{workItem.estimated_days !== 1 ? 's' : ''}
                          </div>
                        )}
                        {workItem.actual_days && (
                          <div>
                            <strong>Actual:</strong> {workItem.actual_days} day{workItem.actual_days !== 1 ? 's' : ''}
                          </div>
                        )}
                        {workItem.assigned_to && workItem.assigned_to.length > 0 && (
                          <div>
                            <strong>Assigned to:</strong> {workItem.assigned_to.map(id => getActorName(id)).join(', ')}
                          </div>
                        )}
                        {workItem.start_date && (
                          <div>
                            <strong>Start:</strong> {formatDate(workItem.start_date)}
                          </div>
                        )}
                        {workItem.end_date && (
                          <div>
                            <strong>End:</strong> {formatDate(workItem.end_date)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
}

