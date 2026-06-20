import { useEffect, useRef } from "react";
import { AlertTriangle, HelpCircle } from "lucide-react";

export interface ConfirmOptions {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" styles the confirm action as destructive and focuses Cancel first. */
  tone?: "default" | "danger";
}

interface ConfirmDialogProps {
  options: ConfirmOptions;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Accessible confirmation dialog (WAI-ARIA alertdialog). Replaces the native
 * window.confirm() so the studio keeps a single, token-true look in light + dark.
 * Focus is trapped, Escape and overlay click cancel, and focus returns to the
 * trigger on close. Destructive prompts focus Cancel first (safest default).
 */
export default function ConfirmDialog({ options, onConfirm, onCancel }: ConfirmDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const isDanger = (options.tone ?? "default") === "danger";

  useEffect(() => {
    const prevActive = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusables = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) ?? []
      ).filter((el) => !el.hasAttribute("disabled"));
    // Focus the safest action first: Cancel for destructive prompts, else Confirm.
    (isDanger ? cancelRef.current : confirmRef.current)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
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
  }, [isDanger, onCancel]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby={options.body ? "confirm-dialog-body" : undefined}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        ref={panelRef}
        className="relative w-full max-w-md overflow-hidden bg-surface-solid border border-border-line rounded-2xl shadow-2xl"
      >
        <div className="p-6">
          <div className="flex items-start gap-3">
            <div
              className={`shrink-0 grid place-items-center w-9 h-9 rounded-full ${
                isDanger ? "bg-danger/10 text-danger" : "bg-accent-soft text-accent"
              }`}
              aria-hidden="true"
            >
              {isDanger ? <AlertTriangle className="w-5 h-5" /> : <HelpCircle className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h2 id="confirm-dialog-title" className="text-base font-display font-semibold text-ink">
                {options.title}
              </h2>
              {options.body && (
                <p id="confirm-dialog-body" className="mt-1.5 text-sm text-muted leading-relaxed">
                  {options.body}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 bg-surface border-t border-border-line flex justify-end gap-2.5">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-border-line bg-surface-solid text-ink text-sm font-medium hover:bg-surface-2 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 outline-none"
          >
            {options.cancelLabel ?? "Cancel"}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 outline-none ${
              isDanger
                ? "border border-danger/40 bg-danger/10 text-danger hover:bg-danger/20 focus-visible:ring-danger"
                : "bg-accent text-on-accent hover:opacity-90 focus-visible:ring-accent"
            }`}
          >
            {options.confirmLabel ?? "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
