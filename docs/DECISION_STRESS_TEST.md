# Golden Scenario — Decision Stress Test

This sample is synthetic. It is intended for arithmetic checks and a reproducible demo, not as advice to any real person.

## Decision

“Should I pursue graduate research and applications, or take a full-time contract while completing a thesis?”

Assumptions:
- Weekly maintenance: 80 hours.
- Existing commitments: 45 hours/week.
- Discretionary capacity: `168 - 80 - 45 = 43` hours/week.
- Savings: NPR 150,000.
- Monthly surplus: NPR 8,000.
- Horizon: 12 months.
- Projected funds: `150,000 + (8,000 × 12) = NPR 246,000`.

## Option A — Research + graduate applications

- Required: 28 hours/week.
- Upfront cost: NPR 120,000.
- Monthly costs: NPR 10,000.
- Horizon total: `120,000 + (10,000 × 12) = NPR 240,000`.
- Weekly headroom: `43 - 28 = 15` hours.
- Budget headroom: `246,000 - 240,000 = NPR 6,000`.
- Illustrative status: time fits entered assumptions; budget is tight but non-negative. Prerequisites/funding still need human confirmation.

## Option B — Full-time contract + thesis

- Required: 48 hours/week.
- Upfront cost: NPR 25,000.
- Monthly costs: NPR 15,000.
- Horizon total: `25,000 + (15,000 × 12) = NPR 205,000`.
- Weekly headroom: `43 - 48 = -5` hours.
- Budget headroom: `246,000 - 205,000 = NPR 41,000`.
- Illustrative status: conflict in stated weekly hours. It could change if the work week is negotiable or a current commitment is dropped; the current result is conditional on the entered inputs.

## Intended demo moment

1. Run the analysis and show the 5-hour weekly conflict for the contract path.
2. Edit the contract hours from 48 to 38 and rerun.
3. Show the deterministic headroom changing from -5 to +5 hours.
4. Show the real Meta tool trace and its conditional scenario narrative if a live validated tool-assisted run completed.
5. Explain that a 10-hour change alters feasibility under the supplied assumptions, not a probability that the user's life will succeed.
