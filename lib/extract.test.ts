import { describe, it, expect } from "vitest";
import { getMockOutput } from "./mock";
import type { AgentBody } from "./agents";
import {
  extractOptions,
  extractRecommendedOption,
  extractConfidence,
  countGroundedFindings,
  validateStep,
  recommendationIsFramed,
} from "./extract";

const body: AgentBody = {
  category: "Cooling centers (extreme heat)",
  situation: "Riverside expects 20+ extreme-heat days; choose 4 sites.",
  budget: "300000",
  sites: "4",
  equityGoal: "Prioritize heat-vulnerable, low-AC, low-transit neighborhoods",
};

const framing = getMockOutput("1", body).text;
const evidence = getMockOutput("2", body).text;
const simulation = getMockOutput("3", body).text;
const audit = getMockOutput("4", body).text;
const brief = getMockOutput("5", body).text;

describe("extractOptions", () => {
  it("pulls the framed candidate options from Agent 1", () => {
    const options = extractOptions(framing);
    expect(options.length).toBeGreaterThanOrEqual(3);
    expect(options.some((o) => /option a/i.test(o))).toBe(true);
  });
});

describe("Agent 5 parsing", () => {
  it("extracts the recommended option without fabricating", () => {
    expect(extractRecommendedOption(brief)).toMatch(/option c/i);
    expect(extractRecommendedOption("")).toBe("");
  });
  it("extracts the confidence rating", () => {
    expect(extractConfidence(brief)).toBe("Medium");
    expect(extractConfidence("no rating here")).toBeNull();
  });
});

describe("countGroundedFindings", () => {
  it("counts the confidence-tagged evidence findings", () => {
    expect(countGroundedFindings(evidence)).toBeGreaterThanOrEqual(4);
  });
});

describe("validateStep — structural contract per agent", () => {
  it("passes every step on well-formed demo output", () => {
    expect(validateStep(1, framing).ok).toBe(true);
    expect(validateStep(2, evidence).ok).toBe(true);
    expect(validateStep(3, simulation).ok).toBe(true);
    expect(validateStep(4, audit).ok).toBe(true);
    expect(validateStep(5, brief).ok).toBe(true);
  });

  it("flags missing markers on malformed output (no false pass)", () => {
    const bad1 = validateStep(1, "Just a sentence with no structure.");
    expect(bad1.ok).toBe(false);
    expect(bad1.missing).toContain("candidate options");

    const bad5 = validateStep(5, "We like option C a lot.");
    expect(bad5.ok).toBe(false);
    expect(bad5.missing).toContain("confidence rating");
  });
});

describe("recommendationIsFramed — cross-agent consistency", () => {
  it("confirms Agent 5's recommendation is one of Agent 1's framed options", () => {
    expect(recommendationIsFramed(framing, brief)).toBe(true);
  });
  it("detects a recommendation that was never framed", () => {
    const rogue = "# Recommended option (proposal)\n**Option Z: Build a stadium** (Confidence: High)";
    expect(recommendationIsFramed(framing, rogue)).toBe(false);
  });
  it("returns null when there isn't enough to judge", () => {
    expect(recommendationIsFramed("", brief)).toBeNull();
    expect(recommendationIsFramed(framing, "")).toBeNull();
  });
});
