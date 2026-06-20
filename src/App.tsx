import { useState, useEffect, useRef } from "react";
import { HelpCircle, FileText, Cpu, Sun, Moon, Check, ChevronDown, ChevronRight, PanelLeft, Activity } from "lucide-react";

import Sidebar from "./components/Sidebar";
import BrandMark from "./components/BrandMark";
import HowItWorksModal from "./components/HowItWorksModal";
import SetupPanel from "./components/SetupPanel";
import PipelinePanel from "./components/PipelinePanel";
import HumanReviewPanel from "./components/HumanReviewPanel";
import WorkspacePanel from "./components/WorkspacePanel";

import EmptyState from "./components/EmptyState";
import CouncilPanel, { ChannelStatus } from "./components/CouncilPanel";
import Landing from "./components/Landing";
import Onboarding from "./components/Onboarding";
import VoiceAgent from "./components/VoiceAgent";
import LedgerPanel from "./components/LedgerPanel";
import RealityPill from "./components/RealityPill";
import PipelineErrorAlert from "./components/PipelineErrorAlert";
import DecisionRecord from "./components/DecisionRecord";
import { DecisionMemoryItem, AgentState, DecisionConstraints, HumanDecisionType } from "./types";
import { downloadDecisionBrief, getConfidencePill, describePipelineFailure, PipelineFailure } from "./utils";
import { decodeRecord, encodeRecord, buildShareUrl, RECORD_PARAM, DecisionSource } from "./share";
import { useConfirm, useNotify } from "./dialog";

// Friendly labels for the five advisory agents, used when surfacing a failure.
const AGENT_LABELS: Record<number, string> = {
  1: "Agent 1 — Framing",
  2: "Agent 2 — Evidence base",
  3: "Agent 3 — Simulation",
  4: "Agent 4 — Audit",
  5: "Agent 5 — Plan brief",
};

/** Decision-maker preferences captured at onboarding (best-effort, optional). */
function readPreferences(): string {
  if (typeof localStorage === "undefined") return "";
  try {
    return localStorage.getItem("civictas_prefs") || "";
  } catch {
    return "";
  }
}

/**
 * Strip internal telemetry tags from an agent's raw stream before it is committed
 * to state. These tags ([METADATA_JSON:…] carries grounding sources, [MEMORY_NOTE:…]
 * marks past-decision influence) are parsed elsewhere and must never leak into the
 * visible brief, the PDF export, the ledger hash, or a share link.
 */
function cleanAgentOutput(raw: string): string {
  const metaIdx = raw.indexOf("[METADATA_JSON:");
  let out = metaIdx !== -1 ? raw.slice(0, metaIdx) : raw;
  out = out.replace(/\[MEMORY_NOTE:[^\]]*\]/g, "");
  return out.trim();
}

