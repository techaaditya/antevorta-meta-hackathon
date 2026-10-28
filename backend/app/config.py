from __future__ import annotations

import os
from pathlib import Path

try:
    from dotenv import load_dotenv
except ImportError:  # Allows pure unit tests before installing every dependency.
    load_dotenv = None

ROOT_DIR = Path(__file__).resolve().parents[2]
if load_dotenv:
    load_dotenv(ROOT_DIR / ".env")

MODEL_API_KEY = os.getenv("MODEL_API_KEY", "").strip()
META_MODEL_BASE_URL = os.getenv("META_MODEL_BASE_URL", "https://api.meta.ai/v1").rstrip("/")
META_MODEL_ID = os.getenv("META_MODEL_ID", "muse-spark-1.3").strip()
META_API_TIMEOUT_SECONDS = float(os.getenv("META_API_TIMEOUT_SECONDS", "35"))
META_MAX_TOOL_TURNS = max(1, min(int(os.getenv("META_MAX_TOOL_TURNS", "4")), 5))
META_MAX_TOOL_CALLS = max(1, min(int(os.getenv("META_MAX_TOOL_CALLS", "8")), 10))
APP_ENV = os.getenv("APP_ENV", "development").strip().lower()
MAX_ANALYSES_PER_MINUTE = max(1, min(int(os.getenv("MAX_ANALYSES_PER_MINUTE", "20")), 300))
DATABASE_PATH = os.getenv("DATABASE_PATH", str(ROOT_DIR / "antevorta.db")).strip()
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if origin.strip()
]
