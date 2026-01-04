import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  listOwnership,
  getActiveOwnership,
  createOwnership,
  updateOwnership,
  deleteOwnership,
  listActors,
  listDecisions,
  listRisks,
  listMilestones,
  listWorkItems,
  Ownership,
  Actor,
  Decision,
  Risk,
  Milestone,
  WorkItem,
} from '../api';
import { formatDate, formatDateTime } from '../utils';

export default function OwnershipView() {
  const [ownership, setOwnership] = useState<Ownership[]>([]);
  const [actors, setActors] = useState<Actor[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedOwnership, setSelectedOwnership] = useState<Ownership | null>(null);
  const [editingOwnership, setEditingOwnership] = useState<Ownership | null>(null);
  const [formData, setFormData] = useState<Partial<Ownership>>({
    object_type: 'decision',
    object_id: '',
    owner_actor_id: '',
    reason: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [ownershipData, actorsData, decisionsData, risksData, milestonesData, workItemsData] = await Promise.all([
        listOwnership(),
        listActors(),
        listDecisions(),
        listRisks(),
        listMilestones(),
        listWorkItems(),
      ]);
      setOwnership(ownershipData);
      setActors(actorsData);
      setDecisions(decisionsData);
      setRisks(risksData);
      setMilestones(milestonesData);
      setWorkItems(workItemsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleNew() {
    setEditingOwnership(null);
    setFormData({
      object_type: 'decision',
      object_id: '',
      owner_actor_id: '',
      reason: '',
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingOwnership) {
        await updateOwnership(editingOwnership.id, formData as Ownership);
      } else {
        const newOwnership: Ownership = {
          id: `ownership_${Date.now()}`,
          ...formData,
          assigned_at: new Date().toISOString(),
        } as Ownership;
        await createOwnership(newOwnership);
      }
      setShowForm(false);
      loadData();
      toast.success(editingOwnership ? 'Ownership updated' : 'Ownership assigned');
    } catch (error) {
      console.error('Error saving ownership:', error);
      toast.error('Error saving ownership');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this ownership record?')) return;
    try {
      await deleteOwnership(id);
      loadData();
      toast.success('Ownership record deleted');
    } catch (error) {
      console.error('Error deleting ownership:', error);
      toast.error('Error deleting ownership');
    }
  }

  function getActorName(actorId: string) {
    return actors.find((a) => a.id === actorId)?.display_name || actorId;
  }

  function getObjectName(objectType: string, objectId: string) {
    switch (objectType) {
      case 'milestone':
        return milestones.find((m) => m.id === objectId)?.name || objectId;
      case 'work_item':
        return workItems.find((w) => w.id === objectId)?.title || objectId;
      case 'risk':
        return risks.find((r) => r.id === objectId)?.title || objectId;
      case 'decision':
        const decision = decisions.find((d) => d.id === objectId);
        if (!decision) return objectId;
        
        // Format subtype nicely
        const formattedSubtype = decision.subtype
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
          
        return `${formattedSubtype} (${decision.milestone_name})`;
      default:
        return objectId;
    }
  }

  function formatObjectType(objectType: string) {
    switch (objectType) {
      case 'milestone':
        return 'Milestone';
      case 'work_item':
        return 'Work Item';
      case 'risk':
        return 'Risk';
      case 'decision':
        return 'Decision';
      default:
        return objectType;
    }
  }

  function getDecisionStatusColor(status: string) {
    const colors: Record<string, string> = {
      proposed: '#f39c12',
      approved: '#27ae60',
      superseded: '#95a5a6',
    };
    return colors[status] || '#95a5a6';
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'achieved': return '#27ae60';
      case 'at_risk': return '#f39c12';
      case 'missed': return '#e74c3c';
      case 'pending': return '#3498db';
      default: return '#95a5a6';
    }
  }

  function getWorkItemStatusColor(status: string) {
    switch (status) {
      case 'completed': return '#27ae60';
      case 'in_progress': return '#3498db';
      case 'blocked': return '#e74c3c';
      case 'not_started': return '#95a5a6';
      default: return '#95a5a6';
    }
  }

  function getPriorityColor(priority: string) {
    switch (priority) {
      case 'critical': return '#e74c3c';
      case 'high': return '#e67e22';
      case 'medium': return '#f39c12';
      case 'low': return '#27ae60';
      default: return '#95a5a6';
    }
  }

  function getSeverityColor(severity: string) {
    return getPriorityColor(severity);
  }

  function getRiskStatusColor(status: string) {
    switch (status) {
      case 'resolved': return '#27ae60';
      case 'mitigating': return '#3498db';
      case 'active': return '#e74c3c';
      case 'accepted': return '#95a5a6';
      case 'mitigated': return '#f39c12';
      default: return '#95a5a6';
    }
  }

  function getObjectTypeColor(objectType: string) {
    switch (objectType) {
      case 'decision':
        return '#3498db'; // Vibrant Blue
      case 'milestone':
        return '#9b59b6'; // Vibrant Purple
      case 'risk':
        return '#e74c3c'; // Vibrant Red
      case 'work_item':
        return '#27ae60'; // Vibrant Green
      default:
        return '#95a5a6'; // Vibrant Slate
    }
  }

  function getAvailableObjects() {
    switch (formData.object_type) {
      case 'milestone':
        return milestones.map(m => ({ id: m.id, name: m.name }));
      case 'work_item':
        return workItems.map(w => ({ id: w.id, name: w.title }));
      case 'risk':
        return risks.map(r => ({ id: r.id, name: r.title }));
      case 'decision':
        return decisions.map(d => ({ id: d.id, name: `${d.decision_type} - ${d.milestone_name} (${d.status})` }));
      default:
        return [];
    }
  }

  function getObject(objectType: string, objectId: string) {
    switch (objectType) {
      case 'milestone':
        return milestones.find((m) => m.id === objectId);
      case 'work_item':
        return workItems.find((w) => w.id === objectId);
      case 'risk':
        return risks.find((r) => r.id === objectId);
      case 'decision':
        return decisions.find((d) => d.id === objectId);
      default:
        return null;
    }
  }

  function getActor(actorId: string) {
    return actors.find((a) => a.id === actorId);
  }

  function getMilestoneName(objectType: string, objectId: string) {
    const obj = getObject(objectType, objectId);
    if (!obj) return 'N/A';

    switch (objectType) {
      case 'milestone':
        return (obj as Milestone).name;
      case 'work_item':
        const workItem = obj as WorkItem;
        return milestones.find(m => m.id === workItem.milestone_id)?.name || 'N/A';
      case 'risk':
        const risk = obj as Risk;
        return milestones.find(m => m.id === risk.milestone_id)?.name || 'N/A';
      case 'decision':
        return (obj as Decision).milestone_name || 'N/A';
      default:
        return 'N/A';
    }
  }

  function handleRowClick(ownership: Ownership) {
    setSelectedOwnership(ownership);
    setShowDetail(true);
  }

  const activeOwnership = ownership
    .filter((o) => !o.ended_at)
    .sort((a, b) => new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime());

  if (loading) {
    return <div className="view-loading">Loading ownership...</div>;
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <h2>Ownership</h2>
        <button className="btn-primary" onClick={handleNew}>
          + Assign Ownership
        </button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Assign Ownership</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Object Type *</label>
                <select
                  value={formData.object_type}
                  onChange={(e) => setFormData({ ...formData, object_type: e.target.value as any, object_id: '' })}
                  required
                >
                  <option value="decision">Decision</option>
                  <option value="milestone">Milestone</option>
                  <option value="risk">Risk</option>
                  <option value="work_item">Work Item</option>
                </select>
              </div>
              <div className="form-group">
                <label>Select {formatObjectType(formData.object_type || 'milestone')} *</label>
                <select
                  value={formData.object_id}
                  onChange={(e) => setFormData({ ...formData, object_id: e.target.value })}
                  required
                >
                  <option value="">
                    Select {formatObjectType(formData.object_type || 'milestone')}...
                  </option>
                  {getAvailableObjects().map((obj) => (
                    <option key={obj.id} value={obj.id}>
                      {obj.name}
                    </option>
                  ))}
                </select>
                {getAvailableObjects().length === 0 && formData.object_type && (
                  <small style={{ color: '#ef4444', fontSize: '0.85em', marginTop: '4px', display: 'block' }}>
                    No {formatObjectType(formData.object_type)}s available
                  </small>
                )}
              </div>
              <div className="form-group">
                <label>Owner (Actor) *</label>
                <select
                  value={formData.owner_actor_id}
                  onChange={(e) => setFormData({ ...formData, owner_actor_id: e.target.value })}
                  required
                >
                  <option value="">Select an actor...</option>
                  {actors.map((actor) => (
                    <option key={actor.id} value={actor.id}>
                      {actor.display_name} ({actor.type})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Reason</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={2}
                  placeholder="Optional reason for assignment"
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  Assign
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetail && selectedOwnership && (
        <div className="modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h3 style={{ margin: '0 0 8px 0' }}>Ownership Details</h3>
                <span 
                  className="status-badge" 
                  style={{ 
                    fontSize: '0.8rem',
                    backgroundColor: getObjectTypeColor(selectedOwnership.object_type),
                    color: '#f1f5f9',
                    borderColor: '#f1f5f9',
                    borderWidth: '1px',
                    borderStyle: 'solid'
                  }}
                >
                  {formatObjectType(selectedOwnership.object_type)}
                </span>
              </div>
              <button 
                className="btn-secondary" 
                onClick={() => setShowDetail(false)}
                style={{ padding: '6px 12px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Owned Object Section */}
              <div className="detail-section">
                <h4 style={{ margin: '0 0 12px 0', color: '#64748b', fontSize: '0.85em', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {formatObjectType(selectedOwnership.object_type)} Information
                </h4>
                {(() => {
                  const obj = getObject(selectedOwnership.object_type, selectedOwnership.object_id);
                  if (!obj) return <p style={{ color: '#94a3b8' }}>Object not found</p>;

                  if (selectedOwnership.object_type === 'milestone') {
                    const milestone = obj as Milestone;
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div><strong>Name:</strong> {milestone.name}</div>
                        <div><strong>Target Date:</strong> {formatDate(milestone.target_date)}</div>
                        <div><strong>Status:</strong> <span className="status-badge" style={{ backgroundColor: getStatusColor(milestone.status) }}>{milestone.status}</span></div>
                        {milestone.description && <div><strong>Description:</strong> {milestone.description}</div>}
                      </div>
                    );
                  } else if (selectedOwnership.object_type === 'work_item') {
                    const workItem = obj as WorkItem;
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div><strong>Title:</strong> {workItem.title}</div>
                        <div><strong>Status:</strong> <span className="status-badge" style={{ backgroundColor: getWorkItemStatusColor(workItem.status) }}>{workItem.status}</span></div>
                        <div><strong>Priority:</strong> <span className="status-badge" style={{ backgroundColor: getPriorityColor(workItem.priority) }}>{workItem.priority}</span></div>
                        <div><strong>Milestone:</strong> {milestones.find(m => m.id === workItem.milestone_id)?.name || 'N/A'}</div>
                        {workItem.description && <div><strong>Description:</strong> {workItem.description}</div>}
                      </div>
                    );
                  } else if (selectedOwnership.object_type === 'risk') {
                    const risk = obj as Risk;
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div><strong>Title:</strong> {risk.title}</div>
                        <div><strong>Severity:</strong> <span className="status-badge" style={{ backgroundColor: getSeverityColor(risk.severity) }}>{risk.severity}</span></div>
                        <div><strong>Status:</strong> <span className="status-badge" style={{ backgroundColor: getRiskStatusColor(risk.status) }}>{risk.status}</span></div>
                        <div><strong>Probability:</strong> {(risk.probability * 100).toFixed(0)}%</div>
                        {risk.impact && typeof risk.impact === 'object' && 'delay_days' in risk.impact && (
                          <div><strong>Impact:</strong> {risk.impact.delay_days} day delay</div>
                        )}
                        {risk.description && <div><strong>Description:</strong> {risk.description}</div>}
                      </div>
                    );
                  } else if (selectedOwnership.object_type === 'decision') {
                    const decision = obj as Decision;
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div><strong>Type:</strong> {decision.decision_type}</div>
                        <div><strong>Milestone:</strong> {decision.milestone_name}</div>
                        <div><strong>Status:</strong> <span className="status-badge" style={{ backgroundColor: getDecisionStatusColor(decision.status) }}>{decision.status}</span></div>
                        {decision.rationale && <div><strong>Rationale:</strong> {decision.rationale}</div>}
                        {decision.made_at && <div><strong>Made At:</strong> {formatDateTime(decision.made_at)}</div>}
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Owner Section */}
              <div className="detail-section">
                <h4 style={{ margin: '0 0 12px 0', color: '#64748b', fontSize: '0.85em', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Owner Information
                </h4>
                {(() => {
                  const owner = getActor(selectedOwnership.owner_actor_id);
                  if (!owner) return <p style={{ color: '#94a3b8' }}>Owner not found</p>;
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div><strong>Name:</strong> {owner.display_name}</div>
                      <div><strong>Type:</strong> <span className="status-badge" style={{ backgroundColor: owner.type === 'USER' ? '#3498db' : '#9b59b6' }}>{owner.type}</span></div>
                      {owner.email && <div><strong>Email:</strong> {owner.email}</div>}
                    </div>
                  );
                })()}
              </div>

              {/* Ownership Metadata */}
              <div className="detail-section">
                <h4 style={{ margin: '0 0 12px 0', color: '#64748b', fontSize: '0.85em', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Ownership Metadata
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div><strong>ID:</strong> <code style={{ fontSize: '0.85em', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{selectedOwnership.id}</code></div>
                  <div><strong>Assigned At:</strong> {formatDateTime(selectedOwnership.assigned_at)}</div>
                  {selectedOwnership.assigned_by_actor_id && (
                    <div><strong>Assigned By:</strong> {getActorName(selectedOwnership.assigned_by_actor_id)}</div>
                  )}
                  <div><strong>Reason:</strong> {selectedOwnership.reason || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No reason provided</span>}</div>
                </div>
              </div>
            </div>

            <div className="form-actions" style={{ marginTop: '24px' }}>
              <button 
                className="btn-danger" 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDetail(false);
                  handleDelete(selectedOwnership.id);
                }}
              >
                Delete Ownership
              </button>
              <button className="btn-secondary" onClick={() => setShowDetail(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="table-container">
        <h3>Active Ownership ({activeOwnership.length})</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Owner</th>
              <th>Type</th>
              <th>Milestone</th>
              <th>Assigned At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {activeOwnership.map((o) => (
              <tr 
                key={o.id} 
                onClick={() => handleRowClick(o)}
                style={{ cursor: 'pointer' }}
                className="clickable-row"
              >
                <td style={{ fontWeight: '500' }}>{getObjectName(o.object_type, o.object_id)}</td>
                <td>{getActorName(o.owner_actor_id)}</td>
                <td>
                  <span 
                    className="status-badge" 
                    title={formatObjectType(o.object_type)}
                    style={{ 
                      backgroundColor: getObjectTypeColor(o.object_type),
                      color: '#f1f5f9',
                      borderColor: '#f1f5f9',
                      borderWidth: '1px',
                      borderStyle: 'solid'
                    }}
                  >
                    {formatObjectType(o.object_type)}
                  </span>
                </td>
                <td>{getMilestoneName(o.object_type, o.object_id)}</td>
                <td>{formatDate(o.assigned_at)}</td>
                <td>
                  <button 
                    className="btn-icon btn-danger" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(o.id);
                    }}
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {activeOwnership.length === 0 && (
        <div className="empty-state">
          <p>No active ownership records found.</p>
        </div>
      )}
    </div>
  );
}

