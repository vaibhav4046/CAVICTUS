import React from "react";
import { Plus, RefreshCw } from "lucide-react";
import { DecisionMemoryItem } from "../types";

interface SidebarProps {
  memoryItems: DecisionMemoryItem[];
  selectedItemId: string | null;
  onSelectItem: (id: string) => void;
  onNewDecision: () => void;
  onClearMemory: () => void;
  onReuseTemplate: (item: DecisionMemoryItem) => void;
}

export default function Sidebar(props: SidebarProps) {
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    props.onClearMemory();
  };

  return (
    <aside
      id="decision-memory-sidebar"
      className="w-full md:w-[270px] shrink-0 border-r border-border-line bg-surface-solid dark:bg-[#11141D] flex flex-col h-[calc(100vh-64px)] overflow-hidden font-sans transition-colors duration-300"
    >
      {/* Top action */}
      <div className="p-4 shrink-0">
        <button
          id="new-decision-btn"
          onClick={props.onNewDecision}
          className="w-full py-2.5 bg-gradient-to-r from-accent to-accent-2 text-white rounded-xl text-xs font-bold shadow-lg shadow-accent/15 hover:opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
        >
          <Plus className="w-4 h-4" />
          + New Decision
        </button>
      </div>

      {/* Memory listing */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
        <label className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-2 px-1">
          Saved Decisions
        </label>

        {props.memoryItems.length === 0 ? (
          <div className="py-12 text-center" id="empty-memory-view">
            <p className="text-xs text-muted/80">No decisions saved yet.</p>
            <p className="text-[10px] text-muted/60 mt-1.5 max-w-[200px] mx-auto leading-relaxed">
              Your approved choices will be committed to local database memory.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5" id="memory-list-container">
            {props.memoryItems.map((item) => {
              const isSelected = props.selectedItemId === item.id;
              const isApproved = item.humanDecision === "approved" || item.humanDecision === "approved_with_edits";
              
              const formattedDate = new Date(item.createdAt).toLocaleDateString("en-US", {
                month: "short",
                year: "numeric"
              });

              return (
                <div
                  key={item.id}
                  onClick={() => props.onSelectItem(item.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      props.onSelectItem(item.id);
                    }
                  }}
                  className={`p-3.5 border-l-4 rounded-xl text-left cursor-pointer transition-all select-none duration-200 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
                    isSelected
                      ? "bg-accent/5 dark:bg-accent/10 border-accent text-ink font-semibold shadow-sm"
                      : "bg-surface-solid hover:bg-surface/50 border-transparent hover:border-border-line text-ink"
                  }`}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                >
                  <div className="flex items-start gap-2.5">
                    {isApproved ? (
                      <span className="text-emerald-500 font-bold text-xs mt-0.5">✓</span>
                    ) : (
                      <span className="text-amber-500 font-bold text-xs mt-0.5">✎</span>
                    )}
                    <div className="truncate flex-1 min-w-0">
                      <h4 className="text-[13px] font-bold text-ink truncate leading-snug">
                        {item.decisionType}
                      </h4>
                      <p className="text-[11px] text-muted truncate mt-0.5 leading-relaxed">
                        {(item.situation.split(".")[0] || "Riverside").replace(/^“|”$/g, "").slice(0, 45)}
                      </p>
                      
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-line">
                        <span className="text-[10px] text-muted font-mono">{formattedDate}</span>
                        <span
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            item.humanDecision === "rejected"
                              ? "bg-red-500/10 text-red-500"
                              : item.humanDecision === "approved_with_edits"
                              ? "bg-amber-500/10 text-amber-500"
                              : "bg-emerald-500/10 text-emerald-500"
                          }`}
                        >
                          {item.humanDecision === "rejected"
                            ? "REJECTED"
                            : item.humanDecision === "approved_with_edits"
                            ? "MODIFIED"
                            : "APPROVED"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions for active memory details view */}
                  {isSelected && (
                    <div className="mt-2.5 pt-2 border-t border-border-line flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          props.onReuseTemplate(item);
                        }}
                        className="flex-1 py-1 px-2 border border-border-line bg-surface-solid dark:bg-[#121620] hover:bg-surface/50 text-ink text-[10px] font-bold rounded flex items-center justify-center gap-1 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
                        title="Load this data back into the workflow setup"
                      >
                        <RefreshCw className="w-2.5 h-2.5 text-accent" />
                        Use template
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Accountable transparency note */}
      <div className="p-4 border-t border-border-line shrink-0 bg-surface/10">
        <div className="p-3 bg-surface/30 dark:bg-[#121620]/40 border border-border-line rounded-xl mb-3">
          <p className="text-[11px] leading-relaxed text-muted font-medium">
            “Informed by {props.memoryItems.filter(i => i.humanDecision !== "rejected").length} past decisions” — Memory helps CIVICTAS stay consistent and accountable.
          </p>
        </div>

        {props.memoryItems.length > 0 && (
          <button
            id="clear-all-memory-btn"
            onClick={handleDeleteClick}
            className="w-full py-2 border border-red-500/20 text-red-500 rounded-xl text-[12px] font-bold hover:bg-red-500/10 cursor-pointer transition-all uppercase tracking-wide text-xs"
          >
            Clear Memory
          </button>
        )}
      </div>
    </aside>
  );
}
