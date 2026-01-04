import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  getMilestoneForecast,
  getScenarioForecast,
  getMitigationPreview,
  listMilestones,
  listRisks,
  type Milestone,
  type Risk,
  type MilestoneForecast,
  type ScenarioComparison,
  type MitigationPreview,
} from '../api';

export default function ForecastView() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [selectedMilestone, setSelectedMilestone] = useState<string>('');
  const [forecast, setForecast] = useState<MilestoneForecast | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Scenario state
  const [showScenario, setShowScenario] = useState(false);
  const [scenarioComparison, setScenarioComparison] = useState<ScenarioComparison | null>(null);
  const [scenarioType, setScenarioType] = useState<'dependency_delay' | 'scope_change' | 'capacity_change'>('dependency_delay');
  const [scenarioParams, setScenarioParams] = useState<Record<string, any>>({});
  
  // Mitigation preview state
  const [showMitigation, setShowMitigation] = useState(false);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [selectedRisk, setSelectedRisk] = useState<string>('');
  const [mitigationPreview, setMitigationPreview] = useState<MitigationPreview | null>(null);
  const [impactReduction, setImpactReduction] = useState<number>(4);

  useEffect(() => {
    loadMilestones();
    loadRisks();
  }, []);

  const loadMilestones = async () => {
    try {
      const data = await listMilestones();
      setMilestones(data);
      if (data.length > 0 && !selectedMilestone) {
        setSelectedMilestone(data[0].id);
      }
    } catch (error) {
      console.error('Error loading milestones:', error);
      toast.error('Failed to load milestones');
    }
  };

  const loadRisks = async () => {
    try {
      const data = await listRisks();
      setRisks(data);
    } catch (error) {
      console.error('Error loading risks:', error);
    }
  };

  const handleRunForecast = async () => {
    if (!selectedMilestone) {
      toast.error('Please select a milestone');
      return;
    }

    setLoading(true);
    try {
      const result = await getMilestoneForecast(selectedMilestone);
      setForecast(result);
      setScenarioComparison(null);
      setMitigationPreview(null);
      toast.success('Forecast completed');
    } catch (error) {
      console.error('Error running forecast:', error);
      toast.error('Failed to run forecast');
    } finally {
      setLoading(false);
    }
  };

  const handleRunScenario = async () => {
    if (!selectedMilestone) {
      toast.error('Please select a milestone');
      return;
    }

    setLoading(true);
    try {
      const result = await getScenarioForecast(selectedMilestone, {
        scenario_type: scenarioType,
        params: scenarioParams,
      });
      setScenarioComparison(result);
      toast.success('Scenario forecast completed');
    } catch (error) {
      console.error('Error running scenario:', error);
      toast.error('Failed to run scenario');
    } finally {
      setLoading(false);
    }
  };

  const handleRunMitigationPreview = async () => {
    if (!selectedMilestone || !selectedRisk) {
      toast.error('Please select a milestone and risk');
      return;
    }

    setLoading(true);
    try {
      const result = await getMitigationPreview(selectedMilestone, {
        risk_id: selectedRisk,
        expected_impact_reduction_days: impactReduction,
      });
      setMitigationPreview(result);
      toast.success('Mitigation preview completed');
    } catch (error) {
      console.error('Error running mitigation preview:', error);
      toast.error('Failed to run mitigation preview');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="view-container">
      <div className="view-header">
        <h2>📈 Forecast Engine v1</h2>
      </div>

      {/* Milestone Selection */}
      <div className="detail-card" style={{ marginBottom: '1.5rem' }}>
        <div className="detail-card-header">
          <h3>Select Milestone to Forecast</h3>
        </div>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>
          Choose a milestone to see P50/P80 dates and contribution breakdown
        </p>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <select
            value={selectedMilestone}
            onChange={(e) => setSelectedMilestone(e.target.value)}
            className="detail-select"
            style={{ flex: 1, minWidth: '250px' }}
          >
            <option value="">Select a milestone...</option>
            {milestones.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} • Target: {formatDate(m.target_date)}
              </option>
            ))}
          </select>
          <button
            onClick={handleRunForecast}
            disabled={loading || !selectedMilestone}
            className="btn-primary"
          >
            {loading ? '⏳ Computing...' : '📊 Run Forecast'}
          </button>
        </div>
      </div>

      {/* Baseline Forecast Result */}
      {forecast && (
        <>
          <div className="detail-card" style={{ marginBottom: '1.5rem' }}>
            <div className="detail-card-header">
              <h3>Baseline Forecast</h3>
              <span 
                className="status-badge"
                style={{
                  background: forecast.delta_p80_days <= 0 
                    ? 'var(--success-color)' 
                    : forecast.delta_p80_days <= 7 
                      ? 'var(--warning-color)' 
                      : 'var(--danger-color)'
                }}
              >
                {forecast.delta_p80_days <= 0 ? '✓ On Track' : forecast.delta_p80_days <= 7 ? '⚠ At Risk' : '⚠ Delayed'}
              </span>
            </div>

            {/* Metrics Grid */}
            <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
              <div className="stat-card">
                <div className="stat-icon">📅</div>
                <div className="stat-content">
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>P50 FORECAST</p>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{formatDate(forecast.p50_date)}</h3>
                  <p style={{ 
                    fontSize: '0.85rem', 
                    fontWeight: 600,
                    color: forecast.delta_p50_days > 0 ? 'var(--danger-color)' : 'var(--success-color)'
                  }}>
                    {forecast.delta_p50_days > 0 ? '+' : ''}{forecast.delta_p50_days} days from target
                  </p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">🎯</div>
                <div className="stat-content">
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>P80 FORECAST</p>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{formatDate(forecast.p80_date)}</h3>
                  <p style={{ 
                    fontSize: '0.85rem', 
                    fontWeight: 600,
                    color: forecast.delta_p80_days > 0 ? 'var(--danger-color)' : 'var(--success-color)'
                  }}>
                    {forecast.delta_p80_days > 0 ? '+' : ''}{forecast.delta_p80_days} days from target
                  </p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">📊</div>
                <div className="stat-content">
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>CONFIDENCE</p>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{forecast.confidence_level}</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Use for direction</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">📋</div>
                <div className="stat-content">
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>CONTRIBUTORS</p>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{forecast.contribution_breakdown.length}</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>delay factors</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  setShowScenario(!showScenario);
                  setShowMitigation(false);
                }}
                className={showScenario ? 'btn-primary' : 'btn-secondary'}
              >
                🔮 What-If Scenario
              </button>
              <button
                onClick={() => {
                  setShowMitigation(!showMitigation);
                  setShowScenario(false);
                }}
                className={showMitigation ? 'btn-primary' : 'btn-secondary'}
              >
                ⚡ Preview Mitigation
              </button>
            </div>

            {/* Contribution Breakdown */}
            <div className="detail-section" style={{ borderTop: '1px solid var(--cream-dark)', paddingTop: '1.5rem' }}>
              <h4 className="detail-section-title">📋 Why is it delayed?</h4>
              <div className="detail-list-simple">
                {forecast.contribution_breakdown.map((contrib, idx) => (
                  <div key={idx} className="detail-list-item-simple" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ 
                        width: '24px', 
                        height: '24px', 
                        borderRadius: '50%', 
                        background: 'var(--cream-dark)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 600
                      }}>
                        {idx + 1}
                      </span>
                      <span style={{ fontSize: '0.9rem' }}>{contrib.cause}</span>
                    </div>
                    <span style={{ 
                      fontWeight: 700, 
                      fontSize: '1rem',
                      color: contrib.days > 0 ? 'var(--danger-color)' : 'var(--success-color)'
                    }}>
                      {contrib.days > 0 ? '+' : ''}{contrib.days.toFixed(1)}d
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* What-If Scenario Panel */}
          {showScenario && (
            <div className="detail-card" style={{ marginBottom: '1.5rem', border: '2px solid var(--secondary-color)' }}>
              <div className="detail-card-header">
                <h3>🔮 What-If Scenario Analysis</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label>Scenario Type</label>
                  <select
                    value={scenarioType}
                    onChange={(e) => {
                      setScenarioType(e.target.value as any);
                      setScenarioParams({});
                    }}
                    className="detail-select"
                  >
                    <option value="dependency_delay">📦 Dependency Delay</option>
                    <option value="scope_change">📝 Scope Change</option>
                    <option value="capacity_change">👥 Capacity Change</option>
                  </select>
                </div>

                <div className="form-group">
                  {scenarioType === 'dependency_delay' && (
                    <>
                      <label>Work Item ID</label>
                      <input
                        type="text"
                        placeholder="e.g., work_item_001"
                        value={scenarioParams.work_item_id || ''}
                        onChange={(e) => setScenarioParams({ ...scenarioParams, work_item_id: e.target.value })}
                        className="detail-input"
                      />
                      <div style={{ marginTop: '0.75rem' }}>
                        <label>Delay (days)</label>
                        <input
                          type="number"
                          placeholder="e.g., 5"
                          value={scenarioParams.delay_days || ''}
                          onChange={(e) => setScenarioParams({ ...scenarioParams, delay_days: parseInt(e.target.value) })}
                          className="detail-input"
                        />
                      </div>
                    </>
                  )}

                  {scenarioType === 'scope_change' && (
                    <>
                      <label>Effort Delta (days)</label>
                      <input
                        type="number"
                        placeholder="Positive = add, negative = remove"
                        value={scenarioParams.effort_delta_days || ''}
                        onChange={(e) => setScenarioParams({ ...scenarioParams, effort_delta_days: parseInt(e.target.value) })}
                        className="detail-input"
                      />
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                        e.g., +8 to add 8 days of work
                      </p>
                    </>
                  )}

                  {scenarioType === 'capacity_change' && (
                    <>
                      <label>Capacity Multiplier</label>
          <input
            type="number"
                        step="0.1"
                        placeholder="0.7 = 30% reduction"
                        value={scenarioParams.capacity_multiplier || ''}
                        onChange={(e) => setScenarioParams({ ...scenarioParams, capacity_multiplier: parseFloat(e.target.value) })}
                        className="detail-input"
                      />
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                        e.g., 0.7 = team at 70% capacity
                      </p>
                    </>
                  )}
                </div>
              </div>

              <button
                onClick={handleRunScenario}
                disabled={loading}
                className="btn-primary"
                style={{ width: '100%' }}
              >
                {loading ? '⏳ Running Scenario...' : '▶ Run Scenario'}
        </button>

              {/* Scenario Results */}
              {scenarioComparison && (
                <div style={{ marginTop: '1.5rem', padding: '1.25rem', background: 'var(--cream-light)', borderRadius: 'var(--radius-sm)' }}>
                  <h4 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>Scenario Results</h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{ padding: '1rem', background: 'var(--cream)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--cream-dark)' }}>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>BASELINE</p>
                      <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>{formatDate(scenarioComparison.baseline.p80_date)}</p>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{scenarioComparison.baseline.delta_p80_days} days from target</p>
                    </div>
                    <div style={{ padding: '1rem', background: 'var(--cream)', borderRadius: 'var(--radius-sm)', border: '2px solid var(--secondary-color)' }}>
                      <p style={{ fontSize: '0.75rem', color: 'var(--secondary-color)', marginBottom: '0.5rem' }}>WITH SCENARIO</p>
                      <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>{formatDate(scenarioComparison.scenario.p80_date)}</p>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{scenarioComparison.scenario.delta_p80_days} days from target</p>
                    </div>
                  </div>

                  <div style={{ 
                    padding: '1rem', 
                    borderRadius: 'var(--radius-sm)', 
                    textAlign: 'center',
                    fontWeight: 600,
                    background: scenarioComparison.impact_days > 0 ? 'var(--danger-color)' : 'var(--success-color)',
                    color: '#fff'
                  }}>
                    {scenarioComparison.impact_description}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mitigation Preview Panel */}
          {showMitigation && (
            <div className="detail-card" style={{ marginBottom: '1.5rem', border: '2px solid var(--success-color)' }}>
              <div className="detail-card-header">
                <h3>⚡ Mitigation Impact Preview</h3>
      </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label>Risk to Mitigate</label>
                  <select
                    value={selectedRisk}
                    onChange={(e) => setSelectedRisk(e.target.value)}
                    className="detail-select"
                  >
                    <option value="">Select a risk...</option>
                    {risks
                      .filter((r) => r.milestone_id === selectedMilestone && r.status !== 'closed')
                      .map((risk) => (
                        <option key={risk.id} value={risk.id}>
                          {risk.title} • {risk.status}
                        </option>
                      ))}
                    {risks.filter((r) => r.milestone_id === selectedMilestone && r.status !== 'closed').length === 0 && (
                      <option disabled>No risks found for this milestone</option>
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label>Expected Impact Reduction (days)</label>
                  <input
                    type="number"
                    value={impactReduction}
                    onChange={(e) => setImpactReduction(parseInt(e.target.value))}
                    className="detail-input"
                  />
                </div>
              </div>

              <button
                onClick={handleRunMitigationPreview}
                disabled={loading || !selectedRisk}
                className="btn-primary"
                style={{ width: '100%' }}
              >
                {loading ? '⏳ Computing Preview...' : '▶ Preview Impact'}
              </button>

              {/* Mitigation Results */}
              {mitigationPreview && (
                <div style={{ marginTop: '1.5rem', padding: '1.25rem', background: 'var(--cream-light)', borderRadius: 'var(--radius-sm)' }}>
                  <h4 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>Preview Results</h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{ padding: '1rem', background: 'var(--cream)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--cream-dark)' }}>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>CURRENT</p>
                      <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>{formatDate(mitigationPreview.current.p80_date)}</p>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{mitigationPreview.current.delta_p80_days} days from target</p>
                    </div>
                    <div style={{ padding: '1rem', background: 'var(--cream)', borderRadius: 'var(--radius-sm)', border: '2px solid var(--success-color)' }}>
                      <p style={{ fontSize: '0.75rem', color: 'var(--success-color)', marginBottom: '0.5rem' }}>WITH MITIGATION</p>
                      <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>{formatDate(mitigationPreview.with_mitigation.p80_date)}</p>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{mitigationPreview.with_mitigation.delta_p80_days} days from target</p>
                    </div>
                  </div>

                  <div style={{ 
                    padding: '1rem', 
                    borderRadius: 'var(--radius-sm)', 
                    background: mitigationPreview.recommendation === 'approve' 
                      ? 'rgba(168, 197, 160, 0.2)' 
                      : mitigationPreview.recommendation === 'evaluate' 
                        ? 'rgba(232, 211, 168, 0.3)' 
                        : 'rgba(201, 155, 136, 0.2)',
                    border: mitigationPreview.recommendation === 'approve' 
                      ? '1px solid var(--success-color)' 
                      : mitigationPreview.recommendation === 'evaluate' 
                        ? '1px solid var(--warning-color)' 
                        : '1px solid var(--danger-color)'
                  }}>
                    <p style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                      💡 Improvement: {mitigationPreview.improvement_days.toFixed(1)} days
                    </p>
                    <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                      Recommendation: <span style={{ textTransform: 'uppercase' }}>{mitigationPreview.recommendation}</span>
                    </p>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{mitigationPreview.reasoning}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Info Panel - only show when no forecast */}
      {!forecast && (
        <div className="info-box" style={{ marginTop: '1.5rem', padding: '1.5rem' }}>
          <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>💡</span> About Forecast Engine v1
          </h4>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <span>✓</span>
              <span><strong>One Function:</strong> All features use the same forecast logic for consistency</span>
            </li>
            <li style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <span>✓</span>
              <span><strong>Contribution Breakdown:</strong> See exactly why dates slip with causal attribution</span>
            </li>
            <li style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <span>✓</span>
              <span><strong>What-If Scenarios:</strong> Explore interventions before committing to decisions</span>
            </li>
            <li style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <span>✓</span>
              <span><strong>Mitigation Preview:</strong> See forecast impact before approving risk mitigations</span>
            </li>
            <li style={{ marginBottom: '0', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <span>✓</span>
              <span><strong>Fast Feedback:</strong> Millisecond response time for instant decision support</span>
            </li>
          </ul>
          <div className="detail-note" style={{ marginTop: '1rem' }}>
            <strong>Note:</strong> Confidence level is LOW by design. Use forecasts for direction, not precision. 
            Expect variance as you collect historical data.
          </div>
        </div>
      )}
    </div>
  );
}
