from __future__ import annotations
from typing import Any
from backend.app.schemas import DecisionInput, ConstraintReport, OptionInput
from backend.app.services.constraint_engine import (
    assessment_for_option, compare_options, assess_decision
)


def schemas_for_request(request: DecisionInput) -> list[dict]:
    ids = [option.id for option in request.options]
    return [
        {"type": "function", "function": {
            "name": "assess_option",
            "description": "Retrieve deterministic feasibility results for one supplied option. Use this before explaining constraints. Never calculate the arithmetic yourself.",
            "parameters": {"type": "object", "properties": {"option_id": {"type": "string", "enum": ids}}, "required": ["option_id"], "additionalProperties": False},
        }},
        {"type": "function", "function": {
            "name": "compare_options",
            "description": "Retrieve the deterministic comparison of every option, including unknowns and resource conflicts.",
            "parameters": {"type": "object", "properties": {}, "additionalProperties": False},
        }},
        {"type": "function", "function": {
            "name": "list_unknowns",
            "description": "List all explicitly supplied unknowns, missing inputs and prerequisites to verify.",
            "parameters": {"type": "object", "properties": {}, "additionalProperties": False},
        }},
        {"type": "function", "function": {
            "name": "simulate_sensitivity",
            "description": "Simulate what happens to an option's feasibility, weekly headroom, and runway if weekly hours or monthly costs change. Strictly deterministic calculations.",
            "parameters": {
                "type": "object",
                "properties": {
                    "option_id": {"type": "string", "enum": ids},
                    "hours_delta": {"type": "number", "description": "Delta to add to required weekly hours (can be negative)"},
                    "monthly_cost_delta_npr": {"type": "number", "description": "Delta to add to monthly costs in NPR (can be negative)"},
                },
                "required": ["option_id"],
                "additionalProperties": False,
            },
        }},
    ]


def execute_tool(name: str, arguments: dict, request: DecisionInput, report: ConstraintReport) -> dict:
    if name == "assess_option":
        if set(arguments) != {"option_id"}:
            raise ValueError("assess_option accepts only option_id")
        option_id = arguments.get("option_id")
        # Allow-list check rather than accepting arbitrary user-provided ids.
        result = assessment_for_option(report, option_id)
        return result.model_dump()
    if name == "compare_options":
        if arguments:
            raise ValueError("compare_options takes no arguments")
        return compare_options(report)
    if name == "list_unknowns":
        if arguments:
            raise ValueError("list_unknowns takes no arguments")
        return {"missing_inputs": report.missing_inputs, "important_unknowns": report.important_unknowns,
                "option_missing_fields": {a.option_id: a.missing_fields for a in report.option_assessments if a.missing_fields},
                "option_prerequisites": {o.id: o.prerequisites for o in request.options if o.prerequisites}}
    if name == "simulate_sensitivity":
        option_id = arguments.get("option_id")
        if not option_id or not any(o.id == option_id for o in request.options):
            raise ValueError("Valid option_id is required for simulate_sensitivity")
        hours_delta = float(arguments.get("hours_delta", 0.0))
        cost_delta = float(arguments.get("monthly_cost_delta_npr", 0.0))

        # Build modified request copy
        options_copy: list[OptionInput] = []
        for o in request.options:
            if o.id == option_id:
                new_hours = max(0.0, (o.required_hours_per_week or 0.0) + hours_delta) if o.required_hours_per_week is not None or hours_delta != 0 else None
                new_cost = max(0.0, (o.monthly_cost_npr or 0.0) + cost_delta) if o.monthly_cost_npr is not None or cost_delta != 0 else None
                options_copy.append(o.model_copy(update={
                    "required_hours_per_week": new_hours,
                    "monthly_cost_npr": new_cost,
                }))
            else:
                options_copy.append(o.model_copy())

        simulated_request = request.model_copy(update={"options": options_copy})
        simulated_report = assess_decision(simulated_request)

        orig_a = assessment_for_option(report, option_id)
        sim_a = assessment_for_option(simulated_report, option_id)

        return {
            "option_id": option_id,
            "original_overall_status": orig_a.overall_status,
            "simulated_overall_status": sim_a.overall_status,
            "original_weekly_headroom_hours": orig_a.weekly_headroom_hours,
            "simulated_weekly_headroom_hours": sim_a.weekly_headroom_hours,
            "original_budget_headroom_npr": orig_a.projected_budget_headroom_npr,
            "simulated_budget_headroom_npr": sim_a.projected_budget_headroom_npr,
            "original_runway_months": orig_a.runway_months,
            "simulated_runway_months": sim_a.runway_months,
            "status_changed": orig_a.overall_status != sim_a.overall_status,
            "summary": f"Simulating hours delta ({hours_delta:+}h) and monthly cost delta ({cost_delta:+} NPR) shifts overall status: {orig_a.overall_status} -> {sim_a.overall_status}.",
        }
    raise ValueError("Tool is not allow-listed.")
