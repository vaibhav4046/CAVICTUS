<div align="center">

# CIVICTAS — Community Decision Copilot

### AI that advises. Humans who decide.

A multi-agent decision-support tool for hard community resource decisions —
where to put cooling centers, warming shelters, mobile health vans, affordable
housing — built so that **AI never makes the call. A human always does.**

Built for the **USAII Global AI Hackathon 2026** · Graduate track ·
*AI for Systems & Society → Build AI that helps communities make better decisions.*

</div>

---

## The problem

Local officials make high-stakes allocation decisions with tight budgets, messy
data, and real equity consequences — and usually a spreadsheet and a deadline.
The fast, "optimize for the most people" answer often quietly routes help away
from the residents who need it most (the low-AC, low-transit, low-income blocks
where heat deaths actually happen).

## What CIVICTAS does

You describe the decision (situation, budget, site cap, equity goal). Five
specialized AI agents run in sequence, each visible as it streams:

1. **Framing** — turns the mess into a clear decision with 3–4 concrete options. *Does not recommend.*
2. **Evidence** — answers the open questions with public benchmarks (real-time **Google Search grounding** when a Gemini key is set), every finding tagged with a **confidence level and named data gap**.
3. **Simulation** — projects each option across Now / 1yr / 5yr on decision-relevant metrics. *Estimates, not guarantees.*
4. **Equity & Risk Audit** — names who benefits, **who gets missed**, the single biggest AI/data risk, and a required on-the-ground human check.
5. **Plain-language Brief** — a proposal a busy, non-technical official can read, with an explicit confidence rating and a list of *what CIVICTAS does NOT know and should not decide alone.*

Then the **Human Review gate**: nothing is finalized until a person picks a
decision, writes a rationale, and ticks three accountability checks
(data gaps reviewed · equity considered · community input). Approved decisions
are committed to a **Decision Memory** that future runs learn from — keeping the
office consistent and accountable.

> **The whole point is the gate.** CIVICTAS is designed so the AI models
> uncertainty and surfaces trade-offs; the political, ethical, and budget
> judgment stays entirely with humans.

## Architecture

```
Browser (React 19 + Vite + Tailwind v4)
   │  POST /api/agent/1..5   (streamed, one request per agent)
   ▼
Server  (Express locally · Vercel serverless functions in prod)
   │  lib/agents.ts  — single source of truth for prompts + streaming
   ▼
Provider   GEMINI_API_KEY → Gemini (+ Google Search grounding)
           GROQ_API_KEY   → Groq (free, fast)
           neither        → built-in mock so the demo always runs
```

The model key is **server-side only** — the browser never sees it and only ever
calls `/api/*`. Model output is rendered through a safe tokenizer (no
`dangerouslySetInnerHTML`), so grounded URLs cannot inject markup.

## Run locally

**Prerequisites:** Node.js 18+

```bash
npm install
npm run dev          # http://localhost:3000
```

That's it — with no key, CIVICTAS runs in **demo mode** and streams a full,
realistic pipeline. To use a real model, copy `.env.example` to `.env.local`
and add one key:

- **Gemini** (free, includes web grounding): https://aistudio.google.com/apikey → `GEMINI_API_KEY`
- **Groq** (free, fast): https://console.groq.com/keys → `GROQ_API_KEY`

## Deploy (Vercel)

The repo is Vercel-ready (`vercel.json`, serverless `api/` functions, static
Vite build):

```bash
npm i -g vercel
vercel --prod
```

Add `GEMINI_API_KEY` (or `GROQ_API_KEY`) in **Project → Settings → Environment
Variables** to switch the live link from demo mode to real AI.

## Responsible-AI design (at a glance)

| Risk | Mitigation built into CIVICTAS |
|---|---|
| Over-trusting AI output | Hard human-in-the-loop gate; nothing finalizes without a human rationale + 3 checks |
| False precision | Every evidence item carries a confidence level and an explicit data gap |
| Equity blind spots | A dedicated, mandatory audit agent names *who gets missed*, not a footnote |
| Stale-data harm | Audit flags the data-freshness risk and requires an on-the-ground human check |

## Tools & data disclosure

Built openly with AI assistance (and proud of it):

- **Google AI Studio** + **Gemini** (`@google/genai`) — original scaffold and the primary model/grounding provider.
- **Groq** — optional free, fast inference provider.
- **Claude Code (Anthropic)** — pair-programming / engineering assistant used to harden, refactor, secure, and deploy the app.
- **Data:** the demo uses clearly-labeled public benchmarks (CDC Heat & Health Tracker, EPA Heat Island, U.S. Census ACS, NOAA) and synthetic seed decisions — **no private or personal data.**

## Tech stack

React 19 · TypeScript · Vite 6 · Tailwind CSS v4 · Express / Vercel functions ·
`@google/genai` · Motion · jsPDF · lucide-react

---

*CIVICTAS — AI-assisted · Human-decided.*
