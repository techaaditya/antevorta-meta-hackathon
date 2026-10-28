from __future__ import annotations

import hashlib
import json
import os
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from contextlib import contextmanager

from backend.app.config import DATABASE_PATH
from backend.app.schemas import DecisionInput, AnalysisResponse


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _hash_token(token: str) -> str:
    """Hash token with a deterministic SHA-256 for lookup."""
    return hashlib.sha256(token.strip().encode("utf-8")).hexdigest()


@contextmanager
def get_db(db_path: str | None = None):
    target = db_path or DATABASE_PATH
    conn = sqlite3.connect(target)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


MIGRATIONS: list[tuple[int, str]] = [
    (1, """
    CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        token_hash TEXT UNIQUE NOT NULL,
        created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS decisions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_decisions_user_id ON decisions(user_id);

    CREATE TABLE IF NOT EXISTS decision_revisions (
        id TEXT PRIMARY KEY,
        decision_id TEXT NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
        version_number INTEGER NOT NULL,
        payload TEXT NOT NULL,
        analysis_result TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE (decision_id, version_number)
    );

    CREATE INDEX IF NOT EXISTS idx_revisions_decision_id ON decision_revisions(decision_id);
    """),
    (2, """
    CREATE TABLE IF NOT EXISTS claims (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        predicate TEXT NOT NULL,
        object TEXT NOT NULL,
        domain TEXT NOT NULL,
        stated_support REAL NOT NULL DEFAULT 0.0,
        revealed_support REAL NOT NULL DEFAULT 0.0,
        half_life_days INTEGER NOT NULL DEFAULT 180,
        user_disputed INTEGER NOT NULL DEFAULT 0,
        user_excluded INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        last_updated TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_claims_user_id ON claims(user_id);

    CREATE TABLE IF NOT EXISTS predictions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        decision_id TEXT REFERENCES decisions(id) ON DELETE SET NULL,
        statement TEXT NOT NULL,
        resolution_criteria TEXT NOT NULL,
        resolution_source TEXT NOT NULL DEFAULT 'manual_checkin',
        domain TEXT NOT NULL,
        horizon_days INTEGER NOT NULL,
        due_at TEXT NOT NULL,
        p_twin REAL NOT NULL,
        p_generic REAL NOT NULL,
        p_baserate REAL,
        qualitative_band TEXT NOT NULL,
        resolved INTEGER NOT NULL DEFAULT 0,
        outcome INTEGER,
        resolved_at TEXT,
        resolution_note TEXT,
        created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_predictions_user_id ON predictions(user_id);
    """)
]


def apply_migrations(db_path: str | None = None) -> int:
    """Apply any pending database migrations in order."""
    with get_db(db_path) as conn:
        conn.execute("CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);")
        applied_rows = conn.execute("SELECT version FROM schema_migrations ORDER BY version;").fetchall()
        applied_versions = {row["version"] for row in applied_rows}

        count = 0
        for version, sql in MIGRATIONS:
            if version not in applied_versions:
                conn.executescript(sql)
                conn.execute("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?);", (version, _utc_now()))
                count += 1
        return count


class DatabaseError(RuntimeError):
    pass


class NotFoundError(DatabaseError):
    pass


class OwnershipError(DatabaseError):
    pass


# -----------------------------------------------------------------------------
# User management & Authentication
# -----------------------------------------------------------------------------

def register_user(email: str, raw_token: str, db_path: str | None = None) -> dict[str, Any]:
    """Register a new user account with a secret token."""
    user_id = f"user_{uuid.uuid4().hex[:16]}"
    token_hash = _hash_token(raw_token)
    now = _utc_now()

    with get_db(db_path) as conn:
        try:
            conn.execute(
                "INSERT INTO users (id, email, token_hash, created_at) VALUES (?, ?, ?, ?);",
                (user_id, email.strip().lower(), token_hash, now),
            )
        except sqlite3.IntegrityError as exc:
            raise DatabaseError("User with this email or token already exists.") from exc
    return {"id": user_id, "email": email.strip().lower(), "created_at": now}


