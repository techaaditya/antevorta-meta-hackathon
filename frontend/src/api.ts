import type {
  ApiMetaStatus, AnalysisResponse, DecisionInput, ClarificationReport,
  DecisionDAG, FutureSelfResponse, VoiceTranscribeResponse, VisualScenarioResponse,
  ClaimItem, ClaimDivergenceCard, PredictionItem, CalibrationReport,
} from './types';

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

// -----------------------------------------------------------------------------
// Phase 9 API Methods
// -----------------------------------------------------------------------------

export async function getDecisionDAG(input: DecisionInput): Promise<DecisionDAG> {
  return parseResponse<DecisionDAG>(await fetch(`${API_BASE}/api/dag`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  }));
}

export async function getFutureSelfReflection(
  option_id: string,
  decision: DecisionInput,
  time_horizon_years: number = 3,
): Promise<FutureSelfResponse> {
  return parseResponse<FutureSelfResponse>(await fetch(`${API_BASE}/api/future-self`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ option_id, decision, time_horizon_years, tone: 'reflective' }),
  }));
}

export async function transcribeVoiceDecision(audio_text: string): Promise<VoiceTranscribeResponse> {
  return parseResponse<VoiceTranscribeResponse>(await fetch(`${API_BASE}/api/multimodal/transcribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audio_text }),
  }));
}

export async function visualizeOptionScenario(
  option_id: string,
  option_name: string,
  description: string,
  horizon_months: number = 12,
): Promise<VisualScenarioResponse> {
  return parseResponse<VisualScenarioResponse>(await fetch(`${API_BASE}/api/multimodal/visualize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ option_id, option_name, description, horizon_months }),
  }));
}

export async function listClaims(token: string): Promise<ClaimItem[]> {
  return parseResponse<ClaimItem[]>(await fetch(`${API_BASE}/api/claims`, {
    headers: { Authorization: `Bearer ${token}` },
  }));
}

export async function createClaim(
  token: string,
  payload: { predicate: string; object: string; domain: string; stated_support: number; revealed_support: number },
): Promise<ClaimItem> {
  return parseResponse<ClaimItem>(await fetch(`${API_BASE}/api/claims`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  }));
}

export async function disputeClaim(token: string, claimId: string): Promise<{ status: string }> {
  return parseResponse(await fetch(`${API_BASE}/api/claims/${claimId}/dispute`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  }));
}

export async function excludeClaim(token: string, claimId: string): Promise<{ status: string }> {
  return parseResponse(await fetch(`${API_BASE}/api/claims/${claimId}/exclude`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  }));
}

export async function getClaimsDivergence(token: string): Promise<ClaimDivergenceCard[]> {
  return parseResponse<ClaimDivergenceCard[]>(await fetch(`${API_BASE}/api/claims/divergence`, {
    headers: { Authorization: `Bearer ${token}` },
  }));
}

export async function listPredictions(token: string): Promise<PredictionItem[]> {
  return parseResponse<PredictionItem[]>(await fetch(`${API_BASE}/api/predictions`, {
    headers: { Authorization: `Bearer ${token}` },
  }));
}

export async function createPrediction(
  token: string,
  payload: { statement: string; resolution_criteria: string; domain: string; horizon_days: number; due_at: string; decision_id?: string },
): Promise<PredictionItem> {
  return parseResponse<PredictionItem>(await fetch(`${API_BASE}/api/predictions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  }));
}

export async function resolvePrediction(
  token: string,
  predictionId: string,
  outcome: boolean,
  resolution_note: string = '',
): Promise<{ resolved: boolean }> {
  return parseResponse(await fetch(`${API_BASE}/api/predictions/${predictionId}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ outcome, resolution_note }),
  }));
}

export async function getCalibrationReport(token: string): Promise<CalibrationReport> {
  return parseResponse<CalibrationReport>(await fetch(`${API_BASE}/api/calibration`, {
    headers: { Authorization: `Bearer ${token}` },
  }));
}
