import { describe, it, expect } from "vitest";
import { encodeRecord, decodeRecord, type DecisionSource } from "./share";

function sampleSource(overrides: Partial<DecisionSource> = {}): DecisionSource {
  return {
    createdAt: "2026-06-20T10:00:00.000Z",
    category: "Cooling centers (extreme heat)",
    situation: "Riverside expects 20+ extreme-heat days; choose 4 sites.",
    constraints: { budget: "300000", sites: "4", equityGoal: "Prioritize low-AC blocks" },
    recommendation: "Vulnerability-weighted plan",
    confidence: "High",
    humanDecision: "approved",
    chosenOption: "Eastside-first siting",
    humanRationale: "Protects the most heat-vulnerable residents.",
    checks: { dataGaps: true, equity: true, community: false },
    aiBrief: "A short plain-language brief.",
    agentLog: { step1: "framing", step2: "evidence", step3: "projections", step4: "audit" },
    ...overrides,
  };
}

describe("share record encode/decode", () => {
  it("round-trips a finalized decision without loss of the human-accountable core", () => {
    const result = encodeRecord(sampleSource());
    expect(result).not.toBeNull();
    const decoded = decodeRecord(result!.encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.category).toBe("Cooling centers (extreme heat)");
    expect(decoded!.chosenOption).toBe("Eastside-first siting");
    expect(decoded!.checks).toEqual({ dataGaps: true, equity: true, community: false });
    expect(decoded!.recommendation).toBe("Vulnerability-weighted plan");
  });

  it("preserves the full agent log when the link comfortably fits", () => {
    const result = encodeRecord(sampleSource());
    expect(result!.trimmed).toBe(false);
    const decoded = decodeRecord(result!.encoded);
    expect(decoded!.agentLog?.step2).toBe("evidence");
  });

  it("trims verbose AI detail (not the core) when the payload is too large", () => {
    const big = "x".repeat(20_000);
    const result = encodeRecord(sampleSource({ agentLog: { step1: big, step2: big, step3: big, step4: big } }));
    expect(result).not.toBeNull();
    expect(result!.trimmed).toBe(true);
    const decoded = decodeRecord(result!.encoded);
    // Core survives, oversized agent log is dropped.
    expect(decoded!.category).toBe("Cooling centers (extreme heat)");
    expect(decoded!.agentLog).toBeUndefined();
  });

  it("returns null (not a throw) for malformed, non-base64url, or empty input", () => {
    expect(decodeRecord(null)).toBeNull();
    expect(decodeRecord("")).toBeNull();
    expect(decodeRecord("not valid base64!!!")).toBeNull();
    expect(decodeRecord("////")).toBeNull();
  });

  it("rejects a payload missing the required core fields", () => {
    // Valid base64url of {"foo":"bar"} — well-formed JSON, but not a record.
    const encoded = btoa('{"foo":"bar"}').replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    expect(decodeRecord(encoded)).toBeNull();
  });

  it("never returns raw HTML — values are plain strings the view renders as text", () => {
    const decoded = decodeRecord(encodeRecord(sampleSource({ situation: "<img src=x onerror=alert(1)>" }))!.encoded);
    // The string is preserved verbatim as data (escaping is the view's job), and
    // decode never produces markup or executes anything.
    expect(typeof decoded!.situation).toBe("string");
    expect(decoded!.situation).toBe("<img src=x onerror=alert(1)>");
  });
});
