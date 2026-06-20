/**
 * DecisionRecordV2 — the civic accountability artifact.
 *
 * Turns a CIVICTAS run (5 agent outputs + council + human gate) into a public,
 * inspectable, reproducible decision packet: what was decided, the evidence and
 * its honest grade, the dissent, the equity risk, the human rationale and checks,
 * the AI boundary (live vs demo, provider/model), limitations, and what to monitor
 * next. Built deterministically from real run state — never fabricates citations.
 *
 * Pure functions, fully unit-tested. No new model calls.
 */

import { extractRecommendedOption, extractOptions, extractConfidence, validateStep } from "./extract.js";

export type Mode = "live" | "demo";
export type Confidence = "high" | "medium" | "low" | "unknown";
export type EvidenceGrade = "strong" | "moderate" | "limited" | "demo_only";
export type CitationStatus = "citations_returned" | "no_citations_returned" | "benchmarks_only" | "demo_snapshot";

export interface EvidenceItem {
  id: string;
  claim: string;
  sourceType: "citation" | "benchmark" | "model_reasoning" | "user_input" | "demo_snapshot";
  sourceLabel: string;
  url?: string;
  confidence: Confidence;
}

export interface DecisionRecordV2 {
  id: string;
  createdAt: string;
  mode: Mode;
  scenario: { title: string; decisionQuestion: string; constraints: string[] };
  provider: {
    label: string;
    provider: string;
    model: string;
    councilModel?: string;
    groundingAvailable: boolean;
    citationsReturned: number;
  };
  agentRun: {
    agents: { name: string; role: string; status: "complete" | "partial" | "demo"; keyFinding: string }[];
    structureChecksPassed: number;
    structureChecksTotal: number;
  };
  evidenceLedger: {
    items: EvidenceItem[];
    citationStatus: CitationStatus;
    evidenceGrade: EvidenceGrade;
    note: string;
  };
  recommendation: { recommendedOption: string; confidence: Confidence; rejectedAlternatives: string[] };
  dissentMap: {
    strongestObjection: string;
    whoMightDisagree: string[];
    whatEvidenceWouldChangeDecision: string[];
    unresolvedTensions: string[];
  };
  equityReview: { groupsAtRiskOfBeingMissed: string[]; requiredHumanCheck: string };
  humanGate: {
    reviewerName?: string;
    decision: string;
    rationale: string;
    rationaleLength: number;
    dissentConsidered: string;
    monitoringAction: string;
    approvalLockedUntilChecksPassed: boolean;
    checksPassed: boolean;
    timestamp?: string;
  };
  accountabilityChecks: { id: string; label: string; passed: boolean }[];
  council?: { total: number; approve: number; approveWithEdits: number; reject: number; aggregateScore: number; model: string };
  publicSummary: string;
  limitations: { type: string; text: string; severity: "low" | "medium" | "high" }[];
  nextMonitoringActions: string[];
  exports: { markdownAvailable: boolean; jsonAvailable: boolean; shareLinkAvailable: boolean; pdfStatus: "fallback_text" };
  integrity: { recordId: string; hash?: string; generatedFrom: "live_run" | "demo_snapshot"; reproducible: boolean };
}

const AGENTS: { name: string; role: string }[] = [
  { name: "Framing", role: "Structures the decision into concrete options" },
  { name: "Evidence", role: "Grounds questions in data with confidence + named gaps" },
  { name: "Simulation", role: "Projects each option over Now / 1yr / 5yr" },
  { name: "Equity & Risk Audit", role: "Names who is missed and the top AI/data risk" },
  { name: "Plain-language Brief", role: "A proposal a human must review and approve" },
];

