import { useState, useEffect } from 'react';
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

export default function OwnershipView() {
  const [ownership, setOwnership] = useState<Ownership[]>([]);
  const [actors, setActors] = useState<Actor[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingOwnership, setEditingOwnership] = useState<Ownership | null>(null);
  const [formData, setFormData] = useState<Partial<Ownership>>({
    object_type: 'milestone',
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
      object_type: 'milestone',
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
    } catch (error) {
      console.error('Error saving ownership:', error);
      alert('Error saving ownership');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this ownership record?')) return;
    try {
      await deleteOwnership(id);
      loadData();
    } catch (error) {
      console.error('Error deleting ownership:', error);
      alert('Error deleting ownership');
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
        return decision ? `${decision.decision_type} - ${decision.milestone_name}` : objectId;
      default:
        return objectId;
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

  const activeOwnership = ownership.filter((o) => !o.ended_at);

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
                  <option value="milestone">Milestone</option>
                  <option value="work_item">Work Item</option>
                  <option value="risk">Risk</option>
                  <option value="decision">Decision</option>
                </select>
              </div>
              <div className="form-group">
                <label>
                  {formData.object_type === 'milestone' && 'Select Milestone *'}
                  {formData.object_type === 'work_item' && 'Select Work Item *'}
                  {formData.object_type === 'risk' && 'Select Risk *'}
                  {formData.object_type === 'decision' && 'Select Decision *'}
                </label>
                <select
                  value={formData.object_id}
                  onChange={(e) => setFormData({ ...formData, object_id: e.target.value })}
                  required
                >
                  <option value="">
                    Select {formData.object_type?.replace('_', ' ')}...
                  </option>
                  {getAvailableObjects().map((obj) => (
                    <option key={obj.id} value={obj.id}>
                      {obj.name}
                    </option>
                  ))}
                </select>
                {getAvailableObjects().length === 0 && formData.object_type && (
                  <small style={{ color: '#ef4444', fontSize: '0.85em', marginTop: '4px', display: 'block' }}>
                    No {formData.object_type?.replace('_', ' ')}s available
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

      <div className="table-container">
        <h3>Active Ownership ({activeOwnership.length})</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Object</th>
              <th>Object ID</th>
              <th>Owner</th>
              <th>Assigned At</th>
              <th>Reason</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {activeOwnership.map((o) => (
              <tr key={o.id}>
                <td>
                  <span className="badge">{o.object_type}</span>
                </td>
                <td>{getObjectName(o.object_type, o.object_id)}</td>
                <td>{getActorName(o.owner_actor_id)}</td>
                <td>{new Date(o.assigned_at).toLocaleDateString()}</td>
                <td>{o.reason || '-'}</td>
                <td>
                  <button className="btn-icon btn-danger" onClick={() => handleDelete(o.id)}>
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

