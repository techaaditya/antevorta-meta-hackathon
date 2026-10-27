from __future__ import annotations

from typing import Any
from backend.app.schemas import ConstraintReport, DecisionInput, OptionAssessment


def _round(value: float | None) -> float | None:
    return round(value, 2) if value is not None else None


def assess_decision(request: DecisionInput) -> ConstraintReport:
    capacity_known = (
        request.weekly_maintenance_hours is not None
        and request.existing_commitments_hours is not None
    )
    weekly_capacity = (
        168 - request.weekly_maintenance_hours - request.existing_commitments_hours
        if capacity_known else None
    )
    budget_known = request.savings_npr is not None and request.monthly_surplus_npr is not None
    budget = (
        request.savings_npr + request.monthly_surplus_npr * request.horizon_months
        if budget_known else None
    )

    missing_inputs: list[str] = []
    if request.weekly_maintenance_hours is None:
        missing_inputs.append("weekly_maintenance_hours")
    if request.existing_commitments_hours is None:
        missing_inputs.append("existing_commitments_hours")
    if request.savings_npr is None:
        missing_inputs.append("savings_npr")
    if request.monthly_surplus_npr is None:
        missing_inputs.append("monthly_surplus_npr")

    assessments: list[OptionAssessment] = []
    for option in request.options:
        missing: list[str] = []
        if weekly_capacity is None:
            missing.extend(name for name in ("weekly_maintenance_hours", "existing_commitments_hours") if getattr(request, name) is None)
        if option.required_hours_per_week is None:
            missing.append(f"{option.id}.required_hours_per_week")
        if not budget_known:
            missing.extend(name for name in ("savings_npr", "monthly_surplus_npr") if getattr(request, name) is None)
        if option.upfront_cost_npr is None:
            missing.append(f"{option.id}.upfront_cost_npr")
        if option.monthly_cost_npr is None:
            missing.append(f"{option.id}.monthly_cost_npr")

        headroom = (
            weekly_capacity - option.required_hours_per_week
            if weekly_capacity is not None and option.required_hours_per_week is not None else None
        )
        total_cost = (
            option.upfront_cost_npr + option.monthly_cost_npr * request.horizon_months
            if option.upfront_cost_npr is not None and option.monthly_cost_npr is not None else None
        )
        budget_headroom = budget - total_cost if budget is not None and total_cost is not None else None

        time_status = "UNKNOWN" if headroom is None else ("CONFLICT" if headroom < 0 else "FEASIBLE")
        money_status = "UNKNOWN" if budget_headroom is None else ("CONFLICT" if budget_headroom < 0 else "FEASIBLE")
        statuses = (time_status, money_status)

        # Parse prerequisites: allow explicit verification notation "[x] item" vs "[ ] item" / plain text
        verified_prereqs: list[str] = []
        unverified_prereqs: list[str] = []
        for p in option.prerequisites:
            trimmed = p.strip()
            if trimmed.lower().startswith("[x]"):
                verified_prereqs.append(trimmed[3:].strip())
            elif trimmed.startswith("[ ]"):
                unverified_prereqs.append(trimmed[3:].strip())
            else:
                unverified_prereqs.append(trimmed)

        # Unverified prerequisites prevent a fully feasible label even when arithmetic fits.
        overall = "CONFLICT" if "CONFLICT" in statuses else (
            "UNKNOWN" if "UNKNOWN" in statuses or unverified_prereqs else "FEASIBLE"
        )

        # Financial runway calculation when burning savings (monthly burn > monthly surplus):
        runway_months: float | None = None
        if (
            budget_known
            and option.upfront_cost_npr is not None
            and option.monthly_cost_npr is not None
        ):
            net_monthly = request.monthly_surplus_npr - option.monthly_cost_npr
            if net_monthly < 0:
                post_upfront_savings = request.savings_npr - option.upfront_cost_npr
                if post_upfront_savings <= 0:
                    runway_months = 0.0
                else:
                    runway_months = _round(post_upfront_savings / abs(net_monthly))

        # Breakeven monthly surplus needed over the planning horizon:
        breakeven_surplus: float | None = None
        if (
            request.savings_npr is not None
            and option.upfront_cost_npr is not None
            and option.monthly_cost_npr is not None
            and request.horizon_months > 0
        ):
            breakeven_surplus = _round(
                option.monthly_cost_npr + (option.upfront_cost_npr - request.savings_npr) / request.horizon_months
            )

        reasons = []
        if headroom is not None:
            reasons.append(f"Weekly time headroom is {_round(headroom)} hours.")
        else:
            reasons.append("Weekly time feasibility is unknown because one or more required values are missing.")
        if budget_headroom is not None:
            reasons.append(f"Budget headroom over {request.horizon_months} months is NPR {_round(budget_headroom):,.2f}.")
        else:
            reasons.append("Financial feasibility is unknown because one or more required values are missing.")
        if unverified_prereqs:
            reasons.append(f"Verify {len(unverified_prereqs)} prerequisite(s) before treating this path as ready.")
        elif verified_prereqs:
            reasons.append(f"All {len(verified_prereqs)} prerequisite(s) verified.")
        if runway_months is not None:
            reasons.append(f"Financial runway at current burn is {runway_months:g} months.")

        assessments.append(OptionAssessment(
            option_id=option.id,
            option_name=option.name,
            overall_status=overall,
            time_status=time_status,
            weekly_available_hours=_round(weekly_capacity),
            required_hours_per_week=_round(option.required_hours_per_week),
            weekly_headroom_hours=_round(headroom),
            money_status=money_status,
            projected_available_budget_npr=_round(budget),
            projected_total_cost_npr=_round(total_cost),
            projected_budget_headroom_npr=_round(budget_headroom),
            missing_fields=missing,
            prerequisites_to_verify=unverified_prereqs,
            verified_prerequisites=verified_prereqs,
            runway_months=runway_months,
            breakeven_monthly_surplus_npr=breakeven_surplus,
            explanation=" ".join(reasons),
        ))

    all_statuses = [a.overall_status for a in assessments]
    overall_status = "CONFLICT" if "CONFLICT" in all_statuses else ("UNKNOWN" if "UNKNOWN" in all_statuses else "FEASIBLE")

    unknowns = list(request.important_unknowns)
    for option in request.options:
        unknowns.extend(option.unknowns)
        # Add unverified prerequisites to unknowns
        for prereq in option.prerequisites:
            trimmed = prereq.strip()
            if not trimmed.lower().startswith("[x]"):
                clean_p = trimmed[3:].strip() if trimmed.startswith("[ ]") else trimmed
                unknowns.append(f"Verify for {option.name}: {clean_p}")

    # Keep ordering stable while removing duplicates.
    unknowns = list(dict.fromkeys(unknowns))

    # Explicit separation: known facts vs user assumptions
    known_facts: list[str] = [
        "A standard week has 168 available hours.",
        f"Evaluation horizon is fixed at {request.horizon_months} month(s).",
    ]
    if request.deadline:
        known_facts.append(f"Stated decision deadline: {request.deadline}.")
    for opt in request.options:
        if opt.required_hours_per_week is not None:
            known_facts.append(f"{opt.name}: Stated requirement of {_round(opt.required_hours_per_week):g} h/week.")
        if opt.upfront_cost_npr is not None and opt.monthly_cost_npr is not None:
            known_facts.append(
                f"{opt.name}: Stated upfront cost of NPR {_round(opt.upfront_cost_npr):,.2f} "
                f"and monthly NPR {_round(opt.monthly_cost_npr):,.2f}."
            )

    user_assumptions: list[str] = []
    if request.weekly_maintenance_hours is not None:
        user_assumptions.append(f"Weekly maintenance estimated at {_round(request.weekly_maintenance_hours):g} hours.")
    if request.existing_commitments_hours is not None:
        user_assumptions.append(f"Existing commitments estimated at {_round(request.existing_commitments_hours):g} hours.")
    if request.savings_npr is not None:
        user_assumptions.append(f"Liquid savings estimated at NPR {_round(request.savings_npr):,.2f}.")
    if request.monthly_surplus_npr is not None:
        user_assumptions.append(f"Monthly cashflow surplus estimated at NPR {_round(request.monthly_surplus_npr):,.2f}.")

    return ConstraintReport(
        overall_status=overall_status,
        time_horizon_months=request.horizon_months,
        weekly_capacity_hours=_round(weekly_capacity),
        option_assessments=assessments,
        missing_inputs=missing_inputs,
        important_unknowns=unknowns,
        known_facts=known_facts,
        user_assumptions=user_assumptions,
    )


