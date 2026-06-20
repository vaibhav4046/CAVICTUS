import { useState } from "react";
import { ArrowRight, PenLine, Workflow, UserCheck, SlidersHorizontal } from "lucide-react";
import BrandMark from "./BrandMark";
import Select, { SelectOption } from "./Select";

const STEPS = [
  {
    icon: PenLine,
    title: "Describe the decision",
    body: "Tell CIVICTAS the situation, budget, site cap, and equity goal. A worked Riverside cooling-center example is pre-loaded so you can run it in one click.",
  },
  {
    icon: Workflow,
    title: "Watch the agents work",
    body: "Five specialized agents stream their thinking, then a 108-persona council stress-tests the result — grounded with live web search where the provider supports it (otherwise clearly-labeled public benchmarks), and always shown with confidence levels and data gaps.",
  },
  {
    icon: UserCheck,
    title: "You make the final call",
    body: "Nothing is saved until you choose, write a rationale, and clear three accountability checks. Confirm by voice, or get pinged on Telegram / email to decide.",
  },
];

const ROLE_OPTIONS: SelectOption[] = [
  { value: "City official / public-sector analyst", label: "City official / public-sector analyst" },
  { value: "Community advocate / nonprofit", label: "Community advocate / nonprofit" },
  { value: "Researcher / student", label: "Researcher / student" },
  { value: "Other public-interest decision-maker", label: "Other public-interest decision-maker" },
];

const PRIORITY_OPTIONS: SelectOption[] = [
  { value: "Equity first — protect the most-vulnerable, even at higher cost", label: "Equity first (protect most-vulnerable)" },
  { value: "Cost-efficiency — maximize value per dollar", label: "Cost-efficiency" },
  { value: "Speed — fastest route to delivery", label: "Speed of delivery" },
  { value: "Balanced across equity, cost, and speed", label: "Balanced" },
];

const PREFS_KEY = "civictas_prefs";

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const [role, setRole] = useState(ROLE_OPTIONS[0].value);
  const [priority, setPriority] = useState(PRIORITY_OPTIONS[0].value);

  const total = STEPS.length + 1; // +1 personalization step
  const isPrefs = i === STEPS.length;
  const step = isPrefs ? null : STEPS[i];
  const Icon = isPrefs ? SlidersHorizontal : step!.icon;

  const finish = () => {
    try {
      localStorage.setItem(PREFS_KEY, `Role: ${role}. Primary priority: ${priority}.`);
    } catch {
      /* preferences are best-effort; never block entry */
    }
    onDone();
  };

  const next = () => (isPrefs ? finish() : setI(i + 1));

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
          <span className="text-[11px] font-mono text-muted" role="status" aria-live="polite" aria-atomic="true">
            Step {i + 1} of {total}
          </span>

          {isPrefs ? (
            <>
              <h2 className="font-display font-semibold text-xl text-ink mt-2">Tailor it to you</h2>
              <p className="text-sm text-muted leading-relaxed mt-3">
                CIVICTAS weights every recommendation to your role and priorities. You can change
                this any time — it never overrides the equity audit or honesty.
              </p>
              <div className="mt-6 space-y-4 text-left">
                <div className="space-y-1.5">
                  <label id="pref-role-label" className="block text-xs font-bold text-muted uppercase tracking-wide">
                    Your role
                  </label>
                  <Select ariaLabelledby="pref-role-label" value={role} options={ROLE_OPTIONS} onChange={setRole} />
                </div>
                <div className="space-y-1.5">
                  <label id="pref-priority-label" className="block text-xs font-bold text-muted uppercase tracking-wide">
                    What you optimize for
                  </label>
                  <Select ariaLabelledby="pref-priority-label" value={priority} options={PRIORITY_OPTIONS} onChange={setPriority} />
                </div>
              </div>
            </>
          ) : (
            <>
              <h2 className="font-display font-semibold text-xl text-ink mt-2">{step!.title}</h2>
              <p className="text-sm text-muted leading-relaxed mt-3">{step!.body}</p>
            </>
          )}

          <div className="flex items-center justify-center gap-1.5 mt-7" aria-hidden="true">
            {Array.from({ length: total }).map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all ${idx === i ? "w-6 bg-accent" : "w-1.5 bg-border-line"}`}
              />
            ))}
          </div>

          <div className="mt-7 space-y-2">
            <button
              onClick={next}
              className="w-full inline-flex items-center justify-center gap-2 bg-accent text-on-accent hover:opacity-90 font-semibold text-sm px-5 py-2.5 rounded-full transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              {isPrefs ? "Enter the studio" : "Next"}
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
