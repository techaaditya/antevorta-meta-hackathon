# Product Requirements and UX States

## Screens

### 1. Decision intake
- Decision question, optional deadline and comparison horizon.
- 2–3 option cards with name, description, hours/week, upfront cost, monthly cost, prerequisites.
- User capacity inputs: maintenance hours/week, existing commitments/week, savings (NPR), monthly surplus/deficit (NPR).
- Unknowns and one reversible experiment.
- Example-data button must label the example synthetic.

### 2. Loading state
- Show a concise status: validating inputs, checking constraints, consulting Muse Spark (only if configured), validating the report.
- If model call takes too long, show retry and fallback information.
- Never claim the model is working unless an API request has started.

### 3. Comparison report
- Separate deterministic constraints from model narrative.
- Each option has time status, money status, overall status, required hours, available hours, headroom, total projected costs, and missing inputs.
- Status labels: `FEASIBLE`, `CONFLICT`, `UNKNOWN`.
- Show tool trace as actual `tool_trace` from API result.
- Conditional upside, trade-off, conditions to make it work, and questions to resolve.
- One cross-option insight, next reversible experiment, and caveat.
- “Export JSON” button.

### 4. Empty and error states

- Before submit: no fake results.
- Missing data: explicitly indicate unknown fields.
- Provider absent/fails: “Meta model unavailable; showing deterministic analysis only.”
- API validation error: show human-readable message; preserve user inputs.
- Timeout: let user retry; don't imply saved state on server.

## Visual design principles

- Calm, focused, modern editorial look—not “AI neon dashboard.”
- Strong hierarchy around the user's decision and the actual conflict.
- Avoid overclaiming badges like “optimal decision” or “future predicted.”
- Use consistent status colors and icon + text so color is not the only signal.
- Accessible labels, keyboard focus, readable contrast, responsive cards.

## Product language

Use: “conditional scenario”, “based on the information you provided”, “constraint conflict”, “missing information”, “next experiment”.

Avoid: “guaranteed outcome”, “your future will be”, “success probability”, “burnout risk”, “AI knows you”, “perfect prediction”.
