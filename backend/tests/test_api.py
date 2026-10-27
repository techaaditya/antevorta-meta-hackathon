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
