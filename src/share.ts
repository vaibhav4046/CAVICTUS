/**
 * Shareable decision record — encode/decode helpers.
 *
 * A finalized decision is serialized to a compact JSON payload, UTF-8 → base64url
 * encoded, and carried in a `?record=` query param so anyone with the link can
 * open a read-only view. No backend, no accounts, no cloud storage — the record
 * travels entirely inside the URL.
 *
 * Hard rules:
 *  - URL input is never trusted: decode is fully defensive (try/catch + schema
 *    guard) and returns null on anything malformed.
 *  - Oversized payloads are refused at encode time so callers can fall back to
 *    the existing PDF export instead of producing an unusable link.
 *  - No HTML is ever produced here — only plain data the view renders as text.
 */

/** Query-param key carrying the encoded record. */
export const RECORD_PARAM = "record";

/**
 * Max length of the encoded string we are willing to put in a link. Kept well
 * inside what browsers and chat apps reliably accept end-to-end. Past this, the
 * caller falls back to the PDF brief.
 */
export const MAX_ENCODED_CHARS = 8000;

/** Reject absurdly long params before touching atob (cheap DoS guard). */
const MAX_DECODE_INPUT = 200_000;

/** Schema version — lets future readers reject incompatible payloads. */
const RECORD_VERSION = 1;

export interface SharedChecks {
  dataGaps: boolean;
  equity: boolean;
  community: boolean;
}

export interface SharedConstraints {
  budget: string;
  sites: string;
  equityGoal: string;
}

/** Optional full advisory log (Agents 1–4); omitted when it would oversize the link. */
export interface SharedAgentLog {
  step1: string;
  step2: string;
  step3: string;
  step4: string;
}

export interface SharedRecord {
  v: number;
  createdAt: string;
  category: string;
  situation: string;
  constraints: SharedConstraints;
  recommendation: string;
  confidence: string;
  humanDecision: string;
  chosenOption: string;
  humanRationale: string;
  checks: SharedChecks;
  /** Agent 5 synthesized brief (markdown). Present unless the link had to be trimmed hard. */
  aiBrief?: string;
  /** Agents 1–4 full outputs. Present only when the link comfortably fits. */
  agentLog?: SharedAgentLog;
  /** True when verbose AI detail was dropped to fit the link length budget. */
  trimmed?: boolean;
}

/** Everything the caller knows about a finalized decision, before length budgeting. */
export interface DecisionSource {
  createdAt: string;
  category: string;
  situation: string;
  constraints: SharedConstraints;
  recommendation: string;
  confidence: string;
  humanDecision: string;
  chosenOption: string;
  humanRationale: string;
  checks: SharedChecks;
  aiBrief: string;
  agentLog: SharedAgentLog;
}

export interface EncodeResult {
  /** The encoded base64url payload. */
  encoded: string;
  /** True when verbose AI detail was dropped to fit the length budget. */
  trimmed: boolean;
}

// ── base64url (UTF-8 safe) ──────────────────────────────────────────────────

