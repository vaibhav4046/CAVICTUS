import { useState } from "react";
import {
  ShieldCheck,
  Link2,
  Check,
  ArrowUpRight,
  Scale,
  Users,
  ClipboardCheck,
  AlertTriangle,
  FileText,
  Sparkles,
  CircleSlash,
} from "lucide-react";
import BrandMark from "./BrandMark";
import SafeMarkdown from "./SafeMarkdown";
import { SharedRecord, buildShareUrl, RECORD_PARAM } from "../share";

interface DecisionRecordProps {
  /** Validated record, or null when the URL param failed to parse. */
  record: SharedRecord | null;
  /** The raw encoded payload, used to rebuild a clean copy link. */
  encoded: string;
}

const DECISION_LABEL: Record<string, string> = {
  approved: "Approved AI recommendation",
  approved_with_edits: "Approved with edits",
  rejected: "Rejected — alternative chosen",
};

function decisionLabel(value: string): string {
  return DECISION_LABEL[value] || (value ? value.replace(/_/g, " ") : "Decision recorded");
}

function formatDate(iso: string): string {
  if (!iso) return "Date not recorded";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "Date not recorded";
  return d.toLocaleString();
}

/** Open the app at its own root, with no record param. */
function appHomeUrl(): string {
  return `${window.location.origin}${window.location.pathname}`;
}

function ProvenanceLine() {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold text-accent bg-accent-soft border border-accent/20 px-2.5 py-1 rounded-full">
      <ShieldCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      AI advised · a human decided
    </span>
  );
}

function CheckRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-start gap-2.5 text-sm text-ink leading-relaxed">
      {ok ? (
        <Check className="w-4 h-4 text-positive shrink-0 mt-0.5" aria-hidden="true" />
      ) : (
        <CircleSlash className="w-4 h-4 text-faint shrink-0 mt-0.5" aria-hidden="true" />
      )}
      <span>{label}</span>
      <span className="sr-only">{ok ? " (confirmed)" : " (not confirmed)"}</span>
    </li>
  );
}

function InvalidRecord() {
  return (
    <main className="max-w-xl mx-auto w-full px-4 py-20">
      <div className="bg-surface border border-border-line rounded-2xl shadow-sm p-8 text-center space-y-4">
        <div className="mx-auto w-12 h-12 grid place-items-center rounded-full bg-warning/10 border border-warning/25">
          <AlertTriangle className="w-6 h-6 text-warning" aria-hidden="true" />
        </div>
        <h1 className="font-display text-xl font-semibold text-ink">This shared link can't be read</h1>
        <p className="text-sm text-muted leading-relaxed">
          The decision record in this link is missing, incomplete, or corrupted. Nothing was loaded.
          Ask whoever shared it for a fresh link, or open CIVICTAS to create your own.
        </p>
        <a
          href={appHomeUrl()}
          className="inline-flex items-center gap-1.5 bg-accent text-on-accent hover:opacity-90 font-semibold text-sm px-5 py-2.5 rounded-lg transition-opacity focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          Open CIVICTAS
          <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
        </a>
      </div>
    </main>
  );
}

