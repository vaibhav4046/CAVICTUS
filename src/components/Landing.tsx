import { ArrowRight, Search } from "lucide-react";
import BrandMark from "./BrandMark";
import PipelineDiagram from "./PipelineDiagram";
import RealityPill from "./RealityPill";

interface LandingProps {
  onEnter: () => void;
  onTour: () => void;
  engine: { provider: string; model: string; search: boolean; label?: string; grounding?: "google" | "web" | "none" } | null;
}

export default function Landing({ onEnter, onTour, engine }: LandingProps) {
  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col">
      <a
        href="#landing-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-accent focus:text-on-accent focus:rounded-lg focus:text-sm focus:font-semibold"
      >
        Skip to main content
      </a>
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
      <main id="landing-main" className="flex-1 flex flex-col items-center px-6 max-w-5xl mx-auto w-full py-16">
        <div className="flex flex-col items-center text-center max-w-3xl">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold text-muted bg-surface border border-border-line rounded-full px-3 py-1 mb-8">
            <Search className="w-3 h-3" aria-hidden="true" />
            Community Decision Copilot
          </span>

          <h1 className="font-display font-semibold tracking-tight text-ink leading-[1.05] text-4xl md:text-6xl">
            AI advises. Humans decide.
            <br />
            <span className="text-accent">CIVICTAS records the proof.</span>
          </h1>

          <p className="mt-6 text-base md:text-lg text-muted leading-relaxed max-w-xl">
            Run a live five-agent civic review, surface evidence gaps and dissent, lock approval behind
            human accountability checks, and export a <strong className="text-ink">Public Decision
            Record</strong> a city, journalist, or resident can inspect.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5 text-xs font-semibold">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface border border-border-line px-3 py-1.5 text-ink">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" aria-hidden="true" /> 5 AI agents + 108-voice council
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface border border-border-line px-3 py-1.5 text-ink">
              <span className="w-1.5 h-1.5 rounded-full bg-positive" aria-hidden="true" /> live review in under a minute
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface border border-border-line px-3 py-1.5 text-ink">
              <span className="w-1.5 h-1.5 rounded-full bg-warning" aria-hidden="true" /> approval locked until rationale + 3 checks
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface border border-border-line px-3 py-1.5 text-ink">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-2" aria-hidden="true" /> exports a Public Decision Record
            </span>
          </div>

          <div className="mt-9 flex items-center gap-3 flex-wrap justify-center">
            <button
              onClick={onEnter}
              className="inline-flex items-center gap-2 bg-accent text-on-accent hover:opacity-90 font-semibold text-sm px-6 py-3 rounded-full transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              Open the studio
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              onClick={onTour}
              className="text-xs font-semibold text-muted hover:text-ink transition-colors rounded-md px-2 py-1.5 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              Take the 30-second tour
            </button>
            {engine && (
              <span className="inline-flex items-center gap-2 text-[11px] font-mono text-muted">
                <span>
                  {engine.label ?? `${engine.provider} · ${engine.model}`}
                </span>
                <RealityPill
                  kind={engine.provider === "mock" ? "mock" : "ready"}
                  title={
                    engine.provider === "mock"
                      ? "Offline demo mock — no API key configured"
                      : "A live model is configured. Runs stream live, or fall back to a clearly labeled demo if the provider is unavailable."
                  }
                />
              </span>
            )}
          </div>
        </div>

        {/* The real pipeline — inputs → agents → council → human gate → outputs */}
        <PipelineDiagram className="mt-16" />

        {/* Positioning + scope (problem-understanding signal) */}
        <div className="mt-12 w-full max-w-2xl text-left bg-surface border border-border-line rounded-2xl p-5 shadow-sm">
          <p className="text-xs text-muted leading-relaxed">
            <strong className="text-ink">Why it matters:</strong> published heat-equity research
            estimates only ~32–51% of cooling centers sit within walking distance of the most
            heat-vulnerable residents <span className="text-faint">(est., CDC Heat &amp; Health Tracker / EPA)</span> —
            the "optimize for the most people" default quietly routes help away from those who need it
            most. CIVICTAS is a per-decision advising layer that sits between deliberation tools
            (Polis, Decidim) and policy simulators (PolicyEngine): it advises, audits equity, and
            forces an accountable human sign-off.
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
