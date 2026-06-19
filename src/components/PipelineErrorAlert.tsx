import { AlertTriangle, RefreshCw, X } from "lucide-react";
import RealityPill from "./RealityPill";
import { PipelineFailure } from "../utils";

interface PipelineErrorAlertProps {
  failure: PipelineFailure;
  /** Retry only the step that failed (and any downstream steps). */
  onRetry: (step: number) => void;
  /** Dismiss the banner without retrying. */
  onDismiss: () => void;
  /** Disable retry while a run is in flight. */
  isPipelineRunning: boolean;
}

/**
 * Honest, visible failure surface for the advisory pipeline. Replaces the old
 * silent revert-to-form behaviour: when an agent step throws, this card names
 * the agent that failed and shows the real provider reason (rate limit, auth,
 * server error, or raw message). No invented latency or token numbers.
 *
 * Token colours only (--color-danger etc.); lucide icons; reduced-motion safe
 * (no animation beyond the static card).
 */
export default function PipelineErrorAlert({
  failure,
  onRetry,
  onDismiss,
  isPipelineRunning,
}: PipelineErrorAlertProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      id="pipeline-error-alert"
      className="bg-danger/5 border border-danger/30 rounded-2xl p-4 md:p-5 shadow-sm border-l-4 border-l-danger"
    >
      <div className="flex items-start gap-3">
        <span className="grid place-items-center w-9 h-9 rounded-xl bg-danger/10 text-danger shrink-0">
          <AlertTriangle className="w-5 h-5" aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-danger font-display">
              Advisory pipeline stopped at {failure.agentLabel}
            </h3>
            <RealityPill
              kind="error"
              label={
                failure.isRateLimit
                  ? "Rate / quota limit"
                  : failure.status
                  ? `Error ${failure.status}`
                  : "Failed"
              }
              title={failure.detail}
            />
          </div>

          <p className="text-sm text-ink leading-relaxed">{failure.message}</p>

          {/* Raw provider response, shown verbatim so the reason is never hidden. */}
          <p className="text-xs font-mono text-muted bg-surface-2 border border-border-line rounded-lg px-2.5 py-1.5 break-words">
            {failure.detail}
          </p>

          <div className="flex items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => onRetry(failure.step)}
              disabled={isPipelineRunning}
              className="inline-flex items-center gap-1.5 py-1.5 px-3 text-sm font-semibold rounded-lg border border-danger/30 text-danger hover:bg-danger/10 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              Retry {failure.agentLabel.split("—")[0].trim()}
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="inline-flex items-center gap-1.5 py-1.5 px-3 text-sm font-semibold rounded-lg border border-border-line text-muted hover:bg-surface-2 hover:text-ink transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
