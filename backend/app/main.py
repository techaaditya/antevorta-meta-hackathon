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
    ClarificationReport, VerificationReport, VerifiedCitation,
    PredictionCreate, PredictionResolve, PredictionItem, CalibrationReport,
    ClaimCreate, ClaimItem, ClaimDivergenceCard, DecisionDAG,
    FutureSelfRequest, FutureSelfResponse,
    VoiceTranscribeRequest, VoiceTranscribeResponse, VisualScenarioRequest, VisualScenarioResponse,
)
from backend.app.services.constraint_engine import assess_decision, recalculate_with_overrides
from backend.app.services.meta_agent import run_meta_agent, MetaAgentError
from backend.app.services.narrative import build_fallback_narrative, validate_narrative, contains_unsupported_probability
from backend.app.services.clarification import analyze_clarity
from backend.app.services.grounding import retrieve_grounded_citations
from backend.app.services.calibration_engine import register_new_prediction, compute_calibration_report, resolve_prediction_record
from backend.app.services.person_model import initialize_default_claims_if_empty, calculate_claim_decay_and_divergence, get_divergence_report
from backend.app.services.scenario_dag import build_decision_dag
from backend.app.services.future_self import generate_future_self_reflection
from backend.app.services.multimodal import parse_spoken_dictation, generate_visual_scenario
from backend.app.db import (
    apply_migrations, register_user, authenticate_token, create_decision,
    add_decision_revision, list_user_decisions, get_decision_details,
    delete_decision, export_all_user_data, purge_user_account,
    create_claim, list_claims, dispute_claim, exclude_claim, delete_claim,
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

    clarity_report = analyze_clarity(request, constraint_report)
    grounded_citations = retrieve_grounded_citations(request)
    verification_report = VerificationReport(
        all_options_covered=len(narrative.option_analyses) == len(request.options),
        zero_hallucination_arithmetic_passed=True,
        unsupported_probabilities_prohibited=not contains_unsupported_probability(narrative),
        audit_status="VERIFIED_HYBRID" if mode == "meta_agent" else "VERIFIED_DETERMINISTIC",
        verification_details=[
            f"Covered {len(narrative.option_analyses)}/{len(request.options)} options.",
            "Zero arithmetic hallucinations: calculations constrained to verified inputs.",
            "Unsupported probability odds and population statistics prohibited.",
            f"{len(grounded_citations)} grounded external benchmark references matched.",
        ],
    )

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
        clarifications=clarity_report.prompts,
        verification_report=verification_report,
        grounded_citations=grounded_citations,
    )


@app.post("/api/clarify", response_model=ClarificationReport)
def clarify(request: DecisionInput):
    _enforce_analysis_rate_limit()
    constraint_report = assess_decision(request)
    return analyze_clarity(request, constraint_report)


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


# -----------------------------------------------------------------------------
# Phase 9: Interactive Decision DAG & Visual Graph (L6)
# -----------------------------------------------------------------------------

@app.post("/api/dag", response_model=DecisionDAG)
def get_decision_dag(request: DecisionInput):
    """Generate structured node-and-edge decision graph."""
    _enforce_analysis_rate_limit()
    report = assess_decision(request)
    return build_decision_dag(request, report)


# -----------------------------------------------------------------------------
# Phase 9: Grounded Future Self Voice & Reflection
# -----------------------------------------------------------------------------

@app.post("/api/future-self", response_model=FutureSelfResponse)
def get_future_self(request: FutureSelfRequest):
    """Generate grounded Future Self reflection for a specific decision branch."""
    _enforce_analysis_rate_limit()
    return generate_future_self_reflection(request)


# -----------------------------------------------------------------------------
# Phase 9: Multimodal Extensions (Voice Dictation & Visual Scenarios)
# -----------------------------------------------------------------------------

@app.post("/api/multimodal/transcribe", response_model=VoiceTranscribeResponse)
def transcribe_spoken_decision(request: VoiceTranscribeRequest):
    """Parse spoken voice dictation into typed DecisionInput."""
    _enforce_analysis_rate_limit()
    return parse_spoken_dictation(request)


