# CIVICTAS — Master Design Brief

> Paste this whole document into a design tool (Claude artifacts / Figma AI / etc.)
> to generate UI/UX. It is self-contained: product context, personas, the agent
> "cast", every screen and state, the full design system with exact tokens,
> component specs, accessibility rules, and hard constraints.
>
> **One rule above all: this product's credibility IS its design. It must look
> institution-grade and trustworthy, and it must never fake data, metrics, or
> "live" status. Honesty is a visual feature.**

---

## 1. Product in one line

**CIVICTAS** — a multi-agent **civic decision copilot**. It turns a hard public
resource decision (where to put cooling centers, warming shelters, mobile health
vans, affordable housing) into a transparent, equity-first recommendation —
**AI advises, a human decides.**

Tagline / motif: **"AI advises. You decide."**
Sub-label: *Community Decision Copilot.*

---

## 2. Problem & why it matters

City officials make high-stakes allocation calls with tight budgets, messy data,
and real equity consequences — usually with a spreadsheet and a deadline. The
fast "optimize for the most people" answer quietly routes help away from the
residents who need it most (low-AC, low-transit, low-income blocks where heat
deaths actually happen).

Real framing stat to use in the hero/positioning: *in many cities only an
estimated 32–51% of cooling centers sit within walking distance of the most
heat-vulnerable residents.*

**Where it sits:** a per-decision advising layer between deliberation tools
(Polis, Decidim) and policy simulators (PolicyEngine). It advises, audits equity,
and forces an accountable human sign-off.

**Non-goals (must be visible, not buried):** it does not vote, does not replace
public consultation, does not make the political call. A human always does.

