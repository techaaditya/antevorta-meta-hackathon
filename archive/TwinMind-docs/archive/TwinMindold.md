# Project "TwinMind" — Master Technical & Strategic Documentation

**Prepared:** 29 July 2026
**Subject:** Empathetic voice-enabled digital twin — burnout prediction + future-self simulator
**Repo audited:** `github.com/techaaditya/GeminiLiveAgentChallenge2026` @ `main`
**Status:** Concept strong / execution plan needs surgery / name must change / target event must change

---

## 0. Executive verdict

**Is this worth building? Yes — but not the version in the PDF.**

The pitch document describes four products stapled together. Each one is a startup on its own:

1. A passive behavioural telemetry system (Digital Mirror)
2. A physiological burnout predictor (Cognitive Load Index)
3. A life-decision simulator with voice (Future Self)
4. An ambient screen-watching wellbeing agent (Guardian)

Building all four at hackathon quality means building four things badly. The judge-facing consequence is predictable: the demo has four shallow surfaces and no single moment that is undeniably impressive.

**The recommendation in one line:** cut to the Future Self Simulator as the product, keep a *thin* evidence layer (calendar + GitHub only) as the thing that makes it personal, and drop the wearable/burnout-prediction claims entirely or reframe them as "context," not "prediction."

The Future Self pillar is the only part of this concept that is (a) genuinely novel, (b) scientifically defensible, (c) demo-able in 90 seconds, and (d) not already owned by a funded competitor. Everything else in the PDF is a crowded market or a scientific overclaim.

### Score card

| Dimension | Score | Note |
|---|---|---|
| Emotional resonance | 9/10 | Real, universal, judges feel it |
| Novelty (Future Self voice) | 7/10 | MIT did text; live voice + behavioural grounding is new |
| Novelty (burnout prediction) | 2/10 | Extremely crowded, and the science doesn't support the claim |
| Novelty (screen-watching agent) | 2/10 | Multiple funded products + a hackathon honourable mention already |
| Technical feasibility (full PDF scope) | 3/10 | 4 products, wearable APIs mid-migration, OS-level constraints |
| Technical feasibility (Future Self core) | 8/10 | Live API does the hard part |
| Demo-ability | 9/10 | Voice demos are rare and memorable |
| Defensibility as a startup | 4/10 | Thin moat; the data-collection layer is the only moat and it's expensive |
| Scientific rigour of claims as written | 2/10 | See §5 — several claims are not supportable |
| **Overall, as scoped in the PDF** | **5/10** | |
| **Overall, rescoped per §6** | **8/10** | |

---

## 1. Critical findings (read before anything else)

### 1.1 The target hackathon has ended

The Gemini Live Agent Challenge:

- Announced ~7 March 2026, submissions closed **16 March 2026**
- Judging 17 March – 3 April 2026
- Winners announced **15 May 2026**
- 11,878 participants, 1,536 projects, 151 countries
- $80,000 total prize pool, $25,000 grand prize

Source: https://cloud.google.com/blog/topics/developers-practitioners/winners-and-highlights-of-the-gemini-live-agent-challenge

Today is 29 July 2026. That door is shut. You need a new target — see §15 for currently-open options.

**Why this matters beyond logistics:** the winner list tells you exactly what a Google judging panel rewarded in this exact category, three months ago. That is free competitive intelligence and it is unkind to your current scope.

### 1.2 Three of the 2026 winners overlap your pillars

| Winner | Award | Overlaps your pillar |
|---|---|---|
| **JohnKeats.AI** — voice-first emotional companion that reads pitch, pacing and tone, reacts to emotional state in real time, listens without rushing to solutions | Best technical execution & agent architecture | **Pillar 4 + "Calming Vocal Adaptation"** — this is literally your feature, and it already won a category |
| **Rayan Memory** — background agent that passively listens, extracts ideas as artifacts, builds an explorable 3D memory palace you converse with | Best innovation & thought leadership | **Memory Timeline / second brain** |
| **VibeCat** — proactive macOS companion that watches your screen, understands context, speaks up before you ask, acts on permission | Honourable mention | **Pillar 4 Screen Guardian** |
| **ORION** — voice-directed surgical co-pilot for robotic surgery | **Grand prize** | Nothing — note the shape: *narrow, high-stakes, one professional user, unambiguous value* |

Read the grand prize winner carefully. It is not a broad life-companion. It is one voice interface for one job where the alternative is breaking scrub during surgery. Narrowness won.

**Actionable conclusion:** "empathetic voice companion that adapts its tone to your stress" is now a *solved and awarded* demo in this ecosystem. If you lead with it you are competing against a known winner on their own turf. Lead with the Future Self instead — none of the winners touched it.

### 1.3 The name is taken by a funded competitor

**TwinMind** = ThirdEar AI Inc.

- Founded March 2024 by ex-Google X scientists Daniel George (CEO), Sunny Tang, Mahi Karim (CTOs)
- $5.7M seed led by Streamlined Ventures, with Sequoia Capital and Stephen Wolfram participating; ~$60M post-money
- 30,000+ users; iOS, Android, Chrome extension
- Positioning: "AI second brain" — passively captures ambient speech, builds a personal knowledge graph, generates notes/to-dos/answers
- On-device transcription, 16–17 hours continuous capture without draining battery, works offline, 100+ languages
- "Ear-3" speech model, 140 languages, speaker diarisation, offered via API

Sources: https://techcrunch.com/2025/09/10/ex-google-x-trio-wants-their-ai-to-be-your-second-brain-and-they-just-raised-6m-to-make-it-happen/ · https://apps.apple.com/us/app/twinmind-ai-notes-memory/id6504585781

This is not a minor collision. It is the *same product category*, the *same tagline shape* ("digital twin of your mind / second brain"), and they are ahead of you on the hardest technical problem (all-day on-device capture without battery death). Your "Memory Timeline: a clean, searchable record of your daily breakthroughs" is their entire product.

**You must rename.** Beyond trademark exposure, every judge who has heard of them will assume you cloned them.

#### Naming candidates

Pick something that signals *time* and *decision*, not *twin* and *mind*:

| Name | Rationale | Risk |
|---|---|---|
| **Hindsight** | The whole product in one word — hindsight, delivered in advance | Common word, weak trademark, several small products use it |
| **Longview** | Literally future self-continuity | Financial firms use it |
| **Antevorta** | Roman goddess of the future; her sister Postvorta governs the past | Obscure, hard to spell |
| **Prolepsis** | Rhetorical term: representing a future act as already done | Too academic |
| **Fetch** *(Nepali/Sanskrit angle)* | e.g. **Bhavishya** (भविष्य, "future"), **Agrima** ("the one ahead") | Culturally distinctive, memorable in South Asia, likely clear |
| **Fork** | Decision trees, git forks — reads well to a developer audience | Overloaded in tech |
| **Elder** | Your future self as elder; warm, one syllable | Slightly religious connotation |

My pick: **Antevorta** if you want gravitas, **Longview** if you want clarity, **Bhavishya** if you want to be remembered by a judging panel that has already seen 400 English-named agents. Check on Devpost, GitHub, npm, and a basic trademark search before committing.

### 1.4 The repository does not run

I downloaded and read the repo. It is a well-organised scaffold that has never executed. Full audit in §2, but the headlines:

