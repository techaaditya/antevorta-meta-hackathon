# Agent Design and Tool Contracts

## Objective

The agent should not answer from intuition alone. It should inspect the actual decision, use tools to obtain exact calculations, and return conditional scenarios that preserve uncertainty.

## Roles

### 1. Decision Orchestrator (Muse Spark)

Input: validated `DecisionRequest` plus a preliminary deterministic report.
Output: `DecisionNarrative` with summary, per-option conditional analysis, cross-option insights, a reversible experiment, and questions to resolve.

It may call these tools:

#### `assess_option`
- Input: `option_id` from the request's allowlisted options.
- Output: deterministic assessment for that option, computed on the server from validated input.
- Side effects: none.

#### `compare_options`
- Input: no arguments.
- Output: the deterministic constraint result for every option.
- Side effects: none.

#### `list_unknowns`
- Input: no arguments.
- Output: fields that are unknown because values were not provided, plus user-entered unknowns.
- Side effects: none.

Tool schema follows the current Meta Model API Chat Completions pattern: definitions are nested under `function`; tool calls appear on the assistant message; append that assistant message and then one matching `tool` message per `tool_call_id`; repeat until the model stops or the budget is reached. `tool_choice` is left at the documented `auto` default.

## Orchestration policy

1. Validate the API request with Pydantic before any model call.
2. Run deterministic assessment independently.
3. Start the model conversation with the decision and preliminary report.
4. Handle at most 4 tool-call turns and 8 tool executions per request.
5. Parse JSON arguments and verify tool name and option ID.
6. Execute only the statically registered local functions.
7. Feed tool results to the model as JSON text.
8. Request a JSON final response; validate with Pydantic.
9. Check option coverage, IDs, claim language and unsupported numerical probabilities.
10. If any step fails, return a visible deterministic fallback and a generic provider status; do not expose key or sensitive request data in logs.

## Narrative schema

```json
{
  "summary": "A concise synthesis based only on the supplied decision and constraint results.",
  "option_analyses": [
    {
      "option_id": "option_a",
      "potential_upside": "Conditional benefit grounded in the user's description.",
      "main_tradeoff": "Specific constraint or cost that follows from supplied inputs.",
      "conditions_to_make_it_work": ["A concrete condition"],
      "questions_to_resolve": ["A specific unknown"]
    }
  ],
  "cross_option_insights": ["An important contrast between the options."],
  "reversible_experiment": "A low-risk way to reduce uncertainty before deciding.",
  "questions_before_deciding": ["A high-value follow-up question"],
  "caveat": "The analysis is conditional and not a prediction of a life outcome."
}
```

## Verification rules

- Exact option ID set must match request options.
- All required narrative fields must be non-empty within documented length limits.
- No percentages or numerically expressed success odds. If a model emits an obvious probability claim, reject to fallback; do not silently edit the meaning.
- Scenario language must remain conditional (e.g., “if”, “assuming”, “depends on”), not guarantee an outcome.
- If a prerequisite is unverified, mark it as a question, not a fact.
- Do not claim that the system knows what the user will do in the future.
- Do not invent citations, population statistics, job offers, visa requirements, scholarships, or market data.

## Optional verifier-agent stretch

Only after P0 passes, add a separate Muse Spark critique call with a narrow JSON contract:

```json
{"valid": true, "issues": [], "unsupported_claims": [], "contradictions": []}
```

Its job is to identify unsupported statements against the exact request and deterministic report, not to bless its own model as “truth.” All critical numeric and schema checks remain deterministic, and one bounded repair attempt is allowed. Compare latency, cost, and defect rate against the no-critic baseline. Do not add this if it makes demo latency or failure rate worse.
