from __future__ import annotations
from datetime import datetime, timezone
from collections import deque
from threading import Lock
from time import monotonic
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from backend.app.config import CORS_ORIGINS, MODEL_API_KEY, META_MODEL_ID, APP_ENV, MAX_ANALYSES_PER_MINUTE
from backend.app.schemas import AnalysisResponse, DecisionInput, ToolTraceItem
from backend.app.services.constraint_engine import assess_decision
from backend.app.services.meta_agent import run_meta_agent, MetaAgentError
from backend.app.services.narrative import build_fallback_narrative, validate_narrative

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("antevorta")
_analysis_timestamps: deque[float] = deque()
_analysis_rate_lock = Lock()
_RATE_WINDOW_SECONDS = 60.0

def _enforce_analysis_rate_limit() -> None:
    now = monotonic()
    with _analysis_rate_lock:
        while _analysis_timestamps and _analysis_timestamps[0] <= now - _RATE_WINDOW_SECONDS:
            _analysis_timestamps.popleft()
        if len(_analysis_timestamps) >= MAX_ANALYSES_PER_MINUTE:
            raise HTTPException(status_code=429, detail="Analysis rate limit reached. Please wait a minute before trying again.")
        _analysis_timestamps.append(now)

app = FastAPI(title="Antevorta Decision Stress Test API", version="0.1.0", docs_url="/docs" if APP_ENV != "production" else None)
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_credentials=False, allow_methods=["GET", "POST", "OPTIONS"], allow_headers=["Content-Type"])


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "service": "antevorta-api", "environment": APP_ENV}


@app.get("/api/meta-status")
def meta_status() -> dict:
    return {"configured": bool(MODEL_API_KEY), "model_id": META_MODEL_ID if MODEL_API_KEY else None,
            "message": "A server-side model key is configured." if MODEL_API_KEY else "Meta API key is not configured; deterministic fallback remains available."}


@app.post("/api/analyze", response_model=AnalysisResponse)
def analyze(request: DecisionInput):
    _enforce_analysis_rate_limit()
    constraint_report = assess_decision(request)
    now = datetime.now(timezone.utc).isoformat()
    trace: list[ToolTraceItem] = [ToolTraceItem(tool="deterministic_constraint_engine", status="completed", detail="Computed from supplied inputs; missing values remain unknown.")]
    mode = "deterministic_fallback"
    model_id = None
    provider_status = "Meta API not configured; deterministic fallback returned."
    verifier_status = "fallback"
    narrative = None

    if MODEL_API_KEY:
        try:
            candidate, agent_trace, provider_status = run_meta_agent(request, constraint_report)
            ok, reason = validate_narrative(candidate, request, constraint_report)
            if not ok:
                raise MetaAgentError(f"Narrative verifier rejected the output: {reason}")
            narrative = candidate
            trace.extend(agent_trace)
            mode = "meta_agent"
            model_id = META_MODEL_ID
            verifier_status = "passed"
        except MetaAgentError as exc:
            # Log only the safe summary. Do not log prompts, user data or credentials.
            logger.warning("Meta agent fallback: %s", str(exc))
            provider_status = f"Meta agent unavailable or invalid; deterministic fallback used ({str(exc)[:160]})."
            trace.append(ToolTraceItem(tool="meta_agent", status="failed", detail="A validated tool-assisted response was not completed; fallback used."))
        except Exception as exc:
            logger.error("Unexpected analysis failure (type=%s)", type(exc).__name__)
            provider_status = "Meta agent error; deterministic fallback used."
            trace.append(ToolTraceItem(tool="meta_agent", status="failed", detail=f"Unexpected error ({type(exc).__name__}); fallback used."))

    if narrative is None:
        narrative = build_fallback_narrative(request, constraint_report)
        trace.append(ToolTraceItem(tool="deterministic_fallback_narrative", status="completed", detail="Clearly labelled fallback; no claim that Meta generated this narrative."))

    return AnalysisResponse(
        generated_at=now, analysis_mode=mode, model_id=model_id, provider_status=provider_status,
        question=request.question, constraints=constraint_report, narrative=narrative,
        tool_trace=trace, verifier_status=verifier_status,
    )
