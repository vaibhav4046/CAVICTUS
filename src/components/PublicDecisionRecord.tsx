import { useState } from "react";
import {
  ScrollText,
  ShieldCheck,
  BookMarked,
  Scale,
  Users,
  Download,
  Copy,
  Check,
  AlertTriangle,
  Activity,
} from "lucide-react";
import {
  type DecisionRecordV2,
  recordToMarkdown,
  recordToJson,
  recordPublicSummary,
} from "../../lib/decisionRecordV2";
import { useNotify } from "../dialog";

const GRADE_STYLE: Record<string, string> = {
  strong: "bg-positive/10 text-positive border-positive/25",
  moderate: "bg-warning/10 text-warning border-warning/25",
  limited: "bg-warning/10 text-warning border-warning/25",
  demo_only: "bg-surface-2 text-muted border-border-strong",
};

function download(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function Panel({ icon: Icon, title, children }: { icon: typeof ScrollText; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border-line bg-surface-2 p-4">
      <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5 font-display mb-2.5">
        <Icon className="w-3.5 h-3.5 text-accent shrink-0" aria-hidden="true" />
        {title}
      </h4>
      {children}
    </div>
  );
}

const List = ({ items }: { items: string[] }) =>
  items.length ? (
    <ul className="space-y-1">
      {items.map((x, i) => (
        <li key={i} className="text-sm text-ink-soft leading-relaxed flex gap-1.5">
          <span className="text-faint shrink-0">·</span>
          <span className="min-w-0 break-words">{x}</span>
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-sm text-faint">—</p>
  );

export default function PublicDecisionRecord({ record, shareUrl }: { record: DecisionRecordV2; shareUrl?: string | null }) {
  const notify = useNotify();
  const [copiedMd, setCopiedMd] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);

  const copy = async (text: string, set: (v: boolean) => void, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      set(true);
      setTimeout(() => set(false), 1800);
    } catch {
      notify({ tone: "warning", message: `Could not copy ${label}. Use the download instead.` });
    }
  };

  const gradeKey = record.evidenceLedger.evidenceGrade;

  return (
    <section
      id="public-decision-record"
      aria-labelledby="pdr-title"
      className="bg-surface border border-accent/30 ring-1 ring-accent/10 rounded-2xl shadow-md p-5 md:p-6 space-y-5"
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h3 id="pdr-title" className="font-display text-lg md:text-xl font-bold tracking-tight text-ink flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-accent shrink-0" aria-hidden="true" />
            Public Decision Record
          </h3>
          <p className="text-xs text-muted mt-1 max-w-2xl leading-relaxed">
            A civic-grade record of what the AI advised, what evidence was used, what uncertainty
            remains, and why a human approved it. AI advised; a human decided; CIVICTAS records the proof.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${record.mode === "demo" ? "bg-warning/10 text-warning border-warning/25" : "bg-positive/10 text-positive border-positive/25"}`}>
            {record.mode === "demo" ? "Demo snapshot" : "Live run"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Decision */}
        <Panel icon={ShieldCheck} title="Decision">
          <p className="text-sm text-ink font-semibold">{record.recommendation.recommendedOption}</p>
          <p className="text-xs text-muted mt-1">Human decision: <span className="text-ink font-semibold">{record.humanGate.decision}</span></p>
          {record.humanGate.rationale && (
            <p className="text-xs text-ink-soft mt-2 leading-relaxed border-l-2 border-border-strong pl-2.5 break-words">{record.humanGate.rationale}</p>
          )}
          <div className="mt-2.5 space-y-1">
            {record.accountabilityChecks.map((c) => (
              <p key={c.id} className="text-xs flex items-center gap-1.5">
                <Check className={`w-3.5 h-3.5 shrink-0 ${c.passed ? "text-positive" : "text-faint"}`} aria-hidden="true" />
                <span className={c.passed ? "text-ink-soft" : "text-faint"}>{c.label}</span>
              </p>
            ))}
          </div>
        </Panel>

        {/* Evidence Ledger */}
        <Panel icon={BookMarked} title="Civic Evidence Ledger">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${GRADE_STYLE[gradeKey]}`}>
              {gradeKey.replace("_", " ")} grade
            </span>
            <span className="text-[11px] font-mono text-muted">{record.provider.citationsReturned} live citation(s)</span>
          </div>
          <p className="text-xs text-ink-soft mt-2 leading-relaxed">{record.evidenceLedger.note}</p>
          <ul className="mt-2 space-y-1">
            {record.evidenceLedger.items.slice(0, 4).map((e) => (
              <li key={e.id} className="text-xs text-muted leading-relaxed flex gap-1.5">
                <span className="font-mono text-[10px] uppercase text-faint shrink-0 mt-0.5">{e.sourceType.replace("_", " ")}</span>
                <span className="min-w-0 break-words">{e.claim}</span>
              </li>
            ))}
          </ul>
        </Panel>

        {/* Dissent Map */}
        <Panel icon={Users} title="Dissent & Accountability Map">
          <p className="text-xs text-muted">Strongest objection</p>
          <p className="text-sm text-ink-soft leading-relaxed">{record.dissentMap.strongestObjection}</p>
          <p className="text-xs text-muted mt-2.5">Who might be missed</p>
          <List items={record.dissentMap.whoMightDisagree} />
          <p className="text-xs text-muted mt-2.5">What evidence would change the decision</p>
          <List items={record.dissentMap.whatEvidenceWouldChangeDecision} />
          {record.council && (
            <p className="text-[11px] text-faint mt-2.5 leading-relaxed">
              Council (one model estimating 108 archetypes): {record.council.approve} approve · {record.council.approveWithEdits} edits · {record.council.reject} reject ({record.council.aggregateScore}/100).
            </p>
          )}
        </Panel>

        {/* Equity Review */}
        <Panel icon={Scale} title="Equity Review">
          <p className="text-xs text-muted">Groups at risk of being missed</p>
          <List items={record.equityReview.groupsAtRiskOfBeingMissed} />
          <p className="text-xs text-muted mt-2.5">Required on-the-ground human check</p>
          <p className="text-sm text-ink-soft leading-relaxed">{record.equityReview.requiredHumanCheck}</p>
        </Panel>
      </div>

      {/* AI boundary + limitations */}
      <div className="rounded-xl border border-border-line bg-surface p-4">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5 font-display mb-2">
          <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" aria-hidden="true" />
          AI boundary &amp; limitations
        </h4>
        <p className="text-xs text-ink-soft leading-relaxed">
          AI advised; a human decided — the AI could not finalize. Engine: <span className="font-mono">{record.provider.label}</span>. Mode: <span className="font-semibold">{record.mode}</span>.
        </p>
        <ul className="mt-2 space-y-1">
          {record.limitations.map((l, i) => (
            <li key={i} className="text-xs text-muted leading-relaxed flex gap-1.5">
              <span className="font-mono text-[10px] uppercase text-faint shrink-0 mt-0.5">{l.type}</span>
              <span className="min-w-0 break-words">{l.text}</span>
            </li>
          ))}
        </ul>
        {record.nextMonitoringActions.length > 0 && (
          <div className="mt-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5 font-display mb-1.5">
              <Activity className="w-3.5 h-3.5 text-accent shrink-0" aria-hidden="true" /> What to monitor next
            </h4>
            <List items={record.nextMonitoringActions} />
          </div>
        )}
      </div>

      {/* Exports */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border-line">
        <span className="text-[11px] font-mono text-faint w-full sm:w-auto">Export this record</span>
        <button
          type="button"
          onClick={() => copy(recordToMarkdown(record), setCopiedMd, "Markdown")}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-border-line bg-surface-solid text-ink hover:bg-surface-2 transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 outline-none"
        >
          {copiedMd ? <Check className="w-3.5 h-3.5 text-positive" /> : <Copy className="w-3.5 h-3.5" />}
          {copiedMd ? "Copied" : "Copy Markdown"}
        </button>
        <button
          type="button"
          onClick={() => download("civictas-public-decision-record.md", recordToMarkdown(record), "text/markdown")}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-border-line bg-surface-solid text-ink hover:bg-surface-2 transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 outline-none"
        >
          <Download className="w-3.5 h-3.5" /> Markdown
        </button>
        <button
          type="button"
          onClick={() => download("civictas-decision-record.json", recordToJson(record), "application/json")}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-border-line bg-surface-solid text-ink hover:bg-surface-2 transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 outline-none"
        >
          <Download className="w-3.5 h-3.5" /> JSON
        </button>
        <button
          type="button"
          onClick={() => copy(recordPublicSummary(record), setCopiedSummary, "public summary")}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-border-line bg-surface-solid text-ink hover:bg-surface-2 transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 outline-none"
        >
          {copiedSummary ? <Check className="w-3.5 h-3.5 text-positive" /> : <Copy className="w-3.5 h-3.5" />}
          {copiedSummary ? "Copied" : "Copy public summary"}
        </button>
        {shareUrl && (
          <button
            type="button"
            onClick={() => copy(shareUrl, () => notify({ tone: "success", message: "Share link copied." }), "share link")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-accent text-on-accent hover:opacity-90 transition-opacity focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 outline-none"
          >
            <Copy className="w-3.5 h-3.5" /> Share link
          </button>
        )}
      </div>
      <p className="text-[10px] text-faint font-mono">
        Record {record.integrity.recordId}{record.integrity.hash ? ` · hash ${record.integrity.hash.slice(0, 12)}…` : ""} · reproducible via{" "}
        <code className="text-muted">node scripts/eval.mjs</code>
      </p>
    </section>
  );
}
