import { useState, useEffect } from 'react';
import {
  getWorkItem,
  updateWorkItem,
  listActors,
  listWorkItems,
  listMilestones,
  listRisks,
  listOwnership,
  WorkItem,
  Actor,
  Milestone,
  Risk,
  Ownership,
} from '../api';

interface WorkItemViewProps {
  workItemId: string;
  onClose: () => void;
}

export default function WorkItemView({ workItemId, onClose }: WorkItemViewProps) {
  const [workItem, setWorkItem] = useState<WorkItem | null>(null);
  const [actors, setActors] = useState<Actor[]>([]);
  const [allWorkItems, setAllWorkItems] = useState<WorkItem[]>([]);
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [ownership, setOwnership] = useState<Ownership | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<WorkItem>>({});
  const [saving, setSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadWorkItemDetails();
    
    // Set up polling to refresh data every 5 seconds
    const pollInterval = setInterval(() => {
      loadWorkItemDetails();
    }, 5000);

    // Cleanup on unmount
    return () => {
      clearInterval(pollInterval);
    };
  }, [workItemId]);

  async function loadWorkItemDetails(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');
    try {
      const [itemData, actorsData, workItemsData, milestonesData, risksData, ownershipData] = await Promise.all([
        getWorkItem(workItemId),
        listActors(),
        listWorkItems(),
        listMilestones(),
        listRisks(),
        listOwnership().catch(() => []),
      ]);

      setWorkItem(itemData);
      setActors(actorsData);
      setAllWorkItems(workItemsData);
      setMilestones(milestonesData);
      if (!isEditing) {
        setFormData(itemData);
      }

      // Find milestone
      if (itemData.milestone_id) {
        const milestoneData = milestonesData.find(m => m.id === itemData.milestone_id);
        setMilestone(milestoneData || null);
      }

      // Find risks affecting this work item
      const affectedRisks = risksData.filter(risk => 
        risk.affected_items && risk.affected_items.includes(workItemId)
      );
      setRisks(affectedRisks);

      // Find ownership
      const ownershipRecord = ownershipData.find(o => 
        o.object_type === 'work_item' && o.object_id === workItemId && !o.ended_at
      );
      setOwnership(ownershipRecord || null);
      
      setLastUpdated(new Date());

    } catch (err: any) {
      console.error('Error loading work item details:', err);
      setError(err.message || 'Failed to load work item details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function getActorName(actorId: string): string {
    const actor = actors.find(a => a.id === actorId);
    return actor ? actor.display_name : actorId;
  }

  function getWorkItemTitle(itemId: string): string {
    const item = allWorkItems.find(wi => wi.id === itemId);
    return item ? item.title : itemId;
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

  function getSeverityColor(severity: string) {
    const colors: Record<string, string> = {
      low: '#3498db',
      medium: '#f39c12',
      high: '#e67e22',
      critical: '#e74c3c',
    };
    return colors[severity] || '#95a5a6';
  }

  function formatDate(dateString?: string | null): string {
    if (!dateString) return 'Not set';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  }

  function formatDateForInput(dateString?: string | null): string {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  }

  function handleEdit() {
    setFormData(workItem!);
    setIsEditing(true);
  }

  function handleCancelEdit() {
    setFormData(workItem!);
    setIsEditing(false);
  }

  function handleRefresh() {
    loadWorkItemDetails(true);
  }

  function getStatusChangeIndicator(itemId: string, currentStatus: string): string | null {
    // This would ideally compare with previous state, but for now we'll just show the current status
    if (currentStatus === 'blocked') {
      return '🔴';
    } else if (currentStatus === 'in_progress') {
      return '🟢';
    } else if (currentStatus === 'completed') {
      return '✅';
    }
    return null;
  }

  async function handleSave() {
    if (!workItem) return;
    setSaving(true);
    try {
      const updated = await updateWorkItem(workItem.id, formData as WorkItem);
      setWorkItem(updated);
      setFormData(updated);
      setIsEditing(false);
      
      // Refresh milestone if changed
      if (updated.milestone_id) {
        const milestoneData = milestones.find(m => m.id === updated.milestone_id);
        setMilestone(milestoneData || null);
      } else {
        setMilestone(null);
      }
    } catch (err: any) {
      console.error('Error updating work item:', err);
      alert('Failed to update work item: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  }

  // Find dependent work items (items that depend on this one)
  const dependentItems = allWorkItems.filter(item => 
    item.dependencies && item.dependencies.includes(workItemId)
  );

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content detail-modal" onClick={(e) => e.stopPropagation()}>
          <div className="view-loading">Loading work item details...</div>
        </div>
      </div>
    );
  }

  if (error || !workItem) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content detail-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Error</h2>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
          <div className="error-message">{error || 'Work item not found'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <h2>{isEditing ? 'Edit Work Item' : 'Work Item Details'}</h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
              Last updated: {lastUpdated.toLocaleTimeString()}
              {refreshing && <span style={{ marginLeft: '0.5rem' }}>🔄 Refreshing...</span>}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {!isEditing && (
              <button 
                className="btn-icon" 
                onClick={handleRefresh} 
                title="Refresh"
                disabled={refreshing}
              >
                🔄
              </button>
            )}
            {!isEditing ? (
              <button className="btn-icon" onClick={handleEdit} title="Edit">
                ✏️
              </button>
            ) : (
              <>
                <button 
                  className="btn-primary" 
                  onClick={handleSave}
                  disabled={saving}
                  style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button 
                  className="btn-secondary" 
                  onClick={handleCancelEdit}
                  disabled={saving}
                  style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                >
                  Cancel
                </button>
              </>
            )}
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="detail-view detail-view-simple">
          {/* Title and Status */}
          <div className="detail-section-header">
            {isEditing ? (
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="detail-input-title"
                placeholder="Work Item Title"
              />
            ) : (
              <h3>{workItem.title}</h3>
            )}
            {isEditing ? (
              <select
                value={formData.status || workItem.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="detail-select-status"
              >
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="blocked">Blocked</option>
                <option value="completed">Completed</option>
              </select>
            ) : (
              <span
                className="status-badge"
                style={{ backgroundColor: getStatusColor(workItem.status) }}
              >
                {workItem.status.replace('_', ' ')}
              </span>
            )}
          </div>

          <div className="detail-section">
            <div className="detail-row">
              <div className="detail-label">ID</div>
              <div className="detail-value"><code>{workItem.id}</code></div>
            </div>

            <div className="detail-row">
              <div className="detail-label">Description</div>
              <div className="detail-value">
                {isEditing ? (
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="detail-textarea"
                    rows={3}
                    placeholder="Description"
                  />
                ) : (
                  workItem.description || '-'
                )}
              </div>
            </div>

            <div className="detail-row">
              <div className="detail-label">Estimated Days</div>
              <div className="detail-value">
                {isEditing ? (
                  <input
                    type="number"
                    value={formData.estimated_days || 0}
                    onChange={(e) => setFormData({ ...formData, estimated_days: parseFloat(e.target.value) })}
                    className="detail-input"
                    min="0"
                    step="0.5"
                  />
                ) : (
                  `${workItem.estimated_days} days`
                )}
              </div>
            </div>

            {(workItem.actual_days || isEditing) && (
              <div className="detail-row">
                <div className="detail-label">Actual Days</div>
                <div className="detail-value">
                  {isEditing ? (
                    <input
                      type="number"
                      value={formData.actual_days || ''}
                      onChange={(e) => setFormData({ ...formData, actual_days: e.target.value ? parseFloat(e.target.value) : undefined })}
                      className="detail-input"
                      min="0"
                      step="0.5"
                      placeholder="Actual days"
                    />
                  ) : (
                    <>
                      {workItem.actual_days} days
                      {workItem.estimated_days && workItem.actual_days && workItem.actual_days > workItem.estimated_days && (
                        <span style={{ color: '#e74c3c', marginLeft: '8px' }}>
                          (+{(workItem.actual_days - workItem.estimated_days).toFixed(1)} over estimate)
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="detail-row">
              <div className="detail-label">Start Date</div>
              <div className="detail-value">
                {isEditing ? (
                  <input
                    type="date"
                    value={formatDateForInput(formData.start_date)}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value || undefined })}
                    className="detail-input"
                  />
                ) : (
                  formatDate(workItem.start_date)
                )}
              </div>
            </div>

            <div className="detail-row">
              <div className="detail-label">End Date</div>
              <div className="detail-value">
                {isEditing ? (
                  <input
                    type="date"
                    value={formatDateForInput(formData.end_date)}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value || undefined })}
                    className="detail-input"
                  />
                ) : (
                  formatDate(workItem.end_date)
                )}
              </div>
            </div>
          </div>

          {/* Milestone Section */}
          <div className="detail-section-break"></div>
          <div className="detail-section">
            <h4 className="detail-section-title">Milestone</h4>
            <div className="detail-row">
              <div className="detail-label">Milestone</div>
              <div className="detail-value">
                {isEditing ? (
                  <select
                    value={formData.milestone_id || ''}
                    onChange={(e) => setFormData({ ...formData, milestone_id: e.target.value || undefined })}
                    className="detail-select"
                  >
                    <option value="">None</option>
                    {milestones.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  milestone ? milestone.name : 'None'
                )}
              </div>
            </div>
            {!isEditing && milestone && (
              <>
                <div className="detail-row">
                  <div className="detail-label">Description</div>
                  <div className="detail-value">{milestone.description}</div>
                </div>
                <div className="detail-row">
                  <div className="detail-label">Target Date</div>
                  <div className="detail-value">{formatDate(milestone.target_date)}</div>
                </div>
                <div className="detail-row">
                  <div className="detail-label">Status</div>
                  <div className="detail-value">
                    <span className="status-badge" style={{ backgroundColor: '#3498db' }}>
                      {milestone.status}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Assigned Team Members Section */}
          <div className="detail-section-break"></div>
          <div className="detail-section">
            <h4 className="detail-section-title">Assigned To ({isEditing ? (formData.assigned_to?.length || 0) : (workItem.assigned_to?.length || 0)})</h4>
            {!isEditing && workItem.assigned_to && workItem.assigned_to.length > 0 && (
              <div className="detail-list-simple">
                {workItem.assigned_to.map((actorId) => {
                  const actor = actors.find(a => a.id === actorId);
                  return (
                    <div key={actorId} className="detail-list-item-simple">
                      <span className="detail-list-item-title">
                        {getActorName(actorId)}
                        {actor?.type && (
                          <span className="detail-list-item-badge">
                            {actor.type}
                          </span>
                        )}
                      </span>
                      {actor?.title && (
                        <span className="detail-list-item-subtitle"> • {actor.title}</span>
                      )}
                      {actor?.email && (
                        <span className="detail-list-item-subtitle"> • {actor.email}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {!isEditing && (!workItem.assigned_to || workItem.assigned_to.length === 0) && (
              <p className="detail-empty">No team members assigned</p>
            )}
            {isEditing && (
              <div className="detail-note">
                Note: To modify assigned team members, please use the main edit form.
              </div>
            )}
          </div>

          {/* Owner Section */}
          {ownership && (
            <>
              <div className="detail-section-break"></div>
              <div className="detail-section">
                <h4 className="detail-section-title">Owner</h4>
                <div className="detail-row">
                  <div className="detail-label">Owner</div>
                  <div className="detail-value">{getActorName(ownership.owner_actor_id)}</div>
                </div>
                <div className="detail-row">
                  <div className="detail-label">Assigned At</div>
                  <div className="detail-value">{formatDate(ownership.assigned_at)}</div>
                </div>
                {ownership.assigned_by_actor_id && (
                  <div className="detail-row">
                    <div className="detail-label">Assigned By</div>
                    <div className="detail-value">{getActorName(ownership.assigned_by_actor_id)}</div>
                  </div>
                )}
                {ownership.reason && (
                  <div className="detail-row">
                    <div className="detail-label">Reason</div>
                    <div className="detail-value">{ownership.reason}</div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Dependencies Section */}
          {workItem.dependencies && workItem.dependencies.length > 0 && (
            <>
              <div className="detail-section-break"></div>
              <div className="detail-section">
                <h4 className="detail-section-title">Dependencies ({workItem.dependencies.length})</h4>
                <p className="detail-section-subtitle">This work item depends on:</p>
                <div className="detail-list-simple">
                  {workItem.dependencies.map((depId) => {
                    const depItem = allWorkItems.find(wi => wi.id === depId);
                    const isBlocked = depItem?.status === 'blocked';
                    const isCompleted = depItem?.status === 'completed';
                    return (
                      <div 
                        key={depId} 
                        className="detail-list-item-simple"
                        style={{
                          borderLeft: isBlocked ? '4px solid #e74c3c' : isCompleted ? '4px solid #27ae60' : 'none',
                          paddingLeft: isBlocked || isCompleted ? '0.85rem' : '1rem'
                        }}
                      >
                        <span className="detail-list-item-title">
                          {getStatusChangeIndicator(depId, depItem?.status || '')}
                          {getWorkItemTitle(depId)}
                          {depItem?.status && (
                            <span
                              className="status-badge"
                              style={{ 
                                backgroundColor: getStatusColor(depItem.status),
                                marginLeft: '8px',
                                fontSize: '0.7rem',
                                padding: '0.25rem 0.6rem'
                              }}
                            >
                              {depItem.status.replace('_', ' ')}
                            </span>
                          )}
                        </span>
                        <span className="detail-list-item-meta">
                          <code>{depId}</code>
                          {depItem?.estimated_days && ` • ${depItem.estimated_days} days`}
                          {isBlocked && (
                            <span style={{ color: '#e74c3c', marginLeft: '8px', fontWeight: 600 }}>
                              ⚠️ BLOCKING THIS ITEM
                            </span>
                          )}
                          {isCompleted && (
                            <span style={{ color: '#27ae60', marginLeft: '8px', fontWeight: 600 }}>
                              ✓ UNBLOCKED - Ready to proceed
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Dependent Work Items Section */}
          {dependentItems.length > 0 && (
            <>
              <div className="detail-section-break"></div>
              <div className="detail-section">
                <h4 className="detail-section-title">Blocks ({dependentItems.length})</h4>
                <p className="detail-section-subtitle">These work items depend on this one:</p>
                <div className="detail-list-simple">
                  {dependentItems.map((item) => {
                    const isCurrentBlocked = workItem.status === 'blocked';
                    const isCurrentCompleted = workItem.status === 'completed';
                    return (
                      <div 
                        key={item.id} 
                        className="detail-list-item-simple"
                        style={{
                          borderLeft: isCurrentBlocked ? '4px solid #e74c3c' : isCurrentCompleted ? '4px solid #27ae60' : 'none',
                          paddingLeft: isCurrentBlocked || isCurrentCompleted ? '0.85rem' : '1rem'
                        }}
                      >
                        <span className="detail-list-item-title">
                          {getStatusChangeIndicator(item.id, item.status)}
                          {item.title}
                          <span
                            className="status-badge"
                            style={{ 
                              backgroundColor: getStatusColor(item.status),
                              marginLeft: '8px',
                              fontSize: '0.7rem',
                              padding: '0.25rem 0.6rem'
                            }}
                          >
                            {item.status.replace('_', ' ')}
                          </span>
                        </span>
                        <span className="detail-list-item-meta">
                          <code>{item.id}</code>
                          {item.estimated_days && ` • ${item.estimated_days} days`}
                          {isCurrentBlocked && (
                            <span style={{ color: '#e74c3c', marginLeft: '8px', fontWeight: 600 }}>
                              ⚠️ CURRENTLY BLOCKING THESE ITEMS
                            </span>
                          )}
                          {isCurrentCompleted && (
                            <span style={{ color: '#27ae60', marginLeft: '8px', fontWeight: 600 }}>
                              ✓ NO LONGER BLOCKING - This item can proceed
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Risks Section */}
          <div className="detail-section-break"></div>
          <div className="detail-section">
            <h4 className="detail-section-title">Associated Risks ({risks.length})</h4>
            {risks.length > 0 ? (
              <div className="detail-list-simple">
                {risks.map((risk) => (
                  <div key={risk.id} className="detail-list-item-simple">
                    <span className="detail-list-item-title">
                      {risk.title}
                      <span
                        className="status-badge"
                        style={{ 
                          backgroundColor: getSeverityColor(risk.severity),
                          marginLeft: '8px',
                          fontSize: '0.7rem',
                          padding: '0.25rem 0.6rem'
                        }}
                      >
                        {risk.severity}
                      </span>
                    </span>
                    <span className="detail-list-item-subtitle">{risk.description}</span>
                    <span className="detail-list-item-meta">
                      Probability: {(risk.probability * 100).toFixed(0)}% • 
                      Status: {risk.status} • 
                      Detected: {formatDate(risk.detected_at)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="detail-empty">No risks currently affecting this work item.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

