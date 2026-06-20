import { describe, it, expect } from "vitest";
import { PERSONAS, COUNCIL_SIZE, runCouncil } from "./council";

describe("persona council roster", () => {
  it("is exactly 108 personas (18 roles x 6 segments) with unique ids", () => {
    expect(COUNCIL_SIZE).toBe(108);
    expect(PERSONAS).toHaveLength(108);
    const ids = new Set(PERSONAS.map((p) => p.id));
    expect(ids.size).toBe(108);
  });
});

describe("runCouncil (deterministic demo mode)", () => {
  const input = {
    category: "Cooling centers",
    situation: "Choose 4 sites",
    equityGoal: "Protect heat-vulnerable residents",
    recommendation: "Vulnerability-weighted plan",
  };

  it("returns a vote split that always sums to the full council of 108", async () => {
    const r = await runCouncil(input, { forceProvider: "mock" });
    expect(r.total).toBe(108);
    expect(r.approve + r.approveWithEdits + r.reject).toBe(108);
  });

  it("returns a bounded aggregate score and labeled provider", async () => {
    const r = await runCouncil(input, { forceProvider: "mock" });
    expect(r.aggregateScore).toBeGreaterThanOrEqual(0);
    expect(r.aggregateScore).toBeLessThanOrEqual(100);
    expect(r.provider).toBe("mock");
    expect(r.dissents.length).toBeGreaterThan(0);
  });
});
