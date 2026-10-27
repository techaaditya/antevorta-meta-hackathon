# Source reconciliation and build authority

**Purpose:** keep the original product vision intact while preventing the hackathon implementation from inheriting stale API instructions or impossible scope.

## Authority hierarchy

1. **Current official Meta Model API documentation and the participant guide** control API compatibility, model IDs, submission rules, dates, and eligibility. The guide in this kit is the guide supplied by the participant; verify Discord announcements for changes.
2. **`reference/originals/user-uploaded/Antevorta-Final-Master-Documentation-latestupdated.md`** is the source of truth for Antevorta's product principles, research caution, event-sourced long-term roadmap, provenance, privacy, deterministic constraints, and no-fake-probabilities policy.
3. The other exact uploaded source files preserve earlier designs and rationale. They are useful for vision, voice UX, research framing, and implementation history, but do not automatically override the v5 build order or hackathon rules.
4. **`MASTER_IMPLEMENTATION.md`, `docs/ARCHITECTURE_DECISIONS.md`, and `docs/BUILD_PLAN.md`** are the source of truth for the ten-day submission implementation. If they contradict a historical source's broader architecture, follow the hackathon implementation decision unless a test or actual blocker justifies reopening it.

## Reconciled decisions

| Topic | Long-term product vision | Hackathon decision | Why |
|---|---|---|---|
| Product | Personal Decision Workbench, personal model, calibration, optional Future Self | Decision Stress Test vertical slice | Demonstrates an actual decision task end-to-end in three minutes |
| Meta integration | Historical drafts describe Google/Gemini-specific Live API and ADK choices | Official Meta Model API with bounded tool calling | The event requires meaningful use of Meta models; Google Live is not the core submission path |
| Reasoning | Three isolated reasoners: behaviour, deterministic constraints, reference classes | Ship deterministic constraints plus one Meta tool-calling orchestrator and deterministic verifier | A genuine agent loop, but narrow enough to test within the deadline |
| Voice | Signature future phase | Stretch only, after the text and tool flow is stable | Prevents audio transport from blocking correctness and the live demo |
| Personal evidence | Claims, OAuth, Calendar/GitHub aggregates, event sourcing | Manual user-supplied inputs and stateless server in P0 | Avoids authentication, OAuth, storage, and privacy scope creep |
| Calibration | Longitudinal short-horizon behavioural research | Future research track, not a claim made by the demo | The hackathon cannot establish calibration from synthetic or insufficient outcomes |
| Base rates | Reviewable sourced reference classes | No numeric rate unless independently verified and cited | Prevents hallucinated population statistics |
| User autonomy | User corrects/disputes/excludes claims and makes final decisions | Show trade-offs and a reversible next experiment; do not prescribe a life choice | Preserves the project's “mirror, not oracle” policy |
| Product claims | Long-run platform hypothesis | Demonstrate only functions that exist in the event-built code | Matches new-work and demo-integrity rules |

## Non-negotiable technical invariants

- Unknown data is `UNKNOWN`, never silently zero.
- Time and finance calculations are deterministic and testable without a model call.
- A provider fallback is visibly labelled `deterministic_fallback`; never imply Muse Spark ran if it did not.
- An agent tool call must be model-selected, allow-listed, schema-validated, budget-limited, and executed only against the current validated decision request.
- The tool trace must show the requested tool and its result to make actual model use verifiable.
- Generated scenarios are conditional explanations, not predicted future facts.
- No long-horizon life success percentages, fabricated confidence scores, burnout predictions, or unsupported base rates.
- API keys stay server-side and never use a `VITE_` browser environment variable.
- Keep synthetic sample inputs visibly labelled synthetic.
- All demo claims must correspond to code built during the hackathon and be supported by a reproducible test or observable product behavior where possible.
