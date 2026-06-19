import { useState } from "react";
import { ArrowRight, PenLine, Workflow, UserCheck } from "lucide-react";
import BrandMark from "./BrandMark";

const STEPS = [
  {
    icon: PenLine,
    title: "Describe the decision",
    body: "Tell CIVICTAS the situation, budget, site cap, and equity goal. A worked Riverside cooling-center example is pre-loaded so you can run it in one click.",
  },
  {
    icon: Workflow,
    title: "Watch the agents work",
    body: "Five specialized agents stream their thinking, then a 108-persona council votes — all grounded with real web search and shown with confidence levels and data gaps.",
  },
  {
    icon: UserCheck,
    title: "You make the final call",
    body: "Nothing is saved until you choose, write a rationale, and clear three accountability checks. Confirm by voice, or get pinged on Telegram / email to decide.",
  },
];

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const step = STEPS[i];
  const last = i === STEPS.length - 1;
  const Icon = step.icon;

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col">
      {/* Same slim brand bar as the home page — one ecosystem, not three apps. */}
      <header className="h-16 flex items-center justify-between px-6 md:px-10 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <BrandMark className="w-8 h-8 text-ink" />
          <span className="font-display font-semibold tracking-tight text-ink">CIVICTAS</span>
        </div>
        <button
          onClick={onDone}
          className="text-xs font-semibold text-muted hover:text-ink transition-colors rounded-md px-2 py-1 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          Skip intro <span aria-hidden="true">→</span>
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md bg-surface-solid border border-border-line rounded-2xl p-8 text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-accent-soft text-accent flex items-center justify-center mx-auto mb-6">
            <Icon className="w-6 h-6" aria-hidden="true" />
          </div>
          <span className="text-[11px] font-mono text-muted">
            Step {i + 1} of {STEPS.length}
          </span>
          <h2 className="font-display font-semibold text-xl text-ink mt-2">{step.title}</h2>
          <p className="text-sm text-muted leading-relaxed mt-3">{step.body}</p>

          <div className="flex items-center justify-center gap-1.5 mt-7">
            {STEPS.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all ${idx === i ? "w-6 bg-accent" : "w-1.5 bg-border-line"}`}
              />
            ))}
          </div>

          <div className="mt-7 space-y-2">
            <button
              onClick={() => (last ? onDone() : setI(i + 1))}
              className="w-full inline-flex items-center justify-center gap-2 bg-accent text-on-accent hover:opacity-90 font-semibold text-sm px-5 py-2.5 rounded-full transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              {last ? "Enter the studio" : "Next"}
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
            {i > 0 && (
              <button
                onClick={() => setI(i - 1)}
                className="text-xs font-semibold text-muted hover:text-ink transition-colors rounded-md px-2 py-1 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              >
                Back
              </button>
            )}
          </div>
        </div>

        <p className="mt-6 text-[11px] font-mono text-muted">AI advises. You decide.</p>
      </main>
    </div>
  );
}
