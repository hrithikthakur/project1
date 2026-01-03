import { useState, useEffect } from 'react';

// API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : 'http://localhost:8000/api');

interface Issue {
  id: string;
  title: string;
  description: string;
  type: 'dependency_blocked' | 'resource_constraint' | 'technical_blocker' | 'external_dependency' | 'scope_unclear' | 'other';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  dependency_id?: string | null;
  work_item_id?: string | null;
  risk_id?: string | null;
  created_at: string;
  updated_at?: string | null;
  resolved_at?: string | null;
  impact_description?: string | null;
  resolution_notes?: string | null;
}

export default function IssuesView() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [formData, setFormData] = useState<Partial<Issue>>({
    title: '',
    description: '',
    type: 'other',
    status: 'open',
    priority: 'medium',
    impact_description: '',
  });

  useEffect(() => {
    loadIssues();
  }, []);

  async function loadIssues() {
    try {
      const response = await fetch(`${API_BASE_URL}/issues`);
      const data = await response.json();
      setIssues(data);
    } catch (error) {
      console.error('Error loading issues:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(issue: Issue) {
    setEditingIssue(issue);
    setFormData(issue);
    setShowForm(true);
  }

  function handleNew() {
    setEditingIssue(null);
    setFormData({
      title: '',
      description: '',
      type: 'other',
      status: 'open',
      priority: 'medium',
      impact_description: '',
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingIssue) {
        await fetch(`${API_BASE_URL}/issues/${editingIssue.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      } else {
        const newIssue: Issue = {
          id: `issue_${Date.now()}`,
          ...formData,
          created_at: new Date().toISOString(),
        } as Issue;
        await fetch(`${API_BASE_URL}/issues`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newIssue),
        });
      }
      setShowForm(false);
      loadIssues();
    } catch (error) {
      console.error('Error saving issue:', error);
      alert('Error saving issue');
    }
  }

  async function handleResolve(id: string) {
    const notes = prompt('Enter resolution notes (optional):');
    try {
      await fetch(`${API_BASE_URL}/issues/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution_notes: notes }),
      });
      loadIssues();
    } catch (error) {
      console.error('Error resolving issue:', error);
      alert('Error resolving issue');
    }
  }

  async function handleReopen(id: string) {
    if (!confirm('Reopen this issue?')) return;
    try {
      await fetch(`${API_BASE_URL}/issues/${id}/reopen`, {
        method: 'POST',
      });
      loadIssues();
    } catch (error) {
      console.error('Error reopening issue:', error);
      alert('Error reopening issue');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this issue?')) return;
    try {
      await fetch(`${API_BASE_URL}/issues/${id}`, {
        method: 'DELETE',
      });
      loadIssues();
    } catch (error) {
      console.error('Error deleting issue:', error);
      alert('Error deleting issue');
    }
  }

  function getTypeColor(type: string) {
    const colors: Record<string, string> = {
      dependency_blocked: '#e74c3c',
      resource_constraint: '#f39c12',
      technical_blocker: '#9b59b6',
      external_dependency: '#3498db',
      scope_unclear: '#95a5a6',
      other: '#7f8c8d',
    };
    return colors[type] || '#95a5a6';
  }

  function getTypeIcon(type: string) {
    const icons: Record<string, string> = {
      dependency_blocked: '🔗',
      resource_constraint: '⚡',
      technical_blocker: '🔧',
      external_dependency: '🌐',
      scope_unclear: '❓',
      other: '📝',
    };
    return icons[type] || '📝';
  }

  function getPriorityColor(priority: string) {
    const colors: Record<string, string> = {
      low: '#27ae60',
      medium: '#f39c12',
      high: '#e67e22',
      critical: '#e74c3c',
    };
    return colors[priority] || '#95a5a6';
  }

  function getStatusColor(status: string) {
    const colors: Record<string, string> = {
      open: '#e74c3c',
      in_progress: '#3498db',
      resolved: '#27ae60',
      closed: '#95a5a6',
    };
    return colors[status] || '#95a5a6';
  }

  const filteredIssues = issues.filter(issue => {
    if (filterStatus !== 'all' && issue.status !== filterStatus) return false;
    if (filterPriority !== 'all' && issue.priority !== filterPriority) return false;
    return true;
  });

  const stats = {
    total: issues.length,
    open: issues.filter(i => i.status === 'open').length,
    in_progress: issues.filter(i => i.status === 'in_progress').length,
    resolved: issues.filter(i => i.status === 'resolved').length,
    critical: issues.filter(i => i.priority === 'critical' && i.status !== 'resolved').length,
  };

  if (loading) {
    return <div className="view-loading">Loading issues...</div>;
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <h2>Issues</h2>
        <button className="btn-primary" onClick={handleNew}>
          + New Issue
        </button>
      </div>

      {/* Stats Summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        <div style={{
          padding: '1rem',
          backgroundColor: '#fff',
          borderRadius: '8px',
          border: '2px solid #e2e8f0',
        }}>
          <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>Total Issues</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b' }}>{stats.total}</div>
        </div>
        <div style={{
          padding: '1rem',
          backgroundColor: '#fff',
          borderRadius: '8px',
          border: '2px solid #fee2e2',
        }}>
          <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>Open</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#e74c3c' }}>{stats.open}</div>
        </div>
        <div style={{
          padding: '1rem',
          backgroundColor: '#fff',
          borderRadius: '8px',
          border: '2px solid #dbeafe',
        }}>
          <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>In Progress</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3498db' }}>{stats.in_progress}</div>
        </div>
        <div style={{
          padding: '1rem',
          backgroundColor: '#fff',
          borderRadius: '8px',
          border: '2px solid #dcfce7',
        }}>
          <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>Resolved</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#27ae60' }}>{stats.resolved}</div>
        </div>
        {stats.critical > 0 && (
          <div style={{
            padding: '1rem',
            backgroundColor: '#fef2f2',
            borderRadius: '8px',
            border: '2px solid #e74c3c',
          }}>
            <div style={{ fontSize: '0.875rem', color: '#991b1b', marginBottom: '0.25rem' }}>🚨 Critical</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#e74c3c' }}>{stats.critical}</div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
      }}>
        <div>
          <label style={{ fontSize: '0.875rem', color: '#64748b', marginRight: '0.5rem' }}>Status:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: '0.5rem',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
            }}
          >
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: '0.875rem', color: '#64748b', marginRight: '0.5rem' }}>Priority:</label>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            style={{
              padding: '0.5rem',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
            }}
          >
            <option value="all">All</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{editingIssue ? 'Edit Issue' : 'New Issue'}</h3>
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
                  <label>Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  >
                    <option value="dependency_blocked">Dependency Blocked</option>
                    <option value="resource_constraint">Resource Constraint</option>
                    <option value="technical_blocker">Technical Blocker</option>
                    <option value="external_dependency">External Dependency</option>
                    <option value="scope_unclear">Scope Unclear</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div className="form-group">
                <label>Impact Description</label>
                <textarea
                  value={formData.impact_description || ''}
                  onChange={(e) => setFormData({ ...formData, impact_description: e.target.value })}
                  rows={2}
                  placeholder="Describe the impact of this issue..."
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  {editingIssue ? 'Update' : 'Create'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Issues Grid */}
      <div className="cards-grid">
        {filteredIssues.map((issue) => (
          <div key={issue.id} className="card" style={{
            borderLeft: `4px solid ${getPriorityColor(issue.priority)}`,
          }}>
            <div className="card-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>{getTypeIcon(issue.type)}</span>
                {issue.title}
              </h3>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span
                  className="status-badge"
                  style={{ backgroundColor: getTypeColor(issue.type), fontSize: '0.75rem' }}
                >
                  {issue.type.replace('_', ' ')}
                </span>
                <span
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(issue.status) }}
                >
                  {issue.status.replace('_', ' ')}
                </span>
                <span
                  className="status-badge"
                  style={{ backgroundColor: getPriorityColor(issue.priority) }}
                >
                  {issue.priority}
                </span>
              </div>
            </div>
            <div className="card-body">
              <p className="card-description">{issue.description}</p>
              
              {issue.impact_description && (
                <div style={{
                  marginTop: '0.75rem',
                  padding: '0.75rem',
                  backgroundColor: '#fef2f2',
                  borderLeft: '3px solid #e74c3c',
                  borderRadius: '4px',
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#991b1b', marginBottom: '0.25rem' }}>
                    ⚠️ Impact
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#7f1d1d' }}>
                    {issue.impact_description}
                  </div>
                </div>
              )}
              
              {issue.resolution_notes && (
                <div style={{
                  marginTop: '0.75rem',
                  padding: '0.75rem',
                  backgroundColor: '#f0fdf4',
                  borderLeft: '3px solid #27ae60',
                  borderRadius: '4px',
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#166534', marginBottom: '0.25rem' }}>
                    ✅ Resolution
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#14532d' }}>
                    {issue.resolution_notes}
                  </div>
                </div>
              )}
              
              <div className="card-meta" style={{ marginTop: '1rem' }}>
                <div className="meta-item">
                  <span className="meta-label">Created:</span>
                  <span className="meta-value">
                    {new Date(issue.created_at).toLocaleDateString()}
                  </span>
                </div>
                {issue.resolved_at && (
                  <div className="meta-item">
                    <span className="meta-label">Resolved:</span>
                    <span className="meta-value">
                      {new Date(issue.resolved_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {issue.work_item_id && (
                  <div className="meta-item">
                    <span className="meta-label">Work Item:</span>
                    <span className="meta-value">{issue.work_item_id}</span>
                  </div>
                )}
                {issue.risk_id && (
                  <div className="meta-item">
                    <span className="meta-label">⚠️ Risk:</span>
                    <span className="meta-value" style={{ color: '#e74c3c' }}>{issue.risk_id}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="card-actions">
              {issue.status !== 'resolved' && issue.status !== 'closed' && (
                <button
                  className="btn-icon"
                  onClick={() => handleResolve(issue.id)}
                  style={{ backgroundColor: '#27ae60', color: 'white' }}
                >
                  ✓ Resolve
                </button>
              )}
              {(issue.status === 'resolved' || issue.status === 'closed') && (
                <button
                  className="btn-icon"
                  onClick={() => handleReopen(issue.id)}
                  style={{ backgroundColor: '#3498db', color: 'white' }}
                >
                  ↻ Reopen
                </button>
              )}
              <button className="btn-icon" onClick={() => handleEdit(issue)}>
                ✏️ Edit
              </button>
              <button className="btn-icon btn-danger" onClick={() => handleDelete(issue.id)}>
                🗑️ Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredIssues.length === 0 && (
        <div className="empty-state">
          <p>
            {filterStatus !== 'all' || filterPriority !== 'all'
              ? 'No issues match the selected filters.'
              : 'No issues found. Create your first issue!'}
          </p>
        </div>
      )}
    </div>
  );
}

