# PERSONAL DIGITAL TWIN — MASTER DOCUMENT

**A decision-simulation system built on a continuously-updated model of one person.**

Status: research + architecture + build plan
Date: 23 August 2026
Supersedes: the ChatGPT-generated concept doc (kept as input, corrected below)

---

## 0. TL;DR — the honest verdict

**Can it be built?** Yes. Every component exists and works today.

**Can it do what you described?** Partly. Here's the split, and it matters more than anything else in this document:

| What you described | Status | Why |
|---|---|---|
| Build a computational model of a specific person from interviews | **Solved enough to build on.** ~85% of a person's own test-retest reliability on survey-style questions | Park et al. 2024 (Stanford/Google), Toubia et al. 2025 |
| Have that model answer "what would *I* do in situation X?" | **Works, with measurable accuracy** | Same papers |
| Simulate what *happens* to you over 5 years if you take path A vs B | **Not solved. Not close. Nobody can do this.** | No world model, no ground truth, no way to validate |
| Show "Career +18%, Stress +21%" for a life path | **This is fabrication with a percent sign on it** | The numbers have no data-generating process behind them |
| Continuously improve the twin from real outcomes | **Buildable and genuinely novel in a product** | Nobody's shipped the feedback loop properly |
| 3D walkable future world | **Buildable, adds nothing, costs everything** | Skip it |

So the project is real. But it is **not** "simulate my life." It is:

> **A system that models how *you specifically* make decisions, forces the consequences of a decision into the open, makes explicit falsifiable short-horizon predictions about your behaviour, and gets measurably better as reality proves it wrong.**

That's a smaller claim. It's also the only version that survives contact with an examiner, a judge, or a user who checks whether it was right.

**The single biggest correction to the pasted doc:** it treats "how do we model the person?" as the hard problem. It isn't. That's the *tractable* problem — there's a benchmark, a dataset, and published accuracy numbers. The hard problem is **modelling the world the person acts in**, and the doc never mentions it. More in §3.

---

## 1. What this actually is

### 1.1 The definition

A **Personal Decision Twin** is:

1. A structured, versioned, evidence-backed representation of one person — their goals, constraints, revealed behavioural tendencies, and the uncertainty on each of those.
2. A reasoning layer that can be queried counterfactually: *given this state and this situation, what does this person tend to do, and what follows?*
3. An explicit assumption ledger: every output is traceable to assumptions the user can see and edit.
4. A feedback loop: real outcomes are logged against predictions, and the model updates.

### 1.2 What it is NOT — say these out loud, in the product

- Not a prediction of the future.
- Not a clone, upload, digital soul, or consciousness.
- Not advice. It doesn't tell you what to do.
- Not therapy. Not a counsellor. Not a substitute for a person.
- Not accurate beyond its validated range, and its validated range is short.

Every one of these gets violated by the products in this space, and each violation is both an ethical problem and a credibility problem.

### 1.3 The one-line pitch

> **"Test your decisions before you live them."**

The pasted doc got this line right. Keep it. But you have to earn it — a system that generates plausible-sounding futures with no validation isn't testing anything, it's writing fiction with your name in it.

---

## 2. The actual state of the art (August 2026)

This is where the pasted doc failed hardest. It cited three consumer apps and a Devpost project, and missed the four pieces of work that define this field. If you write a proposal or a paper without these, you'll be shredded.

### 2.1 Park et al., "Generative Agent Simulations of 1,000 People" (Stanford + Google, 2024)

**This is the foundational paper for your project. Read it first.**

They interviewed 1,052 real people for ~2 hours each, fed those interview transcripts into an LLM agent architecture, and then asked the agents the same questions the humans had answered.

The results:
- Agents reproduced participants' General Social Survey responses at **85% of the accuracy with which participants reproduced their own answers two weeks later.** That test-retest baseline is the right benchmark — it's the ceiling any twin can hit, because people aren't even self-consistent.
- Comparable performance on Big Five personality prediction.
- Replicated the direction of treatment effects in 4 of 5 social science experiment replications.
- Interview-based agents were **less demographically biased** than agents built from demographic descriptions.

And the limitation that matters most for you:
- On economic games (dictator, trust, public goods etc.), agents hit ~66% normalized correlation — **no better than cheap demographic personas.** Two hours of life-story interview added nothing to predicting money-and-trust behaviour.

**What this tells you:**
- Interviews → decent model of *stated attitudes*. Cheap and validated.
- Interviews → poor model of *situational, in-the-moment, incentive-driven behaviour*. Which is exactly what most life decisions are.
- Your onboarding interview is worth doing. It is not sufficient.

Code: `github.com/joonspk-research/genagents`. The full 1,000-agent bank is restricted for privacy reasons; a single-agent sample and the architecture are public. Read the architecture, don't reinvent it.

### 2.2 Toubia et al., "Twin-2K-500" (2025) — your benchmark

2,058 US participants, ~2.42 hours each, 500+ questions across four waves covering demographics, psychology, economics, personality, cognition, plus replications of behavioural-econ experiments. Wave 4 repeats earlier tasks specifically to establish a **human test-retest baseline**.

Headline numbers:
- Digital twin predictive accuracy across 17 held-out tasks: **71.72%**
- Ratio to human test-retest accuracy: **87.67%**
- They tried a dozen-plus variations — text vs JSON persona encoding, model choice, chain-of-thought, persona summaries — and **accuracy landed in a similar range across all of them.**

That last finding is the most useful thing in the paper and you should internalise it: **prompt engineering the persona is not where the gains are.** People burn months there. The data is public on HuggingFace (`LLM-Digital-Twin/Twin-2K-500`) with code at `github.com/tianyipeng-lab/Digital-Twin-Simulation`.

**Practical implication:** you have a public benchmark. You can evaluate a novel person-modelling method against a published baseline without recruiting a single participant. That's your entire path to a credible paper without a lab.

### 2.3 Centaur / Psych-101 (Binz et al., Nature, 2025)

A Llama model fine-tuned with LoRA adapters on **Psych-101** — trial-by-trial data from 160 psychological experiments, 60,092 participants, 10,681,650 choices, all transcribed into natural language.

Centaur predicts held-out participants' behaviour better than purpose-built cognitive models in almost every experiment, generalises to modified cover stories, new task structures, and entirely new domains, and predicts reaction times. Its internal representations became more aligned with human neural data after fine-tuning, which nobody trained it to do.

**Why you care:** this is the strongest existing evidence that a general "human behaviour engine" is trainable. It's also the natural backbone for a personal twin — a general model of how humans decide, conditioned on one person's data, rather than an LLM improvising a personality. If you want a technically serious differentiator, **personalising Centaur-style behaviour prediction is it.** Weights and dataset are public.

Caveat: Psych-101 is lab tasks — bandits, memory, MDPs. Not "should I move to Australia." The generalisation from lab task to life decision is unproven and is itself a research question.

### 2.4 "Future You" (MIT Media Lab + KASIKORN Labs + UCLA, 2024)

Single-session chat with an LLM-generated version of yourself at 60. It builds a synthetic backstory linking your present to that future, plus a StyleGAN age-progressed avatar.

Pre-registered RCT, 188 participants (the public deployment now reports a 344-participant study): significantly **reduced anxiety** and **increased future self-continuity** versus controls, after roughly 28 minutes of interaction.

