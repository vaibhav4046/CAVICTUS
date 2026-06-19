import React, { useState } from "react";
import { Check, ShieldAlert, ChevronDown, ChevronUp } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { AgentState, PipelineOutputs } from "../types";
import { parseMarkdownSections, extractMemoryNote, getConfidencePill } from "../utils";

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
   */
  const renderFormattedLine = (line: string): React.ReactNode => {
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
          nodes.push(
            <a
              key={key++}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent dark:text-accent-2 hover:underline inline-flex items-center gap-0.5 font-semibold"
            >
              {match[4]} <span className="text-[9px]">↗</span>
            </a>
          );
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
  const renderMarkdownText = (rawText: string, searchSources: Array<{title: string; url: string}>) => {
    // Strip metadata tags from display
    let textToParse = rawText;
    const metadataMatch = rawText.match(/\[METADATA_JSON:[^\]]+\]/);
    if (metadataMatch) {
      textToParse = rawText.replace(/\[METADATA_JSON:[^\]]+\]/, "").trim();
    }

    const sections = parseMarkdownSections(textToParse);
    
    if (sections.length === 0) {
      return <p className="text-xs text-muted italic">Synthesizing detailed advisory outputs...</p>;
    }

    return (
      <div className="space-y-4">
        {sections.map((section, idx) => {
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
                  <table className="w-full text-xs font-mono text-left border-collapse bg-surface-solid dark:bg-[#121620]">
                    <thead>
                      <tr className="bg-surface/50 border-b border-border-line">
                        {headers.map((h, i) => (
                          <th key={i} className="px-3.5 py-2.5 font-bold text-ink uppercase tracking-wider text-[10px]">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-line">
                      {dataRows.map((cols, i) => (
                        <tr key={i} className="hover:bg-surface/30 transition-all">
                          {cols.map((col, cIdx) => (
                            <td key={cIdx} className="px-3.5 py-2 text-ink/90 whitespace-nowrap">
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
                  <ul key={`list-${key}`} className="list-disc pl-5 my-2.5 space-y-1.5 text-ink/90 text-xs">
                    {currentList.map((item, itemIdx) => (
                      <li key={itemIdx} className="leading-relaxed">
                        {renderFormattedLine(item)}
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
                  <p key={lineIdx} className="text-xs text-ink/90 my-1.5 pl-1 leading-relaxed">
                    {renderFormattedLine(trimmed)}
                  </p>
                );
              } else if (trimmed === "") {
                flushList(lineIdx);
              } else {
                flushList(lineIdx);
                renderedLines.push(
                  <p key={lineIdx} className="text-xs text-ink/90 leading-relaxed my-2">
                    {renderFormattedLine(trimmed)}
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
                  <ShieldAlert className="w-4 h-4 text-muted" />
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
                className="my-4 p-4 bg-amber-500/5 dark:bg-amber-400/5 border border-amber-500/20 rounded-xl space-y-2 border-l-4 border-l-amber-500 shadow-sm"
              >
                <h4 className="text-xs font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider flex items-center gap-1.5 font-display">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
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
                  section.level === 3 ? "text-muted text-[10px]" : "text-ink border-b border-dashed border-border-line pb-1"
                }`}>
                  {section.title}
                </h4>
              )}
              {contentNode}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <section id="pipeline-panel" className="space-y-6">
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

          // Format streaming text
          const cleanedOutput = state.output;
          const memoryDetails = agent.num === 1 ? extractMemoryNote(state.output) : null;
          const confidence = agent.num === 5 ? getConfidencePill(state.output) : null;

          return (
            <motion.div
              initial="queued"
              animate={state.status}
              variants={{
                queued: { opacity: 0.6, y: shouldReduceMotion ? 0 : 20 },
                running: { opacity: 1, y: 0, transition: { duration: 0.3 } },
                done: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 30 } },
                error: { opacity: 1, y: 0 }
              }}
              key={agent.num}
              id={`agent-card-${agent.num}`}
              className={`bg-surface-solid border rounded-2xl overflow-hidden shadow-lg shadow-black/[0.01] transition-all duration-300 flex flex-col ${
                isQueued ? "border-border-line opacity-60 bg-surface-solid/45" : "border-border-line"
              } ${
                isRunning ? "ring-2 ring-accent/30 border-accent scale-[1.01] shadow-xl shadow-accent/5 bg-surface-solid" : ""
              } ${
                isDone ? "bg-surface-solid" : ""
              } ${isError ? "bg-red-500/5 border-red-500/35" : ""}`}
            >
              {/* Card Header Banner with color accents */}
              <div 
                className={`p-4 border-b border-border-line flex flex-col justify-between shrink-0 min-h-[96px] cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent ${
                  isDone ? "bg-surface/20 hover:bg-surface/30" : isRunning ? "bg-accent/5 hover:bg-accent/10" : "bg-surface-solid"
                }`}
                onClick={() => { if (!isQueued) toggleCollapse(agent.num) }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (!isQueued) toggleCollapse(agent.num);
                  }
                }}
                role="button"
                tabIndex={isQueued ? -1 : 0}
                aria-expanded={!collapsedCards[agent.num]}
              >
                <div className="flex items-start justify-between w-full gap-2">
                  <h4 className="text-xs font-bold text-ink leading-tight font-display">
                    {agent.title}
                  </h4>
                  
                  {/* Clean bullet-style status badges */}
                  <span className="flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-wider shrink-0 mt-0.5">
                    {isQueued && (
                      <span className="text-muted/65 flex items-center gap-1">○ Q</span>
                    )}
                    {isRunning && (
                      <span className="text-accent animate-pulse flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block animate-[ping_1.2s_infinite]" />
                        ● RUN
                      </span>
                    )}
                    {isDone && (
                      <span className="text-emerald-500 flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                        OK
                      </span>
                    )}
                    {isError && (
                      <span className="text-red-500 flex items-center gap-1">● ERR</span>
                    )}
                    {(!isQueued && !isRunning) && (
                      <span className="ml-1 text-muted">
                        {collapsedCards[agent.num] ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                      </span>
                    )}
                  </span>
                </div>
                <p className="text-[10px] text-muted font-semibold leading-tight mt-2 pb-0.5">
                  {agent.tagline}
                </p>
              </div>

              {/* Card Body content */}
              {(!collapsedCards[agent.num] || isRunning || isQueued) && (
              <div className={`p-4 space-y-4 flex-1 flex flex-col justify-start text-xs ${
                isRunning || isDone ? "bg-surface-solid" : "bg-surface-solid/40"
              }`}>
                {/* 1. Memory note display box specifically for Frame agent (Agent 1) */}
                {agent.num === 1 && memoryDetails?.note && (
                  <div className="p-3 bg-accent/5 border border-accent/15 rounded-xl text-[10.5px] text-ink/90 leading-relaxed" id="agent-1-memory-banner">
                    <span className="font-bold block text-accent mb-0.5">ℹ Informed by Past Decision:</span>
                    A previous human-approved decision prioritized <strong className="font-bold underline text-ink">{memoryDetails.rationale}</strong>.
                  </div>
                )}

                {/* 2. Confidence Pill specifically for Chief of staff brief (Agent 5) */}
                {agent.num === 5 && confidence && (
                  <div className="flex items-center justify-between gap-2 border border-border-line p-2 bg-surface/30 rounded-xl" id="agent-5-confidence-pill">
                    <span className="font-bold text-muted uppercase tracking-wider text-[8.5px]">Advisory Quality:</span>
                    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase shrink-0 ${
                      confidence === "high"
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                        : confidence === "medium"
                        ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
                        : "bg-rose-500/10 border-rose-500/20 text-rose-500"
                    }`}>
                      {confidence}
                    </span>
                  </div>
                )}

                {/* Content states */}
                {isQueued && (
                  <div className="py-12 text-center flex-1 flex items-center justify-center bg-surface/5" id={`queued-placeholder-${agent.num}`}>
                    <p className="text-[10px] text-muted/50 font-mono tracking-widest uppercase">READY</p>
                  </div>
                )}

                {isRunning && (
                  <div className="space-y-3 flex-1 flex flex-col justify-center" id={`running-loader-${agent.num}`}>
                    {cleanedOutput ? (
                      <div className="prose prose-sm max-w-none text-[11px] leading-relaxed text-ink/90 select-text bg-surface/20 p-3 border border-dashed border-border-line rounded-xl">
                        {renderMarkdownText(cleanedOutput, props.groundingSources)}
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2 text-[10px] text-accent font-bold uppercase tracking-wider">
                          <div className="w-2.5 h-2.5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                          <span>Thinking...</span>
                        </div>
                        <div className="h-1 bg-surface rounded-full overflow-hidden">
                          <div className="h-full bg-accent animate-[pulse_1.5s_infinite] w-2/3" />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {isError && (
                  <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl text-center space-y-2.5" id={`error-wrapper-${agent.num}`}>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-red-500 block">
                      Execution Error
                    </span>
                    <p className="text-[10px] text-muted leading-relaxed font-semibold">
                      {state.error || "A connection timeout occurred."}
                    </p>
                    <button
                      onClick={() => props.onRetryAgent(agent.num)}
                      className="py-1 px-3 bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] rounded-lg cursor-pointer transition-colors w-full uppercase focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-solid focus-visible:ring-red-500"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {isDone && (
                  <div className="prose prose-sm max-w-none text-ink select-text flex-1 overflow-x-auto leading-relaxed">
                    {renderMarkdownText(cleanedOutput, props.groundingSources)}
                  </div>
                )}
              </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
