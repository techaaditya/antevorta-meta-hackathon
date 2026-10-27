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


import pytest
from pydantic import ValidationError
from backend.app.schemas import OptionInput
from backend.app.services.constraint_engine import recalculate_with_overrides


def test_verified_prerequisites_allow_fully_feasible_label():
    request = make_request(options=[
        {"id": "option_job", "name": "Job path", "required_hours_per_week": 20,
         "upfront_cost_npr": 1000, "monthly_cost_npr": 100, "prerequisites": ["[x] Confirm signed offer"]},
        {"id": "option_research", "name": "Research path", "required_hours_per_week": 15,
         "upfront_cost_npr": 1000, "monthly_cost_npr": 100},
    ])
    report = assess_decision(request)
    first = report.option_assessments[0]
    assert first.time_status == "FEASIBLE"
    assert first.money_status == "FEASIBLE"
    assert first.overall_status == "FEASIBLE"
    assert "Confirm signed offer" in first.verified_prerequisites
    assert len(first.prerequisites_to_verify) == 0


def test_boundary_exact_zero_time_and_money_headroom():
    # 168 - 100 - 48 = 20 available hours; required is 20 -> headroom = 0 -> FEASIBLE
    # Budget: 50,000 + 5,000 * 10 = 100,000. Upfront: 20,000 + 8,000 * 10 = 100,000 -> headroom = 0 -> FEASIBLE
    request = make_request(
        horizon_months=10,
        weekly_maintenance_hours=100,
        existing_commitments_hours=48,
        savings_npr=50000,
        monthly_surplus_npr=5000,
        options=[
            {"id": "option_a", "name": "Exact fit", "required_hours_per_week": 20,
             "upfront_cost_npr": 20000, "monthly_cost_npr": 8000},
            {"id": "option_b", "name": "Alternative", "required_hours_per_week": 10,
             "upfront_cost_npr": 10000, "monthly_cost_npr": 2000},
        ]
    )
    report = assess_decision(request)
    first = report.option_assessments[0]
    assert first.weekly_headroom_hours == 0.0
    assert first.time_status == "FEASIBLE"
    assert first.projected_budget_headroom_npr == 0.0
    assert first.money_status == "FEASIBLE"
    assert first.overall_status == "FEASIBLE"


def test_boundary_zero_capacity_feasible_only_for_zero_requirement():
    # Maintenance + commitments = 168 -> 0 capacity
    request = make_request(
        weekly_maintenance_hours=100,
        existing_commitments_hours=68,
        options=[
            {"id": "option_zero", "name": "Zero hours", "required_hours_per_week": 0,
             "upfront_cost_npr": 0, "monthly_cost_npr": 0},
            {"id": "option_tiny", "name": "Tiny hours", "required_hours_per_week": 0.5,
             "upfront_cost_npr": 0, "monthly_cost_npr": 0},
        ]
    )
    report = assess_decision(request)
    assert report.weekly_capacity_hours == 0.0
    assert report.option_assessments[0].time_status == "FEASIBLE"
    assert report.option_assessments[0].weekly_headroom_hours == 0.0
    assert report.option_assessments[1].time_status == "CONFLICT"
    assert report.option_assessments[1].weekly_headroom_hours == -0.5


def test_boundary_zero_costs_with_zero_savings_feasible():
    request = make_request(
        savings_npr=0,
        monthly_surplus_npr=0,
        options=[
            {"id": "option_free1", "name": "Free 1", "required_hours_per_week": 10,
             "upfront_cost_npr": 0, "monthly_cost_npr": 0},
            {"id": "option_free2", "name": "Free 2", "required_hours_per_week": 10,
             "upfront_cost_npr": 0, "monthly_cost_npr": 0},
        ]
    )
    report = assess_decision(request)
    first = report.option_assessments[0]
    assert first.money_status == "FEASIBLE"
    assert first.projected_available_budget_npr == 0.0
    assert first.projected_total_cost_npr == 0.0
    assert first.projected_budget_headroom_npr == 0.0


