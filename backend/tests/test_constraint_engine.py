from backend.app.schemas import DecisionInput
from backend.app.services.constraint_engine import assess_decision


def make_request(**overrides):
    values = {
        "question": "Should I take a job or pursue research?",
        "horizon_months": 12,
        "weekly_maintenance_hours": 60,
        "existing_commitments_hours": 35,
        "savings_npr": 250000,
        "monthly_surplus_npr": 15000,
        "options": [
            {"id": "option_job", "name": "Full-time job", "required_hours_per_week": 40,
             "upfront_cost_npr": 30000, "monthly_cost_npr": 8000},
            {"id": "option_research", "name": "Research role", "required_hours_per_week": 25,
             "upfront_cost_npr": 120000, "monthly_cost_npr": 15000},
        ],
    }
    values.update(overrides)
    return DecisionInput.model_validate(values)


def test_weekly_and_financial_arithmetic_is_deterministic():
    report = assess_decision(make_request())
    assert report.weekly_capacity_hours == 73
    job = next(x for x in report.option_assessments if x.option_id == "option_job")
    assert job.weekly_headroom_hours == 33
    assert job.projected_available_budget_npr == 430000
    assert job.projected_total_cost_npr == 126000
    assert job.projected_budget_headroom_npr == 304000
    assert job.overall_status == "FEASIBLE"


def test_time_conflict_is_reported_when_requirements_exceed_capacity():
    request = make_request(options=[
        {"id": "option_job", "name": "Overloaded option", "required_hours_per_week": 80,
         "upfront_cost_npr": 1000, "monthly_cost_npr": 100},
        {"id": "option_research", "name": "Second option", "required_hours_per_week": 10,
         "upfront_cost_npr": 1000, "monthly_cost_npr": 100},
    ])
    report = assess_decision(request)
    first = report.option_assessments[0]
    assert first.time_status == "CONFLICT"
    assert first.weekly_headroom_hours == -7
    assert first.overall_status == "CONFLICT"


def test_missing_values_remain_unknown_not_zero():
    request = make_request(weekly_maintenance_hours=None, savings_npr=None, monthly_surplus_npr=None,
        options=[
            {"id": "option_job", "name": "Job", "required_hours_per_week": None,
             "upfront_cost_npr": None, "monthly_cost_npr": None},
            {"id": "option_research", "name": "Research", "required_hours_per_week": 15,
             "upfront_cost_npr": 500, "monthly_cost_npr": 100},
        ])
    report = assess_decision(request)
    assert report.weekly_capacity_hours is None
    job = report.option_assessments[0]
    assert job.weekly_headroom_hours is None
    assert job.projected_budget_headroom_npr is None
    assert job.overall_status == "UNKNOWN"
    assert "weekly_maintenance_hours" in report.missing_inputs
    assert "savings_npr" in report.missing_inputs


def test_negative_monthly_surplus_can_create_budget_conflict():
    request = make_request(monthly_surplus_npr=-30000)
    report = assess_decision(request)
    assert any(option.money_status == "CONFLICT" for option in report.option_assessments)


def test_unverified_prerequisites_prevent_fully_feasible_label():
    request = make_request(options=[
        {"id": "option_job", "name": "Job path", "required_hours_per_week": 20,
         "upfront_cost_npr": 1000, "monthly_cost_npr": 100, "prerequisites": ["Confirm signed offer"]},
        {"id": "option_research", "name": "Research path", "required_hours_per_week": 15,
         "upfront_cost_npr": 1000, "monthly_cost_npr": 100},
    ])
    report = assess_decision(request)
    assert report.option_assessments[0].time_status == "FEASIBLE"
    assert report.option_assessments[0].money_status == "FEASIBLE"
    assert report.option_assessments[0].overall_status == "UNKNOWN"
