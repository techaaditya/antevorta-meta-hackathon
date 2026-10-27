from __future__ import annotations
from backend.app.schemas import DecisionInput, ConstraintReport
from backend.app.services.constraint_engine import assessment_for_option, compare_options


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
    raise ValueError("Tool is not allow-listed.")
