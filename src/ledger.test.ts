import { describe, it, expect } from "vitest";
import { buildChain, verifyChain, tamperSim } from "./ledger";
import type { DecisionMemoryItem } from "./types";

function item(id: string, rationale: string): DecisionMemoryItem {
  return {
    id,
    createdAt: `2026-06-2${id}T10:00:00.000Z`,
    decisionType: `Decision ${id}`,
    situation: "situation",
    constraints: { budget: "1", sites: "1", equityGoal: "g" },
    humanDecision: "approved",
    chosenOption: "option",
    humanRationale: rationale,
    checks: { dataGaps: true, equity: true, community: true },
  };
}

// Memory is stored newest-first (the app prepends), so index 0 is the latest.
const items: DecisionMemoryItem[] = [item("3", "third"), item("2", "second"), item("1", "first")];

describe("decision ledger hash chain", () => {
  it("builds an append-only chain linking each entry to the previous hash", async () => {
    const chain = await buildChain(items);
    expect(chain).toHaveLength(3);
    // Genesis is 64 zeroes; each entry's prevHash is the previous entry's hash.
    expect(chain[0].prevHash).toBe("0".repeat(64));
    expect(chain[1].prevHash).toBe(chain[0].hash);
    expect(chain[2].prevHash).toBe(chain[1].hash);
    // SHA-256 hex is 64 chars.
    expect(chain[0].hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic — the same records always produce the same hashes", async () => {
    const a = await buildChain(items);
    const b = await buildChain(items);
    expect(a.map((e) => e.hash)).toEqual(b.map((e) => e.hash));
  });

  it("verifies an intact chain", async () => {
    const reference = await buildChain(items);
    const result = await verifyChain(items, reference);
    expect(result.valid).toBe(true);
    expect(result.brokenAt).toBe(-1);
  });

  it("detects tampering — editing any record breaks its link and every link after", async () => {
    const reference = await buildChain(items);
    // Edit the oldest record (last in the chain after the newest-first reversal).
    const tampered = items.map((it) => (it.id === "1" ? { ...it, humanRationale: "FORGED" } : it));
    const result = await verifyChain(tampered, reference);
    expect(result.valid).toBe(false);
    expect(result.brokenAt).toBeGreaterThanOrEqual(0);
  });

  it("tamperSim demonstrates a middle edit invalidating subsequent links", async () => {
    const sim = await tamperSim(items);
    expect(sim).not.toBeNull();
    expect(sim!.before).not.toBe(sim!.after);
    expect(sim!.invalidated).toBeGreaterThan(0);
  });

  it("tamperSim returns null for an empty ledger", async () => {
    expect(await tamperSim([])).toBeNull();
  });
});
