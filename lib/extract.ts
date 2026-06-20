/**
 * Structured inter-agent contract.
 *
 * The pipeline streams Markdown, but the load-bearing fields each agent is
 * required to produce (Agent 1's options, Agent 2's confidence-tagged findings,
 * Agent 3's projection table, Agent 5's recommendation + confidence) are parsed
 * here into typed values. That lets the studio do two honest things the raw
 * markdown could not:
 *   1. structurally validate each agent's output against the contract its prompt
 *      demands (real validation, not "non-empty string"), and
 *   2. check cross-agent consistency — e.g. that the recommendation Agent 5 makes
 *      is actually one of the options Agent 1 framed.
 *
 * Pure, deterministic, fully unit-tested. Heading- and phrasing-tolerant so it
 * works on both the deterministic demo output and live model output.
 */

export interface StepCheck {
  /** True when every structural marker the step's prompt requires is present. */
  ok: boolean;
  /** Human-readable list of the required markers that are absent. */
  missing: string[];
}

const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

/** Slice the markdown under a top-level "# Heading" up to the next "# " heading. */
function sectionUnder(md: string, headingPattern: RegExp): string {
  const lines = md.split("\n");
  let capturing = false;
  const out: string[] = [];
  for (const line of lines) {
    if (/^#\s/.test(line)) {
      if (capturing) break; // next top-level heading ends the section
      if (headingPattern.test(line)) {
        capturing = true;
        continue;
      }
    }
    if (capturing) out.push(line);
  }
  return out.join("\n");
}

/** Agent 1 — the bold-titled options under "# Candidate options". */
export function extractOptions(framing: string): string[] {
  const section = sectionUnder(framing, /candidate options/i);
  const body = section || framing;
  const titles: string[] = [];
  const re = /\*\*\s*(Option\s+[^*]+?)\s*\*\*/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    // Keep the label up to a separating dash/colon for a clean option title.
    titles.push(m[1].split(/[—–:-]/)[0].trim());
  }
  return Array.from(new Set(titles));
}

/** Agent 5 — the recommended option line (bold) under "# Recommended option". */
export function extractRecommendedOption(brief: string): string {
  if (!brief) return "";
  const explicit = brief.match(/#\s*Recommended option[^\n]*\n+\s*\*\*([^*]+)\*\*/i);
  if (explicit) return explicit[1].replace(/\(confidence[^)]*\)/i, "").trim();
  const heading = brief.match(/#\s*Recommended option\s*(?:\(proposal\))?\s*\n+([^\n]+)/i);
  if (heading) return heading[1].replace(/[*_]/g, "").replace(/\(confidence[^)]*\)/i, "").trim();
  const firstBold = brief.match(/\*\*([^*]+)\*\*/);
  if (firstBold) return firstBold[1].replace(/\(confidence[^)]*\)/i, "").trim();
  // Never fabricate: fall back to the first substantive line, else empty.
  const line = brief
    .split("\n")
    .map((l) => l.replace(/^[#>*\-\s]+/, "").trim())
    .find((l) => l.length > 8);
  return line || "";
}

/** Agent 5 — the confidence rating, formatted "(Confidence: High|Medium|Low)". */
export function extractConfidence(brief: string): "High" | "Medium" | "Low" | null {
  const m = brief.match(/confidence[:\s]*\**\s*(high|medium|low)/i);
  if (!m) return null;
  const v = m[1].toLowerCase();
  return v === "high" ? "High" : v === "low" ? "Low" : "Medium";
}

/** Agent 2 — count findings that carry an explicit confidence label. */
export function countGroundedFindings(evidence: string): number {
  return (evidence.match(/confidence/gi) || []).length;
}

/** Markdown table data rows (lines with >=3 pipes that aren't the separator). */
function tableRowCount(md: string): number {
  return md
    .split("\n")
    .filter((l) => (l.match(/\|/g) || []).length >= 3 && !/^\s*\|?\s*[-:]+\s*\|/.test(l)).length;
}

/**
 * Validate one agent's output against the structure its prompt requires.
 * Lenient by design: checks for the load-bearing markers, not exact prose, so
 * legitimate phrasing variation in live output is not flagged.
 */
export function validateStep(step: number, text: string): StepCheck {
  const t = text || "";
  const has = (re: RegExp) => re.test(t);
  const missing: string[] = [];
  switch (step) {
    case 1:
      if (extractOptions(t).length < 2 && !has(/option\s*[a-d1-9]/i)) missing.push("candidate options");
      if (!has(/stakeholder/i)) missing.push("stakeholders");
      if (!has(/constraint|budget/i)) missing.push("constraints");
      break;
    case 2:
      if (!has(/confidence/i)) missing.push("confidence levels");
      if (!has(/data gap|gaps?\b/i)) missing.push("data gaps");
      break;
    case 3:
      if (tableRowCount(t) < 1) missing.push("projection table");
      if (!has(/assumption/i)) missing.push("assumptions");
      break;
    case 4:
      if (!has(/risk/i)) missing.push("AI/data risk");
      if (!has(/human (check|verif|review)|on-the-ground/i)) missing.push("human check");
      break;
    case 5:
      if (!extractRecommendedOption(t)) missing.push("recommendation");
      if (!extractConfidence(t)) missing.push("confidence rating");
      break;
  }
  return { ok: missing.length === 0, missing };
}

/**
 * Cross-agent consistency: is Agent 5's recommendation actually one of the
 * options Agent 1 framed? Tolerant token overlap so phrasing drift is allowed.
 * Returns null when there isn't enough to judge (don't assert a false negative).
 */
export function recommendationIsFramed(framing: string, brief: string): boolean | null {
  const options = extractOptions(framing);
  const rec = extractRecommendedOption(brief);
  if (!options.length || !rec) return null;
  const recN = norm(rec);
  // Match on a shared "option X" label, or meaningful token overlap with a title.
  const recLabel = recN.match(/option [a-d1-9]/)?.[0];
  for (const opt of options) {
    const optN = norm(opt);
    if (recLabel && optN.includes(recLabel)) return true;
    const optTokens = optN.split(" ").filter((w) => w.length > 3 && w !== "option");
    if (optTokens.length && optTokens.filter((w) => recN.includes(w)).length >= Math.min(2, optTokens.length)) {
      return true;
    }
  }
  return false;
}