def assessment_for_option(report: ConstraintReport, option_id: str) -> OptionAssessment:
    for assessment in report.option_assessments:
        if assessment.option_id == option_id:
            return assessment
    raise KeyError(f"Unknown option id: {option_id}")


def compare_options(report: ConstraintReport) -> dict:
    return {
        "overall_status": report.overall_status,
        "time_horizon_months": report.time_horizon_months,
        "options": [a.model_dump() for a in report.option_assessments],
        "missing_inputs": report.missing_inputs,
        "important_unknowns": report.important_unknowns,
        "known_facts": report.known_facts,
        "user_assumptions": report.user_assumptions,
    }


def recalculate_with_overrides(
    base_request: DecisionInput,
    overrides: dict[str, Any],
) -> tuple[ConstraintReport, dict[str, Any]]:
    """Deterministically recalculate constraints under modified assumptions and compute diff."""
    base_data = base_request.model_dump()
    updated_data = {**base_data, **overrides}
    updated_request = DecisionInput.model_validate(updated_data)

    base_report = assess_decision(base_request)
    updated_report = assess_decision(updated_request)

    base_map = {a.option_id: a for a in base_report.option_assessments}
    updated_map = {a.option_id: a for a in updated_report.option_assessments}

    changed_assumptions: dict[str, dict[str, Any]] = {}
    for key, new_val in overrides.items():
        old_val = base_data.get(key)
        if old_val != new_val:
            changed_assumptions[key] = {"previous": old_val, "updated": new_val}

    option_deltas: dict[str, dict[str, Any]] = {}
    for opt_id, up_a in updated_map.items():
        base_a = base_map.get(opt_id)
        if not base_a:
            continue
        time_delta = (
            _round(up_a.weekly_headroom_hours - base_a.weekly_headroom_hours)
            if up_a.weekly_headroom_hours is not None and base_a.weekly_headroom_hours is not None
            else None
        )
        money_delta = (
            _round(up_a.projected_budget_headroom_npr - base_a.projected_budget_headroom_npr)
            if up_a.projected_budget_headroom_npr is not None and base_a.projected_budget_headroom_npr is not None
            else None
        )
        option_deltas[opt_id] = {
            "time_headroom_delta_hours": time_delta,
            "budget_headroom_delta_npr": money_delta,
            "previous_status": base_a.overall_status,
            "updated_status": up_a.overall_status,
            "status_changed": base_a.overall_status != up_a.overall_status,
        }

    capacity_delta = (
        _round(updated_report.weekly_capacity_hours - base_report.weekly_capacity_hours)
        if updated_report.weekly_capacity_hours is not None and base_report.weekly_capacity_hours is not None
        else None
    )

    diff = {
        "changed_assumptions": changed_assumptions,
        "capacity_delta_hours": capacity_delta,
        "option_deltas": option_deltas,
        "overall_status_transition": f"{base_report.overall_status} -> {updated_report.overall_status}",
    }
    return updated_report, diff
