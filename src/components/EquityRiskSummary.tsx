import React from "react";
import { Scale, Users, UserX, ShieldAlert, ClipboardCheck } from "lucide-react";
import { parseMarkdownSections } from "../utils";

interface EquityRiskSummaryProps {
  /** Raw Agent 4 (Audit) markdown output. */
  step4Output: string;
}

type Section = ReturnType<typeof parseMarkdownSections>[number];

/** Render **bold** spans without dangerouslySetInnerHTML; everything else stays plain text. */
function renderBold(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    if (bold) {
      return (
        <strong key={i} className="font-semibold text-ink">
          {bold[1]}
        </strong>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

/** Bullet lines from a parsed section, marker stripped. */
function bulletsOf(section: Section | undefined): string[] {
  if (!section) return [];
  return section.content
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- ") || line.startsWith("* "))
    .map((line) => line.slice(2).trim())
    .filter(Boolean);
}

/** Collapse a section's body lines into one paragraph (for the AI/data risk prose). */
function paragraphOf(section: Section | undefined): string {
  if (!section) return "";
  return section.content
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ");
}

const MAX_BULLETS = 3;

function BulletColumn(props: { items: string[] }) {
  const shown = props.items.slice(0, MAX_BULLETS);
  const extra = props.items.length - shown.length;
  if (shown.length === 0) {
    return <p className="text-sm text-muted italic leading-relaxed">Not specified in the audit.</p>;
  }
  return (
    <ul className="space-y-1.5">
      {shown.map((item, i) => (
        <li key={i} className="text-sm text-ink leading-relaxed flex gap-1.5 min-w-0">
          <span className="text-muted shrink-0" aria-hidden="true">
            &bull;
          </span>
          <span className="min-w-0 break-words">{renderBold(item)}</span>
        </li>
      ))}
      {extra > 0 && (
        <li className="text-xs text-faint italic">+{extra} more in the Agent 4 audit</li>
      )}
    </ul>
  );
}

/**
 * Compact, scannable digest of the Agent 4 equity & responsibility audit. Pulls
 * the real audit sections (who benefits / who is missed / AI-data risk /
 * recommended human check) straight from the markdown — it computes NO score.
 * The only numeric verdict in the workspace is the council's overall score,
 * shown and labelled in CouncilPanel.
 */
export default function EquityRiskSummary({ step4Output }: EquityRiskSummaryProps) {
  if (!step4Output || !step4Output.trim()) return null;

  const sections = parseMarkdownSections(step4Output);

  const benefits = sections.find((s) => /benefit/i.test(s.title));
  const missed = sections.find((s) => /underserved|missed/i.test(s.title));
  const risk = sections.find(
    (s) => s !== missed && /risk/i.test(s.title) && /\bai\b|data/i.test(s.title)
  );

  const checkMatch = step4Output.match(/Recommended human check[^:]*:\s*([^\n]+)/i);
  const humanCheck = checkMatch ? checkMatch[1].trim() : "";

  // Nothing useful parsed — stay silent rather than render an empty shell.
  if (!benefits && !missed && !risk && !humanCheck) return null;

  return (
    <div className="bg-surface border border-border-line rounded-2xl shadow-sm p-5 space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-ink flex items-center gap-2 font-display">
          <Scale className="w-4 h-4 text-agent-equity shrink-0" aria-hidden="true" />
          Equity &amp; risk summary
        </h3>
        <p className="text-xs text-muted leading-relaxed">
          Pulled straight from the Agent 4 audit — qualitative, not scored. The only
          numeric verdict is the council&apos;s overall score below.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Who benefits */}
        <div className="p-3.5 rounded-xl bg-positive/10 border border-positive/20 min-w-0">
          <span className="text-xs font-bold text-positive uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <Users className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            Who benefits most
          </span>
          <BulletColumn items={bulletsOf(benefits)} />
        </div>

        {/* Who is missed */}
        <div className="p-3.5 rounded-xl bg-warning/10 border border-warning/20 min-w-0">
          <span className="text-xs font-bold text-warning uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <UserX className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            Who gets missed
          </span>
          <BulletColumn items={bulletsOf(missed)} />
        </div>
      </div>

      {/* Biggest AI / data risk */}
      {risk && paragraphOf(risk) && (
        <div className="p-3.5 rounded-xl bg-danger/10 border border-danger/20 min-w-0">
          <span className="text-xs font-bold text-danger uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            Biggest AI / data risk
          </span>
          <p className="text-sm text-ink leading-relaxed break-words">
            {renderBold(paragraphOf(risk))}
          </p>
        </div>
      )}

      {/* Required human check */}
      {humanCheck && (
        <div className="p-3.5 rounded-xl bg-accent-soft border border-accent/20 min-w-0">
          <span className="text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <ClipboardCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            Required human check before acting
          </span>
          <p className="text-sm text-ink leading-relaxed break-words">{renderBold(humanCheck)}</p>
        </div>
      )}
    </div>
  );
}
