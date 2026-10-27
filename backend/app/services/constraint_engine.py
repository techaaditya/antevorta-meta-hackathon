from __future__ import annotations

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
        # Unverified prerequisites prevent a fully feasible label even when arithmetic fits.
        overall = "CONFLICT" if "CONFLICT" in statuses else ("UNKNOWN" if "UNKNOWN" in statuses or option.prerequisites else "FEASIBLE")

        reasons = []
        if headroom is not None:
            reasons.append(f"Weekly time headroom is {_round(headroom)} hours.")
        else:
            reasons.append("Weekly time feasibility is unknown because one or more required values are missing.")
        if budget_headroom is not None:
            reasons.append(f"Budget headroom over {request.horizon_months} months is NPR {_round(budget_headroom):,.2f}.")
        else:
            reasons.append("Financial feasibility is unknown because one or more required values are missing.")
        if option.prerequisites:
            reasons.append(f"Verify {len(option.prerequisites)} prerequisite(s) before treating this path as ready.")

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
            prerequisites_to_verify=option.prerequisites,
            explanation=" ".join(reasons),
        ))

    all_statuses = [a.overall_status for a in assessments]
    overall_status = "CONFLICT" if "CONFLICT" in all_statuses else ("UNKNOWN" if "UNKNOWN" in all_statuses else "FEASIBLE")
    unknowns = list(request.important_unknowns)
    for option in request.options:
        unknowns.extend(option.unknowns)
        if option.prerequisites:
            unknowns.extend(f"Verify for {option.name}: {item}" for item in option.prerequisites)
    # Keep ordering stable while removing duplicates.
    unknowns = list(dict.fromkeys(unknowns))
    return ConstraintReport(
        overall_status=overall_status,
        time_horizon_months=request.horizon_months,
        weekly_capacity_hours=_round(weekly_capacity),
        option_assessments=assessments,
        missing_inputs=missing_inputs,
        important_unknowns=unknowns,
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
    }
