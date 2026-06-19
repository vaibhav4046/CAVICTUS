import { FileBox, Play } from "lucide-react";

interface EmptyStateProps {
  onRunSample: () => void;
}

export default function EmptyState({ onRunSample }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center mt-8 bg-surface-solid border border-border-line rounded-2xl shadow-sm">
      <div className="w-24 h-24 mb-6 relative">
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full text-accent opacity-20 dark:opacity-30 drop-shadow-md"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Abstract network / civic structure elements */}
          <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
          <path d="M50 15V85M15 50H85" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 4" />
          <circle cx="50" cy="25" r="4" fill="currentColor" />
          <circle cx="75" cy="50" r="6" fill="currentColor" />
          <circle cx="50" cy="75" r="5" fill="currentColor" />
          <circle cx="25" cy="50" r="3" fill="currentColor" />
          <circle cx="50" cy="50" r="8" fill="currentColor" />
          
          <path d="M50 25L75 50L50 75L25 50Z" stroke="currentColor" strokeWidth="1" strokeOpacity="0.5" />
        </svg>
      </div>
      
      <h2 className="text-xl font-bold font-display tracking-tight text-ink mb-2">
        See a full decision in one click
      </h2>

      <p className="max-w-md text-sm text-muted font-medium leading-relaxed mb-8">
        CIVICTAS runs five specialized AI agents — framing, evidence, simulation, equity audit, and a plain-language brief — then hands the decision to a human. Press the button to watch the seeded Riverside cooling-center decision unfold, or edit the setup panel above to run your own.
      </p>

      <button
        onClick={onRunSample}
        className="inline-flex items-center gap-2 bg-gradient-to-r from-accent to-accent-2 text-white hover:opacity-90 font-bold text-sm px-6 py-3 rounded-xl shadow-lg shadow-accent/20 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-solid"
      >
        <Play className="w-4 h-4 fill-current" />
        Run the sample decision
      </button>

      <div className="mt-12 flex items-center gap-6 opacity-60">
        <div className="flex items-center gap-2 text-xs text-muted font-semibold">
          <FileBox className="w-4 h-4" />
          <span>Supports Template Loading</span>
        </div>
      </div>
    </div>
  );
}
