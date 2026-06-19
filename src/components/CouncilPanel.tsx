import { useEffect, useRef, useState } from "react";
import { Users, Gavel, Send, Loader2, AlertTriangle } from "lucide-react";
import RealityPill, { type RealityKind } from "./RealityPill";

const channelReality = (c: ChannelStatus): { kind: RealityKind; label: string } => {
  if (c.configured && c.ok) return { kind: "live", label: "live" };
  if (c.configured) return { kind: "error", label: "error" };
  return { kind: "simulated", label: "simulated" };
};

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
  /** When true, the council runs in deterministic demo mode (forced mock). */
  demo?: boolean;
}

const verdictChip = (v: string): string => {
  if (/reject/i.test(v)) return "bg-danger/10 text-danger border-danger/20";
  if (/edit/i.test(v)) return "bg-warning/10 text-warning border-warning/20";
  return "bg-positive/10 text-positive border-positive/20";
};

export default function CouncilPanel(props: CouncilPanelProps) {
  const [result, setResult] = useState<CouncilResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedKey = useRef<string>("");

  useEffect(() => {
    if (!props.active || !props.recommendation) return;
    const key = `${props.demo ? "demo" : "live"}|${props.recommendation}`;
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
        demo: props.demo ?? false,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data.total === "number") setResult(data);
        else setError(data?.error || "Council unavailable.");
      })
      .catch(() => setError("Council request failed."))
      .finally(() => setLoading(false));
  }, [props.active, props.recommendation, props.demo]);

  if (!props.active) return null;

  const pct = (n: number) => (result && result.total ? Math.round((n / result.total) * 100) : 0);

  return (
    <div className="bg-surface border border-border-line rounded-2xl shadow-sm p-5 space-y-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-ink flex items-center gap-2">
          <Users className="w-4 h-4 text-accent" aria-hidden="true" />
          108-persona deliberation stress-test
        </h3>
        {result && (
          <span className="text-[10px] font-mono text-muted">
            judged by {result.provider} · {result.model}
          </span>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted py-6 justify-center" role="status" aria-live="polite">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          Convening 108 community personas…
        </div>
      )}

      {error && !loading && (
        <p className="text-sm text-muted py-4 text-center" role="alert">{error}</p>
      )}

      {result && !loading && (
        <>
          <div className="flex items-center gap-5 flex-wrap">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Council score</span>
              <span className="text-4xl font-display font-bold text-ink leading-none mt-1">
                {result.aggregateScore}
                <span className="text-base text-muted font-bold">/100</span>
              </span>
              <span className="text-xs text-muted mt-1">confidence: {result.confidence}</span>
            </div>

            <div className="flex-1 min-w-[220px] space-y-2">
              <VoteBar label="Approve" count={result.approve} pct={pct(result.approve)} color="bg-positive" />
              <VoteBar label="Approve with edits" count={result.approveWithEdits} pct={pct(result.approveWithEdits)} color="bg-warning" />
              <VoteBar label="Reject" count={result.reject} pct={pct(result.reject)} color="bg-danger" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-surface-2 border border-border-line">
              <span className="text-[10px] font-bold text-positive uppercase tracking-wider flex items-center gap-1.5">
                <Gavel className="w-3.5 h-3.5" aria-hidden="true" /> Consensus
              </span>
              <p className="text-sm text-ink mt-1.5 leading-relaxed">{result.consensus}</p>
            </div>
            <div className="p-3 rounded-xl bg-warning/10 border border-warning/20">
              <span className="text-[10px] font-bold text-warning uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" /> Council's top concern
              </span>
              <p className="text-sm text-ink mt-1.5 leading-relaxed">{result.topRisk}</p>
            </div>
          </div>

          {result.dissents.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Dissenting &amp; conditional voices</span>
              <div className="space-y-1.5">
                {result.dissents.map((d, i) => (
                  <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-surface-2 border border-border-line">
                    <span className={`text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 mt-0.5 ${verdictChip(d.verdict)}`}>
                      {d.verdict.replace(/_/g, " ")}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-ink leading-tight">{d.persona}</p>
                      <p className="text-xs text-muted leading-relaxed mt-0.5">{d.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {result && !loading && (
        <p className="text-xs text-muted leading-relaxed border-t border-border-line pt-3">
          Synthetic personas — a stress-test to surface dissent and show{" "}
          <strong className="text-ink">where to verify with real residents</strong>, not a
          substitute for community consent.
        </p>
      )}

      {props.channels.length > 0 && (
        <div className="pt-3 border-t border-border-line">
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5" aria-hidden="true" /> Reviewer notified via
          </span>
          <div className="flex flex-wrap gap-2 mt-2">
            {props.channels.map((c) => {
              const r = channelReality(c);
              return (
                <RealityPill
                  key={c.channel}
                  kind={r.kind}
                  label={r.label}
                  prefix={c.channel}
                  title={c.detail}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function VoteBar(props: { label: string; count: number; pct: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted w-32 shrink-0">{props.label}</span>
      <div
        role="meter"
        aria-valuenow={props.pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${props.label}: ${props.count} votes, ${props.pct}%`}
        className="flex-1 h-2.5 bg-surface-2 rounded-full overflow-hidden border border-border-line"
      >
        <div className={`h-full ${props.color} rounded-full`} style={{ width: `${props.pct}%` }} />
      </div>
      <span className="text-[10px] font-mono font-bold text-ink w-10 text-right">{props.count}</span>
    </div>
  );
}