export default function App() {
  const confirm = useConfirm();
  const notify = useNotify();
  const [memoryItems, setMemoryItems] = useState<DecisionMemoryItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Shared decision record: if the URL carries ?record=, decode it once (defensively)
  // and render a read-only view. record===null means the param was present but invalid.
  const [sharedView] = useState<{ encoded: string; record: ReturnType<typeof decodeRecord> } | null>(() => {
    try {
      const raw = new URLSearchParams(window.location.search).get(RECORD_PARAM);
      if (!raw) return null;
      return { encoded: raw, record: decodeRecord(raw) };
    } catch {
      return null;
    }
  });

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("civictas_theme");
    if (saved) {
      return saved === "dark";
    }
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    const root = document.getElementById("civitas-root");
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
      if (root) root.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-theme", "light");
      if (root) root.classList.remove("dark");
    }
    localStorage.setItem("civictas_theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  // Surface which AI engine/model is actually running (transparency badge).
  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => {
        if (d?.engine) setEngine(d.engine);
      })
      .catch(() => {});
  }, []);

  // Reviewers states
  const [reviewers, setReviewers] = useState<Array<{
    name: string;
    channel: string;
    contactHandle: string;
    escalateTo: string;
    escalateAfter: string;
  }>>(() => {
    const saved = localStorage.getItem("civictas_reviewers");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      {
        name: "Dr. A. Mensah",
        channel: "Telegram",
        contactHandle: "@dr_mensah_civictas",
        escalateTo: "Director (Email)",
        escalateAfter: "2",
      }
    ];
  });

  const [selectedReviewerIndex, setSelectedReviewerIndex] = useState<number>(0);
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);

  const [notificationStatus, setNotificationStatus] = useState<{
    sent: boolean;
    simulated: boolean;
    time: string;
    channel: string;
    reviewerName: string;
    escalationNote: string;
    payloadPreview?: any;
    reviewLink: string;
  } | null>(null);

  const handleSelectReviewer = (index: number) => {
    setSelectedReviewerIndex(index);
  };

  const handleAddReviewer = (newReviewer: {
    name: string;
    channel: string;
    contactHandle: string;
    escalateTo: string;
    escalateAfter: string;
  }) => {
    const updated = [...reviewers, newReviewer];
    setReviewers(updated);
    localStorage.setItem("civictas_reviewers", JSON.stringify(updated));
  };

  const handleDeleteReviewer = (index: number) => {
    if (reviewers.length <= 1) {
      notify({ tone: "warning", message: "At least one reviewer profile must be maintained." });
      return;
    }
    const updated = reviewers.filter((_, idx) => idx !== index);
    setReviewers(updated);
    localStorage.setItem("civictas_reviewers", JSON.stringify(updated));
    if (selectedReviewerIndex >= updated.length) {
      setSelectedReviewerIndex(0);
    }
  };
  
  // App layouts states
  const [category, setCategory] = useState("Cooling centers (extreme heat)");
  const [situation, setSituation] = useState(
    "Riverside expects 20+ extreme-heat days this summer; a $300,000 budget can staff up to 4 cooling-center sites; last year two heat deaths occurred in the low-income Eastside, which has the least AC and transit; choose 4 sites that protect the most at-risk residents."
  );
  const [budget, setBudget] = useState("300000");
  const [sites, setSites] = useState("4");
  const [equityGoal, setEquityGoal] = useState("Prioritize heat-vulnerable, low-AC, low-transit neighborhoods");
  
  const [loadedTemplate, setLoadedTemplate] = useState<{
    category: string;
    situation: string;
    constraints: DecisionConstraints;
  } | null>(null);

  // Modal State
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);

  // Pipeline flow states
  const [isPipelineRunning, setIsPipelineRunning] = useState(false);
  const [isPipelineDone, setIsPipelineDone] = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);
  // Honest failure surface: set when an agent step throws so the UI shows the
  // real reason instead of silently reverting to the setup form.
  const [pipelineError, setPipelineError] = useState<PipelineFailure | null>(null);
  // True while a run uses the deterministic demo path (forced mock), so outputs
  // are labelled honestly as canned examples rather than live AI.
  const [ranInDemo, setRanInDemo] = useState(false);
  // True only once a real (non-demo, non-mock) agent response has streamed this
  // session. The engine badge stays an honest "Ready" until then — never a green
  // "Live" just because a key is configured (runs can still fall back to demo).
  const [hasLiveSuccess, setHasLiveSuccess] = useState(false);
  const [groundingSources, setGroundingSources] = useState<Array<{ title: string; url: string }>>([]);
  const [engine, setEngine] = useState<{ provider: string; model: string; search: boolean } | null>(null);
  const [channels, setChannels] = useState<ChannelStatus[]>([]);
  const [dataset, setDataset] = useState("");
  const [view, setView] = useState<"landing" | "onboarding" | "studio">(() =>
    typeof window !== "undefined" && localStorage.getItem("civictas_seen") ? "studio" : "landing"
  );

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile drawer; desktop rail is always docked
  const prevRunningRef = useRef(false);

  // After a fresh pipeline run finishes, spotlight the human decision gate.
  useEffect(() => {
    if (prevRunningRef.current && !isPipelineRunning && isPipelineDone) {
      document.getElementById("zone-decide")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    prevRunningRef.current = isPipelineRunning;
  }, [isPipelineRunning, isPipelineDone]);

  // States of individual agents (Steps 1 to 5)
  const [agentStates, setAgentStates] = useState<{
    1: AgentState;
    2: AgentState;
    3: AgentState;
    4: AgentState;
    5: AgentState;
  }>({
    1: { status: "queued", output: "" },
    2: { status: "queued", output: "" },
    3: { status: "queued", output: "" },
    4: { status: "queued", output: "" },
    5: { status: "queued", output: "" },
  });

  // Human inputs inside step 6
  const [humanDecisionType, setHumanDecisionType] = useState<HumanDecisionType | "">("");
  const [chosenOption, setChosenOption] = useState("");
  const [humanRationale, setHumanRationale] = useState("");
  const [checks, setChecks] = useState({
    dataGaps: false,
    equity: false,
    community: false,
  });

  // Default seed database records as instructed in Section 8
  const defaultSeeds: DecisionMemoryItem[] = [
    {
      id: "seed-1",
      createdAt: new Date("2026-05-18T10:00:00-07:00").toISOString(),
      decisionType: "Warming shelters (winter)",
      situation: "Riverside expects sub-zero blizzards this season. Budget is limited, needing warming hubs prioritized by heat/insulation indices rather than raw total count.",
      constraints: {
        budget: "120,000",
        sites: "3",
        equityGoal: "Prioritize highest-risk blocks over raw footfall",
      },
      aiRecommendation: "Option C: Vulnerability-Weighted Allocation warming centers",
      humanDecision: "approved_with_edits",
      chosenOption: "weighted to vulnerability index",
      humanRationale: "Equity board prioritized highest-risk blocks over total footfall.",
      checks: { dataGaps: true, equity: true, community: true },
      step1Output: `# Decision goal\nCoordinate warm emergency winter locations.\n# Candidate options\n- **Fixed shelter**\n- **Weight vulnerability scale**\n# Stakeholders affected\nElderly blocks & homeless neighborhoods.`,
      step4Output: `Recommended human check before acting: Survey local shelter capacity first.`,
      step5Output: `# Recommended option (proposal)\n**Option C: Vulnerability-Weighted warming spaces** (Confidence: High)\n# Top 3 reasons\n1. Target vulnerability\n2. Conserve operational capital\n3. Leverage community blocks`,
    },
    {
      id: "seed-2",
      createdAt: new Date("2026-06-02T14:30:00-07:00").toISOString(),
      decisionType: "Mobile health van routes",
      situation: "Deploy two diagnostics health vans to balance standard population outreach vs serving deep transit gaps across the marginalized valley.",
      constraints: {
        budget: "180,000",
        sites: "2",
        equityGoal: "Prioritize transit-poor zones and car-less residents",
      },
      aiRecommendation: "Option A: Rotate healthcare dispatch routes through transit-poor centers",
      humanDecision: "approved",
      chosenOption: "rotate through transit-poor zones",
      humanRationale: "Access for car-less residents outweighed raw population counts.",
      checks: { dataGaps: true, equity: true, community: true },
      step5Output: `# Recommended option (proposal)\n**Option A: Route rotation** (Confidence: Medium)`,
    },
  ];

  // Initialize LocalStorage Memory and Check for Deep Link parameters on mount
  useEffect(() => {
    let loadedMemory = defaultSeeds;
    const rawMemory = localStorage.getItem("civictas_memory");
    if (rawMemory) {
      try {
        loadedMemory = JSON.parse(rawMemory);
        setMemoryItems(loadedMemory);
      } catch (e) {
        setMemoryItems(defaultSeeds);
        localStorage.setItem("civictas_memory", JSON.stringify(defaultSeeds));
      }
    } else {
      setMemoryItems(defaultSeeds);
      localStorage.setItem("civictas_memory", JSON.stringify(defaultSeeds));
    }

    // Now inspect search query parameters for (?review=...) landing deep links
    const urlParams = new URLSearchParams(window.location.search);
    const reviewId = urlParams.get("review");
    if (reviewId) {
      // A. Load from completed memory if it matches
      const completedItem = loadedMemory.find((item) => item.id === reviewId);
      if (completedItem) {
        setSelectedItemId(reviewId);
        setCategory(completedItem.decisionType);
        setSituation(completedItem.situation);
        setBudget(completedItem.constraints.budget);
        setSites(completedItem.constraints.sites);
        setEquityGoal(completedItem.constraints.equityGoal);
        setGroundingSources(completedItem.groundingSources || []);
        
        setAgentStates({
          1: { status: "done", output: completedItem.step1Output || "" },
          2: { status: "done", output: completedItem.step2Output || "" },
          3: { status: "done", output: completedItem.step3Output || "" },
          4: { status: "done", output: completedItem.step4Output || "" },
          5: { status: "done", output: completedItem.step5Output || "" },
        });

        setHumanDecisionType(completedItem.humanDecision || "approved");
        setChosenOption(completedItem.chosenOption || "");
        setHumanRationale(completedItem.humanRationale || "");
        if (completedItem.checks) {
          setChecks(completedItem.checks);
        }
        
        setIsPipelineDone(true);
        setIsFinalized(true);
        setIsPipelineRunning(false);
        return;
      }

      // B. Load from drafts
      const rawDraft = localStorage.getItem(`civictas_draft_${reviewId}`);
      if (rawDraft) {
        try {
          const draft = JSON.parse(rawDraft);
          setCategory(draft.decisionType);
          setSituation(draft.situation);
          setBudget(draft.constraints.budget);
          setSites(draft.constraints.sites);
          setEquityGoal(draft.constraints.equityGoal);
          
          setAgentStates({
            1: { status: "done", output: draft.step1Output || "" },
            2: { status: "done", output: draft.step2Output || "" },
            3: { status: "done", output: draft.step3Output || "" },
            4: { status: "done", output: draft.step4Output || "" },
            5: { status: "done", output: draft.step5Output || "" },
          });
          
          setGroundingSources(draft.groundingSources || []);
          setHumanDecisionType(draft.humanDecision || "");
          setChosenOption(draft.chosenOption || "");
          setHumanRationale(draft.humanRationale || "");
          if (draft.checks) {
            setChecks(draft.checks);
          }
          
          setIsPipelineDone(true);
          setIsPipelineRunning(false);
          setIsFinalized(draft.isFinalized || false);

          const reviewerName = "Dr. A. Mensah";
          const channel = "Telegram";
          const revLink = `${window.location.origin}${window.location.pathname}?review=${reviewId}`;
          const confidence = getConfidencePill(draft.step5Output || "") || "High";
          let proposal = draft.decisionType;
          const match = draft.step5Output?.match(/Recommended option \(proposal\)\s+([^\n]+)/i);
          if (match) {
            proposal = match[1].trim();
          }

          setNotificationStatus({
            sent: true,
            simulated: true,
            time: "10:42 AM",
            channel: channel,
            reviewerName: reviewerName,
            escalationNote: "escalating to Director (Email) after 2h",
            payloadPreview: {
              decisionId: reviewId,
              title: draft.decisionType,
              proposal: proposal,
              confidence: confidence,
              reviewLink: revLink,
              reviewerName: reviewerName,
              channel: channel
            },
            reviewLink: revLink
          });

        } catch (e) {
          console.error("Failed loading draft state via deep link", e);
        }
      }
    }
  }, []);

  const triggerNotificationFlow = async (
    cat: string,
    sit: string,
    step5Output: string,
    draftId: string,
    pipelineOutputs: { step1: string; step2: string; step3: string; step4: string; step5: string }
  ) => {
    const currentDraftData = {
      id: draftId,
      createdAt: new Date().toISOString(),
      decisionType: cat,
      situation: sit,
      constraints: {
        budget,
        sites,
        equityGoal,
      },
      aiRecommendation: step5Output,
      humanDecision: "" as HumanDecisionType,
      chosenOption: "",
      humanRationale: "",
      checks: { dataGaps: false, equity: false, community: false },
      step1Output: pipelineOutputs.step1,
      step2Output: pipelineOutputs.step2,
      step3Output: pipelineOutputs.step3,
      step4Output: pipelineOutputs.step4,
      step5Output: pipelineOutputs.step5,
      groundingSources: groundingSources,
      isFinalized: false
    };

    localStorage.setItem(`civictas_draft_${draftId}`, JSON.stringify(currentDraftData));

    const reviewer = reviewers[selectedReviewerIndex] || reviewers[0];
    const reviewLink = `${window.location.origin}${window.location.pathname}?review=${draftId}`;
    
    const confidence = getConfidencePill(step5Output) || "High";
    let proposal = cat;
    const match = step5Output.match(/Recommended option \(proposal\)\s+([^\n]+)/i);
    if (match) {
      proposal = match[1].replace(/^\*\*|\*\*$/g, "").trim();
    } else {
      const match2 = step5Output.match(/###\s*Recommended\s*Option\s+([^\n]+)/i);
      if (match2) proposal = match2[1].replace(/^\*\*|\*\*$/g, "").trim();
    }

    const payload = {
      decisionId: draftId,
      title: cat,
      proposal: proposal,
      confidence: confidence,
      reviewLink: reviewLink,
      reviewerName: reviewer.name,
      channel: reviewer.channel,
    };

    try {
      const resp = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      setChannels(data.channels || []);

      setNotificationStatus({
        sent: true,
        simulated: !!data.simulated,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        channel: reviewer.channel,
        reviewerName: reviewer.name,
        escalationNote: reviewer.escalateTo ? `escalating to ${reviewer.escalateTo} after ${reviewer.escalateAfter}h` : "",
        payloadPreview: payload,
        reviewLink: reviewLink,
      });
    } catch (e) {
      console.error("Failed to post notify via API, running simulator mode", e);
      setNotificationStatus({
        sent: true,
        simulated: true,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        channel: reviewer.channel,
        reviewerName: reviewer.name,
        escalationNote: reviewer.escalateTo ? `escalating to ${reviewer.escalateTo} after ${reviewer.escalateAfter}h` : "",
        payloadPreview: payload,
        reviewLink: reviewLink,
      });
    }
  };

  // Save changes to LocalStorage when memoryItems changes
  const saveToLocalStorage = (updated: DecisionMemoryItem[]) => {
    setMemoryItems(updated);
    localStorage.setItem("civictas_memory", JSON.stringify(updated));
  };

  /**
   * Run the Agent Sequential Pipeline (Steps 1 through 5)
   */
  const handleRunPipeline = async (cat: string, sit: string, constr: DecisionConstraints, ds?: string, demo = false) => {
    if (isPipelineRunning) return;

    // Reset workflow statuses
    setCategory(cat);
    setSituation(sit);
    setBudget(constr.budget);
    setSites(constr.sites);
    setEquityGoal(constr.equityGoal);
    setSelectedItemId(null); // Deselect historical archive

    setIsPipelineRunning(true);
    setIsPipelineDone(false);
    setIsFinalized(false);
    setPipelineError(null);
    setRanInDemo(demo);
    setHasLiveSuccess(false);
    setGroundingSources([]);
    setChannels([]);
    setDataset(ds || "");
    setHumanDecisionType("");
    setChosenOption("");
    setHumanRationale("");
    setChecks({ dataGaps: false, equity: false, community: false });

    const initialStates: { 1: AgentState; 2: AgentState; 3: AgentState; 4: AgentState; 5: AgentState } = {
      1: { status: "queued", output: "" },
      2: { status: "queued", output: "" },
      3: { status: "queued", output: "" },
      4: { status: "queued", output: "" },
      5: { status: "queued", output: "" },
    };
    setAgentStates(initialStates);

    // Context Compilation (Top 3 Approved human entries)
    const approvedHistory = memoryItems.filter((i) => i.humanDecision !== "rejected");
    let memoryPromptContext = "No prior decisions yet.";
    if (approvedHistory.length > 0) {
      memoryPromptContext = approvedHistory
        .slice(0, 3)
        .map((item, idx) => {
          return `Prior Approved Case ${idx + 1}:
- Category: ${item.decisionType}
- Specific Situation: ${item.situation}
- Human Chosen Option: ${item.chosenOption}
- Human Rationale: ${item.humanRationale}`;
        })
        .join("\n\n");
    }

    // Track which step is in flight so a thrown error can name the right agent.
    let activeStep = 1;

    const executeStep = async (stepNum: number, currentOutputs: Record<string, string>): Promise<string> => {
      activeStep = stepNum;
      setAgentStates((prev) => ({
        ...prev,
        [stepNum]: { status: "running", output: "" },
      }));

      const res = await fetch(`/api/agent/${stepNum}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: cat,
          situation: sit,
          budget: constr.budget,
          sites: constr.sites,
          equityGoal: constr.equityGoal,
          memoryContext: memoryPromptContext,
          dataset: ds || "",
          demo,
          preferences: readPreferences(),
          previousOutputs: {
            step1: currentOutputs.step1,
            step2: currentOutputs.step2,
            step3: currentOutputs.step3,
            step4: currentOutputs.step4,
          },
        }),
      });

      if (!res.ok) {
        throw new Error(`Server execution failure: ${res.statusText}`);
      }

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error("Unable to establish chunked reader interface.");
      }

      const decoder = new TextDecoder();
      let stepAccumulator = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const textPart = decoder.decode(value, { stream: true });
        stepAccumulator += textPart;

        // Check for stream errors
        if (stepAccumulator.includes("[ERROR:")) {
          const match = stepAccumulator.match(/\[ERROR:\s*([^\]]+)\]/);
          if (match) {
            throw new Error(match[1]);
          }
        }

        // Try to filter telemetry metadata
        let displayText = stepAccumulator;
        const metaIndex = stepAccumulator.indexOf("[METADATA_JSON:");
        if (metaIndex !== -1) {
          displayText = stepAccumulator.substring(0, metaIndex);
          try {
            const parsedMetaMatch = stepAccumulator.match(/\[METADATA_JSON:\s*(\{[\s\S]*\})\s*\]/);
            if (parsedMetaMatch) {
              const parsed = JSON.parse(parsedMetaMatch[1]);
              if (parsed.sources) {
                setGroundingSources(parsed.sources);
              }
            }
          } catch (e) {
            // Wait for full buffer completion if truncated
          }
        }
        displayText = displayText.replace(/\[MEMORY_NOTE:[^\]]*\]/g, "");

        setAgentStates((prev) => ({
          ...prev,
          [stepNum]: { status: "running", output: displayText },
        }));
      }

      const finalOutput = cleanAgentOutput(stepAccumulator);
      setAgentStates((prev) => ({
        ...prev,
        [stepNum]: { status: "done", output: finalOutput },
      }));

      // A real step completed without error. If this was not a forced-demo run and
      // a live engine is configured, that is a genuine live response — only now may
      // the engine badge claim "Live".
      if (!demo && engine && engine.provider !== "mock" && finalOutput) {
        setHasLiveSuccess(true);
      }

      return finalOutput;
    };

    try {
      const runOutputs = { step1: "", step2: "", step3: "", step4: "", step5: "" };

      // Agent 1: Framing
      runOutputs.step1 = await executeStep(1, runOutputs);

      // Agent 2: Grounded Evidence
      runOutputs.step2 = await executeStep(2, runOutputs);

      // Agent 3: Timeline Projections Simulation
      runOutputs.step3 = await executeStep(3, runOutputs);

      // Agent 4: Accountability Audit
      runOutputs.step4 = await executeStep(4, runOutputs);

      // Agent 5: Transparency Recommendation summary
      runOutputs.step5 = await executeStep(5, runOutputs);

      setIsPipelineRunning(false);
      setIsPipelineDone(true);
      
      const draftId = `draft-${Date.now()}`;
      setActiveReviewId(draftId);
      await triggerNotificationFlow(cat, sit, runOutputs.step5, draftId, runOutputs);
    } catch (error: any) {
      // Expected, handled path (e.g. provider rate-limit) — surfaced in the UI
      // via PipelineErrorAlert, so log as a warning, not an error.
      console.warn("Pipeline step failed (surfaced to user):", error);
      setIsPipelineRunning(false);
      // Land the in-flight agent in "error" status so its card stays visible.
      setAgentStates((prev) => {
        const updated = { ...prev };
        for (const k of [1, 2, 3, 4, 5]) {
          if (updated[k as 1 | 2 | 3 | 4 | 5].status === "running") {
            updated[k as 1 | 2 | 3 | 4 | 5] = {
              status: "error",
              output: updated[k as 1 | 2 | 3 | 4 | 5].output,
              error: error.message || "Model failed to return stream output.",
            };
          }
        }
        return updated;
      });
      // Surface the real failure reason near the pipeline instead of resetting.
      setPipelineError(
        describePipelineFailure(error?.message ?? "", AGENT_LABELS[activeStep] ?? `Agent ${activeStep}`, activeStep)
      );
    }
  };

  /**
   * One-click sample run for first-time visitors (NotebookLM-style "try it").
   * Runs the seeded Riverside cooling-center decision so a judge sees a full
   * pipeline in one click — no setup required.
   */
  // One-click recovery from a live failure: re-run the whole pipeline through
  // the deterministic demo path so a judge always sees a complete result, with
  // the output clearly labelled as canned demo (never passed off as live).
  const handleDemoFallback = () => {
    setPipelineError(null);
    handleRunPipeline(category, situation, { budget, sites, equityGoal }, dataset, true);
  };

  const handleRunSample = () => {
    handleRunPipeline(
      "Cooling centers (extreme heat)",
      "Riverside, a mid-size city, expects 20+ extreme-heat days this summer. The health department has a $300,000 budget to open cooling centers and can staff up to 4 sites. Last year, two heat deaths occurred in the low-income Eastside, which has the fewest air-conditioned homes and the least transit access. We need to choose 4 locations that protect the most at-risk residents, not just the most people.",
      {
        budget: "300,000",
        sites: "4",
        equityGoal: "Prioritize heat-vulnerable, low-AC, low-transit neighborhoods",
      }
    );
  };

  /**
   * Target step retry method
   */
  const handleRetryAgent = async (stepNum: number) => {
    setIsPipelineRunning(true);
    setPipelineError(null);
    setAgentStates((prev) => {
      const updated = { ...prev };
      updated[stepNum as 1 | 2 | 3 | 4 | 5] = { status: "running", output: "" };
      for (let s = stepNum + 1; s <= 5; s++) {
        updated[s as 1 | 2 | 3 | 4 | 5] = { status: "queued", output: "" };
      }
      return updated;
    });

    const approvedHistory = memoryItems.filter((i) => i.humanDecision !== "rejected");
    let memoryPromptContext = "No prior decisions yet.";
    if (approvedHistory.length > 0) {
      memoryPromptContext = approvedHistory
        .slice(0, 3)
        .map((item, idx) => {
          return `Prior Approved Case ${idx + 1}:\n- Category: ${item.decisionType}\n- Situation: ${item.situation}\n- Chosen: ${item.chosenOption}\n- Rationale: ${item.humanRationale}`;
        })
        .join("\n\n");
    }

    // Only carry forward DONE outputs from steps BEFORE the retried one; steps
    // >= stepNum are being recomputed, so they must start empty (no stale feed).
    const done = (n: 1 | 2 | 3 | 4 | 5) =>
      stepNum > n && agentStates[n].status === "done" ? agentStates[n].output : "";
    const runOutputs = {
      step1: done(1),
      step2: done(2),
      step3: done(3),
      step4: done(4),
      step5: "",
    };

    let activeStep = stepNum;

    const executeStep = async (sNum: number, currentOutputs: typeof runOutputs): Promise<string> => {
      activeStep = sNum;
      setAgentStates((prev) => ({
        ...prev,
        [sNum]: { status: "running", output: "" },
      }));

      const res = await fetch(`/api/agent/${sNum}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          situation,
          budget,
          sites,
          equityGoal,
          memoryContext: memoryPromptContext,
          dataset,
          demo: ranInDemo,
          preferences: readPreferences(),
          previousOutputs: {
            step1: currentOutputs.step1,
            step2: currentOutputs.step2,
            step3: currentOutputs.step3,
            step4: currentOutputs.step4,
          },
        }),
      });

      if (!res.ok) throw new Error(`Execution error at step ${sNum}`);
      const reader = res.body?.getReader();
      if (!reader) throw new Error("Unable to establish chunked reader interface.");
      const decoder = new TextDecoder();
      let stepAccumulator = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const textPart = decoder.decode(value, { stream: true });
        stepAccumulator += textPart;

        if (stepAccumulator.includes("[ERROR:")) {
          const m = stepAccumulator.match(/\[ERROR:\s*([^\]]+)\]/);
          if (m) throw new Error(m[1]);
        }

        let displayText = stepAccumulator;
        const metaIndex = stepAccumulator.indexOf("[METADATA_JSON:");
        if (metaIndex !== -1) {
          displayText = stepAccumulator.substring(0, metaIndex);
          try {
            const parsedMetaMatch = stepAccumulator.match(/\[METADATA_JSON:\s*(\{[\s\S]*\})\s*\]/);
            if (parsedMetaMatch) {
              const parsed = JSON.parse(parsedMetaMatch[1]);
              if (parsed.sources) {
                setGroundingSources(parsed.sources);
              }
            }
          } catch (e) {}
        }
        displayText = displayText.replace(/\[MEMORY_NOTE:[^\]]*\]/g, "");

        setAgentStates((prev) => ({
          ...prev,
          [sNum]: { status: "running", output: displayText },
        }));
      }

      const finalOutput = cleanAgentOutput(stepAccumulator);
      setAgentStates((prev) => ({
        ...prev,
        [sNum]: { status: "done", output: finalOutput },
      }));
      if (!ranInDemo && engine && engine.provider !== "mock" && finalOutput) {
        setHasLiveSuccess(true);
      }

      return finalOutput;
    };

    try {
      for (let s = stepNum; s <= 5; s++) {
        runOutputs[`step${s}` as "step1" | "step2" | "step3" | "step4" | "step5"] = await executeStep(s, runOutputs);
      }
      setIsPipelineRunning(false);
      setIsPipelineDone(true);

      const draftId = activeReviewId || `draft-${Date.now()}`;
      if (!activeReviewId) setActiveReviewId(draftId);
      await triggerNotificationFlow(category, situation, runOutputs.step5, draftId, runOutputs);
    } catch (e: any) {
      console.error(e);
      setIsPipelineRunning(false);
      setAgentStates((prev) => {
        const updated = { ...prev };
        for (const k of [1, 2, 3, 4, 5]) {
          if (updated[k as 1 | 2 | 3 | 4 | 5].status === "running") {
            updated[k as 1 | 2 | 3 | 4 | 5] = {
              status: "error",
              output: updated[k as 1 | 2 | 3 | 4 | 5].output,
              error: e.message || "Operation failed during retry.",
            };
          }
        }
        return updated;
      });
      setPipelineError(
        describePipelineFailure(e?.message ?? "", AGENT_LABELS[activeStep] ?? `Agent ${activeStep}`, activeStep)
      );
    }
  };

  /**
   * Commit the human finalized choice to Decision Memory
   */
  const handleFinalizeDecision = (details: {
    decisionType: HumanDecisionType;
    chosenOption: string;
    humanRationale: string;
    checks: {
      dataGaps: boolean;
      equity: boolean;
      community: boolean;
    };
  }) => {
    setHumanDecisionType(details.decisionType);
    setChosenOption(details.chosenOption);
    setHumanRationale(details.humanRationale);
    setChecks(details.checks);
    setIsFinalized(true);

    const memoryItem: DecisionMemoryItem = {
      id: `saved-${Date.now()}`,
      createdAt: new Date().toISOString(),
      decisionType: category,
      situation,
      constraints: {
        budget,
        sites,
        equityGoal,
      },
      aiRecommendation: agentStates[5].output,
      humanDecision: details.decisionType,
      chosenOption: details.chosenOption,
      humanRationale: details.humanRationale,
      checks: details.checks,
      step1Output: agentStates[1].output,
      step2Output: agentStates[2].output,
      step3Output: agentStates[3].output,
      step4Output: agentStates[4].output,
      step5Output: agentStates[5].output,
      groundingSources: groundingSources,
    };

    const updated = [memoryItem, ...memoryItems];
    saveToLocalStorage(updated);
  };

  /**
   * Reset / Start New Decision workflow
   */
  const handleResetWorkflow = () => {
    setLoadedTemplate(null);
    setSelectedItemId(null);
    setIsPipelineRunning(false);
    setIsPipelineDone(false);
    setIsFinalized(false);
    setPipelineError(null);
    setRanInDemo(false);
    setGroundingSources([]);
    setHumanDecisionType("");
    setChosenOption("");
    setHumanRationale("");
    setChecks({ dataGaps: false, equity: false, community: false });
    
    // Reseed the default sample scenario so "New Decision" never lands on a
    // dead/blank screen — a fresh visitor always sees a runnable example.
    setCategory("Cooling centers (extreme heat)");
    setSituation(
      "Riverside, a mid-size city, expects 20+ extreme-heat days this summer. The health department has a $300,000 budget to open cooling centers and can staff up to 4 sites. Last year, two heat deaths occurred in the low-income Eastside, which has the fewest air-conditioned homes and the least transit access. We need to choose 4 locations that protect the most at-risk residents, not just the most people."
    );
    setBudget("300,000");
    setSites("4");
    setEquityGoal("Prioritize heat-vulnerable, low-AC, low-transit neighborhoods");

    setAgentStates({
      1: { status: "queued", output: "" },
      2: { status: "queued", output: "" },
      3: { status: "queued", output: "" },
      4: { status: "queued", output: "" },
      5: { status: "queued", output: "" },
    });
  };

  /**
   * Load historical item read-only
   */
  const handleSelectItem = (id: string) => {
    setSelectedItemId(id);
    setPipelineError(null);
    setRanInDemo(false);
    const item = memoryItems.find((p) => p.id === id);
    if (!item) return;

    // Load pipeline simulation parameters and output briefs visually
    setCategory(item.decisionType);
    setSituation(item.situation);
    setBudget(item.constraints.budget);
    setSites(item.constraints.sites);
    setEquityGoal(item.constraints.equityGoal);
    
    if (item.groundingSources) {
      setGroundingSources(item.groundingSources);
    } else {
      setGroundingSources([]);
    }

    setAgentStates({
      1: { status: "done", output: item.step1Output || "" },
      2: { status: "done", output: item.step2Output || "Grounding sources not logged under index history." },
      3: { status: "done", output: item.step3Output || "" },
      4: { status: "done", output: item.step4Output || "" },
      5: { status: "done", output: item.step5Output || "" },
    });

    setHumanDecisionType(item.humanDecision || "approved");
    setChosenOption(item.chosenOption || "");
    setHumanRationale(item.humanRationale || "");
    if (item.checks) {
      setChecks(item.checks);
    }
    
    setIsPipelineDone(true);
    setIsFinalized(true);
    setIsPipelineRunning(false);
  };

  /**
   * Reuse historical item as template to modify or duplicate decision
   */
  const handleReuseTemplate = (item: DecisionMemoryItem) => {
    setLoadedTemplate({
      category: item.decisionType,
      situation: item.situation,
      constraints: {
        budget: item.constraints.budget,
        sites: item.constraints.sites,
        equityGoal: item.constraints.equityGoal,
      },
    });
    
    // Clear pipeline states to allow re-running with this configuration
    setIsPipelineDone(false);
    setIsFinalized(false);
    setPipelineError(null);
    setRanInDemo(false);
    setSelectedItemId(null);
    setHumanDecisionType("");
    setChosenOption("");
    setHumanRationale("");
    setAgentStates({
      1: { status: "queued", output: "" },
      2: { status: "queued", output: "" },
      3: { status: "queued", output: "" },
      4: { status: "queued", output: "" },
      5: { status: "queued", output: "" },
    });
  };

  /**
   * Clear all decisions memory except seeds
   */
  const handleClearMemory = async () => {
    const ok = await confirm({
      title: "Clear Decision Memory?",
      body: "This permanently deletes your saved decision history. This action cannot be undone.",
      confirmLabel: "Clear memory",
      cancelLabel: "Keep history",
      tone: "danger",
    });
    if (ok) {
      saveToLocalStorage([]);
      handleResetWorkflow();
    }
  };

  /**
   * Handle download brief triggering
   */
  const triggerDownloadBrief = () => {
    const activeConfidence = getConfidencePill(agentStates[5].output) || "High";
    
    downloadDecisionBrief({
      category,
      situation,
      budget,
      sites,
      equityGoal,
      aiRecommendation: agentStates[5].output || "Review Agent 5 details.",
      confidence: activeConfidence,
      humanDecision: humanDecisionType || "Approved",
      chosenOption: chosenOption || category,
      humanRationale: humanRationale || "None provided under this oversight run.",
      timestamp: new Date().toLocaleString(),
      riskNote: agentStates[4].output.substring(0, 400) + "...",
      fullAgentOutputs: {
        step1: agentStates[1].output,
        step2: agentStates[2].output,
        step3: agentStates[3].output,
        step4: agentStates[4].output,
        step5: agentStates[5].output,
      }
    });
  };

  // Extract recommended choice headline from Agent 5 text
  const extractRecommendationValue = () => {
    const text = agentStates[5].output;
    if (!text) return "";
    const lines = text.split("\n");
    // Look for lines that start with bold options or lists containing Candidate labels
    const match = text.match(/# Recommended option\s+([^\n]+)/i);
    if (match) {
      return match[1].trim();
    }
    const optionMatch = text.match(/Recommended option \(proposal\)\s+([^\n]+)/i);
    if (optionMatch) {
      return optionMatch[1].trim();
    }
    // Honest fallback: derive from the brief's first substantive line — never a
    // hardcoded literal (that would fabricate a recommendation the AI never made).
    const firstLine = text
      .split("\n")
      .map((l) => l.replace(/^[#>*\-\s]+/, "").trim())
      .find((l) => l.length > 8);
    return firstLine || "";
  };

  /**
   * Build a shareable read-only link for the current finalized decision.
   * Returns { url: null } when the record is too large to encode — in that case
   * the printable PDF brief is downloaded instead (honest, lossless fallback).
   */
  const buildRecordLink = (): { url: string | null; trimmed: boolean } => {
    const source: DecisionSource = {
      createdAt: new Date().toISOString(),
      category,
      situation,
      constraints: { budget, sites, equityGoal },
      recommendation: extractRecommendationValue(),
      confidence: getConfidencePill(agentStates[5].output) || "High",
      humanDecision: humanDecisionType || "approved",
      chosenOption: chosenOption || category,
      humanRationale: humanRationale || "",
      checks,
      aiBrief: agentStates[5].output || "",
      agentLog: {
        step1: agentStates[1].output,
        step2: agentStates[2].output,
        step3: agentStates[3].output,
        step4: agentStates[4].output,
      },
    };

    const result = encodeRecord(source);
    if (!result) {
      // Too large for a link — fall back to the existing PDF export, honestly.
      triggerDownloadBrief();
      return { url: null, trimmed: false };
    }
    return { url: buildShareUrl(result.encoded), trimmed: result.trimmed };
  };

  // A shared ?record= link renders the read-only record view for anyone, before
  // the landing / onboarding / studio flow.
  if (sharedView) {
    return <DecisionRecord record={sharedView.record} encoded={sharedView.encoded} />;
  }

  if (view === "landing") {
    return <Landing onEnter={() => setView("onboarding")} engine={engine} />;
  }
  if (view === "onboarding") {
    return (
      <Onboarding
        onDone={() => {
          try {
            localStorage.setItem("civictas_seen", "1");
          } catch {
            /* ignore */
          }
          setView("studio");
        }}
      />
    );
  }

  const workflowStage = isFinalized ? 3 : isPipelineDone && !isPipelineRunning ? 2 : isPipelineRunning ? 1 : 0;

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col font-sans transition-colors duration-300 relative overflow-hidden" id="civitas-root">

      {/* Skip to main content (WCAG 2.4.1) */}
      <a
        href="#decision-workspace"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-accent focus:text-on-accent focus:rounded-lg focus:text-sm focus:font-semibold"
      >
        Skip to main content
      </a>

      {/* Calm, flat background. In dark mode only, one barely-there static glow. */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 hidden dark:block" aria-hidden="true">
        <div className="absolute top-[10%] left-[20%] w-[40vw] h-[40vw] rounded-full bg-accent/10 blur-[140px]" />
      </div>

      {/* Top navigation */}
      <header
        id="top-navigation"
        className="h-16 border-b border-border-line bg-surface-solid sticky top-0 z-40 flex items-center justify-between px-4 md:px-6 select-none transition-colors duration-300"
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile: open the Decisions drawer (desktop keeps the docked rail) */}
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open decisions panel"
            aria-expanded={sidebarOpen}
            aria-controls="decision-memory-sidebar"
            className="md:hidden h-9 w-9 -ml-1 grid place-items-center rounded-lg border border-border-line text-muted hover:text-ink hover:bg-surface-2 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            <PanelLeft className="w-4 h-4" aria-hidden="true" />
          </button>
          {/* Brand mark doubles as "home" — returns to the landing page so the
              flow loops (home → onboarding → studio → home). */}
          <button
            type="button"
            onClick={() => setView("landing")}
            aria-label="CIVICTAS — back to home"
            title="Back to home"
            className="flex items-center gap-3 min-w-0 text-left -m-1 p-1 rounded-lg hover:opacity-80 transition-opacity cursor-pointer focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            <BrandMark className="w-9 h-9 shrink-0 text-ink" />
            <span className="min-w-0">
              <span className="block text-[17px] leading-none font-display font-semibold tracking-tight text-ink" id="civitas-brand">
                CIVICTAS
              </span>
              <span className="block text-[10px] text-muted font-medium mt-1 tracking-wide truncate">Community Decision Copilot</span>
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {engine && (
            <span className="hidden sm:inline-flex items-center gap-1.5">
              <span
                className="inline-flex items-center gap-1.5 text-[10px] font-mono whitespace-nowrap bg-accent-soft text-accent font-semibold px-2.5 py-1 rounded-full border border-accent/20"
                aria-label={`AI engine: ${engine.provider} ${engine.model}`}
              >
                <Cpu className="w-3 h-3 shrink-0" aria-hidden="true" />
                {engine.provider} · {engine.model}
              </span>
              <RealityPill
                kind={engine.provider === "mock" ? "mock" : hasLiveSuccess ? "live" : "ready"}
                pulse={hasLiveSuccess}
                title={
                  engine.provider === "mock"
                    ? "Offline demo mock — no API key configured"
                    : hasLiveSuccess
                    ? "A live model response has streamed this session (Gemini adds Google Search grounding; other providers reason over labeled benchmarks)"
                    : "A live model is configured but no live run has completed yet — runs may fall back to a clearly labeled demo"
                }
              />
            </span>
          )}

          <span className="hidden lg:inline-flex items-center text-[10px] font-mono whitespace-nowrap bg-surface-2 text-muted font-semibold px-2.5 py-1 rounded-full border border-border-line">
            AI-assisted · Human-decided
          </span>

          {/* Theme toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="h-8 w-8 grid place-items-center border border-border-line hover:bg-surface-2 text-muted hover:text-ink rounded-lg transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            aria-label={isDarkMode ? "Switch to light theme" : "Switch to dark theme"}
          >
            {isDarkMode ? <Sun className="w-4 h-4" aria-hidden="true" /> : <Moon className="w-4 h-4" aria-hidden="true" />}
          </button>

          <button
            id="how-it-works-trigger"
            onClick={() => setIsHowItWorksOpen(true)}
            className="inline-flex items-center gap-1.5 h-8 px-3 border border-border-line bg-surface hover:bg-surface-2 text-xs font-semibold rounded-lg text-ink cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            <HelpCircle className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
            <span className="hidden sm:inline">How it works</span>
          </button>
        </div>
      </header>

      {/* Main Structural body wrapper split into Sidebar and Workspace */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 relative z-10">
        {/* Mobile drawer scrim — tap to dismiss (no effect on desktop dock) */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}
        {/* Decision memory rail — docked on desktop, off-canvas drawer on mobile */}
        <Sidebar
          memoryItems={memoryItems}
          selectedItemId={selectedItemId}
          onSelectItem={handleSelectItem}
          onNewDecision={handleResetWorkflow}
          onClearMemory={handleClearMemory}
          onReuseTemplate={handleReuseTemplate}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Right scrolling workspace container */}
        <main
          id="decision-workspace"
          className="flex-1 overflow-y-auto max-w-5xl mx-auto w-full relative z-10"
        >
          {/* Sticky progress rail */}
          <nav
            aria-label="Decision progress"
            className="sticky top-0 z-20 bg-surface-solid border-b border-border-line px-4 md:px-8 py-2.5"
          >
            <ol className="flex items-center gap-0.5 text-xs font-semibold overflow-x-auto">
              {[
                { label: "Inputs", anchor: "zone-inputs", exists: true },
                { label: "AI advisory", anchor: "zone-advisory", exists: isPipelineRunning || isPipelineDone || !!pipelineError },
                { label: "Decision", anchor: "zone-decide", exists: isPipelineDone },
                { label: "Record", anchor: "zone-record", exists: true },
              ].map((s, i) => {
                const state = i < workflowStage ? "done" : i === workflowStage ? "current" : "todo";
                const dot = (
                  <span
                    className={`grid place-items-center w-4 h-4 rounded-full text-[9px] font-mono shrink-0 ${
                      state === "current"
                        ? "bg-on-accent/25"
                        : state === "done"
                        ? "bg-accent/15 text-accent"
                        : "bg-surface-2 text-faint"
                    }`}
                  >
                    {state === "done" ? <Check className="w-2.5 h-2.5" aria-hidden="true" /> : i + 1}
                  </span>
                );
                return (
                  <li key={s.anchor} className="flex items-center shrink-0">
                    {s.exists ? (
                      <a
                        href={`#${s.anchor}`}
                        aria-current={state === "current" ? "step" : undefined}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 ${
                          state === "current"
                            ? "bg-accent text-on-accent"
                            : state === "done"
                            ? "text-accent hover:bg-accent-soft"
                            : "text-muted hover:bg-surface-2"
                        }`}
                      >
                        {dot}
                        {s.label}
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-faint">
                        {dot}
                        {s.label}
                      </span>
                    )}
                    {i < 3 && <ChevronRight className="w-3 h-3 text-faint shrink-0" aria-hidden="true" />}
                  </li>
                );
              })}
            </ol>
          </nav>

          <div className="p-4 md:p-8 space-y-10">
            {/* Read-only history banner */}
            {selectedItemId && (
              <div className="p-4 bg-surface border border-border-line rounded-2xl flex items-center justify-between gap-3 shadow-sm" id="history-details-banner">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="w-5 h-5 text-accent shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-ink uppercase tracking-wider font-display">
                      Viewing historical decision archive
                    </h3>
                    <p className="text-xs text-muted mt-0.5 font-medium">
                      Read-only memory parameters. Use 'Use template' in the sidebar, or reset to run a new simulation.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleResetWorkflow}
                  className="shrink-0 text-xs py-1.5 px-3.5 bg-surface hover:bg-surface-2 text-ink font-semibold rounded-lg border border-border-line transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                >
                  Start new
                </button>
              </div>
            )}

            {/* Zone 1 — Inputs */}
            <section id="zone-inputs" aria-labelledby="zone-inputs-h" className="scroll-mt-16 space-y-4">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-xs text-faint">01</span>
                <h2 id="zone-inputs-h" className="font-display text-xl font-semibold tracking-tight text-ink">Inputs</h2>
                <span className="text-xs text-muted hidden sm:block">Frame the decision and its constraints</span>
              </div>
              <SetupPanel
                isPipelineRunning={isPipelineRunning}
                isPipelineDone={isPipelineDone}
                onRunPipeline={handleRunPipeline}
                onReset={handleResetWorkflow}
                loadedTemplate={loadedTemplate}
              />
              {!isPipelineRunning && !isPipelineDone && !selectedItemId && !pipelineError && (
                <EmptyState onRunSample={handleRunSample} />
              )}
            </section>

            {/* Zone 2 — AI advisory */}
            {(isPipelineRunning || isPipelineDone || pipelineError) && (
              <section id="zone-advisory" aria-labelledby="zone-advisory-h" className="scroll-mt-16 space-y-4">
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-xs text-faint">02</span>
                  <h2 id="zone-advisory-h" className="font-display text-xl font-semibold tracking-tight text-ink">AI advisory</h2>
                  <span className="text-xs text-muted hidden sm:block">Five agents advise; a 108-persona council stress-tests</span>
                </div>
                {pipelineError && (
                  <PipelineErrorAlert
                    failure={pipelineError}
                    onRetry={handleRetryAgent}
                    onDemoFallback={handleDemoFallback}
                    onDismiss={() => setPipelineError(null)}
                    isPipelineRunning={isPipelineRunning}
                  />
                )}
                {ranInDemo && (isPipelineRunning || isPipelineDone) && (
                  <div className="flex items-start gap-2.5 bg-warning/10 border border-warning/30 rounded-2xl p-3 md:p-3.5">
                    <RealityPill kind="mock" label="Demo mode" />
                    <p className="text-xs text-ink leading-relaxed min-w-0">
                      Outputs below are <strong>canned demo examples</strong>, not live AI — shown
                      because the live model was unavailable or demo mode was requested. Add a Gemini
                      or Groq key to run the real pipeline.
                    </p>
                  </div>
                )}
                <PipelinePanel
                  outputs={{
                    step1: agentStates[1].output,
                    step2: agentStates[2].output,
                    step3: agentStates[3].output,
                    step4: agentStates[4].output,
                    step5: agentStates[5].output,
                  }}
                  agentStates={agentStates}
                  onRetryAgent={handleRetryAgent}
                  groundingSources={groundingSources}
                />
                <CouncilPanel
                  active={isPipelineDone && !isPipelineRunning}
                  category={category}
                  situation={situation}
                  equityGoal={equityGoal}
                  recommendation={extractRecommendationValue()}
                  channels={channels}
                  demo={ranInDemo}
                />
              </section>
            )}

            {/* Zone 3 — Decision */}
            {(isPipelineDone || isFinalized) && (
              <section id="zone-decide" aria-labelledby="zone-decide-h" className="scroll-mt-16 space-y-4">
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-xs text-faint">03</span>
                  <h2 id="zone-decide-h" className="font-display text-xl font-semibold tracking-tight text-ink">Decision</h2>
                  <span className="text-xs text-muted hidden sm:block">A human reviews, reasons, and signs off</span>
                </div>
                <HumanReviewPanel
                  isPipelineDone={isPipelineDone && !isPipelineRunning}
                  recommendedOption={extractRecommendationValue()}
                  isFinalized={isFinalized}
                  onFinalize={handleFinalizeDecision}
                  onStartNew={handleResetWorkflow}
                  onDownloadBrief={triggerDownloadBrief}
                  onBuildRecordLink={buildRecordLink}
                  reviewers={reviewers}
                  selectedReviewerIndex={selectedReviewerIndex}
                  onSelectReviewer={handleSelectReviewer}
                  onAddReviewer={handleAddReviewer}
                  onDeleteReviewer={handleDeleteReviewer}
                  notificationStatus={notificationStatus}
                />
              </section>
            )}

            {/* Zone 4 — Record */}
            <section id="zone-record" aria-labelledby="zone-record-h" className="scroll-mt-16 space-y-4">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-xs text-faint">04</span>
                <h2 id="zone-record-h" className="font-display text-xl font-semibold tracking-tight text-ink">Record</h2>
                <span className="text-xs text-muted hidden sm:block">Tamper-evident ledger and decision memory</span>
              </div>
              <LedgerPanel items={memoryItems} />

              {isPipelineDone && !isPipelineRunning && (
                <div className="border border-border-line rounded-2xl bg-surface overflow-hidden">
                  <button
                    onClick={() => setShowAdvanced((s) => !s)}
                    aria-expanded={showAdvanced}
                    aria-controls="advanced-tools"
                    className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-semibold text-ink hover:bg-surface-2 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
                  >
                    <span>Advanced — voice review &amp; Workspace export</span>
                    <ChevronDown className={`w-4 h-4 text-muted transition-transform ${showAdvanced ? "rotate-180" : ""}`} aria-hidden="true" />
                  </button>
                  {showAdvanced && (
                    <div id="advanced-tools" className="px-5 pb-5 pt-1 space-y-6 border-t border-border-line">
                      {/* Harness trace — real run state from agentStates + engine + grounding.
                          No synthetic latency/token numbers: unknown fields show "—". */}
                      <div className="bg-surface-solid border border-border-line rounded-2xl p-5">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <h3 className="text-xs font-bold text-muted uppercase tracking-widest flex items-center gap-2">
                            <Activity className="w-3.5 h-3.5" aria-hidden="true" />
                            Harness trace
                          </h3>
                          {ranInDemo ? (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-muted">
                              demo · demo-mock
                              <RealityPill kind="mock" title="Deterministic demo outputs (canned), not live AI" />
                            </span>
                          ) : engine ? (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-muted">
                              {engine.provider} · {engine.model}
                              <RealityPill
                                kind={engine.provider === "mock" ? "mock" : hasLiveSuccess ? "live" : "ready"}
                                pulse={hasLiveSuccess}
                                title={
                                  engine.provider === "mock"
                                    ? "Offline demo mock"
                                    : hasLiveSuccess
                                    ? "A live model response has streamed this session"
                                    : "Live model configured; no live run completed yet"
                                }
                              />
                            </span>
                          ) : (
                            <RealityPill kind="unavailable" title="Engine status unknown" />
                          )}
                        </div>

                        <div className="mt-3 overflow-hidden rounded-xl border border-border-line">
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-2 text-[9px] font-mono font-bold uppercase tracking-wider text-faint">
                            <span className="w-4 shrink-0">#</span>
                            <span className="flex-1 min-w-0">Agent</span>
                            <span className="hidden sm:block w-[96px] shrink-0">Model</span>
                            <span
                              className="w-12 shrink-0 text-center"
                              title="Output returned (non-empty, telemetry-stripped). Not a correctness guarantee — CIVICTAS does not auto-validate agent reasoning."
                            >
                              Output
                            </span>
                            <span className="w-10 shrink-0 text-center">Src</span>
                            <span className="w-16 shrink-0 text-right">Status</span>
                          </div>
                          {([1, 2, 3, 4, 5] as const).map((n) => {
                            const stt = agentStates[n].status;
                            const out = agentStates[n].output.trim();
                            const val = stt === "done" && out ? "ok" : stt === "error" ? "fail" : "—";
                            const valCls =
                              val === "ok" ? "text-positive" : val === "fail" ? "text-danger" : "text-faint";
                            const statusCls =
                              stt === "done"
                                ? "text-positive"
                                : stt === "running"
                                ? "text-accent"
                                : stt === "error"
                                ? "text-danger"
                                : "text-faint";
                            const src = n === 2 ? String(groundingSources.length) : "—";
                            return (
                              <div
                                key={n}
                                className="flex items-center gap-2 px-3 py-2 border-t border-border-line bg-surface text-[11px]"
                              >
                                <span className="w-4 shrink-0 font-mono text-faint">{n}</span>
                                <span className="flex-1 min-w-0 truncate font-medium text-ink">
                                  {["Framing", "Evidence", "Simulation", "Equity & risk", "Brief"][n - 1]}
                                </span>
                                <span className="hidden sm:block w-[96px] shrink-0 font-mono text-muted truncate">
                                  {ranInDemo ? "demo-mock" : (engine?.model ?? "—")}
                                </span>
                                <span className={`w-12 shrink-0 text-center font-mono ${valCls}`}>{val}</span>
                                <span className="w-10 shrink-0 text-center font-mono text-muted">{src}</span>
                                <span className={`w-16 shrink-0 text-right font-mono font-semibold ${statusCls}`}>
                                  {stt}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        <p className="text-[10px] text-faint mt-2.5 leading-relaxed">
                          Real run state — validation means the agent returned structured output; sources come
                          from the Evidence step's grounding. No synthetic latency or token counts.
                        </p>
                      </div>

                      <VoiceAgent proposal={extractRecommendationValue()} />
                      <WorkspacePanel
                        category={category}
                        situation={situation}
                        budget={budget}
                        sites={sites}
                        equityGoal={equityGoal}
                        outputs={{
                          step1: agentStates[1].output,
                          step2: agentStates[2].output,
                          step3: agentStates[3].output,
                          step4: agentStates[4].output,
                          step5: agentStates[5].output,
                        }}
                        isPipelineDone={isPipelineDone}
                        humanDecision={humanDecisionType}
                        chosenOption={chosenOption}
                        humanRationale={humanRationale}
                      />
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>

      {/* Accessible visual document modal popup */}
      <HowItWorksModal isOpen={isHowItWorksOpen} onClose={() => setIsHowItWorksOpen(false)} />

      {/* Footer */}
      <footer
        id="civitas-footer"
        role="contentinfo"
        className="bg-surface-solid border-t border-border-line py-4 text-center text-[11px] text-muted transition-colors"
      >
        <span className="font-medium">
          CIVICTAS · AI advises, a human decides · Built for the USAII Global AI Hackathon 2026
        </span>
      </footer>
    </div>
  );
}
