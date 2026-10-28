from __future__ import annotations
from datetime import datetime, timezone
from collections import deque
from threading import Lock
from time import monotonic
import logging
from typing import Any
from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware

from backend.app.config import (
    CORS_ORIGINS, MODEL_API_KEY, META_MODEL_ID, APP_ENV, MAX_ANALYSES_PER_MINUTE,
)
from backend.app.schemas import (
    AnalysisResponse, DecisionInput, ToolTraceItem, RecalculateRequest, RecalculateResponse,
    RegisterUserRequest, SaveDecisionRequest, AddRevisionRequest,
)
from backend.app.services.constraint_engine import assess_decision, recalculate_with_overrides
from backend.app.services.meta_agent import run_meta_agent, MetaAgentError
from backend.app.services.narrative import build_fallback_narrative, validate_narrative
from backend.app.db import (
    apply_migrations, register_user, authenticate_token, create_decision,
    add_decision_revision, list_user_decisions, get_decision_details,
    delete_decision, export_all_user_data, purge_user_account,
    NotFoundError, OwnershipError, DatabaseError,
)

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


from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        count = apply_migrations()
        logger.info("Database migrations applied: %d new migration(s)", count)
    except Exception as exc:
        logger.error("Failed to initialize database: %s", type(exc).__name__)
    yield


app = FastAPI(
    title="Antevorta Decision Stress Test API",
    version="0.1.0",
    docs_url="/docs" if APP_ENV != "production" else None,
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


def get_current_user(authorization: str | None = Header(None)) -> dict[str, Any]:
    """Extract and authenticate Bearer token from request."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required. Provide 'Authorization: Bearer <token>' header.")
    token = authorization.split("Bearer ", 1)[1].strip()
    user = authenticate_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")
    return user


# -----------------------------------------------------------------------------
# Core Decision Stress Test Endpoints (Stateless & Fallback Capable)
# -----------------------------------------------------------------------------

@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "service": "antevorta-api", "environment": APP_ENV}


@app.get("/api/meta-status")
def meta_status() -> dict:
    return {
        "configured": bool(MODEL_API_KEY),
        "model_id": META_MODEL_ID if MODEL_API_KEY else None,
        "message": (
            "A server-side model key is configured."
            if MODEL_API_KEY
            else "Meta API key is not configured; deterministic fallback remains available."
        ),
    }


@app.post("/api/analyze", response_model=AnalysisResponse)
def analyze(request: DecisionInput):
    _enforce_analysis_rate_limit()
    constraint_report = assess_decision(request)
    now = datetime.now(timezone.utc).isoformat()
    trace: list[ToolTraceItem] = [
        ToolTraceItem(
            tool="deterministic_constraint_engine",
            status="completed",
            detail="Computed from supplied inputs; missing values remain unknown.",
        )
    ]
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
            # Safe summary logging only; do not expose prompts or keys
            logger.warning("Meta agent fallback: %s", str(exc))
            provider_status = f"Meta agent unavailable or invalid; deterministic fallback used ({str(exc)[:160]})."
            trace.append(ToolTraceItem(tool="meta_agent", status="failed", detail="A validated tool-assisted response was not completed; fallback used."))
        except Exception as exc:
            logger.error("Unexpected analysis failure (type=%s)", type(exc).__name__)
            provider_status = "Meta agent error; deterministic fallback used."
            trace.append(ToolTraceItem(tool="meta_agent", status="failed", detail=f"Unexpected error ({type(exc).__name__}); fallback used."))

    if narrative is None:
        narrative = build_fallback_narrative(request, constraint_report)
        trace.append(ToolTraceItem(
            tool="deterministic_fallback_narrative",
            status="completed",
            detail="Clearly labelled fallback; no claim that Meta generated this narrative.",
        ))

    return AnalysisResponse(
        generated_at=now,
        analysis_mode=mode,
        model_id=model_id,
        provider_status=provider_status,
        question=request.question,
        constraints=constraint_report,
        narrative=narrative,
        tool_trace=trace,
        verifier_status=verifier_status,
    )


@app.post("/api/recalculate", response_model=RecalculateResponse)
def recalculate(payload: RecalculateRequest):
    _enforce_analysis_rate_limit()
    try:
        updated_report, diff = recalculate_with_overrides(payload.base_request, payload.overrides)
        return RecalculateResponse(updated_constraints=updated_report, diff=diff)
    except Exception as exc:
        logger.warning("Recalculation error: %s", str(exc))
        raise HTTPException(status_code=422, detail=f"Recalculation error: {str(exc)}")


# -----------------------------------------------------------------------------
# Phase 5: Persistence, Decision History, Ownership & Privacy Endpoints
# -----------------------------------------------------------------------------

@app.post("/api/auth/register", status_code=201)
def register(payload: RegisterUserRequest):
    try:
        user = register_user(payload.email, payload.token)
        return {"status": "created", "user": user}
    except DatabaseError as exc:
        raise HTTPException(status_code=409, detail=str(exc))


@app.get("/api/auth/me")
def get_me(user: dict[str, Any] = Depends(get_current_user)):
    return {"user": user}


@app.post("/api/decisions", status_code=201)
def save_decision(payload: SaveDecisionRequest, user: dict[str, Any] = Depends(get_current_user)):
    try:
        result = create_decision(user["id"], payload.input_data, payload.analysis_data)
        return result
    except Exception as exc:
        logger.warning("Failed to save decision: %s", str(exc))
        raise HTTPException(status_code=500, detail="Failed to save decision.")


@app.get("/api/decisions")
def list_decisions(user: dict[str, Any] = Depends(get_current_user)):
    return {"decisions": list_user_decisions(user["id"])}


@app.get("/api/decisions/{decision_id}")
def get_decision(decision_id: str, user: dict[str, Any] = Depends(get_current_user)):
    try:
        return get_decision_details(user["id"], decision_id)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Decision not found.")
    except OwnershipError:
        raise HTTPException(status_code=403, detail="Forbidden: you do not own this decision.")


@app.post("/api/decisions/{decision_id}/revisions", status_code=201)
def add_revision(
    decision_id: str,
    payload: AddRevisionRequest,
    user: dict[str, Any] = Depends(get_current_user),
):
    try:
        return add_decision_revision(user["id"], decision_id, payload.input_data, payload.analysis_data)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Decision not found.")
    except OwnershipError:
        raise HTTPException(status_code=403, detail="Forbidden: you do not own this decision.")


@app.delete("/api/decisions/{decision_id}")
def remove_decision(decision_id: str, user: dict[str, Any] = Depends(get_current_user)):
    try:
        delete_decision(user["id"], decision_id)
        return {"status": "deleted", "decision_id": decision_id}
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Decision not found.")
    except OwnershipError:
        raise HTTPException(status_code=403, detail="Forbidden: you do not own this decision.")


@app.get("/api/privacy/export")
def privacy_export(user: dict[str, Any] = Depends(get_current_user)):
    """Export complete decision and version history for the authenticated user."""
    return export_all_user_data(user["id"])


@app.delete("/api/privacy/account")
def purge_account(user: dict[str, Any] = Depends(get_current_user)):
    """Cascade purge user account and all personal decision history."""
    purge_user_account(user["id"])
    return {"status": "purged", "message": "All user data and decision history have been permanently deleted."}
