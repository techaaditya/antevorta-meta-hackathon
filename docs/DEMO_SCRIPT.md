# Three-Minute Demo Script

**Story:** A student is deciding between a full-time contract while finishing a thesis and a research-focused internship. Their plan sounds possible until constraints are made explicit. Antevorta tests the plan; it does not predict the student's future.

## 0:00–0:20 — Problem and hook

“Big decisions often fail for boring reasons: the time doesn't fit, money runs out earlier than expected, or a prerequisite was never checked. Antevorta is a decision stress test. It helps you test the plan before you commit.”

Show the landing/form and use clearly labelled synthetic demo values.

## 0:20–0:50 — Enter options

Enter the two options, existing commitments, weekly maintenance time, costs and horizon. Point out that missing information stays unknown rather than being treated as zero.

## 0:50–1:25 — Show a real Meta tool call

Run the analysis. Show the agent trace (e.g. `assess_option`, `compare_options`, `list_unknowns`) only if those calls genuinely occurred. Explain that Muse Spark chose the tool(s), and the server executed deterministic functions on validated inputs.

## 1:25–1:55 — Exact constraints, not AI guesses

Show the available hours and weekly headroom. Walk through one calculation. Explain that the model cannot overwrite the arithmetic or fabricate a success percentage.

## 1:55–2:25 — Conditional scenarios

Read one useful trade-off and one missing question. Explain that these are conditional scenarios based on supplied information, not claims about what will actually happen in five years.

## 2:25–2:45 — Change an assumption

Change hours or a cost and rerun. Show the status or headroom change. This is the key product moment: the model narrative and deterministic result are tied to updated assumptions.

## 2:45–3:00 — Why it matters / close

“Antevorta doesn't choose your future for you. It makes your assumptions, constraints and unknowns visible, so you can make a better-informed choice. That's what we built with Meta Model API: an agent that uses tools to test a plan instead of just talking about it.”

## Recording rules

- Show only features actually implemented and built during the hackathon.
- Use a clean browser and prepared synthetic values.
- Keep the API key out of view.
- If the product uses fallback mode, say so; do not pretend it is the live model.
- Show actual tool trace; do not stage fake calls.
- Record a backup video after a successful run in case the live service is unstable.
