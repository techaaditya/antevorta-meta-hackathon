import os
import tempfile
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.schemas import DecisionInput, AnalysisResponse
from backend.app.services.constraint_engine import assess_decision
from backend.app.services.narrative import build_fallback_narrative
from backend.app.db import (
    apply_migrations, register_user, authenticate_token, create_decision,
    add_decision_revision, list_user_decisions, get_decision_details,
    delete_decision, export_all_user_data, purge_user_account,
    NotFoundError, OwnershipError, DatabaseError, get_db,
)

client = TestClient(app)


def make_sample_data():
    req = DecisionInput.model_validate({
        "question": "Should I pursue academic research or take a job?",
        "horizon_months": 12,
        "weekly_maintenance_hours": 60,
        "existing_commitments_hours": 30,
        "savings_npr": 200000,
        "monthly_surplus_npr": 10000,
        "options": [
            {"id": "option_job", "name": "Job", "required_hours_per_week": 40,
             "upfront_cost_npr": 20000, "monthly_cost_npr": 5000},
            {"id": "option_research", "name": "Research", "required_hours_per_week": 20,
             "upfront_cost_npr": 50000, "monthly_cost_npr": 10000},
        ],
    })
    constraints = assess_decision(req)
    narrative = build_fallback_narrative(req, constraints)
    resp = AnalysisResponse(
        generated_at="2026-10-28T00:00:00Z",
        analysis_mode="deterministic_fallback",
        model_id=None,
        provider_status="fallback",
        question=req.question,
        constraints=constraints,
        narrative=narrative,
        tool_trace=[],
        verifier_status="fallback",
    )
    return req, resp


@pytest.fixture
def temp_db():
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    apply_migrations(path)
    yield path
    try:
        if os.path.exists(path):
            os.remove(path)
    except (PermissionError, OSError):
        pass


def test_migrations_are_idempotent(temp_db):
    second_run = apply_migrations(temp_db)
    assert second_run == 0
    with get_db(temp_db) as conn:
        rows = conn.execute("SELECT version FROM schema_migrations;").fetchall()
        assert len(rows) >= 1


def test_user_registration_and_token_auth(temp_db):
    user = register_user("test@example.com", "secret-token-123", db_path=temp_db)
    assert user["email"] == "test@example.com"
    assert user["id"].startswith("user_")

    # Correct token authenticates
    authed = authenticate_token("secret-token-123", db_path=temp_db)
    assert authed is not None
    assert authed["id"] == user["id"]

    # Wrong token fails
    wrong = authenticate_token("wrong-token", db_path=temp_db)
    assert wrong is None

    # Duplicate email rejected
    with pytest.raises(DatabaseError):
        register_user("test@example.com", "another-token", db_path=temp_db)


def test_decision_lifecycle_and_versioned_revisions(temp_db):
    user = register_user("alice@example.com", "alice-key", db_path=temp_db)
    req, resp = make_sample_data()

    # Create v1
    dec = create_decision(user["id"], req, resp, db_path=temp_db)
    assert dec["latest_version"] == 1
    dec_id = dec["id"]

    # Add v2 revision with modified assumption
    req2 = req.model_copy(update={"savings_npr": 350000})
    rev2 = add_decision_revision(user["id"], dec_id, req2, resp, db_path=temp_db)
    assert rev2["version_number"] == 2

    # Fetch details
    details = get_decision_details(user["id"], dec_id, db_path=temp_db)
    assert details["title"] == req.question
    assert len(details["revisions"]) == 2
    assert details["revisions"][0]["version_number"] == 1
    assert details["revisions"][1]["version_number"] == 2
    assert details["revisions"][1]["payload"]["savings_npr"] == 350000


def test_strict_ownership_and_idor_prevention(temp_db):
    alice = register_user("alice@test.com", "alice-token", db_path=temp_db)
    bob = register_user("bob@test.com", "bob-token", db_path=temp_db)
    req, resp = make_sample_data()

    # Alice creates a decision
    alice_dec = create_decision(alice["id"], req, resp, db_path=temp_db)
    dec_id = alice_dec["id"]

    # Bob tries to access Alice's decision -> OwnershipError
    with pytest.raises(OwnershipError):
        get_decision_details(bob["id"], dec_id, db_path=temp_db)

    # Bob tries to add a revision to Alice's decision -> OwnershipError
    with pytest.raises(OwnershipError):
        add_decision_revision(bob["id"], dec_id, req, resp, db_path=temp_db)

    # Bob tries to delete Alice's decision -> OwnershipError
    with pytest.raises(OwnershipError):
        delete_decision(bob["id"], dec_id, db_path=temp_db)

    # Bob's decision list does not show Alice's decision
    bob_list = list_user_decisions(bob["id"], db_path=temp_db)
    assert len(bob_list) == 0


