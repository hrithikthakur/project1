import { useState } from 'react';
import DecisionView from './components/DecisionView';
import RiskView from './components/RiskView';
import ForecastView from './components/ForecastView';
import Dashboard from './components/Dashboard';
import MilestonesView from './components/MilestonesView';
import WorkItemsView from './components/WorkItemsView';
import ActorsView from './components/ActorsView';
import OwnershipView from './components/OwnershipView';
import RolesView from './components/RolesView';
import DecisionsView from './components/DecisionsView';
import RisksView from './components/RisksView';
import IssuesView from './components/IssuesView';
import './App.css';

type View =
  | 'dashboard'
  | 'decisions'
  | 'risks'
  | 'issues'
  | 'milestones'
  | 'work_items'
  | 'actors'
  | 'ownership'
  | 'roles'
  | 'forecast';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');

  const navItems = [
    { id: 'dashboard' as View, label: 'Dashboard', icon: '📊' },
    { id: 'milestones' as View, label: 'Milestones', icon: '🎯' },
    { id: 'work_items' as View, label: 'Work Items', icon: '📋' },
    { id: 'decisions' as View, label: 'Decisions', icon: '⚡' },
    { id: 'risks' as View, label: 'Risks', icon: '⚠️' },
    { id: 'issues' as View, label: 'Issues', icon: '🔴' },
    { id: 'actors' as View, label: 'Actors', icon: '👥' },
    { id: 'ownership' as View, label: 'Ownership', icon: '🔗' },
    { id: 'roles' as View, label: 'Roles', icon: '🔐' },
    { id: 'forecast' as View, label: 'Forecast', icon: '📈' },
  ];

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
        <h1>Decision Risk Engine</h1>
          <nav className="main-nav">
            {navItems.map((item) => (
          <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`nav-button ${currentView === item.id ? 'active' : ''}`}
                title={item.label}
          >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
          </button>
            ))}
        </nav>
        </div>
      </header>

      <main className="app-main">
        {currentView === 'dashboard' && <Dashboard />}
        {currentView === 'decisions' && <DecisionsView />}
        {currentView === 'risks' && <RisksView />}
        {currentView === 'issues' && <IssuesView />}
        {currentView === 'milestones' && <MilestonesView />}
        {currentView === 'work_items' && <WorkItemsView />}
        {currentView === 'actors' && <ActorsView />}
        {currentView === 'ownership' && <OwnershipView />}
        {currentView === 'roles' && <RolesView />}
        {currentView === 'forecast' && <ForecastView />}
      </main>
    </div>
  );
}
