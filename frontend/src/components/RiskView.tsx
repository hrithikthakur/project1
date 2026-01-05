import { useState } from 'react';
import toast from 'react-hot-toast';
import { Risk, analyzeRisk } from '../api';

export default function RiskView() {
  const [risk, setRisk] = useState<Partial<Risk>>({
    severity: 'medium',
    status: 'open',
    probability: 0.3,
    impact: { velocity_multiplier: 0.8 },
    affected_items: [],
    milestone_id: '',
  });
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [affectedItemInput, setAffectedItemInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
        const newRisk: Risk = {
        id: `risk_${Date.now()}`,
        title: risk.title || '',
        description: risk.description || '',
        severity: risk.severity || 'medium',
        status: risk.status || 'open',
        probability: risk.probability || 0.3,
        impact: risk.impact || {},
        milestone_id: risk.milestone_id || 'default',
        affected_items: risk.affected_items || [],
        detected_at: new Date().toISOString(),
      };
      
      const result = await analyzeRisk(newRisk);
      setAnalysis(result);
      toast.success('Risk analysis completed');
    } catch (error) {
      console.error('Error analyzing risk:', error);
      toast.error('Failed to analyze risk');
    } finally {
      setLoading(false);
    }
  };

  const addAffectedItem = () => {
    if (affectedItemInput.trim()) {
      setRisk({
        ...risk,
        affected_items: [...(risk.affected_items || []), affectedItemInput.trim()],
      });
      setAffectedItemInput('');
    }
  };

  return (
    <div className="risk-view">
      <h2>Risk Analysis</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>
            Title:
            <input
              type="text"
              value={risk.title || ''}
              onChange={(e) => setRisk({ ...risk, title: e.target.value })}
              placeholder="Risk title"
            />
          </label>
        </div>
        <div>
          <label>
            Description:
            <textarea
              value={risk.description || ''}
              onChange={(e) => setRisk({ ...risk, description: e.target.value })}
              placeholder="Describe the risk..."
            />
          </label>
        </div>
        <div>
          <label>
            Severity:
            <select
              value={risk.severity || 'medium'}
              onChange={(e) => setRisk({ ...risk, severity: e.target.value })}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </label>
        </div>
        <div>
          <label>
            Probability (0.0 - 1.0):
            <input
              type="number"
              min="0"
              max="1"
              step="0.1"
              value={risk.probability || 0.3}
              onChange={(e) => setRisk({ ...risk, probability: parseFloat(e.target.value) })}
            />
          </label>
        </div>
        <div>
          <label>
            Velocity Multiplier:
            <input
              type="number"
              step="0.1"
              value={risk.impact?.velocity_multiplier || 0.8}
              onChange={(e) =>
                setRisk({
                  ...risk,
                  impact: { ...risk.impact, velocity_multiplier: parseFloat(e.target.value) },
                })
              }
            />
          </label>
        </div>
        <div>
          <label>
            Affected Items:
            <div>
              <input
                type="text"
                value={affectedItemInput}
                onChange={(e) => setAffectedItemInput(e.target.value)}
                placeholder="work_item_001"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addAffectedItem();
                  }
                }}
              />
              <button type="button" onClick={addAffectedItem}>
                Add
              </button>
            </div>
            <ul>
              {risk.affected_items?.map((item, idx) => (
                <li key={idx}>
                  {item}
                  <button
                    type="button"
                    onClick={() => {
                      setRisk({
                        ...risk,
                        affected_items: risk.affected_items?.filter((_, i) => i !== idx),
                      });
                    }}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </label>
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Analyzing...' : 'Analyze Risk'}
        </button>
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

