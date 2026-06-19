import React from "react";
import { Plus, RefreshCw, CheckCircle2, SquarePen, X, Trash2 } from "lucide-react";
import { DecisionMemoryItem } from "../types";

interface SidebarProps {
  memoryItems: DecisionMemoryItem[];
  selectedItemId: string | null;
  onSelectItem: (id: string) => void;
  onNewDecision: () => void;
  onClearMemory: () => void;
  onReuseTemplate: (item: DecisionMemoryItem) => void;
  /** Mobile drawer open state (ignored at md+ where the rail is always docked). */
  isOpen?: boolean;
  /** Close the mobile drawer. */
  onClose?: () => void;
}

export default function Sidebar(props: SidebarProps) {
  const { isOpen = false, onClose } = props;

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    props.onClearMemory();
  };

  // On mobile, picking an item or starting a new decision should drop the
  // drawer so the workspace (the actual product) is what the user lands on.
  const closeOnMobile = () => onClose?.();
  const handleNewDecision = () => {
    props.onNewDecision();
    closeOnMobile();
  };
  const handleSelectItem = (id: string) => {
    props.onSelectItem(id);
    closeOnMobile();
  };

  return (
    <aside
      id="decision-memory-sidebar"
      aria-label="Decision memory"
      className={`bg-surface-solid flex flex-col overflow-hidden font-sans shrink-0
        fixed inset-y-0 left-0 z-50 w-[280px] border-r border-border-line shadow-lg
        transition-transform duration-300 ease-out
        md:static md:z-auto md:shadow-none md:w-[270px] md:h-[calc(100vh-64px)] md:translate-x-0 md:border-b-0
        ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
    >
      {/* Mobile drawer header — close control (hidden on desktop dock) */}
      <div className="md:hidden flex items-center justify-between px-4 h-14 border-b border-border-line shrink-0">
        <span className="text-[11px] font-bold uppercase tracking-widest text-muted">Decisions</span>
        <button
          onClick={onClose}
          aria-label="Close decisions panel"
          className="h-8 w-8 grid place-items-center rounded-lg border border-border-line text-muted hover:text-ink hover:bg-surface-2 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
      {/* Top action */}
      <div className="p-4 shrink-0">
        <button
          id="new-decision-btn"
          onClick={handleNewDecision}
          className="w-full py-2.5 bg-accent text-on-accent rounded-lg text-xs font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          New decision
        </button>
      </div>

      {/* Memory listing */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
        <h2 className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2 px-1">
          Saved decisions
        </h2>

        {props.memoryItems.length === 0 ? (
          <div className="py-12 text-center" id="empty-memory-view">
            <p className="text-xs text-muted">No decisions saved yet.</p>
            <p className="text-xs text-faint mt-1.5 max-w-[200px] mx-auto leading-relaxed">
              Your approved choices are committed to local browser memory.
            </p>
          </div>
        ) : (
          <nav aria-label="Decision memory">
            <div className="space-y-2.5" id="memory-list-container">
              {props.memoryItems.map((item) => {
                const isSelected = props.selectedItemId === item.id;
                const isApproved = item.humanDecision === "approved" || item.humanDecision === "approved_with_edits";

                const formattedDate = new Date(item.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                });

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectItem(item.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSelectItem(item.id);
                      }
                    }}
                    className={`p-3.5 border-l-4 rounded-xl text-left cursor-pointer transition-all select-none duration-200 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
                      isSelected
                        ? "bg-accent-soft border-accent text-ink font-semibold shadow-sm"
                        : "bg-surface hover:bg-surface-2 border-transparent hover:border-border-line text-ink"
                    }`}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                  >
                    <div className="flex items-start gap-2.5">
                      {isApproved ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-positive shrink-0 mt-0.5" aria-hidden="true" />
                      ) : (
                        <SquarePen className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" aria-hidden="true" />
                      )}
                      <div className="truncate flex-1 min-w-0">
                        <h3 className="text-[13px] font-bold text-ink truncate leading-snug">
                          {item.decisionType}
                        </h3>
                        <p className="text-xs text-muted truncate mt-0.5 leading-relaxed">
                          {(item.situation.split(".")[0] || "Riverside").replace(/^“|”$/g, "").slice(0, 45)}
                        </p>

                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-line">
                          <span className="text-[10px] text-muted font-mono">{formattedDate}</span>
                          <span
                            className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                              item.humanDecision === "rejected"
                                ? "bg-danger/10 text-danger"
                                : item.humanDecision === "approved_with_edits"
                                ? "bg-warning/10 text-warning"
                                : "bg-positive/10 text-positive"
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
                          className="flex-1 min-h-6 py-1 px-2 border border-border-line bg-surface hover:bg-surface-2 text-ink text-[10px] font-bold rounded flex items-center justify-center gap-1 cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
                          title="Load this data back into the workflow setup"
                        >
                          <RefreshCw className="w-2.5 h-2.5 text-accent" aria-hidden="true" />
                          Use template
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </nav>
        )}
      </div>

      {/* Accountable transparency note */}
      <div className="p-4 border-t border-border-line shrink-0">
        <div className="p-3 bg-surface-2 border border-border-line rounded-xl mb-3">
          <p className="text-xs leading-relaxed text-muted font-medium">
            Informed by {props.memoryItems.filter((i) => i.humanDecision !== "rejected").length} past decisions — memory helps CIVICTAS stay consistent and accountable.
          </p>
        </div>

        {props.memoryItems.length > 0 && (
          <button
            id="clear-all-memory-btn"
            onClick={handleDeleteClick}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium text-faint hover:text-danger rounded-lg transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            Clear memory
          </button>
        )}
      </div>
    </aside>
  );
}