**Why you care, three ways:**
1. It's the strongest evidence that this genre of intervention *does something measurable for a person* — and note that the measured benefit is **psychological, not predictive.** Users benefited from the conversation, not from the accuracy of the future.
2. Future self-continuity is a real construct with real literature (Hershfield, a co-author, built it) linking it to savings behaviour, academic persistence, and reduced procrastination. That is your health/wellbeing justification, and it's citable.
3. **It is prior art for the "talk to your future self" feature.** You already hit this with TwinMind. Don't re-derive it, build past it.

### 2.5 The commercial landscape — thin, but crowded at the shallow end

What exists:
- **AlterPathways** — write one decision, get an alternate-life narrative including a "ghost letter" from the you that didn't happen. Explicitly markets itself as *not advice, not prediction*.
- **Life Vector**, **OMEGA**, **Infinite Life Simulation**, **Altrevite** — AI life sims, mostly BitLife-with-an-LLM. Altrevite has a "Life Quality Score" across Fulfillment/Relationships/Wellbeing/Growth/Legacy. Google Play, freemium, entertainment positioning.
- **Devpost/hackathon tier** — Multiverse Life Simulator (ReactFlow decision trees + GPT + PDF export), Mora, Parallel Lives (six embeddings per decision node across life dimensions, TiDB). Dozens of these. A new one every hackathon cycle.
- **TwinMind** — taken. ThirdEar AI, funded, 30k+ users. You already know.

**The honest read of the market:**

Everything shipped is one of two things — an *entertainment* life sim, or a *narrative* generator. Both are LLM-writes-a-story wrapped in a UI. None of them:
- measure whether the model of you is accurate,
- make falsifiable predictions,
- close a feedback loop with real outcomes,
- ground anything in base rates.

That's your gap. It's also, uncomfortably, a gap that exists partly because **closing it is genuinely hard and partly because users don't obviously want it.** Fiction is more pleasant than calibration. Hold that thought for §16.

---

## 3. The three problems that decide whether this works

### 3.1 Problem 1 — Identification: *who is this person?*

The one the pasted doc obsesses over. It's the **easiest** of the three.

