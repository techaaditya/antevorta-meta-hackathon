# Hackathon Build Log — Antevorta

This is a template to record the actual work performed during the Meta Global AI Developer Hackathon. Fill it with real dates, commits, tests and observations. Do not leave future tasks marked as completed, and do not use it as proof that a feature works without a test or demo.

## Rule
The supplied master product documents predate the hackathon build. The submission must distinguish those prior concepts/specifications from the code, UX, model integration, tests and demo genuinely created during the event.

## Entries

| Date (NPT) | Commit / PR | New work completed | Test / evidence | Known limitation |
|---|---|---|---|---|
| 2026-10-27 | 52c4cab | Phase 0: Repository audit, environment verification, generated frontend lockfile, verified backend pytest (19 passed) and frontend Vite/TypeScript production build. | `pytest` (19 passed); `npm run build` (tsc + vite build passed); `python -m compileall` passed. | Live Meta API key not yet configured in local environment; local deterministic fallback mode verified. |
| 2026-10-27 | 9b24540 | Phase 1: Complete deterministic decision engine. Implemented prerequisite verification, financial runway, breakeven surplus calculation, separation of facts vs assumptions vs unknowns, assumption diff recalculation, and comprehensive unit tests for feasible, infeasible, boundary, incomplete, and invalid inputs. | `pytest` (34 passed); `npm run build` passed. | Advanced multi-agent critique deferred to later phases. |
| 2026-10-27 | 37ecade | Phase 2: Connect complete frontend-to-backend workflow. Implemented decision presets (Academic, Startup, Relocation) and blank starter, interactive prerequisite verification checkboxes, client-side pre-submission validation, comparative matrix view, facts & assumptions tab, what-if recalculation flow, and expanded API tests. | `pytest` (38 passed); `npm run build` (tsc + vite build passed). | Meta Model API live key not yet configured in local environment; fallback workflow verified end-to-end. |
| 2026-10-27 | phase-3 | Phase 3: Robust Meta Model API tool-calling agent implementation. Built code-fence stripping, json_schema/json_object structured output fallback, strict allowlisted tool execution, tool call budget caps, scenario verifier integration, and comprehensive agent unit tests. | `pytest` (43 passed); `npm run build` passed. | Awaiting user configuration of live `MODEL_API_KEY` in `.env` to execute live outbound smoke test against `api.meta.ai`. |


## Demo build manifest

- Git commit/tag used for demo: `FILL_IN`
- Frontend build result: `FILL_IN`
- Backend test result: `FILL_IN`
- Meta API model ID used in live demo: `FILL_IN`
- Real tool calls visible in trace: `FILL_IN`
- Video link: `FILL_IN`
- Deployed app link: `FILL_IN`
