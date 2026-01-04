// Use Vite proxy in development, or direct URL if VITE_API_URL is set
const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : 'http://localhost:8000/api');

export interface ForecastRequest {
  decisions?: any[];
  risks?: any[];
  num_simulations?: number;
}

export interface ForecastResult {
  work_item_id: string;
  percentiles: {
    p10: number;
    p50: number;
    p90: number;
    p99: number;
  };
  mean: number;
  std_dev: number;
  earliest_possible: string;
  latest_possible: string;
}

export type DecisionType = 
  | 'change_scope'
  | 'change_schedule'
  | 'change_capacity'
  | 'change_priority'
  | 'accept_risk'
  | 'mitigate_risk';

export type DecisionStatus = 'proposed' | 'approved' | 'superseded';

export interface Decision {
  // Common fields
  id: string;
  decision_type: DecisionType;
  subtype: string;
  milestone_name: string;
  status: DecisionStatus;
  next_date?: string;
  created_at: string;
  
  // CHANGE_SCOPE fields
  add_item_ids?: string[];
  remove_item_ids?: string[];
  reason?: string;
  effort_delta_days?: number;
  
  // CHANGE_SCHEDULE fields
  new_target_date?: string;
  previous_target_date?: string;
  commitment_percentile?: 50 | 80;
  
  // CHANGE_CAPACITY fields
  team_id?: string;
  delta_fte?: number;
  start_date?: string;
  end_date?: string;
  method?: 'hire' | 'contractor' | 'internal_reallocation';
  cost_delta?: number;
  
  // CHANGE_PRIORITY fields
  item_ids?: string[];
  priority_rank?: number;
  priority_bucket?: 'P0' | 'P1' | 'P2';
  
  // ACCEPT_RISK fields
  risk_id?: string;
  acceptance_until?: string;
  threshold?: string;
  escalation_trigger?: string;
  
  // MITIGATE_RISK fields
  action?: string;
  expected_probability_delta?: number;
  expected_impact_days_delta?: number;
  due_date?: string;
}

export interface Risk {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  probability: number;
  impact: Record<string, any>;
  milestone_id: string;
  affected_items: string[];
  detected_at: string;
  mitigated_at?: string;
}

export interface Milestone {
  id: string;
  name: string;
  description: string;
  target_date: string;
  work_items: string[];
  status: string;
}

export interface WorkItem {
  id: string;
  title: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'blocked' | 'completed';
  estimated_days: number;
  actual_days?: number;
  assigned_to: string[];
  dependencies: string[];
  start_date?: string;
  end_date?: string;
  milestone_id?: string;
  tags?: string[];
}