def authenticate_token(raw_token: str, db_path: str | None = None) -> dict[str, Any] | None:
    """Authenticate user by raw token hash. Returns user dict or None."""
    token_hash = _hash_token(raw_token)
    with get_db(db_path) as conn:
        row = conn.execute("SELECT id, email, created_at FROM users WHERE token_hash = ?;", (token_hash,)).fetchone()
        if not row:
            return None
        return dict(row)


# -----------------------------------------------------------------------------
# Decision Persistence & Versioned Assumptions
# -----------------------------------------------------------------------------

def create_decision(
    user_id: str,
    input_data: DecisionInput,
    analysis_data: AnalysisResponse,
    db_path: str | None = None,
) -> dict[str, Any]:
    """Save a new decision and its initial revision (v1)."""
    decision_id = f"dec_{uuid.uuid4().hex[:16]}"
    revision_id = f"rev_{uuid.uuid4().hex[:16]}"
    now = _utc_now()
    title = input_data.question[:120].strip()

    payload_json = json.dumps(input_data.model_dump(), ensure_ascii=False)
    analysis_json = json.dumps(analysis_data.model_dump(), ensure_ascii=False)

    with get_db(db_path) as conn:
        conn.execute(
            "INSERT INTO decisions (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?);",
            (decision_id, user_id, title, now, now),
        )
        conn.execute(
            """INSERT INTO decision_revisions 
               (id, decision_id, version_number, payload, analysis_result, created_at) 
               VALUES (?, ?, ?, ?, ?, ?);""",
            (revision_id, decision_id, 1, payload_json, analysis_json, now),
        )

    return {
        "id": decision_id,
        "title": title,
        "latest_version": 1,
        "created_at": now,
        "updated_at": now,
    }


def add_decision_revision(
    user_id: str,
    decision_id: str,
    input_data: DecisionInput,
    analysis_data: AnalysisResponse,
    db_path: str | None = None,
) -> dict[str, Any]:
    """Add a versioned assumption revision to an existing decision with ownership check."""
    now = _utc_now()
    with get_db(db_path) as conn:
        # Verify ownership
        row = conn.execute("SELECT user_id, title FROM decisions WHERE id = ?;", (decision_id,)).fetchone()
        if not row:
            raise NotFoundError("Decision not found.")
        if row["user_id"] != user_id:
            raise OwnershipError("Access forbidden: you do not own this decision.")

        # Determine next version number
        ver_row = conn.execute(
            "SELECT MAX(version_number) as max_ver FROM decision_revisions WHERE decision_id = ?;",
            (decision_id,),
        ).fetchone()
        next_ver = (ver_row["max_ver"] or 0) + 1

        revision_id = f"rev_{uuid.uuid4().hex[:16]}"
        payload_json = json.dumps(input_data.model_dump(), ensure_ascii=False)
        analysis_json = json.dumps(analysis_data.model_dump(), ensure_ascii=False)

        conn.execute(
            """INSERT INTO decision_revisions 
               (id, decision_id, version_number, payload, analysis_result, created_at) 
               VALUES (?, ?, ?, ?, ?, ?);""",
            (revision_id, decision_id, next_ver, payload_json, analysis_json, now),
        )
        conn.execute("UPDATE decisions SET updated_at = ? WHERE id = ?;", (now, decision_id))

    return {
        "decision_id": decision_id,
        "revision_id": revision_id,
        "version_number": next_ver,
        "created_at": now,
    }


def list_user_decisions(user_id: str, db_path: str | None = None) -> list[dict[str, Any]]:
    """List all decisions owned by the user."""
    with get_db(db_path) as conn:
        rows = conn.execute(
            """SELECT d.id, d.title, d.created_at, d.updated_at, 
                      COUNT(r.id) as revision_count, MAX(r.version_number) as latest_version
               FROM decisions d
               LEFT JOIN decision_revisions r ON d.id = r.decision_id
               WHERE d.user_id = ?
               GROUP BY d.id
               ORDER BY d.updated_at DESC;""",
            (user_id,),
        ).fetchall()
        return [dict(row) for row in rows]


