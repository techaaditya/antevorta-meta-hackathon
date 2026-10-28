import tempfile
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.db import apply_migrations, register_user
from backend.app.services.calibration_engine import (
    compute_prediction_probabilities, register_new_prediction,
    compute_calibration_report, resolve_prediction_record
)
from backend.app.services.person_model import (
    initialize_default_claims_if_empty, calculate_claim_decay_and_divergence,
    get_divergence_report
)
from backend.app.schemas import PredictionCreate

client = TestClient(app)


@pytest.fixture
def test_db_env(monkeypatch):
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path = tmp.name
    apply_migrations(db_path)
    monkeypatch.setattr("backend.app.db.DATABASE_PATH", db_path)
    yield db_path


def test_claim_decay_and_divergence_computation():
    mock_claim = {
        "id": "clm_test1",
        "user_id": "usr_1",
        "predicate": "VALUES",
        "object": "Protect thesis research hours",
        "domain": "academics",
        "stated_support": 0.90,
        "revealed_support": 0.40,  # delta = 0.50 >= 0.35 -> divergent!
        "half_life_days": 180,
        "user_disputed": 0,
        "user_excluded": 0,
        "created_at": "2026-10-01T00:00:00+00:00",
        "last_updated": "2026-10-01T00:00:00+00:00",
    }
    item = calculate_claim_decay_and_divergence(mock_claim)
    assert item.divergence_score == 0.50
    assert item.is_divergent is True
    assert item.effective_support < (0.90 + 0.40) / 2.0  # decayed over time


def test_claims_lifecycle_and_divergence_report(test_db_env):
    user = register_user("researcher@test.np", "secret_token_123", db_path=test_db_env)
    token = "secret_token_123"

    # Initialize default claims
    claims = initialize_default_claims_if_empty(user["id"], db_path=test_db_env)
    assert len(claims) >= 3

    # Divergence report
    divergence_cards = get_divergence_report(user["id"], db_path=test_db_env)
    assert len(divergence_cards) >= 1
    assert "Divergence" in divergence_cards[0].title

    # REST endpoints
    headers = {"Authorization": f"Bearer {token}"}
    res = client.get("/api/claims", headers=headers)
    assert res.status_code == 200
    claims_list = res.json()
    assert len(claims_list) >= 3

    # Dispute claim
    first_id = claims_list[0]["id"]
    dispute_res = client.post(f"/api/claims/{first_id}/dispute", headers=headers)
    assert dispute_res.status_code == 200

    # Exclude claim
    exclude_res = client.post(f"/api/claims/{first_id}/exclude", headers=headers)
    assert exclude_res.status_code == 200

    # Check divergence endpoint
    div_res = client.get("/api/claims/divergence", headers=headers)
    assert div_res.status_code == 200
    assert isinstance(div_res.json(), list)


def test_calibration_mirror_and_brier_skill_score(test_db_env):
    user = register_user("analyst@test.np", "token_calibration_456", db_path=test_db_env)
    token = "token_calibration_456"
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create a prediction
    pred_payload = {
        "statement": "Complete 3 IELTS practice tests before Sunday 23:59 NPT",
        "resolution_criteria": "3 completed scoring rubrics logged in prep workbook",
        "resolution_source": "manual_checkin",
        "domain": "study_prep",
        "horizon_days": 14,
        "due_at": "2026-11-10T23:59:00Z",
    }
    create_res = client.post("/api/predictions", json=pred_payload, headers=headers)
    assert create_res.status_code == 201
    pred_data = create_res.json()
    assert "id" in pred_data
    assert pred_data["p_twin"] > 0.0
    assert pred_data["p_generic"] == 0.50

    pred_id = pred_data["id"]

    # 2. Check initial calibration report with unresolved prediction
    cal_res = client.get("/api/calibration", headers=headers)
    assert cal_res.status_code == 200
    cal_data = cal_res.json()
    assert cal_data["total_predictions"] == 1
    assert cal_data["resolved_predictions"] == 0
    assert cal_data["brier_twin"] is None

    # 3. Resolve the prediction as completed (outcome = True)
    resolve_payload = {
        "outcome": True,
        "resolution_note": "Finished all 3 tests on Friday evening.",
    }
    res_res = client.post(f"/api/predictions/{pred_id}/resolve", json=resolve_payload, headers=headers)
    assert res_res.status_code == 200
    res_data = res_res.json()
    assert res_data["resolved"] is True
    assert res_data["outcome"] is True
    assert "brier_twin" in res_data
    assert "brier_generic" in res_data

    # 4. Check resolved calibration report
    cal_res2 = client.get("/api/calibration", headers=headers)
    assert cal_res2.status_code == 200
    cal_data2 = cal_res2.json()
    assert cal_data2["total_predictions"] == 1
    assert cal_data2["resolved_predictions"] == 1
    assert cal_data2["brier_twin"] is not None
    assert cal_data2["brier_generic"] is not None
    assert cal_data2["brier_skill_score"] is not None
    assert cal_data2["accuracy_rate"] == 100.0


def test_claims_and_predictions_strict_idor_isolation(test_db_env):
    user_a = register_user("user_a@test.np", "token_a_12345678", db_path=test_db_env)
    user_b = register_user("user_b@test.np", "token_b_87654321", db_path=test_db_env)

    # User A creates a prediction
    pred = register_new_prediction(
        user_id=user_a["id"],
        payload=PredictionCreate(
            statement="User A private milestone",
            resolution_criteria="Logged completion",
            due_at="2026-11-15T00:00:00Z",
        ),
        db_path=test_db_env,
    )

    # User B tries to resolve User A's prediction
    headers_b = {"Authorization": "Bearer token_b_87654321"}
    res = client.post(
        f"/api/predictions/{pred['id']}/resolve",
        json={"outcome": False},
        headers=headers_b,
    )
    assert res.status_code == 403  # Forbidden IDOR check