Built for the **USAII Global AI Hackathon 2026** (graduate track, "AI for Systems
& Society"). Audience watching: city officials + hackathon judges.

---

## 3. Characters — A. Human personas (who uses it)

1. **The City Analyst / Official (primary user).**
   - Goal: defensible, equitable decision they can stand behind in a council meeting.
   - Pains: time pressure, incomplete data, political scrutiny, fear of missing a vulnerable group.
   - Needs from UI: clarity over cleverness, confidence + data-gap honesty, a record they can share, a hard human sign-off they own.
   - Not technical. Reads briefs, not JSON.

2. **The Hackathon Judge (evaluator).**
   - Goal: in 60 seconds, see real multi-agent AI + real-world impact + polish + honesty.
   - Pains: demos that break, fabricated metrics, generic template UI.
   - Needs: a flawless one-click run, visible "what's real vs simulated", technical credibility (a harness trace), a wow first impression.

3. **The Community Advocate (stakeholder, indirect).**
   - Goal: confidence the most at-risk residents weren't optimized away.
   - Needs: the equity audit is front-and-center, dissent is shown, not hidden.

## 3. Characters — B. The AI "cast" (what the user watches work)

The product's emotional core: a visible team of specialists, then a crowd, then a
human gate. Design each as a distinct, legible character.

- **Agent 1 — Framing.** "What are we actually deciding?" Turns mess into a clear
  decision + 3–4 concrete options. *Does not recommend.* Color: indigo.
- **Agent 2 — Evidence Base.** "Grounding datasets & data gaps." Answers open
  questions with public benchmarks + real web-search grounding; every finding has
  a **confidence level** and a named **data gap**; cites numbered sources. Color: blue.
- **Agent 3 — Simulation.** "What happens with each option?" Projects Now / 1yr /
  5yr. *Estimates, not guarantees.* Color: cyan.
- **Agent 4 — Equity & Risk Audit.** "Who benefits, who gets missed?" Names the
  most at-risk, the single biggest AI/data risk, and a required on-the-ground
  human check. This is the conscience of the product. Color: violet.
- **Agent 5 — Plan Brief.** "Plain-language proposal." What a busy official can
  read; explicit confidence rating + an honest "what CIVICTAS does NOT know."
  Color: fuchsia.
- **The 108-Persona Council.** A synthetic community panel (roles × segments)
  that stress-tests the recommendation, returns a vote split (approve / approve-
  with-edits / reject), an aggregate score, consensus, top concern, and named
  dissenting voices. Framed honestly as a *stress-test to find where to verify
  with real residents*, never a substitute for real consent.
- **The Human Gate.** A person picks approve / revise / reject, writes a
  rationale, and clears three accountability checks (data gaps reviewed · equity
  considered · community input). Nothing finalizes without it. This is the climax.

---

## 4. Brand, tone, principles

- **Personality:** institutional but modern; serious, calm, confident; "civic
  infrastructure software," not a startup toy. Editorial, not playful.
- **Voice:** plain, direct, honest. Short. No hype, no em-dashes, no emojis.
  States who it's NOT for and what it does NOT know.
- **Design principles (rank order):**
  1. Honesty is a feature — label reality (Live / Mock / Simulated / Needs credentials); never invent latency, tokens, or sources.
  2. Hierarchy through scale + restraint, not decoration.
  3. The human decision is the visual climax, not a footnote.
  4. Depth-correct in BOTH light and dark (no theme is an afterthought).
  5. Accessible by construction (WCAG 2.2 AA, reduced-motion safe).
  6. Motion clarifies flow; never decorates for its own sake.

---

## 5. Information architecture — surfaces

```
Home (Landing)
  └─ Onboarding (3 steps, skippable)
       └─ Studio (the product)  ── 3 zones, top → bottom:
            Zone 01  Inputs / Operational setup  (SetupPanel)
            Zone 02  AI advisory                 (PipelinePanel: 5 agent cards
                                                  streaming) + 108-persona
                                                  Council panel + Harness trace
                                                  (in an Advanced panel)
            Zone 03  Decision (Human gate)        (HumanReviewPanel) + Voice
                                                  review + Ledger
       └─ Decision Record (read-only, shareable via ?record= URL)
  Persistent: left Sidebar = Decision Memory (saved decisions); top header
  (brand=home, engine badge, theme toggle, How-it-works); How-it-works modal;
  optional Google sign-in / sign-out.
```

Navigation loop: **Home → Onboarding → Studio → (brand mark) → Home.**
Mobile: sidebar becomes an off-canvas drawer (PanelLeft toggle in header);
desktop: sidebar is a docked rail.

---

## 6. Screen-by-screen spec (design ALL of these, light + dark, mobile + desktop)

### 6.1 Home / Landing
- Slim brand bar: BrandMark + "CIVICTAS" wordmark (left), "Open the studio →" (right).
- Hero: kicker pill ("Community Decision Copilot"), huge display headline
  **"AI advises. / You decide."** (second line in accent), supporting paragraph,
  primary CTA "Open the studio →", and an engine reality label (Live/Mock + model).
- **Centerpiece: a real pipeline diagram** (NOT a card trio): Inputs (meetings,
  docs, emails, CSV, voice) → Agent core (5 agents) → 108-persona council →
  Human gate (approve/revise/reject) → Outputs (decision record, source pack,
  risk ledger, follow-up tasks). Horizontal rail on desktop, stacks vertically on
  mobile, connectors flip. One icon family, token colors, reduced-motion safe.
- Honest positioning/scope block (why it matters + scope + non-goals).
- Footer line: "AI-assisted · Human-decided."

### 6.2 Onboarding (3 steps)
- Same brand bar (one ecosystem). Centered card: step icon chip, "Step n of 3",
  title, body, progress dots, primary "Next" / "Enter the studio", "Back", and a
  top-right "Skip intro". Motif line beneath card.

### 6.3 Studio — header
- Brand mark (click = home), product name + "Community Decision Copilot".
- Right: engine badge (`provider · model` + RealityPill Live/Mock), "AI-assisted ·
  Human-decided" chip, theme toggle (sun/moon), "How it works".
- Mobile: PanelLeft drawer toggle.

### 6.4 Studio — Sidebar (Decision Memory)
- Primary "New decision" (accent). List of saved decisions (icon = approved/
  modified, title, one-line situation, date, status chip APPROVED/MODIFIED/
  REJECTED). Selected item expands with "Use template". Footer: "informed by N
  past decisions" note + a QUIET "Clear memory" (ghost text, not a loud red bar;
  has confirm).

### 6.5 Studio — Zone 01 Inputs (SetupPanel)
- Decision category select, situation textarea, budget, site count, equity-goal
  select, optional dataset. Primary "Analyze decision & launch the advisory
  pipeline". A one-click "Run the sample decision" for judges (pre-filled
  Riverside cooling-center scenario).