export interface Actor {
  id: string;
  type: 'USER' | 'TEAM';
  display_name: string;
  title?: string;
  email?: string;
  external_ref?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Ownership {
  id: string;
  object_type: 'risk' | 'decision' | 'change' | 'milestone' | 'work_item';
  object_id: string;
  owner_actor_id: string;
  assigned_at: string;
  ended_at?: string;
  assigned_by_actor_id?: string;
  reason?: string;
}

export interface Role {
  id: string;
  name: 'ADMIN' | 'EDITOR' | 'VIEWER' | 'APPROVER';
  description?: string;
  created_at: string;
}

export interface ActorRole {
  actor_id: string;
  role_id: string;
  scope_type: 'GLOBAL' | 'MILESTONE' | 'TEAM';
  scope_id?: string;
  created_at: string;
}

export interface Resource {
  name: string;
}

// ============================================================================
// Forecast API
// ============================================================================

export async function getForecast(request: ForecastRequest): Promise<ForecastResult[]> {
  const response = await fetch(`${API_BASE_URL}/forecast`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Forecast API error: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// Decisions API
// ============================================================================

export async function createDecision(decision: Decision): Promise<Decision> {
  try {
    const response = await fetch(`${API_BASE_URL}/decisions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(decision),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.detail || response.statusText;
      throw new Error(`Decision API error: ${errorMessage}`);
    }

    return response.json();
  } catch (error: any) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('Failed to connect to backend server. Please make sure the backend is running on http://localhost:8000');
    }
    throw error;
  }
}

export async function listDecisions(): Promise<Decision[]> {
  const response = await fetch(`${API_BASE_URL}/decisions`);

  if (!response.ok) {
    throw new Error(`Decision API error: ${response.statusText}`);
  }

  return response.json();
}

export async function getDecision(decisionId: string): Promise<Decision> {
  const response = await fetch(`${API_BASE_URL}/decisions/${decisionId}`);

  if (!response.ok) {
    throw new Error(`Decision API error: ${response.statusText}`);
  }

  return response.json();
}

export async function updateDecision(decisionId: string, decision: Decision): Promise<Decision> {
  const response = await fetch(`${API_BASE_URL}/decisions/${decisionId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(decision),
  });

  if (!response.ok) {
    throw new Error(`Decision API error: ${response.statusText}`);
  }

  return response.json();
}

export async function deleteDecision(decisionId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/decisions/${decisionId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Decision API error: ${response.statusText}`);
  }
}

export async function analyzeDecision(decision: Decision): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/decisions/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(decision),
  });

  if (!response.ok) {
    throw new Error(`Decision analysis error: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// Risks API
// ============================================================================

export async function createRisk(risk: Risk): Promise<Risk> {
  const response = await fetch(`${API_BASE_URL}/risks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(risk),
  });

  if (!response.ok) {
    throw new Error(`Risk API error: ${response.statusText}`);
  }

  return response.json();
}

export async function listRisks(): Promise<Risk[]> {
  const response = await fetch(`${API_BASE_URL}/risks`);

  if (!response.ok) {
    throw new Error(`Risk API error: ${response.statusText}`);
  }

  return response.json();
}

export async function getRisk(riskId: string): Promise<Risk> {
  const response = await fetch(`${API_BASE_URL}/risks/${riskId}`);

  if (!response.ok) {
    throw new Error(`Risk API error: ${response.statusText}`);
  }

  return response.json();
}

export async function updateRisk(riskId: string, risk: Risk): Promise<Risk> {
  const response = await fetch(`${API_BASE_URL}/risks/${riskId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(risk),
  });

  if (!response.ok) {
    throw new Error(`Risk API error: ${response.statusText}`);
  }

  return response.json();
}

export async function deleteRisk(riskId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/risks/${riskId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Risk API error: ${response.statusText}`);
  }
}

export async function analyzeRisk(risk: Risk): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/risks/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(risk),
  });

  if (!response.ok) {
    throw new Error(`Risk analysis error: ${response.statusText}`);
  }

  return response.json();
}

export async function detectRisks(): Promise<Risk[]> {
  const response = await fetch(`${API_BASE_URL}/risks/detect`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Risk detection error: ${response.statusText}`);
  }

  return response.json();
}

export async function previewRiskDetection(): Promise<Risk[]> {
  const response = await fetch(`${API_BASE_URL}/risks/detect/preview`);

  if (!response.ok) {
    throw new Error(`Risk detection error: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// Milestones API
// ============================================================================

export async function listMilestones(): Promise<Milestone[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/milestones`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.detail || response.statusText;
      throw new Error(`Milestones API error: ${errorMessage}`);
    }

    return response.json();
  } catch (error: any) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('Failed to connect to backend server. Please make sure the backend is running on http://localhost:8000');
    }
    throw error;
  }
}

export async function getMilestone(milestoneId: string): Promise<Milestone> {
  const response = await fetch(`${API_BASE_URL}/milestones/${milestoneId}`);

  if (!response.ok) {
    throw new Error(`Milestone API error: ${response.statusText}`);
  }

  return response.json();
}

export async function createMilestone(milestone: Milestone): Promise<Milestone> {
  const response = await fetch(`${API_BASE_URL}/milestones`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(milestone),
  });

  if (!response.ok) {
    throw new Error(`Milestone API error: ${response.statusText}`);
  }

  return response.json();
}

export async function updateMilestone(milestoneId: string, milestone: Milestone): Promise<Milestone> {
  const response = await fetch(`${API_BASE_URL}/milestones/${milestoneId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(milestone),
  });

  if (!response.ok) {
    throw new Error(`Milestone API error: ${response.statusText}`);
  }

  return response.json();
}

export async function deleteMilestone(milestoneId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/milestones/${milestoneId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Milestone API error: ${response.statusText}`);
  }
}

// ============================================================================
// Work Items API
// ============================================================================

export async function listWorkItems(): Promise<WorkItem[]> {
  const response = await fetch(`${API_BASE_URL}/work_items`);

  if (!response.ok) {
    throw new Error(`Work Items API error: ${response.statusText}`);
  }

  return response.json();
}

export async function getWorkItem(workItemId: string): Promise<WorkItem> {
  const response = await fetch(`${API_BASE_URL}/work_items/${workItemId}`);

  if (!response.ok) {
    throw new Error(`Work Item API error: ${response.statusText}`);
  }

  return response.json();
}

export async function createWorkItem(workItem: WorkItem): Promise<WorkItem> {
  const response = await fetch(`${API_BASE_URL}/work_items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(workItem),
  });

  if (!response.ok) {
    throw new Error(`Work Item API error: ${response.statusText}`);
  }

  return response.json();
}

export interface WorkItemUpdateResponse extends WorkItem {
  _metadata?: {
    risk_created?: {
      created: boolean;
      updated: boolean;
      risk_id: string;
      blocked_item_name: string;
      dependent_count: number;
      milestone_id?: string;
      milestone_name?: string;
    };
  };
}

export async function updateWorkItem(workItemId: string, workItem: Partial<WorkItem> & { id: string }): Promise<WorkItemUpdateResponse> {
  const response = await fetch(`${API_BASE_URL}/work_items/${workItemId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(workItem),
  });

  if (!response.ok) {
    throw new Error(`Work Item API error: ${response.statusText}`);
  }

  return response.json();
}

export async function deleteWorkItem(workItemId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/work_items/${workItemId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Work Item API error: ${response.statusText}`);
  }
}

// ============================================================================
// Actors API
// ============================================================================

export async function listActors(): Promise<Actor[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/actors`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.detail || response.statusText;
      throw new Error(`Actors API error: ${errorMessage}`);
    }

    return response.json();
  } catch (error: any) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('Failed to connect to backend server. Please make sure the backend is running on http://localhost:8000');
    }
    throw error;
  }
}