- `google.adk.agents.LiveAgent` **does not exist.** ADK exposes `Agent` / `LlmAgent`; live streaming is handled through `Runner` with a live request queue, not a `LiveAgent` class.
- `google.adk.tools.Tool.from_function` **does not exist.** ADK uses `FunctionTool`, and in most cases you pass plain Python functions directly to the agent's `tools` list.
- `LiveAgent(voice_config={...}, generation_config={...})` — neither kwarg exists on any ADK agent.
- `agent.handle_request({...})`, `agent.live_session()`, `session.send_audio()`, `session.interrupt()`, `response.tool_result` — none of these are real ADK/GenAI SDK methods.
- `google-adk==0.1.0` pinned in requirements. ADK has moved many major versions since; pinning 0.1.0 will not give you anything resembling the code written against it.
- `gemini-2.0-flash-live-001` as the default model — 2.0-family models are shut down.
- README claims Imagen 3 for visualisations — **all Imagen models were deprecated with shutdown as early as 30 June 2026**; the migration path is the Gemini Image ("Nano Banana") models.
- `frontend/lib/liveApi.ts` records audio as `audio/webm;codecs=opus` in 100 ms `MediaRecorder` chunks and base64s each blob over a WebSocket. The Live API expects **raw 16-bit PCM at 16 kHz, little-endian, mono**. WebM/Opus chunks are not decodable as a continuous stream; chunk 2 onwards has no container header. This will produce silence or garbage. You need `AudioWorklet` → Float32 → Int16 PCM.
- `AudioContext({sampleRate: 16000})` is created but never connected to the recorder — it does nothing.
- `captureScreen()` calls `getDisplayMedia()` **per capture**, meaning a new browser permission prompt and a fresh stream every single frame, then immediately stops all tracks. On stage this will show a permission dialog every time the agent looks at your screen.
- `predict.py` is a hand-tuned linear formula with hard-coded weights (`sleep_penalty = (7 - sleep) * 8`, `meeting_load = meetings * 6`) that then reports `"confidence": 0.82`. That number is invented. It is not derived from anything. See §5.2 — this is the single biggest integrity risk in the project.
- `db = firestore.Client()` at module import in every tool file. Import-time side effects; no project ID; will crash on cold start without ADC.
- `allow_origins=[FRONTEND_URL, "*"]` with `allow_credentials=True` — the wildcard makes the whole list meaningless and browsers reject credentialed wildcard CORS anyway.
- WebSocket endpoint has no authentication at all. `user_id` is a path parameter. Anyone can connect as anyone. Same for `GET /twin/{user_id}` and `GET /memories/{user_id}` — full read access to any user's twin state and memories with no auth. For a product whose entire premise is intimate personal data, this is disqualifying.

**Assessment:** this looks like output from a single large "generate my whole project" prompt that was never executed. It is a decent *blueprint* — file layout, tool decomposition, and prompt separation are all sensible — and a *non-functional codebase*. Treat it as a spec, not as code. Rewrite the backend from the current ADK quickstart.

---

## 2. Full repository audit

### 2.1 Inventory

```
twinmind_complete_guide.md          2,384 lines  (planning doc)
twinmind/
  README.md                            92 lines
  deploy.sh
  seed_demo_data.py
  backend/
    agent.py                          196 lines  ← FastAPI + ADK, non-functional
    requirements.txt                   17 lines
    Dockerfile
    prompts/  core_agent.txt, future_self.txt, screen_agent.txt
    models/   twin_model.py, digital_signature.py
    tools/    memory, calendar_tool, github_tool, predict,
              simulate, screen, footprint, visualize
  frontend/  Next.js 14 app router
    lib/liveApi.ts                     93 lines  ← audio pipeline, broken
    lib/firestore.ts
    components/ LifeScore, ToxicityRadar, CognitiveLoadChart,
                MemoryTimeline, FuturePathCards, TwinMindSession
    app/ page.tsx, layout.tsx, api/agent/route.ts, api/session/route.ts
```

Total ~328 KB. Structure is genuinely good. Implementation is aspirational.

### 2.2 Defect register

| # | Severity | File | Defect | Fix |
|---|---|---|---|---|
| 1 | **Blocker** | `agent.py` | `LiveAgent` class doesn't exist in ADK | Use `Agent`/`LlmAgent` + `Runner` with live request queue; read current ADK streaming docs |
| 2 | **Blocker** | `agent.py` | `Tool.from_function` doesn't exist | Pass plain functions in `tools=[...]`, or wrap in `FunctionTool` |
| 3 | **Blocker** | `agent.py` | `voice_config` / `generation_config` kwargs invented | Voice goes in `RunConfig` → `speech_config` → `voice_config.prebuilt_voice_config.voice_name` |
| 4 | **Blocker** | `agent.py` | `live_session()`, `send_audio()`, `interrupt()`, `response.tool_result` invented | Rewrite against real streaming API |
| 5 | **Blocker** | `liveApi.ts` | WebM/Opus chunks sent where raw PCM16 @16 kHz required | `AudioWorklet` → Float32Array → Int16 PCM → base64; output playback at 24 kHz |
| 6 | **Blocker** | `requirements.txt` | `google-adk==0.1.0`, `google-generativeai==0.7.0` | Move to current `google-adk` and the unified `google-genai` SDK |
| 7 | **Blocker** | `agent.py` | `gemini-2.0-flash-live-001` retired | See §8 model matrix |
| 8 | **Blocker** | `README.md` | Imagen 3 — deprecated, shutdown from 30 June 2026 | Nano Banana 2 / Nano Banana 2 Lite, or drop image gen entirely |
| 9 | **Critical** | `agent.py` | Zero auth on WebSocket and all REST endpoints | Firebase Auth ID token verification on every route; derive `user_id` from the token, never from the path |
| 10 | **Critical** | `agent.py` | `allow_origins=[url, "*"]` + `allow_credentials=True` | Explicit origin list, no wildcard |
| 11 | **Critical** | `predict.py` | Fabricated `"confidence": 0.82` on a hand-tuned formula | Remove the number, or replace with a real interval — see §5.2 |
| 12 | **High** | all `tools/*.py` | `firestore.Client()` at import time | Lazy singleton via `@lru_cache` |
| 13 | **High** | `agent.py` | User context injected as a formatted string into the prompt (`[USER_ID: ...]`) | Prompt-injection surface and unreliable. Pass identity through session state, not message text |
| 14 | **High** | `liveApi.ts` | `getDisplayMedia()` called per frame | Acquire stream once, hold it, sample frames from it on an interval |
| 15 | **High** | `simulate.py` | Asks the model for JSON with `...` literal placeholders in the schema example | Use structured output / response schema, not prose instructions |
| 16 | **Medium** | `agent.py` | `asyncio.gather` on two infinite loops with no cancellation on disconnect | `TaskGroup` with cancellation, plus session-resumption handling |
| 17 | **Medium** | `liveApi.ts` | `ws.onclose` wired to `reject` — fires after successful open too | Only reject before open |
| 18 | **Medium** | `predict.py` | Writes to Firestore inside a function the LLM calls as a tool | Separate read tools from write tools; make writes explicit and idempotent |
| 19 | **Medium** | `agent.py` | `/update_twin` invoked by Cloud Scheduler with no auth | OIDC service-account auth on the scheduler job |
| 20 | **Low** | `Dockerfile`/`deploy.sh` | Not reviewed in depth but deploy script is a bonus-points item | Devpost-style events award points for IaC — keep and improve |

### 2.3 What to keep from the repo

- The **tool decomposition** (`memory`, `calendar`, `github`, `predict`, `simulate`, `screen`, `footprint`, `visualize`). This is the right way to think about it.
- The **separation of prompts into files** (`core_agent.txt`, `future_self.txt`, `screen_agent.txt`) — good practice, keep it.
- The **two-agent split** (core twin vs future self with different voices). Conceptually correct, and the distinct-voice idea is the best UX instinct in the whole document.
- The **`seed_demo_data.py`** idea. Essential — see §14.
- The **deploy script**. Automated deployment is explicitly a bonus criterion at Google-run events.
- The **frontend component list**. Reasonable dashboard decomposition.

---

## 3. Prior art and competitive landscape

You asked whether anything like this exists. Yes — extensively, in every direction. Here is the honest map.

### 3.1 The Future Self direction (your strongest pillar)

**MIT Media Lab — "Future You"** is the direct academic precedent, and it is very close to your concept.

- System: LLM generates a personalised backstory from the user's biography and goals, constructs plausible future experiences, and uses those as prompts for real-time conversation. A StyleGAN model produces an age-progressed avatar.
- Framing: the AI acts as a **mirror, not a counsellor** — explicitly distinguished from therapeutic chatbots like Woebot.
- Evidence: pre-registered randomised controlled trial, 188 participants; a separate study with 344 participants (10–30 min interaction vs generic chatbot vs survey-only control).
- Findings: reduced anxiety, reduced negative emotions, increased future self-continuity. Users reported the conversation felt sincere and that values/beliefs stayed consistent in the simulated identity.
- Paper: *Future You: A Conversation with an AI-Generated Future Self Reduces Anxiety, Negative Emotions, and Increases Future Self-Continuity* — arXiv:2405.12514 (Pataranutaporn, Winson, Yin, Lapapirojn, Ouppaphan, Lertsutthiwong, Maes, Hershfield)
- Live: https://futureyou.media.mit.edu · Project page: https://www.media.mit.edu/projects/future-you/overview/

