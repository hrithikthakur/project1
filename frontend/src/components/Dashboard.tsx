import { useState, useEffect } from 'react';
import {
  listRisks,
  listMilestones,
  listDecisions,
  listWorkItems,
  listActors,
  Risk,
  Milestone,
  Decision,
  WorkItem,
} from '../api';

interface DashboardProps {
  onNavigate: (view: any) => void;
}

interface AttentionItem {
  risk: Risk;
  reason: string;
  urgency: number;
  actionLabel: string;
  actionColor: string;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [actorCount, setActorCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
      try {
      const [risksData, milestonesData, decisionsData, workItemsData, actorsData] = await Promise.all([
          listRisks(),
          listMilestones(),
        listDecisions(),
          listWorkItems(),
          listActors(),
        ]);

      setRisks(risksData);
      setMilestones(milestonesData);
      setDecisions(decisionsData);
      setWorkItems(workItemsData);
      setActorCount(actorsData.length);
      } catch (error) {
      console.error('Error loading dashboard:', error);
      } finally {
        setLoading(false);
      }
    }

  // 1. ATTENTION NOW - What needs action soon (ordered by urgency)
  function getAttentionItems(): AttentionItem[] {
    const items: AttentionItem[] = [];
    const now = new Date();

    risks.forEach(risk => {
      // MATERIALISED risks - RED - highest priority
      if (risk.status === 'materialised') {
        items.push({
          risk,
          reason: 'Blocking delivery now',
          urgency: 1,
          actionLabel: 'Resolve',
          actionColor: '#ef4444',
        });
      }
      // ACCEPTED risks with upcoming review dates
      else if (risk.status === 'accepted' && (risk as any).next_date) {
        const nextDate = new Date((risk as any).next_date);
        const daysUntil = Math.ceil((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntil <= 3) {
          items.push({
            risk,
            reason: daysUntil === 0 ? 'Review due today' : daysUntil === 1 ? 'Review due tomorrow' : `Review due in ${daysUntil} days`,
            urgency: 2,
            actionLabel: 'Review',
            actionColor: '#3498db',
          });
        }
      }
      // MITIGATING risks - AMBER
      else if (risk.status === 'mitigating') {
        items.push({
          risk,
          reason: 'Mitigation in progress',
          urgency: 3,
          actionLabel: 'Check Progress',
          actionColor: '#f39c12',
        });
      }
      // OPEN critical/high risks - AMBER
      else if (risk.status === 'open' && (risk.severity === 'critical' || risk.severity === 'high')) {
        items.push({
          risk,
          reason: `${risk.severity} severity - needs decision`,
          urgency: 4,
          actionLabel: 'Decide',
          actionColor: '#f39c12',
        });
      }
    });

    // Sort by urgency, then by next_date
    items.sort((a, b) => {
      if (a.urgency !== b.urgency) return a.urgency - b.urgency;
      const aDate = (a.risk as any).next_date ? new Date((a.risk as any).next_date).getTime() : Infinity;
      const bDate = (b.risk as any).next_date ? new Date((b.risk as any).next_date).getTime() : Infinity;
      return aDate - bDate;
    });

    return items.slice(0, 7);
  }

  // 2. ACTIVE MONITORING - Accepted risks (muted, reassuring)
  function getMonitoringRisks(): Array<Risk & { daysUntilBoundary?: number, milestoneName?: string }> {
    const now = new Date();
    
    return risks
      .filter(r => r.status === 'accepted')
      .map(risk => {
        let daysUntilBoundary: number | undefined;
        
        if ((risk as any).acceptance_boundary?.date) {
          const boundaryDate = new Date((risk as any).acceptance_boundary.date);
          daysUntilBoundary = Math.ceil((boundaryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        }
        
        const milestone = milestones.find(m => m.id === risk.milestone_id);
        
        return {
          ...risk,
          daysUntilBoundary,
          milestoneName: milestone?.name,
        };
      });
  }

  // 3. DELIVERY HEALTH - High-level per milestone (orientation)
  function getDeliveryHealth() {
    return milestones.map(milestone => {
      const milestoneRisks = risks.filter(r => 
        r.milestone_id === milestone.id && 
        (r.status === 'open' || r.status === 'materialised' || r.status === 'mitigating')
      );
      
      const hasBlockers = milestoneRisks.some(r => r.status === 'materialised');
      const hasCritical = milestoneRisks.some(r => r.severity === 'critical');
      
      let health: 'stable' | 'drifting' | 'slipping';
      let healthColor: string;
      let healthIcon: string;
      
      if (hasBlockers || milestoneRisks.length >= 3) {
        health = 'slipping';
        healthColor = '#ef4444';
        healthIcon = '🔴';
      } else if (hasCritical || milestoneRisks.length > 0) {
        health = 'drifting';
        healthColor = '#f39c12';
        healthIcon = '🟡';
      } else {
        health = 'stable';
        healthColor = '#27ae60';
        healthIcon = '🟢';
      }

      return {
        milestone,
        activeRisks: milestoneRisks.length,
        health,
        healthColor,
        healthIcon,
      };
    });
  }

  const attentionItems = getAttentionItems();
  const monitoringRisks = getMonitoringRisks();
  const deliveryHealth = getDeliveryHealth();

  if (loading) {
    return <div className="dashboard-loading">Loading...</div>;
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
      {/* Stats Grid - Big Cards */}
      <div className="stats-grid" style={{ marginBottom: '3rem' }}>
        <div 
          className="stat-card" 
          onClick={() => onNavigate('decisions')}
          style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '';
          }}
        >
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>{decisions.length}</h3>
            <p>Decisions</p>
          </div>
        </div>
        <div 
          className="stat-card"
          onClick={() => onNavigate('risks')}
          style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '';
          }}
        >
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <h3>{risks.length}</h3>
            <p>Risks</p>
          </div>
        </div>
        <div 
          className="stat-card"
          onClick={() => onNavigate('milestones')}
          style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '';
          }}
        >
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <h3>{milestones.length}</h3>
            <p>Milestones</p>
          </div>
        </div>
        <div 
          className="stat-card"
          onClick={() => onNavigate('work_items')}
          style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '';
          }}
        >
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <h3>{workItems.length}</h3>
            <p>Work Items</p>
          </div>
        </div>
        <div 
          className="stat-card"
          onClick={() => onNavigate('actors')}
          style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '';
          }}
        >
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>{actorCount}</h3>
            <p>Actors</p>
          </div>
        </div>
      </div>

      {/* 1. ATTENTION NOW - Top strip */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ 
          fontSize: '1.3rem', 
          fontWeight: 700, 
          marginBottom: '0.5rem',
          color: 'var(--text-primary)',
        }}>
          Risks Needing Attention Now
        </h2>

        
        {attentionItems.length === 0 ? (
          <div style={{
            padding: '2rem',
            background: 'var(--cream)',
            border: '1px solid var(--cream-dark)',
            borderRadius: '12px',
            textAlign: 'center',
            color: 'var(--text-secondary)',
          }}>
            Nothing urgent. All clear.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {attentionItems.map(item => (
              <div
                key={item.risk.id}
                onClick={() => onNavigate('risks')}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto auto',
                  gap: '1rem',
                  alignItems: 'center',
                  padding: '1rem 1.25rem',
                  background: 'white',
                  border: `2px solid ${item.urgency === 1 ? '#ef4444' : item.actionColor}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateX(4px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateX(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div>
                  <div style={{ 
                    fontWeight: 600, 
                    fontSize: '0.95rem',
                    color: 'var(--text-primary)',
                    marginBottom: '0.25rem',
                  }}>
                    {item.risk.title}
                  </div>
                  <div style={{ 
                    fontSize: '0.85rem', 
                    color: 'var(--text-secondary)',
                  }}>
                    {item.reason}
                  </div>
                </div>
                
                <div style={{
                  padding: '0.35rem 0.75rem',
                  background: item.urgency === 1 ? '#fef2f2' : item.actionColor + '20',
                  color: item.urgency === 1 ? '#991b1b' : item.actionColor,
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}>
                  {item.risk.status}
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate('risks');
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    background: item.actionColor,
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.9';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                >
                  {item.actionLabel}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 2. ACTIVE MONITORING - Middle (muted, calm) */}
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ 
          fontSize: '1.3rem', 
          fontWeight: 600, 
          marginBottom: '0.5rem',
          color: 'var(--text-secondary)',
        }}>
          Risks Under Active Monitoring
        </h2>
       
        
        {monitoringRisks.length === 0 ? (
          <div style={{
            padding: '1.5rem',
            background: 'var(--cream-light)',
            border: '1px dashed var(--cream-dark)',
            borderRadius: '8px',
            textAlign: 'center',
            color: 'var(--text-secondary)',
            fontSize: '0.9rem',
          }}>
            No risks currently being monitored
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1rem',
          }}>
            {monitoringRisks.map(risk => (
              <div
                key={risk.id}
                onClick={() => onNavigate('risks')}
                style={{
                  padding: '1rem',
                  background: 'var(--cream-light)',
                  border: '1px solid var(--cream-dark)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--cream)';
                  e.currentTarget.style.borderColor = '#3498db';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--cream-light)';
                  e.currentTarget.style.borderColor = 'var(--cream-dark)';
                }}
              >
                <div style={{ 
                  fontWeight: 600, 
                  fontSize: '0.9rem',
                  color: 'var(--text-primary)',
                  marginBottom: '0.5rem',
                }}>
                  {risk.title}
                </div>
                
                {risk.daysUntilBoundary !== undefined && (
                  <div style={{ 
                    fontSize: '0.8rem', 
                    color: '#3498db',
                    marginBottom: '0.25rem',
                  }}>
                    Boundary in {risk.daysUntilBoundary} day{risk.daysUntilBoundary !== 1 ? 's' : ''}
                  </div>
                )}
                
                {risk.milestoneName && (
                  <div style={{ 
                    fontSize: '0.8rem', 
                    color: 'var(--text-secondary)',
                  }}>
                    📍 {risk.milestoneName}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. DELIVERY HEALTH - Bottom (orientation, not action) */}
      <section>
        <h2 style={{ 
          fontSize: '1.3rem', 
          fontWeight: 600, 
          marginBottom: '1rem',
          color: 'var(--text-secondary)',
        }}>
          Milestone Delivery Health
        </h2>
        
        <div style={{ 
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}>
          {deliveryHealth.map(({ milestone, activeRisks, health, healthColor, healthIcon }) => (
            <div
              key={milestone.id}
              onClick={() => onNavigate('milestones')}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr auto auto',
                gap: '1.5rem',
                alignItems: 'center',
                padding: '1rem 1.25rem',
                background: 'var(--cream)',
                border: '1px solid var(--cream-dark)',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--cream-light)';
                e.currentTarget.style.borderColor = 'var(--secondary-color)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--cream)';
                e.currentTarget.style.borderColor = 'var(--cream-dark)';
              }}
            >
              <div>
                <div style={{ 
                  fontWeight: 600, 
                  fontSize: '0.95rem',
                  color: 'var(--text-primary)',
                }}>
                  {milestone.name}
                </div>
                <div style={{ 
                  fontSize: '0.8rem', 
                  color: 'var(--text-secondary)',
                  marginTop: '0.25rem',
                }}>
                  Target: {new Date(milestone.target_date).toLocaleDateString()}
                </div>
              </div>
              
              <div style={{
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
              }}>
                {activeRisks} active risk{activeRisks !== 1 ? 's' : ''}
              </div>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                <span>{healthIcon}</span>
                <span style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: healthColor,
                  textTransform: 'capitalize',
                }}>
                  {health}
                </span>
              </div>
              
              <div style={{
                fontSize: '1.25rem',
                color: 'var(--text-secondary)',
              }}>
                →
              </div>
            </div>
          ))}
          
          {deliveryHealth.length === 0 && (
            <div style={{
              padding: '1.5rem',
              background: 'var(--cream)',
              border: '1px solid var(--cream-dark)',
              borderRadius: '8px',
              textAlign: 'center',
              color: 'var(--text-secondary)',
            }}>
              No milestones configured
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
