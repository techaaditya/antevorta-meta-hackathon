# Three-Minute Video Demo Script — Antevorta

**Theme:** Build for Your World  
**Track:** Indie Developer  
**Product Principle:** *Test your decisions before you live them.*

---

## 🎬 Act 1: The Problem & Intake Clarity (0:00 – 0:40)

- **Voiceover:**  
  *"Most high-stakes life decisions don't fail from bad intentions. They fail from boring, uncalculated arithmetic: time conflicts, underestimating cash burn, or unverified assumptions. Today, most AI tools act like sycophantic cheerleaders or hallucinate made-up success percentages. Antevorta is different: it is a high-conviction decision stress-testing workbench built with Meta's Model API and strict deterministic math."*

- **Visual Action:**
  1. Open Antevorta at `http://localhost:5173`.
  2. Select the **"Graduate vs Job"** or **"Kathmandu Relocation vs Startup"** preset.
  3. Show the input parameters: weekly maintenance (80h), existing commitments (45h), liquid savings, and options with prerequisites.
  4. Click **"Check Input Clarity"**. Show the **Clarity Score (e.g. 78/100)** and adaptive clarification prompts identifying unstated assumptions.
  5. Click **"⚡ Apply Suggested Assumption"** to resolve a gap in one click.

---

## 🤖 Act 2: Meta Agent Tool Execution & Verification Audit (0:40 – 1:30)

- **Voiceover:**  
  *"When we run the decision stress test, Antevorta doesn't ask the LLM to do arithmetic. All capacity, runway, and breakeven numbers are strictly computed by our deterministic Python engine. Instead, Meta's model acts as an agent in a disciplined loop."*

- **Visual Action:**
  1. Click **"Run decision stress test"**.
  2. Switch to the **"Agent Trace"** tab:
     - Show the verified tool calls executed server-side: `compare_options`, `list_unknowns`, `simulate_sensitivity`.
     - Point out the **Scenario Verifier**: checks that every option is covered and scrubs any synthetic probability odds.
  3. Switch to the **"Verification Audit & Citations"** tab:
     - Highlight the **Zero Hallucination Arithmetic guarantee**: numbers in prose are strictly validated against tool calculation outputs.
     - Show **Grounded External Benchmarks** with official HTTPS references (e.g. living costs, GRE guidelines).

---

## 🔬 Act 3: Feasibility Matrix & Reversible Experiments (1:30 – 2:10)

- **Voiceover:**  
  *"In the Comparative Matrix, Antevorta immediately surfaces the bottlenecks. Option A has 15 hours of headroom, while Option B hits a direct time conflict. But instead of telling you what to do, Antevorta gives you an actionable, reversible 3-part experiment: a low-cost micro-trial to de-risk your plan in 1 to 2 weeks before you sign an irreversible lease or contract."*

- **Visual Action:**
  1. Navigate through **"Feasibility Cards"** and **"Comparative Matrix"**.
  2. Point out **Runway Months** and **Breakeven Monthly Surplus**.
  3. Show the **Facts & Assumptions** tab: clearly distinguishing user-verified facts from hypothetical assumptions.
  4. Highlight the **3-Part Reversible Experiment Framework**: *Prep & Hypothesis*, *1-Week Execution*, and *Stop / Pivot Gate*.

---

## ⚡ Act 4: What-If Sensitivity Sandbox & Revision History (2:10 – 2:45)

- **Voiceover:**  
  *"What happens if your living costs increase or you drop 10 hours of commitments? In the What-If Sandbox, you test your assumptions dynamically."*

- **Visual Action:**
  1. Scroll down to the **"What-If Sensitivity Sandbox"**.
  2. Adjust existing commitments or savings.
  3. Click **"Recalculate Headroom & Feasibility"**.
  4. Point out the **"What Changed & Why"** diff banner:
     - Capacity shift: `+15.0h`
     - Status transition: `CONFLICT -> FEASIBLE`
  5. Notice the **Stale Narrative Alert**: warning that original narrative conclusions were computed on previous assumptions.
  6. Click **"Save Revision"**: show the version badge increment from `v1` to `v2`.

---

## 🔒 Act 5: Privacy, Export & Closing (2:45 – 3:00)

- **Voiceover:**  
  *"Because your life choices are deeply personal, Antevorta includes token-based privacy controls. You can export your full decision ledger as GDPR-compliant JSON, or completely purge your account in one click.*  
  *Test your decisions before you live them. Built with Meta Model API."*

- **Visual Action:**
  1. Open Account drawer, click **"Export All Data"** to download the clean JSON package.
  2. Return to the main screen and conclude.

---

## 📋 Recording Checklist

- [ ] Clear 1080p browser capture with crisp contrast and no personal credentials in view.
- [ ] If running against live Meta Model API: verify `MODEL_API_KEY` in `.env` and confirm green tool trace badges.
- [ ] If running fallback: explicitly state that deterministic fallback runs with identical arithmetic integrity.
- [ ] Strictly adhere to the 3:00 minute time limit.
