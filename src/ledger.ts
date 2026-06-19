/**
 * Tamper-evident Decision Ledger.
 *
 * Every finalized decision is hashed (SHA-256) over its canonical record plus
 * the previous record's hash, forming an append-only chain. Editing any record
 * changes its hash and breaks every link after it — which the verifier detects.
 * This is real cryptography (Web Crypto), deterministic, and not a mock.
 */

import { DecisionMemoryItem } from "./types";

const GENESIS = "0".repeat(64);

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Deterministic, field-stable serialization of the human-accountable record. */
function canonical(item: DecisionMemoryItem): string {
  return JSON.stringify([
    item.id,
    item.createdAt,
    item.decisionType,
    item.chosenOption || "",
    item.humanDecision || "",
    item.humanRationale || "",
    item.checks ? [item.checks.dataGaps, item.checks.equity, item.checks.community] : [],
  ]);
}

export interface LedgerEntry {
  index: number;
  id: string;
  title: string;
  decision: string;
  hash: string;
  prevHash: string;
}

/** Build the hash chain from records, oldest → newest. */
export async function buildChain(items: DecisionMemoryItem[]): Promise<LedgerEntry[]> {
  const ordered = [...items].reverse(); // memory is stored newest-first
  const out: LedgerEntry[] = [];
  let prev = GENESIS;
  for (let i = 0; i < ordered.length; i++) {
    const it = ordered[i];
    const hash = await sha256Hex(prev + "|" + canonical(it));
    out.push({
      index: i,
      id: it.id,
      title: it.decisionType,
      decision: it.humanDecision || "approved",
      hash,
      prevHash: prev,
    });
    prev = hash;
  }
  return out;
}

export interface VerifyResult {
  valid: boolean;
  count: number;
  brokenAt: number; // -1 if intact
}

/** Recompute the chain and compare to a reference set of hashes. */
export async function verifyChain(
  items: DecisionMemoryItem[],
  reference: LedgerEntry[]
): Promise<VerifyResult> {
  const recomputed = await buildChain(items);
  for (let i = 0; i < reference.length; i++) {
    if (!recomputed[i] || recomputed[i].hash !== reference[i].hash) {
      return { valid: false, count: reference.length, brokenAt: i };
    }
  }
  return { valid: true, count: reference.length, brokenAt: -1 };
}

export interface TamperResult {
  index: number;
  title: string;
  before: string;
  after: string;
  invalidated: number; // how many subsequent links break
}

/**
 * Deterministic tamper demonstration: alter one record's rationale in a COPY,
 * rebuild the chain, and report how the hashes diverge. Real proof, no mutation
 * of the user's actual data.
 */
export async function tamperSim(items: DecisionMemoryItem[]): Promise<TamperResult | null> {
  if (items.length === 0) return null;
  const clean = await buildChain(items);
  const ordered = [...items].reverse();
  const target = Math.floor(ordered.length / 2); // alter a middle record
  const copy = ordered.map((it, i) =>
    i === target ? { ...it, humanRationale: (it.humanRationale || "") + " [edited]" } : it
  );
  // rebuild over the tampered copy (already oldest-first)
  const out: LedgerEntry[] = [];
  let prev = GENESIS;
  for (const it of copy) {
    const hash = await sha256Hex(prev + "|" + canonical(it));
    out.push({ index: out.length, id: it.id, title: it.decisionType, decision: "", hash, prevHash: prev });
    prev = hash;
  }
  let invalidated = 0;
  for (let i = target; i < clean.length; i++) {
    if (clean[i]?.hash !== out[i]?.hash) invalidated++;
  }
  return {
    index: target,
    title: ordered[target].decisionType,
    before: clean[target].hash,
    after: out[target].hash,
    invalidated,
  };
}