def get_decision_details(user_id: str, decision_id: str, db_path: str | None = None) -> dict[str, Any]:
    """Retrieve decision and full revision history with strict ownership check."""
    with get_db(db_path) as conn:
        dec_row = conn.execute("SELECT id, user_id, title, created_at, updated_at FROM decisions WHERE id = ?;", (decision_id,)).fetchone()
        if not dec_row:
            raise NotFoundError("Decision not found.")
        if dec_row["user_id"] != user_id:
            raise OwnershipError("Access forbidden: you do not own this decision.")

        revisions_rows = conn.execute(
            """SELECT id, version_number, payload, analysis_result, created_at 
               FROM decision_revisions 
               WHERE decision_id = ? 
               ORDER BY version_number ASC;""",
            (decision_id,),
        ).fetchall()

        revisions = []
        for r in revisions_rows:
            revisions.append({
                "id": r["id"],
                "version_number": r["version_number"],
                "payload": json.loads(r["payload"]),
                "analysis_result": json.loads(r["analysis_result"]),
                "created_at": r["created_at"],
            })

        return {
            "id": dec_row["id"],
            "title": dec_row["title"],
            "created_at": dec_row["created_at"],
            "updated_at": dec_row["updated_at"],
            "revisions": revisions,
        }


def delete_decision(user_id: str, decision_id: str, db_path: str | None = None) -> bool:
    """Delete a decision and all its revisions with strict ownership check."""
    with get_db(db_path) as conn:
        row = conn.execute("SELECT user_id FROM decisions WHERE id = ?;", (decision_id,)).fetchone()
        if not row:
            raise NotFoundError("Decision not found.")
        if row["user_id"] != user_id:
            raise OwnershipError("Access forbidden: you do not own this decision.")

        conn.execute("DELETE FROM decisions WHERE id = ?;", (decision_id,))
        return True


# -----------------------------------------------------------------------------
# Phase 9: Person Model Claims (L3) Database Operations
# -----------------------------------------------------------------------------

def create_claim(
    user_id: str,
    predicate: str,
    object_: str,
    domain: str,
    stated_support: float = 0.8,
    revealed_support: float = 0.5,
    half_life_days: int = 180,
    db_path: str | None = None,
) -> dict[str, Any]:
    claim_id = f"clm_{uuid.uuid4().hex[:12]}"
    now = _utc_now()
    with get_db(db_path) as conn:
        conn.execute(
            """INSERT INTO claims (id, user_id, predicate, object, domain, stated_support, revealed_support, half_life_days, user_disputed, user_excluded, created_at, last_updated)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?);""",
            (claim_id, user_id, predicate, object_, domain, stated_support, revealed_support, half_life_days, now, now),
        )
        return {
            "id": claim_id,
            "user_id": user_id,
            "predicate": predicate,
            "object": object_,
            "domain": domain,
            "stated_support": stated_support,
            "revealed_support": revealed_support,
            "half_life_days": half_life_days,
            "user_disputed": False,
            "user_excluded": False,
            "created_at": now,
            "last_updated": now,
        }


def list_claims(user_id: str, include_excluded: bool = False, db_path: str | None = None) -> list[dict[str, Any]]:
    with get_db(db_path) as conn:
        query = "SELECT * FROM claims WHERE user_id = ?"
        if not include_excluded:
            query += " AND user_excluded = 0"
        query += " ORDER BY created_at DESC;"
        rows = conn.execute(query, (user_id,)).fetchall()
        return [
            {
                "id": r["id"],
                "user_id": r["user_id"],
                "predicate": r["predicate"],
                "object": r["object"],
                "domain": r["domain"],
                "stated_support": r["stated_support"],
                "revealed_support": r["revealed_support"],
                "half_life_days": r["half_life_days"],
                "user_disputed": bool(r["user_disputed"]),
                "user_excluded": bool(r["user_excluded"]),
                "created_at": r["created_at"],
                "last_updated": r["last_updated"],
            }
            for r in rows
        ]