export async function getActor(actorId: string): Promise<Actor> {
  const response = await fetch(`${API_BASE_URL}/actors/${actorId}`);

  if (!response.ok) {
    throw new Error(`Actor API error: ${response.statusText}`);
  }

  return response.json();
}

export async function createActor(actor: Actor): Promise<Actor> {
  const response = await fetch(`${API_BASE_URL}/actors`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(actor),
  });

  if (!response.ok) {
    throw new Error(`Actor API error: ${response.statusText}`);
  }

  return response.json();
}

export async function updateActor(actorId: string, actor: Actor): Promise<Actor> {
  const response = await fetch(`${API_BASE_URL}/actors/${actorId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(actor),
  });

  if (!response.ok) {
    throw new Error(`Actor API error: ${response.statusText}`);
  }

  return response.json();
}

export async function deleteActor(actorId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/actors/${actorId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Actor API error: ${response.statusText}`);
  }
}

// ============================================================================
// Ownership API
// ============================================================================

export async function listOwnership(): Promise<Ownership[]> {
  const response = await fetch(`${API_BASE_URL}/ownership`);

  if (!response.ok) {
    throw new Error(`Ownership API error: ${response.statusText}`);
  }

  return response.json();
}

export async function getOwnership(ownershipId: string): Promise<Ownership> {
  const response = await fetch(`${API_BASE_URL}/ownership/${ownershipId}`);

  if (!response.ok) {
    throw new Error(`Ownership API error: ${response.statusText}`);
  }

  return response.json();
}