### 6.6 Studio — Zone 02 AI advisory (PipelinePanel)
- Five agent cards, each: header (number, name, tagline, agent color), streaming
  output with a blinking caret while running, collapse when done, confidence pill
  on the brief, numbered inline citations on Evidence with a Sources list, retry
  on error. Calm column: completed cards collapse.
- **EquityRiskSummary card**: scannable who-benefits / who's-missed / biggest-risk
  / required-human-check pulled from the real Audit agent (no invented score).
- **108-Persona Council panel**: big aggregate score /100, confidence, vote bars
  (approve / approve-with-edits / reject), consensus, council's top concern,
  dissenting voices (verdict chip + persona + reason), honest "synthetic — verify
  with real residents" note, and "reviewer notified via" channel pills.
- **Honest error surface (PipelineErrorAlert)**: on a provider failure, a card
  names the failing agent, shows the real reason (rate limit / status / raw), with
  Retry, **Continue in demo mode**, Dismiss. Never a silent reset.
- **Demo banner**: when running on the deterministic mock, a warning-toned strip
  states outputs are canned demo examples, not live AI.
- **Advanced panel** (collapsible) holds: **Harness trace** (compact table: agent ·
  model · validation · source count · status — real values only, "—" if unknown),
  Voice review, and Workspace export.

### 6.7 Studio — Zone 03 Decision (Human gate, HumanReviewPanel)
- The climax. Choose approve / approve-with-edits / reject; chosen option;
  rationale (required); three accountability checkboxes; finalize. Voice review
  option (in-browser STT/TTS, "Live · in-browser" pill). Decision ledger /
  integrity verification. On finalize → commit to Decision Memory + offer the
  shareable Decision Record.

### 6.8 Decision Record (read-only, shareable)
- Opened from `?record=<encoded>` (no backend, no accounts). Clean read-only view:
  brand header, the decision, rationale, checks, AI recommendation, provenance
  line "AI advised · a human decided", "Copy link". Malformed param must fail
  gracefully (never crash, never render raw input).

### 6.9 Sign-in / out (OPTIONAL)
- Optional Google sign-in; the public demo always works without it. Consistent
  brand styling; clear sign-out. Never gate the demo behind login.

### 6.10 Universal states to design for EACH surface
- Empty, loading, streaming, done, error, demo-fallback; light + dark; 320 / 375 /
  768 / 1024 / 1440 widths; keyboard-focus and reduced-motion variants.

---

## 7. Design system — exact tokens ("Civic Signal")

Use semantic CSS custom properties; components must read tokens, never raw hex,
so light/dark never drift. Three surface elevations (bg recessed → surface card →
surface-2 inset), all SOLID (no translucency).

### 7.1 Color — Light
```
--bg            #F5F6FB   (cool civic paper)
--surface       #FFFFFF
--surface-2     #EDEFF7   (inset / code / quiet fill)
--ink           #11131C   (near-black)
--ink-soft      #2A2E3D
--muted         #545A6E   (>=4.5:1 on white)
--faint         #737994   (large/secondary text only)
--border-line   #E2E5F0
--border-strong #CBD0E2
--accent        #4338CA   (civic indigo, ~6.6:1 on white)  <- PRIMARY
--accent-2      #7C3AED   (violet)
--accent-soft   #EBEBFE   (indigo tint behind accent icons)
--on-accent     #FFFFFF
--positive      #047857   --warning #B45309   --danger #BE123C
agent ramp: framing #4338CA · evidence #2563EB · simulation #0E7490 ·
            equity #7C3AED · transparency #A21CAF
```

### 7.2 Color — Dark
```
--bg            #090A12   (deep indigo-navy)
--surface       #14161F   (SOLID elevated)
--surface-2     #1C1F2B
--ink           #ECEEF4
--ink-soft      #C9CDD9
--muted         #9DA3B5   (>=4.5:1 on #14161F)
--faint         #6E7488
--border-line   #272B39
--border-strong #383D4F
--accent        #818CF8   (bright indigo)  <- PRIMARY
--accent-2      #C4B5FD
--accent-soft   #1E1B4B
--on-accent     #0A0B1A   (dark text on bright indigo)
--positive #34D399  --warning #FBBF24  --danger #FB7185
agent ramp: framing #818CF8 · evidence #60A5FA · simulation #22D3EE ·
            equity #C4B5FD · transparency #E879F9
```

