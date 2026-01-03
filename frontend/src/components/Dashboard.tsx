import { useState, useEffect } from 'react';
import {
  listDecisions,
  listRisks,
  listMilestones,
  listWorkItems,
  listActors,
  Decision,
  Risk,
  Milestone,
  WorkItem,
  Actor,
} from '../api';

export default function Dashboard() {
  const [stats, setStats] = useState({
    decisions: 0,
    risks: 0,
    milestones: 0,
    workItems: 0,
    actors: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [decisions, risks, milestones, workItems, actors] = await Promise.all([
          listDecisions(),
          listRisks(),
          listMilestones(),
          listWorkItems(),
          listActors(),
        ]);

        setStats({
          decisions: decisions.length,
          risks: risks.length,
          milestones: milestones.length,
          workItems: workItems.length,
          actors: actors.length,
        });
      } catch (error) {
        console.error('Error loading stats:', error);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  if (loading) {
    return <div className="dashboard-loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard">
      <h2>Dashboard Overview</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>{stats.decisions}</h3>
            <p>Decisions</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <h3>{stats.risks}</h3>
            <p>Risks</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <h3>{stats.milestones}</h3>
            <p>Milestones</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <h3>{stats.workItems}</h3>
            <p>Work Items</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>{stats.actors}</h3>
            <p>Actors</p>
          </div>
        </div>
      </div>

      <div className="dashboard-sections">
        <div className="dashboard-section">
          <h3>Quick Actions</h3>
          <div className="quick-actions">
            <button className="action-btn">Create Decision</button>
            <button className="action-btn">Create Risk</button>
            <button className="action-btn">Create Milestone</button>
            <button className="action-btn">Create Work Item</button>
            <button className="action-btn">Add Actor</button>
          </div>
        </div>
      </div>
    </div>
  );
}

