# CIVICTAS — Agent Handoff (start here, zero context)

You are picking up CIVICTAS and pushing it to be the strongest possible hackathon
entry. Read this whole file first. It is the single source of truth for state,
architecture, the orchestration pattern, and what to do next.

---

## 0. MISSION + non-negotiable guardrails

**Mission:** make CIVICTAS the best, most-polished, fully-verified product it can
honestly be, and keep it shippable (live, deployed, green build) at all times.

**Honesty is the product's core value AND your hard constraint. Never violate it:**
- NEVER fabricate a score, a "10/10", "100% winner", fake user-testing, fake
  metrics, fake latency/tokens, or fake sources. Placement is the judges' call —
  you cannot guarantee it and must not claim to.
- NEVER present a non-functional integration as real. Label reality (Live / Mock /
  Simulated / Needs credentials). If unknown, show "—".
- Report measured results honestly. If a review says 6.2, say 6.2 and fix the real
  causes — don't inflate.
- The big roadmap features (real meeting recording + speaker diarization, passive
  Gmail/WhatsApp capture, Notion/GitHub sync) are NOT built and CANNOT be honest in
  a hackathon window. They live in `docs/DESIGN_BRIEF.md §12`. Do not fake them.

"Winner product" = a genuinely excellent, honest, working product. That is the only
kind worth shipping here (it's judged on Responsible AI).

---

## 1. What CIVICTAS is

A multi-agent **civic decision copilot**: turns a hard public-resource decision
(cooling centers, shelters, clinics, housing) into a transparent, equity-first
recommendation. **AI advises, a human decides.** Built for the USAII Global AI
Hackathon 2026 (grad track "AI for Systems & Society"). Live: **https://civictas.vercel.app**

Flow: Home → Onboarding (4 steps incl. personalization) → Studio (Zone 01 inputs →
Zone 02 five streaming agents + 108-persona council + harness trace → Zone 03 human
gate) → shareable Decision Record. Full product spec + design tokens + personas:
**`docs/DESIGN_BRIEF.md`** (read it).

---

## 2. Architecture (know this before editing)

- **Stack:** React 19 + Vite + Tailwind v4 (CSS-var design tokens in `src/index.css`,
  theme "Civic Signal": indigo accent, Bricolage Grotesque display, depth-correct
  light+dark). lucide-react icons. Motion. jsPDF. No emojis in UI.
- **CRITICAL dual backend** — two parallel implementations, keep them in sync:
  - `server.ts` = local dev (Express + Vite middleware), reads `.env` via dotenv.
  - `api/*.ts` = Vercel **production** serverless (`api/health.ts`, `api/council.ts`,
    `api/notify.ts`, `api/agent/[step].ts`, `api/auth/callback.ts`). **This is what
    the live site runs.** A fix in `server.ts` does NOT reach prod unless mirrored
    in `api/*`. (This split has bitten us repeatedly.)
- **LLM providers** (`lib/agents.ts`): `resolveProvider()` order = `LLM_PROVIDER`
  override, else `GEMINI_API_KEY` → gemini, `GROQ_API_KEY` → groq,
  `OPENROUTER_API_KEY` → openrouter, else **mock**. `providerInfo()` is the
  secret-free `{provider, model, search}` the UI badge + harness trace read.
  - `runAgentStream(step, body, cb, {forceProvider})` streams a step; `complete()`
    is the non-streaming path (108-persona council). `runMock` returns canned,
    clearly-labeled demo output. Groq + OpenRouter inject a real DuckDuckGo search
    on the Evidence step (lib/search.ts) and cite those URLs. Gemini uses Google
    Search grounding.
- **Demo-safe by design:** if a live step fails (e.g. quota 429), the UI shows an
  honest error (`PipelineErrorAlert`) with **"Continue in demo mode"** → re-runs the
  whole pipeline + council via the deterministic mock, labeled as canned. A `demo`
  flag is threaded client → `/api/agent` + `/api/council` → `forceProvider:"mock"`.
- **Personalization:** onboarding captures role + priority → `localStorage`
  `civictas_prefs` → `readPreferences()` (App.tsx) sent on every run → injected into
  `systemInstruction` (lib/agents.ts) with an anti-injection guard.
- **Shareable record:** `src/share.ts` encodes a finalized decision into `?record=`
  (base64url, no backend); `DecisionRecord.tsx` renders read-only, decodes
  defensively (malformed → graceful "can't be read", never crashes).
- **Security gates:** `API_SHARED_SECRET` / `x-civictas-key` guards all write/cost
  routes (agent/council/notify); unset = open public demo. `lib/channels.ts` escapes
  email HTML / Twilio TwiML / Telegram and restricts links to http(s).
- **Key components:** `Landing`, `Onboarding`, `Sidebar` (decision memory drawer),
  `SetupPanel`, `PipelinePanel` (5 agent cards + announcer), `EquityRiskSummary`,
  `CouncilPanel`, `PipelineErrorAlert`, `HumanReviewPanel` (the gate), `VoiceAgent`,
  `WorkspacePanel`, `DecisionRecord`, `RealityPill` (the reused Live/Mock pill),
  `Select` (custom accessible dropdown — native selects were banned), `BrandMark`,
  `HowItWorksModal`.

---

## 3. Build / verify loop (do this every change)

```
cd /d/project/CAVICTUS
npx tsc --noEmit        # must be clean. If npx grabs a wrong tsc, re-run with cd.
npm run build           # must be green (vite + esbuild server bundle)
```
Preview (browser verification): server config is `.claude/launch.json` (name
**"civictas"**, port 3000). Use `preview_start` then `preview_eval` / `preview_snapshot`
(text-based). **`preview_screenshot` TIMES OUT on this machine — never rely on it.**
Verify: 0 horizontal overflow at 375px, light + dark, no console errors, the flow
completes. Deploy: `vercel --prod --yes` (authed as vaibhav4046, project linked).

**GateGuard hook:** before the first Bash of a session, and before the first
edit/write of each file, you must print 2-4 facts (request, what the command/edit
does, importers, instruction). It's a hard gate — just comply and retry, or disable
with `ECC_GATEGUARD=off`.

---

## 4. Multi-agent orchestration (the Workflow tool) — how and when

`Workflow` runs a JS script that spawns subagents deterministically (parallel /
pipeline / loop), in the background, and notifies you on completion. Ultracode =
use it for substantive work. **Key rule learned here:**

- **Fan out READ-ONLY work in parallel** (reviews, audits, research) — agents only
  read, so no conflicts. This is where workflows shine.
- **Do NOT parallelize edits to shared files.** Multiple agents editing `App.tsx`
  collide. Apply fixes yourself, sequentially, with tsc/build between.
- Pattern that worked (use it): `parallel()` of N judge/reviewer lenses, each with a
  JSON `schema` for structured findings + `agentType` (react-reviewer, a11y-architect,
  security-reviewer), then a synthesis agent that dedupes + scores. Example scripts
  are saved under `.../workflows/scripts/civictas-*.js` — reuse via
  `Workflow({scriptPath})`.
- Each round ≈ 0.5–0.7M subagent tokens. Don't re-audit before fixing — fix the known
  list first, then audit to confirm + find new.
- **Anthropic session limit exists** (it halted the last audit; resets ~8am London).
  If workflows fail with "session limit", do direct work until it resets.

Proven loop: **audit (workflow) → fix (you, sequential) → tsc+build → browser-verify
→ commit → deploy → re-audit. Repeat until zero BLOCKER/HIGH.**

---

## 5. Current state (as of handoff)

- Live + deployed; `tsc` + `build` green. Branch `feat/ui-ecosystem-consistency`
  (prod deploys from it). `main` is behind due to a squash-merge divergence (PR #2
  open, conflicts) — cosmetic; doesn't affect the live demo. Resolve later or keep
  shipping from the branch.
- **Done this session:** bold "Civic Signal" redesign; real landing pipeline diagram;
  RealityPill consolidation; harness trace; demo-safe pipeline + council; honest
  error surface; shareable Decision Record; custom accessible `Select` (fixed the
  "huge native dropdown" bug); onboarding personalization → prompts; OpenRouter
  open-source provider (inert until key); How-it-works modal tokenized.
- **3 adversarial QA rounds done; all BLOCKER/HIGH fixed:** notify/council auth,
  email/TwiML/Telegram injection, retry stale-state + reader guard, XFF spoof,
  web-grounding overclaims, modal + drawer focus traps, live-region spam, voice/gate
  a11y + token colors, faint contrast, chip legibility, token-on-disconnect,
  health method guard.
- **Session 2026-06-20 (cont.) — honesty + substance + test pass. Judge re-audit
  now 7.4/10 (was 5.8 at the start of this pass), all 4 BLOCKERs confirmed closed,
  no regressions.** Shipped + deployed:
  - Accessible **dialog primitive** (`src/dialog.tsx` + `ConfirmDialog.tsx`):
    replaced all 11 native `confirm()`/`alert()`. **OAuth `state` CSRF** guard +
    token → `sessionStorage` (both `api/auth/callback.ts` and `server.ts`).
  - **Honesty BLOCKERs:** engine pill no longer claims green "Live" from key
    existence — gated on a real `hasLiveSuccess` (App.tsx) + Landing shows
    "Ready"/"Mock" (new RealityPill `ready` kind). `[METADATA_JSON]`/`[MEMORY_NOTE]`
    stripped before commit (`cleanAgentOutput`) so they can't leak to PDF/ledger/
    share. Simulation prompt no longer orders fabricated per-cell numbers
    (`lib/agents.ts`). Harness "Valid./pass" → honest "Output/ok". Council fallback
    on live-failure now labeled `mock`/`demo-mock`, never the live provider.
  - **Substance:** council now deliberates over the REAL evidence/projections/audit
    (threaded App → CouncilPanel → api/council + server.ts → `runCouncil`); footer
    states it's one model estimating a 108-roster, "not 108 independent agents".
  - **Tests (NEW):** `npm test` (vitest) — 15 passing over ledger hash-chain,
    share encode/decode (defensive), and council roster/normalization.
  - **Polish:** 32–51% value stat on landing w/ attribution; WorkspacePanel
    `text-on-accent` + solid surfaces; AWAITING badge sustained-pulse removed;
    modal close >=24px; sidebar `aria-current`; indigo theme-color/favicon +
    twitter:card.
- **Remaining (deferred, NOT blockers — see re-audit):** mock council dissents are
  cooling-center-specific, so a non-heat demo scenario shows mismatched (but
  demo-labeled) council output; WorkspacePanel email-body HTML interpolation
  (self-targeted, user-editable, low real risk); a few small a11y MEDIUMs (M12
  deep-link reviewer hardcode, M13 progress-nav todo aria, M14 landing skip-link,
  M16 returning-visitor landing bypass). Audit scripts:
  `.../workflows/scripts/civictas-audit-v2-*.js` and `civictas-audit-v3-confirm-*.js`.

---

## 6. What's LEFT — prioritized road to the top

1. **(Biggest lever) Live AI runs.** Groq daily quota is exhausted → runs fall back
   to demo. The owner will paste an API key. The instant they do: put it in `.env`
   (gitignored) for local AND in Vercel project env, then `vercel --prod`. OpenRouter
   is wired (`OPENROUTER_API_KEY` [+ `OPENROUTER_MODEL` / `OPENROUTER_BASE_URL`]);
   Groq/Gemini also supported. Live runs >> canned demo for judges.
2. **Run the road-to-10 judge audit** (workflow, after session reset) → execute its
   prioritized punch list top-down. That is your loop.
3. **Remaining known MEDIUM/LOW** (real, not yet done): native `confirm()` (clear
   memory, App.tsx) + `alert()` (HumanReviewPanel ~line 162 reviewer form) → inline
   styled/`role=alert` UI; `HumanReviewPanel` radiogroup arrow-key nav (APG);
   OAuth `state`/CSRF on `api/auth/callback.ts` (or remove if unused); WorkspacePanel
   token → sessionStorage. None block the demo.
4. **Substance polish for judges:** make the one-click demo run feel complete +
   premium; ensure EquityRiskSummary + citations + council read as rigorous, not
   hand-wavy; keep value legible in the first 30s.

---

## 7. Owner actions (NOT yours to fake)
- Record the 3–5 min demo video (USAII requires it).
- Rotate the Groq key in `.env` post-submission (it's transcript-exposed; gitignored,
  never committed).
- Provide an API key to flip runs live.

---

## 8. First moves for you
1. Read `docs/DESIGN_BRIEF.md` + skim `src/App.tsx`, `lib/agents.ts`, `src/index.css`.
2. `npx tsc --noEmit && npm run build` to confirm green baseline.
3. If a key is available → wire it (`.env` + Vercel) + redeploy.
4. Re-run the road-to-10 audit workflow → fix top-down → verify in browser → commit →
   deploy. Loop. Keep every commit green and the site live. Stay honest.
