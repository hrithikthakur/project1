import { useState } from 'react';
import DecisionView from './components/DecisionView';
import RiskView from './components/RiskView';
import ForecastView from './components/ForecastView';
import './App.css';

type View = 'forecast' | 'decisions' | 'risks';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('forecast');

  return (
    <div className="app">
      <header className="app-header">
        <h1>Decision Risk Engine</h1>
        <nav>
          <button
            onClick={() => setCurrentView('forecast')}
            className={currentView === 'forecast' ? 'active' : ''}
          >
            Forecast
          </button>
          <button
            onClick={() => setCurrentView('decisions')}
            className={currentView === 'decisions' ? 'active' : ''}
          >
            Decisions
          </button>
          <button
            onClick={() => setCurrentView('risks')}
            className={currentView === 'risks' ? 'active' : ''}
          >
            Risks
          </button>
        </nav>
      </header>

      <main className="app-main">
        {currentView === 'forecast' && <ForecastView />}
        {currentView === 'decisions' && <DecisionView />}
        {currentView === 'risks' && <RiskView />}
      </main>
    </div>
  );
}

