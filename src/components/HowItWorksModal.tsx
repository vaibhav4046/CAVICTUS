import { X, Sparkles, UserCheck, Search, ShieldAlert } from "lucide-react";

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HowItWorksModal(props: HowItWorksModalProps) {
  if (!props.isOpen) return null;

  return (
    <div
      id="how-it-works-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="relative w-full max-w-2xl overflow-hidden bg-surface-solid border border-border-line rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
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
            onClick={props.onClose}
            className="p-1 px-1.5 rounded-lg border border-border-line bg-surface-solid hover:bg-surface text-muted hover:text-ink transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <p className="text-sm text-muted leading-relaxed">
            CIVICTAS is a Decision Intelligence platform engineered for civic and public organizations.
            It splits complex decision-making into five specialized, sequential AI evaluations, culminating in a
            <strong className="text-ink"> mandatory human review</strong> step.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/50">
              <span className="text-xs font-semibold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full font-mono">
                AGENT 1
              </span>
              <h3 className="font-semibold text-ink mt-2">Policy Framing</h3>
              <p className="text-xs text-muted mt-1">
                Formats unstructured descriptions into precise options, analyzes direct stakeholders, and details key real-world constraints.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-teal-100 bg-teal-50/50">
              <span className="text-xs font-semibold px-2 py-0.5 bg-teal-100 text-teal-800 rounded-full font-mono">
                AGENT 2
              </span>
              <h3 className="font-semibold text-ink mt-2">Search Grounding</h3>
              <p className="text-xs text-muted mt-1">
                Launches real-time Google Search queries to research current regional demographics, find public safety/health benchmarks, and identify statistics.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/50">
              <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full font-mono">
                AGENT 3
              </span>
              <h3 className="font-semibold text-ink mt-2">Multi-Metric Simulation</h3>
              <p className="text-xs text-muted mt-1">
                Projects potential policy decisions over three timelines (Now, 1 Year, 5 Years) across three metrics, explaining core model assumptions transparently.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/45">
              <span className="text-xs font-semibold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-mono">
                AGENT 4
              </span>
              <h3 className="font-semibold mt-2 flex items-center gap-1.5 text-amber-900">
                <ShieldAlert className="w-4 h-4 text-amber-600" /> Equity & Risk Audit
              </h3>
              <p className="text-xs text-muted mt-1">
                Directly exposes demographic blind spots, highlights data underrepresentation risks, and demands specific on-the-ground human verification.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/50">
            <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-mono">
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
            onClick={props.onClose}
            className="px-4 py-2 bg-accent hover:opacity-90 text-white font-medium text-sm rounded-lg shadow-sm transition-all focus:ring-2 focus:ring-accent/20 outline-none"
          >
            I Understand the Protocol
          </button>
        </div>
      </div>
    </div>
  );
}
