import { useState } from 'react';
import toast from 'react-hot-toast';
import { getForecast, ForecastRequest, ForecastResult } from '../api';

export default function ForecastView() {
  const [forecastResults, setForecastResults] = useState<ForecastResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [numSimulations, setNumSimulations] = useState(1000);

  const handleRunForecast = async () => {
    setLoading(true);
    try {
      const request: ForecastRequest = {
        decisions: [],
        risks: [],
        num_simulations: numSimulations,
      };
      
      const results = await getForecast(request);
      setForecastResults(results);
      toast.success('Forecast completed');
    } catch (error) {
      console.error('Error running forecast:', error);
      toast.error('Failed to run forecast');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forecast-view">
      <h2>Monte Carlo Forecast</h2>
      <div>
        <label>
          Number of Simulations:
          <input
            type="number"
            min="100"
            max="10000"
            value={numSimulations}
            onChange={(e) => setNumSimulations(parseInt(e.target.value))}
          />
        </label>
        <button onClick={handleRunForecast} disabled={loading}>
          {loading ? 'Running Forecast...' : 'Run Forecast'}
        </button>
      </div>

      {forecastResults.length > 0 && (
        <div className="forecast-results">
          <h3>Forecast Results</h3>
          <table>
            <thead>
              <tr>
                <th>Work Item ID</th>
                <th>Mean (days)</th>
                <th>P50</th>
                <th>P90</th>
                <th>P99</th>
                <th>Std Dev</th>
              </tr>
            </thead>
            <tbody>
              {forecastResults.map((result) => (
                <tr key={result.work_item_id}>
                  <td>{result.work_item_id}</td>
                  <td>{result.mean}</td>
                  <td>{result.percentiles.p50}</td>
                  <td>{result.percentiles.p90}</td>
                  <td>{result.percentiles.p99}</td>
                  <td>{result.std_dev}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