export async function getActiveOwnership(objectType: string, objectId: string): Promise<Ownership> {
  const response = await fetch(`${API_BASE_URL}/ownership/object/${objectType}/${objectId}`);

  if (!response.ok) {
    throw new Error(`Ownership API error: ${response.statusText}`);
  }

  return response.json();
}

export async function createOwnership(ownership: Ownership): Promise<Ownership> {
  try {
    const response = await fetch(`${API_BASE_URL}/ownership`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ownership),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.detail || response.statusText;
      throw new Error(`Ownership API error: ${errorMessage}`);
    }

    return response.json();
  } catch (error: any) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('Failed to connect to backend server. Please make sure the backend is running on http://localhost:8000');
    }
    throw error;
  }
}

export async function updateOwnership(ownershipId: string, ownership: Ownership): Promise<Ownership> {
  const response = await fetch(`${API_BASE_URL}/ownership/${ownershipId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(ownership),
  });

  if (!response.ok) {
    throw new Error(`Ownership API error: ${response.statusText}`);
  }

  return response.json();
}

export async function deleteOwnership(ownershipId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/ownership/${ownershipId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Ownership API error: ${response.statusText}`);
  }
}

// ============================================================================
// Roles API
// ============================================================================

export async function listRoles(): Promise<Role[]> {
  const response = await fetch(`${API_BASE_URL}/roles`);

  if (!response.ok) {
    throw new Error(`Roles API error: ${response.statusText}`);
  }

  return response.json();
}

export async function getRole(roleId: string): Promise<Role> {
  const response = await fetch(`${API_BASE_URL}/roles/${roleId}`);

  if (!response.ok) {
    throw new Error(`Role API error: ${response.statusText}`);
  }

  return response.json();
}

// Role creation, update, and deletion functions have been removed.
// The system now uses four fixed roles: ADMIN, VIEWER, APPROVER, EDITOR.
// Only role assignments can be managed through the ActorRole functions below.

// ============================================================================
// Actor Roles API
// ============================================================================

export async function listActorRoles(): Promise<ActorRole[]> {
  const response = await fetch(`${API_BASE_URL}/actor_roles`);

  if (!response.ok) {
    throw new Error(`Actor Roles API error: ${response.statusText}`);
  }

  return response.json();
}

export async function getActorRolesByActor(actorId: string): Promise<ActorRole[]> {
  const response = await fetch(`${API_BASE_URL}/actor_roles/actor/${actorId}`);

  if (!response.ok) {
    throw new Error(`Actor Roles API error: ${response.statusText}`);
  }

  return response.json();
}

export async function createActorRole(actorRole: ActorRole): Promise<ActorRole> {
  const response = await fetch(`${API_BASE_URL}/actor_roles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(actorRole),
  });

  if (!response.ok) {
    throw new Error(`Actor Role API error: ${response.statusText}`);
  }

  return response.json();
}

export async function deleteActorRole(
  actorId: string,
  roleId: string,
  scopeType: string,
  scopeId?: string
): Promise<void> {
  const params = new URLSearchParams({
    actor_id: actorId,
    role_id: roleId,
    scope_type: scopeType,
  });
  if (scopeId) {
    params.append('scope_id', scopeId);
  }

  const response = await fetch(`${API_BASE_URL}/actor_roles?${params.toString()}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Actor Role API error: ${response.statusText}`);
  }
}

// ============================================================================
// Resources API (DEPRECATED - use Actors instead)
// ============================================================================

export async function listResources(): Promise<Resource[]> {
  const response = await fetch(`${API_BASE_URL}/resources`);

  if (!response.ok) {
    throw new Error(`Resources API error: ${response.statusText}`);
  }

  return response.json();
}