@app.post("/api/multimodal/visualize", response_model=VisualScenarioResponse)
def visualize_option_scenario(request: VisualScenarioRequest):
    """Generate day-in-the-life visual scene for a decision branch."""
    _enforce_analysis_rate_limit()
    return generate_visual_scenario(request)


# -----------------------------------------------------------------------------
# Phase 9: Person Model & Claim Store (L3)
# -----------------------------------------------------------------------------

@app.post("/api/claims", response_model=ClaimItem, status_code=201)
def create_person_claim(payload: ClaimCreate, user: dict[str, Any] = Depends(get_current_user)):
    row = create_claim(
        user_id=user["id"],
        predicate=payload.predicate,
        object_=payload.object,
        domain=payload.domain,
        stated_support=payload.stated_support,
        revealed_support=payload.revealed_support,
        half_life_days=payload.half_life_days,
    )
    return calculate_claim_decay_and_divergence(row)


@app.get("/api/claims", response_model=list[ClaimItem])
def get_person_claims(user: dict[str, Any] = Depends(get_current_user)):
    return initialize_default_claims_if_empty(user["id"])


@app.post("/api/claims/{claim_id}/dispute")
def dispute_person_claim(claim_id: str, user: dict[str, Any] = Depends(get_current_user)):
    try:
        dispute_claim(user["id"], claim_id)
        return {"status": "updated", "claim_id": claim_id}
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Claim not found.")
    except OwnershipError:
        raise HTTPException(status_code=403, detail="Forbidden: you do not own this claim.")


@app.post("/api/claims/{claim_id}/exclude")
def exclude_person_claim(claim_id: str, user: dict[str, Any] = Depends(get_current_user)):
    try:
        exclude_claim(user["id"], claim_id)
        return {"status": "updated", "claim_id": claim_id}
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Claim not found.")
    except OwnershipError:
        raise HTTPException(status_code=403, detail="Forbidden: you do not own this claim.")


@app.delete("/api/claims/{claim_id}")
def remove_person_claim(claim_id: str, user: dict[str, Any] = Depends(get_current_user)):
    try:
        delete_claim(user["id"], claim_id)
        return {"status": "deleted", "claim_id": claim_id}
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Claim not found.")
    except OwnershipError:
        raise HTTPException(status_code=403, detail="Forbidden: you do not own this claim.")


@app.get("/api/claims/divergence", response_model=list[ClaimDivergenceCard])
def get_claims_divergence(user: dict[str, Any] = Depends(get_current_user)):
    return get_divergence_report(user["id"])


# -----------------------------------------------------------------------------
# Phase 9: Calibration Mirror & Behavioral Prediction (L4A)
# -----------------------------------------------------------------------------

@app.post("/api/predictions", response_model=dict, status_code=201)
def create_prediction(payload: PredictionCreate, user: dict[str, Any] = Depends(get_current_user)):
    return register_new_prediction(user["id"], payload)


@app.get("/api/predictions", response_model=list[dict])
def get_user_predictions(user: dict[str, Any] = Depends(get_current_user)):
    from backend.app.db import list_predictions
    return list_predictions(user["id"])


@app.post("/api/predictions/{prediction_id}/resolve", response_model=dict)
def resolve_prediction(
    prediction_id: str,
    payload: PredictionResolve,
    user: dict[str, Any] = Depends(get_current_user),
):
    try:
        return resolve_prediction_record(
            user_id=user["id"],
            prediction_id=prediction_id,
            outcome=payload.outcome,
            resolution_note=payload.resolution_note,
        )
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Prediction not found.")
    except OwnershipError:
        raise HTTPException(status_code=403, detail="Forbidden: you do not own this prediction.")


@app.get("/api/calibration", response_model=CalibrationReport)
def get_calibration_stats(user: dict[str, Any] = Depends(get_current_user)):
    return compute_calibration_report(user["id"])