def test_privacy_export_and_cascade_purge(temp_db):
    user = register_user("carol@test.com", "carol-token", db_path=temp_db)
    req, resp = make_sample_data()
    dec = create_decision(user["id"], req, resp, db_path=temp_db)

    # Export user data
    exported = export_all_user_data(user["id"], db_path=temp_db)
    assert exported["user"]["email"] == "carol@test.com"
    assert len(exported["decisions"]) == 1
    assert exported["decisions"][0]["id"] == dec["id"]

    # Purge account
    purged = purge_user_account(user["id"], db_path=temp_db)
    assert purged is True

    # After purge, user and decisions are completely gone
    assert authenticate_token("carol-token", db_path=temp_db) is None
    with get_db(temp_db) as conn:
        assert conn.execute("SELECT count(*) as c FROM decisions WHERE id = ?;", (dec["id"],)).fetchone()["c"] == 0
        assert conn.execute("SELECT count(*) as c FROM decision_revisions WHERE decision_id = ?;", (dec["id"],)).fetchone()["c"] == 0


def test_api_authenticated_workflow_and_idor(monkeypatch, temp_db):
    # Route database calls in main app to temp_db
    monkeypatch.setattr("backend.app.db.DATABASE_PATH", temp_db)

    # 1. Register Alice and Bob
    r_alice = client.post("/api/auth/register", json={"email": "alice_api@test.com", "token": "token-alice-secret-123"})
    assert r_alice.status_code == 201

    r_bob = client.post("/api/auth/register", json={"email": "bob_api@test.com", "token": "token-bob-secret-456"})
    assert r_bob.status_code == 201

    alice_headers = {"Authorization": "Bearer token-alice-secret-123"}
    bob_headers = {"Authorization": "Bearer token-bob-secret-456"}

    # 2. Check /api/auth/me
    me_resp = client.get("/api/auth/me", headers=alice_headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["user"]["email"] == "alice_api@test.com"

    # Unauthorized access check
    unauth = client.get("/api/auth/me", headers={"Authorization": "Bearer bad-token"})
    assert unauth.status_code == 401

    # 3. Alice saves a decision
    req, resp = make_sample_data()
    save_resp = client.post(
        "/api/decisions",
        json={"input_data": req.model_dump(), "analysis_data": resp.model_dump()},
        headers=alice_headers,
    )
    assert save_resp.status_code == 201
    dec_id = save_resp.json()["id"]

    # 4. Bob tries to access Alice's decision via API -> 403 Forbidden
    bob_access = client.get(f"/api/decisions/{dec_id}", headers=bob_headers)
    assert bob_access.status_code == 403

    # 5. Bob tries to add a revision to Alice's decision -> 403 Forbidden
    bob_rev = client.post(
        f"/api/decisions/{dec_id}/revisions",
        json={"input_data": req.model_dump(), "analysis_data": resp.model_dump()},
        headers=bob_headers,
    )
    assert bob_rev.status_code == 403

    # 6. Alice can add a revision
    req_v2 = req.model_copy(update={"savings_npr": 300000})
    alice_rev = client.post(
        f"/api/decisions/{dec_id}/revisions",
        json={"input_data": req_v2.model_dump(), "analysis_data": resp.model_dump()},
        headers=alice_headers,
    )
    assert alice_rev.status_code == 201
    assert alice_rev.json()["version_number"] == 2

    # 7. Privacy export
    export_resp = client.get("/api/privacy/export", headers=alice_headers)
    assert export_resp.status_code == 200
    export_data = export_resp.json()
    assert len(export_data["decisions"]) == 1
    assert len(export_data["decisions"][0]["revisions"]) == 2

    # 8. Privacy account purge
    purge_resp = client.delete("/api/privacy/account", headers=alice_headers)
    assert purge_resp.status_code == 200

    # Alice's token is now invalid
    me_after = client.get("/api/auth/me", headers=alice_headers)
    assert me_after.status_code == 401
