import {
  Inbox,
  Users2,
  FileText,
  Mail,
  Table,
  Mic,
  Compass,
  Database,
  LineChart,
  Scale,
  FileSignature,
  ShieldCheck,
  Library,
  ScrollText,
  ListChecks,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

/**
 * Landing pipeline diagram — the real CIVICTAS flow, not a card trio.
 * Inputs → Agent core → 108-persona council → Human gate → Outputs.
 *
 * Layout: a single source of stage data renders one connected pipeline.
 * Horizontal rail on lg+, stacked vertically below lg (no horizontal overflow
 * on phones). Token colors only; lucide is the one icon family; the only motion
 * is a CSS hover, so it is reduced-motion safe by construction.
 */

interface StageItem {
  icon: LucideIcon;
  label: string;
  /** Per-item color token class for the agent-core lane; omit for neutral. */
  color?: string;
}

interface Stage {
  no: string;
  kicker: string;
  title: string;
  icon: LucideIcon;
  /** Header chip color tokens (bg + text). */
  chip: string;
  count: string;
  items: StageItem[];
  /** Emphasize the human decision lane. */
  emphasis?: boolean;
}

const STAGES: Stage[] = [
  {
    no: "01",
    kicker: "Inputs",
    title: "Raw signal",
    icon: Inbox,
    chip: "bg-surface-2 text-muted",
    count: "5 sources",
    items: [
      { icon: Users2, label: "Meetings" },
      { icon: FileText, label: "Docs" },
      { icon: Mail, label: "Emails" },
      { icon: Table, label: "CSV" },
      { icon: Mic, label: "Voice" },
    ],
  },
  {
    no: "02",
    kicker: "Agent core",
    title: "Five agents",
    icon: Compass,
    chip: "bg-accent-soft text-accent",
    count: "5 agents",
    items: [
      { icon: Compass, label: "Framing", color: "text-agent-framing" },
      { icon: Database, label: "Evidence", color: "text-agent-evidence" },
      { icon: LineChart, label: "Simulation", color: "text-agent-simulation" },
      { icon: Scale, label: "Equity & risk", color: "text-agent-equity" },
      { icon: FileSignature, label: "Brief", color: "text-agent-transparency" },
    ],
  },
  {
    no: "03",
    kicker: "Council",
    title: "Stress-test",
    icon: Users2,
    chip: "bg-accent-soft text-accent",
    count: "108 personas",
    items: [
      { icon: Users2, label: "108-persona panel" },
      { icon: Scale, label: "Surfaces dissent" },
    ],
  },
  {
    no: "04",
    kicker: "Human gate",
    title: "A person decides",
    icon: ShieldCheck,
    chip: "bg-warning/15 text-warning",
    count: "3 paths",
    emphasis: true,
    items: [
      { icon: ShieldCheck, label: "Approve" },
      { icon: FileSignature, label: "Revise" },
      { icon: ScrollText, label: "Reject" },
    ],
  },
  {
    no: "05",
    kicker: "Outputs",
    title: "Accountable record",
    icon: ScrollText,
    chip: "bg-positive/10 text-positive",
    count: "4 artifacts",
    items: [
      { icon: ScrollText, label: "Decision record" },
      { icon: Library, label: "Source pack" },
      { icon: ShieldCheck, label: "Risk ledger" },
      { icon: ListChecks, label: "Follow-up tasks" },
    ],
  },
];

function StageCard({ stage }: { stage: Stage }) {
  const Header = stage.icon;
  return (
    <div
      className={`flex-1 min-w-0 rounded-2xl border bg-surface p-4 shadow-sm transition-colors ${
        stage.emphasis
          ? "border-warning/40 ring-1 ring-warning/15"
          : "border-border-line hover:border-accent/40"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span className={`grid place-items-center w-8 h-8 rounded-xl shrink-0 ${stage.chip}`}>
          <Header className="w-4 h-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <span className="flex items-center gap-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-faint">
            <span>{stage.no}</span>
            <span className="text-muted">{stage.kicker}</span>
          </span>
          <h3 className="font-display font-semibold text-sm text-ink leading-tight truncate">
            {stage.title}
          </h3>
        </div>
      </div>

      <ul className="mt-3 space-y-1.5">
        {stage.items.map((it) => {
          const ItemIcon = it.icon;
          return (
            <li key={it.label} className="flex items-center gap-2 text-xs text-ink-soft">
              <ItemIcon
                className={`w-3.5 h-3.5 shrink-0 ${it.color ?? "text-muted"}`}
                aria-hidden="true"
              />
              <span className="truncate">{it.label}</span>
            </li>
          );
        })}
      </ul>

      <span className="mt-3 inline-block text-[10px] font-mono text-faint border-t border-border-line pt-2 w-full">
        {stage.count}
      </span>
    </div>
  );
}

function Connector() {
  // Points right when the rail is horizontal (lg+), down when stacked.
  return (
    <div
      className="flex items-center justify-center shrink-0 text-faint py-0.5 lg:py-0 lg:px-0.5"
      aria-hidden="true"
    >
      <ArrowRight className="w-4 h-4 rotate-90 lg:rotate-0" />
    </div>
  );
}

export default function PipelineDiagram({ className = "" }: { className?: string }) {
  return (
    <figure className={`w-full text-left ${className}`}>
      <figcaption className="sr-only">
        CIVICTAS pipeline: inputs flow into five agents, then a 108-persona council
        stress-test, then a human decision gate, producing an accountable record.
      </figcaption>
      <div className="flex flex-col lg:flex-row lg:items-stretch gap-1">
        {STAGES.map((stage, i) => (
          <div
            key={stage.no}
            className="flex flex-col lg:flex-row lg:items-stretch lg:flex-1 lg:min-w-0"
          >
            <StageCard stage={stage} />
            {i < STAGES.length - 1 && <Connector />}
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-[11px] text-faint font-mono">
        Every stage is inspectable — the AI advises, a person makes the call.
      </p>
    </figure>
  );
}
