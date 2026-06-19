# CIVICTAS — USAII Global AI Hackathon 2026 submission kit

**Live app:** https://civictas.vercel.app
**Repo:** https://github.com/vaibhav4046/CAVICTUS
**Track:** Graduate — AI for Systems & Society → *Public Systems & Policy: Build AI that helps communities make better decisions.*

> The live link works with **zero configuration** (demo mode). To show real,
> live AI in the video, add a free `GEMINI_API_KEY` (or `GROQ_API_KEY`) in
> Vercel → Project → Settings → Environment Variables, then redeploy.

---

## Devpost fields (copy-paste, within character limits)

**Tagline (≤80):**
> AI advises, humans decide: a multi-agent copilot for fairer community decisions.

**AI Architecture Explanation (≤600):**
> Input: an official describes a resource decision (situation, budget, site cap, equity goal). Five sequential AI agents process it: (1) Framing structures the decision into 3–4 options; (2) Evidence answers open questions using Gemini with live Google Search grounding, tagging each finding with a confidence level and data gap; (3) Simulation projects each option over Now/1yr/5yr; (4) Equity Audit names who is missed and the top AI/data risk; (5) Brief writes a plain-language proposal. Output: a recommendation a human must review, edit, and approve before anything is saved.

**Human-in-the-Loop Design — one decision AI does NOT make (≤500):**
> AI never chooses the final option. After the five agents produce a *proposal*, the Finalize button stays disabled until a human selects a decision (approve / approve-with-edits / reject), writes a rationale in their own words, and ticks three accountability checks (data gaps reviewed, equity considered, community input). Only then is the decision committed to Decision Memory. The political weighting of "most vulnerable vs most people" is explicitly reserved for the human.

**Responsible AI Guardrail — one risk + one mitigation (≤500):**
> Risk: the model can produce false precision or optimize to stale data (e.g., census/utility figures that lag real conditions), quietly routing help away from the most at-risk residents. Mitigation: a dedicated, mandatory Equity & Risk Audit agent that (a) forces every evidence item to carry an explicit confidence level and named data gap, (b) names who is underserved, and (c) requires a concrete on-the-ground human check before action. Nothing finalizes without human sign-off.

**AI Tools Used (≤800):**
> Google AI Studio + Google Gemini via @google/genai (free tier) — original scaffold and primary model, with Google Search grounding. Groq (free) — optional fast inference provider. Claude Code by Anthropic — AI pair-programmer used to harden, secure, refactor, and deploy. Vercel — hosting (serverless functions + static build). All AI tools used have free tiers; the app also ships a built-in deterministic demo mode so it runs with no paid service.

**Data Sources (≤800):**
> The demo uses clearly-labeled public benchmarks, not private data: CDC Heat & Health Tracker (heat vulnerability), EPA Heat Island Effect, U.S. Census American Community Survey (AC ownership, vehicle access), and NOAA heat-safety guidance. Seeded example decisions and demo-mode outputs are synthetic and labeled as such. When a Gemini key is configured, the Evidence agent retrieves live public sources via Google Search grounding and cites them. No personal or sensitive data is collected or stored; decision history lives in the browser's local storage only.

**Description (problem → what it does → how built → challenges → accomplishments → learnings):**
> *Problem.* Local officials decide where scarce resources go — cooling centers, shelters, health vans — under tight budgets and messy data. The fast "serve the most people" answer often misses the residents most at risk (the low-AC, low-transit blocks where heat deaths actually happen).
> *What it does.* CIVICTAS runs five specialized AI agents (framing → grounded evidence → simulation → equity audit → plain-language brief), then hands the decision to a human who must review, justify, and approve it. Approved decisions feed a Decision Memory that keeps the office consistent.
> *How it was built.* React 19 + Vite + Tailwind v4 frontend; a shared agent library streams each step; deployed as Vercel serverless functions with a Gemini/Groq/mock provider so it always runs.
> *Challenges.* Keeping the AI honest (confidence + data gaps), making the human gate un-skippable, and shipping a public link that demos even without an API key.
> *Accomplishments.* A genuinely human-gated, equity-first decision tool that any city can pilot, live and free.
> *Learnings.* For public-sector AI, the trust comes from what the AI refuses to decide — the design is mostly guardrails.

---

## Pitch video script (~3:45) — Hook · Solution · Demo · Impact

Record screen at https://civictas.vercel.app (ideally with a Gemini key set so the AI is live). Keep it calm and clear.

**[0:00–0:30] HOOK — the problem**
> "Every summer, people die of heat in the same neighborhoods — the low-income blocks with the least air conditioning and the worst transit. When a city has the budget for only four cooling centers, the fast answer is 'put them where the most people are.' That answer quietly skips the people most likely to die. Officials make these calls with a spreadsheet and a deadline."

**[0:30–1:00] SOLUTION — what CIVICTAS is**
> "This is CIVICTAS — a decision copilot built on one rule: AI advises, a human decides. You describe the decision; five specialized AI agents work through it in the open; and nothing is final until a person signs off."
> *(On screen: the home screen, the "AI-assisted · Human-decided" badge.)*

**[1:00–2:50] DEMO — one click, full pipeline**
> *(Click "Run the sample decision.")* "One click runs the seeded Riverside decision."
> *(Agent 1 streams.)* "Agent one **frames** it — four real options, the stakeholders, and what's most at risk. Notice it refuses to recommend yet."
> *(Agent 2.)* "Agent two gathers **evidence** — and every finding carries a confidence level and an explicit data gap. With a live key it cites real public sources."
> *(Agent 3 table.)* "Agent three **simulates** each option over five years. The vulnerability-weighted plan reaches 82% of high-risk residents; central placement reaches 38%."
> *(Agent 4 — risk box.)* "Agent four is the **equity audit** — it names who gets missed and the single biggest risk of trusting the data, then demands an on-the-ground human check."
> *(Agent 5.)* "Agent five writes a **plain-language brief** — with a confidence rating and a list of what CIVICTAS does *not* know and should not decide alone."
> *(Scroll to Human Review.)* "Now the gate. The Finalize button is **disabled**. I have to choose a decision, write my own rationale, and tick three accountability checks — data gaps, equity, community input." *(Do it; Finalize enables; click it.)* "Approved. It's saved to Decision Memory, so the next decision is informed by this one."

**[2:50–3:25] RESPONSIBLE AI**
> "Everything here is designed around what the AI refuses to do. It models uncertainty, it flags its own blind spots, and it never makes the political call. The judgment — who counts as most vulnerable — stays with the human and the community."

**[3:25–3:45] IMPACT — close**
> "CIVICTAS is live, it's free, and any city health department could pilot it tomorrow. AI-assisted. Human-decided. That's how AI should help communities make better decisions."

---

## Pre-submission checklist
- [ ] Add `GEMINI_API_KEY` (or `GROQ_API_KEY`) in Vercel env vars for live AI in the video.
- [ ] Open https://civictas.vercel.app in an incognito window; run one full decision.
- [ ] Record the 3–5 min pitch video (YouTube/Vimeo/Loom).
- [ ] Paste the Devpost field answers above.
- [ ] Enter your 8-character Qualifier Approval Code.
- [ ] Confirm a team of 2–5 members is listed (hackathon requires it).
- [ ] Disclose tools (already done in README + the disclosure fields above).
