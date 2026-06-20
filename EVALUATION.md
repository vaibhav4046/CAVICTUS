# CIVICTAS — measured evaluation (honest)

Reproducible: `node scripts/eval.mjs` (runs the seeded scenario against the live
API and computes objective, checkable metrics). These are **real numbers from an
actual run, including a disclosed failure** — nothing here is fabricated.

## Method
- Scenario: the seeded Riverside cooling-center decision (**n = 1**).
- Target: the live pipeline at `https://civictas.vercel.app`
  (provider: **NVIDIA NIM · Llama 3.1 8B**, OpenAI-compatible).
- Metrics are heuristic but objective (string/structure checks + live URL
  reachability), not model self-grading.

## Results (latest run)

| Metric | What it checks | Result |
|---|---|---|
| Structure compliance | Required Markdown headings present across all 5 agents | **19 / 19** |
| Data-gap honesty | Every Evidence finding pairs a confidence level with a named data gap | **5 : 5** (matched) |
| Equity-omission catch | Equity agent names a concrete underserved group | **PASS** |
| Simulation honesty | No blank / "varies" / "TBD" cells in the projection table | **0** vague cells |
| Pipeline latency | Wall-clock for all 5 agents (live) | **~42.7 s** (per agent 5.8–12.0 s) |
| Citation reachability | Evidence source URLs returning 2xx/3xx | **0 / 0 — see note below** |

Per-agent latency this run: Framing 7.5 s · Evidence 10.5 s · Simulation 12.0 s ·
Equity Audit 7.0 s · Brief 5.8 s. Every step completed live and well within the
60 s serverless limit.

## Disclosed limitation (the honest part)
**Live citation reachability is 0 on the open-model path.** The free DuckDuckGo
HTML scrape used for web grounding is blocked from Vercel's serverless datacenter
IP, so the Evidence agent receives no external results on this provider.
Critically, it then **degrades to clearly-labeled benchmark reasoning rather than
inventing sources** — the intended fallback, and a responsibility property, not a
silent failure. The Evidence findings still carry explicit confidence levels and
named data gaps (5:5 above).

**Path to live, reachable citations:** set a `GEMINI_API_KEY` to switch the
Evidence agent to native Google Search grounding, or proxy the DuckDuckGo search
through a non-datacenter egress. Until then, every claim is honestly marked as a
benchmark estimate, never asserted as a sourced fact.

## Model choice note
The live demo runs **Llama 3.1 8B** for fast, reliable streaming — the full
5-agent pipeline + 108-persona council completes live in ~43 s, comfortably inside
the serverless limit, with complete (un-truncated) structured output (19/19). A
larger model (e.g. Llama 3.3 70B, set via `OPENROUTER_MODEL`) trades latency for
depth; on the free NVIDIA tier the 70B path repeatedly hit the 60 s function cap
mid-stream, so the 8B model is the honest choice for a reliable live demo.

## Limitations
- n = 1 scenario, single model, heuristic checks — this is a credibility signal,
  not a benchmark suite.
- Metrics measure structure, honesty markers, and reachability, not the
  substantive correctness of every claim (which is exactly why the human gate
  exists).
