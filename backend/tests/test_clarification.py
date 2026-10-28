import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.schemas import DecisionInput
from backend.app.services.clarification import analyze_clarity
from test_constraint_engine import make_request

client = TestClient(app)


def test_clarity_score_full_when_all_inputs_complete():
    request = make_request(
        reversible_experiment="Run a 1-week pilot committing 10 hours.",
        options=[
            {
                "id": "option_job",
                "name": "Full-time job",
                "required_hours_per_week": 40.0,
                "upfront_cost_npr": 0.0,
                "monthly_cost_npr": 20000.0,
                "prerequisites": ["[x] Signed offer"],
                "unknowns": [],
            },
            {
                "id": "option_research",
                "name": "Graduate research",
                "required_hours_per_week": 35.0,
                "upfront_cost_npr": 50000.0,
                "monthly_cost_npr": 15000.0,
                "prerequisites": ["[x] Advisor confirmed"],
                "unknowns": [],
            },
        ],
    )
    report = analyze_clarity(request)
    assert report.clarity_score == 100
    assert report.critical_gaps_count == 0
    assert len(report.prompts) == 0


def test_clarity_score_penalized_for_missing_commitments_and_costs():
    request = make_request(
        weekly_maintenance_hours=None,
        existing_commitments_hours=None,
        savings_npr=None,
        monthly_surplus_npr=None,
        reversible_experiment="",
        options=[
            {
                "id": "option_job",
                "name": "Job",
                "required_hours_per_week": None,
                "upfront_cost_npr": None,
                "monthly_cost_npr": None,
                "prerequisites": ["Unchecked prereq 1"],
                "unknowns": [],
            },
            {
                "id": "option_research",
                "name": "Research",
                "required_hours_per_week": None,
                "upfront_cost_npr": None,
                "monthly_cost_npr": None,
                "prerequisites": [],
                "unknowns": [],
            },
        ],
    )
    report = analyze_clarity(request)
    assert report.clarity_score < 50
    assert report.critical_gaps_count >= 3
    prompt_ids = {p.id for p in report.prompts}
    assert "clarify_maintenance_hours" in prompt_ids
    assert "clarify_commitments_hours" in prompt_ids
    assert "clarify_savings" in prompt_ids
    assert "clarify_time_option_job" in prompt_ids
    assert "clarify_cost_option_job" in prompt_ids
    assert "clarify_prereq_option_job" in prompt_ids
    assert "clarify_reversible_experiment" in prompt_ids


def test_clarify_api_endpoint_success():
    req_dict = make_request().model_dump()
    response = client.post("/api/clarify", json=req_dict)
    assert response.status_code == 200
    data = response.json()
    assert "clarity_score" in data
    assert "prompts" in data
    assert isinstance(data["prompts"], list)


def test_analysis_response_includes_clarifications_and_verification_report():
    req_dict = make_request().model_dump()
    response = client.post("/api/analyze", json=req_dict)
    assert response.status_code == 200
    data = response.json()
    assert "clarifications" in data
    assert "verification_report" in data
    assert data["verification_report"]["zero_hallucination_arithmetic_passed"] is True
    assert data["verification_report"]["unsupported_probabilities_prohibited"] is True
    assert data["verification_report"]["audit_status"] in ("VERIFIED_DETERMINISTIC", "VERIFIED_HYBRID")
    assert "grounded_citations" in data