def dispute_claim(user_id: str, claim_id: str, db_path: str | None = None) -> bool:
    with get_db(db_path) as conn:
        row = conn.execute("SELECT user_id, user_disputed FROM claims WHERE id = ?;", (claim_id,)).fetchone()
        if not row:
            raise NotFoundError("Claim not found.")
        if row["user_id"] != user_id:
            raise OwnershipError("Access forbidden: you do not own this claim.")
        new_val = 0 if row["user_disputed"] else 1
        conn.execute("UPDATE claims SET user_disputed = ?, last_updated = ? WHERE id = ?;", (new_val, _utc_now(), claim_id))
        return True


def exclude_claim(user_id: str, claim_id: str, db_path: str | None = None) -> bool:
    with get_db(db_path) as conn:
        row = conn.execute("SELECT user_id, user_excluded FROM claims WHERE id = ?;", (claim_id,)).fetchone()
        if not row:
            raise NotFoundError("Claim not found.")
        if row["user_id"] != user_id:
            raise OwnershipError("Access forbidden: you do not own this claim.")
        new_val = 0 if row["user_excluded"] else 1
        conn.execute("UPDATE claims SET user_excluded = ?, last_updated = ? WHERE id = ?;", (new_val, _utc_now(), claim_id))
        return True


def delete_claim(user_id: str, claim_id: str, db_path: str | None = None) -> bool:
    with get_db(db_path) as conn:
        row = conn.execute("SELECT user_id FROM claims WHERE id = ?;", (claim_id,)).fetchone()
        if not row:
            raise NotFoundError("Claim not found.")
        if row["user_id"] != user_id:
            raise OwnershipError("Access forbidden: you do not own this claim.")
        conn.execute("DELETE FROM claims WHERE id = ?;", (claim_id,))
        return True


# -----------------------------------------------------------------------------
# Phase 9: Calibration Mirror & Predictions (L4A) Database Operations
# -----------------------------------------------------------------------------

def create_prediction_record(
    user_id: str,
    statement: str,
    resolution_criteria: str,
    resolution_source: str,
    domain: str,
    horizon_days: int,
    due_at: str,
    p_twin: float,
    p_generic: float,
    p_baserate: float | None,
    qualitative_band: str,
    decision_id: str | None = None,
    db_path: str | None = None,
) -> dict[str, Any]:
    pred_id = f"pred_{uuid.uuid4().hex[:12]}"
    now = _utc_now()
    with get_db(db_path) as conn:
        conn.execute(
            """INSERT INTO predictions (id, user_id, decision_id, statement, resolution_criteria, resolution_source, domain, horizon_days, due_at, p_twin, p_generic, p_baserate, qualitative_band, resolved, outcome, resolved_at, resolution_note, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, NULL, NULL, ?);""",
            (pred_id, user_id, decision_id, statement, resolution_criteria, resolution_source, domain, horizon_days, due_at, p_twin, p_generic, p_baserate, qualitative_band, now),
        )
        return {
            "id": pred_id,
            "user_id": user_id,
            "decision_id": decision_id,
            "statement": statement,
            "resolution_criteria": resolution_criteria,
            "resolution_source": resolution_source,
            "domain": domain,
            "horizon_days": horizon_days,
            "due_at": due_at,
            "p_twin": p_twin,
            "p_generic": p_generic,
            "p_baserate": p_baserate,
            "qualitative_band": qualitative_band,
            "resolved": False,
            "outcome": None,
            "resolved_at": None,
            "resolution_note": None,
            "brier_twin": None,
            "brier_generic": None,
            "created_at": now,
        }


