import React from "react";
import { ShieldAlert } from "lucide-react";
import { parseMarkdownSections } from "../utils";

interface SafeMarkdownProps {
  /** Raw markdown-ish text (model output or shared record). Rendered as React nodes only. */
  text: string;
}

/**
 * Only http/https/mailto links render as anchors. Untrusted text (model output,
 * shared-record content) is never trusted — javascript:/data: and any other
 * scheme fall back to plain text. Prevents stored XSS.
 */
function safeUrl(raw: string): string | null {
  try {
    const u = new URL(raw, window.location.origin);
    if (u.protocol === "http:" || u.protocol === "https:" || u.protocol === "mailto:") {
      return u.href;
    }
  } catch {
    /* malformed URL — treat as plain text */
  }
  return null;
}

/**
 * Safe inline renderer for **bold** and [label](url). Builds real React nodes
 * via tokenization — NO dangerouslySetInnerHTML, so content cannot inject markup
 * or scripts into the DOM.
 */
function renderFormattedLine(line: string): React.ReactNode {
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
      nodes.push(
        <strong key={key++} className="font-bold text-ink">
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
      const url = safeUrl(match[5]);
      if (url) {
        nodes.push(
          <a
            key={key++}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline inline-flex items-center gap-0.5 font-semibold"
          >
            {match[4]} <span className="text-xs" aria-hidden="true">↗</span>
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
}

/**
 * Renders blocks of markdown styled with Tailwind tokens: headings, lists,
 * tables, and paragraphs. Strips telemetry metadata tags from display.
 */
export default function SafeMarkdown({ text }: SafeMarkdownProps) {
  let textToParse = text;
  const metadataMatch = text.match(/\[METADATA_JSON:[^\]]+\]/);
  if (metadataMatch) {
    textToParse = text.replace(/\[METADATA_JSON:[^\]]+\]/, "").trim();
  }

  const sections = parseMarkdownSections(textToParse);

  if (sections.length === 0) {
    return <p className="text-sm text-muted italic">No content provided.</p>;
  }

  return (
    <div className="space-y-4">
      {sections.map((section, idx) => {
        const isWhatWeDontKnowBox = section.isBoxed;
        const isRiskBox = section.isWarning;

        const isTable = section.content.some(
          (line) => line.includes("|") && line.trim().startsWith("|")
        );

        let contentNode: React.ReactNode = null;

        if (isTable) {
          const tableLines = section.content.filter((l) => l.includes("|"));
          if (tableLines.length >= 2) {
            const headers = tableLines[0].split("|").map((s) => s.trim()).filter(Boolean);
            const isSeparator = (line: string) => line.includes("---") || line.includes("-:-");
            const dataRows = tableLines
              .slice(1)
              .filter((l) => !isSeparator(l))
              .map((row) => row.split("|").map((s) => s.trim()).filter(Boolean));

            contentNode = (
              <div className="overflow-x-auto my-3 border border-border-line rounded-xl">
                <table className="w-full text-sm font-mono text-left border-collapse bg-surface-solid">
                  <thead>
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
                      <tr key={i} className="hover:bg-surface-2 transition-all">
                        {cols.map((col, cIdx) => (
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
          let currentList: string[] = [];
          const renderedLines: React.ReactNode[] = [];

          const flushList = (key: number) => {
            if (currentList.length > 0) {
              renderedLines.push(
                <ul key={`list-${key}`} className="list-disc pl-5 my-2.5 space-y-1.5 text-ink text-sm">
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
                <p key={lineIdx} className="text-sm text-ink my-1.5 pl-1 leading-relaxed">
                  {renderFormattedLine(trimmed)}
                </p>
              );
            } else if (trimmed === "") {
              flushList(lineIdx);
            } else {
              flushList(lineIdx);
              renderedLines.push(
                <p key={lineIdx} className="text-sm text-ink leading-relaxed my-2">
                  {renderFormattedLine(trimmed)}
                </p>
              );
            }
          });

          flushList(section.content.length);
          contentNode = <div className="space-y-1">{renderedLines}</div>;
        }

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
              <h4
                className={`text-xs font-bold uppercase tracking-wider mt-5 first:mt-1 font-display ${
                  section.level === 3
                    ? "text-muted text-xs"
                    : "text-ink border-b border-dashed border-border-line pb-1"
                }`}
              >
                {section.title}
              </h4>
            )}
            {contentNode}
          </div>
        );
      })}
    </div>
  );
}