### 7.3 Typography
- **Display:** Bricolage Grotesque (600/700/800), optical sizing on, tracking
  -0.022em. Bold, institutional-modern. Used for headlines, brand, card titles.
- **Body:** Inter (300–700).
- **Mono:** JetBrains Mono (400–600) — micro-labels, codes, numbers, the harness
  trace, reality pills.
- Scale (fluid): hero clamp ~3rem→6rem; section heads ~1.25–1.75rem; body
  1rem→1.125rem; micro 10–11px mono uppercase tracked.

### 7.4 Spacing, radius, elevation, motion
- Spacing rhythm on a 4px base; generous section padding (clamp 4rem→10rem on
  landing), denser inside studio panels. Intentional rhythm, not uniform padding.
- Radius: cards `rounded-2xl` (16px), pills/full for buttons + status pills,
  inputs `rounded-lg`. Be consistent.
- Elevation: soft, layered, slightly cool shadows (sm/md/lg). In dark, depth comes
  from surface/border contrast, not heavy shadow.
- Motion: only compositor-friendly props (transform/opacity). Durations 150/300ms,
  ease-out-expo. Streaming caret blink. ALL decorative motion frozen under
  `prefers-reduced-motion`.

### 7.5 Signature component — RealityPill
One consistent pill used for engine badge, council channels, and voice. Kinds and
treatment: **Live** (positive dot, optional pulse), **Mock** (muted), **Simulated**
(muted), **Needs credentials** (warning), **Error** (danger), **Unavailable**
(faint). Tiny mono, status dot + label, optional muted prefix (e.g. channel name).

### 7.6 Component inventory to design
Buttons (primary accent / ghost / quiet-text / danger-ghost), cards (3 elevations),
RealityPill, status chips, inputs/select/textarea, agent card (streaming),
pipeline diagram stage + connector, council vote bar + score, dissent row,
harness-trace row, error alert, demo banner, sidebar memory item, decision-record
view, modal, theme toggle, brand mark (community ring + compass).

---

## 8. Accessibility (non-negotiable)
- WCAG 2.2 AA contrast for all text + UI (values above are pre-checked).
- Visible focus ring everywhere: 2px accent outline, 2px offset.
- Full keyboard operability; semantic HTML (header/main/section/nav/footer); ARIA
  for meters (vote bars), alerts (errors), live regions (streaming).
- `prefers-reduced-motion`: freeze all decorative animation.
- Hit targets >= 24px; labels on every control; no color-only meaning (pair with
  text/icon).

---

## 9. Hard constraints (do not violate)
- **No fabricated data/metrics.** No invented latency, token counts, or sources.
  Unknown → show "—". Label reality honestly.
- **Zero accounts / zero required cloud** for the public demo; sign-in optional.
- **Token colors only** (no raw hex in components); depth-correct light + dark.
- **One icon family** (lucide-react); **no emojis** anywhere in UI.
- **No `dangerouslySetInnerHTML`** without sanitization; validate all URL/record input.
- Reduced-motion safe; mobile = zero horizontal overflow at 375px.
- Tech stack to implement into: React 19 + Vite + Tailwind v4 (CSS-var tokens in
  `src/index.css`), lucide-react, Motion. Server: Express (dev) + Vercel functions.

---

## 10. Anti-patterns (explicitly avoid)
- Default card grids with uniform spacing and no hierarchy.
- Stock centered-headline + gradient-blob hero.
- Unmodified library defaults; flat, depth-less layouts.
- Safe gray-on-white with one token accent and no point of view.
- Dashboard-by-numbers (sidebar + cards + charts) with no opinion.
- Anything that reads as a generic template instead of civic infrastructure.

---

## 11. What to produce (deliverables from the design tool)
For each surface in §6: high-fidelity mockups in **both light and dark**, at
**mobile (375) and desktop (1440)**, showing real content (use the Riverside
cooling-center scenario), the key states (empty / streaming / done / error /
demo), and the RealityPill/honesty treatments. Provide redlines or token usage
notes where they deviate from §7 so implementation stays token-true.

> After you (the human) import the generated design, hand it back and I will
> implement it against the existing React/Vite/Tailwind token system, screen by
> screen, verifying light+dark, accessibility, and zero mobile overflow.
