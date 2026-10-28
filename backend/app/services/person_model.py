from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Any
from backend.app.schemas import ClaimCreate, ClaimItem, ClaimDivergenceCard
from backend.app.db import create_claim, list_claims, dispute_claim, exclude_claim, delete_claim

DEFAULT_STARTER_CLAIMS = [
    {
        "predicate": "VALUES",
        "object": "Autonomous deep work and research publication",
        "domain": "academics",
        "stated_support": 0.90,
        "revealed_support": 0.55,
        "half_life_days": 365,
    },
    {
        "predicate": "CONSTRAINED_BY",
        "object": "Must maintain at least 6 months of living expenses in reserve",
        "domain": "finances",
        "stated_support": 0.85,
        "revealed_support": 0.70,
        "half_life_days": 180,
    },
    {
        "predicate": "TENDS_TO",
        "object": "Underestimates time required for client contracts by 25%",
        "domain": "planning",
        "stated_support": 0.40,
        "revealed_support": 0.80,
        "half_life_days": 90,
    },
    {
        "predicate": "FEARS",
        "object": "Irreversible career lock-in without academic advancement",
        "domain": "career",
        "stated_support": 0.75,
        "revealed_support": 0.40,
        "half_life_days": 180,
    },
]


def calculate_claim_decay_and_divergence(claim_row: dict[str, Any]) -> ClaimItem:
    """
    Calculate exponential time decay and Stated vs. Revealed Divergence:
    decay: conf(t) = conf_0 * 0.5^(age_days / half_life_days)
    divergence: delta_SR = |stated_support - revealed_support|
    """
    try:
        updated_dt = datetime.fromisoformat(claim_row["last_updated"])
    except Exception:
        updated_dt = datetime.now(timezone.utc)

    now = datetime.now(timezone.utc)
    age_days = max(0.0, (now - updated_dt).total_seconds() / 86400.0)
    half_life = float(claim_row["half_life_days"])

    decay_factor = 0.5 ** (age_days / half_life)
    stated = float(claim_row["stated_support"])
    revealed = float(claim_row["revealed_support"])

    # Average baseline with decay
    effective = round(((stated + revealed) / 2.0) * decay_factor, 3)
    divergence = round(abs(stated - revealed), 3)
    is_divergent = divergence >= 0.35

    return ClaimItem(
        id=claim_row["id"],
        user_id=claim_row["user_id"],
        predicate=claim_row["predicate"],
        object=claim_row["object"],
        domain=claim_row["domain"],
        stated_support=stated,
        revealed_support=revealed,
        effective_support=effective,
        divergence_score=divergence,
        is_divergent=is_divergent,
        half_life_days=int(half_life),
        user_disputed=claim_row["user_disputed"],
        user_excluded=claim_row["user_excluded"],
        created_at=claim_row["created_at"],
        last_updated=claim_row["last_updated"],
    )


def initialize_default_claims_if_empty(user_id: str, db_path: str | None = None) -> list[ClaimItem]:
    existing = list_claims(user_id, include_excluded=True, db_path=db_path)
    if not existing:
        for c in DEFAULT_STARTER_CLAIMS:
            create_claim(
                user_id=user_id,
                predicate=c["predicate"],
                object_=c["object"],
                domain=c["domain"],
                stated_support=c["stated_support"],
                revealed_support=c["revealed_support"],
                half_life_days=c["half_life_days"],
                db_path=db_path,
            )
        existing = list_claims(user_id, include_excluded=False, db_path=db_path)

    return [calculate_claim_decay_and_divergence(c) for c in existing]


def get_divergence_report(user_id: str, db_path: str | None = None) -> list[ClaimDivergenceCard]:
    """Find all claims where stated vs revealed divergence exceeds 0.35 threshold."""
    claims = list_claims(user_id, include_excluded=False, db_path=db_path)
    cards: list[ClaimDivergenceCard] = []

    for c in claims:
        item = calculate_claim_decay_and_divergence(c)
        if item.is_divergent:
            stated_pct = int(item.stated_support * 100)
            revealed_pct = int(item.revealed_support * 100)
            if item.stated_support > item.revealed_support:
                stated_desc = f"You stated high commitment ({stated_pct}%) to: '{item.object}'."
                revealed_desc = f"Logged outcomes show only {revealed_pct}% follow-through or time allocation."
                inquiry = f"Are urgent deadlines crowding out your priority for '{item.object}', or should this goal's commitment assumption be adjusted?"
            else:
                stated_desc = f"You rated '{item.object}' as a lower conscious priority ({stated_pct}%)."
                revealed_desc = f"Observed behavioural logs demonstrate a strong pattern ({revealed_pct}% occurrence)."
                inquiry = f"Your revealed habits heavily reflect this behavior. Would you like to explicitly account for it in your decision constraints?"

            cards.append(ClaimDivergenceCard(
                claim_id=item.id,
                title=f"Stated vs. Revealed Divergence in {item.domain.capitalize()}",
                stated_description=stated_desc,
                revealed_description=revealed_desc,
                divergence_score=item.divergence_score,
                recommended_inquiry=inquiry,
            ))

    return cards
