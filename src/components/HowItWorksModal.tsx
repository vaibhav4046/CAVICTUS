import { useEffect, useRef } from "react";
import { X, Sparkles, UserCheck, Search, ShieldAlert } from "lucide-react";

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HowItWorksModal({ isOpen, onClose }: HowItWorksModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus management for the modal dialog (WCAG 2.1.2 / 2.4.3): focus in on open,
  // trap Tab, close on Escape, return focus to the trigger on close.
  useEffect(() => {
    if (!isOpen) return;
    const prevActive = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusables = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) ?? []
      ).filter((el) => !el.hasAttribute("disabled"));
    focusables()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const f = focusables();
      if (f.length === 0) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prevActive?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      id="how-it-works-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="relative w-full max-w-2xl overflow-hidden bg-surface-solid border border-border-line rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border-line bg-surface">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent animate-pulse" />
            <h2 id="modal-title" className="text-xl font-display font-semibold text-ink">
              How CIVICTAS Works
            </h2>
          </div>
          <button
            id="close-modal-btn"
            onClick={onClose}
            className="min-h-9 min-w-9 grid place-items-center rounded-lg border border-border-line bg-surface-solid hover:bg-surface text-muted hover:text-ink transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 outline-none"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <p className="text-sm text-muted leading-relaxed">
            CIVICTAS helps public teams make hard resource decisions. It breaks the decision into five
            specialized AI agents that work in sequence, then hands the result to a
            <strong className="text-ink"> mandatory human review</strong> — the AI advises, a person decides.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-agent-framing/30 bg-agent-framing/10">
              <span className="text-xs font-semibold px-2 py-0.5 bg-agent-framing/15 text-agent-framing rounded-full font-mono">
                AGENT 1
              </span>
              <h3 className="font-semibold text-ink mt-2">Policy Framing</h3>
              <p className="text-xs text-muted mt-1">
                Formats unstructured descriptions into precise options, analyzes direct stakeholders, and details key real-world constraints.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-agent-evidence/30 bg-agent-evidence/10">
              <span className="text-xs font-semibold px-2 py-0.5 bg-agent-evidence/15 text-agent-evidence rounded-full font-mono">
                AGENT 2
              </span>
              <h3 className="font-semibold text-ink mt-2">Evidence &amp; grounding</h3>
              <p className="text-xs text-muted mt-1">
                Researches regional demographics and public safety/health benchmarks — with live web search grounding where the provider supports it (Gemini adds native Google Search), otherwise clearly-labeled public benchmarks. Every finding carries a confidence level and named data gaps.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-agent-simulation/30 bg-agent-simulation/10">
              <span className="text-xs font-semibold px-2 py-0.5 bg-agent-simulation/15 text-agent-simulation rounded-full font-mono">
                AGENT 3
              </span>
              <h3 className="font-semibold text-ink mt-2">Multi-Metric Simulation</h3>
              <p className="text-xs text-muted mt-1">
                Projects potential policy decisions over three timelines (Now, 1 Year, 5 Years) across three metrics, explaining core model assumptions transparently.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-agent-equity/30 bg-agent-equity/10">
              <span className="text-xs font-semibold px-2 py-0.5 bg-agent-equity/15 text-agent-equity rounded-full font-mono">
                AGENT 4
              </span>
              <h3 className="font-semibold mt-2 flex items-center gap-1.5 text-ink">
                <ShieldAlert className="w-4 h-4 text-agent-equity" /> Equity & Risk Audit
              </h3>
              <p className="text-xs text-muted mt-1">
                Directly exposes demographic blind spots, highlights data underrepresentation risks, and demands specific on-the-ground human verification.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-agent-transparency/30 bg-agent-transparency/10">
            <span className="text-xs font-semibold px-2 py-0.5 bg-agent-transparency/15 text-agent-transparency rounded-full font-mono">
              AGENT 5 & 6
            </span>
            <h3 className="font-semibold text-ink mt-2">Briefing & Human-in-the-Loop Override</h3>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              Agent 5 organizes a plain-language proposal brief. Finally, step 6 locks all outputs until a <strong className="text-ink font-semibold">human official reviews, edits, and justifies</strong> the final policy decision to commit it to the Decision Memory.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border-line bg-surface flex gap-3">
            <UserCheck className="w-6 h-6 text-accent shrink-0 mt-0.5" />
            <div className="text-xs text-muted leading-relaxed">
               <span className="font-semibold text-ink block mb-1">AI-Assisted · Human-Decided</span>
               CIVICTAS operates under the strict philosophy that AI should only advise and model uncertainty, leaving political compromise, budget limits, ethical choices, and accountability exclusively to humans.
             </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-surface border-t border-border-line flex justify-end">
          <button
            id="modal-understand-btn"
            onClick={onClose}
            className="px-4 py-2 bg-accent hover:opacity-90 text-on-accent font-medium text-sm rounded-lg shadow-sm transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 outline-none"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
