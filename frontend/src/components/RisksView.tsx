import { useState, useEffect } from 'react';
import {
  listRisks,
  getRisk,
  createRisk,
  updateRisk,
  deleteRisk,
  detectRisks,
  previewRiskDetection,
  listWorkItems,
  Risk,
  WorkItem,
} from '../api';

export default function RisksView() {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [formData, setFormData] = useState<Partial<Risk>>({
    title: '',
    description: '',
    severity: 'medium',
    status: 'active',
    probability: 0.5,
    impact: {},
    affected_items: [],
  });

  useEffect(() => {
    loadRisks();
    loadWorkItems();
  }, []);

  async function loadRisks() {
    try {
      const data = await listRisks();
      setRisks(data);
    } catch (error) {
      console.error('Error loading risks:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadWorkItems() {
    try {
      const data = await listWorkItems();
      setWorkItems(data);
    } catch (error) {
      console.error('Error loading work items:', error);
    }
  }

  function handleEdit(risk: Risk) {
    setEditingRisk(risk);
    setFormData(risk);
    setShowForm(true);
  }

  function handleNew() {
    setEditingRisk(null);
    setFormData({
      title: '',
      description: '',
      severity: 'medium',
      status: 'active',
      probability: 0.5,
      impact: {},
      affected_items: [],
    });
    setShowForm(true);
  }

  async function handleDetectRisks() {
    if (!confirm('Scan work items for potential risks? This will create new risk entries if issues are detected.')) {
      return;
    }
    
    try {
      setLoading(true);
      const newRisks = await detectRisks();
      
      if (newRisks.length === 0) {
        alert('✅ No new risks detected. System is healthy!');
      } else {
        alert(`⚠️ Detected ${newRisks.length} new risk(s). Check the risks list.`);
      }
      
      loadRisks();
    } catch (error) {
      console.error('Error detecting risks:', error);
      alert(`Error detecting risks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingRisk) {
        await updateRisk(editingRisk.id, formData as Risk);
      } else {
        const newRisk: Risk = {
          id: `risk_${Date.now()}`,
          ...formData,
          detected_at: new Date().toISOString(),
        } as Risk;
        await createRisk(newRisk);
      }
      setShowForm(false);
      loadRisks();
    } catch (error) {
      console.error('Error saving risk:', error);
      alert('Error saving risk');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this risk?')) return;
    try {
      await deleteRisk(id);
      loadRisks();
    } catch (error) {
      console.error('Error deleting risk:', error);
      alert('Error deleting risk');
    }
  }

  function getSeverityColor(severity: string) {
    const colors: Record<string, string> = {
      low: '#27ae60',
      medium: '#f39c12',
      high: '#e67e22',
      critical: '#e74c3c',
    };
    return colors[severity] || '#95a5a6';
  }

  function getStatusColor(status: string) {
    const colors: Record<string, string> = {
      active: '#e74c3c',
      mitigating: '#3498db',  // Blue for actively mitigating
      mitigated: '#f39c12',
      resolved: '#27ae60',
      accepted: '#95a5a6',
    };
    return colors[status] || '#95a5a6';
  }

  if (loading) {
    return <div className="view-loading">Loading risks...</div>;
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <h2>Risks</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn-secondary" 
            onClick={handleDetectRisks}
            style={{
              backgroundColor: '#8b5cf6',
              color: 'white',
              border: 'none',
            }}
          >
            🔍 Auto-Detect Risks
          </button>
          <button className="btn-primary" onClick={handleNew}>
            + New Risk
          </button>
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{editingRisk ? 'Edit Risk' : 'New Risk'}</h3>
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
                  <label>Severity</label>
                  <select
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="active">Active</option>
                    <option value="mitigating">Mitigating</option>
                    <option value="mitigated">Mitigated</option>
                    <option value="resolved">Resolved</option>
                    <option value="accepted">Accepted</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Probability (0.0 - 1.0)</label>
                <input
                  type="number"
                  value={formData.probability}
                  onChange={(e) => setFormData({ ...formData, probability: parseFloat(e.target.value) })}
                  min="0"
                  max="1"
                  step="0.1"
                />
              </div>
              <div className="form-group">
                <label style={{ fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px', display: 'block' }}>
                  Affected Work Items
                </label>
                <div style={{
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                }}>
                  <div style={{
                    maxHeight: '220px',
                    overflowY: 'auto',
                    padding: '4px',
                  }}>
                    {workItems.length === 0 ? (
                      <div style={{ 
                        padding: '20px', 
                        color: '#94a3b8', 
                        textAlign: 'center',
                        fontSize: '14px'
                      }}>
                        Loading work items...
                      </div>
                    ) : (
                      workItems.map((item) => {
                        const isSelected = (formData.affected_items || []).includes(item.id);
                        return (
                          <label
                            key={item.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              padding: '12px 14px',
                              margin: '2px 0',
                              cursor: 'pointer',
                              borderRadius: '6px',
                              transition: 'all 0.2s ease',
                              backgroundColor: isSelected ? '#fef2f2' : 'transparent',
                              border: isSelected ? '1px solid #ef4444' : '1px solid transparent',
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.backgroundColor = '#f8fafc';
                                e.currentTarget.style.borderColor = '#cbd5e1';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.borderColor = 'transparent';
                              }
                            }}
                          >
                            <input
                              type="checkbox"
                              value={item.id}
                              checked={isSelected}
                              onChange={(e) => {
                                const currentItems = formData.affected_items || [];
                                if (e.target.checked) {
                                  setFormData({
                                    ...formData,
                                    affected_items: [...currentItems, item.id]
                                  });
                                } else {
                                  setFormData({
                                    ...formData,
                                    affected_items: currentItems.filter(id => id !== item.id)
                                  });
                                }
                              }}
                              style={{
                                marginRight: '12px',
                                width: '18px',
                                height: '18px',
                                cursor: 'pointer',
                                accentColor: '#ef4444',
                              }}
                            />
                            <div style={{ flex: 1 }}>
                              <div style={{ 
                                fontWeight: isSelected ? '600' : '400',
                                color: isSelected ? '#991b1b' : '#334155',
                                fontSize: '14px',
                                lineHeight: '1.4',
                              }}>
                                {item.title}
                              </div>
                              {item.status && (
                                <div style={{
                                  fontSize: '12px',
                                  color: '#64748b',
                                  marginTop: '2px',
                                }}>
                                  Status: {item.status.replace('_', ' ')} • Milestone: {item.milestone_id?.replace('milestone_', 'M')}
                                </div>
                              )}
                            </div>
                            {isSelected && (
                              <span style={{
                                color: '#ef4444',
                                fontSize: '18px',
                                fontWeight: 'bold',
                              }}>✓</span>
                            )}
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
                {(formData.affected_items || []).length > 0 && (
                  <div style={{
                    marginTop: '8px',
                    padding: '8px 12px',
                    backgroundColor: '#fef2f2',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#991b1b',
                    fontWeight: '500',
                  }}>
                    ⚠️ {formData.affected_items?.length} item{(formData.affected_items?.length || 0) !== 1 ? 's' : ''} will be affected by this risk
                  </div>
                )}
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  {editingRisk ? 'Update' : 'Create'}
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
        {risks.map((risk) => (
          <div key={risk.id} className="card">
            <div className="card-header">
              <h3>{risk.title}</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span
                  className="status-badge"
                  style={{ backgroundColor: getSeverityColor(risk.severity) }}
                >
                  {risk.severity}
                </span>
                <span
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(risk.status) }}
                >
                  {risk.status}
                </span>
              </div>
            </div>
            <div className="card-body">
              <p className="card-description">{risk.description}</p>
              
              {/* Acceptance Information */}
              {risk.status === 'accepted' && (risk as any).accepted_at && (
                <div style={{
                  marginTop: '1rem',
                  padding: '1rem',
                  backgroundColor: '#f8f9fa',
                  borderLeft: '4px solid #95a5a6',
                  borderRadius: '4px',
                }}>
                  <div style={{ 
                    fontSize: '0.875rem', 
                    fontWeight: 'bold', 
                    color: '#5a6c7d',
                    marginBottom: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}>
                    <span>✓</span>
                    <span>Risk Accepted</span>
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: '#6c757d' }}>
                    <div style={{ marginBottom: '0.25rem' }}>
                      <strong>Accepted on:</strong> {new Date((risk as any).accepted_at).toLocaleDateString()} at {new Date((risk as any).accepted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {(risk as any).accepted_by && (
                      <div style={{ marginBottom: '0.25rem' }}>
                        <strong>Accepted by:</strong> {(risk as any).accepted_by}
                      </div>
                    )}
                    {(risk as any).next_date && (
                      <div style={{ marginBottom: '0.25rem' }}>
                        <strong>Next review:</strong> {new Date((risk as any).next_date).toLocaleDateString()}
                      </div>
                    )}
                    {(risk as any).acceptance_boundary && (
                      <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #dee2e6' }}>
                        <strong>Boundary:</strong>{' '}
                        {(risk as any).acceptance_boundary.type === 'date' && (
                          <span>Until {new Date((risk as any).acceptance_boundary.date).toLocaleDateString()}</span>
                        )}
                        {(risk as any).acceptance_boundary.type === 'threshold' && (
                          <span>Threshold: {(risk as any).acceptance_boundary.threshold}</span>
                        )}
                        {(risk as any).acceptance_boundary.type === 'event' && (
                          <span>Event: {(risk as any).acceptance_boundary.trigger}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{
                    marginTop: '0.75rem',
                    padding: '0.5rem',
                    backgroundColor: '#e7f3ff',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    color: '#004085',
                  }}>
                    <strong>🔕 Quiet Monitoring:</strong> Escalations suppressed. Monitoring for boundary breach or next review date.
                  </div>
                </div>
              )}
              
              {/* Mitigation Information */}
              {risk.status === 'mitigating' && (risk as any).mitigation_started_at && (
                <div style={{
                  marginTop: '1rem',
                  padding: '1rem',
                  backgroundColor: '#e3f2fd',
                  borderLeft: '4px solid #3498db',
                  borderRadius: '4px',
                }}>
                  <div style={{ 
                    fontSize: '0.875rem', 
                    fontWeight: 'bold', 
                    color: '#1565c0',
                    marginBottom: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}>
                    <span>🛠️</span>
                    <span>Mitigation In Progress</span>
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: '#1976d2' }}>
                    {(risk as any).mitigation_action && (
                      <div style={{ marginBottom: '0.5rem' }}>
                        <strong>Action:</strong> {(risk as any).mitigation_action}
                      </div>
                    )}
                    <div style={{ marginBottom: '0.25rem' }}>
                      <strong>Started:</strong> {new Date((risk as any).mitigation_started_at).toLocaleDateString()}
                    </div>
                    {(risk as any).mitigation_due_date && (
                      <div>
                        <strong>Due:</strong> {new Date((risk as any).mitigation_due_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="card-meta" style={{ marginTop: '1rem' }}>
                <div className="meta-item">
                  <span className="meta-label">Probability:</span>
                  <span className="meta-value">{(risk.probability * 100).toFixed(0)}%</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Affected Items:</span>
                  <span className="meta-value">{risk.affected_items.length}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Detected:</span>
                  <span className="meta-value">
                    {new Date(risk.detected_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            <div className="card-actions">
              <button className="btn-icon" onClick={() => handleEdit(risk)}>
                ✏️ Edit
              </button>
              <button className="btn-icon btn-danger" onClick={() => handleDelete(risk.id)}>
                🗑️ Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {risks.length === 0 && (
        <div className="empty-state">
          <p>No risks found. Create your first risk!</p>
        </div>
      )}
    </div>
  );
}

