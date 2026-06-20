import { describe, it, expect } from "vitest";
import { getMockOutput } from "./mock";
import type { AgentBody } from "./agents";
import {
  buildDecisionRecordV2,
  validateDecisionRecordV2,
  recordToMarkdown,
  recordToJson,
  type RecordInput,
} from "./decisionRecordV2";

const body: AgentBody = {
  category: "Cooling centers (extreme heat)",
  situation: "Riverside expects 20+ extreme-heat days; choose 4 sites to protect heat-vulnerable residents.",
  budget: "300000",
  sites: "4",
  equityGoal: "Prioritize heat-vulnerable, low-AC, low-transit neighborhoods",
};

function baseInput(over: Partial<RecordInput> = {}): RecordInput {
  return {
    mode: "live",
    category: body.category!,
    situation: body.situation!,
    budget: "300000",
    sites: "4",
    equityGoal: body.equityGoal!,
    engine: { label: "NVIDIA NIM · Llama 3.1 8B", provider: "openrouter", model: "meta/llama-3.1-8b-instruct", councilModel: "meta/llama-3.1-8b-instruct", grounding: "web" },
    agentOutputs: {
      step1: getMockOutput("1", body).text,
      step2: getMockOutput("2", body).text,
      step3: getMockOutput("3", body).text,
      step4: getMockOutput("4", body).text,
      step5: getMockOutput("5", body).text,
    },
    groundingSources: [],
    council: { total: 108, approve: 60, approveWithEdits: 30, reject: 18, aggregateScore: 72, model: "meta/llama-3.1-8b-instruct", topRisk: "Stale data may miss newly arrived residents.", dissents: [{ persona: "Disability-rights advocate, Industrial district", verdict: "reject", reason: "No accessible transit mentioned." }] },
    human: { reviewerName: "Dr. A. Mensah", decision: "approved", rationale: "Protects the most heat-vulnerable Eastside residents over raw footfall.", dissentConsidered: "Weighed the disability-access objection from the council.", monitoringAction: "Door-to-door verification in the two highest-index tracts.", checks: { dataGaps: true, equity: true, community: true } },
    recordId: "rec-test-1",
    hash: "abc123",
    createdAt: "2026-06-20T10:00:00.000Z",
    ...over,
  };
}

describe("buildDecisionRecordV2", () => {
  it("builds a valid record from a live run", () => {
    const r = buildDecisionRecordV2(baseInput());
    expect(validateDecisionRecordV2(r)).toBe(true);
    expect(r.mode).toBe("live");
    expect(r.recommendation.recommendedOption).toMatch(/option c|vulnerability/i);
    expect(r.agentRun.structureChecksPassed).toBeGreaterThanOrEqual(4);
  });

  it("grades evidence MODERATE when no citations but checks passed (no overstatement)", () => {
    const r = buildDecisionRecordV2(baseInput({ groundingSources: [] }));
    expect(r.evidenceLedger.citationStatus).toBe("no_citations_returned");
    expect(r.evidenceLedger.evidenceGrade).toBe("moderate");
    expect(r.evidenceLedger.note).toMatch(/no external citations/i);
    expect(r.provider.citationsReturned).toBe(0);
  });

  it("grades evidence STRONG only when live citations are present", () => {
    const r = buildDecisionRecordV2(baseInput({ groundingSources: [{ title: "CDC Heat Tracker", url: "https://ephtracking.cdc.gov" }] }));
    expect(r.evidenceLedger.citationStatus).toBe("citations_returned");
    expect(r.evidenceLedger.evidenceGrade).toBe("strong");
    expect(r.evidenceLedger.items.some((e) => e.sourceType === "citation")).toBe(true);
  });

  it("marks a demo run as demo_only and demo_snapshot, never live", () => {
    const r = buildDecisionRecordV2(baseInput({ mode: "demo" }));
    expect(r.mode).toBe("demo");
    expect(r.evidenceLedger.evidenceGrade).toBe("demo_only");
    expect(r.integrity.generatedFrom).toBe("demo_snapshot");
    expect(r.provider.model).toBe("demo-mock");
  });

  it("builds a dissent map (strongest objection + who might be missed)", () => {
    const r = buildDecisionRecordV2(baseInput());
    expect(r.dissentMap.strongestObjection.length).toBeGreaterThan(5);
    expect(r.dissentMap.whoMightDisagree.length).toBeGreaterThan(0);
    expect(r.dissentMap.whatEvidenceWouldChangeDecision.length).toBeGreaterThan(0);
  });
});

describe("exports", () => {
  it("markdown contains mode, evidence grade, dissent, and rationale", () => {
    const md = recordToMarkdown(buildDecisionRecordV2(baseInput()));
    expect(md).toMatch(/LIVE RUN/);
    expect(md).toMatch(/Evidence grade/i);
    expect(md).toMatch(/Dissent & Accountability Map/i);
    expect(md).toMatch(/Human rationale/i);
    expect(md).toMatch(/What to monitor next/i);
  });

  it("markdown of a demo run is labeled DEMO SNAPSHOT", () => {
    const md = recordToMarkdown(buildDecisionRecordV2(baseInput({ mode: "demo" })));
    expect(md).toMatch(/DEMO SNAPSHOT/);
  });

  it("json export parses back and validates", () => {
    const r = buildDecisionRecordV2(baseInput());
    const parsed = JSON.parse(recordToJson(r));
    expect(validateDecisionRecordV2(parsed)).toBe(true);
    expect(parsed.humanGate.dissentConsidered).toMatch(/disability-access/i);
  });
});