def test_financial_runway_calculation_with_deficit():
    # Savings: 100,000 NPR, Monthly surplus: 0 NPR
    # Option: Upfront: 20,000 NPR, Monthly: 10,000 NPR
    # Net monthly cashflow: 0 - 10,000 = -10,000 NPR/mo
    # Remaining savings after upfront: 80,000 NPR
    # Runway: 80,000 / 10,000 = 8.0 months
    request = make_request(
        horizon_months=12,
        savings_npr=100000,
        monthly_surplus_npr=0,
        options=[
            {"id": "option_burn", "name": "High burn path", "required_hours_per_week": 20,
             "upfront_cost_npr": 20000, "monthly_cost_npr": 10000},
            {"id": "option_safe", "name": "Zero cost path", "required_hours_per_week": 10,
             "upfront_cost_npr": 0, "monthly_cost_npr": 0},
        ]
    )
    report = assess_decision(request)
    burn_opt = report.option_assessments[0]
    assert burn_opt.runway_months == 8.0
    assert "Financial runway at current burn is 8 months." in burn_opt.explanation
    # Safe option has 0 monthly cost, no net deficit -> runway is None (not depleting)
    assert report.option_assessments[1].runway_months is None


def test_breakeven_monthly_surplus_calculation():
    # Horizon: 12 months, Savings: 120,000 NPR
    # Option: Upfront: 240,000 NPR, Monthly: 10,000 NPR
    # Breakeven surplus = monthly + (upfront - savings) / horizon
    # = 10,000 + (240,000 - 120,000) / 12 = 10,000 + 10,000 = 20,000 NPR/month
    request = make_request(
        horizon_months=12,
        savings_npr=120000,
        monthly_surplus_npr=5000,
        options=[
            {"id": "option_edu", "name": "Degree", "required_hours_per_week": 20,
             "upfront_cost_npr": 240000, "monthly_cost_npr": 10000},
            {"id": "option_work", "name": "Employment", "required_hours_per_week": 40,
             "upfront_cost_npr": 0, "monthly_cost_npr": 0},
        ]
    )
    report = assess_decision(request)
    first = report.option_assessments[0]
    assert first.breakeven_monthly_surplus_npr == 20000.0


def test_partial_cost_inputs_remain_unknown():
    # Upfront known, monthly cost None
    request = make_request(
        options=[
            {"id": "option_part1", "name": "Partial upfront", "required_hours_per_week": 20,
             "upfront_cost_npr": 50000, "monthly_cost_npr": None},
            {"id": "option_part2", "name": "Partial monthly", "required_hours_per_week": 20,
             "upfront_cost_npr": None, "monthly_cost_npr": 5000},
        ]
    )
    report = assess_decision(request)
    first = report.option_assessments[0]
    assert first.money_status == "UNKNOWN"
    assert first.projected_total_cost_npr is None
    assert first.projected_budget_headroom_npr is None
    assert "option_part1.monthly_cost_npr" in first.missing_fields

    second = report.option_assessments[1]
    assert second.money_status == "UNKNOWN"
    assert second.projected_total_cost_npr is None
    assert "option_part2.upfront_cost_npr" in second.missing_fields


def test_baseline_capacity_exhausted_creates_conflict_for_all_positive_options():
    # Maintenance (120) + Commitments (60) = 180 > 168 -> weekly capacity = -12 hours
    request = make_request(
        weekly_maintenance_hours=120,
        existing_commitments_hours=60,
        options=[
            {"id": "option_a", "name": "Option A", "required_hours_per_week": 10,
             "upfront_cost_npr": 0, "monthly_cost_npr": 0},
            {"id": "option_b", "name": "Option B", "required_hours_per_week": 5,
             "upfront_cost_npr": 0, "monthly_cost_npr": 0},
        ]
    )
    report = assess_decision(request)
    assert report.weekly_capacity_hours == -12.0
    assert report.option_assessments[0].time_status == "CONFLICT"
    assert report.option_assessments[0].weekly_headroom_hours == -22.0
    assert report.option_assessments[1].time_status == "CONFLICT"
    assert report.option_assessments[1].weekly_headroom_hours == -17.0


