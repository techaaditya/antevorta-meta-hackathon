#!/usr/bin/env python3
"""Minimal Meta Model API smoke test; never prints the secret key."""
from __future__ import annotations
import os
import sys
from pathlib import Path
try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None
root = Path(__file__).resolve().parents[1]
if load_dotenv:
    load_dotenv(root / ".env")
key = os.getenv("MODEL_API_KEY", "").strip()
if not key:
    print("MODEL_API_KEY is missing. Copy .env.example to .env and set the key.")
    sys.exit(2)
try:
    from openai import OpenAI
except ImportError:
    print("Install backend dependencies first: pip install -r backend/requirements.txt")
    sys.exit(2)
client = OpenAI(api_key=key, base_url=os.getenv("META_MODEL_BASE_URL", "https://api.meta.ai/v1"), timeout=30, max_retries=0)
model = os.getenv("META_MODEL_ID", "muse-spark-1.3")
try:
    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": "Reply in one short sentence confirming the API is reachable."}],
        max_tokens=60,
        temperature=0,
    )
    print(f"API reachable. Model: {model}")
    print(response.choices[0].message.content or "(empty response)")
    if response.usage:
        print(f"Usage reported: prompt={response.usage.prompt_tokens}, completion={response.usage.completion_tokens}")
except Exception as exc:
    print(f"API smoke test failed: {type(exc).__name__}: {str(exc)[:400]}")
    sys.exit(1)
