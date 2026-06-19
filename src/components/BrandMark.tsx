interface BrandMarkProps {
  className?: string;
}

/**
 * CIVICTAS brand mark — a community ring (four people) around a compass needle.
 * Themeable: the figures + ring follow `currentColor` (set text-ink on the
 * wrapper, so it reads in both light and dark), the north needle uses the
 * civic-accent token so the logo and the UI accent are one identity.
 * Decorative by default (the "CIVICTAS" wordmark is the accessible name).
 */
export default function BrandMark({ className = "w-9 h-9" }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {/* connecting ring */}
      <circle cx="24" cy="24" r="14" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
      {/* compass needle — north = accent, south = ink */}
      <path d="M24 10.5 L29 24 L24 27 L19 24 Z" style={{ fill: "var(--color-raw-accent)" }} />
      <path d="M24 37.5 L19 24 L24 21 L29 24 Z" fill="currentColor" fillOpacity="0.45" />
      {/* four community figures at N / E / S / W */}
      <g fill="currentColor">
        <circle cx="24" cy="7" r="4" />
        <circle cx="41" cy="24" r="4" />
        <circle cx="24" cy="41" r="4" />
        <circle cx="7" cy="24" r="4" />
      </g>
    </svg>
  );
}
