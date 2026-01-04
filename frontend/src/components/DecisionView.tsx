import { useState, useEffect } from 'react';
import { Decision, DecisionType, analyzeDecision, listMilestones, Milestone } from '../api';

const SUBTYPES: Record<DecisionType, string[]> = {
  change_scope: ['ADD', 'REMOVE', 'SWAP', 'SPLIT_PHASES'],
  change_schedule: ['MOVE_TARGET_DATE', 'CHANGE_CONFIDENCE_LEVEL', 'FREEZE_DATE'],
  change_capacity: ['ADD_PEOPLE', 'REMOVE_PEOPLE', 'REALLOCATE_PEOPLE', 'ADD_TIMEBOX', 'ADD_BUDGET'],
  change_priority: ['MAKE_CRITICAL', 'DEPRIORITISE', 'PAUSE', 'RESUME'],
  accept_risk: ['ACCEPT_UNTIL_DATE', 'ACCEPT_WITH_THRESHOLD', 'ACCEPT_AND_MONITOR'],
  mitigate_risk: ['DECOUPLE_DEPENDENCY', 'REDUCE_WIP', 'SPLIT_WORK', 'ADD_REVIEWER_CAPACITY', 'ESCALATE_BLOCKER'],
};

export default function DecisionView() {
  const [decisionType, setDecisionType] = useState<DecisionType>('change_schedule');
  const [subtype, setSubtype] = useState<string>('MOVE_TARGET_DATE');
  const [milestoneName, setMilestoneName] = useState<string>('');
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  
  // CHANGE_SCOPE fields
  const [addItemIds, setAddItemIds] = useState<string>('');
  const [removeItemIds, setRemoveItemIds] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [effortDeltaDays, setEffortDeltaDays] = useState<string>('');
  
  // CHANGE_SCHEDULE fields
  const [newTargetDate, setNewTargetDate] = useState<string>('');
  const [previousTargetDate, setPreviousTargetDate] = useState<string>('');
  const [commitmentPercentile, setCommitmentPercentile] = useState<string>('');
  
  // CHANGE_CAPACITY fields
  const [teamId, setTeamId] = useState<string>('');
  const [deltaFte, setDeltaFte] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [method, setMethod] = useState<string>('hire');
  const [costDelta, setCostDelta] = useState<string>('');
  
  // CHANGE_PRIORITY fields
  const [itemIds, setItemIds] = useState<string>('');
  const [priorityRank, setPriorityRank] = useState<string>('');
  const [priorityBucket, setPriorityBucket] = useState<string>('P0');
  
  // ACCEPT_RISK fields
  const [riskId, setRiskId] = useState<string>('');
  const [acceptanceUntil, setAcceptanceUntil] = useState<string>('');
  const [threshold, setThreshold] = useState<string>('');
  const [escalationTrigger, setEscalationTrigger] = useState<string>('');
  
  // MITIGATE_RISK fields
  const [action, setAction] = useState<string>('');
  const [expectedProbabilityDelta, setExpectedProbabilityDelta] = useState<string>('');
  const [expectedImpactDaysDelta, setExpectedImpactDaysDelta] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Fetch milestones and resources on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const milestonesData = await listMilestones();
        setMilestones(milestonesData);
        // Set default values if available and not already set
        if (milestonesData.length > 0) {
          setMilestoneName(prev => prev || milestonesData[0].name);
        }
      } catch (err) {
        console.error('Error fetching metadata:', err);
        setError('Failed to load milestones and resources');
      }
    };
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const newDecision: Decision = {
        id: `dec_${Date.now()}`,
        decision_type: decisionType,
        subtype: subtype || SUBTYPES[decisionType][0],
        milestone_name: milestoneName,
        status: 'proposed',
        created_at: new Date().toISOString(),
      };

      // Add fields based on decision type
      if (decisionType === 'change_scope') {
        if (addItemIds) newDecision.add_item_ids = addItemIds.split(',').map(s => s.trim()).filter(Boolean);
        if (removeItemIds) newDecision.remove_item_ids = removeItemIds.split(',').map(s => s.trim()).filter(Boolean);
        if (reason) newDecision.reason = reason;
        if (effortDeltaDays) newDecision.effort_delta_days = parseFloat(effortDeltaDays);
      } else if (decisionType === 'change_schedule') {
        if (newTargetDate) newDecision.new_target_date = newTargetDate;
        if (previousTargetDate) newDecision.previous_target_date = previousTargetDate;
        if (commitmentPercentile) newDecision.commitment_percentile = parseInt(commitmentPercentile) as 50 | 80;
      } else if (decisionType === 'change_capacity') {
        if (teamId) newDecision.team_id = teamId;
        if (deltaFte) newDecision.delta_fte = parseFloat(deltaFte);
        if (startDate) newDecision.start_date = startDate;
        if (endDate) newDecision.end_date = endDate;
        if (method) newDecision.method = method as 'hire' | 'contractor' | 'internal_reallocation';
        if (costDelta) newDecision.cost_delta = parseFloat(costDelta);
      } else if (decisionType === 'change_priority') {
        if (itemIds) newDecision.item_ids = itemIds.split(',').map(s => s.trim()).filter(Boolean);
        if (priorityRank) newDecision.priority_rank = parseInt(priorityRank);
        if (priorityBucket) newDecision.priority_bucket = priorityBucket as 'P0' | 'P1' | 'P2';
        if (reason) newDecision.reason = reason;
      } else if (decisionType === 'accept_risk') {
        if (riskId) newDecision.risk_id = riskId;
        if (acceptanceUntil) newDecision.acceptance_until = acceptanceUntil;
        if (threshold) newDecision.threshold = threshold;
        if (escalationTrigger) newDecision.escalation_trigger = escalationTrigger;
      } else if (decisionType === 'mitigate_risk') {
        if (riskId) newDecision.risk_id = riskId;
        if (action) newDecision.action = action;
        if (expectedProbabilityDelta) newDecision.expected_probability_delta = parseFloat(expectedProbabilityDelta);
        if (expectedImpactDaysDelta) newDecision.expected_impact_days_delta = parseFloat(expectedImpactDaysDelta);
        if (dueDate) newDecision.due_date = dueDate;
      }
      
      const result = await analyzeDecision(newDecision);
      setAnalysis(result);
    } catch (err: any) {
      console.error('Error analyzing decision:', err);
      setError(err.message || 'Failed to analyze decision');
    } finally {
      setLoading(false);
    }
  };

  const renderTypeSpecificFields = () => {
    if (decisionType === 'change_scope') {
      return (
        <>
          <div>
            <label>
              Add Item IDs (comma-separated):
              <input
                type="text"
                value={addItemIds}
                onChange={(e) => setAddItemIds(e.target.value)}
                placeholder="STORY-221, STORY-222"
              />
            </label>
          </div>
          <div>
            <label>
              Remove Item IDs (comma-separated):
              <input
                type="text"
                value={removeItemIds}
                onChange={(e) => setRemoveItemIds(e.target.value)}
                placeholder="STORY-180"
              />
            </label>
          </div>
          <div>
            <label>
              Reason: *
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Protect launch date"
                required
              />
            </label>
          </div>
          <div>
            <label>
              Effort Delta Days (optional):
              <input
                type="number"
                value={effortDeltaDays}
                onChange={(e) => setEffortDeltaDays(e.target.value)}
                placeholder="0"
              />
            </label>
          </div>
        </>
      );
    } else if (decisionType === 'change_schedule') {
      return (
        <>
          {subtype === 'MOVE_TARGET_DATE' && (
            <>
              <div>
                <label>
                  New Target Date: *
                  <input
                    type="date"
                    value={newTargetDate}
                    onChange={(e) => setNewTargetDate(e.target.value)}
                    required
                  />
                </label>
              </div>
              <div>
                <label>
                  Previous Target Date (optional):
                  <input
                    type="date"
                    value={previousTargetDate}
                    onChange={(e) => setPreviousTargetDate(e.target.value)}
                  />
                </label>
              </div>
            </>
          )}
          {subtype === 'CHANGE_CONFIDENCE_LEVEL' && (
            <div>
              <label>
                Commitment Percentile: *
                <select
                  value={commitmentPercentile}
                  onChange={(e) => setCommitmentPercentile(e.target.value)}
                  required
                >
                  <option value="">Select...</option>
                  <option value="50">50%</option>
                  <option value="80">80%</option>
                </select>
              </label>
            </div>
          )}
        </>
      );
    } else if (decisionType === 'change_capacity') {
      return (
        <>
          <div>
            <label>
              Team ID: *
              <input
                type="text"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                placeholder="platform"
                required
              />
            </label>
          </div>
          <div>
            <label>
              Delta FTE: *
              <input
                type="number"
                step="0.1"
                value={deltaFte}
                onChange={(e) => setDeltaFte(e.target.value)}
                placeholder="1.0"
                required
              />
            </label>
          </div>
          <div>
            <label>
              Start Date: *
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </label>
          </div>
          <div>
            <label>
              End Date (optional):
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </label>
          </div>
          <div>
            <label>
              Method: *
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                required
              >
                <option value="hire">Hire</option>
                <option value="contractor">Contractor</option>
                <option value="internal_reallocation">Internal Reallocation</option>
              </select>
            </label>
          </div>
          <div>
            <label>
              Cost Delta (optional):
              <input
                type="number"
                value={costDelta}
                onChange={(e) => setCostDelta(e.target.value)}
                placeholder="0"
              />
            </label>
          </div>
        </>
      );
    } else if (decisionType === 'change_priority') {
      return (
        <>
          <div>
            <label>
              Item IDs (comma-separated): *
              <input
                type="text"
                value={itemIds}
                onChange={(e) => setItemIds(e.target.value)}
                placeholder="EPIC-77"
                required
              />
            </label>
          </div>
          <div>
            <label>
              Priority Bucket:
              <select
                value={priorityBucket}
                onChange={(e) => setPriorityBucket(e.target.value)}
              >
                <option value="P0">P0</option>
                <option value="P1">P1</option>
                <option value="P2">P2</option>
              </select>
            </label>
          </div>
          <div>
            <label>
              Priority Rank (optional):
              <input
                type="number"
                value={priorityRank}
                onChange={(e) => setPriorityRank(e.target.value)}
                placeholder="1"
              />
            </label>
          </div>
          <div>
            <label>
              Reason: *
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Blocks release"
                required
              />
            </label>
          </div>
        </>
      );
    } else if (decisionType === 'accept_risk') {
      return (
        <>
          <div>
            <label>
              Risk ID: *
              <input
                type="text"
                value={riskId}
                onChange={(e) => setRiskId(e.target.value)}
                placeholder="RISK-13"
                required
              />
            </label>
          </div>
          {subtype === 'ACCEPT_UNTIL_DATE' && (
            <div>
              <label>
                Acceptance Until: *
                <input
                  type="date"
                  value={acceptanceUntil}
                  onChange={(e) => setAcceptanceUntil(e.target.value)}
                  required
                />
              </label>
            </div>
          )}
          {subtype === 'ACCEPT_WITH_THRESHOLD' && (
            <div>
              <label>
                Threshold: *
                <input
                  type="text"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  placeholder="P80 slips > 7 days"
                  required
                />
              </label>
            </div>
          )}
          <div>
            <label>
              Escalation Trigger (optional):
              <input
                type="text"
                value={escalationTrigger}
                onChange={(e) => setEscalationTrigger(e.target.value)}
                placeholder="P80 slips > 7 days"
              />
            </label>
          </div>
        </>
      );
    } else if (decisionType === 'mitigate_risk') {
      return (
        <>
          <div>
            <label>
              Risk ID:
              <input
                type="text"
                value={riskId}
                onChange={(e) => setRiskId(e.target.value)}
                placeholder="RISK-13"
              />
            </label>
          </div>
          <div>
            <label>
              Action: *
              <textarea
                value={action}
                onChange={(e) => setAction(e.target.value)}
                placeholder="Build mock Payments API for integration tests"
                required
              />
            </label>
          </div>
          <div>
            <label>
              Expected Impact Days Delta (optional):
              <input
                type="number"
                value={expectedImpactDaysDelta}
                onChange={(e) => setExpectedImpactDaysDelta(e.target.value)}
                placeholder="-4"
              />
            </label>
          </div>
          <div>
            <label>
              Expected Probability Delta (optional):
              <input
                type="number"
                step="0.01"
                value={expectedProbabilityDelta}
                onChange={(e) => setExpectedProbabilityDelta(e.target.value)}
                placeholder="-0.1"
              />
            </label>
          </div>
          <div>
            <label>
              Due Date (optional):
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </label>
          </div>
        </>
      );
    }
    return null;
  };

  return (
    <div className="decision-view">
      <h2>Decision Analysis</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>
            Decision Type:
            <select
              value={decisionType}
              onChange={(e) => {
                setDecisionType(e.target.value as DecisionType);
                setSubtype(SUBTYPES[e.target.value as DecisionType][0]);
              }}
            >
              <option value="change_scope">Change Scope</option>
              <option value="change_schedule">Change Schedule</option>
              <option value="change_capacity">Change Capacity</option>
              <option value="change_priority">Change Priority</option>
              <option value="accept_risk">Accept Risk</option>
              <option value="mitigate_risk">Mitigate Risk</option>
            </select>
          </label>
        </div>
        <div>
          <label>
            Subtype:
            <select
              value={subtype || SUBTYPES[decisionType][0]}
              onChange={(e) => setSubtype(e.target.value)}
            >
              {SUBTYPES[decisionType].map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div>
          <label>
            Milestone Name: *
            <select
              value={milestoneName}
              onChange={(e) => setMilestoneName(e.target.value)}
              required
            >
              <option value="">Select a milestone...</option>
              {milestones.map((milestone) => (
                <option key={milestone.id} value={milestone.name}>
                  {milestone.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        
        {renderTypeSpecificFields()}
        
        <button type="submit" disabled={loading}>
          {loading ? 'Analyzing...' : 'Analyze Decision'}
        </button>
        {error && <div style={{ color: 'red', marginTop: '10px' }}>{error}</div>}
      </form>

      {analysis && (
        <div className="analysis-results">
          <h3>Impact Analysis</h3>
          <p>Affected Items: {analysis.affected_items?.length || 0}</p>
          <ul>
            {analysis.affected_items?.map((item: any) => (
              <li key={item.item_id}>
                <strong>{item.item_id}</strong>
                <div>Original: {item.original_estimated_days} days</div>
                <div>Modified: {item.modified_estimated_days} days</div>
                <div>Effects: {JSON.stringify(item.effects)}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
