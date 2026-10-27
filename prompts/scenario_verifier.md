# Scenario verifier policy

The verifier is deterministic code, not another generative model.

1. The narrative must include each requested option ID exactly once.
2. Every option must have a non-empty upside, trade-off and at least one condition.
3. Reject unsupported numeric probability expressions such as “70% chance”, “probability is 0.8”, or “80 percent likely”.
4. Never parse prose-generated numeric values as computed costs/hours. Numeric feasibility fields must come from the deterministic constraint engine.
5. If validation fails, do not show the rejected narrative. Return the clearly labelled deterministic fallback.
6. Do not infer that an option is feasible when its required values are missing.