def test_separation_of_facts_assumptions_and_unknowns():
    request = make_request(
        deadline="2026-12-31",
        options=[
            {"id": "option_job", "name": "Job", "required_hours_per_week": 35,
             "upfront_cost_npr": 10000, "monthly_cost_npr": 2000, "unknowns": ["Probation length"]},
            {"id": "option_study", "name": "Study", "required_hours_per_week": None,
             "upfront_cost_npr": 50000, "monthly_cost_npr": 5000},
        ],
        important_unknowns=["Family support"],
    )
    report = assess_decision(request)
    # Facts contain calendar, horizon, deadline, stated costs
    assert any("168 available hours" in fact for fact in report.known_facts)
    assert any("2026-12-31" in fact for fact in report.known_facts)
    # Assumptions contain user's estimates
    assert any("Weekly maintenance estimated" in a for a in report.user_assumptions)
    assert any("Existing commitments estimated" in a for a in report.user_assumptions)
    # Unknowns contain user unknowns + missing fields + option unknowns
    assert "Family support" in report.important_unknowns
    assert "Probation length" in report.important_unknowns
    assert "option_study.required_hours_per_week" in report.option_assessments[1].missing_fields


def test_recalculate_with_overrides_tracks_diff():
    base_request = make_request(
        weekly_maintenance_hours=60,
        existing_commitments_hours=40,
        savings_npr=100000,
        monthly_surplus_npr=10000,
        options=[
            {"id": "option_job", "name": "Job", "required_hours_per_week": 70,
             "upfront_cost_npr": 10000, "monthly_cost_npr": 5000},
            {"id": "option_research", "name": "Research", "required_hours_per_week": 20,
             "upfront_cost_npr": 10000, "monthly_cost_npr": 5000},
        ]
    )
    # Initially option_job requires 70h with capacity 68h -> CONFLICT
    base_report = assess_decision(base_request)
    assert base_report.option_assessments[0].time_status == "CONFLICT"

    # Override: reduce existing commitments from 40 to 30 -> capacity becomes 78h -> FEASIBLE!
    updated_report, diff = recalculate_with_overrides(base_request, {"existing_commitments_hours": 30})
    job_delta = diff["option_deltas"]["option_job"]
    assert job_delta["time_headroom_delta_hours"] == 10.0
    assert job_delta["previous_status"] == "CONFLICT"
    assert job_delta["updated_status"] == "FEASIBLE"
    assert job_delta["status_changed"] is True
    assert diff["capacity_delta_hours"] == 10.0
    assert diff["changed_assumptions"]["existing_commitments_hours"]["previous"] == 40
    assert diff["changed_assumptions"]["existing_commitments_hours"]["updated"] == 30


def test_invalid_option_ids_rejected():
    # ID must match ^option_[a-z0-9_]+$ and min length 8
    with pytest.raises(ValidationError):
        OptionInput.model_validate({"id": "opt1", "name": "Invalid ID"})
    with pytest.raises(ValidationError):
        OptionInput.model_validate({"id": "OPTION_UPPER", "name": "Uppercase ID"})
    with pytest.raises(ValidationError):
        OptionInput.model_validate({"id": "option with spaces", "name": "Space ID"})


def test_invalid_negative_numbers_rejected():
    with pytest.raises(ValidationError):
        OptionInput.model_validate({
            "id": "option_test", "name": "Negative hours", "required_hours_per_week": -5
        })
    with pytest.raises(ValidationError):
        OptionInput.model_validate({
            "id": "option_test", "name": "Negative cost", "upfront_cost_npr": -100
        })


def test_invalid_excessive_hours_rejected():
    with pytest.raises(ValidationError):
        OptionInput.model_validate({
            "id": "option_test", "name": "Too many hours", "required_hours_per_week": 169
        })


def test_invalid_duplicate_option_names_rejected():
    with pytest.raises(ValidationError):
        DecisionInput.model_validate({
            "question": "Should I choose path A or path B?",
            "options": [
                {"id": "option_one", "name": "Identical Name"},
                {"id": "option_two", "name": "Identical Name"},
            ]
        })


def test_invalid_option_count_rejected():
    # Less than 2 options
    with pytest.raises(ValidationError):
        DecisionInput.model_validate({
            "question": "Only one option provided?",
            "options": [{"id": "option_single", "name": "Only One"}]
        })
    # More than 3 options
    with pytest.raises(ValidationError):
        DecisionInput.model_validate({
            "question": "Four options provided?",
            "options": [
                {"id": "option_one", "name": "One"},
                {"id": "option_two", "name": "Two"},
                {"id": "option_three", "name": "Three"},
                {"id": "option_four", "name": "Four"},
            ]
        })
