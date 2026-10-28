from __future__ import annotations

import math
from typing import Any
from backend.app.schemas import PredictionCreate, CalibrationReport, PredictionItem
from backend.app.db import create_prediction_record, list_predictions, resolve_prediction_record

DOMAIN_BASE_RATES: dict[str, float] = {
    "study_prep": 0.58,
    "coding_milestone": 0.52,
    "follow_through": 0.48,
    "schedule_boundary": 0.45,
    "financial_buffer": 0.62,
}


def compute_prediction_probabilities(
    user_id: str,
    domain: str,
    horizon_days: int,
    db_path: str | None = None,
) -> tuple[float, float, float, str]:
    """
    Calculate (p_twin, p_generic, p_baserate, qualitative_band).
    p_twin uses personalized historical follow-through rate and horizon penalty.
    p_generic is the un-personalized demographic prior (0.50).
    p_baserate is the domain reference-class completion rate.
    """
    p_generic = 0.50
    p_baserate = DOMAIN_BASE_RATES.get(domain, 0.50)

    # Check user historical track record
    past = list_predictions(user_id, db_path=db_path)
    resolved_past = [p for p in past if p["resolved"] and p["outcome"] is not None]

    if not resolved_past:
        # Prior with modest conservative discount
        p_twin = round(p_baserate * 0.95, 3)
        band = "still_learning"
    else:
        domain_matches = [p for p in resolved_past if p["domain"] == domain]
        sample = domain_matches if len(domain_matches) >= 3 else resolved_past
        success_rate = sum(1 for p in sample if p["outcome"]) / len(sample)
        # Horizon decay: commitments further out have lower follow-through
        horizon_factor = max(0.75, 1.0 - (horizon_days - 7) * 0.01)
        p_twin = round(max(0.10, min(0.95, success_rate * horizon_factor)), 3)

        if len(resolved_past) < 3:
            band = "still_learning"
        elif p_twin >= 0.65:
            band = "likely"
        elif p_twin <= 0.40:
            band = "unlikely"
        else:
            band = "toss_up"

    return p_twin, p_generic, p_baserate, band


def register_new_prediction(
    user_id: str,
    payload: PredictionCreate,
    db_path: str | None = None,
) -> dict[str, Any]:
    p_twin, p_generic, p_baserate, band = compute_prediction_probabilities(
        user_id=user_id,
        domain=payload.domain,
        horizon_days=payload.horizon_days,
        db_path=db_path,
    )
    return create_prediction_record(
        user_id=user_id,
        statement=payload.statement,
        resolution_criteria=payload.resolution_criteria,
        resolution_source=payload.resolution_source,
        domain=payload.domain,
        horizon_days=payload.horizon_days,
        due_at=payload.due_at,
        p_twin=p_twin,
        p_generic=p_generic,
        p_baserate=p_baserate,
        qualitative_band=band,
        decision_id=payload.decision_id,
        db_path=db_path,
    )


def compute_calibration_report(user_id: str, db_path: str | None = None) -> CalibrationReport:
    """
    Compute Brier Score, Brier Skill Score (BSS), and calibration metrics.
    Brier Score: BS = 1/N * sum((p - y)^2)  (lower is better, 0.0 is perfect).
    Brier Skill Score: BSS = 1 - (BS_twin / BS_generic)  (positive means personal twin beats generic LLM).
    """
    preds = list_predictions(user_id, db_path=db_path)
    resolved = [p for p in preds if p["resolved"] and p["outcome"] is not None]

    items = [PredictionItem(**p) for p in preds]

    if not resolved:
        return CalibrationReport(
            total_predictions=len(preds),
            resolved_predictions=0,
            brier_twin=None,
            brier_generic=None,
            brier_skill_score=None,
            accuracy_rate=None,
            qualitative_status="Insufficient Data",
            interpretation="Make short-horizon commitments (7–28 days) and resolve them to start calibrating your personalized decision twin.",
            predictions=items,
        )

    n = len(resolved)
    bs_twin = sum(p["brier_twin"] for p in resolved if p["brier_twin"] is not None) / n
    bs_generic = sum(p["brier_generic"] for p in resolved if p["brier_generic"] is not None) / n

    bss = 1.0 - (bs_twin / bs_generic) if bs_generic > 0 else 0.0
    accuracy = sum(1 for p in resolved if (p["p_twin"] >= 0.5) == p["outcome"]) / n

    bs_twin_r = round(bs_twin, 4)
    bs_generic_r = round(bs_generic, 4)
    bss_r = round(bss, 4)
    acc_r = round(accuracy * 100, 1)

    if bss_r > 0.05:
        interp = f"Personal Twin beats generic LLM baseline by {bss_r * 100:.1f}% Brier Skill Score! Personal claim history provides statistically measurable predictive calibration."
        status = "Personal Twin Outperforming Generic Baseline"
    elif bss_r >= -0.05:
        interp = "Personal Twin performs on par with generic LLM baseline. Additional resolved milestones will sharpen divergence detection."
        status = "Baseline Parity"
    else:
        interp = "Generic prior currently shows lower variance. Updating your claim ledger and resolving dependencies will improve calibration."
        status = "Recalibrating"

    return CalibrationReport(
        total_predictions=len(preds),
        resolved_predictions=n,
        brier_twin=bs_twin_r,
        brier_generic=bs_generic_r,
        brier_skill_score=bss_r,
        accuracy_rate=acc_r,
        qualitative_status=status,
        interpretation=interp,
        predictions=items,
    )
