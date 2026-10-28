from __future__ import annotations

import json
import logging
from backend.app.config import MODEL_API_KEY, META_MODEL_BASE_URL, META_MODEL_ID
from backend.app.schemas import FutureSelfRequest, FutureSelfResponse
from backend.app.services.constraint_engine import assess_decision, assessment_for_option

logger = logging.getLogger("antevorta.future_self")


def generate_future_self_reflection(request: FutureSelfRequest) -> FutureSelfResponse:
    report = assess_decision(request.decision)
    target_option = next((o for o in request.decision.options if o.id == request.option_id), None)
    if not target_option:
        target_option = request.decision.options[0]

    assessment = assessment_for_option(report, target_option.id)
    horizon = request.time_horizon_years

    # Check if Meta Model API is available for live reasoning
    if MODEL_API_KEY:
        try:
            from openai import OpenAI
            client = OpenAI(
                api_key=MODEL_API_KEY,
                base_url=META_MODEL_BASE_URL,
                timeout=30,
                max_retries=1,
            )

            system_prompt = (
                f"You are the user's simulated Future Self, living {horizon} years in the future after choosing "
                f"'{target_option.name}' for the decision: '{request.decision.question}'.\n"
                f"Your reflection MUST be grounded in these verified facts:\n"
                f"- Option required weekly hours: {assessment.required_hours_per_week}h/week (headroom: {assessment.weekly_headroom_hours}h/week)\n"
                f"- Financial budget: NPR {assessment.projected_budget_headroom_npr:,.0f} headroom, runway: {assessment.runway_months} months\n"
                f"- Unverified prerequisites: {', '.join(assessment.prerequisites_to_verify) or 'None'}\n"
                f"- Reversible experiment: '{request.decision.reversible_experiment}'\n\n"
                f"Rules:\n"
                f"1. Never invent fake personal memories or claim absolute certainty about the future.\n"
                f"2. Acknowledge real resource constraints and friction points.\n"
                f"3. Return a JSON object with: 'perspective', 'dialogue_transcript', 'hardest_tradeoff', 'what_i_wish_i_knew', 'recommended_micro_experiment'."
            )

            resp = client.chat.completions.create(
                model=META_MODEL_ID,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Give me your honest perspective down the '{target_option.name}' branch {horizon} years from now."},
                ],
                response_format={"type": "json_object"},
                temperature=0.3,
                max_tokens=1000,
            )
            content = resp.choices[0].message.content or "{}"
            parsed = json.loads(content)
            return FutureSelfResponse(
                option_id=target_option.id,
                option_name=target_option.name,
                horizon_years=horizon,
                perspective=parsed.get("perspective", f"{horizon}-Year Future Self down the {target_option.name} path"),
                dialogue_transcript=parsed.get("dialogue_transcript", "Looking back, making this choice required honest confrontation with weekly time limits and financial burn."),
                hardest_tradeoff=parsed.get("hardest_tradeoff", f"Balancing the {assessment.required_hours_per_week or 30}h weekly commitment against other priorities."),
                what_i_wish_i_knew=parsed.get("what_i_wish_i_knew", "That testing the most uncertain prerequisite in week 1 would have saved months of hesitation."),
                recommended_micro_experiment=parsed.get("recommended_micro_experiment", request.decision.reversible_experiment or "Run a 7-day pilot trial."),
            )
        except Exception as exc:
            logger.warning("Future Self live generation failed: %s; using deterministic synthesis", type(exc).__name__)

    # Deterministic synthesis fallback
    time_text = (
        f"You maintained {assessment.weekly_headroom_hours} hours/week of discretionary headroom."
        if assessment.weekly_headroom_hours and assessment.weekly_headroom_hours > 0
        else "You faced severe weekly time collisions that forced you to sacrifice sleep or sideline commitments."
    )
    money_text = (
        f"Your cash runway provided approximately {assessment.runway_months:.1f} months of safety buffer."
        if assessment.runway_months
        else "Financial liquidity remained tight without clear monthly surplus."
    )

    dialogue = (
        f"Speaking to you from {horizon} years ahead: choosing '{target_option.name}' wasn't about whether it sounded exciting on paper—it came down to daily arithmetic. "
        f"{time_text} {money_text} The hardest part wasn't the work itself, but accepting what had to be dropped to make the hours fit."
    )

    return FutureSelfResponse(
        option_id=target_option.id,
        option_name=target_option.name,
        horizon_years=horizon,
        perspective=f"{horizon}-Year Future Self down the {target_option.name} path",
        dialogue_transcript=dialogue,
        hardest_tradeoff=f"Managing the {assessment.required_hours_per_week or 30}h/wk workload without burning personal reserves.",
        what_i_wish_i_knew="Whether the core dependency was genuine before signing contracts or committing capital.",
        recommended_micro_experiment=request.decision.reversible_experiment or "Test the highest-friction requirement for 10 hours over the next 7 days.",
    )
