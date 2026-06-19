import React, { useState, useEffect } from "react";
import { 
  CheckSquare, 
  Lock, 
  Download, 
  RotateCcw, 
  ShieldCheck, 
  Trash2, 
  Plus, 
  Terminal, 
  ExternalLink,
  Users,
  Info
} from "lucide-react";
import { HumanDecisionType } from "../types";

interface HumanReviewPanelProps {
  isPipelineDone: boolean;
  recommendedOption: string; // The recommendation extracted from Agent 5
  isFinalized: boolean;
  onFinalize: (details: {
    decisionType: HumanDecisionType;
    chosenOption: string;
    humanRationale: string;
    checks: {
      dataGaps: boolean;
      equity: boolean;
      community: boolean;
    };
  }) => void;
  onStartNew: () => void;
  onDownloadBrief: () => void;
  
  // Custom Reviewer Routing & Notification Props
  reviewers: Array<{
    name: string;
    channel: string;
    contactHandle: string;
    escalateTo: string;
    escalateAfter: string;
  }>;
  selectedReviewerIndex: number;
  onSelectReviewer: (index: number) => void;
  onAddReviewer: (newReviewer: {
    name: string;
    channel: string;
    contactHandle: string;
    escalateTo: string;
    escalateAfter: string;
  }) => void;
  onDeleteReviewer: (index: number) => void;
  notificationStatus: {
    sent: boolean;
    simulated: boolean;
    time: string;
    channel: string;
    reviewerName: string;
    escalationNote: string;
    payloadPreview?: any;
    reviewLink: string;
  } | null;
}

