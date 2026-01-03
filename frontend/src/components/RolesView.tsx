import { useState, useEffect } from 'react';
import {
  listRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
  listActorRoles,
  getActorRolesByActor,
  createActorRole,
  deleteActorRole,
  listActors,
  listMilestones,
  Role,
  ActorRole,
  Actor,
  Milestone,
} from '../api';

export default function RolesView() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [actorRoles, setActorRoles] = useState<ActorRole[]>([]);
  const [actors, setActors] = useState<Actor[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [showActorRoleForm, setShowActorRoleForm] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleFormData, setRoleFormData] = useState<Partial<Role>>({
    name: '',
    description: '',
  });
  const [actorRoleFormData, setActorRoleFormData] = useState<Partial<ActorRole>>({
    actor_id: '',
    role_id: '',
    scope_type: 'GLOBAL',
    scope_id: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [rolesData, actorRolesData, actorsData, milestonesData] = await Promise.all([
        listRoles(),
        listActorRoles(),
        listActors(),
        listMilestones(),
      ]);
      setRoles(rolesData);
      setActorRoles(actorRolesData);
      setActors(actorsData);
      setMilestones(milestonesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleNewRole() {
    setEditingRole(null);
    setRoleFormData({
      name: '',
      description: '',
    });
    setShowRoleForm(true);
  }

  function handleNewActorRole() {
    setActorRoleFormData({
      actor_id: '',
      role_id: '',
      scope_type: 'GLOBAL',
      scope_id: '',
    });
    setShowActorRoleForm(true);
  }

  async function handleRoleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingRole) {
        await updateRole(editingRole.id, roleFormData as Role);
      } else {
        const newRole: Role = {
          id: `role_${Date.now()}`,
          ...roleFormData,
          created_at: new Date().toISOString(),
        } as Role;
        await createRole(newRole);
      }
      setShowRoleForm(false);
      loadData();
    } catch (error) {
      console.error('Error saving role:', error);
      alert('Error saving role');
    }
  }

  async function handleActorRoleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const newActorRole: ActorRole = {
        ...actorRoleFormData,
        created_at: new Date().toISOString(),
      } as ActorRole;
      await createActorRole(newActorRole);
      setShowActorRoleForm(false);
      loadData();
    } catch (error) {
      console.error('Error saving actor role:', error);
      alert('Error saving actor role');
    }
  }

  async function handleDeleteRole(id: string) {
    if (!confirm('Are you sure you want to delete this role?')) return;
    try {
      await deleteRole(id);
      loadData();
    } catch (error) {
      console.error('Error deleting role:', error);
      alert('Error deleting role');
    }
  }

  async function handleDeleteActorRole(ar: ActorRole) {
    if (!confirm('Are you sure you want to remove this role assignment?')) return;
    try {
      await deleteActorRole(ar.actor_id, ar.role_id, ar.scope_type, ar.scope_id);
      loadData();
    } catch (error) {
      console.error('Error deleting actor role:', error);
      alert('Error deleting actor role');
    }
  }

  function getActorName(actorId: string) {
    return actors.find((a) => a.id === actorId)?.display_name || actorId;
  }

  function getRoleName(roleId: string) {
    return roles.find((r) => r.id === roleId)?.name || roleId;
  }

  function getScopeName(scopeType: string, scopeId?: string) {
    if (!scopeId) return '-';
    
    if (scopeType === 'MILESTONE') {
      return milestones.find((m) => m.id === scopeId)?.name || scopeId;
    } else if (scopeType === 'TEAM') {
      return actors.find((a) => a.id === scopeId && a.type === 'TEAM')?.display_name || scopeId;
    }
    return scopeId;
  }

  function getAvailableScopeObjects() {
    if (actorRoleFormData.scope_type === 'MILESTONE') {
      return milestones.map(m => ({ id: m.id, name: m.name }));
    } else if (actorRoleFormData.scope_type === 'TEAM') {
      return actors.filter(a => a.type === 'TEAM').map(t => ({ id: t.id, name: t.display_name }));
    }
    return [];
  }

  if (loading) {
    return <div className="view-loading">Loading roles...</div>;
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <h2>Roles & Permissions</h2>
        <div className="header-actions">
          <button className="btn-secondary" onClick={handleNewRole}>
            + New Role
          </button>
          <button className="btn-primary" onClick={handleNewActorRole}>
            + Assign Role
          </button>
        </div>
      </div>

      {showRoleForm && (
        <div className="modal-overlay" onClick={() => setShowRoleForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{editingRole ? 'Edit Role' : 'New Role'}</h3>
            <form onSubmit={handleRoleSubmit}>
              <div className="form-group">
                <label>Role Name *</label>
                <input
                  type="text"
                  value={roleFormData.name}
                  onChange={(e) => setRoleFormData({ ...roleFormData, name: e.target.value as any })}
                  placeholder="Enter role name"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={roleFormData.description}
                  onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  {editingRole ? 'Update' : 'Create'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowRoleForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showActorRoleForm && (
        <div className="modal-overlay" onClick={() => setShowActorRoleForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Assign Role to Actor</h3>
            <form onSubmit={handleActorRoleSubmit}>
              <div className="form-group">
                <label>Actor *</label>
                <select
                  value={actorRoleFormData.actor_id}
                  onChange={(e) => setActorRoleFormData({ ...actorRoleFormData, actor_id: e.target.value })}
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
                <label>Role *</label>
                <select
                  value={actorRoleFormData.role_id}
                  onChange={(e) => setActorRoleFormData({ ...actorRoleFormData, role_id: e.target.value })}
                  required
                >
                  <option value="">Select a role...</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Scope Type *</label>
                <select
                  value={actorRoleFormData.scope_type}
                  onChange={(e) => setActorRoleFormData({ ...actorRoleFormData, scope_type: e.target.value as any, scope_id: '' })}
                  required
                >
                  <option value="GLOBAL">Global (All Objects)</option>
                  <option value="MILESTONE">Milestone (Specific Milestone)</option>
                  <option value="TEAM">Team (Specific Team)</option>
                </select>
              </div>
              {actorRoleFormData.scope_type !== 'GLOBAL' && (
                <div className="form-group">
                  <label>
                    {actorRoleFormData.scope_type === 'MILESTONE' && 'Select Milestone'}
                    {actorRoleFormData.scope_type === 'TEAM' && 'Select Team'}
                  </label>
                  <select
                    value={actorRoleFormData.scope_id}
                    onChange={(e) => setActorRoleFormData({ ...actorRoleFormData, scope_id: e.target.value })}
                  >
                    <option value="">
                      Select {actorRoleFormData.scope_type === 'MILESTONE' ? 'milestone' : 'team'}...
                    </option>
                    {getAvailableScopeObjects().map((obj) => (
                      <option key={obj.id} value={obj.id}>
                        {obj.name}
                      </option>
                    ))}
                  </select>
                  {getAvailableScopeObjects().length === 0 && (
                    <small style={{ color: '#ef4444', fontSize: '0.85em', marginTop: '4px', display: 'block' }}>
                      No {actorRoleFormData.scope_type === 'MILESTONE' ? 'milestones' : 'teams'} available
                    </small>
                  )}
                </div>
              )}
              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  Assign
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowActorRoleForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="roles-sections">
        <div className="roles-section">
          <h3>Roles ({roles.length})</h3>
          <div className="cards-grid">
            {roles.map((role) => (
              <div key={role.id} className="card">
                <div className="card-header">
                  <h3>{role.name}</h3>
                </div>
                <div className="card-body">
                  <p className="card-description">{role.description || 'No description'}</p>
                </div>
                <div className="card-actions">
                  <button className="btn-icon btn-danger" onClick={() => handleDeleteRole(role.id)}>
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="roles-section">
          <h3>Role Assignments ({actorRoles.length})</h3>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Actor</th>
                  <th>Role</th>
                  <th>Scope</th>
                  <th>Scope ID</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {actorRoles.map((ar, index) => (
                  <tr key={index}>
                    <td>{getActorName(ar.actor_id)}</td>
                    <td>
                      <span className="badge" style={{ 
                        backgroundColor: 
                          ar.role_id.includes('admin') || getRoleName(ar.role_id) === 'ADMIN' ? '#e74c3c' :
                          ar.role_id.includes('editor') || getRoleName(ar.role_id) === 'EDITOR' ? '#3498db' :
                          ar.role_id.includes('approver') || getRoleName(ar.role_id) === 'APPROVER' ? '#f39c12' :
                          '#95a5a6'
                      }}>
                        {getRoleName(ar.role_id)}
                      </span>
                    </td>
                    <td>{ar.scope_type}</td>
                    <td>{getScopeName(ar.scope_type, ar.scope_id)}</td>
                    <td>
                      <button className="btn-icon btn-danger" onClick={() => handleDeleteActorRole(ar)}>
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

