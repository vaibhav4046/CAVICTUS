import { useEffect, useState } from "react";
import { ShieldCheck, Link2, TriangleAlert, Loader2, FileCheck2 } from "lucide-react";
import { DecisionMemoryItem } from "../types";
import { buildChain, verifyChain, tamperSim, LedgerEntry, TamperResult } from "../ledger";

interface LedgerPanelProps {
  items: DecisionMemoryItem[];
}

const short = (h: string) => `${h.slice(0, 8)}…${h.slice(-6)}`;

export default function LedgerPanel({ items }: LedgerPanelProps) {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [building, setBuilding] = useState(true);
  const [status, setStatus] = useState<"idle" | "verified" | "broken">("idle");
  const [tamper, setTamper] = useState<TamperResult | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    setBuilding(true);
    buildChain(items).then((e) => {
      if (!alive) return;
      setEntries(e);
      setBuilding(false);
      setStatus("idle");
      setTamper(null);
    });
    return () => {
      alive = false;
    };
  }, [items]);

  const onVerify = async () => {
    setBusy(true);
    const r = await verifyChain(items, entries);
    setStatus(r.valid ? "verified" : "broken");
    setBusy(false);
  };

  const onTamper = async () => {
    setBusy(true);
    const r = await tamperSim(items);
    setTamper(r);
    setBusy(false);
  };

  if (items.length === 0) return null;

  return (
    <section id="ledger-panel" className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-muted uppercase tracking-widest px-1 flex items-center gap-2">
          <FileCheck2 className="w-3.5 h-3.5" />
          Decision Ledger
        </h3>
        <span className="text-[10px] font-mono text-muted">SHA-256 hash-chain · tamper-evident</span>
      </div>

      <div className="bg-surface-solid border border-border-line rounded-2xl p-5 space-y-4">
        <p className="text-xs text-muted leading-relaxed">
          Every finalized decision is hashed over its record plus the previous hash. Edit any record
          and its hash — and every link after it — breaks. Verifiable in-browser, no server trust.
        </p>

        {building ? (
          <div className="flex items-center gap-2 text-xs text-muted py-3">
            <Loader2 className="w-4 h-4 animate-spin" /> Computing chain…
          </div>
        ) : (
          <div className="rounded-xl border border-border-line overflow-hidden">
            <div className="max-h-44 overflow-y-auto divide-y divide-border-line">
              {entries.map((e) => (
                <div key={e.id} className="flex items-center gap-3 px-3.5 py-2.5 bg-surface-solid">
                  <span className="text-[10px] font-mono text-muted w-6 shrink-0">#{e.index}</span>
                  <Link2 className="w-3 h-3 text-muted/60 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-ink truncate">{e.title}</p>
                    <p className="text-[10px] font-mono text-muted truncate">{short(e.hash)}</p>
                  </div>
                  <span className="text-[9px] font-mono uppercase text-muted shrink-0">{e.decision.replace(/_/g, " ")}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onVerify}
            disabled={busy || building}
            className="inline-flex items-center gap-2 bg-accent text-white hover:opacity-90 disabled:opacity-50 font-semibold text-xs px-4 py-2 rounded-lg transition-all"
          >
            <ShieldCheck className="w-4 h-4" />
            Verify integrity
          </button>
          <button
            onClick={onTamper}
            disabled={busy || building}
            className="inline-flex items-center gap-2 bg-surface border border-border-line text-ink hover:bg-surface/60 disabled:opacity-50 font-semibold text-xs px-4 py-2 rounded-lg transition-all"
          >
            <TriangleAlert className="w-4 h-4 text-amber-500" />
            Run tamper simulation
          </button>
        </div>

        {status === "verified" && (
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
            <ShieldCheck className="w-4 h-4" />
            Verified — {entries.length} records, chain intact.
          </div>
        )}
        {status === "broken" && (
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
            <TriangleAlert className="w-4 h-4" />
            Integrity check failed — a record was altered.
          </div>
        )}

        {tamper && (
          <div className="text-xs bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2.5 space-y-1">
            <p className="font-semibold text-amber-600 dark:text-amber-400">
              Tamper detected at record #{tamper.index} ({tamper.title})
            </p>
            <p className="font-mono text-[10px] text-muted break-all">
              {short(tamper.before)} → {short(tamper.after)}
            </p>
            <p className="text-[11px] text-ink/80">
              Editing one record invalidated <strong>{tamper.invalidated}</strong> downstream{" "}
              {tamper.invalidated === 1 ? "link" : "links"}. The chain makes silent edits impossible to hide.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