Note the last author: **Hal Hershfield** (UCLA Anderson), whose body of work on *future self-continuity* is the foundational psychology here — the finding that people who feel more connected to their future selves make better long-term financial and health decisions.

**This is good news, not bad news.** It means:

1. Your central mechanism has RCT-grade evidence behind it. You can say "this intervention has been shown in a pre-registered RCT to reduce anxiety and increase future self-continuity" and cite a real paper. Almost no hackathon project can say that.
2. Your differentiation is clear and stateable: **MIT's Future You is text-based and built from a self-report survey. Yours is live voice, and the backstory is generated from behavioural evidence the user didn't have to self-report.** That is a genuine, defensible, one-sentence delta.
3. Ethics precedent is established, including their own caution about AI-generated content.

**Commercial "future self" apps** exist too — a scattering of age-progression photo apps and "letter to your future self" services. None combine live voice with behavioural grounding. The space is open.

### 3.2 The ambient-capture / second-brain direction (crowded, avoid)

| Product | What it does | Status |
|---|---|---|
| **TwinMind** (ThirdEar AI) | All-day ambient audio → knowledge graph, on-device, 16–17h | $5.7M seed, 30k+ users, Sequoia + Wolfram |
| **Limitless** (formerly Rewind) | Pendant + app, records meetings and screen, searchable | Well funded, shipping hardware |
| **Otter / Fireflies / Granola** | Meeting-scoped transcription and notes | Mature, entrenched |
| **Rayan Memory** | 3D memory palace from passive audio | Won a Gemini Live Agent Challenge category |

