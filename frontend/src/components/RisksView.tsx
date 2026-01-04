import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  listRisks,
  createRisk,
  updateRisk,
  deleteRisk,
  detectRisks,
  listWorkItems,
  listMilestones,
  Risk,
  WorkItem,
  Milestone,
} from '../api';
import { formatDate, formatDateTime } from '../utils';

export default function RisksView() {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null);
  const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [formData, setFormData] = useState<Partial<Risk>>({
    title: '',
    description: '',
    severity: 'medium',
    status: 'open',
    probability: 0.5,
    impact: {},
    affected_items: [],
  });

  useEffect(() => {
    loadRisks();
    loadWorkItems();
    loadMilestones();
    
    // Auto-refresh risks every 10 seconds to catch updates from work item changes
    const intervalId = setInterval(() => {
      loadRisks();
    }, 10000);
    
    return () => clearInterval(intervalId);
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

  async function handleRefresh() {
    setLoading(true);
    try {
      await loadRisks();
      await loadWorkItems();
      await loadMilestones();
      toast.success('Risks refreshed');
    } catch (error) {
      console.error('Error refreshing:', error);
      toast.error('Error refreshing risks');
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

  async function loadMilestones() {
    try {
      const data = await listMilestones();
      setMilestones(data);
    } catch (error) {
      console.error('Error loading milestones:', error);
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
      status: 'open',
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
        toast.success('No new risks detected. System is healthy!');
      } else {
        toast(`Detected ${newRisks.length} new risk(s). Check the risks list.`, { icon: '⚠️' });
      }
      
      loadRisks();
    } catch (error) {
      console.error('Error detecting risks:', error);
      toast.error(`Error detecting risks: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      toast.success(editingRisk ? 'Risk updated' : 'Risk created');
    } catch (error) {
      console.error('Error saving risk:', error);
      toast.error('Error saving risk');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this risk?')) return;
    try {
      await deleteRisk(id);
      loadRisks();
      toast.success('Risk deleted');
    } catch (error) {
      console.error('Error deleting risk:', error);
      toast.error('Error deleting risk');
    }
  }

  function openRiskModal(risk: Risk) {
    setSelectedRisk(risk);
  }

  function closeRiskModal() {
    setSelectedRisk(null);
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
      open: '#e74c3c',
      accepted: '#95a5a6',
      mitigating: '#3498db',  // Blue for actively mitigating
      materialised: '#ef4444', // Red for materialized
      closed: '#27ae60',
    };
    return colors[status] || '#95a5a6';
  }

  function getAffectedMilestones(risk: Risk): Milestone[] {
    // Get unique milestone IDs from affected work items
    const milestoneIds = new Set<string>();
    risk.affected_items.forEach(itemId => {
      const workItem = workItems.find(wi => wi.id === itemId);
      if (workItem?.milestone_id) {
        milestoneIds.add(workItem.milestone_id);
      }
    });
    
    // Return milestone objects
    return milestones.filter(m => milestoneIds.has(m.id));
  }

  const stats = {
    total: risks.length,
    closed: risks.filter(r => r.status === 'closed').length,
    materialised: risks.filter(r => r.status === 'materialised').length,
    mitigating: risks.filter(r => r.status === 'mitigating').length,
    accepted: risks.filter(r => r.status === 'accepted').length,
  };

  // Filter risks based on active filter
  const filteredRisks = statusFilter 
    ? risks.filter(r => r.status === statusFilter)
    : risks;

  const handleFilterClick = (filter: string | null) => {
    setStatusFilter(statusFilter === filter ? null : filter);
  };

  if (loading) {
    return <div className="view-loading">Loading risks...</div>;
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          Risks
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
                  <strong style={{ color: '#f1f5f9' }}>Risk:</strong> A potential event or condition that could negatively impact project delivery.
                </div>
                <div style={{ color: '#cbd5e1', fontSize: '0.8125rem' }}>
                  ✓ Auto-sync is enabled: risks automatically update when work items change status.
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
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn-secondary" 
            onClick={handleRefresh}
            title="Refresh risks list (auto-refreshes every 10s)"
          >
            🔄 Refresh
          </button>
          <button 
            className="btn-secondary" 
            onClick={handleDetectRisks}
          >
            🔍 Auto-Detect Risks
          </button>
          <button className="btn-primary" onClick={handleNew}>
            + New Risk
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div 
          className="stat-card"
          onClick={() => handleFilterClick(null)}
          style={{ 
            cursor: 'pointer',
            border: statusFilter === null ? '3px solid #3498db' : undefined
          }}
        >
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <h3>{stats.total}</h3>
            <p>Total Risks</p>
          </div>
        </div>
        <div 
          className="stat-card" 
          onClick={() => handleFilterClick('materialised')}
          style={{ 
            borderColor: '#ef4444', 
            cursor: 'pointer',
            borderWidth: statusFilter === 'materialised' ? '3px' : '1px'
          }}
        >
          <div className="stat-icon">🚨</div>
          <div className="stat-content">
            <h3 style={{ color: '#ef4444' }}>{stats.materialised}</h3>
            <p>Materialised</p>
          </div>
        </div>
        <div 
          className="stat-card"
          onClick={() => handleFilterClick('mitigating')}
          style={{ 
            cursor: 'pointer',
            border: statusFilter === 'mitigating' ? '3px solid #3498db' : undefined
          }}
        >
          <div className="stat-icon">🛠️</div>
          <div className="stat-content">
            <h3>{stats.mitigating}</h3>
            <p>Mitigating</p>
          </div>
        </div>
        <div 
          className="stat-card"
          onClick={() => handleFilterClick('accepted')}
          style={{ 
            cursor: 'pointer',
            border: statusFilter === 'accepted' ? '3px solid #95a5a6' : undefined
          }}
        >
          <div className="stat-icon">🤝</div>
          <div className="stat-content">
            <h3>{stats.accepted}</h3>
            <p>Accepted</p>
          </div>
        </div>
        <div 
          className="stat-card"
          onClick={() => handleFilterClick('closed')}
          style={{ 
            cursor: 'pointer', 
            borderColor: '#27ae60',
            borderWidth: statusFilter === 'closed' ? '3px' : '1px'
          }}
        >
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>{stats.closed}</h3>
            <p>Closed</p>
          </div>
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
                    <option value="open">Open</option>
                    <option value="accepted">Accepted</option>
                    <option value="mitigating">Mitigating</option>
                    <option value="materialised">Materialised</option>
                    <option value="closed">Closed</option>
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

      {/* Risk Details Modal */}
      {selectedRisk && (
        <div className="modal-overlay" onClick={closeRiskModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'flex-start',
              marginBottom: '1.5rem',
              borderBottom: '2px solid #f0f0f0',
              paddingBottom: '1rem'
            }}>
              <div>
                <h3 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {selectedRisk.status === 'materialised' && <span>🚨</span>}
                  {selectedRisk.status === 'closed' && <span>✅</span>}
                  {selectedRisk.title}
                </h3>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <span
                    className="status-badge"
                    style={{ backgroundColor: getSeverityColor(selectedRisk.severity) }}
                  >
                    {selectedRisk.severity}
                  </span>
                  <span
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(selectedRisk.status) }}
                  >
                    {selectedRisk.status}
                  </span>
                </div>
              </div>
              <button 
                onClick={closeRiskModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  padding: '0',
                  color: '#666',
                  lineHeight: '1'
                }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: '#666', textTransform: 'uppercase' }}>Description</h4>
              <p style={{ lineHeight: '1.6', color: '#333' }}>{selectedRisk.description}</p>
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', 
              gap: '1rem',
              marginBottom: '1.5rem',
              padding: '1rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px'
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>Probability</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#333' }}>
                  {(selectedRisk.probability * 100).toFixed(0)}%
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>Affected Items</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#333' }}>
                  {selectedRisk.affected_items.length}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>Detected</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#333' }}>
                  {formatDate(selectedRisk.detected_at)}
                </div>
              </div>
            </div>

            {/* Acceptance Information */}
            {selectedRisk.status === 'accepted' && (selectedRisk as any).accepted_at && (
              <div style={{
                marginBottom: '1.5rem',
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
                    <strong>Accepted on:</strong> {formatDateTime((selectedRisk as any).accepted_at)}
                  </div>
                  {(selectedRisk as any).accepted_by && (
                    <div style={{ marginBottom: '0.25rem' }}>
                      <strong>Accepted by:</strong> {(selectedRisk as any).accepted_by}
                    </div>
                  )}
                  {(selectedRisk as any).next_date && (
                    <div style={{ marginBottom: '0.25rem' }}>
                      <strong>Next review:</strong> {formatDate((selectedRisk as any).next_date)}
                    </div>
                  )}
                  {(selectedRisk as any).acceptance_boundary && (
                    <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #dee2e6' }}>
                      <strong>Boundary:</strong>{' '}
                      {(selectedRisk as any).acceptance_boundary.type === 'date' && (
                        <span>Until {formatDate((selectedRisk as any).acceptance_boundary.date)}</span>
                      )}
                      {(selectedRisk as any).acceptance_boundary.type === 'threshold' && (
                        <span>Threshold: {(selectedRisk as any).acceptance_boundary.threshold}</span>
                      )}
                      {(selectedRisk as any).acceptance_boundary.type === 'event' && (
                        <span>Event: {(selectedRisk as any).acceptance_boundary.trigger}</span>
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
            {selectedRisk.status === 'mitigating' && (selectedRisk as any).mitigation_started_at && (
              <div style={{
                marginBottom: '1.5rem',
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
                  {(selectedRisk as any).mitigation_action && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong>Action:</strong> {(selectedRisk as any).mitigation_action}
                    </div>
                  )}
                  <div style={{ marginBottom: '0.25rem' }}>
                    <strong>Started:</strong> {formatDate((selectedRisk as any).mitigation_started_at)}
                  </div>
                  {(selectedRisk as any).mitigation_due_date && (
                    <div>
                      <strong>Due:</strong> {formatDate((selectedRisk as any).mitigation_due_date)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Affected Milestones */}
            {(() => {
              const affectedMilestones = getAffectedMilestones(selectedRisk);
              if (affectedMilestones.length > 0) {
                return (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: '#666', textTransform: 'uppercase' }}>
                      Affected Milestones ({affectedMilestones.length})
                    </h4>
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                      padding: '0.75rem',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      border: '1px solid #e0e0e0'
                    }}>
                      {affectedMilestones.map(milestone => (
                        <div
                          key={milestone.id}
                          style={{
                            padding: '0.5rem 0.75rem',
                            backgroundColor: '#fff',
                            border: '2px solid #3498db',
                            borderRadius: '6px',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            color: '#333',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}
                        >
                          <span>📍</span>
                          <div>
                            <div>{milestone.name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '2px' }}>
                              Target: {formatDate(milestone.target_date)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Affected Work Items */}
            {selectedRisk.affected_items.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: '#666', textTransform: 'uppercase' }}>
                  Affected Work Items ({selectedRisk.affected_items.length})
                </h4>
                <div style={{
                  maxHeight: '150px',
                  overflowY: 'auto',
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px',
                  padding: '0.5rem'
                }}>
                  {selectedRisk.affected_items.map((itemId) => {
                    const workItem = workItems.find(wi => wi.id === itemId);
                    return (
                      <div key={itemId} style={{
                        padding: '0.5rem',
                        marginBottom: '0.25rem',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '4px',
                        fontSize: '0.85rem'
                      }}>
                        {workItem ? workItem.title : itemId}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid #e0e0e0' }}>
              <button 
                className="btn-secondary" 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  closeRiskModal(); 
                  handleEdit(selectedRisk); 
                }}
              >
                ✏️ Edit
              </button>
              <button 
                className="btn-secondary" 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  handleDelete(selectedRisk.id);
                  closeRiskModal();
                }}
                style={{ color: '#e74c3c' }}
              >
                🗑️ Delete
              </button>
              <button className="btn-primary" onClick={closeRiskModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="cards-grid">
        {[...filteredRisks].sort((a, b) => {
          // Define status priority: materialised -> accepted -> mitigating -> open -> closed
          const statusOrder: Record<string, number> = {
            'materialised': 1,
            'accepted': 2,
            'mitigating': 3,
            'open': 4,
            'closed': 5,
          };
          
          const aOrder = statusOrder[a.status] || 999;
          const bOrder = statusOrder[b.status] || 999;
          
          return aOrder - bOrder;
        }).map((risk) => {
          // Determine border style based on status
          let borderStyle = undefined;
          if (risk.status === 'materialised') {
            borderStyle = '3px solid #ef4444';  // Red for materialized
          } else if (risk.status === 'closed') {
            borderStyle = '3px solid #27ae60';  // Green for closed
          }
          
          return (
            <div 
              key={risk.id} 
              className={`card ${risk.status === 'materialised' ? 'materialised-risk' : ''}`}
              style={{ 
                cursor: 'pointer',
                border: borderStyle
              }}
              onClick={() => openRiskModal(risk)}
            >
              <div className="card-header">
                <h3>
                  {risk.status === 'materialised' && <span style={{ marginRight: '8px' }}>🚨</span>}
                  {risk.status === 'closed' && <span style={{ marginRight: '8px' }}>✅</span>}
                  {risk.title}
                </h3>
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
                <p className="card-description" style={{
                  display: '-webkit-box',
                  WebkitLineClamp: '2',
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  marginBottom: '0.5rem'
                }}>
                  {risk.description}
                </p>
                
                <div className="card-meta" style={{ marginTop: '0.5rem' }}>
                  <div className="meta-item">
                    <span className="meta-label">Probability:</span>
                    <span className="meta-value">{(risk.probability * 100).toFixed(0)}%</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Affected Items:</span>
                    <span className="meta-value">{risk.affected_items.length}</span>
                  </div>
                </div>
                
                {/* Affected Milestones */}
                {(() => {
                  const affectedMilestones = getAffectedMilestones(risk);
                  if (affectedMilestones.length > 0) {
                    return (
                      <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #e0e0e0' }}>
                        <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem', fontWeight: '600' }}>
                          Affected Milestones:
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                          {affectedMilestones.map(milestone => (
                            <span
                              key={milestone.id}
                              style={{
                                fontSize: '0.75rem',
                                padding: '0.25rem 0.5rem',
                                backgroundColor: '#f0f0f0',
                                color: '#555',
                                borderRadius: '4px',
                                fontWeight: '500',
                              }}
                            >
                              📍 {milestone.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
              <div className="card-actions" onClick={(e) => e.stopPropagation()}>
                <button className="btn-icon" onClick={(e) => { e.stopPropagation(); handleEdit(risk); }}>
                  ✏️ Edit
                </button>
                <button className="btn-icon btn-danger" onClick={(e) => { e.stopPropagation(); handleDelete(risk.id); }}>
                  🗑️ Delete
                </button>
                <button className="btn-icon" style={{ marginLeft: 'auto' }} onClick={(e) => { e.stopPropagation(); openRiskModal(risk); }}>
                  View Details ↗
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredRisks.length === 0 && risks.length > 0 && (
        <div className="empty-state">
          <p>No risks found with the selected filter.</p>
          <button 
            className="btn-secondary" 
            onClick={() => setStatusFilter(null)}
            style={{ marginTop: '1rem' }}
          >
            Clear Filter
          </button>
        </div>
      )}

      {risks.length === 0 && (
        <div className="empty-state">
          <p>No risks found. Create your first risk!</p>
        </div>
      )}
    </div>
  );
}

