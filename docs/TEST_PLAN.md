# Quality Plan and Test Matrix

## Unit tests — deterministic engine

- All required time inputs provided; positive headroom → `feasible`.
- Time headroom exactly zero → `feasible` (boundary condition).
- Time headroom negative → `conflict` with exact deficit.
- Missing maintenance, commitments, or option hours → `unknown` and names the missing field.
- All financial inputs provided; positive budget headroom → `feasible`.
- Financial headroom zero → `feasible`.
- Negative headroom → `conflict`.
- Missing savings/surplus/upfront/monthly cost → `unknown`, never silent zero.
- If either time or money conflicts, option overall status is conflict; otherwise any unknown yields unknown.

## API tests

- `/api/health` responds and reveals no secret.
- Valid two-option request returns deterministic report with two assessments.
- Duplicate IDs and fewer than two options fail validation.
- Negative hours/costs fail validation.
- API key absent returns explicit deterministic fallback.
- Provider exception is caught and returns fallback, not a stack trace.
- Output verifier rejects percentage claims and mismatched option IDs.

## Agent contract tests

Mock the SDK/provider rather than making paid calls in CI.

- A tool call to `assess_option` returns only the chosen option's deterministic report.
- `compare_options` returns all options.
- Unknown tool names cannot execute code and produce a controlled tool error.
- Malformed arguments are handled without crashing.
- Multiple tool calls preserve assistant/tool message ordering.
- Loop stops at its maximum.
- Valid structured output returns all options.
- Invalid JSON/percentages trigger deterministic fallback.

## Frontend acceptance tests (manual minimum)

- Keyboard navigation and focus visible.
- Narrow/mobile layout works.
- Blank number fields are sent as `null`, not `0`.
- Loading, API error, fallback and Meta-connected states are visually distinct.
- Results clearly label conflicts and unknowns.
- Editing and resubmitting changes calculations.
- Export JSON opens and contains no API key.

## Release test

Run `pytest`, `npm run build`, a live provider smoke test, and three remote happy-path runs. Capture the model name and whether a real tool call occurred, but do not save personal prompt text to logs.
