/**
 * RealityPill — one honest "how real is this?" label, reused everywhere a
 * surface could be live, mocked, simulated, or unconfigured. Keeping a single
 * component means the engine badge, council channels, and voice agent can never
 * drift into three different vocabularies for the same idea.
 *
 * Token colors only (no raw palette) so it stays depth-correct in both themes.
 */

export type RealityKind =
  | "live"
  | "mock"
  | "simulated"
  | "needs-credentials"
  | "error"
  | "unavailable";

interface KindStyle {
  label: string;
  cls: string; // background + text + border
  dot: string; // status dot fill
}

const STYLES: Record<RealityKind, KindStyle> = {
  live: {
    label: "Live",
    cls: "bg-positive/10 text-positive border-positive/25",
    dot: "bg-positive",
  },
  mock: {
    label: "Mock",
    cls: "bg-surface-2 text-muted border-border-strong",
    dot: "bg-faint",
  },
  simulated: {
    label: "Simulated",
    cls: "bg-surface-2 text-muted border-border-line",
    dot: "bg-faint",
  },
  "needs-credentials": {
    label: "Needs credentials",
    cls: "bg-warning/10 text-warning border-warning/25",
    dot: "bg-warning",
  },
  error: {
    label: "Error",
    cls: "bg-danger/10 text-danger border-danger/25",
    dot: "bg-danger",
  },
  unavailable: {
    label: "Unavailable",
    cls: "bg-surface-2 text-faint border-border-line",
    dot: "bg-faint",
  },
};

interface RealityPillProps {
  kind: RealityKind;
  /** Override the default word (e.g. show the channel verdict). */
  label?: string;
  /** Muted text rendered before the dot (e.g. a channel name). */
  prefix?: string;
  /** Native tooltip with the honest detail behind the label. */
  title?: string;
  /** Pulse the live dot (frozen automatically under prefers-reduced-motion). */
  pulse?: boolean;
  className?: string;
}

export default function RealityPill({
  kind,
  label,
  prefix,
  title,
  pulse = false,
  className = "",
}: RealityPillProps) {
  const s = STYLES[kind];
  const showPulse = pulse && kind === "live";
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold whitespace-nowrap px-2 py-0.5 rounded-full border ${s.cls} ${className}`}
    >
      {prefix && <span className="text-muted font-medium">{prefix}</span>}
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot} ${showPulse ? "animate-pulse" : ""}`}
        aria-hidden="true"
      />
      {label ?? s.label}
    </span>
  );
}
