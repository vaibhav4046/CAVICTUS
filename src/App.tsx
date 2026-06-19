import { useState, useEffect } from "react";
import { Sparkles, HelpCircle, FileText, ChevronRight, CheckCircle, Flame, GraduationCap, ArrowUpRight, Scale } from "lucide-react";

import Sidebar from "./components/Sidebar";
import HowItWorksModal from "./components/HowItWorksModal";
import SetupPanel from "./components/SetupPanel";
import PipelinePanel from "./components/PipelinePanel";
import HumanReviewPanel from "./components/HumanReviewPanel";
import WorkspacePanel from "./components/WorkspacePanel";

import EmptyState from "./components/EmptyState";
import { DecisionMemoryItem, AgentState, DecisionConstraints, HumanDecisionType } from "./types";
import { downloadDecisionBrief, getConfidencePill } from "./utils";

export default function App() {
  const [memoryItems, setMemoryItems] = useState<DecisionMemoryItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

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
      alert("At least one reviewer profile must be maintained.");
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
  const [groundingSources, setGroundingSources] = useState<Array<{ title: string; url: string }>>([]);

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
  const handleRunPipeline = async (cat: string, sit: string, constr: DecisionConstraints) => {
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
    setGroundingSources([]);
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

    const executeStep = async (stepNum: number, currentOutputs: Record<string, string>): Promise<string> => {
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
            const parsedMetaMatch = stepAccumulator.match(/\[METADATA_JSON:\s*([^\]]+)\]/);
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

        setAgentStates((prev) => ({
          ...prev,
          [stepNum]: { status: "running", output: displayText },
        }));
      }

      setAgentStates((prev) => ({
        ...prev,
        [stepNum]: { status: "done", output: stepAccumulator },
      }));

      return stepAccumulator;
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
      triggerNotificationFlow(cat, sit, runOutputs.step5, draftId, runOutputs);
    } catch (error: any) {
      console.error("Workflow interruption:", error);
      setIsPipelineRunning(false);
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
    }
  };

  /**
   * One-click sample run for first-time visitors (NotebookLM-style "try it").
   * Runs the seeded Riverside cooling-center decision so a judge sees a full
   * pipeline in one click — no setup required.
   */
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

    const runOutputs = {
      step1: agentStates[1].status === "done" ? agentStates[1].output : "",
      step2: agentStates[2].status === "done" ? agentStates[2].output : "",
      step3: agentStates[3].status === "done" ? agentStates[3].output : "",
      step4: agentStates[4].status === "done" ? agentStates[4].output : "",
      step5: agentStates[5].status === "done" ? agentStates[5].output : "",
    };

    const executeStep = async (sNum: number, currentOutputs: typeof runOutputs): Promise<string> => {
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
            const parsedMetaMatch = stepAccumulator.match(/\[METADATA_JSON:\s*([^\]]+)\]/);
            if (parsedMetaMatch) {
              const parsed = JSON.parse(parsedMetaMatch[1]);
              if (parsed.sources) {
                setGroundingSources(parsed.sources);
              }
            }
          } catch (e) {}
        }

        setAgentStates((prev) => ({
          ...prev,
          [sNum]: { status: "running", output: displayText },
        }));
      }

      setAgentStates((prev) => ({
        ...prev,
        [sNum]: { status: "done", output: stepAccumulator },
      }));

      return stepAccumulator;
    };

    try {
      for (let s = stepNum; s <= 5; s++) {
        runOutputs[`step${s}` as "step1" | "step2" | "step3" | "step4" | "step5"] = await executeStep(s, runOutputs);
      }
      setIsPipelineRunning(false);
      setIsPipelineDone(true);

      const draftId = activeReviewId || `draft-${Date.now()}`;
      if (!activeReviewId) setActiveReviewId(draftId);
      triggerNotificationFlow(category, situation, runOutputs.step5, draftId, runOutputs);
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
  const handleClearMemory = () => {
    if (confirm("Are you sure you want to delete your Decision Memory history? This action is permanent.")) {
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
    // Fallback to first non-empty line under Step 5 heading
    return "Vulnerability-Weighted Allocation Plan Proposal";
  };

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col font-sans transition-colors duration-300 relative overflow-hidden" id="civitas-root">
      
      {/* 🔮 Background Subtle Floating Orbs — Extremely Minimal & Soft G Suite Aesthetics */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
        <div className="absolute top-[8%] left-[15%] w-[35vw] h-[35vw] rounded-full bg-blue-400/8 dark:bg-blue-500/3 blur-[120px] animate-float-slow" />
        <div className="absolute bottom-[20%] right-[10%] w-[38vw] h-[38vw] rounded-full bg-teal-400/6 dark:bg-teal-500/2.5 blur-[140px] animate-float-reverse" />
        <div className="absolute top-[45%] left-[55%] w-[25vw] h-[25vw] rounded-full bg-indigo-400/6 dark:bg-indigo-500/2 blur-[100px] animate-float-slow" />
      </div>

      {/* Premium Top Navigation bar */}
      <header
        id="top-navigation"
        className="h-16 border-b border-border-line bg-surface/75 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between px-6 select-none transition-colors duration-300 relative"
      >
        <div className="flex items-center gap-3">
          {/* Glassmorphic Transparent Civic Shield Logo */}
          <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500/10 to-blue-600/10 dark:from-sky-400/15 dark:to-blue-500/15 border border-blue-500/25 dark:border-blue-400/30 backdrop-blur-sm text-blue-600 dark:text-blue-400 shadow-inner cursor-pointer" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M12 8v8" />
              <path d="M9 11h6" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-display font-extrabold tracking-tight text-ink" id="civitas-brand">
                CIVICTAS
              </h1>
              <span className="text-[9px] uppercase font-mono tracking-wider bg-slate-100 dark:bg-slate-800 text-muted font-bold px-1.5 py-0.5 rounded border border-border-line">
                PRO v1
              </span>
            </div>
            <p className="text-[10px] text-muted font-bold -mt-1 tracking-wide">Community Decision Copilot</p>
          </div>
        </div>

        {/* Subtitle taglines info */}
        <div className="hidden lg:flex items-center gap-2">
          <span className="text-xs font-semibold text-muted leading-relaxed">
            Helping communities decide better — with AI that advises and humans who decide.
          </span>
        </div>

        {/* Informative actions */}
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-mono bg-slate-100/60 dark:bg-slate-800/60 text-blue-600 dark:text-blue-400 font-bold px-3 py-1 rounded-full border border-border-line">
            AI-assisted · Human-decided
          </span>

          {/* Minimal Elegant Theme Toggle Button */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-1 px-2.5 h-8 border border-border-line hover:bg-slate-100 dark:hover:bg-slate-800 text-muted rounded-lg flex items-center justify-center gap-1.5 transition-all text-xs font-semibold cursor-pointer select-none"
            aria-label="Toggle visual theme mode"
            title={isDarkMode ? "Toggle Light Theme" : "Toggle Dark Theme"}
          >
            {isDarkMode ? (
              <>
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-amber-400 stroke-current" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                </svg>
                <span className="text-[10px] text-muted hidden md:inline">Light</span>
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-sky-600 stroke-current" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                </svg>
                <span className="text-[10px] text-muted hidden md:inline">Dark</span>
              </>
            )}
          </button>

          <button
            id="how-it-works-trigger"
            onClick={() => setIsHowItWorksOpen(true)}
            className="flex items-center gap-1 h-8 px-3 border border-border-line bg-surface hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold rounded-lg text-ink cursor-pointer transition-all"
            aria-label="Open how it works documentation modal"
          >
            <HelpCircle className="w-3.5 h-3.5 text-muted" />
            How it works
          </button>
        </div>
      </header>

      {/* Main Structural body wrapper split into Sidebar and Workspace */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 relative z-10">
        {/* Left column fixed Sidebar */}
        <Sidebar
          memoryItems={memoryItems}
          selectedItemId={selectedItemId}
          onSelectItem={handleSelectItem}
          onNewDecision={handleResetWorkflow}
          onClearMemory={handleClearMemory}
          onReuseTemplate={handleReuseTemplate}
        />

        {/* Right scrolling workspace container */}
        <main
          id="decision-workspace"
          className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full relative z-10"
        >
          {/* Header banner context when selective archives are viewed */}
          {selectedItemId && (
            <div className="p-4 bg-surface-solid border border-border-line rounded-2xl flex items-center justify-between shadow-md" id="history-details-banner">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-accent shrink-0" />
                <div>
                  <h3 className="text-xs font-bold text-ink uppercase tracking-wider font-display">
                    Viewing Historical Decision Archive
                  </h3>
                  <p className="text-xs text-muted mt-0.5 font-medium">
                    This run is locked to read-only memory parameters. Click 'Use template' in the sidebar or Reset below to run a new simulation.
                  </p>
                </div>
              </div>
              <button
                onClick={handleResetWorkflow}
                className="text-xs py-1.5 px-3.5 bg-surface hover:bg-surface/50 text-ink font-semibold rounded-xl border border-border-line transition-all cursor-pointer shadow-sm"
              >
                Clear view and Start New
              </button>
            </div>
          )}

          {/* Setup section */}
          <SetupPanel
            isPipelineRunning={isPipelineRunning}
            isPipelineDone={isPipelineDone}
            onRunPipeline={handleRunPipeline}
            onReset={handleResetWorkflow}
            loadedTemplate={loadedTemplate}
          />

          {!isPipelineRunning && !isPipelineDone && !selectedItemId && (
            <EmptyState onRunSample={handleRunSample} />
          )}

          {/* Active sequence advisors pipeline cards */}
          {(isPipelineRunning || isPipelineDone) && (
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
          )}

          {/* Oversight Human Verification Section */}
          <HumanReviewPanel
            isPipelineDone={isPipelineDone && !isPipelineRunning}
            recommendedOption={extractRecommendationValue()}
            isFinalized={isFinalized}
            onFinalize={handleFinalizeDecision}
            onStartNew={handleResetWorkflow}
            onDownloadBrief={triggerDownloadBrief}
            reviewers={reviewers}
            selectedReviewerIndex={selectedReviewerIndex}
            onSelectReviewer={handleSelectReviewer}
            onAddReviewer={handleAddReviewer}
            onDeleteReviewer={handleDeleteReviewer}
            notificationStatus={notificationStatus}
          />

          {/* Active Google Workspace Connect integration panel */}
          {isPipelineDone && !isPipelineRunning && (
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
          )}
        </main>
      </div>

      {/* Accessible visual document modal popup */}
      <HowItWorksModal isOpen={isHowItWorksOpen} onClose={() => setIsHowItWorksOpen(false)} />

      {/* Footer accessibility compliance row */}
      <footer
        id="civitas-footer"
        className="bg-surface-solid border-t border-border-line py-4.5 text-center text-[11px] text-muted transition-colors"
      >
        <span className="font-medium" id="accessibility-notice">
          Accessibility Note: CIVICTAS meets WCAG AA guidelines with high text-contrast colors, full mechanical keyboard tab index focus, and aria-labels. Designed for desktop precision adaptively scalable.
        </span>
      </footer>
    </div>
  );
}
