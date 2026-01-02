const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

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

export interface Decision {
  id: string;
  decision_type: string;
  target_id: string;
  description: string;
  timestamp: string;
  effects?: Record<string, any>;
}

export interface Risk {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  probability: number;
  impact: Record<string, any>;
  affected_items: string[];
  detected_at: string;
  mitigated_at?: string;
}

// Forecast API
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

// Decisions API
export async function createDecision(decision: Decision): Promise<Decision> {
  const response = await fetch(`${API_BASE_URL}/decisions`, {
    method: 'POST',
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

export async function listDecisions(): Promise<Decision[]> {
  const response = await fetch(`${API_BASE_URL}/decisions`);

  if (!response.ok) {
    throw new Error(`Decision API error: ${response.statusText}`);
  }

  return response.json();
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

// Risks API
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

