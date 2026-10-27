# Demo Deployment Guide

Deploy only after local tests pass and the real Meta API smoke test succeeds. The starter has no user accounts and no database; its analysis endpoint consumes model credits when a key is configured.

## Recommended minimal split

- **API service:** any Python 3.11+ web-service host that supports environment secrets.
- **Frontend:** any static-site host that supports a build-time environment variable.
- **API key:** backend secret environment variable only.

## Backend service settings

Build command:

```bash
pip install -r backend/requirements.txt
```

Start command (use the host's provided `$PORT`):

```bash
uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT
```

Set environment variables in the hosting dashboard, never in source control:

```text
APP_ENV=production
MODEL_API_KEY=<secret entered in the host dashboard>
META_MODEL_BASE_URL=https://api.meta.ai/v1
META_MODEL_ID=muse-spark-1.3
CORS_ORIGINS=https://<your-frontend-domain>
MAX_ANALYSES_PER_MINUTE=20
```

The `CORS_ORIGINS` value must be the exact HTTPS origin of the deployed frontend (no path). Add a second origin only when it is genuinely required.

## Frontend static-site settings

- Root/build directory: `frontend`
- Build command: `npm install && npm run build`
- Publish directory: `dist`
- Build-time environment variable: `VITE_API_BASE_URL=https://<your-api-domain>`

The API base URL is public configuration, not a secret. Never put `MODEL_API_KEY` in a variable whose name starts with `VITE_`.

## Post-deploy smoke test

1. Open `https://<your-api-domain>/api/health`.
2. Open `/api/meta-status`; confirm it says a key is configured without returning a secret.
3. Open the deployed frontend, load the sample and run a stress test.
4. Confirm the report says `meta_agent` only if actual allow-listed tool calls completed and the verifier passed.
5. Test fallback by temporarily removing the server key in a separate local environment; do not expose or rotate the production key just to test fallback.
6. Verify the UI and repository links in a signed-out/incognito browser.
7. Inspect server logs for keys, user decision payloads, or full prompts; none should be logged.

## Important limitation

The starter's rate limit is an in-memory per-process demo safeguard. Before public promotion, add your host's managed request limits, request-size limits, abuse monitoring and a robust/shared rate limiter. Restricting CORS alone does not prevent non-browser API calls. Avoid putting sensitive personal information into the public demo.