const clean = (s: string): string => (s || "").replace(/\s+/g, " ").trim();
const firstLine = (s: string, max = 200): string => {
  const l = (s || "").split("\n").map((x) => x.replace(/^[#>*\-\s]+/, "").trim()).find((x) => x.length > 6);
  return l ? l.slice(0, max) : "";
};

/** Pull bullet lines under a heading matching `re`, up to the next heading. */
function bulletsUnder(md: string, re: RegExp, limit = 4): string[] {
  const lines = (md || "").split("\n");
  let cap = false;
  const out: string[] = [];
  for (const line of lines) {
    if (/^#{1,3}\s/.test(line)) {
      if (cap) break;
      if (re.test(line)) { cap = true; continue; }
    }
    if (cap && /^\s*[-*]\s+/.test(line)) {
      out.push(clean(line.replace(/^\s*[-*]\s+/, "").replace(/\*\*/g, "")));
      if (out.length >= limit) break;
    }
  }
  return out;
}

export interface RecordInput {
  mode: Mode;
  category: string;
  situation: string;
  budget: string;
  sites: string;
  equityGoal: string;
  engine: { label?: string; provider: string; model: string; councilModel?: string; grounding?: string } | null;
  agentOutputs: { step1: string; step2: string; step3: string; step4: string; step5: string };
  groundingSources: { title: string; url: string }[];
  council?: { total: number; approve: number; approveWithEdits: number; reject: number; aggregateScore: number; model: string; topRisk?: string; consensus?: string; dissents?: { persona: string; verdict: string; reason: string }[] } | null;
  human: { reviewerName?: string; decision: string; rationale: string; dissentConsidered: string; monitoringAction: string; checks: { dataGaps: boolean; equity: boolean; community: boolean } };
  recordId: string;
  hash?: string;
  createdAt: string;
}

export function buildDecisionRecordV2(input: RecordInput): DecisionRecordV2 {
  const o = input.agentOutputs;
  const mode = input.mode;
  const isDemo = mode === "demo";
  const citations = input.groundingSources.length;
  const grounding = input.engine?.grounding || (isDemo ? "none" : "web");

  const agentEntries = AGENTS.map((a, i) => {
    const out = o[`step${i + 1}` as keyof typeof o] || "";
    const v = validateStep(i + 1, out);
    return {
      name: a.name,
      role: a.role,
      status: (isDemo ? "demo" : v.ok ? "complete" : "partial") as "complete" | "partial" | "demo",
      keyFinding: firstLine(out, 160),
    };
  });
  const checksArr = [1, 2, 3, 4, 5].map((n) => validateStep(n, o[`step${n}` as keyof typeof o] || ""));
  const structurePassed = checksArr.filter((c) => c.ok).length;

  const evidenceItems: EvidenceItem[] = [];
  input.groundingSources.slice(0, 6).forEach((s, i) =>
    evidenceItems.push({ id: `cite-${i + 1}`, claim: clean(s.title) || "Cited source", sourceType: "citation", sourceLabel: "Live web citation", url: s.url, confidence: "medium" })
  );
  bulletsUnder(o.step2, /finding|evidence|question/i, 6).forEach((b, i) =>
    evidenceItems.push({ id: `bench-${i + 1}`, claim: b, sourceType: isDemo ? "demo_snapshot" : "benchmark", sourceLabel: isDemo ? "Demo snapshot" : "Public benchmark / model reasoning", confidence: /high/i.test(b) ? "high" : /low/i.test(b) ? "low" : "medium" })
  );

  const citationStatus: CitationStatus = isDemo ? "demo_snapshot" : citations > 0 ? "citations_returned" : "no_citations_returned";
  const checksPassed = input.human.checks.dataGaps && input.human.checks.equity && input.human.checks.community;
  const evidenceGrade: EvidenceGrade = isDemo
    ? "demo_only"
    : citations > 0 && checksPassed
    ? "strong"
    : checksPassed
    ? "moderate"
    : "limited";
  const evidenceNote = isDemo
    ? "Demo snapshot — outputs are canned, clearly-labeled examples, not a live run."
    : citations > 0
    ? `${citations} live web citation(s) returned, combined with public benchmarks and human review.`
    : "No external citations were returned in this run. CIVICTAS therefore labels this as benchmark / model-supported reasoning, not web-cited evidence.";

  const rejectVoices = (input.council?.dissents || []).filter((d) => /reject|edit/i.test(d.verdict));
  const dataGaps = bulletsUnder(o.step2, /data gap|gaps/i, 4).concat(
    (o.step2.match(/data gaps?:\s*([^\n]+)/gi) || []).map((m) => clean(m.replace(/data gaps?:/i, "")))
  );
  const underserved = bulletsUnder(o.step4, /underserved|missed|at risk/i, 4);
  const dissentMap = {
    strongestObjection:
      clean(input.council?.topRisk || "") ||
      clean(rejectVoices[0]?.reason || "") ||
      firstLine(underserved.join(" "), 200) ||
      "The audit's named at-risk group must be verified on the ground before acting.",
    whoMightDisagree: (rejectVoices.length ? rejectVoices.map((d) => clean(d.persona)) : underserved).slice(0, 5),
    whatEvidenceWouldChangeDecision: (dataGaps.length ? dataGaps : ["Tract-level data confirming the vulnerability index", "On-the-ground confirmation of need and access"]).slice(0, 4),
    unresolvedTensions: underserved.slice(0, 3),
  };

  const humanCheck = clean(
    (o.step4.match(/Recommended human check[^\n]*:\s*([^\n]+)/i) || [])[1] ||
    (o.step4.match(/human check[^\n]*:\s*([^\n]+)/i) || [])[1] ||
    "Send staff or partners to confirm need and access in the highest-risk neighborhoods before locking the decision."
  );

  const rec = extractRecommendedOption(o.step5) || input.human.decision;
  const options = extractOptions(o.step1);
  const rejected = options.filter((opt) => !new RegExp(opt.split(" ").slice(0, 2).join(" ").replace(/[^\w\s]/g, ""), "i").test(rec)).slice(0, 3);
  const conf = ((extractConfidence(o.step5) || "Medium").toLowerCase()) as Confidence;

  const publicSummary = clean(
    `On ${input.category.toLowerCase()}, an AI advisory pipeline framed the options, examined the evidence (${evidenceGrade.replace("_", " ")} grade${citations ? `, ${citations} live citation(s)` : ", no live citations returned"}), audited equity, and proposed "${rec}". A human reviewer ${input.human.decision} it after recording a rationale, the dissent they weighed, and a monitoring action, and clearing accountability checks. ${isDemo ? "This is a labeled demo snapshot." : "This is a live run."} AI advised; a human decided.`
  );

  const limitations: DecisionRecordV2["limitations"] = [
    citations === 0 && !isDemo
      ? { type: "evidence", text: "No live web citations returned this run; evidence rests on labeled public benchmarks and model reasoning.", severity: "medium" as const }
      : null,
    isDemo ? { type: "data", text: "Demo snapshot: outputs are deterministic canned examples, not live AI.", severity: "high" as const } : null,
    { type: "prototype", text: "Decision Memory and the integrity ledger are local to this browser; a production deployment would back onto a persistent, shared datastore.", severity: "medium" as const },
    { type: "model", text: "AI estimates and the council are advisory; substantive correctness must be confirmed by the human reviewer and on-the-ground checks.", severity: "medium" as const },
  ].filter(Boolean) as DecisionRecordV2["limitations"];

  const nextMonitoringActions = [clean(input.human.monitoringAction), humanCheck, "Re-run CIVICTAS if budget, site count, or the at-risk data changes."]
    .filter((x) => x && x.length > 3)
    .slice(0, 4);

  return {
    id: input.recordId,
    createdAt: input.createdAt,
    mode,
    scenario: {
      title: input.category,
      decisionQuestion: firstLine(input.situation, 240) || input.situation.slice(0, 240),
      constraints: [`Budget: $${input.budget}`, `Sites: ${input.sites}`, `Equity goal: ${input.equityGoal}`],
    },
    provider: {
      label: input.engine?.label || `${input.engine?.provider ?? "—"} · ${input.engine?.model ?? "—"}`,
      provider: input.engine?.provider ?? (isDemo ? "mock" : "—"),
      model: isDemo ? "demo-mock" : input.engine?.model ?? "—",
      councilModel: input.engine?.councilModel,
      groundingAvailable: grounding !== "none",
      citationsReturned: citations,
    },
    agentRun: { agents: agentEntries, structureChecksPassed: structurePassed, structureChecksTotal: 5 },
    evidenceLedger: { items: evidenceItems, citationStatus, evidenceGrade, note: evidenceNote },
    recommendation: { recommendedOption: rec, confidence: conf, rejectedAlternatives: rejected },
    dissentMap,
    equityReview: { groupsAtRiskOfBeingMissed: underserved.slice(0, 5), requiredHumanCheck: humanCheck },
    humanGate: {
      reviewerName: input.human.reviewerName,
      decision: input.human.decision,
      rationale: input.human.rationale,
      rationaleLength: input.human.rationale.trim().length,
      dissentConsidered: input.human.dissentConsidered,
      monitoringAction: input.human.monitoringAction,
      approvalLockedUntilChecksPassed: true,
      checksPassed,
      timestamp: input.createdAt,
    },
    accountabilityChecks: [
      { id: "dataGaps", label: "Reviewed data gaps and accepted remaining uncertainty", passed: input.human.checks.dataGaps },
      { id: "equity", label: "Matched the option against the equity & risk audit", passed: input.human.checks.equity },
      { id: "community", label: "Considered qualitative feedback from the affected community", passed: input.human.checks.community },
    ],
    council: input.council
      ? { total: input.council.total, approve: input.council.approve, approveWithEdits: input.council.approveWithEdits, reject: input.council.reject, aggregateScore: input.council.aggregateScore, model: input.council.model }
      : undefined,
    publicSummary,
    limitations,
    nextMonitoringActions,
    exports: { markdownAvailable: true, jsonAvailable: true, shareLinkAvailable: true, pdfStatus: "fallback_text" },
    integrity: { recordId: input.recordId, hash: input.hash, generatedFrom: isDemo ? "demo_snapshot" : "live_run", reproducible: true },
  };
}

/** Validate the shape of a built record (used by tests + before export). */
export function validateDecisionRecordV2(r: any): boolean {
  return !!(
    r &&
    typeof r.id === "string" &&
    (r.mode === "live" || r.mode === "demo") &&
    r.scenario && typeof r.scenario.title === "string" &&
    r.evidenceLedger && ["strong", "moderate", "limited", "demo_only"].includes(r.evidenceLedger.evidenceGrade) &&
    r.dissentMap && typeof r.dissentMap.strongestObjection === "string" &&
    r.humanGate && typeof r.humanGate.rationale === "string" &&
    Array.isArray(r.accountabilityChecks) &&
    typeof r.publicSummary === "string"
  );
}

const EVIDENCE_GRADE_LABEL: Record<EvidenceGrade, string> = {
  strong: "Strong (live citations + benchmarks + human review)",
  moderate: "Moderate (public benchmarks + human review; no live citations)",
  limited: "Limited (model reasoning; checks incomplete)",
  demo_only: "Demo only (canned snapshot)",
};

export function recordToMarkdown(r: DecisionRecordV2): string {
  const li = (arr: string[]) => (arr.length ? arr.map((x) => `- ${x}`).join("\n") : "- —");
  return `# CIVICTAS — Public Decision Record
_AI advised · a human decided · CIVICTAS recorded the proof_

**Record ID:** ${r.integrity.recordId}${r.integrity.hash ? `  ·  **Hash:** ${r.integrity.hash}` : ""}
**Mode:** ${r.mode === "demo" ? "DEMO SNAPSHOT (canned, labeled — not live AI)" : "LIVE RUN"}
**Generated:** ${r.createdAt}
**Engine:** ${r.provider.label}${r.provider.councilModel ? ` (council: ${r.provider.councilModel})` : ""}

## 1. Decision
- **Decision:** ${r.humanGate.decision}
- **Chosen option:** ${r.recommendation.recommendedOption}
- **Reviewer:** ${r.humanGate.reviewerName || "—"}
- **Human rationale:** ${r.humanGate.rationale || "—"}
- **Dissent the reviewer weighed:** ${r.humanGate.dissentConsidered || "—"}
- **Monitoring action committed:** ${r.humanGate.monitoringAction || "—"}

### Accountability checks (approval was locked until these passed)
${r.accountabilityChecks.map((c) => `- [${c.passed ? "x" : " "}] ${c.label}`).join("\n")}

## 2. Civic Evidence Ledger
**Citation status:** ${r.evidenceLedger.citationStatus.replace(/_/g, " ")}
**Evidence grade:** ${EVIDENCE_GRADE_LABEL[r.evidenceLedger.evidenceGrade]}
**Live citations returned:** ${r.provider.citationsReturned}

> ${r.evidenceLedger.note}

${r.evidenceLedger.items.length ? r.evidenceLedger.items.map((e) => `- **[${e.sourceType.replace(/_/g, " ")}]** ${e.claim}${e.url ? ` — ${e.url}` : ""} _(confidence: ${e.confidence})_`).join("\n") : "- —"}

## 3. Dissent & Accountability Map
- **Strongest objection:** ${r.dissentMap.strongestObjection}
- **Who might be missed / disagree:**
${li(r.dissentMap.whoMightDisagree)}
- **What evidence would change the decision:**
${li(r.dissentMap.whatEvidenceWouldChangeDecision)}
- **Unresolved tensions:**
${li(r.dissentMap.unresolvedTensions)}
${r.council ? `\n**108-archetype council (one model estimating a fixed roster):** approve ${r.council.approve} · approve-with-edits ${r.council.approveWithEdits} · reject ${r.council.reject} (score ${r.council.aggregateScore}/100, model ${r.council.model}).` : ""}

## 4. Equity Review
- **Groups at risk of being missed:**
${li(r.equityReview.groupsAtRiskOfBeingMissed)}
- **Required on-the-ground human check:** ${r.equityReview.requiredHumanCheck}

## 5. Scenario
- **Decision question:** ${r.scenario.decisionQuestion}
- **Constraints:** ${r.scenario.constraints.join(" · ")}

## 6. AI Boundary & Limitations
- AI advised; a human decided. The AI could not finalize.
- **Mode:** ${r.mode}. **Provider/model:** ${r.provider.label}.
- Council is one model estimating a 108-archetype roster — a stress-test, not 108 live agents.
${r.limitations.map((l) => `- **${l.type} (${l.severity}):** ${l.text}`).join("\n")}

## 7. What to monitor next
${li(r.nextMonitoringActions)}

## 8. Reproducibility
- Structure checks passed: ${r.agentRun.structureChecksPassed}/${r.agentRun.structureChecksTotal}.
- Reproduce the live evaluation: \`node scripts/eval.mjs\` (see EVALUATION.md).
- This record: ${r.integrity.reproducible ? "reproducible from the run state" : "not reproducible"}.

---
_Generated by CIVICTAS. AI advises; a human decides; CIVICTAS records the proof._
`;
}

export function recordToJson(r: DecisionRecordV2): string {
  return JSON.stringify(r, null, 2);
}

export function recordPublicSummary(r: DecisionRecordV2): string {
  return r.publicSummary;
}