You have: a validated method (structured interview → agent), a published benchmark (Twin-2K-500), a known ceiling (human test-retest), and a known failure mode (situational/incentive behaviour doesn't come from interviews).

The real sub-problems:
- **Stated vs revealed preference.** People describe themselves aspirationally. The pasted doc spotted this — "user says disciplined, logs say otherwise" — and it's the best idea in it. Treat the gap as a first-class datum, not an error.
- **Non-stationarity.** People change, and they change *because of* the decisions your system is helping them make. A twin fitted six months ago is fitted to a person who no longer exists.
- **Sparse behavioural data.** You will not have bank transactions, wearables, and calendars on day one. You'll have a conversation and maybe a to-do list.

All tractable. Move on.

### 3.2 Problem 2 — The world model: *what happens next?* ← THE ACTUAL HARD PROBLEM

The pasted doc says the twin's outputs are "probabilistic simulations" and draws a tree with 37% / 48% / 15% on the branches.

**Where do those numbers come from?**

There is no answer. That's the whole problem. To simulate what happens if you drop out and start a company, you'd need a model of:

- the Nepali startup funding environment, conditional on your network
- your co-founders' behaviour, whom the system has never met
- the job market 3 years out
- your family's reaction and how that shifts your constraints
- macro conditions
- luck, which by definition isn't in your data

Nobody has this model. Not the labs, not the startups, not anyone. Agent-based modelling doesn't solve it — ABM tells you what happens *given* the agent rules and environment parameters, and you'd be inventing all of them. **An LLM emitting "48%" is emitting a token, not a probability.**

This is compounded by the **fundamental problem of causal inference**: for any individual, you only ever observe one branch. You will *never* get ground truth for "what would have happened if Aaditya had stayed in the degree." Not eventually, not with more data. Never. Individual-level counterfactuals are unobservable in principle.

**So what do you actually do?** Three legitimate moves, in order of rigour:

**(a) Short-horizon behavioural prediction — where you have real ground truth.**
Don't predict "will your startup succeed in 3 years." Predict "will you have shipped the thing you said you'd ship by Friday." Two weeks out. Four weeks out. Twelve weeks out.

These resolve. You can score them. You can compute a Brier score and a calibration curve. **This is the only part of the system where the word "probability" is honest**, and it's the entire foundation of the research contribution. Someone who is systematically 3x optimistic about their own timelines learns something genuinely valuable and genuinely personal.

**(b) Reference-class forecasting for long horizons.**
Instead of inventing 48%, go find the base rate. Nepali CS graduates who went abroad for a Master's — what actually happened, from real published data (UGC Nepal, NOC records, ILO, alumni surveys, World Bank migration data)? Then state the base rate, then state how this person differs from the reference class, then let them adjust it.

This is Kahneman's outside view, and it's the only defensible way to put a number on a five-year question. It also has the property that **you can show your work** — the number has a source the user can click.

**(c) Structured consequence elicitation for everything else.**
For genuinely unmodellable stuff, drop the numbers entirely and do the thing a good advisor does: surface consequences the person hasn't thought of, drawn from their own model. "This path requires you to be in Kathmandu on Wednesdays; you've told me twice that your family expects you in Chitwan monthly. That conflict isn't in your plan." No probability. Pure structure. Enormously useful.

**Rule for the whole system: a number appears in the UI only if it came from (a) resolved predictions, or (b) a citable base rate. Otherwise you use words, and the words are hedged.**

### 3.3 Problem 3 — Evaluation: *how do you know it's working?*

The pasted doc proposes: give the human 100 hypothetical scenarios, give the twin the same 100, compute agreement. "Twin fidelity = 86%."

That's a fine *first* metric and it's exactly what Park and Toubia do. But be clear about what it measures: **agreement between a person's hypothetical answers and a model's hypothetical answers.** It doesn't measure whether either matches real behaviour. Stated-preference agreement is the cheap metric; that's why everyone reports it.

The metrics that actually matter, in ascending order of difficulty:

| Tier | Metric | Ground truth from | Difficulty |
|---|---|---|---|
| 1 | Held-out survey/scenario agreement | Person answers hypotheticals | Easy — do this first |
| 2 | Calibration on short-horizon behavioural predictions (Brier, ECE, reliability curve) | What the person actually did | Medium — 4-12 weeks |
| 3 | Discrimination: does the twin beat a base-rate predictor and a generic-LLM predictor? | Same | Medium, and this is your ablation |
| 4 | Longitudinal drift: does fidelity decay, and how fast? | Repeat tier 1 at 1/3/6 months | Slow but easy |
| 5 | Decision quality: do users who used the tool make better decisions? | Follow-up, self-report + outcome | Very hard, needs an RCT |
| 6 | Long-horizon outcome accuracy | Impossible in principle | Don't |

**Tier 3 is the one that makes this a paper.** The interesting question isn't "is the twin accurate" — it's "does modelling this person specifically beat just asking GPT what a typical Nepali CS student would do?" If a generic model does as well as your twin, you've built nothing. Park's economic-games result says that in some domains, **it does.** Find out where the personalisation actually pays.

---

## 4. The reframe — what you should actually build

Three viable framings. Pick one. Do not do all three.

### Option A — "Calibration Mirror" (the research-strongest)
**Core loop:** you state an intention → the twin predicts whether you'll follow through, with a probability → time passes → reality resolves it → the twin's calibration curve updates and is shown to you.
- Honest, falsifiable, resolves in weeks
- Novel: nobody's shipped a personal calibration system for *behaviour* (Metaculus/Manifold do it for world events)
- Directly publishable
- Risk: is it a product, or a feature? It's small.

### Option B — "Decision Workbench" (the product-strongest)
**Core loop:** bring one real decision → the system interviews you into a structured decision model (options, criteria, weights, constraints, unknowns) → surfaces consequences and conflicts from your person model → gives base rates where they exist → you log the decision → it follows up at 1/3/6 months and reflects back.
- Actually useful to a real person facing a real fork
- The person model earns its keep by personalising which consequences get surfaced
- Weaker research contribution unless you bolt on A
- The follow-up loop is the moat and nobody does it

### Option C — "Behavioural Sandbox" (the demo-strongest)
**Core loop:** branching timeline UI, scenarios, comparison of paths, everything narrative.
- Demos beautifully, wins hackathons
- Is what AlterPathways and twelve Devpost projects already are
- No defensible technical content
- **Do not build this as the primary thing.** Build it as the presentation layer of A+B.

### Recommendation

**Build B, with A as its measurement spine, and borrow C's UI language.**

That gives you: a real product loop (B), a real research contribution and honest numbers (A), and a demo that doesn't look like a spreadsheet (C). The person model is shared across all three.

Working name candidates (all checked as not-obviously-taken, verify before committing): *Counterfactual*, *Forkpoint*, *Priorwork*, *Antara* (अन्तर — difference/interval, and quietly Nepali), *Decision Lab*. Avoid anything with "Twin" — that lane is crowded and you already got burned.

---

## 5. Architecture

### 5.1 The layer stack

```
┌──────────────────────────────────────────────────────────┐
│  L6  INTERFACE                                            │
│      chat · decision workbench · timeline · calibration   │
│      dashboard · assumption editor                        │
└───────────────────────┬──────────────────────────────────┘
                        │
┌───────────────────────┴──────────────────────────────────┐
│  L5  EXPLANATION & ASSUMPTION LEDGER                      │
│      every output → which beliefs, which confidence,      │
│      which base rate, which assumption. All editable.     │
└───────────────────────┬──────────────────────────────────┘
                        │
┌───────────────────────┴──────────────────────────────────┐
│  L4  REASONERS  (three, kept separate on purpose)         │
│   ┌──────────────┬──────────────────┬──────────────────┐  │
│   │ BEHAVIOUR    │ CONSEQUENCE      │ REFERENCE-CLASS  │  │
│   │ PREDICTOR    │ MAPPER           │ FORECASTER       │  │
│   │ "will you    │ "what does this  │ "what usually    │  │
│   │  do X?"      │  path require /  │  happens to      │  │
│   │ → probability│  break?"         │  people like     │  │
│   │ → calibrated │ → structure,     │  this?"          │  │
│   │              │   no numbers     │ → cited base rate│  │
│   └──────────────┴──────────────────┴──────────────────┘  │
└───────────────────────┬──────────────────────────────────┘
                        │
┌───────────────────────┴──────────────────────────────────┐
│  L3  PERSON MODEL                                         │
│      belief store: claims + confidence + provenance +     │
│      timestamps + decay. Stated vs revealed tracked       │
│      separately and never merged.                         │
└───────────────────────┬──────────────────────────────────┘
                        │
┌───────────────────────┴──────────────────────────────────┐
│  L2  EXTRACTION                                           │
│      conversation → structured claims                     │
│      logs/integrations → observed events                  │
└───────────────────────┬──────────────────────────────────┘
                        │
┌───────────────────────┴──────────────────────────────────┐
│  L1  EVIDENCE STORE  (append-only, immutable)             │
│      interview transcripts · logged decisions ·           │
│      predictions · outcomes · integration events          │
└──────────────────────────────────────────────────────────┘
```

**Two rules that make or break this:**

1. **L1 is append-only and never edited.** Every belief in L3 must be derivable from evidence in L1. When you're debugging "why did it say that," you walk back down the stack. When a user says "delete everything about my job," you tombstone the evidence and re-derive L3 — you don't try to surgically edit beliefs.

2. **The three reasoners in L4 stay separate and are never allowed to write into each other.** The moment "what usually happens to people like this" gets blended into "what will you do," you've laundered a base rate into a personal prediction and you can no longer tell the user where a number came from. Keep them apart, present them apart.

### 5.2 The person model — actual schema

Don't store "risk_tolerance: 0.8". A bare float has no provenance, no confidence, no timestamp, and no way to be wrong. Store claims.

```json
{
  "claim_id": "clm_01J8...",
  "subject": "user",
  "predicate": "TENDS_TO",
  "object": "underestimate task duration",
  "domain": "planning",
  "polarity": "positive",
  "magnitude": { "type": "ratio", "value": 2.7, "unit": "actual/estimated" },
  "confidence": 0.74,
  "evidence": [
    { "kind": "revealed", "ref": "evt_...", "weight": 0.8, "at": "2026-08-02" },
    { "kind": "revealed", "ref": "evt_...", "weight": 0.8, "at": "2026-08-14" },
    { "kind": "stated",   "ref": "utt_...", "weight": 0.2, "at": "2026-07-28",
      "note": "user described self as good at estimating" }
  ],
  "contradicts": ["clm_01J7..."],
  "half_life_days": 180,
  "created_at": "2026-08-02T...",
  "last_updated": "2026-08-14T...",
  "user_visible": true,
  "user_disputed": false
}
```

Fields that matter and why:

- **`evidence[].kind`: `stated` vs `revealed`.** This is the single most important design decision in the whole system. Never merge them into one confidence number. A claim with high stated support and low revealed support is a *finding*, not noise — it's the thing the user most needs to see.
- **`half_life_days`.** Beliefs decay. A claim about your stress level from four months ago should not carry full weight. Different domains decay at different rates: core values slowly (years), current goals medium (months), state variables fast (days). Confidence at query time = `stored_confidence * 0.5^(age/half_life)`.
- **`contradicts`.** Don't resolve contradictions eagerly. People *are* contradictory. Hold both, surface the tension, let the user adjudicate.
- **`user_disputed`.** The user must be able to say "no, that's wrong about me." That flag should suppress the claim in reasoning but keep it in the store — because sometimes the user is wrong about themselves and the disputed-but-evidenced claim is exactly what the calibration data will vindicate later. Handle that finding *very* gently (§12).

### 5.3 The prediction record — the spine of the whole thing

```json
{
  "prediction_id": "prd_...",
  "created_at": "2026-08-23T09:00:00Z",
  "statement": "User will have pushed a commit to KrishiBot before 2026-08-30",
  "resolution_criteria": "≥1 commit to techaaditya/KrishiBot-main main branch, author=user, before 2026-08-30T23:59+0545",
  "resolution_source": "github_api",
  "probability": 0.42,
  "horizon_days": 7,
  "domain": "follow_through",
  "based_on_claims": ["clm_01J8...", "clm_01J9..."],
  "counterfactual_baselines": {
    "base_rate": 0.61,
    "generic_llm": 0.80
  },
  "resolved": null,
  "resolved_at": null,
  "outcome": null
}
```

**`resolution_criteria` must be machine-checkable or the prediction is worthless.** "Will feel less stressed" — unresolvable, don't make it. "Will have pushed a commit" — the GitHub API answers it. This constraint is annoying and it is exactly what separates this system from the fiction generators.

**`counterfactual_baselines` is your ablation, computed at prediction time.** Every prediction the twin makes, you also record what a base-rate predictor and an un-personalised LLM would have said. At the end of 12 weeks you have three calibration curves on identical data and you can state, with a number, whether modelling this person specifically was worth anything. **That is the paper.** Costs you two extra cheap API calls per prediction.

### 5.4 What the LLM does and does not do

**Does:**
- Interview. Ask the follow-up questions. This is where LLMs are genuinely excellent and it's most of the perceived product quality.
- Extract structured claims from messy language.
- Retrieve and assemble relevant claims for a query.
- Map consequences: "this path requires X, you have committed to Y, those conflict."
- Narrate simulation and forecast outputs in human language.
- Conduct reflection after an outcome resolves.

**Does not:**
- Emit probabilities that appear in the UI as numbers. (See below.)
- Invent base rates.
- Decide what the user should do.
- Serve as the memory store — retrieval over a structured claim store, not vibes over a transcript.

**On LLM probabilities.** This is subtle. An LLM asked "what's the probability Aaditya ships by Friday?" will say "70%" and it will be a token, not a belief. *But* — and this is the useful bit — an LLM's verbalised probabilities, once you have 50+ resolved predictions, can be **recalibrated post-hoc**. Fit an isotonic regression or Platt scaling from raw LLM output to observed frequency. Now "the model says 70%" maps to "historically, when it says 70% about this person in this domain, it happens 44% of the time" — and 44% is a real number.

**Show the recalibrated number. Never the raw one.** Below ~30 resolved predictions in a domain, show no number at all — show a qualitative band ("unlikely / toss-up / likely") and say plainly that calibration is still being learned. That honesty is a feature; make it visible in the UI as a "calibration confidence" meter that fills up.

### 5.5 What to build instead of "agent-based simulation of your life"

The pasted doc proposes ABM with other people as agents, an economy, causal graphs, and RL. That's five research programmes and it produces numbers with no validity. Here's the honest replacement, in build order:

**1. Constraint propagation (build this — highest value/effort ratio in the system).**
Represent the user's life as resources and commitments: hours per week, money, attention, obligations, locations, relationships. A decision consumes resources. Propagate and find the breaks.
```
Path: Master's abroad, Sept 2027
  requires: IELTS by Mar 2027 → 60-80h prep → 5h/wk for 14wks
  requires: ~NPR 2.5-4L application+test costs by Feb 2027
  requires: 2 academic referees → you named 1
  conflicts: KrishiBot commitment through Dec 2027
  conflicts: "home monthly" (you stated this twice)
  unmodelled: family health, visa policy, funding outcome
```
No probabilities. No ML. Deterministic, checkable, obviously correct when right, obviously wrong when wrong — and this is the output users find most valuable, because it's the thing they *couldn't* have written down themselves. It requires zero validation to be trustworthy.

**2. Reference-class lookup.** Curated base rates with sources, per decision type, per region. This is a content-and-data job, not an AI job. Do it manually for your first 10 decision types. Nepal-specific data is genuinely scarce, which is both a pain and a moat.

**3. Calibrated short-horizon behavioural prediction.** §5.3. The research spine.

**4. Monte Carlo over the constraint model — *only* after 1-3 work.** Once you have real distributions (from resolved predictions, from base rates), *then* sampling is meaningful: "in 1,000 runs where your IELTS prep goes at your historical rate, you miss the March deadline in 640." Every parameter traces to something measured. Before that, Monte Carlo is a random number generator with a nice chart.

**5. Causal DAGs — later, and as documentation before computation.** Draw them to make your assumptions inspectable. Don't run do-calculus on parameters you invented.

**Never: RL on the user, other-people-as-agents, or an economy simulation.** They add cost and no accuracy, and the last two make claims you cannot support.

---

## 6. Tech stack

Concrete, and biased toward things you already run.

| Layer | Pick | Why |
|---|---|---|
| Frontend | Next.js + TypeScript, Tailwind, shadcn/ui | You know it |
| Timeline/graph UI | React Flow | Every project in this space uses it, for good reason |
| Charts | Recharts or visx | Calibration curves need custom work; visx if so |
| Backend | FastAPI (Python) | Simulation + stats live in Python; don't split languages |
| DB | Postgres + pgvector | One database. See §7 |
| Queue/scheduler | Celery + Redis, or just `pg_cron` early | Resolution checks and follow-ups are scheduled jobs |
| LLM routing | LiteLLM or a thin adapter you write | Model-agnostic from day one, genuinely |
| Local model runtime | Ollama (dev) / llama.cpp (deploy) | §9 |
| Embeddings | `bge-m3` or `multilingual-e5` locally; OpenAI `text-embedding-3-small` if hosted | Multilingual matters for Nepali |
| Stats/calibration | scikit-learn (isotonic, Platt), `statsmodels`, `properscoring` | Boring and correct |
| Optional forecasting | Prophet / statsmodels / simple GLMs | Only if you have real time-series data |
| Auth | Clerk or Supabase Auth | Don't build auth |
| Hosting | Railway/Fly.io + Neon or Supabase Postgres | Cheap, Nepal-friendly latency is fine |
| Eval harness | Custom, pytest-based, versioned with the model | Non-negotiable, §11 |

**On Neo4j** (the pasted doc pushes it hard, and you've used it): **don't, not yet.** Your query patterns are "fetch claims about the user matching domain X, ranked by decayed confidence" and "find claims contradicting claim Y." Both are trivially SQL with a couple of indexes and a JSONB column. Postgres also gives you vector search, transactions, and one thing to back up. Graph DBs earn their keep on multi-hop traversal over *many* entities; you have one entity — the user — plus a few dozen people and projects around them. Revisit at 10k+ claims per user or when you're doing genuine multi-hop reasoning over relationship networks. Adding Neo4j now buys you a second database to operate and a nicer diagram.

---

## 7. Data model

Event-sourced. Six core tables.

```sql
-- L1: append-only evidence. Never UPDATE, never DELETE (tombstone instead).
CREATE TABLE evidence (
  id            uuid PRIMARY KEY,
  user_id       uuid NOT NULL,
  kind          text NOT NULL,  -- utterance|observation|integration_event|
                                -- decision_log|outcome|document
  source        text NOT NULL,  -- interview|chat|github|calendar|manual|...
  occurred_at   timestamptz NOT NULL,
  ingested_at   timestamptz NOT NULL DEFAULT now(),
  payload       jsonb NOT NULL,
  sensitivity   smallint NOT NULL DEFAULT 2,  -- 1..4, see §9
  embedding     vector(1024),
  tombstoned_at timestamptz
);
CREATE INDEX ON evidence (user_id, occurred_at DESC);
CREATE INDEX ON evidence USING hnsw (embedding vector_cosine_ops);

-- L3: derived beliefs. Fully rebuildable from evidence.
CREATE TABLE claims (
  id             uuid PRIMARY KEY,
  user_id        uuid NOT NULL,
  predicate      text NOT NULL,   -- VALUES|WANTS|FEARS|TENDS_TO|CONSTRAINED_BY|
                                  -- COMMITTED_TO|RELATES_TO|BELIEVES
  object         text NOT NULL,
  domain         text NOT NULL,
  magnitude      jsonb,
  confidence     real NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  half_life_days int NOT NULL DEFAULT 365,
  stated_weight  real NOT NULL DEFAULT 0,
  revealed_weight real NOT NULL DEFAULT 0,
  user_disputed  boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  last_updated   timestamptz NOT NULL DEFAULT now(),
  superseded_by  uuid REFERENCES claims(id)
);

CREATE TABLE claim_evidence (
  claim_id uuid REFERENCES claims(id),
  evidence_id uuid REFERENCES evidence(id),
  weight real NOT NULL,
  PRIMARY KEY (claim_id, evidence_id)
);

-- The research spine.
CREATE TABLE predictions (
  id                  uuid PRIMARY KEY,
  user_id             uuid NOT NULL,
  statement           text NOT NULL,
  resolution_criteria text NOT NULL,
  resolution_source   text NOT NULL,
  domain              text NOT NULL,
  probability         real NOT NULL,
  probability_raw     real NOT NULL,       -- pre-recalibration
  baseline_base_rate  real,
  baseline_generic    real,
  horizon_days        int NOT NULL,
  due_at              timestamptz NOT NULL,
  model_version       text NOT NULL,
  based_on_claims     uuid[],
  resolved_at         timestamptz,
  outcome             boolean,
  resolution_note     text
);

-- Decisions the user brought to the system.
CREATE TABLE decisions (
  id           uuid PRIMARY KEY,
  user_id      uuid NOT NULL,
  title        text NOT NULL,
  options      jsonb NOT NULL,       -- [{id,label,requires[],conflicts[]}]
  criteria     jsonb NOT NULL,
  assumptions  jsonb NOT NULL,       -- editable ledger, versioned
  chosen_option text,
  decided_at   timestamptz,
  followups    jsonb                 -- [{due_at, asked_at, response}]
);

-- Base rates, with sources. Manually curated. This is an asset.
CREATE TABLE reference_classes (
  id          uuid PRIMARY KEY,
  decision_type text NOT NULL,
  population  text NOT NULL,          -- "Nepali STEM grads applying to EU MS"
  outcome     text NOT NULL,
  rate        real NOT NULL,
  n           int,
  source_url  text NOT NULL,
  source_year int NOT NULL,
  caveats     text NOT NULL
);
```

`reference_classes` having a NOT NULL `source_url` is a design decision, not an oversight. If you can't cite it, it doesn't go in, and the UI says "no base rate available for this" — which is more useful than a fabricated one.

---

## 8. Model choices

### 8.1 Routing table

| Job | Model class | Concrete (Aug 2026) | Notes |
|---|---|---|---|
| Interview / follow-up questioning | Frontier, warm | Claude Sonnet-class, Gemini Pro-class | Quality here *is* the product |
| Claim extraction (structured JSON) | Mid-tier, cheap, high-volume | GPT-mini class, Gemini Flash class, or local Qwen3.5-4B | Constrained decoding / JSON schema mode |
| Consequence mapping | Frontier, reasoning | Whatever's best at multi-step | Low volume, worth the cost |
| Behaviour prediction | Two paths — see below | | |
| Narration | Mid-tier | Any | Style matters more than smarts |
| Embeddings | Local | `bge-m3`, `multilingual-e5-large` | Nepali/Devanagari support |
| Sensitive-content processing | **Local only** | Gemma 3 4B / Qwen3.5-4B / Phi-4-mini | §9 |
| Recalibration | Not an LLM | sklearn isotonic / Platt | |

Wrap everything behind one interface with a `capability` argument, not a model name. Models will change three times before you ship.

### 8.2 Behaviour prediction — the two paths

**Path 1 (start here): prompted frontier LLM + post-hoc recalibration.**
Assemble decayed claims → prompt → get raw probability → apply the user's fitted calibration map → show. Cheap, works day one, and the recalibration layer is what makes it honest.

**Path 2 (the ambitious version): personalised Centaur.**
Take the Psych-101-tuned model and adapt it per-user with a small LoRA fitted on that person's resolved predictions and behavioural log. You'd be testing whether a model pre-trained on 10M human choices, plus a few hundred of *your* choices, beats a prompted frontier model with your profile in context.

This is a real, unanswered, publishable question. It's also 3-6 months of work with GPU requirements, and it will probably fail at small N (a few hundred choices is not much to fit on). **Do it as phase 3, only if phase 1's data shows headroom.** Don't start here.

### 8.3 Local models

Current usable on-device options: Gemma 3 1B (~720MB at Q4, runs on 4GB phones, short outputs only), Gemma 3 4B / Phi-4-mini (~2.7-2.9GB, needs an 8GB phone), Qwen3.5-4B (multimodal, 256K context, ~3.4GB). Runtimes: llama.cpp, MLC LLM, Ollama; platform APIs via Apple Foundation Models (iOS 26+) and Google AI Core / ML Kit GenAI.

Realistic capability: summarisation, classification, structured extraction, redaction, simple chat. **Not** frontier reasoning. Which is fine — the jobs you want local are exactly the extraction-and-redaction jobs.

---

## 9. Privacy — the part that decides if this ships

You flagged this and you were right to. This system accumulates the most sensitive dataset a person can hand over: goals, fears, finances, relationships, weaknesses, and a log of their failures to follow through. A breach here isn't "emails leaked," it's "a psychological profile with a confidence score, ready to be used against someone."

### 9.1 Threat model — name the adversaries

| Adversary | Wants | Mitigation |
|---|---|---|
| Model provider | Training data | Data-processing terms, no-training flags, minimisation, local for sensitive |
| Your own infra breach | Everything | Encryption at rest, per-user keys, sensitivity tiering |
| Future you (the company) | Monetising the dataset | **Structural commitment now**, before there's money on the table |
| Acquirer / creditor | The dataset as an asset | Written data-disposition policy; hardest one to actually solve |
| Someone with the user's device | Everything | Local encryption, biometric gate, remote wipe |
| Coercion (partner, employer, family) | The user's private reflections | Panic-delete; no export-all-in-one-click without step-up auth |
| Government request | Identified data | Minimise what you hold; publish a transparency policy |

The last three are the ones consumer products always skip. For a product about someone's most private deliberations — *should I leave this job / this course / this person* — coercion is a live threat, not a theoretical one.

### 9.2 Sensitivity tiers — the mechanism that makes the promise real

Classify every piece of evidence on ingest, and let tier determine where it can be processed.

| Tier | Content | Storage | Processing |
|---|---|---|---|
| 1 Public | Preferences, general goals, skills | Cloud, standard | Any model |
| 2 Personal | Career plans, schedule, projects, finances-in-ranges | Cloud, encrypted | Cloud model, minimised context |
| 3 Sensitive | Named relationships, specific amounts, conflicts, health mentions | Cloud, encrypted, per-user key | **Redacted** before any cloud call |
| 4 Intimate | Anything the user marks private; distress; anything about a third party's private life | **Device only**, never uploaded | Local model only |

The redaction step for tier 3 is the interesting bit and it's a small local model's job: replace names with role tokens (`<PERSON_A:colleague>`), amounts with bands, locations with granularity-reduced forms, before the payload leaves the device. Rehydrate locally on the way back. It's imperfect — re-identification from context is real — so tier 4 exists as the escape hatch.

### 9.3 Things to commit to in writing, early

- **No training on user data.** Ever. State it in the interface, not just the policy.
- **No selling, no ad targeting, no "anonymised insights" product.** Anonymised behavioural profiles are re-identifiable and everyone knows it.
- **Full export in an open format.** The user's model is theirs.
- **Real delete.** Tombstone + re-derive + purge within 30 days, including from backups. Test the purge path before you launch, not after someone asks.
- **Per-integration consent, revocable, with an activity log** the user can read: what was accessed, when, and what left the device.

### 9.4 Regulatory

Nepal: the Individual Privacy Act 2075 (2018) and its 2077 rules exist and cover personal data; the Electronic Transactions Act applies to systems and stored data. Enforcement is thin, the framework is not comprehensive, and there's an ongoing push for a fuller data protection act — **assume it tightens.**

If you take any user in the EU/UK, GDPR applies to you regardless of where you're based. Two clauses will bite:
- **Art. 22 — automated decision-making.** A system producing individual decision recommendations is in the blast radius. Keep a human in the loop *by design* — the system structures, the user decides — and say so.
- **Art. 9 — special categories.** Inferences about health, sex life, religion, or politics get special-category protection *even when inferred rather than stated.* A system that infers "probably experiencing burnout" has inferred health data. Either don't infer it, or handle it as tier 4 with explicit consent. Given TwinMind's burnout-prediction pillar, this is not hypothetical for you.

---

## 10. Is it a game? Should it be 3D?

**Is it a game?** No — and don't market it as one. Game framing sets the expectation that the outcomes are made up, which destroys the one thing you're trying to build (trust in the numbers). It also puts you in a category where BitLife and Infinite Life Simulation have millions of installs and better retention loops than you'll build.

**Should you borrow from games?** Absolutely, and specifically:
- **Branching visualisation** — React Flow decision trees. Best available metaphor for "options over time."
- **Meaningful state readouts** — but tied to real constraints (hours left this week, rupees committed), not invented "Happiness: 74."
- **Consequence-after-choice pacing** — the reveal is what makes it feel alive.
- **A progress mechanic that's actually honest** — the calibration meter filling as your prediction history grows. That's a real, earned unlock.

**Should it be 3D?** No. Not v1, not v2, probably not ever.

Reasons, in order of force:
1. It's 60-70% of your engineering budget for zero accuracy improvement.
2. Spatial metaphors for life decisions are *bad* metaphors — walking to a building doesn't tell you anything a timeline doesn't.
3. It signals "toy" precisely when you need to signal "instrument."
4. VR/3D future-self work already exists in the psychology literature (Hershfield's age-progressed avatar studies predate the LLM era); you would not be first, and the LLM adds nothing to the 3D part.

The one legitimate 3D-adjacent element: an age-progressed portrait for a future-self conversation, which is what MIT's Future You uses. That's a single StyleGAN-style image, not a world. Cheap, effective, and already validated.

---

## 11. Evaluation protocol — the research contribution

This is the section that turns a hackathon project into something defensible. Write it before you write code.

### 11.1 Study design

**Study 1 — Fidelity benchmark (Week 1-2, no participants needed)**
Run your person-modelling pipeline against **Twin-2K-500**. Compare to the published baseline (71.72% raw accuracy, 87.67% of test-retest). If your architecture doesn't at least match it, your architecture isn't better — find out cheaply, before you've built a product on it.
Report: accuracy, ratio-to-test-retest, per-task-type breakdown.

**Study 2 — Personal fidelity (Week 3-4, N=1 to 5)**
Onboarding interview → hold out 60-100 scenario questions → twin answers → compare to human answers. Re-administer a subset at 2 weeks to get *your* test-retest baseline. Report ratio-to-test-retest, never raw accuracy — raw accuracy without the human ceiling is meaningless.

**Study 3 — Calibration on real behaviour (Week 4-16, N=10-30) ← the core**
Each participant: 3-5 machine-checkable predictions per week, 7-28 day horizons. Every prediction also gets a base-rate baseline and a generic-LLM baseline recorded at creation time.
Report per-arm: Brier score, expected calibration error, reliability diagram, discrimination (AUC), and Brier skill score of twin vs each baseline.

**The headline result you're hunting:** *does the personalised model beat a generic model on this person's behaviour, and in which domains?* Park's economic-games finding predicts it won't beat it everywhere. Mapping where personalisation pays and where it doesn't is a genuinely useful contribution.

**Study 4 — Drift (Month 1, 3, 6)**
Re-run Study 2's protocol. Does fidelity decay? At what rate? Does a twin updated with behavioural evidence decay slower than a frozen one? Cheap to run, nobody has published it for personal twins, and it directly answers "does the feedback loop actually work."

**Study 5 — Ablation: what data is worth what? (retrospective, on Study 3's corpus)**
Rebuild the person model from progressively richer inputs and re-score:
`demographics only → +interview → +stated goals → +30 days behavioural log → +90 days`
This is the pasted doc's "minimum data requirements" question, and it's the right question — it's just answerable only *after* you've collected the data in Study 3, not as a standalone.

### 11.2 Metrics — precise definitions

- **Brier score** = mean((p − outcome)²). Lower better. 0.25 = coin flip.
- **Brier skill score** = 1 − (BS_twin / BS_baseline). Positive means you beat the baseline. **This is your headline number.**
- **ECE**: bin predictions by probability, |mean(p) − observed frequency| per bin, weighted average.
- **Reliability diagram**: predicted vs observed, per bin. The plot that goes on the slide.
- **Ratio-to-test-retest**: twin accuracy ÷ human self-consistency. The only fidelity number worth quoting.
- **DPD (demographic parity difference)**: performance gap between best and worst subgroup. Report it if N allows; Park et al. did and it's now expected.

### 11.3 Non-negotiables in the harness

- No bare `except: pass`. Silent failures reported as results is how published Nepali NLP benchmarks got corrupted, and you already know this.
- Model version and prompt hash recorded on every prediction. Otherwise your longitudinal comparison is comparing two different systems.
- Resolution is automated where possible and blind-scored where not. Never let the model that made the prediction judge whether it came true.
- Pre-register Study 3 (OSF, free) before you collect data. Costs an afternoon, converts "we found a nice result" into "we predicted and confirmed."

---

## 12. Ethics and safety — the real ones

Not a compliance section. These are failure modes that hurt someone.

### 12.1 The system will influence life-altering decisions

Someone will drop out, quit, emigrate, or leave a relationship partly because of an output. Design for that:
- **The system never recommends.** It structures, surfaces, and forecasts. The user decides. Every screen should reinforce this.
- **Show the confidence and the unmodelled.** Every output ends with what the model *cannot* see. "Not modelled: family health, visa policy, funding decisions, your co-founder's plans."
- **Irreversibility flag.** Decisions that are hard to undo get an explicit warning and a nudge toward reversible experiments first ("can you test this for a month before committing?"). This is genuinely the single most useful piece of decision advice and it costs one UI element.
- **Cooling-off.** Don't let someone log an irreversible decision within minutes of a first simulation.

### 12.2 Self-fulfilling prophecy and fatalism

If the system says "you have a 30% chance of finishing this," and the person believes it, they may not finish it. You've caused the outcome you predicted. This is a real, documented mechanism in psychology, and it's *worse* for a system explicitly designed to increase the person's identification with a projected future.

Mitigations:
- Frame predictions as about **conditions, not character**: "your last four projects at this workload slipped" ≠ "you don't finish things."
- Pair every low probability with the modelled lever: "the strongest predictor in your history is whether you commit in week 1."
- Never report a negative trait as a stable disposition. `TENDS_TO` claims render as behaviour-in-context, always.
- Watch for the user internalising the model as identity. If someone starts saying "I'm a 30% person," that's a red flag in the product, not a success metric.

### 12.3 Distress

A tool where people bring their hardest life decisions will encounter people in crisis. You handled this correctly in the LumbiniX reflection companion; carry the same rules over, they're not optional:

- **Distress override.** On any indication of crisis or self-harm, the simulation flow *stops*. No prediction, no scenario, no life-score. Surface real human help.
- **Verified Nepali crisis and mental-health helpline numbers, in the app, tested.** Verified at build time and re-verified before each release — numbers change.
- **No diagnostic language.** Never "burnout risk 78%." Never "you show signs of depression." You are not a clinician and an inferred health state is special-category data under GDPR anyway (§9.4).
- **If you can't ship the override properly, cut the feature it's attached to.** That's an acceptable outcome.

### 12.4 Third parties

The person model will contain claims about people who never consented: partners, parents, co-founders, managers. Rules:
- Store them as *relationship context for the user*, never as profiles.
- Never predict a third party's behaviour. "Will your manager approve this?" is not a question this system answers.
- Third-party details default to sensitivity tier 4.
- No feature that helps a user model, persuade, or predict another named person. That's a different product and it's a bad one.

### 12.5 Vulnerable users

- 18+. Not because minors don't face hard decisions, but because a system that models a person's dispositions and shows them projected futures needs a much higher safety bar for a developing self-concept than you can clear.
- No use in employment, insurance, lending, or admissions screening. Put it in the terms and mean it. A "twin fidelity" score is exactly the kind of artefact that gets misused as an assessment.

---

## 13. Build plan

Assumes you, part-time, alongside coursework. Adjust for a team.

### Phase 0 — Decide, don't build (1 week)
- Pick the framing (§4). Write the one-sentence claim you'll defend.
- Write the eval protocol (§11) **first**. Yes, before code.
- Run your pipeline sketch against Twin-2K-500. Get a number.
- Kill criteria written down (§17).

### Phase 1 — Person model + interview (weeks 2-5)
- Evidence store, claim store, extraction pipeline, decay function.
- Interview flow: 40-60 minutes, adaptive follow-ups. **Steal Park et al.'s interview protocol structure** — it's published and validated; don't invent your own.
- Claim inspector UI: user sees every claim, its confidence, its evidence, and can dispute it. This screen is the trust anchor of the whole product and it's easy to build.
- **Deliverable:** you can interview someone and show them a model of themselves they recognise.

### Phase 2 — Constraint propagation + decision workbench (weeks 6-9)
- Decision intake → options → requirements → conflicts against claims.
- Assumption ledger: every assumption visible, editable, re-runs on change.
- Reference class table seeded with 10-15 hand-curated, sourced base rates for decisions relevant to your first users (Nepali students: study abroad, job vs Master's, startup vs employment, degree switch).
- **Deliverable:** someone brings a real decision and gets structure they couldn't have produced alone. *This is the moment the product becomes useful, and it involves no prediction at all.*

### Phase 3 — Prediction spine (weeks 8-20, runs in parallel and long)
- Prediction creation with machine-checkable resolution.
- Auto-resolution: GitHub API, calendar, manual check-in.
- Baseline arms recorded per prediction.
- Weekly check-in loop.
- Calibration fitting once N≥30 per domain; calibration dashboard.
- **Deliverable:** the first real reliability diagram for a real person. This is the artefact nobody else in this space has.

### Phase 4 — Narrative and comparison layer (weeks 14-18)
- React Flow branching timelines over the constraint model.
- Path comparison with honest labels: constraints (hard), base rates (cited), predictions (calibrated), unknowns (named).
- Future-self conversation, grounded in claims rather than invented backstory — the honest upgrade on MIT's version.
- **Deliverable:** something that demos in 3 minutes.

### Phase 5 — Research write-up (weeks 18-24)
- Studies 1-5 written up. Target: a CHI/IUI/CSCW workshop, or arXiv + a Nepali venue.
- Even a negative result ("personalisation doesn't beat generic prediction outside domain X") is publishable and genuinely useful.

**Total: ~6 months part-time to a real thing with real numbers.** A demo-only version is 3 weeks; don't build only that.

---

## 14. MVP spec — the smallest thing worth building

If you build one thing, build this. Five screens.

**1. Interview** — 45 min adaptive conversation. Ends with "here's what I think I understood," and the user corrects it. The correction step matters more than the interview.

**2. Your Model** — the claim inspector. Grouped by domain. Each claim shows confidence, a decay indicator, the evidence behind it, and stated-vs-revealed split where both exist. Dispute button on every claim. *This screen alone would differentiate you from every product in the space.*

**3. Decision** — bring one decision. System asks clarifying questions, then produces:
   - **Requires** — resources, time, money, prerequisites, per option
   - **Conflicts** — where each option collides with a stated commitment or constraint
   - **Base rates** — with sources, or an honest "no data for this"
   - **Not modelled** — the explicit blind-spot list
   - **Assumptions** — editable; changing one re-runs everything
   No probabilities on this screen unless they come from `reference_classes`.

**4. Predictions** — the calibration loop. Weekly: 3-5 short-horizon predictions, resolution status, and the reliability diagram once it's earned. Below 30 resolved, show the meter filling and the honest message that calibration is still learning.

**5. Follow-up** — at 1, 3, 6 months on a logged decision: what happened, what the model got wrong, what updates. This screen is the product's soul and it's the one everyone skips because it delivers value on a delay.

**Explicitly not in the MVP:** 3D, voice, wearables, agent-based simulation, Monte Carlo, relationship modelling, mobile app, multi-user.

---

## 15. The paper

**Working title:** *Calibrated Personal Behaviour Prediction: Does Modelling the Individual Beat Modelling the Population?*

**Research questions — all answerable with the build plan above:**

- **RQ1.** Does an interview-derived person model predict an individual's short-horizon behaviour better than (a) a base-rate predictor and (b) an un-personalised frontier LLM? *(Study 3, Brier skill score)*
- **RQ2.** In which behavioural domains does personalisation pay, and in which does it not? *(Study 3, per-domain breakdown — directly extends Park et al.'s economic-games null)*
- **RQ3.** How much and what kind of data is required for useful fidelity? *(Study 5 ablation)*
- **RQ4.** Does incorporating revealed behaviour outperform stated self-description, and by how much? *(Study 5 — the stated/revealed split is a first-class variable in your schema precisely so you can answer this)*
- **RQ5.** How fast does twin fidelity drift, and does outcome feedback slow it? *(Study 4)*
- **RQ6.** Are LLM-verbalised probabilities about a specific person recalibratable to useful accuracy, and how many resolved predictions does it take? *(Study 3 — probably the most practically useful finding in the set)*

**Explicitly out of scope, and say so in the limitations:** long-horizon life-outcome accuracy, individual counterfactual validity, and any claim that the twin "is" the person.

RQ6 is the one I'd bet on producing the cleanest, most citable result, and it's the cheapest to run.

---

## 16. Can you build a business on it?

Honest read.

### The case for
- Real pain: people making high-stakes decisions with no structure, and no tool between "make a pros/cons list" and "hire a coach at $200/hour."
- Nobody has shipped the measurement + feedback loop. Genuine white space.
- Feedback loop is a compounding moat: a user with 200 resolved predictions and a fitted calibration curve cannot switch products without losing something irreplaceable. That's rare and valuable.
- Adjacent markets pay: career coaching, financial planning, executive coaching, university counselling.

### The case against — take this seriously
- **The value is delayed by design.** Users pay now for accuracy that arrives in three months. That's a brutal activation curve.
- **Fiction retains better than calibration.** AlterPathways' ghost letter is more emotionally compelling than a Brier score. You're choosing the less fun product on purpose.
- **Big life decisions are infrequent.** Two or three a year. That's a terrible subscription cadence — which is *why* the weekly calibration loop has to carry retention, not the decision feature.
- **Trust is expensive to earn and instant to lose.** One confidently wrong output about someone's career and they're gone.
- **The honest version is a worse demo than the dishonest version.** You will lose hackathons to prettier fiction. Make peace with that or don't do it.

### Wedge
Nepali students facing the study-abroad / job / Master's fork. Reasons: you understand it, the population is large and concentrated, the decision is genuinely high-stakes and genuinely under-served, base rates are scarce (so building them is a moat), and existing "consultancies" are largely commission-driven advice-sellers with a conflict of interest. A tool with no financial stake in the answer is differentiated on day one.

Then: young professionals → career changers → an API/B2B layer for university counselling offices.

### Who pays
- Freemium: interview + one decision free; calibration loop and follow-ups paid.
- Realistic Nepal pricing: NPR 300-800/month. Global: $8-15/month.
- B2B (later): university counselling offices, per-seat. This is where the real revenue would be, and it's also where the misuse risk in §12.5 lives — be careful.

### What I'd actually advise
Build it as a **research project first, product second.** The research is publishable regardless of commercial outcome, the credibility from real numbers is exactly what a product in this space lacks, and you'll know within 4 months — from the Brier skill score — whether there's anything real underneath. If personalisation doesn't beat baseline, you've learned that for the cost of a semester and you've got a paper. If it does, you have something nobody else has and evidence to prove it.

---

## 17. Kill criteria — write these down now

Decide in advance, when you're not emotionally invested:

- Your architecture doesn't match the Twin-2K-500 published baseline after two honest attempts → your person modelling isn't the contribution; pivot to the constraint/decision layer, which stands on its own.
- After 100+ resolved predictions, Brier skill score vs generic-LLM baseline is ≤ 0 across all domains → personalisation adds nothing; the product is a decision-structuring tool, not a twin. **Publish that. It's a real finding.**
- Users don't return for the follow-up loop after 3 attempts at different framings → the feedback loop is your moat and nobody wants it; you're building a narrative generator, which is a crowded market.
- You find yourself writing a number into the UI that you can't trace to resolved data or a cited source → stop. That's the moment this becomes the thing you set out not to build.

---

## 18. Open questions to settle before writing code

1. Which framing (§4)? Commit in writing.
2. What is the single sentence you'd defend under questioning? Write it. If it contains "predicts your future," rewrite it.
3. Who is user #1, by name? What decision are they facing? Build for them, not for a persona.
4. Which 10 base rates will you curate first, and do the sources exist? Go check — an afternoon of searching for Nepali outcome data will tell you a lot about feasibility.
5. Solo or team? The eval work and the product work are different skill sets and both are needed.
6. Is this the ILPRL internship project, a thesis, a startup, or a hackathon entry? Each wants a different shape. Deciding late is expensive.
7. What existing project does this displace? You have several running. This one is 6 months minimum.

---

## 19. Reading list

**Read these three properly. In this order.**

1. **Park, J.S. et al. (2024). "Generative Agent Simulations of 1,000 People."** arXiv:2411.10109. Code: `github.com/joonspk-research/genagents`. The architecture, the interview protocol, the test-retest framing, and the economic-games null. Everything you need.
2. **Toubia, O. et al. (2025). "Twin-2K-500."** arXiv:2505.17479. Data: `huggingface.co/datasets/LLM-Digital-Twin/Twin-2K-500`. Your benchmark and your baseline numbers.
3. **Binz, M. et al. (2025). "A foundation model to predict and capture human cognition."** *Nature*. arXiv:2410.20268. Centaur + Psych-101. The ambitious path for behaviour prediction.

**Then:**

4. **Pataranutaporn, P. et al. (2024). "Future You."** arXiv:2405.12514. RCT, future self-continuity, the psychological benefit that doesn't depend on accuracy. Live at `futureyou.media.mit.edu`.
5. **Hershfield, H.** on future self-continuity — the underlying psychology, pre-LLM, and the citation that makes your wellbeing claim credible.
6. **Kahneman & Lovallo** on the outside view / reference-class forecasting. Short, and it's the intellectual basis for §5.5 step 2.
7. **Tetlock, "Superforecasting."** The calibration methodology you're building, applied to world events instead of personal behaviour. Read it for the practice of scoring, not the geopolitics.
8. **Holland (1986), "Statistics and Causal Inference."** The fundamental problem of causal inference, stated properly. One paper, and it's why §3.2 exists.

---

## Appendix A — Corrections to the pasted ChatGPT document

Keeping this explicit so you don't accidentally carry the errors forward.

| It said | Correction |
|---|---|
| "How do we model the person" is THE problem | It's the *tractable* problem. The world model is the hard one, and the doc never mentions it. |
| Simulations output "Path A 37%, Path B 48%" | These probabilities have no data-generating process. Fabricated. |
| "Career +18%, Stress +21%" per path | Same. Fake precision. Delete this pattern entirely. |
| Agent-based modelling with other people as agents, economy, RL | Five research programmes, no validation possible, no accuracy gain. Replace with constraint propagation + reference classes. |
| Neo4j + graph RAG "fits extremely well" | Premature. Postgres + pgvector until you have multi-hop reasoning over many entities. |
| "Twin fidelity 86%" from hypothetical scenario agreement | Correct as a first metric, but it measures agreement on hypotheticals, not real behaviour. Report ratio-to-test-retest and add calibration on resolved predictions. |
| Existing work = AlterPathways, Life Vector, OMEGA, a Devpost project | Missed Park et al., Twin-2K-500, Centaur, and Future You — i.e. the entire relevant literature. |
| Feedback loop as differentiator | **Correct, and the best idea in the doc.** Kept and made central. |
| Stated vs revealed preference gap as signal | **Correct, and the second-best idea.** Kept, made a first-class schema field. |
| Assumption transparency ("change any assumption, re-run") | **Correct.** Kept as the assumption ledger. |
| 3D as a later phase | Right to defer. I'd go further: don't. |
| "Test your decisions before you live them" | Good line. Keep it. |

---

*Everything above is designed so that a reader can check it. If a number appears in your product, it should be checkable too. That constraint is the whole project.*
