# Starter Kit Validation Report

**Checked:** 27 October 2026 (working-container validation)  
**Purpose:** State exactly which checks were run on this package and which require the user's machine or Meta account.

## Passed in this environment

- Python `compileall` on `backend/` and `scripts/`.
- Backend tests: `pytest -q` — **19 passed** at the time this report was written; rerun after any edits.
- TypeScript/TSX syntax transpilation for `App.tsx`, `api.ts`, `main.tsx`, and `types.ts` — no syntax diagnostics using the globally available TypeScript compiler.
- A stub-assisted TypeScript check with `--strictNullChecks` to catch internal source-level issues — passed. The temporary stubs are not a replacement for the actual installed React/Vite package types.
- CSS parsed successfully with PostCSS.
- Agent tool-loop test uses a mocked provider to prove the orchestration transcript includes the assistant tool-call message followed by matching tool messages. This is not a live Meta API test.

## Not verified here

- `npm install` and the actual Vite production build. Attempts to reach `registry.npmjs.org` timed out, and DNS resolution from this environment failed. After downloading the ZIP, run `cd frontend && npm install && npm run build` on a machine with registry access. Commit the generated `package-lock.json` after a successful install/build.
- A real Meta Model API request. The package deliberately contains no key. After configuring `.env`, run `python scripts/check_meta_api.py`, then run the app with a real key and verify that a *real* model-selected tool invocation appears in the response trace.
- Public deployment, security review, accessibility review with assistive technology, real user research, or final demo recording.

## Interpretation

The backend contracts and deterministic arithmetic have automated test coverage, and the frontend source parses cleanly. This report does **not** claim the complete stack has already run end-to-end or that a hosted model account is enabled. Treat successful local installation, actual provider access, a production build, and a recorded live demo as release gates.
