# CIVICTAS — measured evaluation (honest)

Reproducible: `node scripts/eval.mjs` (runs the seeded scenario against the live
API and computes objective, checkable metrics). These are **real numbers from an
actual run, including a disclosed failure** — nothing here is fabricated.

## Method
- Scenario: the seeded Riverside cooling-center decision (**n = 1**).
- Target: the live pipeline at `https://civictas.vercel.app` (provider: Groq `llama-3.3-70b-versatile`).
- Metrics are heuristic but objective (string/structure checks + live URL reachability), not model self-grading.

## Results (latest run)

| Metric | What it checks | Result |
|---|---|---|
| Structure compliance | Required Markdown headings present across all 5 agents | **19 / 19** |
| Data-gap honesty | Every Evidence finding pairs a confidence level with a named data gap | **4 : 4** (matched) |
| Equity-omission catch | Equity agent names a concrete underserved group | **PASS** |
| Simulation honesty | No blank / "varies" / "TBD" cells in the projection table | **0** vague cells |
| Pipeline latency | Wall-clock for all 5 agents | **~10.3 s** |
| Citation reachability | Evidence source URLs returning 2xx/3xx | **0 / 0 — see failure below** |

## Disclosed failure (the honest part)
**Live citation rate is currently 0 on the Groq path.** The free DuckDuckGo HTML
scrape used for web grounding is blocked from Vercel's serverless datacenter IP,
so the Evidence agent receives no results. Critically, it then **degrades to
clearly-labeled benchmark reasoning rather than inventing sources** — the
intended fallback, and a responsibility property, not a silent failure.

**Fix path:** set a `GEMINI_API_KEY` to switch the Evidence agent to native
Google Search grounding (real, reachable citations), or proxy the search through
a non-datacenter egress. Until then, claims are honestly marked as benchmarks.

## Limitations
- n = 1 scenario, single model, heuristic checks — this is a credibility signal, not a benchmark suite.
- Metrics measure structure, honesty markers, and reachability, not the substantive correctness of every claim (which is exactly why the human gate exists).
