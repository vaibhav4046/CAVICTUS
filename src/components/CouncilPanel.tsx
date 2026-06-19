import { useEffect, useRef, useState } from "react";
import { Users, Gavel, Send, Loader2 } from "lucide-react";

interface Dissent {
  persona: string;
  verdict: string;
  reason: string;
}

interface CouncilResult {
  total: number;
  approve: number;
  approveWithEdits: number;
  reject: number;
  aggregateScore: number;
  confidence: string;
  consensus: string;
  topRisk: string;
  dissents: Dissent[];
  provider: string;
  model: string;
}

export interface ChannelStatus {
  channel: string;
  configured: boolean;
  ok: boolean;
  simulated: boolean;
  detail: string;
}

interface CouncilPanelProps {
  active: boolean;
  category: string;
  situation: string;
  equityGoal: string;
  recommendation: string;
  channels: ChannelStatus[];
}

const verdictChip = (v: string): string => {
  if (/reject/i.test(v)) return "bg-rose-500/10 text-rose-500 border-rose-500/20";
  if (/edit/i.test(v)) return "bg-amber-500/10 text-amber-600 border-amber-500/20";
  return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
};

export default function CouncilPanel(props: CouncilPanelProps) {
  const [result, setResult] = useState<CouncilResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedKey = useRef<string>("");

  useEffect(() => {
    if (!props.active || !props.recommendation) return;
    const key = props.recommendation;
    if (fetchedKey.current === key) return;
    fetchedKey.current = key;

    setLoading(true);
    setError(null);
    fetch("/api/council", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: props.category,
        situation: props.situation,
        equityGoal: props.equityGoal,
        recommendation: props.recommendation,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data.total === "number") setResult(data);
        else setError(data?.error || "Council unavailable.");
      })
      .catch(() => setError("Council request failed."))
      .finally(() => setLoading(false));
  }, [props.active, props.recommendation]);

  if (!props.active) return null;

  const pct = (n: number) => (result && result.total ? Math.round((n / result.total) * 100) : 0);

  return (
    <section id="council-panel" className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-muted uppercase tracking-widest px-1 flex items-center gap-2">
          <Users className="w-3.5 h-3.5" />
          108-Persona Deliberation Stress-Test
        </h3>
        {result && (
          <span className="text-[10px] font-mono text-muted">
            judged by {result.provider} · {result.model}
          </span>
        )}
      </div>

      <div className="bg-surface-solid border border-border-line rounded-2xl p-5 space-y-5">
        {loading && (
          <div className="flex items-center gap-2 text-xs text-muted py-6 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" />
            Convening 108 community personas…
          </div>
        )}

        {error && !loading && (
          <p className="text-xs text-muted py-4 text-center">{error}</p>
        )}

        {result && !loading && (
          <>
            <div className="flex items-center gap-5 flex-wrap">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Council score</span>
                <span className="text-4xl font-display font-extrabold text-ink leading-none mt-1">
                  {result.aggregateScore}
                  <span className="text-base text-muted font-bold">/100</span>
                </span>
                <span className="text-[10px] text-muted mt-1">confidence: {result.confidence}</span>
              </div>

              <div className="flex-1 min-w-[220px] space-y-2">
                <VoteBar label="Approve" count={result.approve} pct={pct(result.approve)} color="bg-emerald-500" />
                <VoteBar label="Approve with edits" count={result.approveWithEdits} pct={pct(result.approveWithEdits)} color="bg-amber-500" />
                <VoteBar label="Reject" count={result.reject} pct={pct(result.reject)} color="bg-rose-500" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-surface border border-border-line">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Gavel className="w-3.5 h-3.5" /> Consensus
                </span>
                <p className="text-xs text-ink/90 mt-1.5 leading-relaxed">{result.consensus}</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">⚠ Council's top concern</span>
                <p className="text-xs text-ink/90 mt-1.5 leading-relaxed">{result.topRisk}</p>
              </div>
            </div>

            {result.dissents.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Dissenting & conditional voices</span>
                <div className="space-y-1.5">
                  {result.dissents.map((d, i) => (
                    <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-surface border border-border-line">
                      <span className={`text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 mt-0.5 ${verdictChip(d.verdict)}`}>
                        {d.verdict.replace(/_/g, " ")}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-ink leading-tight">{d.persona}</p>
                        <p className="text-[11px] text-muted leading-relaxed mt-0.5">{d.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {result && !loading && (
          <p className="text-[10px] text-muted leading-relaxed border-t border-border-line pt-3">
            Synthetic personas — a stress-test to surface dissent and show{" "}
            <strong className="text-ink">where to verify with real residents</strong>, not a
            substitute for community consent.
          </p>
        )}

        {props.channels.length > 0 && (
          <div className="pt-3 border-t border-border-line">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5" /> Reviewer notified via
            </span>
            <div className="flex flex-wrap gap-2 mt-2">
              {props.channels.map((c) => (
                <span
                  key={c.channel}
                  title={c.detail}
                  className={`text-[10px] font-mono px-2 py-1 rounded-lg border ${
                    c.configured && c.ok
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                      : c.configured
                      ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                      : "bg-surface text-muted border-border-line"
                  }`}
                >
                  {c.channel} · {c.configured && c.ok ? "live" : c.configured ? "error" : "simulated"}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function VoteBar(props: { label: string; count: number; pct: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-muted w-32 shrink-0">{props.label}</span>
      <div className="flex-1 h-2.5 bg-surface rounded-full overflow-hidden border border-border-line">
        <div className={`h-full ${props.color} rounded-full`} style={{ width: `${props.pct}%` }} />
      </div>
      <span className="text-[10px] font-mono font-bold text-ink w-10 text-right">{props.count}</span>
    </div>
  );
}
