# Security, Privacy, and Responsible Use

## Data classification

Personal decisions can contain sensitive educational, financial, family, employment, or wellbeing details. Treat all user-entered decision text as potentially sensitive.

## Current starter design

- The backend is stateless: it does not persist user decisions to a database.
- API requests may be transmitted to Meta Model API when live AI is configured. Disclose that in product copy.
- API keys are read from server environment variables. Never put `MODEL_API_KEY` in `VITE_*` variables, browser bundles, screenshots, or Git.
- The backend must not log raw request bodies, user decision text, model prompts, or full model responses by default.
- CORS defaults to localhost origins; production origin should be explicitly set.
- `POST /api/analyze` has a bounded in-memory per-process rolling-window rate limit (`MAX_ANALYSES_PER_MINUTE`, default 20). This is a demo safeguard, not a replacement for managed gateway limits, authentication, or a shared limiter in multi-worker production.
- Tools do deterministic, read-only calculations on validated request values only.
- No ambient audio, screenshots, screen surveillance, wearables, health data or third-party profiling.

## Required before public deployment

1. Replace the in-memory demo limiter with a managed/shared rate limiter and enforce request-size limits.
2. TLS and secure hosting configuration.
3. Production CORS origin list and host/domain validation.
4. Provider key in platform secret manager; rotation process ready.
5. Abuse monitoring with privacy-preserving aggregate telemetry.
6. Error responses do not expose stack traces, provider credentials, or prompt content.
7. If persistence is added: authentication, ownership/IDOR tests, consent and purpose records, data minimization, export, deletion and documented backup purge process.
8. Clear privacy copy describing where prompts are sent, provider handling, whether content is stored, and limitations.

## Agent threat model

| Threat | Mitigation |
|---|---|
| Prompt injection in user text | Treat user content as data; tools allowlisted; no arbitrary code/external write tools |
| Tool argument manipulation | JSON parse + Pydantic/enum validation; only IDs from current request accepted |
| Runaway tool loop | Maximum four turns / eight tool executions |
| Unsupported numeric claim | Narrative schema and deterministic percentage detector; fallback if invalid |
| Secret leakage | Environment variables only; `.env` in `.gitignore`; API key never passed to frontend |
| Sensitive logs | Do not log request body or raw model output |
| API abuse / overspend | Spend alert; request limits before public launch; output/token budget; provider timeout |
| Hallucinated facts | External facts unavailable unless supported by provenance; unknown remains unknown |
| Misleading UI | Clear labels separate deterministic analysis from model-generated conditional narrative |

## Product safety boundary

Antevorta helps organize choices but is not medical, psychological, legal, immigration, or financial advice. It must not recommend a final life decision based on invented probabilities. User remains the decision-maker. Avoid diagnostic and crisis-response claims.

## Deletion/export

No server-side decision store in the initial starter. The browser export is under the user's control. If server persistence or history is added later, deletion must include database rows, derived claims, scenario caches, embeddings, audit/event data containing personal content, exports and backups under the documented retention policy.
