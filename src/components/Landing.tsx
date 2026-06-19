import { ArrowRight, Users, Workflow, UserCheck, Search } from "lucide-react";
import BrandMark from "./BrandMark";

interface LandingProps {
  onEnter: () => void;
  engine: { provider: string; model: string; search: boolean } | null;
}

const FEATURES = [
  {
    icon: Workflow,
    title: "Five specialized agents",
    body: "Framing, grounded evidence, simulation, equity audit, and a plain-language brief — each visible as it thinks.",
  },
  {
    icon: Users,
    title: "108-persona council",
    body: "A community panel of 108 archetypes stress-tests every recommendation and surfaces the dissenting voices.",
  },
  {
    icon: UserCheck,
    title: "A human always decides",
    body: "Nothing finalizes without a person choosing, writing a rationale, and clearing three accountability checks.",
  },
];

export default function Landing({ onEnter, engine }: LandingProps) {
  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col">
      {/* slim top bar */}
      <header className="h-16 flex items-center justify-between px-6 md:px-10 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <BrandMark className="w-8 h-8 text-ink" />
          <span className="font-display font-semibold tracking-tight text-ink">CIVICTAS</span>
        </div>
        <button
          onClick={onEnter}
          className="text-xs font-semibold text-muted hover:text-ink transition-colors rounded-md px-2 py-1 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          Open the studio <span aria-hidden="true">→</span>
        </button>
      </header>

      {/* hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-3xl mx-auto w-full py-16">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold text-muted bg-surface border border-border-line rounded-full px-3 py-1 mb-8">
          <Search className="w-3 h-3" aria-hidden="true" />
          Community Decision Copilot
        </span>

        <h1 className="font-display font-semibold tracking-tight text-ink leading-[1.05] text-5xl md:text-6xl">
          AI advises.
          <br />
          <span className="text-accent">You decide.</span>
        </h1>

        <p className="mt-6 text-base md:text-lg text-muted leading-relaxed max-w-xl">
          CIVICTAS turns a hard community resource decision — where to place cooling centers,
          shelters, clinics — into a transparent, equity-first recommendation. The AI does the
          homework. A human makes the call.
        </p>

        <div className="mt-9 flex items-center gap-3 flex-wrap justify-center">
          <button
            onClick={onEnter}
            className="inline-flex items-center gap-2 bg-accent text-on-accent hover:opacity-90 font-semibold text-sm px-6 py-3 rounded-full transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            Open the studio
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
          {engine && (
            <span className="text-[11px] font-mono text-muted">
              running on {engine.provider} · {engine.model}
            </span>
          )}
        </div>

        {/* feature trio */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 w-full text-left">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-surface border border-border-line rounded-2xl p-5 shadow-sm hover:border-accent/40 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-accent-soft text-accent flex items-center justify-center mb-3">
                <f.icon className="w-4 h-4" aria-hidden="true" />
              </div>
              <h3 className="font-display font-semibold text-sm text-ink">{f.title}</h3>
              <p className="text-xs text-muted leading-relaxed mt-1.5">{f.body}</p>
            </div>
          ))}
        </div>

        {/* Positioning + scope (problem-understanding signal) */}
        <div className="mt-12 w-full max-w-2xl text-left bg-surface border border-border-line rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-muted leading-relaxed">
            <strong className="text-ink">Why it matters:</strong> in many cities only an estimated
            32–51% of cooling centers sit within walking distance of the most heat-vulnerable
            residents. CIVICTAS is a per-decision advising layer that sits between deliberation
            tools (Polis, Decidim) and policy simulators (PolicyEngine): it advises, audits equity,
            and forces an accountable human sign-off.
          </p>
          <p className="text-[11px] text-faint leading-relaxed mt-3">
            <strong className="text-ink">Scope:</strong> resource-siting and allocation decisions
            for public systems. <strong className="text-ink">Non-goals:</strong> it does not vote,
            replace public consultation, or make the political call — a human always does.
          </p>
        </div>
      </main>

      <footer className="py-6 text-center text-[11px] text-muted">
        Built for the USAII Global AI Hackathon 2026 · AI-assisted, human-decided.
      </footer>
    </div>
  );
}
