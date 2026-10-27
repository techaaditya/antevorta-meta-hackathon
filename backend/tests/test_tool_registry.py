import pytest
from backend.app.services.tool_registry import execute_tool, schemas_for_request
from backend.app.services.constraint_engine import assess_decision
from test_constraint_engine import make_request


def test_tool_schemas_are_allowlisted_per_request():
    request = make_request()
    schemas = schemas_for_request(request)
    assert {tool["function"]["name"] for tool in schemas} == {"assess_option", "compare_options", "list_unknowns"}
    assess = next(tool for tool in schemas if tool["function"]["name"] == "assess_option")
    assert assess["function"]["parameters"]["properties"]["option_id"]["enum"] == ["option_job", "option_research"]


def test_unknown_option_and_extra_arguments_are_rejected():
    request = make_request()
    report = assess_decision(request)
    with pytest.raises(KeyError):
        execute_tool("assess_option", {"option_id": "option_not_in_request"}, request, report)
    with pytest.raises(ValueError):
        execute_tool("assess_option", {"option_id": "option_job", "extra": "no"}, request, report)
    with pytest.raises(ValueError):
        execute_tool("compare_options", {"extra": "no"}, request, report)


def test_unknowns_tool_includes_option_level_missing_fields():
    from backend.app.services.tool_registry import execute_tool
    request = make_request(options=[
        {"id": "option_job", "name": "Job path", "required_hours_per_week": None,
         "upfront_cost_npr": 1000, "monthly_cost_npr": 100},
        {"id": "option_research", "name": "Research path", "required_hours_per_week": 15,
         "upfront_cost_npr": 1000, "monthly_cost_npr": 100},
    ])
    report = assess_decision(request)
    result = execute_tool("list_unknowns", {}, request, report)
    assert "option_job.required_hours_per_week" in result["option_missing_fields"]["option_job"]
