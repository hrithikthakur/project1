import { useState } from 'react';
import { Decision, createDecision, analyzeDecision } from '../api';

export default function DecisionView() {
  const [decision, setDecision] = useState<Partial<Decision>>({
    decision_type: 'hire',
    description: '',
    target_id: '',
  });
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const newDecision: Decision = {
        id: `dec_${Date.now()}`,
        decision_type: decision.decision_type || 'hire',
        target_id: decision.target_id || '',
        description: decision.description || '',
        timestamp: new Date().toISOString(),
        effects: {},
      };
      
      const result = await analyzeDecision(newDecision);
      setAnalysis(result);
    } catch (error) {
      console.error('Error analyzing decision:', error);
      alert('Failed to analyze decision');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="decision-view">
      <h2>Decision Analysis</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>
            Decision Type:
            <select
              value={decision.decision_type || 'hire'}
              onChange={(e) => setDecision({ ...decision, decision_type: e.target.value })}
            >
              <option value="hire">Hire</option>
              <option value="fire">Fire</option>
              <option value="delay">Delay</option>
              <option value="accelerate">Accelerate</option>
              <option value="change_scope">Change Scope</option>
              <option value="add_resource">Add Resource</option>
              <option value="remove_resource">Remove Resource</option>
            </select>
          </label>
        </div>
        <div>
          <label>
            Target ID:
            <input
              type="text"
              value={decision.target_id || ''}
              onChange={(e) => setDecision({ ...decision, target_id: e.target.value })}
              placeholder="work_item_001"
            />
          </label>
        </div>
        <div>
          <label>
            Description:
            <textarea
              value={decision.description || ''}
              onChange={(e) => setDecision({ ...decision, description: e.target.value })}
              placeholder="Describe the decision..."
            />
          </label>
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Analyzing...' : 'Analyze Decision'}
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

