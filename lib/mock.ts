/**
 * Zero-config demo fallback.
 *
 * When no GEMINI_API_KEY or GROQ_API_KEY is configured, the pipeline streams
 * these canned, scenario-tuned advisory outputs instead of throwing. This
 * guarantees a fresh clone (or a public deploy with no secrets) always shows a
 * complete, responsible, human-gated decision run.
 *
 * The text deliberately matches the exact Markdown heading structures the UI
 * parser expects (tables, ### Question blocks, ⚠ risk box, Confidence pill,
 * MEMORY_NOTE tag, METADATA_JSON sources) so the rendered demo is identical in
 * shape to a live model run.
 */

import type { AgentBody } from "./agents.js";

function toNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = parseFloat(String(value).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function usd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export interface MockResult {
  text: string;
  sources?: Array<{ title: string; url: string }>;
}

export function getMockOutput(step: string, body: AgentBody): MockResult {
  const category = body.category || "Cooling centers (extreme heat)";
  const situation =
    body.situation ||
    "A mid-size city must place a limited number of cooling-center sites to protect its most heat-vulnerable residents.";
  const budget = toNumber(body.budget, 300000);
  const sites = Math.max(1, Math.round(toNumber(body.sites, 4)));
  const perSite = Math.round(budget / sites);
  const equityGoal =
    body.equityGoal || "Prioritize heat-vulnerable, low-AC, low-transit neighborhoods";
  const hasMemory =
    !!body.memoryContext && !/no prior decisions/i.test(body.memoryContext);

  switch (step) {
    case "1":
      return { text: mockFraming(category, budget, sites, perSite, equityGoal, hasMemory) };
    case "2":
      return mockEvidence(budget, sites);
    case "3":
      return { text: mockSimulation(budget, sites, perSite) };
    case "4":
      return { text: mockAudit() };
    case "5":
      return { text: mockBrief(sites) };
    default:
      return { text: "# Notice\nNo demo content is available for this step." };
  }
}

function mockFraming(
  category: string,
  budget: number,
  sites: number,
  perSite: number,
  equityGoal: string,
  hasMemory: boolean
): string {
  const memoryTag = hasMemory
    ? `\n\n[MEMORY_NOTE: Informed by past decisions | RATIONALE: A previous human decision prioritised the vulnerable — factored in.]`
    : "";
  return `# Decision goal
Choose where to place ${sites} ${category.toLowerCase()} site(s) so that the ${usd(
    budget
  )} budget protects the most heat-vulnerable residents — not simply the largest headcount.

# Candidate options
- **Option A — Central high-traffic placement**: Site the ${sites} centers at the busiest downtown and transit hubs to maximize raw daily visits.
- **Option B — Even geographic spread**: Distribute the ${sites} centers evenly across council districts for uniform coverage.
- **Option C — Vulnerability-weighted placement**: Allocate sites by a heat-vulnerability index (low-AC housing, low transit access, prior heat-illness records), front-loading the highest-risk neighborhoods.

# Stakeholders affected
- **Low-income, low-AC households in the most heat-exposed district (most at-risk)** — highest heat-mortality exposure last season.
- Elderly and chronically ill residents without reliable cooling.
- Car-less residents dependent on walkable or transit-reachable sites.
- City health department staff who must operate ${sites} site(s) within budget.
- Local community-based organizations and faith groups who can host or co-staff sites.

# Key constraints
- Budget: ${usd(budget)} (~${usd(perSite)} per site across ${sites} site(s)).
- Capacity: up to ${sites} staffed location(s).
- Equity goal: ${equityGoal}.

# Evidence we need to choose well
1. Which census tracts have the highest heat-vulnerability (low AC ownership, high impervious surface, elderly share)?
2. What is realistic walking/transit access to each candidate location for car-less residents?
3. What daily throughput can one staffed ${usd(perSite)} site sustain?
4. Where did heat-illness 911 calls and deaths concentrate in prior seasons?
5. Which community organizations can extend hours or co-staff to stretch the budget?${memoryTag}`;
}

function mockEvidence(budget: number, sites: number): MockResult {
  const sources = [
    {
      title: "CDC — Heat & Health Tracker (Heat Vulnerability)",
      url: "https://ephtracking.cdc.gov/Applications/heatTracker/",
    },
    { title: "EPA — Heat Island Effect", url: "https://www.epa.gov/heatislands" },
    {
      title: "U.S. Census — American Community Survey (AC & vehicle access)",
      url: "https://www.census.gov/programs-surveys/acs",
    },
    { title: "NOAA — Heat Safety", url: "https://www.weather.gov/safety/heat" },
  ];
  const text = `# Evidence
### Question: Which tracts have the highest heat-vulnerability?
- **Finding**: Heat-vulnerability indices (CDC/EPA methodology) consistently rank low-income tracts with low tree canopy, high impervious surface, and low AC ownership highest. For a city of this profile, the lowest-income quartile typically shows 2–3× the heat-illness rate of the citywide median.
- **Confidence**: Medium
- **Data gaps**: Exact tract-level AC ownership needs local ACS pulls or a utility survey; demo uses national benchmark patterns.

### Question: How accessible are candidate sites for car-less residents?
- **Finding**: Roughly 8–12% of households in comparable mid-size cities lack a vehicle; in low-income tracts this can exceed 20%. A site beyond ~0.5 mi / one bus transfer sees sharply lower use by these residents.
- **Confidence**: Medium
- **Data gaps**: Needs local GTFS transit + walkshed analysis to confirm per-site reach.

### Question: What daily throughput can one staffed site sustain?
- **Finding**: A single staffed cooling center commonly serves ~120–250 visits/day depending on size, hours, and amenities. A budget of ${usd(
    budget
  )} across ${sites} site(s) supports standard daytime operating hours for a summer season.
- **Confidence**: Low
- **Data gaps**: Throughput depends on building capacity and hours not yet specified.

### Question: Where did prior heat-illness calls concentrate?
- **Finding**: Heat-related EMS calls in comparable cities cluster in older, denser, low-canopy neighborhoods during evening hours — supporting extended-hour siting in those tracts.
- **Confidence**: Medium
- **Data gaps**: Requires local EMS/911 incident geocoding for confirmation.

# Sources
- [CDC — Heat & Health Tracker](https://ephtracking.cdc.gov/Applications/heatTracker/)
- [EPA — Heat Island Effect](https://www.epa.gov/heatislands)
- [U.S. Census — American Community Survey](https://www.census.gov/programs-surveys/acs)
- [NOAA — Heat Safety](https://www.weather.gov/safety/heat)

*Demo mode: figures are clearly-labeled public benchmarks, not live-grounded statistics. Configure a model key for real-time Google Search grounding.*`;
  return { text, sources };
}

function mockSimulation(budget: number, sites: number, perSite: number): string {
  const aReach = Math.round(sites * 220);
  const bReach = Math.round(sites * 180);
  const cReach = Math.round(sites * 165);
  return `# Outcome comparison
| Option | Metric | Now | 1 year | 5 years |
| --- | --- | --- | --- | --- |
| A — Central placement | Residents protected/day | ${aReach} | ${Math.round(
    aReach * 1.05
  )} | ${Math.round(aReach * 1.1)} |
| A — Central placement | Operating cost | ${usd(budget)} | ${usd(
    Math.round(budget * 1.04)
  )} | ${usd(Math.round(budget * 1.2))} |
| A — Central placement | High-vulnerability coverage | 38% | 40% | 42% |
| B — Even spread | Residents protected/day | ${bReach} | ${Math.round(
    bReach * 1.05
  )} | ${Math.round(bReach * 1.12)} |
| B — Even spread | Operating cost | ${usd(budget)} | ${usd(
    Math.round(budget * 1.04)
  )} | ${usd(Math.round(budget * 1.2))} |
| B — Even spread | High-vulnerability coverage | 55% | 57% | 60% |
| C — Vulnerability-weighted | Residents protected/day | ${cReach} | ${Math.round(
    cReach * 1.08
  )} | ${Math.round(cReach * 1.18)} |
| C — Vulnerability-weighted | Operating cost | ${usd(budget)} | ${usd(
    Math.round(budget * 1.05)
  )} | ${usd(Math.round(budget * 1.22))} |
| C — Vulnerability-weighted | High-vulnerability coverage | 82% | 85% | 88% |

# Assumptions
- **Option A**: Maximizes total visits but under-reaches the highest-risk district; assumes downtown footfall proxies need.
- **Option B**: Uniform coverage assumes equal need across districts, which the evidence does not support.
- **Option C**: Assumes the heat-vulnerability index (~${usd(
    perSite
  )}/site) correctly identifies the highest-risk tracts; depends on data freshness.

*These are estimates for comparison, not guarantees.*`;
}

function mockAudit(): string {
  return `# Who benefits most
- Heat-vulnerable, low-AC households in the highest-risk district under a vulnerability-weighted plan.
- Elderly and car-less residents who gain a reachable, staffed refuge.
- The health department, which can defend the allocation with a transparent, auditable rationale.

# Who is underserved or at risk of being missed
- Residents in tracts that look "low-need" on stale census data but have new informal or overcrowded housing.
- Non-English-speaking residents who may not learn a site exists without targeted outreach.
- Night-shift and unhoused residents if hours are daytime-only.

# ⚠ AI / data risk
The vulnerability index can **under-count the most at-risk residents** because it leans on census and utility data that lag real conditions (new arrivals, informal housing, recent AC loss). Optimizing to a stale index can quietly route help away from the people who need it most.

# How CIVICTAS reduces this risk
- Every figure carries an explicit **confidence level and named data gap** — no false precision.
- The pipeline **never finalizes**: a human must review, edit, and justify before anything is committed.
- The equity audit is a **mandatory, separate stage** that names who is missed, not a footnote.

Recommended human check before acting: Before locking sites, send staff or community partners door-to-door in the two highest-index neighborhoods to confirm on-the-ground need and walkability, and hold one evening listening session with affected residents.`;
}

function mockBrief(sites: number): string {
  return `# Recommended option (proposal)
**Option C: Vulnerability-Weighted Placement** (Confidence: Medium)

# Top 3 reasons
1. It reaches ~82% of high-vulnerability residents versus ~38% under central placement — the equity goal you set.
2. It directly answers the harm that motivated this decision (prior heat deaths concentrated in the low-AC district).
3. Its rationale is transparent and auditable, which protects the decision-maker if challenged.

# Main trade-off
It serves fewer total daily visits than central placement. You are choosing depth of protection for the most at-risk over raw headcount — a values choice, stated plainly so it can be defended or overridden.

# What CIVICTAS does NOT know / should not decide alone
- The political weighting of "most vulnerable" vs "most people" — a democratic choice for elected officials.
- Real-time, block-level need that only on-the-ground outreach and resident voice can confirm.
- Budget reallocations, labor agreements, and building availability that sit with city operations.
- Whether the chosen ${sites} site(s) are acceptable to the communities they are meant to serve.`;
}
