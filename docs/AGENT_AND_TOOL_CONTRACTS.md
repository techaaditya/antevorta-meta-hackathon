# Agent and Tool Contracts

## Agent role

Muse Spark is the orchestration and narrative layer. It receives a validated user decision plus a deterministic constraint report, calls allow-listed tools, then returns a structured `DecisionNarrative`. It does not calculate authoritative costs or hours, make the final choice, or invent base rates.

## Tool contracts

### `assess_option`
Input: `option_id` selected from the request's enumerated option IDs. Output: deterministic status, time headroom, financial headroom, missing fields, prerequisites and explanation. Failure on unknown IDs is expected and safely handled.

### `compare_options`
Input: empty object. Output: all option assessments, report status, horizon, missing inputs and unknowns.

### `list_unknowns`
Input: empty object. Output: global missing inputs, explicit unknowns, and option prerequisites.

## Bounded agent loop

- API route validates `DecisionInput` with Pydantic before model invocation.
- Only three function schemas are sent to the model.
- Tool arguments arrive as strings and are parsed as JSON objects.
- The server enforces option-id allow-listing and refuses unknown tools.
- Tool loop is capped by `META_MAX_TOOL_TURNS` and `META_MAX_TOOL_CALLS`.
- The full assistant tool-call message is appended before the corresponding tool responses.
- Final output must parse as `DecisionNarrative`, cover each option ID exactly once, and pass deterministic numeric-probability checks.
- If the model skips tool calls, exceeds a budget, fails, or produces invalid output, the product explicitly returns the deterministic fallback. It must not label that response as a Meta-generated agent result.

## Non-negotiable separation

`constraint_engine.py` owns arithmetic. `meta_agent.py` owns orchestration. `narrative.py` owns fallback and output validation. UI text must identify the actual execution mode. Tool traces are not fabricated by the model; the backend records them.