export default function DecisionRecord({ record, encoded }: DecisionRecordProps) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const shareUrl = encoded ? buildShareUrl(encoded) : window.location.href;

  const handleCopy = async () => {
    setCopyFailed(false);
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard API can be blocked (insecure context / permissions).
      setCopyFailed(true);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col font-sans" id="civitas-root">
      {/* Brand header — consistent with the studio shell */}
      <header className="h-16 border-b border-border-line bg-surface-solid sticky top-0 z-40 flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <BrandMark className="w-9 h-9 shrink-0 text-ink" />
          <span className="min-w-0">
            <span className="block text-[17px] leading-none font-display font-semibold tracking-tight text-ink">
              CIVICTAS
            </span>
            <span className="block text-[10px] text-muted font-medium mt-1 tracking-wide truncate">
              Shared decision record · read-only
            </span>
          </span>
        </div>
        <a
          href={appHomeUrl()}
          className="inline-flex items-center gap-1.5 h-8 px-3 border border-border-line bg-surface hover:bg-surface-2 text-xs font-semibold rounded-lg text-ink transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          <span className="hidden sm:inline">Open CIVICTAS</span>
          <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
        </a>
      </header>

      {record === null ? (
        <InvalidRecord />
      ) : (
        <main className="flex-1 max-w-3xl mx-auto w-full px-4 md:px-6 py-8 space-y-6">
          {/* Title block + provenance + copy link */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <ProvenanceLine />
              <span className="text-[11px] font-mono text-muted">{formatDate(record.createdAt)}</span>
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight text-ink break-words">
              {record.category || "Community decision"}
            </h1>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopy}
                aria-live="polite"
                className="inline-flex items-center gap-2 bg-accent text-on-accent hover:opacity-90 font-semibold text-sm px-4 py-2 rounded-lg transition-opacity cursor-pointer focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              >
                {copied ? (
                  <Check className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Link2 className="w-4 h-4" aria-hidden="true" />
                )}
                {copied ? "Link copied" : "Copy link"}
              </button>
              {copyFailed && (
                <span className="text-xs text-muted break-all">
                  Copy blocked — link: <span className="font-mono text-ink">{shareUrl}</span>
                </span>
              )}
            </div>
          </section>

          {/* Human decision */}
          <section className="bg-surface border border-border-line rounded-2xl shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-ink flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-accent" aria-hidden="true" />
                Human decision
              </h2>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold bg-positive/15 text-positive px-2.5 py-1 rounded-full border border-positive/25">
                {decisionLabel(record.humanDecision)}
              </span>
            </div>
            {record.chosenOption && (
              <div>
                <p className="text-[11px] font-bold text-muted uppercase tracking-wide">Chosen option</p>
                <p className="text-sm text-ink leading-relaxed mt-1 whitespace-pre-wrap break-words">
                  {record.chosenOption}
                </p>
              </div>
            )}
            {record.humanRationale && (
              <div>
                <p className="text-[11px] font-bold text-muted uppercase tracking-wide">Human rationale</p>
                <p className="text-sm text-ink leading-relaxed mt-1 whitespace-pre-wrap break-words">
                  {record.humanRationale}
                </p>
              </div>
            )}
          </section>

          {/* Accountability checks */}
          <section className="bg-surface border border-border-line rounded-2xl shadow-sm p-5 space-y-3">
            <h2 className="text-sm font-bold text-ink flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-accent" aria-hidden="true" />
              Accountability checks
            </h2>
            <ul className="space-y-2">
              <CheckRow ok={record.checks.dataGaps} label="Reviewed data gaps and accepted remaining uncertainty." />
              <CheckRow ok={record.checks.equity} label="Matched the option against the equity & risk audit." />
              <CheckRow ok={record.checks.community} label="Considered qualitative feedback from the affected community." />
            </ul>
          </section>

          {/* Context & constraints */}
          <section className="bg-surface border border-border-line rounded-2xl shadow-sm p-5 space-y-3">
            <h2 className="text-sm font-bold text-ink flex items-center gap-2">
              <Scale className="w-4 h-4 text-accent" aria-hidden="true" />
              Context &amp; constraints
            </h2>
            {record.situation && (
              <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap break-words">{record.situation}</p>
            )}
            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {[
                { k: "Budget", v: record.constraints.budget },
                { k: "Sites", v: record.constraints.sites },
                { k: "Equity goal", v: record.constraints.equityGoal },
              ].map((row) => (
                <div key={row.k} className="bg-surface-2 border border-border-line rounded-xl p-3">
                  <dt className="text-[10px] font-bold text-muted uppercase tracking-wide">{row.k}</dt>
                  <dd className="text-sm text-ink mt-1 break-words">{row.v || "—"}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* AI recommendation */}
          {(record.recommendation || record.confidence || record.aiBrief) && (
            <section className="bg-surface border border-border-line rounded-2xl shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h2 className="text-sm font-bold text-ink flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-accent" aria-hidden="true" />
                  AI recommendation (advisory)
                </h2>
                {record.confidence && (
                  <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border border-border-line bg-surface-2 text-muted">
                    Confidence: {record.confidence}
                  </span>
                )}
              </div>
              {record.recommendation && (
                <p className="text-sm text-ink leading-relaxed font-medium whitespace-pre-wrap break-words">
                  {record.recommendation}
                </p>
              )}
              {record.aiBrief && (
                <div className="border-t border-border-line pt-3">
                  <SafeMarkdown text={record.aiBrief} />
                </div>
              )}
              <p className="text-xs text-muted leading-relaxed border-t border-border-line pt-3">
                This recommendation is advisory only. The decision above was made and signed off by a human.
              </p>
            </section>
          )}

          {/* Full advisory log (Agents 1–4) when it fit in the link */}
          {record.agentLog && (
            <section className="bg-surface border border-border-line rounded-2xl shadow-sm p-5 space-y-4">
              <h2 className="text-sm font-bold text-ink flex items-center gap-2">
                <FileText className="w-4 h-4 text-accent" aria-hidden="true" />
                Advisory log
              </h2>
              {[
                { t: "Agent 1 — Framing", v: record.agentLog.step1 },
                { t: "Agent 2 — Evidence", v: record.agentLog.step2 },
                { t: "Agent 3 — Simulation", v: record.agentLog.step3 },
                { t: "Agent 4 — Audit", v: record.agentLog.step4 },
              ]
                .filter((s) => s.v && s.v.trim())
                .map((s) => (
                  <details key={s.t} className="rounded-xl border border-border-line bg-surface-2 overflow-hidden">
                    <summary className="cursor-pointer select-none px-4 py-2.5 text-sm font-semibold text-ink hover:bg-surface focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset">
                      {s.t}
                    </summary>
                    <div className="px-4 pb-4 pt-1 border-t border-border-line bg-surface">
                      <SafeMarkdown text={s.v} />
                    </div>
                  </details>
                ))}
            </section>
          )}

          {/* Honest trimming note */}
          {record.trimmed && (
            <div className="flex items-start gap-2.5 bg-surface-2 border border-border-line rounded-2xl p-3.5">
              <Users className="w-4 h-4 text-muted shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-xs text-muted leading-relaxed">
                Some verbose AI detail was left out of this link to keep it short enough to share.
                The human decision, rationale, checks, and recommendation above are complete. For the
                full advisory log, ask the author for the printable PDF brief.
              </p>
            </div>
          )}

          <p className="text-[11px] text-faint text-center pt-2 leading-relaxed">
            Read-only record carried entirely in the link — no account, no server storage. Anyone with
            this URL sees exactly what is shown here. Reference: <code className="font-mono">?{RECORD_PARAM}=</code>
          </p>
        </main>
      )}

      <footer className="bg-surface-solid border-t border-border-line py-4 text-center text-[11px] text-muted">
        <span className="font-medium">CIVICTAS · AI advises, a human decides</span>
      </footer>
    </div>
  );
}
