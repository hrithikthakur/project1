import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  listActors,
  createActor,
  updateActor,
  deleteActor,
  Actor,
} from '../api';

export default function ActorsView() {
  const [actors, setActors] = useState<Actor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingActor, setEditingActor] = useState<Actor | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [formData, setFormData] = useState<Partial<Actor>>({
    type: 'USER',
    display_name: '',
    title: '',
    email: '',
    is_active: true,
  });

  useEffect(() => {
    loadActors();
  }, []);

  async function loadActors() {
    try {
      const data = await listActors();
      setActors(data);
    } catch (error) {
      console.error('Error loading actors:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(actor: Actor) {
    setEditingActor(actor);
    setFormData(actor);
    setShowForm(true);
  }

  function handleNew() {
    setEditingActor(null);
    setFormData({
      type: 'USER',
      display_name: '',
      title: '',
      email: '',
      is_active: true,
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingActor) {
        await updateActor(editingActor.id, formData as Actor);
      } else {
        const newActor: Actor = {
          id: `actor_${Date.now()}`,
          ...formData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Actor;
        await createActor(newActor);
      }
      setShowForm(false);
      loadActors();
      toast.success(editingActor ? 'Actor updated' : 'Actor created');
    } catch (error) {
      console.error('Error saving actor:', error);
      toast.error('Error saving actor');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this actor?')) return;
    try {
      await deleteActor(id);
      loadActors();
      toast.success('Actor deleted');
    } catch (error) {
      console.error('Error deleting actor:', error);
      toast.error('Error deleting actor');
    }
  }

  if (loading) {
    return <div className="view-loading">Loading actors...</div>;
  }

  const users = actors.filter((a) => a.type === 'USER');
  const teams = actors.filter((a) => a.type === 'TEAM');

  return (
    <div className="view-container">
      <div className="view-header">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          Actors
          <span 
            style={{ 
              cursor: 'help',
              fontSize: '0.875rem',
              color: '#64748b',
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              border: '1.5px solid #94a3b8',
              fontWeight: 'bold',
            }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            ?
            {showTooltip && (
              <div style={{
                position: 'absolute',
                top: '30px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: '#1e293b',
                color: 'white',
                padding: '12px 16px',
                borderRadius: '8px',
                fontSize: '0.875rem',
                width: '320px',
                zIndex: 1000,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                lineHeight: '1.5',
                textAlign: 'left',
                fontWeight: 'normal',
              }}>
                <div style={{ marginBottom: '8px' }}>
                  <strong style={{ color: '#f1f5f9' }}>Actor:</strong> A person (USER) or group (TEAM) that can be assigned ownership of decisions, risks, or work items.
                </div>
                <div style={{ color: '#cbd5e1', fontSize: '0.8125rem' }}>
                  ✓ Enables accountability tracking across the project.
                </div>
                {/* Tooltip arrow */}
                <div style={{
                  position: 'absolute',
                  top: '-6px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '0',
                  height: '0',
                  borderLeft: '6px solid transparent',
                  borderRight: '6px solid transparent',
                  borderBottom: '6px solid #1e293b',
                }}></div>
              </div>
            )}
          </span>
        </h2>
        <button className="btn-primary" onClick={handleNew}>
          + New Actor
        </button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{editingActor ? 'Edit Actor' : 'New Actor'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'USER' | 'TEAM' })}
                  required
                >
                  <option value="USER">User</option>
                  <option value="TEAM">Team</option>
                </select>
              </div>
              <div className="form-group">
                <label>Display Name *</label>
                <input
                  type="text"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  required
                />
              </div>
              {formData.type === 'USER' && (
                <>
                  <div className="form-group">
                    <label>Title</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </>
              )}
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  Active
                </label>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  {editingActor ? 'Update' : 'Create'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="actors-sections">
        <div className="actors-section">
          <h3>Users ({users.length})</h3>
          <div className="cards-grid">
            {users.map((actor) => (
              <div key={actor.id} className="card">
                <div className="card-header">
                  <h3>{actor.display_name}</h3>
                  {actor.is_active ? (
                    <span
                      className="status-badge"
                      style={{
                        backgroundColor: '#27ae60', // Vibrant Green
                      }}
                    >
                      Active
                    </span>
                  ) : (
                    <span
                      className="status-badge"
                      style={{
                        backgroundColor: '#e74c3c', // Vibrant Red
                      }}
                    >
                      Inactive
                    </span>
                  )}
                </div>
                <div className="card-body">
                  {actor.title && <p className="card-meta-text">{actor.title}</p>}
                  {actor.email && <p className="card-meta-text">{actor.email}</p>}
                </div>
                <div className="card-actions">
                  <button className="btn-icon" onClick={() => handleEdit(actor)}>
                    ✏️ Edit
                  </button>
                  <button className="btn-icon btn-danger" onClick={() => handleDelete(actor.id)}>
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="actors-section">
          <h3>Teams ({teams.length})</h3>
          <div className="cards-grid">
            {teams.map((actor) => (
              <div key={actor.id} className="card">
                <div className="card-header">
                  <h3>{actor.display_name}</h3>
                  {actor.is_active ? (
                    <span
                      className="status-badge"
                      style={{
                        backgroundColor: '#27ae60', // Vibrant Green
                      }}
                    >
                      Active
                    </span>
                  ) : (
                    <span
                      className="status-badge"
                      style={{
                        backgroundColor: '#e74c3c', // Vibrant Red
                      }}
                    >
                      Inactive
                    </span>
                  )}
                </div>
                <div className="card-actions">
                  <button className="btn-icon" onClick={() => handleEdit(actor)}>
                    ✏️ Edit
                  </button>
                  <button className="btn-icon btn-danger" onClick={() => handleDelete(actor.id)}>
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {actors.length === 0 && (
        <div className="empty-state">
          <p>No actors found. Create your first actor!</p>
        </div>
      )}
    </div>
  );
}

