export interface DecisionConstraints {
  budget: string;
  sites: string;
  equityGoal: string;
}

export type HumanDecisionType = "approved" | "approved_with_edits" | "rejected";

export interface DecisionMemoryItem {
  id: string;
  createdAt: string;
  decisionType: string;
  situation: string;
  constraints: DecisionConstraints;
  aiRecommendation?: string;
  humanDecision?: HumanDecisionType;
  chosenOption?: string;
  humanRationale?: string;
  checks?: {
    dataGaps: boolean;
    equity: boolean;
    community: boolean;
  };
  // Store previous workflow steps text to support template reload
  step1Output?: string;
  step2Output?: string;
  step3Output?: string;
  step4Output?: string;
  step5Output?: string;
  groundingSources?: Array<{ title: string; url: string }>;
}

export type PipelineStatus = "queued" | "running" | "done" | "error";

export interface AgentState {
  status: PipelineStatus;
  output: string;
  error?: string;
}

export interface PipelineOutputs {
  step1: string;
  step2: string;
  step3: string;
  step4: string;
  step5: string;
}