Your "Memory Timeline" competes with all four and beats none. **Cut it or reduce it to a by-product** (the twin remembers what you told it in session — that's it, no ambient capture).

### 3.3 The calendar-defence direction (crowded, commoditised)

| Product | Overlap with your "Deep Work Auto-Shielding" |
|---|---|
| **Reclaim.ai** (acquired by Dropbox) | Auto-blocks focus time on Google Calendar based on your habits. This is your feature, shipped, at scale, for years |
| **Clockwise** | Same, with team-level optimisation |
| **Motion** | AI scheduling + task auto-planning |
| **Google Calendar** native focus time | Built into the platform you're integrating with |
| **Microsoft Viva Insights** | Enterprise wellbeing analytics, "quiet time," burnout signals |

"It auto-blocks recovery hours on your calendar" is not a differentiator in 2026. It's a checkbox. Keep it as a *tool the agent can call during the demo* because it's a nice "the AI took an action" beat — but never present it as the innovation.

### 3.4 The screen-watching agent direction (crowded, and OS-constrained)

**VibeCat** won an honourable mention doing exactly this. Beyond that: Microsoft Recall, various Copilot screen-awareness features, and a long tail of macOS companions. Also, **"toxicity detection on your screen" is a product with a serious false-positive problem** — a Slack message where a colleague is being blunt reads identically to abuse without relationship context, and being told "that message was toxic" about a normal exchange is itself harmful.

### 3.5 The burnout-from-wearables direction (crowded *and* scientifically weak)

Whoop, Oura, Garmin Body Battery, Fitbit Daily Readiness, Samsung Health energy score, Apple Watch mindfulness/State of Mind, plus enterprise plays like Viva Insights. All of them have more sensor data, more longitudinal history, and better hardware than you will have.

More importantly the science doesn't support what your PDF claims. See §5.

### 3.6 Where the white space actually is

Nobody is doing: **a live-voice future-self conversation whose persona is constructed from behavioural evidence rather than a self-report questionnaire, with a visual decision tree that makes the compounding consequences of small choices legible.**

That's your product. One sentence. Build that.

---

## 4. Honest evaluation of the concept

### 4.1 What is genuinely strong

**The emotional premise is real.** Career-decision paralysis and quiet burnout are near-universal among the people who judge hackathons. The pitch lands in the first ten seconds. That is worth a lot and you should not undervalue it.

**Voice is the right modality for this specific use case.** Most voice AI demos are voice bolted onto something that would work fine as text — a search box you talk to. Yours is different: hearing advice in a voice that is recognisably a version of your own is *the mechanism*, not the interface. The MIT work found the interaction felt sincere and identity-consistent. Voice should amplify that. This is one of the rare cases where "why voice?" has a real answer.

**Two distinct voices is a genuinely good UX idea.** Aoede for the present twin, a different voice for the future self, is the kind of small decision that makes a demo feel designed rather than assembled. Keep it. (Note: check current voice availability — native audio output models support the full TTS voice set, and the roster has changed since the repo was written.)

**The decision tree visual is underrated.** Buried as a "high-need addition," this is arguably your second-best feature. Making the compounding effect of small choices *visible* is exactly what future-self-continuity research says people are bad at imagining. A branching tree where "take the side project" and "don't" diverge visibly over five years is a strong, screenshot-able artifact.

### 4.2 What is weak

**"Cognitive load index" is a number you made up.** In the current code it's `25 + (7-sleep)*8 + meetings*6 + min(screen/60*4, 20) + switches*2 + stress*15`, clamped to [10, 95], with hourly multipliers of 1.1 for post-lunch and 1.2 for late afternoon. Every coefficient is arbitrary. Then it returns `"confidence": 0.82`.

A judge who is a working ML engineer will ask "what's the confidence derived from?" and there is no answer. This is the question that ends demos. See §5.2 for how to fix it honestly.

**"Warns you hours ahead of a crash" is not supportable.** See §5.1.

**"Simulates three distinct 5-year paths based on your real personality traits"** — the simulation is one LLM call producing plausible-sounding narrative fiction. There is no model of career outcomes, no base rates, no calibration. `"probability": 0.32` in your JSON schema is a number the LLM generated. It means nothing.

This does not make the feature useless — MIT's whole point is that the *value is reflective, not predictive*. But you must frame it that way or you are lying to users about a life decision, which is a different category of harm from a wrong movie recommendation.

**Four pillars means no pillar.** Restating the core problem: in a demo you have roughly 3 minutes. Four features means 45 seconds each. Nothing lands.

**The privacy story as written is a liability, not an asset.** "All data is encrypted at rest in Firestore" is table stakes that Google provides for free — it isn't a privacy architecture. Meanwhile the actual code has zero authentication and streams screen contents to a third-party API. See §10.

**No moat.** If this works, Reclaim adds a future-self mode in a quarter. Your only durable asset is longitudinal behavioural data, which requires users to trust you with intimate data before you have a reputation. That's a hard cold-start, and it's worth saying out loud in your own planning even if not in your pitch.

### 4.3 The uncomfortable question

Your PDF's Tab 2 says this has "an incredibly strong chance of winning a grand prize." That assessment was written before the results were in. The actual grand prize went to a narrow, single-purpose surgical voice tool. The emotional-companion category was won by something simpler than yours (JohnKeats.AI does one thing: listens well, reads vocal affect).

The pattern in the winner list is: **narrow scope, executed completely, with one unmistakable moment.** Your PDF's instinct — add more high-need features — is backwards. Every "🔥 High-Need Addition" in that document is scope you should cut.

---

## 5. Scientific grounding — what you can and cannot claim

You want honest content, so here is the part that will be uncomfortable.

### 5.1 Wearables cannot predict burnout. The evidence says so directly.

A scoping review of wearable technologies for detecting burnout and wellbeing in healthcare professionals (10 studies from an initial 505; 9 used wrist-worn biosensors; mostly observational cohorts with low risk of bias) found:

> **No physiological measures were reliably associated with burnout or anxiety.** Step count and time in bed were associated with depressive symptoms. Heart rate and HRV were associated with **acute stress**.

Source: https://www.sciencedirect.com/org/science/article/pii/S1438887124003364

The review also noted the field lacks long-term (≥12 month) observations and large samples, and has insufficient reporting standards on device adherence and sampling frequency.

There is more recent work — a cross-sectional study of 57 ICU nurses found an HRV-inclusive logistic regression outperformed a demographic/psychometric-only model on AUC-ROC and accuracy — but the authors themselves flag that N=57 limits generalisability and that the cross-sectional design prevents causal inference. Source: https://www.medrxiv.org/content/10.1101/2025.09.06.25335221v1

**What this means for you:**

| Your PDF claims | Supportable? | What you can say instead |
|---|---|---|
| "flags exhaustion before you feel it" | ❌ No | "shows you what your week actually looked like" |
| "warns you hours ahead of a crash" | ❌ No | (drop entirely) |
| "burnout warnings are incredibly accurate and personalized" | ❌ No | (drop entirely) |
| "combines screen activity with physical stress signals ensuring accuracy" | ❌ No | "adds physiological context to what you're telling it" |
| HRV reflects acute stress | ✅ Yes | "your HRV was low the mornings after your three heaviest meeting days" |

**Sensor accuracy is a second, separate problem.** Even the acute-stress signal degrades in consumer hardware:

- Validation of nocturnal RHR/HRV across Garmin Fenix 6, Oura Gen 3, Oura Gen 4, Polar Grit X Pro and Whoop 4.0 against ECG (13 adults, 536 nights): interdevice accuracy **varied significantly**. Oura Gen 3 and Gen 4 were most accurate for RHR (CCC 0.97/0.98, MAPE 1.67%/1.94%); Polar showed poor agreement (CCC 0.86) and Whoop moderate (CCC 0.91). Garmin had to be excluded from RHR analysis for methodological inconsistencies. Source: https://physoc.onlinelibrary.wiley.com/doi/10.14814/phy2.70527
- PPG-derived HRV is less accurate than ECG-derived, particularly for high-frequency components, and suffers from motion artifact, poor skin contact and ambient light interference. Sleep staging from accelerometry + HR achieves roughly **60–70% agreement** with polysomnography, systematically underestimating REM and overestimating deep sleep.

So the daytime HRV you'd actually be reading is the least reliable variant of an already-noisy metric, and the "sleep_hours" input to your load formula is itself ±30%.

### 5.2 How to be honest and still have a good demo

You do not need prediction. You need **legible reflection**. Three concrete reframes:

**Reframe 1 — Describe, don't predict.**
Instead of "your burnout risk is 73/100, critical," say: "Over the last 14 days, your meeting hours went up 40% and your commits after 10pm doubled. Three of the last five mornings your resting heart rate was above your own baseline." Every clause is a fact you actually have. It is *more* impressive than a fabricated score, because it's specific.

**Reframe 2 — Make the index transparent and self-reported-anchored.**
If you want a single number, make it a **weighted index the user can see and tune**, and calibrate it against a validated instrument. Use the Copenhagen Burnout Inventory (public domain) or the Oldenburg Burnout Inventory as a weekly two-minute check-in. Then your index has a target variable, and you can honestly say "correlates at r = 0.6 with your own weekly self-report over 8 weeks." That is real, small, and defensible. And the visible slider weights turn a black box into a feature.

**Reframe 3 — Show your uncertainty in the UI.**
A cognitive load timeline drawn as a *band* rather than a line, widening as it projects further, communicates more competence than a confident wrong number. Judges notice this.

**Delete the hard-coded `"confidence": 0.82`.** Right now it is the single most falsifiable claim in your codebase.

### 5.3 What you *can* claim, with citations

- Future self-continuity is an established construct with real downstream effects on long-term decision-making (Hershfield's body of work).
- Conversing with an AI-generated future self reduced anxiety and negative emotions and increased future self-continuity in a pre-registered RCT (MIT Media Lab, arXiv:2405.12514).
- HRV is associated with acute stress (scoping review above) — note *acute*, not burnout.
- Consumer wearables are suitable for **trend monitoring** used longitudinally, per the validation study's own conclusion — which is exactly the framing you should use.

Being the team that says "here's what the literature supports and here's what it doesn't" in front of a technical panel is a *massive* credibility win. Almost nobody does it. Do it.

---

## 6. Scope surgery — what to actually build

### 6.1 The cut list

| Feature | Verdict | Why |
|---|---|---|
| Future Self Simulator (voice) | **KEEP — this is the product** | Novel, evidenced, demo-able |
| Interactive Decision Tree | **KEEP — this is the visual** | Makes compounding legible; screenshot-able |
| Google Calendar read | **KEEP** | Cheap, reliable, generates real evidence |
| GitHub read | **KEEP** | Cheap, reliable, and *you're a developer* — you can demo on your own real data |
| Calendar write (block focus time) | **KEEP as one demo beat** | The "agent took an action" moment. Not the pitch |
| Memory of the session | **KEEP, minimal** | Firestore, conversation-scoped only |
| Cognitive load index | **KEEP, reframed** | Descriptive, transparent, user-tunable — §5.2 |
| Burnout *prediction* | **CUT** | Not supportable |
| Wearable integration | **CUT for v1** | See §9.4 — the APIs are mid-migration and it adds a week for a signal that's mostly noise |
| Screen scanning / toxicity | **CUT** | Crowded, high false-positive harm, permission-hostile, and already won by someone else |
| Ambient audio capture / second brain | **CUT** | TwinMind owns this |
| Calming vocal adaptation | **CUT or demote** | Already a category winner; and native affective dialog does much of this for free |
| Imagen-generated life-path visuals | **CUT for v1** | Imagen is dead; regenerate as SVG/D3 instead — faster, sharper, deterministic |

Roughly 60% of the PDF gets cut. The remaining 40% becomes a complete product instead of four fragments.

### 6.2 The rescoped product, in one paragraph

> A voice agent that reads your calendar and your commit history for the last 90 days, builds an evidence-grounded portrait of how you actually work, and then lets you have a live spoken conversation with a simulated version of yourself five years down each of three branching paths — while a decision tree on screen shows how today's small choices compound. It doesn't predict your future. It makes it concrete enough to argue with.

That's the pitch. One breath.

### 6.3 The one moment

Every winning demo has one. Yours:

> The user says out loud: *"Should I take the contract work, or finish the degree?"*
> The tree on screen splits into two branches, growing.
> A different voice — older, slower, unmistakably not the assistant that was just talking — says something specific back, referencing something the user actually did: *"You already know how this goes. You did the same thing in March, remember? Forty-one commits that week, and you pushed the thesis chapter to April. I'm not going to tell you it was wrong. But I want you to notice you've made this choice before."*

The specificity is what sells it. It only works because you read the GitHub data. **That's why the evidence layer exists** — not to predict burnout, but to make the future self *know things*.

---

## 7. Recommended architecture

### 7.1 Principle

The naive design streams everything through one always-on Live API session. That is expensive, fragile, and unnecessary. **Split the system by latency requirement.**

| Tier | Latency budget | What runs here | Model class |
|---|---|---|---|
| **Tier 0 — Local** | <10 ms | Audio capture/playback, VAD, PCM conversion, PII redaction, tree rendering | None (or on-device Gemma 4 E2B — §10.4) |
| **Tier 1 — Live conversation** | <500 ms round trip | Voice in / voice out, barge-in, tool calls during conversation | Live API native audio |
| **Tier 2 — Interactive reasoning** | 1–5 s | Generating the three paths, decision-tree expansion, synthesising the digital signature | Fast reasoning model |
| **Tier 3 — Batch / nightly** | minutes | 90-day calendar+commit ingestion, weekly summary, index recomputation | Cheapest capable model, Batch API |

Most teams put everything in Tier 1 and burn their budget in an hour. Don't.

### 7.2 Component diagram

```
┌──────────────────────────────────────────────────────────────┐
│ CLIENT (Next.js)                                             │
│                                                              │
│  AudioWorklet ──► Int16 PCM 16kHz ──┐                        │
│  Playback   ◄── Int16 PCM 24kHz ◄───┤                        │
│                                     │                        │
│  Decision tree (D3, client-side)    │  ephemeral token       │
│  Timeline band (Recharts)           │                        │
└─────────────────────────────────────┼────────────────────────┘
                                      │
                    ┌─────────────────┴──────────────────┐
                    │                                    │
         ┌──────────▼─────────┐            ┌─────────────▼──────────┐
         │ Live API (direct   │            │ Backend (Cloud Run)    │
         │ from browser via   │            │ FastAPI + ADK          │
         │ ephemeral token)   │            │                        │
         │                    │            │  • Auth (Firebase)     │
         │  Tier 1            │            │  • Tier 2 + Tier 3     │
         │  native audio      │            │  • Tool execution      │
         │  barge-in          │◄───tools───│  • Google Calendar     │
         │  affective dialog  │            │  • GitHub              │
         └────────────────────┘            │  • Signature builder   │
                                           └───────────┬────────────┘
                                                       │
                          ┌────────────────────────────┼───────────────┐
                          │                            │               │
                   ┌──────▼──────┐          ┌──────────▼───┐  ┌────────▼─────┐
                   │  Firestore  │          │Cloud Scheduler│  │Secret Manager│
                   │  twin state │          │  nightly      │  │  OAuth creds │
                   │  memories   │          │  ingestion    │  └──────────────┘
                   │  paths      │          └───────────────┘
                   └─────────────┘
```

### 7.3 Two architectural decisions worth arguing about

**Decision A — Client-direct Live API with ephemeral tokens, or proxy through your backend?**

*Client-direct (recommended for v1):* the browser opens the Live API WebSocket itself, using a short-lived ephemeral token your backend mints. Removes an entire hop of latency, removes audio-relaying load from Cloud Run, and eliminates a whole class of bugs where your proxy mangles the audio stream — which is exactly the bug currently in your repo.

*Proxy (what your repo does):* everything through your FastAPI WebSocket. You get full control and server-side logging, at the cost of latency, a stateful Cloud Run service, and a hard audio-plumbing problem you have already got wrong once.

Go client-direct. Use ephemeral tokens — that's what they exist for. Your backend still handles tools, because tool execution happens server-side.

**Decision B — ADK, or the GenAI SDK directly?**

ADK gives you agent structure, session management, and multi-agent orchestration, and it's a Google-event scoring criterion. The raw GenAI SDK gives you fewer layers between you and the Live API when something breaks at 2am.

Recommendation: **ADK for the backend agent + tools, GenAI SDK understanding as your fallback.** Read the current ADK bidirectional-streaming docs *first* — do not write a line against the API surface currently in your repo, none of it is real.

### 7.4 Session limits you must design around

Live API sessions are not infinite. Long conversations require **session resumption** and **context window compression** to survive. Your Future Self conversation is designed to run 10–30 minutes (matching the MIT protocol). Read the session-management docs and implement resumption *before* the demo, not after it drops on stage.

Practical mitigation for the demo itself: design the Future Self conversation as **3–5 minute focused sessions**, one per branch. Shorter sessions are better UX anyway — and they're more robust.

---

## 8. Model selection — build vs deploy

Current as of the Gemini model roster dated 21 July 2026 (https://ai.google.dev/gemini-api/docs/models).

### 8.1 The current roster, filtered to what's relevant

**Live / audio**
| Model | Status | Use |
|---|---|---|
| `gemini-3.1-flash-live-preview` | Preview (new) | High-quality low-latency A2A for real-time dialogue and voice-first apps |
| `gemini-2.5-flash-native-audio-preview-12-2025` | Preview | Flagship Live API model, native audio reasoning; GA on Vertex |
| `gemini-3.5-live-translate-preview` | Preview (new) | Speech-to-speech translation, 70+ languages — relevant only if you go multilingual |
| `gemini-3.1-flash-tts-preview` | Preview (new) | TTS with expressive audio tags |
| `gemini-2.5-flash-preview-tts` / `gemini-2.5-pro-preview-tts` | Preview | Controllable / high-fidelity TTS |

**Reasoning / text**
| Model | Status | Use |
|---|---|---|
| `gemini-3.6-flash` | **Stable** | Latest, balances speed with intelligence for agentic + multimodal |
| `gemini-3.5-flash` | **Stable** | Most intelligent for sustained frontier agentic/coding |
| `gemini-3.5-flash-lite` | **Stable** | Fastest/cheapest 3.5 for high throughput |
| `gemini-3.1-flash-lite` | **Stable** | Frontier-class at a fraction of cost |
| `gemini-3.1-pro-preview` | Preview | Advanced reasoning |

**Image (if you keep visuals)**
| Model | Status |
|---|---|
| Nano Banana 2 (`gemini-3.1-flash-image`) | **Stable** |
| Nano Banana 2 Lite (`gemini-3.1-flash-lite-image`) | **Stable** |
| Nano Banana Pro (`gemini-3-pro-image`) | **Stable** |
| **Imagen 4** | **DEPRECATED** |

**Dead — do not use**
- `gemini-2.0-flash`, `gemini-2.0-flash-lite` — shut down
- `gemini-3-pro-preview`, `gemini-3.1-flash-lite-preview` — shut down
- Gemini 1.0, 1.5 — long gone, return 404
- All Imagen models — deprecated, shutdown from 30 June 2026

**Your repo currently targets `gemini-2.0-flash-live-001` and Imagen 3. Both are gone.**

### 8.2 Recommended assignment

| Job | Build/dev | Production | Why |
|---|---|---|---|
| **Future Self voice conversation** | `gemini-2.5-flash-native-audio-preview-12-2025` | Same, or migrate to `gemini-3.1-flash-live-preview` once you've A/B'd voice quality | 2.5 native audio is GA on Vertex with production SLAs, multi-region failover, data-residency controls — the safest choice for a live stage demo. 3.1 Flash Live is newer and cheaper per minute but still preview |
| **Present-twin voice** | Same model, **different voice + different system prompt** | Same | Don't run two model families. One model, two personas, two voices |
| **Generating the 3 life paths** | `gemini-3.6-flash` | `gemini-3.5-flash-lite` if cost matters | Needs reasoning quality; runs once per question, not per turn |
| **Decision-tree expansion** | `gemini-3.6-flash` with structured output | `gemini-3.1-flash-lite` | Structured JSON, moderate reasoning |
| **Digital signature synthesis (nightly)** | `gemini-3.5-flash` | `gemini-3.1-flash-lite` + Batch API | Runs once a night per user. Batch API is dramatically cheaper for non-interactive work |
| **Screen/toxicity** *(if you keep it)* | — | — | Cut it |
| **Path visuals** | Skip | D3/SVG client-side | Deterministic, instant, sharper, free |
| **Offline / privacy mode** | Gemma 4 E2B via LiteRT-LM | Same | See §10.4 |

### 8.3 Why 2.5 Native Audio for the stage demo specifically

It's generally available on Vertex AI as of Google I/O 2026 with production SLAs and multi-region failover, and it's genuinely native speech-to-speech — not an ASR→LLM→TTS pipeline. That single-model architecture is what gives you affective dialog (tone adapting to the user's expression), proactive audio (the model decides when to respond, beyond simple VAD), barge-in, and in-session vision. Named production customers include Shopify, United Wholesale Mortgage and Napster.

Two things follow:

1. **Your "Calming Vocal Adaptation" feature is largely free.** Affective dialog already adapts delivery to the user's emotional expression. Don't build a custom pipeline for it — configure it, and spend your time elsewhere.
2. **Preview models get deprecated with as little as two weeks' notice.** If your demo is more than a month out, pin a stable-or-GA path and check the deprecations page before you submit.

Caveat worth knowing: there were platform-stability complaints following the I/O 2026 rollout. Have a fallback. Which brings us to:

### 8.4 Live demo insurance

Pre-record a 60-second screen capture of the working voice interaction and have it one keystroke away. Rate limits, WebSocket drops, and conference wifi have ended more hackathon demos than bad code. Also build a `DEMO_MODE=true` flag that plays the conversation from a cached transcript with pre-synthesised audio. Nobody will know, and if the API holds up you never use it.

### 8.5 Cost model

Published rates (verify before you rely on these — pricing moves):

- Gemini 2.5 Flash Native Audio: ~$0.50/1M text input, ~$3.00/1M audio-video input, ~$12.00/1M audio output tokens
- Gemini 3.1 Flash Live preview: roughly **$0.005/min audio in, $0.018/min audio out**

At 3.1 Flash Live rates, a 10-minute conversation with roughly balanced speaking time costs around **$0.12**. A hundred demo conversations during development: ~$12. This is not your cost problem.

Your cost problems are:
- **Nightly ingestion across many users** — solved with Batch API and Flash-Lite
- **Always-on screen capture** — the reason it's cut; continuous video into a multimodal model is where budgets die
- **Cloud Run cold starts** on a stateful WebSocket service — mitigated by going client-direct (§7.3)

There's also a free tier on the Gemini Developer API covering the Live models, which is enough for development.

---

## 9. Data sources — integration reality check

### 9.1 Google Calendar ✅ Easy

Google Calendar API, OAuth 2.0, read-only scope for ingestion (`calendar.readonly`) and events scope only if you're doing the auto-block demo. Straightforward, well documented, no surprises.

**What to extract:** meeting count/day, total meeting hours, longest uninterrupted free block, back-to-back chains, meetings outside declared working hours, fragmentation index (free time split into how many pieces).

**Gotcha:** OAuth verification. Sensitive/restricted scopes require app verification for production. For a hackathon, keep the app in testing mode with your own account plus explicitly-added test users. Do not discover this on demo day.

### 9.2 GitHub ✅ Easy, and it's your best signal

The GitHub API is the most cooperative data source you have, and commit metadata is a genuinely rich behavioural trace.

**What to extract:** commits/day, commit timestamps (the late-night pattern is the whole story), commit message sentiment/length trends, PR review latency, issue churn, weekend activity ratio, longest streak, gaps.

**Why this is your strongest source:** it's honest, high-resolution, historical (you can pull 90+ days retroactively — no waiting period), and it's *specific* in a way that makes the Future Self's dialogue land. "Forty-one commits that week" is a real number from real data.

**Use your own account for the demo.** Nothing is more convincing than a system that knows things about you that are true.

### 9.3 Screen content ⚠️ Hard — and cut

`getDisplayMedia()` requires a user gesture and shows a persistent browser indicator. Continuous capture means continuous multimodal token spend. And you're streaming the user's entire screen — passwords, private messages, client work — to a third-party API.

There is no version of this that is both good and cheap. Cut it.

### 9.4 Wearables ❌ Actively hostile right now

This is the section that most changes your plan.

**Fitbit / Google:** the Fitbit Web API is being retired. Migration path:
- Google Health API is live now at `health.googleapis.com/v4/`
- Target launch for new integrations was end of May 2026
- **Final deprecation of legacy endpoints: September 2026** — data stops syncing
- Existing OAuth tokens **do not transfer**; every user must re-consent through Google OAuth
- 15 Fitbit scopes collapse to 6 functional bundles
- Legacy Fitbit account users cannot access the Google Health API at all
- Sources: https://developers.google.com/health · https://sahha.ai/blog/fitbit-api-sunset-migration/

**Google Fit:** REST APIs deprecated in 2026, supported until end of 2026, no new developer signups since May 2024. Migration target is Health Connect (on-device Android) or Google Health API (cloud).

**Apple Watch:** HealthKit has **no cloud API**. There is no way to read Apple Watch data from a web backend. You would need to ship a native iOS app that reads HealthKit locally and pushes to your server. That is a separate project with a separate app-review process. Your PDF says "pairs with consumer wearables (Apple Watch, Fitbit)" — for Apple, at web-app scope, this is not possible.

**Aggregators** (Terra, Thryve, Sahha, Rook) abstract all of this for a fee and are the right answer commercially — but they add a vendor dependency, cost, and signup friction for a hackathon.

**Verdict:** you are proposing to integrate wearables during the exact months when the dominant API is mid-migration with a hard September cutoff, to obtain a signal that the literature says doesn't predict the thing you want to predict, on hardware with documented accuracy problems.

**Cut it from v1.** If you must have a physiological beat in the demo, offer **manual sleep entry** (a slider) or a Health Connect read on Android — both take an hour and neither is a lie.

### 9.5 A source your PDF missed

**The user's own words, over time.** Every Future Self session produces a transcript of someone articulating what they actually want. That is higher-signal than any wearable, costs nothing, requires no OAuth, and no competitor has it. Store it (with consent), embed it, and let the next session's future self reference the last one. That's a compounding asset and a real moat — and it's the one thing in this project that gets better the longer someone uses it.

---

## 10. Privacy and offline architecture

Your PDF treats privacy as a pitch line ("mention right away that all screen scanning is done securely"). That is the wrong posture and a technical audience will see through it. Privacy here is an *architecture*, and if you build it properly it becomes your actual differentiator against every funded competitor in §3.

### 10.1 The four-tier data model

Classify every field before it's collected:

| Tier | Examples | Storage | Leaves device? |
|---|---|---|---|
| **T0 — Never collected** | Screen pixels, ambient audio, message contents, keystrokes | — | Never |
| **T1 — Local only** | Raw sleep/HR samples, raw screen-time series, draft reflections | IndexedDB / device keychain | Never |
| **T2 — Derived, minimised** | "12 meetings this week", "3 late-night sessions", index scores | Firestore, encrypted, user-scoped | Yes, aggregated |
| **T3 — Conversational** | Session transcripts, chosen life paths | Firestore, encrypted, deletable | Yes, with explicit consent |

The important move: **T1 never leaves.** Derive T2 on-device and ship only the aggregate. "We compute your cognitive load index locally and only ever upload the score, never the raw signals" is a sentence with architecture behind it.

### 10.2 The concrete privacy checklist

- [ ] **Auth on every endpoint.** Firebase Auth ID token verified server-side; `user_id` derived from the token, never accepted from the client. (Currently: none.)
- [ ] **Ephemeral tokens** for the Live API, scoped and short-lived, minted per session by an authenticated backend endpoint
- [ ] **Firestore security rules** enforcing `request.auth.uid == userId` on every path — not just relying on backend checks
- [ ] **Secret Manager** for OAuth client secrets and API keys; no `.env` in the image
- [ ] **Minimum OAuth scopes.** `calendar.readonly` unless the auto-block demo needs write; GitHub read-only
- [ ] **Local PII redaction** before anything goes to a model — strip emails, phone numbers, and meeting attendee names from calendar titles client-side
- [ ] **Retention policy**, stated: transcripts auto-delete after N days unless pinned
- [ ] **One-command full deletion.** Your README already promises this ("delete their entire twin with one command"). Actually implement it, and *demo it* — deleting your data live on stage is a memorable trust moment
- [ ] **Data export** (JSON download). Cheap, and it signals you're not building a roach motel
- [ ] **Explicit consent per source**, revocable individually
- [ ] **Zero third-party sharing**, stated plainly

### 10.3 On data-residency

If you ever pitch this in a regulated market or to enterprise: Vertex AI Live API GA includes data-residency controls. Worth one line in an enterprise-facing slide.

### 10.4 Offline mode — this is a genuinely good idea

You asked about offline. It's more achievable than you'd think, and it is *the* answer to "why should I trust you with this?"

**Gemma 4** (released ~31 March–2 April 2026, Apache 2.0, built from Gemini 3 research):

| Variant | Params | Target |
|---|---|---|
| **E2B** | Effective 2B | Phones — ~4 GB RAM minimum |
| **E4B** | Effective 4B | Edge devices |
| **12B Unified** | 12B, encoder-free, adds audio | Laptops |
| **26B A4B** | MoE, ~3.8B active | Consumer GPUs |
| **31B Dense** | 31B, up to ~19 GB RAM | Workstations |

Key properties for you:
- **Audio input supported on E2B, E4B and 12B** — so a local model can hear
- 128K context on small models, 256K on medium; 140+ languages
- Native function calling and native system-prompt support
- Configurable thinking modes
- Runs completely offline with near-zero latency on phones, Raspberry Pi, Jetson Orin Nano — developed with Pixel, Qualcomm and MediaTek
- The "E" is *effective* parameters: Per-Layer Embeddings give each decoder layer a small per-token embedding, so the active footprint is far below total params
- 31B ranks #3 and 26B #6 on Arena's text leaderboard
- `ollama run gemma4` to try locally

Runtimes: **LiteRT-LM** (the recommended path — MediaPipe LLM Inference API is now maintenance-only), plus Ollama, llama.cpp, MLX, LM Studio, transformers.js. Models ship in `.litertlm`, GGUF and MLX formats.

**How to use this in your product:**

*Privacy Mode.* A toggle. When on:
- Digital-signature synthesis from calendar/GitHub runs on **Gemma 4 E2B/E4B locally**
- Nothing but the user's explicit questions reaches the cloud
- The Future Self conversation degrades to local text (or local TTS) rather than Live API voice

*The honest trade-off, stated to the user:* "Privacy Mode keeps everything on your machine. The conversation is text, not live voice, because voice this good doesn't fit on your laptop yet." Users respect that framing far more than a vague encryption claim.

*Hybrid (best of both).* Even with Privacy Mode off: run the **evidence extraction locally** (Gemma 4 turns raw calendar/commit data into a small structured summary) and send only that summary to the cloud model. The Live API never sees your meeting titles — only "14 meetings, 3 back-to-back chains, 4.5h fragmented." This is architecturally elegant, cheap (fewer input tokens), and gives you a real answer to the privacy question instead of a slogan.

*Demo value:* pulling the network cable and having the thing keep working is a genuinely strong moment. It's also a differentiator against MIT's Future You and every cloud-only competitor.

**Caveat:** local audio-to-audio conversation at Live API quality is not available offline in 2026. Gemma 4 small models accept audio *input*; you'd still need local TTS for output, and it will sound noticeably worse. Be honest about this rather than overclaiming.

---

## 11. Safety and ethics — the section most teams skip

This product tells people things about their mental state and gives them input on major life decisions. That places it in a category where "move fast" is the wrong instinct, and where a thoughtful answer to a judge's hard question is worth more than another feature.

### 11.1 Risks specific to this product

| Risk | Severity | Mitigation |
|---|---|---|
| **User in genuine crisis** discloses to the twin | **Critical** | Detect distress signals; the agent must break persona, express care in its own voice, and surface local crisis resources. Never let the "future self" persona handle a crisis disclosure — a fictional character reassuring someone about suicidal ideation is a catastrophic failure mode |
| **User takes a real life decision** based on generated fiction | High | Frame explicitly and repeatedly as reflection, not prediction. Remove fabricated probabilities from the UI |
| **Fatalism / discouragement** — future self says a path fails | High | Constrain the prompt: the future self reflects and asks questions, it does not deliver verdicts. MIT's framing — *mirror, not counsellor* — is the correct guardrail |
| **Burnout score anxiety** — telling someone they're at "critical burnout risk" | High | Cut prediction. Descriptive framing only. Never a red "critical" state |
| **Users with existing mental health conditions** | High | Not a therapeutic device; say so. Don't diagnose. Don't use clinical vocabulary you can't stand behind |
| **False toxicity flags** on normal exchanges | Medium | Cut the feature |
| **Surveillance creep** at work — an employer wanting the dashboard | Medium | Explicit stance: individual-owned, no employer visibility, ever. Your PDF's "enterprise B2B for corporate wellness to reduce employee turnover" pitch is in direct tension with this — see §11.3 |
| **Prompt injection** via calendar titles or commit messages | Medium | Never concatenate untrusted text into system instructions; pass as structured data with clear delimiters |
| **Age-progressed persona misuse** | Low | If you add an avatar, generate from the user's own uploaded photo only, with consent, and never store it |

### 11.2 The crisis-handling requirement

Build this before you demo. A simple version:

1. A lightweight classifier (or the model itself, via a system-prompt rule) flags expressions of self-harm, hopelessness, or crisis
2. On flag: the Future Self persona **stops immediately**. The agent switches to its own voice and says something honest — that it's an AI, that it's concerned, that it wants them to talk to a person
3. Surface region-appropriate crisis resources (for Nepal, the Mental Health Helpline Nepal; internationally, findahelpline.com)
4. Log nothing about the content of the disclosure

If a judge asks "what happens if someone tells this thing they want to die?" — and someone will — having a real answer is worth more than any feature on your list.

### 11.3 The B2B tension your PDF creates

Tab 2 recommends pitching "enterprise B2B packages for corporate wellness to reduce employee turnover." Think carefully about this. A system that monitors an employee's calendar density, coding rhythm, screen content and heart-rate variability, and reports a burnout score, is a surveillance product the moment an employer pays for it. "Reduce turnover" is an employer benefit, not an employee one.

You can't simultaneously promise "your data is completely owned by you" and sell an employer a wellbeing dashboard. Pick one. My strong recommendation: **individual-first, explicitly and permanently.** It's the more defensible product, the more honest pitch, and it's a better answer to the privacy question than anything in your current deck.

If you want a business-model slide, the honest one is consumer subscription, or B2B where the *employer pays but sees nothing* — only aggregate, anonymised, team-level trends above a minimum cohort size. That's a real model and you can defend it.

---

## 12. Build plan

Assumes a small team and roughly three weeks of real part-time work. Reorder freely, but do not reorder Week 1.

### Week 1 — Prove the hard thing works

| Day | Task | Done when |
|---|---|---|
| 1 | Rename. Register Devpost/GitHub/domain | New name everywhere |
| 1 | Read current ADK bidirectional-streaming docs end to end. **Do not write code from your existing repo.** | You can describe the real API |
| 2 | Bare Live API voice loop: `AudioWorklet` → PCM16 16 kHz → ephemeral-token WebSocket → PCM16 24 kHz playback | You can talk to it and it talks back |
| 3 | Barge-in + one tool call from within a live session | Interrupting works; a tool fires mid-conversation |
| 4 | Two personas, two voices, switching between them | Voice A and Voice B, distinguishable |
| 5 | Google Calendar + GitHub OAuth, 90-day pull, stored in Firestore | Real data from your own accounts |

**If day 2 isn't working by end of day 3, stop and reassess.** The audio pipeline is the single highest-risk item and it's the thing your current repo gets wrong.

### Week 2 — Make it personal

| Day | Task |
|---|---|
| 6–7 | Digital signature builder: calendar + commit data → structured behavioural summary (Tier 3 batch job) |
| 8 | Feed the signature into the Future Self system prompt. Verify it references *specific real events* |
| 9–10 | Three-path generation with structured output. No fabricated probabilities |
| 11–12 | Decision tree in D3 — click a node, it expands, the voice agent narrates the branch |

**Week 2 acceptance test:** ask it a real question about your own life out loud, and have it say something back that is specific, true, and that you didn't tell it directly in the conversation. If it can do that, you have a product.

### Week 3 — Make it survivable and shippable

| Day | Task |
|---|---|
| 13 | Auth on everything. Firestore rules. Secret Manager |
| 14 | Crisis handling (§11.2) |
| 15 | Session resumption + context compression |
| 16 | Cognitive-load band chart with visible, tunable weights |
| 17 | Calendar-write demo beat (block focus time) |
| 18 | Delete-everything + export flows, working, on screen |
| 19 | `DEMO_MODE` fallback + pre-recorded video insurance |
| 20 | Cloud Run deploy via script. Load-test the WebSocket path |
| 21 | Video, README, submission copy |

### Optional Week 4 — differentiators

- Gemma 4 E2B Privacy Mode (§10.4) — the highest-value optional item
- Health Connect read on Android for a real physiological signal
- Weekly CBI/OLBI check-in to calibrate the index (§5.2)
- Age-progressed avatar via Nano Banana Pro from a user-uploaded photo

---

## 13. Additional ideas worth integrating

Ranked by (value ÷ effort). Everything above the line is worth considering; below it is future roadmap.

**Above the line**

1. **Local evidence extraction, cloud conversation** (§10.4 hybrid). Best privacy-to-effort ratio in the document.
2. **Letter from your future self.** After the conversation, generate a short written letter the user can keep. Costs nothing, users screenshot it, it's your organic-growth loop. MIT's work suggests the reflective artifact matters.
3. **Session-to-session continuity.** The future self remembers the last conversation. "Last month you said you'd decide by June." This is the compounding moat from §9.5.
4. **Regret-minimisation prompt.** Bezos's framing — "at 80, which choice do you regret not making?" — is a well-known decision heuristic and maps perfectly onto a future-self conversation. One prompt, big payoff.
5. **The disagreeing twin.** Generate *two* future selves who took different paths and let them argue with each other while the user listens. Genuinely novel, technically just two sessions, and it's a spectacular demo. Nobody has done this.
6. **Visible index weights.** Turn §5.2's honesty requirement into a UI feature. Sliders that let the user say "meetings drain me more than you think."
7. **Show your uncertainty.** Confidence bands, not confident lines.
8. **Delete-live-on-stage.** A 15-second trust moment.

**Below the line (roadmap, not v1)**

9. Age-progressed avatar (Nano Banana Pro; note the ethical care needed)
10. Weekly CBI/OLBI calibration
11. Voice journaling — 60 seconds a day, spoken, feeding the signature
12. Ambient soundscape scored to the conversation (Lyria RealTime exists; it's a nice-to-have)
13. Nepali/Hindi language support — Gemini 3.5 Live Translate covers 70+ languages, and this genuinely differentiates you in a field of English-only submissions
14. Team mode with k-anonymity thresholds
15. Calendar *negotiation* — the agent drafts the message declining a meeting

**Explicitly do not add**

- Anything involving continuous screen or audio capture
- Anything that produces a clinical-sounding score
- Anything requiring the user to wear something they don't already own
- Anything that reports to an employer

---

## 14. The demo

### 14.1 Structure (3 minutes)

| Time | Beat |
|---|---|
| 0:00–0:20 | **The problem, told as a real decision.** Not statistics. One sentence about a choice you personally are facing |
| 0:20–0:40 | **Show the evidence layer.** "It read my last 90 days of calendar and commits." Show the real numbers. This is where credibility is built |
| 0:40–1:50 | **The live voice conversation.** Ask the real question. Let the future self answer with something specific. **Interrupt it mid-sentence** to prove barge-in. Let the silence sit after a good line |
| 1:50–2:20 | **The tree.** Click a branch. Show compounding |
| 2:20–2:40 | **The action.** "Block Thursday morning." It appears in the real calendar |
| 2:40–3:00 | **The honest close.** "This doesn't predict your future. There's an RCT showing that talking to your future self reduces anxiety and increases future self-continuity. That's what this is for." Then: privacy in one line, and the delete button |

### 14.2 Rules

- **Use your own real data.** Seeded demo data is detectable and it kills the specificity that makes the whole thing work.
- **Let it be quiet.** The temptation is to talk over the AI. Don't. The pause after the future self says something true is the most powerful two seconds in your demo.
- **Interrupt it once**, deliberately. Barge-in is the technical detail that proves this is real-time and not a recording.
- **Don't demo four things.** One conversation, one tree, one action.
- **Never say "predicts."**
- Wired network. Fallback video loaded. `DEMO_MODE` tested.

### 14.3 Judge questions you will be asked

| Question | Answer |
|---|---|
| "How is the cognitive load score calculated?" | Show the visible weights. Say it's descriptive, user-tunable, and calibrated against their own weekly self-report. Do not say 0.82 |
| "Isn't this just an LLM roleplaying?" | Yes — and that's the point. Cite MIT: mirror, not oracle. The RCT measured anxiety and future self-continuity, not prediction accuracy |
| "What about privacy?" | The four-tier model. Raw signals never leave the device. Then delete everything, live |
| "What if someone's in crisis?" | Demo the persona-break |
| "How is this different from TwinMind / Reclaim / Whoop?" | "They tell you what happened. This lets you argue with the person it's happening to." |
| "Why voice?" | Because hearing it in a version of your own voice is the mechanism, not the interface |
| "What's your moat?" | Honest answer: the accumulated record of someone articulating what they want, over years. Thin at first, compounding |

---

## 15. Where to submit

The Gemini Live Agent Challenge is closed. Currently open or upcoming as of late July 2026 — **verify all dates yourself, these move**:

| Event | Window | Fit |
|---|---|---|
| **Build with Gemini XPRIZE** | Submissions to **17 Aug 2026**, judging to 15 Sept, finalists ~25 Sept. $2M in prizes | Strong Gemini fit, but note it requires **revenue evidence broken out by month (May–Aug 2026)** and total expenses — it's a "ship a real product" competition, not a prototype contest. You mentioned planning a ShortifyAI submission here; consider which project is the better fit rather than splitting effort |
| **DevNetwork [API + Cloud + AI] Hackathon 2026** @ API World | Kicks off 17 Aug 2026; in-person awards Santa Clara 2–3 Sept | Broad, challenge-driven, sponsor prizes |
| **AI Builders Hackathon** | Check current window | Explicitly states they don't want "AI wrappers with minimal differentiation" — they want usable products. Your rescoped version fits; your PDF version does not |
| **DevNetwork [AI + ML] Hackathon** @ AI DevSummit | Check current window | Judged on progress, concept, and feasibility-as-a-business |
| Future Google Cloud events | Google runs these regularly; their Tuesday livestream announces new ones | Watch for the next Gemini-branded challenge |

Also consider: this is a strong **final-year project** at Kathmandu University independent of any hackathon, and the honest scientific framing in §5 is exactly what an academic committee rewards. The MIT paper gives you a literature anchor and a clear delta to claim.

### 15.1 Free points at Google-run events

The Gemini Live Agent Challenge rules awarded bonus points for things unrelated to your code:

- **Publishing a blog post / video** about how you built it on Medium, dev.to or YouTube, publicly, with a disclosure line stating it was created for the hackathon, and the event hashtag on social. You can submit more than one piece.
- **Automated cloud deployment** via scripts or IaC, included in the public repo. You already have `deploy.sh` — polish it.
- **Google Developer Group membership.**

These are nearly free and most entrants skip them. If your next target has similar bonus criteria, do all of them.

---

## 16. Risk register

| Risk | P | Impact | Mitigation |
|---|---|---|---|
| Audio pipeline doesn't work in time | **High** | Fatal | Week 1, day 2–3, before anything else. It's already wrong once |
| Live API preview model deprecated mid-build | Medium | High | Pin GA-on-Vertex 2.5 Native Audio; check deprecations page weekly |
| Demo-day API instability | Medium | Fatal on stage | Pre-recorded fallback + `DEMO_MODE` |
| OAuth verification blocks calendar access | Medium | High | Testing mode with explicit test users; verify a week early |
| Judge challenges the burnout science | **High** | Medium | §5 — get ahead of it, own it, cite it. This converts a weakness into a credibility win |
| Name collision / trademark | **Certain if unchanged** | High | Rename now (§1.3) |
| Scope creep back to four pillars | **High** | Fatal | Print §6.1. The PDF's instincts are your enemy here |
| Session drops mid-demo conversation | Medium | High | Session resumption + short 3–5 min sessions |
| Crisis scenario in a live user test | Low | Severe | §11.2, built before any external user touches it |
| Team burnout building a burnout app | Medium | Medium | Not a joke. Three weeks, not three all-nighters |

---

## 17. Open questions for you

1. **What's the actual target event and date?** Everything in §12 flexes on this. If it's the XPRIZE 17 August deadline, three weeks is exactly what you have and §12 fits precisely.
2. **Team size?** Solo changes the plan significantly — cut the tree visual first, keep the voice.
3. **Is the ShortifyAI XPRIZE submission still live?** Two XPRIZE entries splits your effort. Pick one.
4. **Do you have real 90-day calendar + GitHub history on your own accounts?** If your calendar is sparse, the evidence layer won't be convincing and you should lean harder on GitHub, where you have real data.
5. **Do you want the Nepali-language angle?** Gemini 3.5 Live Translate supports 70+ languages. A future-self conversation in Nepali would be genuinely distinctive in a field of English-only submissions, and it's the kind of thing judges remember.
6. **Web-only, or are you willing to ship a desktop/mobile shell?** This determines whether Health Connect and local Gemma are on the table.

---

## 18. Summary — the three things that matter

1. **Cut to one pillar.** The Future Self voice conversation, grounded in calendar and GitHub evidence, with a decision tree. Everything else in the PDF is either crowded, scientifically unsupportable, or already won by someone else three months ago.

2. **Be honest about the science.** You cannot predict burnout. You can show someone what their last 90 days actually looked like, and you can cite a real RCT for why talking to your future self helps. The honest version is *more* impressive to a technical audience than the confident wrong version.

3. **Rewrite the backend from current docs.** The existing repo is a good blueprint written against an API that does not exist. Keep the structure, delete the code.

---

*Everything time-sensitive here — model names and pricing, API deprecation dates, hackathon deadlines — was accurate as of 29 July 2026 and moves fast. Re-verify before you commit to any of it.*
