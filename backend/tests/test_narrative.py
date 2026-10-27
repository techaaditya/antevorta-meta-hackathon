from backend.app.schemas import DecisionInput, DecisionNarrative, OptionNarrative
from backend.app.services.constraint_engine import assess_decision
from backend.app.services.narrative import build_fallback_narrative, validate_narrative
from test_constraint_engine import make_request


def test_fallback_covers_every_option_and_validates():
    request = make_request()
    narrative = build_fallback_narrative(request, assess_decision(request))
    ok, message = validate_narrative(narrative, request)
    assert ok, message
    assert {x.option_id for x in narrative.option_analyses} == {x.id for x in request.options}


def test_verifier_rejects_unsupported_probability():
    request = make_request()
    narrative = build_fallback_narrative(request, assess_decision(request))
    narrative.summary = "This path has a 75% chance of success."
    ok, message = validate_narrative(narrative, request)
    assert not ok
    assert "probability" in message.lower()


def test_verifier_rejects_missing_option():
    request = make_request()
    narrative = build_fallback_narrative(request, assess_decision(request))
    narrative.option_analyses = narrative.option_analyses[:1]
    ok, message = validate_narrative(narrative, request)
    assert not ok
    assert "every input option" in message


def test_schema_rejects_duplicate_option_ids():
    try:
        DecisionInput.model_validate({
            "question": "Should I choose a or b?",
            "options": [
                {"id": "option_same", "name": "Option A"},
                {"id": "option_same", "name": "Option B"},
            ],
        })
    except Exception as exc:
        assert "unique" in str(exc).lower()
    else:
        raise AssertionError("Duplicate option IDs should be rejected")


def test_verifier_rejects_numeric_claim_not_in_inputs_or_report():
    request = make_request()
    report = assess_decision(request)
    narrative = build_fallback_narrative(request, report)
    narrative.option_analyses[0].main_tradeoff += " Another estimate is NPR 999,999."
    ok, message = validate_narrative(narrative, request, report)
    assert not ok
    assert "numeric value" in message.lower()


def test_verifier_allows_absolute_magnitude_of_reported_conflict():
    request = make_request(options=[
        {"id": "option_job", "name": "Job path", "required_hours_per_week": 80,
         "upfront_cost_npr": 1000, "monthly_cost_npr": 100},
        {"id": "option_research", "name": "Research path", "required_hours_per_week": 15,
         "upfront_cost_npr": 1000, "monthly_cost_npr": 100},
    ])
    report = assess_decision(request)
    narrative = build_fallback_narrative(request, report)
    narrative.summary = "The overloaded path has a 7-hour weekly shortfall under these assumptions."
    ok, message = validate_narrative(narrative, request, report)
    assert ok, message
