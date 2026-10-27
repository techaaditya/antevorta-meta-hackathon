import type { ApiMetaStatus, AnalysisResponse, DecisionInput } from './types';

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
