/**
 * Honest evaluation harness for the CIVICTAS pipeline.
 *
 * Runs the seeded scenario against the LIVE API and computes OBJECTIVE,
 * checkable metrics — never fabricated. Reports real numbers AND failures.
 *
 *   node scripts/eval.mjs            # against https://civictas.vercel.app
 *   BASE=http://localhost:3000 node scripts/eval.mjs
 */

const BASE = process.env.BASE || "https://civictas.vercel.app";

const SCENARIO = {
  category: "Cooling centers (extreme heat)",
  situation:
    "Riverside expects 20+ extreme-heat days; a $300,000 budget can staff up to 4 cooling-center sites; last year two heat deaths occurred in the low-income Eastside, which has the least AC and transit.",
  budget: "300,000",
  sites: "4",
  equityGoal: "Prioritize heat-vulnerable, low-AC, low-transit neighborhoods",
  memoryContext: "No prior decisions yet.",
};

const REQUIRED = {
  "1": ["# Decision goal", "# Candidate options", "# Stakeholders affected", "# Key constraints", "Evidence we need"],
  "2": ["# Evidence", "# Sources", "Confidence", "Data gaps"],
  "3": ["# Outcome comparison", "# Assumptions"],
  "4": ["Who benefits most", "Who is underserved", "AI / data risk", "How CIVICTAS reduces"],
  "5": ["Recommended option", "Top 3 reasons", "Main trade-off", "does NOT know"],
};

async function runStep(step, prev) {
  const t0 = Date.now();
  const res = await fetch(`${BASE}/api/agent/${step}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...SCENARIO, previousOutputs: prev }),
  });
  const text = await res.text();
  return { text, ms: Date.now() - t0 };
}

function extractSources(text) {
  const m = text.match(/\[METADATA_JSON:\s*([\s\S]*?)\]\s*$/);
  if (!m) return [];
  try {
    return JSON.parse(m[1]).sources || [];
  } catch {
    return [];
  }
}

async function urlReachable(url) {
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 6000);
    const r = await fetch(url, { method: "GET", signal: c.signal, redirect: "follow" });
    clearTimeout(t);
    return r.status >= 200 && r.status < 400;
  } catch {
    return false;
  }
}

function headingScore(step, text) {
  const need = REQUIRED[step];
  const present = need.filter((h) => text.toLowerCase().includes(h.toLowerCase())).length;
  return { present, total: need.length };
}

function sectionNonEmpty(text, heading, nextHeadings) {
  const i = text.toLowerCase().indexOf(heading.toLowerCase());
  if (i === -1) return false;
  let end = text.length;
  for (const nh of nextHeadings) {
    const j = text.toLowerCase().indexOf(nh.toLowerCase(), i + heading.length);
    if (j !== -1 && j < end) end = j;
  }
  const body = text.slice(i + heading.length, end).replace(/[#*\-\s]/g, "");
  return body.length > 40;
}

async function main() {
  console.log(`CIVICTAS eval — ${BASE}\nScenario: ${SCENARIO.category} (n=1)\n`);
  const outputs = {};
  const timings = {};
  for (const step of ["1", "2", "3", "4", "5"]) {
    const prev = { step1: outputs["1"], step2: outputs["2"], step3: outputs["3"], step4: outputs["4"] };
    const { text, ms } = await runStep(step, prev);
    outputs[step] = text;
    timings[step] = ms;
    const err = /\[ERROR:/.test(text);
    const hs = headingScore(step, text);
    console.log(`Agent ${step}: ${ms}ms · headings ${hs.present}/${hs.total}${err ? " · STREAM ERROR" : ""}`);
  }

  // Metric 1 — heading/structure compliance across all 5 agents
  let hPresent = 0, hTotal = 0;
  for (const step of ["1", "2", "3", "4", "5"]) {
    const hs = headingScore(step, outputs[step]);
    hPresent += hs.present;
    hTotal += hs.total;
  }

  // Metric 2 — citation reachability (Evidence agent sources)
  const sources = extractSources(outputs["2"]);
  let reachable = 0;
  for (const s of sources) if (await urlReachable(s.url)) reachable++;

  // Metric 3 — data-gap honesty (every Confidence has a paired Data gaps)
  const conf = (outputs["2"].match(/confidence/gi) || []).length;
  const gaps = (outputs["2"].match(/data gaps/gi) || []).length;

  // Metric 4 — equity-omission catch (the "underserved" section is non-empty)
  const equityCatch = sectionNonEmpty(outputs["4"], "Who is underserved", ["AI / data risk", "How CIVICTAS"]);

  // Metric 5 — simulation honesty (no blank / "varies" cells)
  const sim = outputs["3"];
  const vague = (sim.match(/\b(varies|n\/a|tbd|unknown)\b/gi) || []).length;

  console.log(`\n=== MEASURED METRICS (real, from this run) ===`);
  console.log(`Structure compliance:     ${hPresent}/${hTotal} required headings present`);
  console.log(`Citations reachable:      ${reachable}/${sources.length} source URLs returned 2xx/3xx`);
  console.log(`Data-gap honesty:         ${gaps} "Data gaps" vs ${conf} "Confidence" markers`);
  console.log(`Equity-omission catch:    ${equityCatch ? "PASS" : "FAIL"} (underserved group named)`);
  console.log(`Simulation honesty:       ${vague} vague/blank cells (0 = good)`);
  const total = Object.values(timings).reduce((a, b) => a + b, 0);
  console.log(`Total pipeline latency:   ${(total / 1000).toFixed(1)}s`);
}

main().catch((e) => {
  console.error("eval failed:", e);
  process.exit(1);
});