function toBase64Url(json: string): string {
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(input: string): string {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64.length % 4 === 0 ? b64 : b64 + "=".repeat(4 - (b64.length % 4));
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

// ── encode ──────────────────────────────────────────────────────────────────

function baseRecord(src: DecisionSource): SharedRecord {
  return {
    v: RECORD_VERSION,
    createdAt: src.createdAt,
    category: src.category,
    situation: src.situation,
    constraints: {
      budget: src.constraints.budget,
      sites: src.constraints.sites,
      equityGoal: src.constraints.equityGoal,
    },
    recommendation: src.recommendation,
    confidence: src.confidence,
    humanDecision: src.humanDecision,
    chosenOption: src.chosenOption,
    humanRationale: src.humanRationale,
    checks: {
      dataGaps: !!src.checks.dataGaps,
      equity: !!src.checks.equity,
      community: !!src.checks.community,
    },
  };
}

/**
 * Encode a finalized decision into a length-budgeted base64url payload.
 *
 * Tiers, largest first: full (with Agent 1–4 log) → brief-only (Agent 5) →
 * core-only. Returns null when even the core exceeds the budget, signalling the
 * caller to fall back to the PDF export.
 */
export function encodeRecord(src: DecisionSource): EncodeResult | null {
  const core = baseRecord(src);

  const full: SharedRecord = {
    ...core,
    aiBrief: src.aiBrief || undefined,
    agentLog: src.agentLog,
    trimmed: false,
  };
  const fullEncoded = toBase64Url(JSON.stringify(full));
  if (fullEncoded.length <= MAX_ENCODED_CHARS) {
    return { encoded: fullEncoded, trimmed: false };
  }

  const briefOnly: SharedRecord = {
    ...core,
    aiBrief: src.aiBrief || undefined,
    trimmed: true,
  };
  const briefEncoded = toBase64Url(JSON.stringify(briefOnly));
  if (briefEncoded.length <= MAX_ENCODED_CHARS) {
    return { encoded: briefEncoded, trimmed: true };
  }

  const coreOnly: SharedRecord = { ...core, trimmed: true };
  const coreEncoded = toBase64Url(JSON.stringify(coreOnly));
  if (coreEncoded.length <= MAX_ENCODED_CHARS) {
    return { encoded: coreEncoded, trimmed: true };
  }

  return null;
}

/** Build the full shareable URL for an encoded payload, rooted at the current page. */
export function buildShareUrl(encoded: string): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}?${RECORD_PARAM}=${encoded}`;
}

// ── decode (defensive) ──────────────────────────────────────────────────────

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function bool(value: unknown): boolean {
  return value === true;
}

function parseChecks(value: unknown): SharedChecks {
  if (!isObject(value)) return { dataGaps: false, equity: false, community: false };
  return {
    dataGaps: bool(value.dataGaps),
    equity: bool(value.equity),
    community: bool(value.community),
  };
}

function parseConstraints(value: unknown): SharedConstraints {
  if (!isObject(value)) return { budget: "", sites: "", equityGoal: "" };
  return {
    budget: str(value.budget),
    sites: str(value.sites),
    equityGoal: str(value.equityGoal),
  };
}

function parseAgentLog(value: unknown): SharedAgentLog | undefined {
  if (!isObject(value)) return undefined;
  return {
    step1: str(value.step1),
    step2: str(value.step2),
    step3: str(value.step3),
    step4: str(value.step4),
  };
}

/**
 * Parse an untrusted `?record=` value into a validated SharedRecord, or null.
 *
 * Defends against: non-base64url input, malformed JSON, non-object payloads,
 * wrong types, and oversized input. The returned object only ever contains
 * plain strings/booleans the read-only view renders as text — never raw HTML.
 */
export function decodeRecord(param: string | null | undefined): SharedRecord | null {
  if (!param) return null;
  if (param.length > MAX_DECODE_INPUT) return null;
  if (!/^[A-Za-z0-9\-_]+$/.test(param)) return null;

  let json: string;
  try {
    json = fromBase64Url(param);
  } catch {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }

  if (!isObject(parsed)) return null;
  // A record must carry at least the human-accountable core.
  if (typeof parsed.category !== "string" || typeof parsed.situation !== "string") {
    return null;
  }

  const agentLog = parseAgentLog(parsed.agentLog);
  const aiBrief = str(parsed.aiBrief);

  return {
    v: typeof parsed.v === "number" ? parsed.v : RECORD_VERSION,
    createdAt: str(parsed.createdAt),
    category: str(parsed.category),
    situation: str(parsed.situation),
    constraints: parseConstraints(parsed.constraints),
    recommendation: str(parsed.recommendation),
    confidence: str(parsed.confidence),
    humanDecision: str(parsed.humanDecision),
    chosenOption: str(parsed.chosenOption),
    humanRationale: str(parsed.humanRationale),
    checks: parseChecks(parsed.checks),
    aiBrief: aiBrief || undefined,
    agentLog,
    trimmed: bool(parsed.trimmed),
  };
}