export default function HumanReviewPanel(props: HumanReviewPanelProps) {
  const [decisionType, setDecisionType] = useState<HumanDecisionType | "">("");
  const [chosenOption, setChosenOption] = useState("");
  const [humanRationale, setHumanRationale] = useState("");
  
  // Requirements checklists
  const [checkDataGaps, setCheckDataGaps] = useState(false);
  const [checkEquity, setCheckEquity] = useState(false);
  const [checkCommunity, setCheckCommunity] = useState(false);

  // "Demonstrably reasoned" — the official must engage a specific data gap or
  // dissenting voice, not merely tick boxes (guards against rubber-stamp oversight).
  const [reasonedNote, setReasonedNote] = useState("");

  // Form to add a new reviewer state
  const [isAddingReviewer, setIsAddingReviewer] = useState(false);
  const [newRevName, setNewRevName] = useState("");
  const [newRevChannel, setNewRevChannel] = useState("Telegram");
  const [newRevHandle, setNewRevHandle] = useState("");
  const [newRevEscalateTo, setNewRevEscalateTo] = useState("");
  const [newRevEscalateAfter, setNewRevEscalateAfter] = useState("24");

  // Sync chosen option when pipeline finishes loading
  useEffect(() => {
    if (props.recommendedOption && !chosenOption && !props.isFinalized) {
      setChosenOption(props.recommendedOption);
    }
  }, [props.recommendedOption, props.isFinalized]);

  // Handle radio select changes to adapt the Chosen Option text area
  const handleDecisionTypeChange = (type: HumanDecisionType) => {
    setDecisionType(type);
    if (type === "approved" && props.recommendedOption) {
      setChosenOption(props.recommendedOption);
    } else if (type === "rejected") {
      setChosenOption("Rejected all AI-proposed options and aborted action.");
    }
  };

  // Eligibility: enabled only when decision is selected, rationale is filled, and all 3 boxes checked
  const isValid =
    decisionType !== "" &&
    humanRationale.trim().length > 0 &&
    reasonedNote.trim().length >= 12 &&
    checkDataGaps &&
    checkEquity &&
    checkCommunity;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || props.isFinalized) return;
    props.onFinalize({
      decisionType: decisionType as HumanDecisionType,
      chosenOption,
      humanRationale: `${humanRationale}\n\nReasoned engagement (data gap / dissenting voice weighed): ${reasonedNote.trim()}`,
      checks: {
        dataGaps: checkDataGaps,
        equity: checkEquity,
        community: checkCommunity,
      },
    });
  };

  const handleSaveReviewer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRevName.trim() || !newRevHandle.trim()) {
      alert("Please provide the reviewer's name and contact handle.");
      return;
    }
    props.onAddReviewer({
      name: newRevName.trim(),
      channel: newRevChannel,
      contactHandle: newRevHandle.trim(),
      escalateTo: newRevEscalateTo.trim(),
      escalateAfter: newRevEscalateAfter.trim(),
    });
    // Reset add state
    setNewRevName("");
    setNewRevHandle("");
    setNewRevEscalateTo("");
    setNewRevEscalateAfter("24");
    setIsAddingReviewer(false);
  };

  // 1. Locked state rendering when pipeline is running or not started yet
  if (!props.isPipelineDone) {
    return (
      <section
        id="human-review-locked"
        className="p-8 bg-surface-solid/40 border border-border-line rounded-2xl flex flex-col items-center justify-center text-center space-y-4 opacity-70 backdrop-blur-md"
      >
        <Lock className="w-8 h-8 text-muted animate-pulse" />
        <div>
          <h3 className="text-xs font-bold text-muted uppercase tracking-wider font-display">
            Step 3 — Human Review & Finalization
          </h3>
          <p className="text-xs text-muted/80 max-w-sm mt-1.5 leading-relaxed">
            Section locked. The review panel will become accessible immediately after all 5 specialized AI modeling agents complete execution.
          </p>
        </div>
      </section>
    );
  }

  // 2. Active human review workspace UI
  return (
    <section
      id="human-review-active"
      className={`p-6 rounded-2xl border transition-all duration-300 ${
        props.isFinalized
          ? "bg-emerald-500/5 border-emerald-500/25 dark:border-emerald-500/20 shadow-lg shadow-emerald-500/[0.02]"
          : "bg-surface-solid dark:bg-surface-solid/60 border-border-line shadow-xl shadow-black/[0.01]"
      }`}
    >
      {/* Header with reactive status badge */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border-line pb-4 gap-3">
        <div>
          <h3 className="text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-2 flex-wrap font-display">
            <span>Step 3 — Human Review & Approval</span>
            <span className="text-[10px] font-semibold text-accent bg-accent/10 border border-accent/20 px-2.5 py-0.5 rounded-full font-mono normal-case">
              AI-assisted · Human-decided
            </span>
          </h3>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            Review the synthesized data pipeline and exercise your professional oversight.
          </p>
        </div>

        <div>
          {props.isFinalized ? (
            <span
              id="finalized-badge"
              className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-500 px-3 py-1.5 rounded-xl border border-emerald-500/25"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              ✓ DECISION FINALIZED BY HUMAN
            </span>
          ) : (
            <span
              id="awaiting-badge"
              className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold bg-amber-500/15 text-amber-500 border border-amber-500/25 px-3 py-1.5 rounded-xl animate-pulse"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              ⏳ AWAITING OVERSIGHT
            </span>
          )}
        </div>
      </div>

      {/* Main Responsive Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        
        {/* Left Aspect: The human action form declaration (col-span-2) */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
          <div className="space-y-4">
            {/* Decisive radio buttons */}
            <div className="space-y-2">
              <span className="block text-xs font-bold text-muted uppercase tracking-wide">
                Official Choice Declaration
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { value: "approved", label: "Approve AI Proposal" },
                  { value: "approved_with_edits", label: "Approve with Edits" },
                  { value: "rejected", label: "Reject Pipeline Option" },
                ].map((opt) => {
                  const isSelected = decisionType === opt.value;
                  return (
                    <label
                      key={opt.value}
                      id={`radio-label-${opt.value}`}
                      className={`p-3.5 rounded-xl border flex items-center gap-2.5 cursor-pointer select-none transition-all text-xs font-semibold ${
                        isSelected
                          ? "bg-accent/5 border-accent text-ink shadow-sm"
                          : "bg-surface-solid dark:bg-[#121620] border-border-line hover:border-muted/30 text-ink"
                      } ${props.isFinalized ? "opacity-60 cursor-not-allowed" : ""}`}
                    >
                      <input
                        type="radio"
                        name="human-decision"
                        value={opt.value}
                        disabled={props.isFinalized}
                        checked={isSelected}
                        onChange={() => handleDecisionTypeChange(opt.value as HumanDecisionType)}
                        className="accent-accent cursor-pointer disabled:cursor-not-allowed"
                      />
                      <span>{opt.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Custom choice inputs */}
            {decisionType !== "" && (
              <div className="space-y-1.5 animate-fadeIn" id="chosen-option-wrapper">
                <label htmlFor="chosen-option-input" className="block text-xs font-bold text-muted uppercase tracking-wide">
                  {decisionType === "approved_with_edits"
                    ? "Describe modifications & tailored parameters"
                    : decisionType === "rejected"
                    ? "Statement about target actions/alternatives"
                    : "Review Proposed Choice Details"}
                </label>
                <textarea
                  id="chosen-option-input"
                  rows={2}
                  disabled={props.isFinalized || decisionType === "approved" || decisionType === "rejected"}
                  value={chosenOption}
                  onChange={(e) => setChosenOption(e.target.value)}
                  className="w-full text-xs font-mono border border-border-line p-3 rounded-xl text-ink bg-surface-solid dark:bg-[#121620] focus:border-accent focus:ring-2 focus:ring-accent/10 outline-none resize-none disabled:bg-surface/30 disabled:opacity-85 transition-colors"
                />
              </div>
            )}

            {/* Rationale description input */}
            <div className="space-y-1.5">
              <label htmlFor="rationale-input" className="block text-xs font-bold text-muted uppercase tracking-wide">
                Human Rationale & Policy Justification <span className="text-rose-500 font-bold">*</span>
              </label>
              <textarea
                id="rationale-input"
                rows={4}
                required
                disabled={props.isFinalized}
                value={humanRationale}
                onChange={(e) => setHumanRationale(e.target.value)}
                placeholder="Provide a clear physical explanation, budget defense, or public advocacy rationale detailing why this path was chosen..."
                className="w-full text-xs border border-border-line p-3.5 rounded-xl text-ink bg-surface-solid dark:bg-[#121620] placeholder-muted/60 focus:border-accent focus:ring-2 focus:ring-accent/10 outline-none resize-none disabled:bg-surface/30 disabled:opacity-60 disabled:cursor-not-allowed leading-relaxed font-sans transition-colors"
              />
            </div>

            {/* Demonstrably-reasoned engagement — not just "human present" */}
            <div className="space-y-1.5">
              <label htmlFor="reasoned-input" className="block text-xs font-bold text-muted uppercase tracking-wide">
                Reasoned engagement <span className="text-rose-500 font-bold">*</span>
              </label>
              <textarea
                id="reasoned-input"
                rows={3}
                disabled={props.isFinalized}
                value={reasonedNote}
                onChange={(e) => setReasonedNote(e.target.value)}
                placeholder="Name ONE specific data gap or dissenting council voice you weighed, and how it changed (or confirmed) your decision."
                className="w-full text-xs border border-border-line p-3.5 rounded-xl text-ink bg-surface-solid dark:bg-[#121620] placeholder-muted/60 focus:border-accent focus:ring-2 focus:ring-accent/10 outline-none resize-none disabled:bg-surface/30 disabled:opacity-60 disabled:cursor-not-allowed leading-relaxed transition-colors"
              />
              <p className="text-[10px] text-muted/80 leading-relaxed">
                Required so oversight is <strong className="text-ink">meaningful, not a rubber-stamp</strong> (Green, 2022). Finalize stays locked until you engage a specific gap or dissent.
              </p>
            </div>

            {/* Verification checklists */}
            <div className="p-4 bg-surface/30 dark:bg-[#121620]/30 border border-border-line rounded-xl space-y-3.5">
              <span className="block text-xs font-bold text-ink uppercase tracking-wide flex items-center gap-1.5 font-display">
                <CheckSquare className="w-4 h-4 text-accent" />
                Human Accountability Checklists (All Required)
              </span>

              <div className="space-y-2.5">
                {[
                  {
                    id: "check-gaps",
                    checked: checkDataGaps,
                    setter: setCheckDataGaps,
                    label: "I have reviewed search grounding data gaps and accept remaining uncertainty.",
                  },
                  {
                    id: "check-equity",
                    checked: checkEquity,
                    setter: setCheckEquity,
                    label: "I have matched the option against the community Equity & Risk Audit findings.",
                  },
                  {
                    id: "check-community",
                    checked: checkCommunity,
                    setter: setCheckCommunity,
                    label: "I have cross-referenced and considered qualitative feedback from the affected community.",
                  },
                ].map((chk) => (
                  <label
                    key={chk.id}
                    htmlFor={chk.id}
                    className="flex items-start gap-2.5 cursor-pointer text-xs text-ink/80 hover:text-ink select-none leading-tight"
                  >
                    <input
                      id={chk.id}
                      type="checkbox"
                      disabled={props.isFinalized}
                      checked={chk.checked}
                      onChange={(e) => chk.setter(e.target.checked)}
                      className="mt-0.5 rounded border-border-line text-accent accent-accent focus:ring-accent cursor-pointer"
                    />
                    <span>{chk.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Core Decision finalizers buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            {!props.isFinalized ? (
              <button
                id="finalize-decision-btn"
                type="submit"
                disabled={!isValid}
                className="flex-1 py-3 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-600/15 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 uppercase tracking-wider outline-none font-display focus:ring-2 focus:ring-emerald-500/20"
              >
                <ShieldCheck className="w-4 h-4" />
                Finalize Decision & Commit to memory
              </button>
            ) : (
              <>
                <button
                  id="download-brief-btn"
                  type="button"
                  onClick={props.onDownloadBrief}
                  className="flex-1 py-3 px-6 bg-gradient-to-r from-accent to-accent-2 hover:opacity-95 text-white font-semibold text-xs rounded-xl transition-all cursor-pointer shadow-lg shadow-accent/15 flex items-center justify-center gap-2 outline-none uppercase tracking-wider font-display"
                >
                  <Download className="w-4 h-4" />
                  Download printable decision brief
                </button>
                <button
                  id="start-new-decision-btn"
                  type="button"
                  onClick={props.onStartNew}
                  className="py-3 px-6 border border-border-line bg-surface-solid hover:bg-surface/50 text-ink font-semibold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 outline-none uppercase tracking-wider"
                >
                  <RotateCcw className="w-4 h-4 text-muted" />
                  Start new
                </button>
              </>
            )}
          </div>
        </form>

        {/* Right Aspect: Reviewer routing pools & Sandbox consoles (Col-span-1) */}
        <div className="space-y-5">
          
          {/* A. Routing Pool Configuration Card */}
          <div className="bg-surface/40 dark:bg-[#121620]/30 border border-border-line p-4 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-bold text-ink uppercase tracking-wider flex items-center gap-1.5 font-display">
                <Users className="w-4 h-4 text-accent" />
                Reviewer Routing Pool
              </h4>
              
              {!props.isFinalized && !isAddingReviewer && (
                <button
                  type="button"
                  onClick={() => setIsAddingReviewer(true)}
                  className="p-1 px-2 bg-accent/10 hover:bg-accent/20 border border-accent/20 text-accent text-[10px] font-bold rounded-lg flex items-center gap-0.5 cursor-pointer transition-colors"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              )}
            </div>

            {/* List existing reviewers */}
            {!isAddingReviewer ? (
              <div className="space-y-2.5">
                {props.reviewers.map((rev, idx) => {
                  const isSelected = props.selectedReviewerIndex === idx;
                  return (
                    <div
                      key={idx}
                      onClick={() => !props.isFinalized && props.onSelectReviewer(idx)}
                      className={`p-3 border rounded-xl flex items-center justify-between transition-all select-none duration-200 ${
                        isSelected
                          ? "bg-surface-solid dark:bg-[#11141D] border-accent shadow-md shadow-accent/5 ring-1 ring-accent"
                          : "bg-surface-solid hover:bg-surface/50 border-border-line"
                      } ${!props.isFinalized ? "cursor-pointer" : ""}`}
                    >
                      <div className="truncate flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-accent" : "bg-muted/40"}`} />
                          <h5 className="text-[11px] font-bold text-ink truncate">{rev.name}</h5>
                          <span className="text-[9px] font-mono font-bold bg-surface/80 dark:bg-surface/30 border border-border-line text-muted px-1.5 py-0.2 rounded">
                            {rev.channel}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted font-mono mt-1 pl-3.5 truncate">{rev.contactHandle}</p>
                        {rev.escalateTo && (
                          <p className="text-[9px] text-amber-500 italic mt-0.5 pl-3.5">
                            {"└ escalate ➜ "}{rev.escalateTo}{" after "}{rev.escalateAfter}{"h"}
                          </p>
                        )}
                      </div>

                      {!props.isFinalized && props.reviewers.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            props.onDeleteReviewer(idx);
                          }}
                          className="p-1.5 text-muted hover:text-red-500 hover:bg-red-500/10 cursor-pointer rounded-lg transition-colors shrink-0"
                          title="Delete profile"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              // Inline add profile form setup
              <form onSubmit={handleSaveReviewer} className="p-3 bg-surface-solid dark:bg-[#121620] border border-border-line rounded-xl space-y-3 text-[10px] animate-fadeIn">
                <span className="font-bold text-ink block text-[11px]">Create Reviewer Profile</span>
                
                <div className="space-y-1">
                  <label className="text-[9px] text-muted uppercase font-semibold">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Director Sterling"
                    value={newRevName}
                    onChange={(e) => setNewRevName(e.target.value)}
                    className="w-full border border-border-line bg-surface/20 p-1.5 px-2.5 rounded-lg text-ink outline-none focus:border-accent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] text-muted uppercase font-semibold">Channel</label>
                    <select
                      value={newRevChannel}
                      onChange={(e) => setNewRevChannel(e.target.value)}
                      className="w-full border border-border-line bg-surface-solid dark:bg-[#121620] text-ink p-1.5 px-2 rounded-lg outline-none focus:border-accent text-[10px]"
                    >
                      <option>Telegram</option>
                      <option>WhatsApp</option>
                      <option>Email</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-muted uppercase font-semibold">Contact Handle</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. @director"
                      value={newRevHandle}
                      onChange={(e) => setNewRevHandle(e.target.value)}
                      className="w-full border border-border-line bg-surface/20 p-1.5 px-2.5 rounded-lg text-ink outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] text-muted uppercase font-semibold">Backup Escalate To</label>
                    <input
                      type="text"
                      placeholder="e.g. Board Chair"
                      value={newRevEscalateTo}
                      onChange={(e) => setNewRevEscalateTo(e.target.value)}
                      className="w-full border border-border-line bg-surface/20 p-1.5 px-2.5 rounded-lg text-ink outline-none focus:border-accent"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-muted uppercase font-semibold">Delay threshold (h)</label>
                    <input
                      type="number"
                      min={1}
                      value={newRevEscalateAfter}
                      onChange={(e) => setNewRevEscalateAfter(e.target.value)}
                      className="w-full border border-border-line bg-surface/20 p-1.5 px-2.5 rounded-lg text-ink outline-none focus:border-accent font-mono"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-1 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsAddingReviewer(false)}
                    className="py-1 px-3 border border-border-line text-muted rounded-lg cursor-pointer font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="py-1 px-3 bg-accent text-white rounded-lg cursor-pointer font-semibold"
                  >
                    Save
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* B. Simulated Outer Webhooks Sandbox Console */}
          {props.notificationStatus && (
            <div id="sandbox-notifier-console" className="bg-[#11141D] text-slate-350 p-4 border border-border-line rounded-xl space-y-3 shadow-lg">
              <div className="flex items-center justify-between border-b border-border-line pb-25">
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-accent" />
                  dispatch sandbox output
                </span>

                <span className="text-[9px] font-bold text-muted font-mono">
                  {props.notificationStatus.time}
                </span>
              </div>

              <p className="text-[10px] leading-relaxed text-muted">
                Routed to <strong className="font-semibold text-slate-200">{props.notificationStatus.reviewerName}</strong> via <strong className="font-semibold text-accent">{props.notificationStatus.channel}</strong>.
                {props.notificationStatus.escalationNote && (
                  <span className="block text-amber-500 italic mt-0.5">
                    └ backup: {props.notificationStatus.escalationNote}
                  </span>
                )}
              </p>

              {/* JSON preview container block */}
              {props.notificationStatus.payloadPreview && (
                <div className="p-2.5 bg-black/45 rounded-lg relative overflow-x-auto max-h-[140px] border border-border-line">
                  <pre className="text-[9px] font-mono text-emerald-400 leading-normal select-text">
                    {JSON.stringify(props.notificationStatus.payloadPreview, null, 2)}
                  </pre>
                </div>
              )}

              {/* simulated notification helper disclosure */}
              {props.notificationStatus.simulated && (
                <p className="text-[9.5px] text-muted leading-normal italic bg-surface/5 p-2.5 border border-dashed border-border-line rounded-xl">
                  ℹ️ Webhook simulated delivery. Use the click action below to launch the lander screen simulating the reviewer view.
                </p>
              )}

              {/* Interactive landing test button */}
              <a
                href={props.notificationStatus.reviewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-1 text-[10px] font-mono font-bold bg-[#7C5CF0]/10 dark:bg-[#A48CFF]/10 text-[#7C5CF0] dark:text-[#A48CFF] hover:bg-accent/15 border border-[#7C5CF0]/25 dark:border-[#A48CFF]/20 py-2 rounded-lg cursor-pointer transition-all uppercase tracking-wider"
              >
                Launch Review Landing Link
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </div>
          )}

          {/* C. Pilot enhancement Inbound reply stub */}
          <div className="border border-border-line p-4 rounded-xl space-y-2 bg-surface/20 text-[10px] select-none">
            <span className="font-bold text-ink uppercase tracking-wide block font-display">
              Inbound 2-way callback (Pilot)
            </span>
            <p className="text-[9.5px] text-muted leading-normal leading-relaxed">
              Allows reviewers to approve or reject straight from WhatsApp/Telegram updates without opening the dashboard, using integrated inbound chat updates.
            </p>
            <div className="space-y-1 mt-1 shrink-0">
              <label className="text-[9px] text-muted uppercase font-semibold">Inbound Callback API</label>
              <input
                type="text"
                disabled
                value="https://api.civictas.org/v1/inbound/reply?key=sandbox-demo"
                className="w-full text-[9px] font-mono border border-border-line bg-surface/40 p-1.5 rounded-lg text-muted select-all outline-none"
              />
            </div>
            <span className="inline-block text-[9px] font-bold text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded font-mono">
              ★ PILOT SCHEDULER DEPLOYED
            </span>
          </div>

          {/* Core guardrails validation text */}
          <div className="flex gap-1.5 p-3 rounded-lg border border-border-line bg-surface/15 text-[10px] select-none leading-relaxed text-muted italic">
            <Info className="w-4 h-4 text-muted/60 shrink-0 mt-0.5" />
            <span>
              CIVICTAS Constraints: System channels route briefs only to speed up review actions. CIVICTAS never has permissions to trigger automated approvals; all final actions must be finalized by human credentials.
            </span>
          </div>

        </div>
      </div>
    </section>
  );
}