def list_predictions(user_id: str, db_path: str | None = None) -> list[dict[str, Any]]:
    with get_db(db_path) as conn:
        rows = conn.execute("SELECT * FROM predictions WHERE user_id = ? ORDER BY created_at DESC;", (user_id,)).fetchall()
        results = []
        for r in rows:
            resolved = bool(r["resolved"])
            outcome = bool(r["outcome"]) if r["outcome"] is not None else None
            b_twin = None
            b_generic = None
            if resolved and outcome is not None:
                y = 1.0 if outcome else 0.0
                b_twin = round((r["p_twin"] - y) ** 2, 4)
                b_generic = round((r["p_generic"] - y) ** 2, 4)
            results.append({
                "id": r["id"],
                "user_id": r["user_id"],
                "decision_id": r["decision_id"],
                "statement": r["statement"],
                "resolution_criteria": r["resolution_criteria"],
                "resolution_source": r["resolution_source"],
                "domain": r["domain"],
                "horizon_days": r["horizon_days"],
                "due_at": r["due_at"],
                "p_twin": r["p_twin"],
                "p_generic": r["p_generic"],
                "p_baserate": r["p_baserate"],
                "qualitative_band": r["qualitative_band"],
                "resolved": resolved,
                "outcome": outcome,
                "resolved_at": r["resolved_at"],
                "resolution_note": r["resolution_note"],
                "brier_twin": b_twin,
                "brier_generic": b_generic,
                "created_at": r["created_at"],
            })
        return results


def resolve_prediction_record(
    user_id: str,
    prediction_id: str,
    outcome: bool,
    resolution_note: str = "",
    db_path: str | None = None,
) -> dict[str, Any]:
    now = _utc_now()
    with get_db(db_path) as conn:
        row = conn.execute("SELECT user_id, p_twin, p_generic FROM predictions WHERE id = ?;", (prediction_id,)).fetchone()
        if not row:
            raise NotFoundError("Prediction not found.")
        if row["user_id"] != user_id:
            raise OwnershipError("Access forbidden: you do not own this prediction.")
        conn.execute(
            """UPDATE predictions 
               SET resolved = 1, outcome = ?, resolved_at = ?, resolution_note = ? 
               WHERE id = ?;""",
            (1 if outcome else 0, now, resolution_note, prediction_id),
        )
        y = 1.0 if outcome else 0.0
        return {
            "id": prediction_id,
            "resolved": True,
            "outcome": outcome,
            "resolved_at": now,
            "brier_twin": round((row["p_twin"] - y) ** 2, 4),
            "brier_generic": round((row["p_generic"] - y) ** 2, 4),
        }


# -----------------------------------------------------------------------------
# Privacy-conscious Export & Total Account Data Purge
# -----------------------------------------------------------------------------

def export_all_user_data(user_id: str, db_path: str | None = None) -> dict[str, Any]:
    """Export complete decision, claims, and prediction history for a user."""
    with get_db(db_path) as conn:
        user_row = conn.execute("SELECT id, email, created_at FROM users WHERE id = ?;", (user_id,)).fetchone()
        if not user_row:
            raise NotFoundError("User not found.")

        decisions_data = []
        decisions = list_user_decisions(user_id, db_path)
        for dec in decisions:
            details = get_decision_details(user_id, dec["id"], db_path)
            decisions_data.append(details)

        claims = list_claims(user_id, include_excluded=True, db_path=db_path)
        predictions = list_predictions(user_id, db_path=db_path)

        return {
            "exported_at": _utc_now(),
            "user": dict(user_row),
            "decisions": decisions_data,
            "claims": claims,
            "predictions": predictions,
        }


def purge_user_account(user_id: str, db_path: str | None = None) -> bool:
    """Cascade purge all user records, decisions, and revisions."""
    with get_db(db_path) as conn:
        user_row = conn.execute("SELECT id FROM users WHERE id = ?;", (user_id,)).fetchone()
        if not user_row:
            raise NotFoundError("User not found.")
        # Cascades to decisions and decision_revisions via foreign keys
        conn.execute("DELETE FROM users WHERE id = ?;", (user_id,))
        return True
