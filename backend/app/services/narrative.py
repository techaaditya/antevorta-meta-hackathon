from __future__ import annotations

import json
import re
from backend.app.schemas import DecisionInput, DecisionNarrative, ConstraintReport, OptionNarrative

# Numeric success odds are prohibited in the MVP. Plain cost/hour figures are allowed
# in deterministic fields, not invented inside narrative text.
_NUMBER_TOKEN = re.compile(r"(?<![\w])[-+]?\d[\d,]*(?:\.\d+)?")

_PROBABILITY_PATTERNS = [
    re.compile(r"\b\d+(?:\.\d+)?\s*%"),
    re.compile(r"\b(?:success|chance|probability|likelihood)\s+(?:of\s+)?(?:success\s+)?(?:is\s+)?\d+(?:\.\d+)?\b", re.I),
    re.compile(r"\b\d+(?:\.\d+)?\s*(?:percent|per cent)\b", re.I),
]


def contains_unsupported_probability(narrative: DecisionNarrative) -> bool:
    texts = [narrative.summary, narrative.reversible_experiment, narrative.caveat]
    texts += narrative.cross_option_insights + narrative.questions_before_deciding
    for option in narrative.option_analyses:
        texts += [option.potential_upside, option.main_tradeoff]
        texts += option.conditions_to_make_it_work + option.questions_to_resolve
    return any(pattern.search(text) for pattern in _PROBABILITY_PATTERNS for text in texts)


def build_fallback_narrative(request: DecisionInput, report: ConstraintReport) -> DecisionNarrative:
    lookup = {a.option_id: a for a in report.option_assessments}
    analyses: list[OptionNarrative] = []
    for option in request.options:
        assessment = lookup[option.id]
        time_summary = (
            f"The entered requirements leave {assessment.weekly_headroom_hours:g} hours per week of headroom."
            if assessment.weekly_headroom_hours is not None
            else "Time feasibility cannot be assessed until the missing weekly time inputs are supplied."
        )
        money_summary = (
            f"The entered budget leaves NPR {assessment.projected_budget_headroom_npr:,.2f} over the selected horizon."
            if assessment.projected_budget_headroom_npr is not None
            else "Financial feasibility cannot be assessed until the missing budget or cost inputs are supplied."
        )
        conditions = []
        if assessment.missing_fields:
            conditions.append("Fill in the missing inputs: " + ", ".join(assessment.missing_fields[:5]) + ".")
        if option.prerequisites:
            conditions.append("Verify these prerequisites: " + "; ".join(option.prerequisites[:4]) + ".")
        if assessment.time_status == "CONFLICT":
            conditions.append("Reduce the required weekly hours or explicitly identify a commitment that can be dropped.")
        if assessment.money_status == "CONFLICT":
            conditions.append("Revise the budget, reduce costs, or identify a credible additional funding source.")
        if not conditions:
            conditions.append("Check that the entered assumptions reflect your current situation and test the most uncertain requirement first.")
        analyses.append(OptionNarrative(
            option_id=option.id,
            potential_upside=option.description or f"{option.name} may serve the goal described in the decision question; specify the outcome that would make it worthwhile.",
            main_tradeoff=f"{time_summary} {money_summary}",
            conditions_to_make_it_work=conditions,
            questions_to_resolve=(option.unknowns[:5] or ["What evidence would make this path more or less attractive?"]),
        ))
    return DecisionNarrative(
        summary="This initial comparison uses only the details provided. It identifies constraint conflicts and missing inputs; it does not predict which life path will succeed.",
        option_analyses=analyses,
        cross_option_insights=[
            "Compare the same time horizon and cost assumptions across every option.",
            "A result marked UNKNOWN is a request for better input, not evidence that the option is bad.",
        ],
        reversible_experiment=request.reversible_experiment.strip() or "Choose one small, low-cost action that tests the most important unknown before making an irreversible commitment.",
        questions_before_deciding=[
            "Which assumption would most change your decision if it turned out to be false?",
            "What is the smallest reversible experiment that can test that assumption?",
        ] + request.important_unknowns[:5],
        caveat="Deterministic fallback: no Meta model response was used. These are conditional planning prompts, not predictions or advice.",
    )


def _normalise_number(token: str) -> str:
    cleaned = token.replace(",", "")
    try:
        number = float(cleaned)
        if number.is_integer():
            return str(int(number))
        return f"{number:.8f}".rstrip("0").rstrip(".")
    except ValueError:
        return cleaned


def validate_narrative(
    narrative: DecisionNarrative,
    request: DecisionInput,
    report: ConstraintReport | None = None,
) -> tuple[bool, str]:
    wanted = {option.id for option in request.options}
    got = [item.option_id for item in narrative.option_analyses]
    if len(got) != len(set(got)):
        return False, "Narrative has duplicate option IDs."
    if set(got) != wanted:
        return False, "Narrative must cover every input option exactly once."
    if contains_unsupported_probability(narrative):
        return False, "Narrative contains an unsupported numerical-probability claim."
    if report is not None:
        # Prose may repeat only numbers already present in the validated request or
        # deterministic report. Numeric outputs stay in typed arithmetic fields.
        allowed_payload = json.dumps({"request": request.model_dump(), "report": report.model_dump()}, ensure_ascii=False)
        allowed_numbers = {_normalise_number(m.group(0)) for m in _NUMBER_TOKEN.finditer(allowed_payload)}
        # A negative headroom may naturally be described by its absolute shortfall.
        allowed_numbers |= {value[1:] for value in list(allowed_numbers) if value.startswith("-")}
        narrative_payload = json.dumps(narrative.model_dump(), ensure_ascii=False)
        for match in _NUMBER_TOKEN.finditer(narrative_payload):
            token = _normalise_number(match.group(0))
            if token not in allowed_numbers:
                return False, "Narrative contains a numeric value absent from the request and deterministic report."
    return True, "passed"
