# Build Plan — 27 October to 4 November 2026

The build window covers nine calendar dates, from kickoff on October 27 through submission on November 4 ET. Build the smallest complete loop first, then spend remaining time improving agentic depth and demo quality. “No compromises” means no shortcuts on correctness, evidence, security, or test coverage—not feature sprawl.

## Workstream strategy

- **Critical path:** API connectivity → deterministic engine → agent tool loop → structured scenarios → UI → public demo → submission.
- **Parallel tracks:** UX/demo story, test suite, and organizer questions.
- **Deferred:** voice, user accounts, calendar/GitHub OAuth, trained behavioral predictor, PostgreSQL history unless the core is completed early.

## Day-by-day

### Tue 27 Oct — Foundation and API smoke test
- Read this build kit and official Model API quickstart.
- Join Discord; check `#announcements`, `#office-hours`, and `#questions`.
- Claim the $150 API credits; verify billing and spend alerts.
- Run the provided local app; install dependencies; run tests.
- Make one real `muse-spark-1.3` call using `scripts/check_meta_api.py`.
- Commit baseline and add a hackathon contribution log.

**Exit gate:** local backend/frontend run; tests pass; a real API call has been tested or the provider access blocker is explicitly recorded.

### Wed 28 Oct — Deterministic correctness and model tools
- Attend Agents 102.
- Test hours and finance formulas with known feasible, conflict, and unknown cases.
- Test the model-selected tool loop; capture `tool_trace` in the UI.
- Record model, request time, and cost/usage for test calls, without logging personal payloads.

**Exit gate:** one tool call is demonstrated; every numeric constraint can be checked by hand.

### Thu 29 Oct — Product flow and structured output
- Complete form validation and report UX.
- Validate generated JSON with Pydantic; cover all options; block fabricated percentages.
- Add edit-and-rerun behavior and JSON export.
- Include visible fallback mode for provider failure.

**Exit gate:** one complete workflow from input to comparison to revised assumptions works.

### Fri 30 Oct — Multi-step agent / stretch only if stable
- Attend the Muse Open models session if useful.
- Refine tool descriptions and add one bounded critic/verifier pass only if core output is already reliable.
- Add an explicit `unknowns` and `next experiment` panel.
- Keep at least one completely stable scenario for demo.

**Exit gate:** no new feature can break the core path; if it does, revert it.

### Sat 31 Oct — Design and empirical testing
- Test with 3–5 consenting peers if feasible; don't collect sensitive personal information.
- Ask users to bring a recent non-sensitive decision; observe where the UI fails to clarify constraints.
- Record bugs and misunderstandings; fix only high-impact issues.
- Improve mobile and keyboard navigation.

**Exit gate:** usability findings converted into a short, honest issue list; no unsupported user-impact claims.

### Sun 1 Nov — Deployment hardening
- Deploy API and frontend using the simplest reliable host(s).
- Configure production CORS, secrets and request limits; do not expose the model key to the client.
- Smoke-test a remote live API call and fallback.
- Verify public source repository and reproducible setup.

**Exit gate:** live product works from a clean browser; key is not in client bundle or Git history.

### Mon 2 Nov — Reliability / edge cases
- Test malformed input, blank numeric fields, provider timeout, malformed tool arguments, unexpected option IDs, invalid model JSON, and maximum tool-loop budget.
- Add regression tests for every issue found.
- Freeze scope by end of day.

**Exit gate:** no known critical bug; core scenario repeatable in three runs.

### Tue 3 Nov — Demo recording rehearsal
- Final day for submission questions/troubleshooting per guide.
- Record 2–3 practice runs; time each segment.
- Prepare demo data, source code walkthrough, and architecture diagram.
- Confirm final submission fields and contributor list.

**Exit gate:** video script under 3:00; no unsubstantiated metrics or claims.

### Wed 4 Nov — Submit early
- Recheck model/API availability and hosting.
- Record final video before the final hours.
- Test repository and demo links in incognito.
- Claim API credits if not already done.
- Submit by 6:00 PM NPT target (official deadline is 6:45 AM NPT on Thu 5 Nov).

**Exit gate:** submission confirmation captured and stored in project notes.

## Feature priority matrix

| Feature | Priority | Why |
|---|---|---|
| Decision intake, 2–3 options | P0 | Core product |
| Deterministic time/money checks | P0 | Credibility and technical differentiation |
| Muse Spark tool-calling loop | P0 | Satisfies model requirement and agentic depth |
| Structured scenario output | P0 | Product experience |
| Output verification | P0 | Stops obvious unsupported claims |
| Tool trace in UI | P0 | Makes agent behavior judge-verifiable |
| Edit assumptions/rerun | P0 | Shows the workbench, not just a report generator |
| JSON export | P0 | End-user artifact and stateless privacy design |
| Research grounding with citations | P1 | Only after API route, citation provenance, and source display are sound |
| Model-based critic call | P1 | Adds cost/latency; build only if stable and helpful |
| Branching DAG | P1 | Useful visual flourish after results correctness |
| Voice/Future Self | P2 | High integration risk; do not block submission |
| Login/PostgreSQL/OAuth | P2 | Raises privacy/security burden and is not essential for demo |

## Definition of “push limits”

Push the **quality** of the one vertical slice: reliable agent choices, transparent tool outputs, a delightful interface, adversarial test cases, and a memorable demo. Do not equate “more features” with “stronger entry.”
