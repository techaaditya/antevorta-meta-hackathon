# Environment and Troubleshooting

## Minimal environment

- Python 3.11+ (3.12 is used in CI)
- Node 22+ (22.12+ recommended)
- Meta Model API key for live agent tests; local fallback works without it

## Backend startup

From repo root:

```bash
python -m venv .venv
# Linux/WSL:
source .venv/bin/activate
# Windows PowerShell instead: .venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r backend/requirements.txt
cp .env.example .env  # PowerShell: Copy-Item .env.example .env
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

## Frontend startup

```bash
cd frontend
npm install
npm run dev
```

## Smoke test / quality gates

```bash
# From repository root, with backend dependencies installed
pytest -q
python scripts/check_meta_api.py  # requires MODEL_API_KEY in .env

# From frontend/
npm run build
```

## Known modes

- `deterministic_fallback`: key missing, provider unavailable, tool call loop incomplete, or generated output invalid. This is useful and honest; it is not a live model result.
- `meta_agent`: at least one real allow-listed tool was called, the narrative parsed, every option was covered exactly once, and the deterministic verifier passed.

## Troubleshooting

| Symptom | What to check |
|---|---|
| UI says backend not reachable | Start Uvicorn on `127.0.0.1:8000`; check `/api/health`; inspect browser console |
| API key missing | Set `MODEL_API_KEY` in root `.env`, restart the backend; never set it as a `VITE_*` variable |
| Model request rejected | Confirm model ID, key scope, account billing, current official docs and request schema |
| Model responds without tool calls | The agent returns fallback rather than claiming a tool-assisted run; inspect actual returned trace |
| Output was rejected | Inspect validation summary in provider status; improve prompt or schema without weakening guards |
| npm install stalls | Check DNS/proxy/registry access, try a normal network, then `npm install --no-audit --no-fund` |
| Blank UI / build errors | Run `npm run build`, read the first TypeScript error, fix that before adding features |
| API spend rises unexpectedly | Check Meta billing, use a spend alert, reduce repeated runs, keep tool and output budgets bounded |

## API safety settings

`MAX_ANALYSES_PER_MINUTE` defaults to 20 POST analyses per rolling minute per backend process. This guard helps prevent accidental runaway spend during a small demo but is not a full abuse-prevention layer, especially behind a proxy or across multiple workers. Use your host's managed rate limiting before public launch.

## Key handling

Never paste a real API key into chat, Git, issues, screenshots, source files, or a browser `.env`. If it leaks, revoke and replace it through the provider dashboard. `.env` is ignored by Git; `.env.example` is safe to commit.
