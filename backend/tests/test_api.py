from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def payload():
    return {
        "question": "Should I pursue a research role or job?",
        "horizon_months": 12,
        "weekly_maintenance_hours": 60,
        "existing_commitments_hours": 35,
        "savings_npr": 200000,
        "monthly_surplus_npr": 10000,
        "options": [
            {"id": "option_job", "name": "Job", "required_hours_per_week": 40,
             "upfront_cost_npr": 20000, "monthly_cost_npr": 5000},
            {"id": "option_research", "name": "Research", "required_hours_per_week": 20,
             "upfront_cost_npr": 50000, "monthly_cost_npr": 10000},
        ],
        "important_unknowns": ["Is the role flexible?"],
        "reversible_experiment": "Ask for a one-week trial task.",
    }


def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_analyze_returns_clear_fallback_when_no_key_configured(monkeypatch):
    monkeypatch.setattr("backend.app.main.MODEL_API_KEY", "")
    response = client.post("/api/analyze", json=payload())
    assert response.status_code == 200
    body = response.json()
    assert body["analysis_mode"] == "deterministic_fallback"
    assert body["verifier_status"] == "fallback"
    assert len(body["narrative"]["option_analyses"]) == 2
    assert "no Meta model response" in body["narrative"]["caveat"]


def test_duplicate_options_rejected():
    data = payload()
    data["options"][1]["id"] = data["options"][0]["id"]
    response = client.post("/api/analyze", json=data)
    assert response.status_code == 422


def test_analysis_rate_limit_is_enforced(monkeypatch):
    from backend.app import main
    monkeypatch.setattr(main, "MODEL_API_KEY", "")
    monkeypatch.setattr(main, "MAX_ANALYSES_PER_MINUTE", 1)
    main._analysis_timestamps.clear()
    first = client.post("/api/analyze", json=payload())
    second = client.post("/api/analyze", json=payload())
    assert first.status_code == 200
    assert second.status_code == 429
    main._analysis_timestamps.clear()


def test_meta_status():
    response = client.get("/api/meta-status")
    assert response.status_code == 200
    data = response.json()
    assert "configured" in data
    assert "message" in data


def test_analyze_full_response_structure(monkeypatch):
    monkeypatch.setattr("backend.app.main.MODEL_API_KEY", "")
    p = payload()
    p["options"][0]["prerequisites"] = ["[x] Verified contract", "Obtain equipment"]
    response = client.post("/api/analyze", json=p)
    assert response.status_code == 200
    body = response.json()
    assert "constraints" in body
    constraints = body["constraints"]
    assert "known_facts" in constraints
    assert "user_assumptions" in constraints
    assert len(constraints["known_facts"]) > 0
    assert len(constraints["user_assumptions"]) > 0

    first_opt = constraints["option_assessments"][0]
    assert "Verified contract" in first_opt["verified_prerequisites"]
    assert "Obtain equipment" in first_opt["prerequisites_to_verify"]
    assert "breakeven_monthly_surplus_npr" in first_opt


def test_analyze_rejects_negative_costs():
    p = payload()
    p["options"][0]["upfront_cost_npr"] = -500
    response = client.post("/api/analyze", json=p)
    assert response.status_code == 422


def test_analyze_rejects_empty_question():
    p = payload()
    p["question"] = "Short"
    response = client.post("/api/analyze", json=p)
    assert response.status_code == 422



def test_recalculate_endpoint_computes_updated_constraints_and_diff():
    base = payload()
    body = {
        "base_request": base,
        "overrides": {
            "savings_npr": 500000,
            "existing_commitments_hours": 20,
        }
    }
    response = client.post("/api/recalculate", json=body)
    assert response.status_code == 200
    data = response.json()
    assert "updated_constraints" in data
    assert "diff" in data
    diff = data["diff"]
    assert "savings_npr" in diff["changed_assumptions"]
    assert diff["changed_assumptions"]["savings_npr"]["previous"] == 200000
    assert diff["changed_assumptions"]["savings_npr"]["updated"] == 500000
    assert diff["capacity_delta_hours"] == 15.0  # from 35h to 20h commitments (+15h capacity)
    assert "option_job" in diff["option_deltas"]
    assert diff["option_deltas"]["option_job"]["time_headroom_delta_hours"] == 15.0


def test_recalculate_endpoint_rejects_invalid_overrides():
    base = payload()
    body = {
        "base_request": base,
        "overrides": {
            "weekly_maintenance_hours": -10,  # invalid negative hours
        }
    }
    response = client.post("/api/recalculate", json=body)
    assert response.status_code == 422


def test_analyze_rejects_fewer_than_two_options():
    p = payload()
    p["options"] = [p["options"][0]]  # only 1 option
    response = client.post("/api/analyze", json=p)
    assert response.status_code == 422


def test_analyze_rejects_more_than_three_options():
    p = payload()
    p["options"].append({"id": "option_three", "name": "Option 3", "required_hours_per_week": 10})
    p["options"].append({"id": "option_four", "name": "Option 4", "required_hours_per_week": 10})
    response = client.post("/api/analyze", json=p)
    assert response.status_code == 422


def test_cors_headers_configured():
    response = client.options("/api/health", headers={
        "Origin": "http://localhost:5173",
        "Access-Control-Request-Method": "GET",
    })
    assert response.status_code == 200
    assert "access-control-allow-origin" in response.headers


def test_extreme_boundary_hours_handled_as_capacity_conflict():
    p = payload()
    p["weekly_maintenance_hours"] = 120.0
    p["existing_commitments_hours"] = 60.0  # 120 + 60 = 180 > 168 hours in a week
    response = client.post("/api/analyze", json=p)
    assert response.status_code == 200
    body = response.json()
    assert body["constraints"]["weekly_capacity_hours"] == -12.0
    assert body["constraints"]["overall_status"] == "CONFLICT"
