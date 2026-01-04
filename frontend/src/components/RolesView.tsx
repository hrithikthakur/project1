import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  listRoles,
  listActorRoles,
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
  const [showActorRoleForm, setShowActorRoleForm] = useState(false);
  const [expandedRoleId, setExpandedRoleId] = useState<string | null>(null);
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

  function handleNewActorRole() {
    setActorRoleFormData({
      actor_id: '',
      role_id: '',
      scope_type: 'GLOBAL',
      scope_id: '',
    });
    setShowActorRoleForm(true);
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
      toast.success('Role assigned successfully');
    } catch (error) {
      console.error('Error saving actor role:', error);
      toast.error('Error saving actor role');
    }
  }

  async function handleDeleteActorRole(ar: ActorRole) {
    if (!confirm('Are you sure you want to remove this role assignment?')) return;
    try {
      await deleteActorRole(ar.actor_id, ar.role_id, ar.scope_type, ar.scope_id);
      loadData();
      toast.success('Role assignment removed');
    } catch (error) {
      console.error('Error deleting actor role:', error);
      toast.error('Error deleting actor role');
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

  function getRoleColor(roleName: string) {
    switch (roleName.toUpperCase()) {
      case 'ADMIN':
        return '#e74c3c'; // Vibrant Red
      case 'EDITOR':
        return '#3498db'; // Vibrant Blue
      case 'APPROVER':
        return '#f39c12'; // Vibrant Orange
      case 'VIEWER':
        return '#95a5a6'; // Vibrant Slate
      default:
        return '#7f8c8d';
    }
  }

  function getRolePermissions(roleName: string) {
    switch (roleName.toUpperCase()) {
      case 'ADMIN':
        return [
          'Full system access',
          'Manage all entities',
          'Approve and reject decisions',
          'Assign roles to actors',
          'Configure system settings',
          'Delete any entity',
        ];
      case 'EDITOR':
        return [
          'Create and modify work items',
          'Create and modify milestones',
          'Create and modify risks',
          'Create and modify risks',
          'View all entities',
          'Cannot approve decisions',
        ];
      case 'APPROVER':
        return [
          'Review and approve decisions',
          'Approve risks and milestones',
          'Read access to all entities',
          'Comment on work items',
          'Limited edit capabilities',
          'Cannot manage roles',
        ];
      case 'VIEWER':
        return [
          'Read-only access to all entities',
          'View work items and milestones',
          'View risks and decisions',
          'View reports and dashboards',
          'Cannot make any changes',
          'Cannot approve or reject',
        ];
      default:
        return [];
    }
  }

  if (loading) {
    return <div className="view-loading">Loading roles...</div>;
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <h2>Roles & Permissions</h2>
        <div className="header-actions">
          <button className="btn-primary" onClick={handleNewActorRole}>
            + Assign Role
          </button>
        </div>
      </div>

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
          <h3>System Roles ({roles.length})</h3>
          <p style={{ marginBottom: '1rem', color: '#666', fontSize: '0.95em' }}>
            The system has four fixed roles: ADMIN, VIEWER, APPROVER, and EDITOR. Use the "Assign Role" button to assign these roles to actors.
          </p>
          <button
            className="btn-secondary"
            onClick={() => setExpandedRoleId(expandedRoleId ? null : 'show_all')}
            style={{ marginBottom: '1.5rem' }}
          >
            {expandedRoleId ? 'Hide Details' : 'Learn More'}
          </button>

          {roles.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#999', background: '#f9f9f9', borderRadius: '8px' }}>
              No roles available. Please check your data configuration.
            </div>
          ) : expandedRoleId && (
            <div className="cards-grid">
              {roles.map((role) => (
                <div key={role.id} className="card">
                  <div className="card-header">
                    <h3>{role.name}</h3>
                    <span className="status-badge" style={{ 
                      backgroundColor: getRoleColor(role.name),
                    }}>
                      {role.id}
                    </span>
                  </div>
                  <div className="card-body">
                    <p className="card-description" style={{ marginBottom: '1rem' }}>
                      {role.description || 'No description available'}
                    </p>
                    <h4 style={{ marginTop: '1rem', marginBottom: '0.5rem', fontSize: '0.9em', color: '#555' }}>
                      Permissions:
                    </h4>
                    <ul style={{ 
                      marginLeft: '1.25rem',
                      paddingLeft: '0',
                      fontSize: '0.9em',
                      color: '#666',
                      lineHeight: '1.8'
                    }}>
                      {getRolePermissions(role.name).map((permission, idx) => (
                        <li key={idx}>{permission}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}
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
                      <span className="status-badge" style={{ 
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

