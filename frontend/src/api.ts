import type { ApiMetaStatus, AnalysisResponse, DecisionInput, ClarificationReport } from './types';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let detail = `Request failed with HTTP ${response.status}`;
    try {
      const body = await response.json();
      if (typeof body.detail === 'string') detail = body.detail;
      else if (Array.isArray(body.detail)) detail = body.detail.map((item: { msg?: string }) => item.msg || 'Invalid input').join('; ');
    } catch { /* Keep generic status. */ }
    throw new Error(detail);
  }
  return response.json() as Promise<T>;
}

export async function getMetaStatus(): Promise<ApiMetaStatus> {
  return parseResponse<ApiMetaStatus>(await fetch(`${API_BASE}/api/meta-status`));
}

export async function analyzeDecision(input: DecisionInput): Promise<AnalysisResponse> {
  return parseResponse<AnalysisResponse>(await fetch(`${API_BASE}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  }));
}

export async function getClarificationReport(input: DecisionInput): Promise<ClarificationReport> {
  return parseResponse<ClarificationReport>(await fetch(`${API_BASE}/api/clarify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  }));
}


export async function recalculateConstraints(
  base_request: DecisionInput,
  overrides: Record<string, unknown>
): Promise<import('./types').RecalculateResponse> {
  return parseResponse<import('./types').RecalculateResponse>(
    await fetch(`${API_BASE}/api/recalculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base_request, overrides }),
    })
  );
}


export async function registerUserAccount(email: string, token: string): Promise<{ status: string; user: { id: string; email: string } }> {
  return parseResponse(await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, token }),
  }));
}

export async function getCurrentUser(token: string): Promise<{ user: { id: string; email: string; created_at: string } }> {
  return parseResponse(await fetch(`${API_BASE}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  }));
}

export async function saveDecision(
  token: string,
  input_data: DecisionInput,
  analysis_data: AnalysisResponse,
): Promise<{ id: string; title: string; latest_version: number }> {
  return parseResponse(await fetch(`${API_BASE}/api/decisions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ input_data, analysis_data }),
  }));
}

export async function addDecisionRevision(
  token: string,
  decisionId: string,
  input_data: DecisionInput,
  analysis_data: AnalysisResponse,
): Promise<{ decision_id: string; revision_id: string; version_number: number }> {
  return parseResponse(await fetch(`${API_BASE}/api/decisions/${decisionId}/revisions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ input_data, analysis_data }),
  }));
}

export async function listDecisions(token: string): Promise<{ decisions: import('./types').SavedDecisionSummary[] }> {
  return parseResponse(await fetch(`${API_BASE}/api/decisions`, {
    headers: { Authorization: `Bearer ${token}` },
  }));
}

export async function getDecision(token: string, decisionId: string): Promise<import('./types').SavedDecisionDetail> {
  return parseResponse(await fetch(`${API_BASE}/api/decisions/${decisionId}`, {
    headers: { Authorization: `Bearer ${token}` },
  }));
}

export async function deleteDecision(token: string, decisionId: string): Promise<{ status: string }> {
  return parseResponse(await fetch(`${API_BASE}/api/decisions/${decisionId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  }));
}

export async function exportAllUserData(token: string): Promise<Record<string, unknown>> {
  return parseResponse(await fetch(`${API_BASE}/api/privacy/export`, {
    headers: { Authorization: `Bearer ${token}` },
  }));
}

export async function purgeAccount(token: string): Promise<{ status: string; message: string }> {
  return parseResponse(await fetch(`${API_BASE}/api/privacy/account`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  }));
}
