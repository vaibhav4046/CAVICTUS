import React, { useState } from "react";
import { Check, ShieldAlert, ChevronDown, ChevronUp, Info, BookMarked, ExternalLink } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { AgentState, PipelineOutputs } from "../types";
import { parseMarkdownSections, extractMemoryNote, getConfidencePill } from "../utils";
import EquityRiskSummary from "./EquityRiskSummary";

interface PipelinePanelProps {
  outputs: PipelineOutputs;
  agentStates: {
    1: AgentState;
    2: AgentState;
    3: AgentState;
    4: AgentState;
    5: AgentState;
  };
  onRetryAgent: (stepNum: number) => void;
  groundingSources: Array<{ title: string; url: string }>;
}

export default function PipelinePanel(props: PipelinePanelProps) {
  const shouldReduceMotion = useReducedMotion();
  // Completed cards start collapsed by default (calm pipeline column).
  // Running / queued cards are never collapsed.
  const [collapsedCards, setCollapsedCards] = useState<Record<number, boolean>>({});

  const toggleCollapse = (num: number) => {
    setCollapsedCards(prev => ({ ...prev, [num]: !prev[num] }));
  };

  // Config definitions for the 5 agents
  const agentsConfig = [
    {
      num: 1,
      title: "Agent 1 — Framing",
      tagline: "What are we actually deciding?",
      accentBg: "bg-agent-framing/10",
      accentBorder: "border-agent-framing/40",
      textColor: "text-agent-framing",
    },
    {
      num: 2,
      title: "Agent 2 — Evidence Base",
      tagline: "Grounding datasets & data gaps",
      accentBg: "bg-agent-evidence/10",
      accentBorder: "border-agent-evidence/40",
      textColor: "text-agent-evidence",
    },
    {
      num: 3,
      title: "Agent 3 — Simulation",
      tagline: "What happens with each option?",
      accentBg: "bg-agent-simulation/10",
      accentBorder: "border-agent-simulation/40",
      textColor: "text-agent-simulation",
    },
    {
      num: 4,
      title: "Agent 4 — Audit",
      tagline: "Equity test & policy risks",
      accentBg: "bg-agent-equity/10",
      accentBorder: "border-agent-equity/40",
      textColor: "text-agent-equity",
    },
    {
      num: 5,
      title: "Agent 5 — Plan Brief",
      tagline: "Synthesized candidate proposal plan",
      accentBg: "bg-agent-transparency/10",
      accentBorder: "border-agent-transparency/40",
      textColor: "text-agent-transparency",
    }
  ];

  /**
   * Only http/https/mailto links are allowed to render as anchors. Model output
   * (including grounded search URLs) is never trusted — javascript:/data: and
   * any other scheme falls back to plain text. Prevents stored XSS.
   */
  const safeUrl = (raw: string): string | null => {
    try {
      const u = new URL(raw, window.location.origin);
      if (u.protocol === "http:" || u.protocol === "https:" || u.protocol === "mailto:") {
        return u.href;
      }
    } catch {
      /* malformed URL — treat as plain text */
    }
    return null;
  };

  /**
   * Safe inline renderer for **bold** and [label](url). Builds real React nodes
   * via tokenization — NO dangerouslySetInnerHTML, so model output cannot inject
   * markup or scripts into the DOM.
   *
   * When `citationMap` is supplied (Evidence step), any [label](url) whose URL
   * matches a grounding source renders the label followed by a numbered [n]
   * superscript link instead of a bare arrow — tying inline references to the
   * numbered Sources list.
   */
  const renderFormattedLine = (
    line: string,
    citationMap?: Map<string, number>
  ): React.ReactNode => {
    if (!line) return null;

    const pattern = /(\*\*([^*]+)\*\*)|(\[([^\]]+)\]\(([^)]+)\))/g;
    const nodes: React.ReactNode[] = [];
    let lastIndex = 0;
    let key = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(line)) !== null) {
      if (match.index > lastIndex) {
        nodes.push(line.slice(lastIndex, match.index));
      }
      if (match[1]) {
        // **bold**
        nodes.push(
          <strong key={key++} className="font-bold text-ink">
            {match[2]}
          </strong>
        );
      } else if (match[3]) {
        // [label](url)
        const url = safeUrl(match[5]);
        if (url) {
          const citeNum = citationMap?.get(url);
          if (citeNum) {
            // Inline citation: keep the label as text, append a [n] superscript
            // link that points at the same vetted source.
            nodes.push(
              <React.Fragment key={key++}>
                {match[4]}
                <sup>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline font-bold text-[0.7em] ml-0.5"
                    aria-label={`Source ${citeNum}`}
                  >
                    [{citeNum}]
                  </a>
                </sup>
              </React.Fragment>
            );
          } else {
            nodes.push(
              <a
                key={key++}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline inline-flex items-center gap-0.5 font-semibold"
              >
                {match[4]}
                <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
              </a>
            );
          }
        } else {
          nodes.push(match[4]);
        }
      }
      lastIndex = pattern.lastIndex;
    }

    if (lastIndex < line.length) {
      nodes.push(line.slice(lastIndex));
    }

    return nodes;
  };

  /**
   * Smart renderer that renders blocks of markdown styled with Tailwind
   */
  const renderMarkdownText = (
    rawText: string,
    searchSources: Array<{ title: string; url: string }>,
    agentNum?: number
  ) => {
    // Strip metadata tags from display. The JSON payload contains "]" (the
    // sources array), so the matcher must span to the tag's final "]" — a
    // bare [^\]]+ stops early and leaves a stray "}]" in the rendered text.
    let textToParse = rawText;
    textToParse = textToParse.replace(/\[METADATA_JSON:\s*\{[\s\S]*\}\s*\]/, "").trim();

    const sections = parseMarkdownSections(textToParse);

    // Citations only apply to the Evidence step (Agent 2), which is the agent
    // that grounds its findings in external sources.
    const enableCitations = agentNum === 2;

    // Numbered, vetted source registry built from the grounding array. Each URL
    // passes the same safe-URL gate used for inline links; only http/https
    // survive, so a malformed or javascript: URL never becomes an anchor.
    const numberedSources: Array<{ n: number; title: string; url: string }> = [];
    const citationMap = new Map<string, number>();
    if (enableCitations) {
      for (const src of searchSources) {
        const safe = safeUrl(src.url);
        if (!safe || citationMap.has(safe)) continue;
        const n = numberedSources.length + 1;
        numberedSources.push({ n, title: src.title || safe, url: safe });
        citationMap.set(safe, n);
      }
    }

    // A model "# Sources" section is replaced by our numbered card, so suppress
    // the raw one to avoid a duplicate, unnumbered URL list.
    const isSourcesHeading = (title: string) => /^\s*sources\s*$/i.test(title);
    const hasSourcesSection = enableCitations && sections.some((s) => isSourcesHeading(s.title));

    if (sections.length === 0) {
      return <p className="text-sm text-muted italic">Synthesizing detailed advisory outputs...</p>;
    }

    const sourcesCard = enableCitations ? (
      numberedSources.length > 0 ? (
        <div className="mt-4 p-4 bg-surface-2 border border-border-line rounded-xl" id="evidence-sources">
          <h4 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5 font-display mb-2.5">
            <BookMarked className="w-4 h-4 text-accent shrink-0" aria-hidden="true" />
            Sources
          </h4>
          <ol className="space-y-1.5">
            {numberedSources.map((s) => (
              <li key={s.n} className="flex items-start gap-2 text-sm leading-relaxed min-w-0">
                <span className="font-mono text-xs font-bold text-accent shrink-0 mt-0.5">[{s.n}]</span>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline inline-flex items-start gap-1 min-w-0"
                >
                  <span className="min-w-0 break-words">{s.title}</span>
                  <ExternalLink className="w-3 h-3 shrink-0 mt-0.5" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        // Always honest on the Evidence step: if grounding returned no citations,
        // say so explicitly rather than implying the run was web-backed.
        <p className="mt-4 text-sm text-muted italic leading-relaxed flex items-center gap-1.5">
          <BookMarked className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          No external citations returned for this run — reasoning over labeled public benchmarks.
        </p>
      )
    ) : null;

    return (
      <div className="space-y-4">
        {sections.map((section, idx) => {
          if (enableCitations && isSourcesHeading(section.title)) return null;
          const isWhatWeDontKnowBox = section.isBoxed;
          const isRiskBox = section.isWarning;

          // Render Table if content contains pipe symbols
          const isTable = section.content.some(line => line.includes("|") && line.trim().startsWith("|"));

          let contentNode: React.ReactNode = null;

          if (isTable) {
            // Parse table lines
            const tableLines = section.content.filter(l => l.includes("|"));
            if (tableLines.length >= 2) {
              const headers = tableLines[0].split("|").map(s => s.trim()).filter(Boolean);
              const isSeparator = (line: string) => line.includes("---") || line.includes("-:-");

              const dataRows = tableLines.slice(1).filter(l => !isSeparator(l)).map(row => {
                return row.split("|").map(s => s.trim()).filter(Boolean);
              });

              contentNode = (
                <div className="overflow-x-auto my-3 border border-border-line rounded-xl">
                  {/* R1: bg-surface-solid replaces bg-surface-solid + dark:bg-[#121620] */}
                  <table className="w-full text-sm font-mono text-left border-collapse bg-surface-solid">
                    <thead>
                      {/* R1: bg-surface-2 replaces bg-surface/50 */}
                      <tr className="bg-surface-2 border-b border-border-line">
                        {headers.map((h, i) => (
                          <th key={i} className="px-3.5 py-2.5 font-bold text-ink uppercase tracking-wider text-xs">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-line">
                      {dataRows.map((cols, i) => (
                        // R1: hover:bg-surface-2 replaces hover:bg-surface/30
                        <tr key={i} className="hover:bg-surface-2 transition-all">
                          {cols.map((col, cIdx) => (
                            // R1: text-ink replaces text-ink/90
                            <td key={cIdx} className="px-3.5 py-2 text-ink whitespace-nowrap">
                              {col}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            }
          }

          if (!contentNode) {
            // Standard lists & paragraphs
            let currentList: string[] = [];
            const renderedLines: React.ReactNode[] = [];

            const flushList = (key: number) => {
              if (currentList.length > 0) {
                renderedLines.push(
                  // R1: text-ink replaces text-ink/90; R2: text-sm (was text-xs)
                  <ul key={`list-${key}`} className="list-disc pl-5 my-2.5 space-y-1.5 text-ink text-sm">
                    {currentList.map((item, itemIdx) => (
                      <li key={itemIdx} className="leading-relaxed">
                        {renderFormattedLine(item, citationMap)}
                      </li>
                    ))}
                  </ul>
                );
                currentList = [];
              }
            };

            section.content.forEach((line, lineIdx) => {
              const trimmed = line.trim();
              if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                currentList.push(trimmed.slice(2));
              } else if (trimmed.match(/^\d+\.\s+/)) {
                flushList(lineIdx);
                renderedLines.push(
                  // R2: text-sm (was text-xs); R1: text-ink (was text-ink/90)
                  <p key={lineIdx} className="text-sm text-ink my-1.5 pl-1 leading-relaxed">
                    {renderFormattedLine(trimmed, citationMap)}
                  </p>
                );
              } else if (trimmed === "") {
                flushList(lineIdx);
              } else {
                flushList(lineIdx);
                renderedLines.push(
                  // R2: text-sm (was text-xs); R1: text-ink (was text-ink/90)
                  <p key={lineIdx} className="text-sm text-ink leading-relaxed my-2">
                    {renderFormattedLine(trimmed, citationMap)}
                  </p>
                );
              }
            });

            flushList(section.content.length);
            contentNode = <div className="space-y-1">{renderedLines}</div>;
          }

          // Return styled layouts based on structural headers
          if (isWhatWeDontKnowBox) {
            return (
              <div
                key={idx}
                className="my-4 p-4 bg-surface border border-border-line rounded-xl space-y-2 border-l-4 border-l-muted shadow-sm"
              >
                <h4 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5 font-display">
                  <ShieldAlert className="w-4 h-4 text-muted" aria-hidden="true" />
                  {section.title}
                </h4>
                {contentNode}
              </div>
            );
          }

          if (isRiskBox) {
            return (
              <div
                key={idx}
                // R1: bg-warning/10 + border-warning/20 replace raw amber fractional classes
                className="my-4 p-4 bg-warning/10 border border-warning/20 rounded-xl space-y-2 border-l-4 border-l-warning shadow-sm"
              >
                <h4 className="text-xs font-bold text-warning uppercase tracking-wider flex items-center gap-1.5 font-display">
                  <ShieldAlert className="w-4 h-4 text-warning" aria-hidden="true" />
                  {section.title}
                </h4>
                {contentNode}
              </div>
            );
          }

          return (
            <div key={idx} className="space-y-1.5">
              {section.title && (
                <h4 className={`text-xs font-bold uppercase tracking-wider mt-5 first:mt-1 font-display ${
                  // R2: text-xs allowed here (section sub-heading label); text-muted is solid token
                  section.level === 3 ? "text-muted text-xs" : "text-ink border-b border-dashed border-border-line pb-1"
                }`}>
                  {section.title}
                </h4>
              )}
              {contentNode}
            </div>
          );
        })}
        {sourcesCard}
      </div>
    );
  };

  return (
    <section id="pipeline-panel" className="space-y-6">
      {/* aria-live region announces ONE concise current status (not the full
          history) so screen readers aren't re-read the whole pipeline each change. */}
      <div aria-live="polite" className="sr-only" id="agent-status-announcer">
        {(() => {
          const entries = Object.entries(props.agentStates);
          const label = (n: number) => agentsConfig.find((a) => a.num === n)?.title ?? `Agent ${n}`;
          const running = entries.find(([, s]) => s.status === "running");
          if (running) return `${label(Number(running[0]))} is running.`;
          const errored = entries.find(([, s]) => s.status === "error");
          if (errored) return `${label(Number(errored[0]))} encountered an error.`;
          const doneCount = entries.filter(([, s]) => s.status === "done").length;
          if (doneCount === entries.length && doneCount > 0) return "All agents completed.";
          return "";
        })()}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-muted uppercase tracking-widest px-1">
          2. Sequential Multi-Agent Advisory Panel
        </h3>
      </div>

      {/* Single calm vertical stream of agent cards (NotebookLM-style). */}
      <div className="grid grid-cols-1 gap-4">
        {agentsConfig.map((agent) => {
          const state = props.agentStates[agent.num as 1 | 2 | 3 | 4 | 5];
          const isQueued = state.status === "queued";
          const isRunning = state.status === "running";
          const isDone = state.status === "done";
          const isError = state.status === "error";

          // Completed cards are collapsed by default; user can expand.
          // Running and queued cards are always open.
          const isBodyCollapsed = isDone
            ? (collapsedCards[agent.num] !== false) // default true for done
            : (isError ? (collapsedCards[agent.num] !== false) : false);

          // Format streaming text
          const cleanedOutput = state.output;
          const memoryDetails = agent.num === 1 ? extractMemoryNote(state.output) : null;
          const confidence = agent.num === 5 ? getConfidencePill(state.output) : null;

          // M8: gate spring/duration transitions behind shouldReduceMotion
          const motionVariants = {
            queued: { opacity: 0.6, y: shouldReduceMotion ? 0 : 20 },
            running: {
              opacity: 1,
              y: 0,
              transition: shouldReduceMotion
                ? { duration: 0 }
                : { duration: 0.3 },
            },
            done: {
              opacity: 1,
              y: 0,
              transition: shouldReduceMotion
                ? { duration: 0 }
                : { type: "spring" as const, stiffness: 300, damping: 30 },
            },
            error: { opacity: 1, y: 0, transition: { duration: shouldReduceMotion ? 0 : 0.2 } },
          };

          // One-line summary shown when done card is collapsed
          const collapsedSummary = isDone && cleanedOutput
            ? cleanedOutput.replace(/\[METADATA_JSON:[^\]]+\]/, "").replace(/#+\s*/g, "").trim().slice(0, 90) + "…"
            : null;

          const bodyId = `agent-body-${agent.num}`;

          return (
            <motion.div
              initial="queued"
              animate={state.status}
              variants={motionVariants}
              key={agent.num}
              id={`agent-card-${agent.num}`}
              className={`bg-surface border rounded-2xl overflow-hidden shadow-md transition-all duration-300 flex flex-col ${
                // R1: bg-surface-solid/45 -> bg-surface (solid); raw red-500 fractions -> danger token
                isQueued ? "border-border-line opacity-60 bg-surface" : "border-border-line"
              } ${
                // R1: ring-accent/30 + shadow-accent/5 kept as tint bg; bg-surface-solid -> bg-surface
                isRunning ? "ring-2 ring-accent/30 border-accent scale-[1.01] shadow-lg bg-surface" : ""
              } ${
                isDone ? "bg-surface" : ""
              } ${isError ? "bg-danger/5 border-danger/20" : ""}`}
            >
              {/* Card Header Banner — collapsible trigger */}
              {/* C2: aria-expanded, aria-controls, aria-label on every header */}
              <div
                className={`p-4 border-b border-border-line flex flex-col justify-between shrink-0 min-h-[96px] cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent ${
                  // R1: bg-surface/20 -> bg-surface-2; bg-accent/5 -> bg-accent-soft is not available, use bg-surface-2
                  isDone ? "bg-surface-2 hover:bg-surface-2" : isRunning ? "bg-surface-2 hover:bg-surface-2" : "bg-surface"
                }`}
                onClick={() => { if (!isQueued) toggleCollapse(agent.num); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (!isQueued) toggleCollapse(agent.num);
                  }
                }}
                role="button"
                tabIndex={isQueued ? -1 : 0}
                aria-expanded={!isBodyCollapsed}
                aria-controls={bodyId}
                aria-label={`${agent.title}: ${state.status}. ${isBodyCollapsed ? "Expand" : "Collapse"} output.`}
              >
                <div className="flex items-start justify-between w-full gap-2">
                  {/* R2: font-display title at text-base outranks labels */}
                  <h4 className="text-base font-bold text-ink leading-tight font-display">
                    {agent.title}
                  </h4>

                  {/* Status badges — R3: replace ○/● glyphs with styled span dots */}
                  <span className="flex items-center gap-1 text-xs font-mono font-bold uppercase tracking-wider shrink-0 mt-0.5">
                    {isQueued && (
                      <span className="text-muted flex items-center gap-1">
                        {/* R3: ○ replaced with styled span dot */}
                        <span className="w-2 h-2 rounded-full bg-muted inline-block opacity-40" aria-hidden="true" />
                        Q
                      </span>
                    )}
                    {isRunning && (
                      <span className="text-accent animate-pulse flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-accent inline-block animate-[ping_1.2s_infinite]" aria-hidden="true" />
                        RUN
                      </span>
                    )}
                    {isDone && (
                      <span className="text-positive flex items-center gap-1">
                        <Check className="w-3 h-3 text-positive shrink-0" aria-hidden="true" />
                        OK
                      </span>
                    )}
                    {isError && (
                      <span className="text-danger flex items-center gap-1">
                        {/* R3: ● replaced with styled span dot */}
                        <span className="w-2 h-2 rounded-full bg-danger inline-block" aria-hidden="true" />
                        ERR
                      </span>
                    )}
                    {(!isQueued && !isRunning) && (
                      <span className="ml-1 text-muted">
                        {isBodyCollapsed
                          ? <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                          : <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                        }
                      </span>
                    )}
                  </span>
                </div>

                {/* R2: tagline at text-sm (was text-[10px]) */}
                <p className="text-sm text-muted font-semibold leading-tight mt-2 pb-0.5">
                  {agent.tagline}
                </p>

                {/* One-line collapsed summary for done cards */}
                {isDone && isBodyCollapsed && collapsedSummary && (
                  <p className="text-xs text-faint mt-1 truncate leading-snug pr-6">
                    {collapsedSummary}
                  </p>
                )}
              </div>

              {/* Card Body — hidden when done/error card is collapsed */}
              {/* C3: aria-live on completed output region */}
              {(!isBodyCollapsed || isRunning || isQueued) && (
              <div
                id={bodyId}
                aria-live={isRunning ? "polite" : undefined}
                aria-label={isDone ? `${agent.title} completed output` : undefined}
                className={`p-4 space-y-4 flex-1 flex flex-col justify-start text-sm ${
                  // R1: bg-surface-solid/40 -> bg-surface; bg-surface-solid -> bg-surface
                  isRunning || isDone ? "bg-surface" : "bg-surface"
                }`}
              >
                {/* 1. Memory note display box specifically for Frame agent (Agent 1) */}
                {agent.num === 1 && memoryDetails?.note && (
                  // R1: bg-accent/5 -> bg-surface-2; border-accent/15 -> border-accent; text-ink/90 -> text-ink
                  <div className="p-3 bg-surface-2 border border-accent rounded-xl text-sm text-ink leading-relaxed" id="agent-1-memory-banner">
                    <span className="font-bold flex items-center gap-1 text-accent mb-0.5">
                      {/* R3: ℹ glyph replaced with lucide Info */}
                      <Info className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      Informed by Past Decision:
                    </span>
                    A previous human-approved decision prioritized <strong className="font-bold underline text-ink">{memoryDetails.rationale}</strong>.
                  </div>
                )}

                {/* 2. Confidence Pill specifically for Chief of staff brief (Agent 5) */}
                {agent.num === 5 && confidence && (
                  // R1: bg-surface/30 -> bg-surface-2
                  <div className="flex items-center justify-between gap-2 border border-border-line p-2 bg-surface-2 rounded-xl" id="agent-5-confidence-pill">
                    <span className="font-bold text-muted uppercase tracking-wider text-xs">Advisory Quality:</span>
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border uppercase shrink-0 ${
                      confidence === "high"
                        // R1: bg-emerald-500/10 -> bg-positive/10; border-emerald-500/20 -> border-positive/20; text-emerald-500 -> text-positive
                        ? "bg-positive/10 border-positive/20 text-positive"
                        : confidence === "medium"
                        // R1: amber fractions -> warning token
                        ? "bg-warning/10 border-warning/20 text-warning"
                        // R1: rose fractions -> danger token
                        : "bg-danger/10 border-danger/20 text-danger"
                    }`}>
                      {confidence}
                    </span>
                  </div>
                )}

                {/* Content states */}
                {isQueued && (
                  // R1: bg-surface/5 -> bg-surface (solid, de-emphasized via text-faint)
                  <div className="py-12 text-center flex-1 flex items-center justify-center bg-surface" id={`queued-placeholder-${agent.num}`}>
                    <p className="text-xs text-faint font-mono tracking-widest uppercase">READY</p>
                  </div>
                )}

                {isRunning && (
                  <div className="space-y-3 flex-1 flex flex-col justify-center" id={`running-loader-${agent.num}`}>
                    {cleanedOutput ? (
                      // R1: bg-surface/20 -> bg-surface-2; R2: text-[11px] -> text-sm; text-ink/90 -> text-ink
                      <div className="prose prose-sm max-w-none text-sm leading-relaxed text-ink select-text bg-surface-2 p-3 border border-dashed border-border-line rounded-xl">
                        {renderMarkdownText(cleanedOutput, props.groundingSources, agent.num)}
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {/* R2: text-[10px] -> text-xs (minimum for badges) */}
                        <div className="flex items-center gap-2 text-xs text-accent font-bold uppercase tracking-wider">
                          <div className="w-2.5 h-2.5 rounded-full border-2 border-accent border-t-transparent animate-spin" aria-hidden="true" />
                          <span>Thinking...</span>
                        </div>
                        <div className="h-1 bg-surface-2 rounded-full overflow-hidden">
                          <div className="h-full bg-accent animate-[pulse_1.5s_infinite] w-2/3" />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {isError && (
                  // R1: bg-red-500/5 -> bg-danger/5; border-red-500/20 -> border-danger/20
                  <div className="p-3 bg-danger/5 border border-danger/20 rounded-xl text-center space-y-2.5" id={`error-wrapper-${agent.num}`}>
                    {/* R2: text-[10px] -> text-sm; text-red-500 -> text-danger */}
                    <span className="text-sm font-bold uppercase tracking-wide text-danger block">
                      Execution Error
                    </span>
                    {/* R2: text-[10px] -> text-sm */}
                    <p className="text-sm text-muted leading-relaxed font-semibold">
                      {state.error || "A connection timeout occurred."}
                    </p>
                    {/* R4: danger button style */}
                    <button
                      onClick={() => props.onRetryAgent(agent.num)}
                      className="py-1.5 px-3 text-danger border border-danger/30 hover:bg-danger/10 font-bold text-sm rounded-lg cursor-pointer transition-colors w-full uppercase focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {isDone && (
                  // Completed output is a static region (the concise status
                  // announcer above handles SR notification — no aria-live here,
                  // which would re-read the full multi-paragraph output on toggle).
                  <div
                    className="prose prose-sm max-w-none text-ink select-text flex-1 overflow-x-auto leading-relaxed"
                    aria-label={`${agent.title} output`}
                  >
                    {renderMarkdownText(cleanedOutput, props.groundingSources, agent.num)}
                  </div>
                )}
              </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Equity & risk digest — surfaced from the real Agent 4 audit, not scored. */}
      {props.agentStates[4].status === "done" && props.agentStates[4].output.trim() && (
        <EquityRiskSummary step4Output={props.agentStates[4].output} />
      )}
    </section>
  );
}
