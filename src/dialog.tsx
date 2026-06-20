import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { X, CheckCircle2, AlertTriangle, Info, AlertCircle } from "lucide-react";
import ConfirmDialog, { type ConfirmOptions } from "./components/ConfirmDialog";

type ToastTone = "info" | "success" | "warning" | "error";

interface ToastOptions {
  title?: string;
  message: string;
  tone?: ToastTone;
}

interface Toast extends ToastOptions {
  id: number;
}

interface DialogContextValue {
  /** Promise-based replacement for window.confirm(). Resolves true on confirm. */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  /** Token-styled, accessible replacement for alert() — a transient toast notice. */
  notify: (options: ToastOptions) => void;
}

const DialogContext = createContext<DialogContextValue | null>(null);

export function useDialog(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog must be used within a DialogProvider");
  return ctx;
}

export function useConfirm() {
  return useDialog().confirm;
}

export function useNotify() {
  return useDialog().notify;
}

const TOAST_TTL_MS = 5200;

const TONE_STYLES: Record<ToastTone, { ring: string; icon: typeof Info }> = {
  info: { ring: "text-accent", icon: Info },
  success: { ring: "text-positive", icon: CheckCircle2 },
  warning: { ring: "text-warning", icon: AlertTriangle },
  error: { ring: "text-danger", icon: AlertCircle },
};

export function DialogProvider({ children }: { children: ReactNode }) {
  const [confirmState, setConfirmState] = useState<{ options: ConfirmOptions } | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const confirm = useCallback((options: ConfirmOptions) => {
    // Resolve any in-flight prompt as cancelled before replacing it.
    resolverRef.current?.(false);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setConfirmState({ options });
    });
  }, []);

  const settle = useCallback((value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setConfirmState(null);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (options: ToastOptions) => {
      const id = (idRef.current += 1);
      setToasts((list) => [...list, { id, ...options }]);
      window.setTimeout(() => removeToast(id), TOAST_TTL_MS);
    },
    [removeToast]
  );

  const value = useMemo(() => ({ confirm, notify }), [confirm, notify]);

  return (
    <DialogContext.Provider value={value}>
      {children}
      {confirmState && (
        <ConfirmDialog
          options={confirmState.options}
          onConfirm={() => settle(true)}
          onCancel={() => settle(false)}
        />
      )}
      <ToastViewport toasts={toasts} onDismiss={removeToast} />
    </DialogContext.Provider>
  );
}

function ToastViewport({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div
      className="fixed bottom-4 right-4 z-[70] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
      aria-label="Notifications"
    >
      {toasts.map((t) => {
        const tone = t.tone ?? "info";
        const { ring, icon: Icon } = TONE_STYLES[tone];
        return (
          <div
            key={t.id}
            role={tone === "error" || tone === "warning" ? "alert" : "status"}
            className="flex items-start gap-3 rounded-xl border border-border-line bg-surface-solid p-3.5 shadow-lg"
          >
            <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${ring}`} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              {t.title && <p className="text-sm font-semibold text-ink">{t.title}</p>}
              <p className="text-sm text-muted leading-relaxed break-words">{t.message}</p>
            </div>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              className="shrink-0 rounded-md p-0.5 text-faint hover:text-ink transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 outline-none"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
