# Antevorta — Meta Global AI Developer Hackathon Kit

> **Test your decisions before you live them.**

This repository is a focused implementation starter for the Meta Global AI Developer Hackathon. It turns the Antevorta master specification into a buildable, testable product slice: a decision workbench where a Meta model can invoke real tools, deterministic code calculates feasibility, and the model produces conditional scenarios that are checked before display.

**This kit is not a claim that a finished product or live Meta API call has already been verified.** The API path is implemented against Meta's published OpenAI-compatible interface. You must supply your own API key, run the tests, make a real smoke-test call, and verify current account/model access.

## Start here

1. Read [`MASTER_IMPLEMENTATION.md`](MASTER_IMPLEMENTATION.md).
2. Read [`docs/HACKATHON_BRIEF.md`](docs/HACKATHON_BRIEF.md) for rules, rubric, timeline, and submission gates.
3. Follow [`docs/BUILD_PLAN.md`](docs/BUILD_PLAN.md) in order. Do not implement every future feature before the core passes its tests.
4. Review [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/AGENT_AND_TOOL_CONTRACTS.md`](docs/AGENT_AND_TOOL_CONTRACTS.md), [`docs/ARCHITECTURE_DECISIONS.md`](docs/ARCHITECTURE_DECISIONS.md), and [`docs/SOURCE_RECONCILIATION.md`](docs/SOURCE_RECONCILIATION.md).
5. Create `.env` from `.env.example`; never commit your real key.
6. Start the backend and frontend in separate terminals.

## Requirements

- Python 3.11 or newer
- Node.js 22.12+ recommended for the Vite 8 toolchain
- npm
- A Meta Model API account and `MODEL_API_KEY` for live model calls

## Setup on Ubuntu / WSL / Linux

From the repository root:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r backend/requirements.txt
cp .env.example .env
```

Edit `.env` and set `MODEL_API_KEY` to your own key. Start the API:

```bash
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite (usually `http://localhost:5173`). API health: `http://127.0.0.1:8000/api/health`.

## Setup on Windows PowerShell

From the repository root:

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r backend/requirements.txt
Copy-Item .env.example .env
```

Edit `.env`, then run the backend:

```powershell
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

In another terminal:

```powershell
cd frontend
npm install
npm run dev
```

## Run tests / build

```bash
pytest
```

```bash
cd frontend
npm run build
```

## How the API behaves

- If `MODEL_API_KEY` is configured, `/api/analyze` attempts a real Muse Spark tool-calling loop.
- If it is absent or the provider call fails, the endpoint returns an explicitly labelled **deterministic fallback**. It does not pretend AI ran.
- Deterministic constraint calculations always run independently of the model.
- The first version is stateless on the server: it does not write decision payloads to a database. The UI can export a decision report as JSON.

## Important current limitations

- No authentication, database, OAuth integrations, voice, or web research connector is included in this first vertical slice.
- Do not deploy this starter as a public, unrestricted service. Before public deployment, add rate limiting, request-size limits, production secret management, abuse monitoring, and deployment-specific CORS controls. Keep the API key on the server only.
- Model-generated scenarios are suggestions, not advice or predictions. Numeric success probabilities and invented population statistics are prohibited by design.
- The product name “Antevorta” is a working codename, not trademark/domain-cleared branding.

## Useful implementation references

- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — backend/frontend hosting settings and post-deploy smoke tests.
- [`docs/VALIDATION_REPORT.md`](docs/VALIDATION_REPORT.md) — exact checks that have and have not been run in the build environment.
- [`HACKATHON_CHANGELOG.md`](HACKATHON_CHANGELOG.md) — record only real hackathon work with test/commit evidence.

## Source of truth

- Main product spec: [`MASTER_IMPLEMENTATION.md`](MASTER_IMPLEMENTATION.md)
- Decisions: [`docs/ARCHITECTURE_DECISIONS.md`](docs/ARCHITECTURE_DECISIONS.md)
- Agent design and tool contracts: [`docs/AGENT_DESIGN.md`](docs/AGENT_DESIGN.md)
- Security / privacy: [`docs/SECURITY_PRIVACY.md`](docs/SECURITY_PRIVACY.md)
- Source reconciliation: [`docs/SOURCE_RECONCILIATION.md`](docs/SOURCE_RECONCILIATION.md)
- Original and exact user-uploaded materials: [`reference/`](reference/)

The hackathon judging rubric, public-repository rule, new-work requirement, and 3-minute demo requirement are reproduced in the hackathon brief from the participant guide supplied by the team.
