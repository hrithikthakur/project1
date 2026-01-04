import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  listDecisions,
  getDecision,
  createDecision,
  updateDecision,
  deleteDecision,
  Decision,
  DecisionType,
  listMilestones,
  listActors,
  listWorkItems,
  listRisks,
  getActiveOwnership,
  createOwnership,
  updateOwnership,
  Milestone,
  Actor,
  WorkItem,
  Risk,
  Ownership,
} from '../api';
import { formatDate } from '../utils';

export default function DecisionsView() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDecision, setEditingDecision] = useState<Decision | null>(null);
  const [viewingDecision, setViewingDecision] = useState<Decision | null>(null);
  const [formData, setFormData] = useState<Partial<Decision>>({
    decision_type: 'change_schedule',
    subtype: 'MOVE_TARGET_DATE',
    milestone_name: '',
    status: 'proposed',
  });
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [actors, setActors] = useState<Actor[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [selectedActorId, setSelectedActorId] = useState<string>('');
  const [currentOwnership, setCurrentOwnership] = useState<Ownership | null>(null);
  
  // Type-specific fields
  const [newTargetDate, setNewTargetDate] = useState<string>('');
  const [commitmentPercentile, setCommitmentPercentile] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [addItemIds, setAddItemIds] = useState<string[]>([]);
  const [removeItemIds, setRemoveItemIds] = useState<string[]>([]);
  const [teamId, setTeamId] = useState<string>('');
  const [deltaFte, setDeltaFte] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [method, setMethod] = useState<string>('hire');
  const [itemIds, setItemIds] = useState<string[]>([]);
  const [riskId, setRiskId] = useState<string>('');
  const [acceptanceUntil, setAcceptanceUntil] = useState<string>('');
  const [threshold, setThreshold] = useState<string>('');
  const [action, setAction] = useState<string>('');
  
  const SUBTYPES: Record<DecisionType, string[]> = {
    change_scope: ['ADD', 'REMOVE', 'SWAP', 'SPLIT_PHASES'],
    change_schedule: ['MOVE_TARGET_DATE', 'CHANGE_CONFIDENCE_LEVEL', 'FREEZE_DATE'],
    change_capacity: ['ADD_PEOPLE', 'REMOVE_PEOPLE', 'REALLOCATE_PEOPLE', 'ADD_TIMEBOX', 'ADD_BUDGET'],
    change_priority: ['MAKE_CRITICAL', 'DEPRIORITISE', 'PAUSE', 'RESUME'],
    accept_risk: ['ACCEPT_UNTIL_DATE', 'ACCEPT_WITH_THRESHOLD', 'ACCEPT_AND_MONITOR'],
    mitigate_risk: ['DECOUPLE_DEPENDENCY', 'REDUCE_WIP', 'SPLIT_WORK', 'ADD_REVIEWER_CAPACITY', 'ESCALATE_BLOCKER'],
  };

  useEffect(() => {
    loadDecisions();
    loadMilestones();
    loadActors();
    loadWorkItems();
    loadRisks();
  }, []);

  async function loadDecisions() {
    try {
      const data = await listDecisions();
      setDecisions(data);
    } catch (error) {
      console.error('Error loading decisions:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadMilestones() {
    try {
      const data = await listMilestones();
      setMilestones(data);
      console.log('Loaded milestones:', data);
    } catch (error) {
      console.error('Error loading milestones:', error);
      toast.error(`Failed to load milestones: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async function loadActors() {
    try {
      const data = await listActors();
      const activeActors = data.filter(actor => actor.is_active);
      setActors(activeActors);
      console.log('Loaded actors:', activeActors);
    } catch (error) {
      console.error('Error loading actors:', error);
      toast.error(`Failed to load actors: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async function loadWorkItems() {
    try {
      const data = await listWorkItems();
      setWorkItems(data);
      console.log('Loaded work items:', data);
    } catch (error) {
      console.error('Error loading work items:', error);
      toast.error(`Failed to load work items: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async function loadRisks() {
    try {
      const data = await listRisks();
      setRisks(data);
      console.log('Loaded risks:', data);
    } catch (error) {
      console.error('Error loading risks:', error);
      toast.error(`Failed to load risks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  function handleView(decision: Decision) {
    setViewingDecision(decision);
  }

  async function handleEdit(decision: Decision) {
    setEditingDecision(decision);
    setFormData(decision);
    setSelectedActorId('');
    setCurrentOwnership(null);
    
    // Populate type-specific fields
    setNewTargetDate(decision.new_target_date || '');
    setCommitmentPercentile(decision.commitment_percentile?.toString() || '');
    setReason(decision.reason || '');
    setAddItemIds(decision.add_item_ids || []);
    setRemoveItemIds(decision.remove_item_ids || []);
    setTeamId(decision.team_id || '');
    setDeltaFte(decision.delta_fte?.toString() || '');
    setStartDate(decision.start_date || '');
    setMethod(decision.method || 'hire');
    setItemIds(decision.item_ids || []);
    setRiskId(decision.risk_id || '');
    setAcceptanceUntil(decision.acceptance_until || '');
    setThreshold(decision.threshold || '');
    setAction(decision.action || '');
    
    // Try to fetch the active ownership for this decision
    try {
      const ownership = await getActiveOwnership('decision', decision.id);
      setCurrentOwnership(ownership);
      setSelectedActorId(ownership.owner_actor_id);
    } catch (error) {
      // No active ownership found, that's okay
      console.log('No active ownership found for decision:', decision.id);
    }
    
    setShowForm(true);
  }

  function handleNew() {
    setEditingDecision(null);
    setFormData({
      decision_type: 'change_schedule',
      subtype: 'MOVE_TARGET_DATE',
      milestone_name: '',
      status: 'proposed',
    });
    setSelectedActorId('');
    setCurrentOwnership(null);
    // Reset type-specific fields
    setNewTargetDate('');
    setCommitmentPercentile('');
    setReason('');
    setAddItemIds([]);
    setRemoveItemIds([]);
    setTeamId('');
    setDeltaFte('');
    setStartDate('');
    setMethod('hire');
    setItemIds([]);
    setRiskId('');
    setAcceptanceUntil('');
    setThreshold('');
    setAction('');
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      let decisionId: string;
      
      // Build decision with type-specific fields
      const decisionData: Partial<Decision> = {
        ...formData,
      };
      
      // Add type-specific fields based on decision type
      if (formData.decision_type === 'change_scope') {
        if (addItemIds.length > 0) decisionData.add_item_ids = addItemIds;
        if (removeItemIds.length > 0) decisionData.remove_item_ids = removeItemIds;
        if (reason) decisionData.reason = reason;
      } else if (formData.decision_type === 'change_schedule') {
        if (newTargetDate) decisionData.new_target_date = newTargetDate;
        if (commitmentPercentile) decisionData.commitment_percentile = parseInt(commitmentPercentile) as 50 | 80;
      } else if (formData.decision_type === 'change_capacity') {
        if (teamId) decisionData.team_id = teamId;
        if (deltaFte) decisionData.delta_fte = parseFloat(deltaFte);
        if (startDate) decisionData.start_date = startDate;
        if (method) decisionData.method = method as 'hire' | 'contractor' | 'internal_reallocation';
      } else if (formData.decision_type === 'change_priority') {
        if (itemIds.length > 0) decisionData.item_ids = itemIds;
        if (reason) decisionData.reason = reason;
      } else if (formData.decision_type === 'accept_risk') {
        if (riskId) decisionData.risk_id = riskId;
        if (acceptanceUntil) decisionData.acceptance_until = acceptanceUntil;
        if (threshold) decisionData.threshold = threshold;
      } else if (formData.decision_type === 'mitigate_risk') {
        if (riskId) decisionData.risk_id = riskId;
        if (action) decisionData.action = action;
      }
      
      if (editingDecision) {
        await updateDecision(editingDecision.id, decisionData as Decision);
        decisionId = editingDecision.id;
      } else {
        const newDecision: Decision = {
          id: `dec_${Date.now()}`,
          ...decisionData,
          created_at: new Date().toISOString(),
        } as Decision;
        const created = await createDecision(newDecision);
        decisionId = created.id;
      }

      // Handle ownership if an actor is selected
      if (selectedActorId) {
        // Only create/update ownership if actor has changed
        if (!currentOwnership || currentOwnership.owner_actor_id !== selectedActorId) {
          // Create new ownership record (backend will automatically end existing active ownership)
          const newOwnership: Ownership = {
            id: `ownership_${Date.now()}`,
            object_type: 'decision',
            object_id: decisionId,
            owner_actor_id: selectedActorId,
            assigned_at: new Date().toISOString(),
          };
          await createOwnership(newOwnership);
        }
      } else if (currentOwnership) {
        // If no actor selected but there was ownership, end it
        const endedOwnership: Ownership = {
          ...currentOwnership,
          ended_at: new Date().toISOString(),
        };
        await updateOwnership(currentOwnership.id, endedOwnership);
      }
      
      // 🔥 TRIGGER DECISION-RISK ENGINE if decision was approved
      if (decisionData.status === 'approved' && (decisionData.decision_type === 'accept_risk' || decisionData.decision_type === 'mitigate_risk')) {
        try {
          console.log(`🎯 Triggering Decision-Risk Engine for decision ${decisionId}`);
          const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : 'http://localhost:8000/api');
          const response = await fetch(`${API_BASE_URL}/decision-risk-engine/events/decision-approved?decision_id=${decisionId}`, {
            method: 'POST',
          });
          
          if (!response.ok) {
            console.error('Failed to trigger Decision-Risk Engine:', response.statusText);
            toast.error('⚠️ Decision approved, but engine processing failed. Check console for details.');
          } else {
            const result = await response.json();
            console.log(`✅ Decision-Risk Engine processed: ${result.commands_issued} commands issued`);
            
            // Show user-friendly message
            let message = `Decision approved and processed! ${result.commands_issued} action(s) triggered.`;
            
            if (decisionData.decision_type === 'accept_risk') {
              message += ` Risk has been marked as ACCEPTED.`;
            } else if (decisionData.decision_type === 'mitigate_risk') {
              message += ` Risk has been marked as MITIGATING.`;
            }
            
            toast.success(message, { duration: 5000 });
          }
        } catch (engineError) {
          console.error('Error triggering Decision-Risk Engine:', engineError);
          // Don't fail the whole operation if engine call fails
        }
      }
      
      setShowForm(false);
      loadDecisions();
      toast.success(editingDecision ? 'Decision updated' : 'Decision created');
    } catch (error: any) {
      console.error('Error saving decision:', error);
      let errorMessage = 'Error saving decision';
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error instanceof TypeError && error.message === 'Failed to fetch') {
        errorMessage = 'Failed to connect to backend server. Please make sure the backend is running on http://localhost:8000';
      }
      
      toast.error(`Error saving decision: ${errorMessage}`);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this decision?')) return;
    try {
      await deleteDecision(id);
      loadDecisions();
      toast.success('Decision deleted');
    } catch (error) {
      console.error('Error deleting decision:', error);
      toast.error('Error deleting decision');
    }
  }

  function getStatusColor(status: string) {
    const colors: Record<string, string> = {
      proposed: '#f39c12', // Vibrant Orange
      approved: '#27ae60', // Vibrant Green
      superseded: '#95a5a6', // Vibrant Slate
    };
    return colors[status] || '#95a5a6';
  }

  function formatDecisionType(type: string): string {
    const typeMap: Record<string, string> = {
      change_scope: 'Change Scope',
      change_schedule: 'Change Schedule',
      change_capacity: 'Change Capacity',
      change_priority: 'Change Priority',
      accept_risk: 'Accept Risk',
      mitigate_risk: 'Mitigate Risk',
    };
    return typeMap[type] || type;
  }

  function formatSubtype(subtype: string): string {
    // Convert SNAKE_CASE or UPPER_CASE to Title Case
    return subtype
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }


  function getActorName(actorId: string): string {
    const actor = actors.find(a => a.id === actorId);
    return actor ? actor.display_name : actorId;
  }

  function getWorkItemTitle(itemId: string): string {
    const item = workItems.find(wi => wi.id === itemId);
    return item ? item.title : itemId;
  }

  function getMilestoneNameForDecision(decision: Decision): string {
    if (decision.milestone_name) return decision.milestone_name;
    
    // If milestone_name is missing, try to derive it from the associated risk
    if (decision.risk_id) {
      const risk = risks.find(r => r.id === decision.risk_id);
      if (risk) {
        // Look for milestone_id at top level (from our new backend fix) or inside impact
        const milestoneId = risk.milestone_id || (risk.impact as any)?.affected_milestone || (risk.impact as any)?.affected_milestones?.[0];
        if (milestoneId) {
          const milestone = milestones.find(m => m.id === milestoneId);
          if (milestone) return milestone.name;
        }
      }
    }
    
    return 'N/A';
  }

  if (loading) {
    return <div className="view-loading">Loading decisions...</div>;
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <h2>Decisions</h2>
        <button className="btn-primary" onClick={handleNew}>
          + New Decision
        </button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{editingDecision ? 'Edit Decision' : 'New Decision'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Decision Type *</label>
                <select
                  value={formData.decision_type}
                  onChange={(e) => {
                    const newType = e.target.value as DecisionType;
                    setFormData({ 
                      ...formData, 
                      decision_type: newType,
                      subtype: SUBTYPES[newType]?.[0] || ''
                    });
                  }}
                  required
                >
                  <option value="change_scope">Change Scope</option>
                  <option value="change_schedule">Change Schedule</option>
                  <option value="change_capacity">Change Capacity</option>
                  <option value="change_priority">Change Priority</option>
                  <option value="accept_risk">Accept Risk</option>
                  <option value="mitigate_risk">Mitigate Risk</option>
                </select>
              </div>
              <div className="form-group">
                <label>Subtype *</label>
                <select
                  value={formData.subtype}
                  onChange={(e) => setFormData({ ...formData, subtype: e.target.value })}
                  required
                >
                  {SUBTYPES[formData.decision_type || 'change_schedule']?.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
              {/* Hide milestone dropdown for accept_risk and mitigate_risk - milestone comes from risk */}
              {formData.decision_type !== 'accept_risk' && formData.decision_type !== 'mitigate_risk' && (
                <div className="form-group">
                  <label>Milestone *</label>
                  <select
                    value={formData.milestone_name}
                    onChange={(e) => setFormData({ ...formData, milestone_name: e.target.value })}
                    required
                  >
                    <option value="">Select a milestone...</option>
                    {milestones.map((milestone) => (
                      <option key={milestone.id} value={milestone.name}>
                        {milestone.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="form-group">
                <label>Actor (Decision Owner)</label>
                <select
                  value={selectedActorId}
                  onChange={(e) => setSelectedActorId(e.target.value)}
                >
                  <option value="">Select an actor...</option>
                  {actors.map((actor) => (
                    <option key={actor.id} value={actor.id}>
                      {actor.display_name} {actor.type === 'TEAM' ? '(Team)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              {/* Type-specific fields */}
              {formData.decision_type === 'change_schedule' && formData.subtype === 'MOVE_TARGET_DATE' && (
                <div className="form-group">
                  <label>New Target Date *</label>
                  <input
                    type="date"
                    value={newTargetDate}
                    onChange={(e) => setNewTargetDate(e.target.value)}
                    required
                  />
                </div>
              )}
              {formData.decision_type === 'change_schedule' && formData.subtype === 'CHANGE_CONFIDENCE_LEVEL' && (
                <div className="form-group">
                  <label>Commitment Percentile *</label>
                  <select
                    value={commitmentPercentile}
                    onChange={(e) => setCommitmentPercentile(e.target.value)}
                    required
                  >
                    <option value="">Select...</option>
                    <option value="50">50%</option>
                    <option value="80">80%</option>
                  </select>
                </div>
              )}
              {formData.decision_type === 'change_scope' && (
                <>
                  <div className="form-group">
                    <label style={{ fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px', display: 'block' }}>
                      Add Work Items
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
                            const isSelected = addItemIds.includes(item.id);
                            const isInRemoveList = removeItemIds.includes(item.id);
                            const isDisabled = isInRemoveList;
                            return (
                              <label
                                key={item.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  padding: '12px 14px',
                                  margin: '2px 0',
                                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                                  borderRadius: '6px',
                                  transition: 'all 0.2s ease',
                                  backgroundColor: isSelected ? '#eff6ff' : isDisabled ? '#fafafa' : 'transparent',
                                  border: isSelected ? '1px solid #3b82f6' : '1px solid transparent',
                                  opacity: isDisabled ? 0.5 : 1,
                                }}
                                onMouseEnter={(e) => {
                                  if (!isSelected && !isDisabled) {
                                    e.currentTarget.style.backgroundColor = '#f8fafc';
                                    e.currentTarget.style.borderColor = '#cbd5e1';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isSelected && !isDisabled) {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.borderColor = 'transparent';
                                  }
                                }}
                              >
                                <input
                                  type="checkbox"
                                  value={item.id}
                                  checked={isSelected}
                                  disabled={isDisabled}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setAddItemIds([...addItemIds, item.id]);
                                    } else {
                                      setAddItemIds(addItemIds.filter(id => id !== item.id));
                                    }
                                  }}
                                  style={{
                                    marginRight: '12px',
                                    width: '18px',
                                    height: '18px',
                                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                                    accentColor: '#3b82f6',
                                  }}
                                />
                                <div style={{ flex: 1 }}>
                                  <div style={{ 
                                    fontWeight: isSelected ? '600' : '400',
                                    color: isDisabled ? '#94a3b8' : isSelected ? '#1e40af' : '#334155',
                                    fontSize: '14px',
                                    lineHeight: '1.4',
                                  }}>
                                    {item.title}
                                  </div>
                                  {item.status && (
                                    <div style={{
                                      fontSize: '12px',
                                      color: isDisabled ? '#cbd5e1' : '#64748b',
                                      marginTop: '2px',
                                    }}>
                                      Status: {item.status.replace('_', ' ')}
                                      {isDisabled && ' • Selected for removal'}
                                    </div>
                                  )}
                                  {isDisabled && !item.status && (
                                    <div style={{
                                      fontSize: '12px',
                                      color: '#cbd5e1',
                                      marginTop: '2px',
                                    }}>
                                      Selected for removal
                                    </div>
                                  )}
                                </div>
                                {isSelected && (
                                  <span style={{
                                    color: '#3b82f6',
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
                    {addItemIds.length > 0 && (
                      <div style={{
                        marginTop: '8px',
                        padding: '8px 12px',
                        backgroundColor: '#eff6ff',
                        borderRadius: '6px',
                        fontSize: '13px',
                        color: '#1e40af',
                        fontWeight: '500',
                      }}>
                        ✓ {addItemIds.length} item{addItemIds.length !== 1 ? 's' : ''} selected to add
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px', display: 'block' }}>
                      Remove Work Items
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
                            const isSelected = removeItemIds.includes(item.id);
                            const isInAddList = addItemIds.includes(item.id);
                            const isDisabled = isInAddList;
                            return (
                              <label
                                key={item.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  padding: '12px 14px',
                                  margin: '2px 0',
                                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                                  borderRadius: '6px',
                                  transition: 'all 0.2s ease',
                                  backgroundColor: isSelected ? '#fef2f2' : isDisabled ? '#fafafa' : 'transparent',
                                  border: isSelected ? '1px solid #ef4444' : '1px solid transparent',
                                  opacity: isDisabled ? 0.5 : 1,
                                }}
                                onMouseEnter={(e) => {
                                  if (!isSelected && !isDisabled) {
                                    e.currentTarget.style.backgroundColor = '#f8fafc';
                                    e.currentTarget.style.borderColor = '#cbd5e1';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isSelected && !isDisabled) {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.borderColor = 'transparent';
                                  }
                                }}
                              >
                                <input
                                  type="checkbox"
                                  value={item.id}
                                  checked={isSelected}
                                  disabled={isDisabled}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setRemoveItemIds([...removeItemIds, item.id]);
                                    } else {
                                      setRemoveItemIds(removeItemIds.filter(id => id !== item.id));
                                    }
                                  }}
                                  style={{
                                    marginRight: '12px',
                                    width: '18px',
                                    height: '18px',
                                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                                    accentColor: '#ef4444',
                                  }}
                                />
                                <div style={{ flex: 1 }}>
                                  <div style={{ 
                                    fontWeight: isSelected ? '600' : '400',
                                    color: isDisabled ? '#94a3b8' : isSelected ? '#991b1b' : '#334155',
                                    fontSize: '14px',
                                    lineHeight: '1.4',
                                  }}>
                                    {item.title}
                                  </div>
                                  {item.status && (
                                    <div style={{
                                      fontSize: '12px',
                                      color: isDisabled ? '#cbd5e1' : '#64748b',
                                      marginTop: '2px',
                                    }}>
                                      Status: {item.status.replace('_', ' ')}
                                      {isDisabled && ' • Selected to add'}
                                    </div>
                                  )}
                                  {isDisabled && !item.status && (
                                    <div style={{
                                      fontSize: '12px',
                                      color: '#cbd5e1',
                                      marginTop: '2px',
                                    }}>
                                      Selected to add
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
                    {removeItemIds.length > 0 && (
                      <div style={{
                        marginTop: '8px',
                        padding: '8px 12px',
                        backgroundColor: '#fef2f2',
                        borderRadius: '6px',
                        fontSize: '13px',
                        color: '#991b1b',
                        fontWeight: '500',
                      }}>
                        ✓ {removeItemIds.length} item{removeItemIds.length !== 1 ? 's' : ''} selected to remove
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label>Reason *</label>
                    <input
                      type="text"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Protect launch date"
                      required
                    />
                  </div>
                </>
              )}
              {formData.decision_type === 'change_capacity' && (
                <>
                  <div className="form-group">
                    <label>Team *</label>
                    <select
                      value={teamId}
                      onChange={(e) => setTeamId(e.target.value)}
                      required
                    >
                      <option value="">Select a team...</option>
                      {actors
                        .filter(actor => actor.type === 'TEAM')
                        .map((team) => (
                          <option key={team.id} value={team.id}>
                            {team.display_name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Delta FTE *</label>
                    <input
                      type="number"
                      step="0.1"
                      value={deltaFte}
                      onChange={(e) => setDeltaFte(e.target.value)}
                      placeholder="1.0"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Start Date *</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Method *</label>
                    <select
                      value={method}
                      onChange={(e) => setMethod(e.target.value)}
                      required
                    >
                      <option value="hire">Hire</option>
                      <option value="contractor">Contractor</option>
                      <option value="internal_reallocation">Internal Reallocation</option>
                    </select>
                  </div>
                </>
              )}
              {formData.decision_type === 'change_priority' && (
                <>
                  <div className="form-group">
                    <label style={{ fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px', display: 'block' }}>
                      Work Items *
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
                            const isSelected = itemIds.includes(item.id);
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
                                  backgroundColor: isSelected ? '#fef3c7' : 'transparent',
                                  border: isSelected ? '1px solid #f59e0b' : '1px solid transparent',
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
                                    if (e.target.checked) {
                                      setItemIds([...itemIds, item.id]);
                                    } else {
                                      setItemIds(itemIds.filter(id => id !== item.id));
                                    }
                                  }}
                                  style={{
                                    marginRight: '12px',
                                    width: '18px',
                                    height: '18px',
                                    cursor: 'pointer',
                                    accentColor: '#f59e0b',
                                  }}
                                />
                                <div style={{ flex: 1 }}>
                                  <div style={{ 
                                    fontWeight: isSelected ? '600' : '400',
                                    color: isSelected ? '#92400e' : '#334155',
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
                                      Status: {item.status.replace('_', ' ')}
                                    </div>
                                  )}
                                </div>
                                {isSelected && (
                                  <span style={{
                                    color: '#f59e0b',
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
                    {itemIds.length > 0 && (
                      <div style={{
                        marginTop: '8px',
                        padding: '8px 12px',
                        backgroundColor: '#fef3c7',
                        borderRadius: '6px',
                        fontSize: '13px',
                        color: '#92400e',
                        fontWeight: '500',
                      }}>
                        ✓ {itemIds.length} item{itemIds.length !== 1 ? 's' : ''} selected
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label>Reason *</label>
                    <input
                      type="text"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Blocks release"
                      required
                    />
                  </div>
                </>
              )}
              {formData.decision_type === 'accept_risk' && (
                <>
                  <div className="form-group">
                    <label>Risk *</label>
                    <select
                      value={riskId}
                      onChange={(e) => {
                        const selectedRiskId = e.target.value;
                        setRiskId(selectedRiskId);
                        // Auto-populate milestone from the selected risk
                        const selectedRisk = risks.find(r => r.id === selectedRiskId);
                        if (selectedRisk && selectedRisk.milestone_id) {
                          const milestone = milestones.find(m => m.id === selectedRisk.milestone_id);
                          if (milestone) {
                            setFormData({ ...formData, milestone_name: milestone.name });
                          }
                        }
                      }}
                      required
                    >
                      <option value="">Select a risk...</option>
                      {risks.map((risk) => (
                        <option key={risk.id} value={risk.id}>
                          {risk.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  {riskId && formData.milestone_name && (
                    <div style={{
                      padding: '12px',
                      backgroundColor: '#f0f9ff',
                      borderRadius: '6px',
                      border: '1px solid #bae6fd',
                      marginBottom: '16px'
                    }}>
                      <div style={{ fontSize: '13px', color: '#0369a1', fontWeight: '500' }}>
                        📍 Associated Milestone: {formData.milestone_name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#0c4a6e', marginTop: '4px' }}>
                        This risk is linked to the milestone above
                      </div>
                    </div>
                  )}
                  {formData.subtype === 'ACCEPT_UNTIL_DATE' && (
                    <div className="form-group">
                      <label>Acceptance Until *</label>
                      <input
                        type="date"
                        value={acceptanceUntil}
                        onChange={(e) => setAcceptanceUntil(e.target.value)}
                        required
                      />
                    </div>
                  )}
                  {formData.subtype === 'ACCEPT_WITH_THRESHOLD' && (
                    <div className="form-group">
                      <label>Threshold *</label>
                      <input
                        type="text"
                        value={threshold}
                        onChange={(e) => setThreshold(e.target.value)}
                        placeholder="P80 slips > 7 days"
                        required
                      />
                    </div>
                  )}
                </>
              )}
              {formData.decision_type === 'mitigate_risk' && (
                <>
                  <div className="form-group">
                    <label>Risk</label>
                    <select
                      value={riskId}
                      onChange={(e) => {
                        const selectedRiskId = e.target.value;
                        setRiskId(selectedRiskId);
                        // Auto-populate milestone from the selected risk
                        if (selectedRiskId) {
                          const selectedRisk = risks.find(r => r.id === selectedRiskId);
                          if (selectedRisk && selectedRisk.milestone_id) {
                            const milestone = milestones.find(m => m.id === selectedRisk.milestone_id);
                            if (milestone) {
                              setFormData({ ...formData, milestone_name: milestone.name });
                            }
                          }
                        }
                      }}
                    >
                      <option value="">Select a risk (optional)...</option>
                      {risks.map((risk) => (
                        <option key={risk.id} value={risk.id}>
                          {risk.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  {riskId && formData.milestone_name && (
                    <div style={{
                      padding: '12px',
                      backgroundColor: '#f0f9ff',
                      borderRadius: '6px',
                      border: '1px solid #bae6fd',
                      marginBottom: '16px'
                    }}>
                      <div style={{ fontSize: '13px', color: '#0369a1', fontWeight: '500' }}>
                        📍 Associated Milestone: {formData.milestone_name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#0c4a6e', marginTop: '4px' }}>
                        This risk is linked to the milestone above
                      </div>
                    </div>
                  )}
                  <div className="form-group">
                    <label>Action *</label>
                    <textarea
                      value={action}
                      onChange={(e) => setAction(e.target.value)}
                      placeholder="Build mock Payments API for integration tests"
                      required
                    />
                  </div>
                </>
              )}
              <div className="form-group">
                <label>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                >
                  <option value="proposed">Proposed</option>
                  <option value="approved">Approved</option>
                  <option value="superseded">Superseded</option>
                </select>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  {editingDecision ? 'Update' : 'Create'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingDecision && (
        <div className="modal-overlay" onClick={() => setViewingDecision(null)}>
          <div className="modal-content detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Decision Details</h2>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button className="btn-icon" onClick={() => {
                  setViewingDecision(null);
                  handleEdit(viewingDecision);
                }} title="Edit">
                  ✏️
                </button>
                <button className="modal-close" onClick={() => setViewingDecision(null)}>✕</button>
              </div>
            </div>

            <div className="detail-view detail-view-simple">
              {/* Title and Status */}
              <div className="detail-section-header">
                <h3>{formatDecisionType(viewingDecision.decision_type)} - {formatSubtype(viewingDecision.subtype)}</h3>
                <span
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(viewingDecision.status) }}
                >
                  {viewingDecision.status}
                </span>
              </div>

              {/* Basic Information */}
              <div className="detail-section">
                <div className="detail-row">
                  <div className="detail-label">Decision Type</div>
                  <div className="detail-value">{formatDecisionType(viewingDecision.decision_type)}</div>
                </div>

                <div className="detail-row">
                  <div className="detail-label">Subtype</div>
                  <div className="detail-value">{formatSubtype(viewingDecision.subtype)}</div>
                </div>

                <div className="detail-row">
                  <div className="detail-label">Milestone</div>
                  <div className="detail-value">{getMilestoneNameForDecision(viewingDecision)}</div>
                </div>

                <div className="detail-row">
                  <div className="detail-label">Created</div>
                  <div className="detail-value">{formatDate(viewingDecision.created_at)}</div>
                </div>

                {viewingDecision.next_date && (
                  <div className="detail-row">
                    <div className="detail-label">Next Review Date</div>
                    <div className="detail-value">{formatDate(viewingDecision.next_date)}</div>
                  </div>
                )}
              </div>

              {/* Type-Specific Fields */}
              {viewingDecision.decision_type === 'change_scope' && (
                <>
                  <div className="detail-section-break"></div>
                  <div className="detail-section">
                    <h4 className="detail-section-title">Scope Changes</h4>
                    
                    {viewingDecision.add_item_ids && viewingDecision.add_item_ids.length > 0 && (
                      <div className="detail-row">
                        <div className="detail-label">Items to Add</div>
                        <div className="detail-value">
                          <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                            {viewingDecision.add_item_ids.map(itemId => (
                              <li key={itemId}>{getWorkItemTitle(itemId)}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {viewingDecision.remove_item_ids && viewingDecision.remove_item_ids.length > 0 && (
                      <div className="detail-row">
                        <div className="detail-label">Items to Remove</div>
                        <div className="detail-value">
                          <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                            {viewingDecision.remove_item_ids.map(itemId => (
                              <li key={itemId}>{getWorkItemTitle(itemId)}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {viewingDecision.reason && (
                      <div className="detail-row">
                        <div className="detail-label">Reason</div>
                        <div className="detail-value">{viewingDecision.reason}</div>
                      </div>
                    )}

                    {viewingDecision.effort_delta_days && (
                      <div className="detail-row">
                        <div className="detail-label">Effort Delta</div>
                        <div className="detail-value">{viewingDecision.effort_delta_days} days</div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {viewingDecision.decision_type === 'change_schedule' && (
                <>
                  <div className="detail-section-break"></div>
                  <div className="detail-section">
                    <h4 className="detail-section-title">Schedule Changes</h4>
                    
                    {viewingDecision.new_target_date && (
                      <div className="detail-row">
                        <div className="detail-label">New Target Date</div>
                        <div className="detail-value">{formatDate(viewingDecision.new_target_date)}</div>
                      </div>
                    )}

                    {viewingDecision.previous_target_date && (
                      <div className="detail-row">
                        <div className="detail-label">Previous Target Date</div>
                        <div className="detail-value">{formatDate(viewingDecision.previous_target_date)}</div>
                      </div>
                    )}

                    {viewingDecision.commitment_percentile && (
                      <div className="detail-row">
                        <div className="detail-label">Commitment Percentile</div>
                        <div className="detail-value">P{viewingDecision.commitment_percentile}</div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {viewingDecision.decision_type === 'change_capacity' && (
                <>
                  <div className="detail-section-break"></div>
                  <div className="detail-section">
                    <h4 className="detail-section-title">Capacity Changes</h4>
                    
                    {viewingDecision.team_id && (
                      <div className="detail-row">
                        <div className="detail-label">Team</div>
                        <div className="detail-value">{getActorName(viewingDecision.team_id)}</div>
                      </div>
                    )}

                    {viewingDecision.delta_fte !== undefined && (
                      <div className="detail-row">
                        <div className="detail-label">FTE Change</div>
                        <div className="detail-value">
                          {viewingDecision.delta_fte > 0 ? '+' : ''}{viewingDecision.delta_fte} FTE
                        </div>
                      </div>
                    )}

                    {viewingDecision.start_date && (
                      <div className="detail-row">
                        <div className="detail-label">Start Date</div>
                        <div className="detail-value">{formatDate(viewingDecision.start_date)}</div>
                      </div>
                    )}

                    {viewingDecision.end_date && (
                      <div className="detail-row">
                        <div className="detail-label">End Date</div>
                        <div className="detail-value">{formatDate(viewingDecision.end_date)}</div>
                      </div>
                    )}

                    {viewingDecision.method && (
                      <div className="detail-row">
                        <div className="detail-label">Method</div>
                        <div className="detail-value">{viewingDecision.method.replace('_', ' ')}</div>
                      </div>
                    )}

                    {viewingDecision.cost_delta !== undefined && (
                      <div className="detail-row">
                        <div className="detail-label">Cost Delta</div>
                        <div className="detail-value">${viewingDecision.cost_delta.toLocaleString()}</div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {viewingDecision.decision_type === 'change_priority' && (
                <>
                  <div className="detail-section-break"></div>
                  <div className="detail-section">
                    <h4 className="detail-section-title">Priority Changes</h4>
                    
                    {viewingDecision.item_ids && viewingDecision.item_ids.length > 0 && (
                      <div className="detail-row">
                        <div className="detail-label">Affected Items</div>
                        <div className="detail-value">
                          <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                            {viewingDecision.item_ids.map(itemId => (
                              <li key={itemId}>{getWorkItemTitle(itemId)}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {viewingDecision.priority_bucket && (
                      <div className="detail-row">
                        <div className="detail-label">Priority Bucket</div>
                        <div className="detail-value">{viewingDecision.priority_bucket}</div>
                      </div>
                    )}

                    {viewingDecision.priority_rank !== undefined && (
                      <div className="detail-row">
                        <div className="detail-label">Priority Rank</div>
                        <div className="detail-value">{viewingDecision.priority_rank}</div>
                      </div>
                    )}

                    {viewingDecision.reason && (
                      <div className="detail-row">
                        <div className="detail-label">Reason</div>
                        <div className="detail-value">{viewingDecision.reason}</div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {viewingDecision.decision_type === 'accept_risk' && (
                <>
                  <div className="detail-section-break"></div>
                  <div className="detail-section">
                    <h4 className="detail-section-title">Risk Acceptance</h4>
                    
                    {viewingDecision.risk_id && (
                      <div className="detail-row">
                        <div className="detail-label">Risk</div>
                        <div className="detail-value">{getRiskTitle(viewingDecision.risk_id)}</div>
                      </div>
                    )}

                    {viewingDecision.acceptance_until && (
                      <div className="detail-row">
                        <div className="detail-label">Accepted Until</div>
                        <div className="detail-value">{formatDate(viewingDecision.acceptance_until)}</div>
                      </div>
                    )}

                    {viewingDecision.threshold && (
                      <div className="detail-row">
                        <div className="detail-label">Threshold</div>
                        <div className="detail-value">{viewingDecision.threshold}</div>
                      </div>
                    )}

                    {viewingDecision.escalation_trigger && (
                      <div className="detail-row">
                        <div className="detail-label">Escalation Trigger</div>
                        <div className="detail-value">{viewingDecision.escalation_trigger}</div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {viewingDecision.decision_type === 'mitigate_risk' && (
                <>
                  <div className="detail-section-break"></div>
                  <div className="detail-section">
                    <h4 className="detail-section-title">Risk Mitigation</h4>
                    
                    {viewingDecision.risk_id && (
                      <div className="detail-row">
                        <div className="detail-label">Risk</div>
                        <div className="detail-value">{getRiskTitle(viewingDecision.risk_id)}</div>
                      </div>
                    )}

                    {viewingDecision.action && (
                      <div className="detail-row">
                        <div className="detail-label">Action</div>
                        <div className="detail-value">{viewingDecision.action}</div>
                      </div>
                    )}

                    {viewingDecision.expected_probability_delta !== undefined && (
                      <div className="detail-row">
                        <div className="detail-label">Expected Probability Delta</div>
                        <div className="detail-value">
                          {viewingDecision.expected_probability_delta > 0 ? '+' : ''}{(viewingDecision.expected_probability_delta * 100).toFixed(0)}%
                        </div>
                      </div>
                    )}

                    {viewingDecision.expected_impact_days_delta !== undefined && (
                      <div className="detail-row">
                        <div className="detail-label">Expected Impact Days Delta</div>
                        <div className="detail-value">
                          {viewingDecision.expected_impact_days_delta > 0 ? '+' : ''}{viewingDecision.expected_impact_days_delta} days
                        </div>
                      </div>
                    )}

                    {viewingDecision.due_date && (
                      <div className="detail-row">
                        <div className="detail-label">Due Date</div>
                        <div className="detail-value">{formatDate(viewingDecision.due_date)}</div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Subtype</th>
              <th>Milestone</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {decisions.map((decision) => (
              <tr 
                key={decision.id}
                onClick={() => handleView(decision)}
                style={{ cursor: 'pointer' }}
              >
                <td>{formatDecisionType(decision.decision_type)}</td>
                <td>{formatSubtype(decision.subtype)}</td>
                <td>{getMilestoneNameForDecision(decision)}</td>
                <td>
                  <span
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(decision.status) }}
                  >
                    {decision.status}
                  </span>
                </td>
                <td>{formatDate(decision.created_at)}</td>
                <td>
                  <div className="table-actions" onClick={(e) => e.stopPropagation()}>
                    <button className="btn-icon" onClick={() => handleEdit(decision)}>
                      ✏️
                    </button>
                    <button className="btn-icon btn-danger" onClick={() => handleDelete(decision.id)}>
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {decisions.length === 0 && (
        <div className="empty-state">
          <p>No decisions found. Create your first decision!</p>
        </div>
      )}
    </div>
  );
}

