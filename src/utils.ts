import React from "react";
import { jsPDF } from "jspdf";

import autoTable from 'jspdf-autotable';

/**
 * Extracts any memory notes injected by Agent 1 to notify the user
 * of past human rationales factored into the simulation.
 */
export function extractMemoryNote(text: string) {
  if (!text) return { note: null, rationale: null, cleanedText: "" };
  
  // Look for our custom MEMORY_NOTE tag
  const regex = /\[MEMORY_NOTE:\s*([^|]+)\|\s*RATIONALE:\s*([^\]]+)\]/;
  const match = text.match(regex);
  
  if (match) {
    return {
      note: match[1].trim(),
      rationale: match[2].trim(),
      cleanedText: text.replace(regex, "").trim()
    };
  }
  return {
    note: null,
    rationale: null,
    cleanedText: text
  };
}

/**
 * Parses bold options or confidence details inside the text.
 */
export function getConfidencePill(text: string): "high" | "medium" | "low" | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  
  // Look for (Confidence: High) or Confidence: High etc.
  const match = lower.match(/confidence:\s*(high|medium|low)/i);
  if (match) {
    const value = match[1].toLowerCase();
    if (value === "high" || value === "medium" || value === "low") {
      return value;
    }
  }
  return null;
}

/**
 * Structured, honest description of a failed advisory step. Built from whatever
 * the agent endpoint actually threw — no invented latency or token numbers.
 */
export interface PipelineFailure {
  /** Friendly label of the agent that failed, e.g. "Agent 3 — Simulation". */
  agentLabel: string;
  /** Step number (1-5) so the UI can offer a targeted retry. */
  step: number;
  /** Plain-language guidance shown to the operator. */
  message: string;
  /** Raw status/message from the provider, shown verbatim for transparency. */
  detail: string;
  /** True when the provider declined for rate/quota reasons (e.g. HTTP 429). */
  isRateLimit: boolean;
  /** Parsed HTTP status when the error carried one. */
  status?: number;
}

/**
 * Translate a thrown pipeline error into an honest, user-facing failure record.
 * Detects rate/quota limits (429) and auth/server errors so the alert surface
 * can give an accurate reason instead of silently swallowing the failure.
 */
export function describePipelineFailure(
  rawMessage: string,
  agentLabel: string,
  step: number
): PipelineFailure {
  const detail = (rawMessage || "").trim() || "The model returned no output.";

  // Prefer a parenthesized status like "(429)"; fall back to a bare 4xx/5xx.
  const paren = detail.match(/\((\d{3})\)/);
  const bare = detail.match(/\b([45]\d\d)\b/);
  const status = paren ? Number(paren[1]) : bare ? Number(bare[1]) : undefined;

  const isRateLimit =
    status === 429 ||
    /\b429\b|rate.?limit|quota|tokens? per (day|minute|hour)|too many requests/i.test(detail);

  let message: string;
  if (isRateLimit) {
    message =
      "The AI provider declined the request because a rate or quota limit was reached. Wait a few minutes and retry, or check that the configured API key still has quota.";
  } else if (status === 401 || status === 403) {
    message =
      "The AI provider rejected the credentials. Check that a valid API key is configured, then retry the step.";
  } else if (status && status >= 500) {
    message =
      "The AI provider returned a server error. This is usually temporary — retry the step in a moment.";
  } else {
    message =
      "This advisory step failed before it could return output. Retry the step, or check the server logs for the underlying cause.";
  }

  return { agentLabel, step, message, detail, isRateLimit, status };
}

/**
 * Formats standard numbers into localized US currency
 */
export function formatCurrency(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value.replace(/[^0-9.]/g, "")) : value;
  if (isNaN(num)) return typeof value === "string" ? value : "";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(num);
}

/**
 * Helper to split markdown into sections to easily wrap them in styled containers.
 */
export function parseMarkdownSections(text: string) {
  if (!text) return [];
  
  const lines = text.split("\n");
  const sections: Array<{
    title: string;
    level: number;
    content: string[];
    isWarning: boolean;
    isBoxed: boolean;
  }> = [];
  
  let currentSection: typeof sections[0] | null = null;
  
  for (const line of lines) {
    // Check if line is a header (e.g. # Header or ## Header or ### Question)
    const headerMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headerMatch) {
      if (currentSection) {
        sections.push(currentSection);
      }
      const rawTitle = headerMatch[2].trim();
      const level = headerMatch[1].length;
      
      const isWarning = rawTitle.includes("⚠") || rawTitle.toLowerCase().includes("risk");
      const isBoxed = rawTitle.toLowerCase().includes("not know") || rawTitle.toLowerCase().includes("should not decide");
      
      currentSection = {
        title: rawTitle,
        level,
        content: [],
        isWarning,
        isBoxed
      };
    } else {
      if (!currentSection) {
        currentSection = {
          title: "",
          level: 0,
          content: [],
          isWarning: false,
          isBoxed: false
        };
      }
      currentSection.content.push(line);
    }
  }
  
  if (currentSection) {
    sections.push(currentSection);
  }
  
  return sections;
}

/**
 * Generates and downloads a clean, print-ready PDF document
 * of the finalized community decision.
 */
export function downloadDecisionBrief(details: {
  category: string;
  situation: string;
  budget: string;
  sites: string;
  equityGoal: string;
  aiRecommendation: string;
  confidence: string;
  humanDecision: string;
  chosenOption: string;
  humanRationale: string;
  timestamp: string;
  riskNote?: string;
  fullAgentOutputs?: {
    step1: string;
    step2: string;
    step3: string;
    step4: string;
    step5: string;
  };
}) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 20;
  const marginTop = 20;
  const textWidth = pageWidth - marginLeft * 2;
  let cursorY = marginTop;

  const addLine = (text: string, fontSize: number, isBold: boolean = false, spaceAfter: number = 5) => {
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, textWidth);
    const lineHeight = fontSize * 0.3527;
    const blockHeight = lines.length * lineHeight;
    
    if (cursorY + blockHeight > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      cursorY = marginTop;
    }
    
    doc.text(lines, marginLeft, cursorY);
    cursorY += blockHeight + spaceAfter;
  };

  const hr = () => {
    doc.setLineWidth(0.5);
    doc.line(marginLeft, cursorY - 2, pageWidth - marginLeft, cursorY - 2);
    cursorY += 5;
  };

  addLine("CIVICTAS - Official Community Decision Brief", 18, true, 8);
  addLine("AI-assisted / Human-decided", 12, false, 8);
  hr();

  addLine("1. DECISION SUMMARY", 14, true, 4);
  addLine(`Category: ${details.category}`, 10, true, 2);
  addLine(`Date / Timestamp: ${details.timestamp}`, 10, false, 4);
  addLine(`Context Setup:`, 10, true, 2);
  addLine(`${details.situation}`, 10, false, 6);
  hr();

  addLine("2. OPERATIONAL CONSTRAINTS", 14, true, 4);
  addLine(`Budget: ${details.budget}`, 10, false, 2);
  addLine(`Sites: ${details.sites}`, 10, false, 2);
  addLine(`Equity Goal: ${details.equityGoal}`, 10, false, 6);
  hr();

  addLine("3. AI PIPELINE ASSESSMENT", 14, true, 4);
  addLine(`Specialized Recommendation:`, 10, true, 2);
  addLine(`${details.aiRecommendation || "Option details summarized below."}`, 10, false, 4);
  addLine(`Confidence Level: ${details.confidence.toUpperCase() || "MEDIUM"}`, 10, true, 6);
  hr();
  
  addLine("4. HUMAN OVERSIGHT & DECISION", 14, true, 4);
  addLine(`Status: ${details.humanDecision.replace(/_/g, " ").toUpperCase()}`, 10, true, 2);
  addLine(`Chosen Option: ${details.chosenOption}`, 10, true, 2);
  addLine(`Human Rationale:`, 10, true, 2);
  addLine(`${details.humanRationale}`, 10, false, 6);
  hr();

  if (details.fullAgentOutputs) {
    addLine("5. SEQUENTIAL AGENT DECISION LOGS", 14, true, 6);
    
    // Process text to remove some markdown formatting like ** for cleaner table display
    const cleanText = (t: string) => t.replace(/\*\*/g, '').replace(/\[METADATA_JSON:[^\]]+\]/g, "").trim();

    const tableData = [
      ["1. Framing", cleanText(details.fullAgentOutputs.step1)],
      ["2. Evidence", cleanText(details.fullAgentOutputs.step2)],
      ["3. Simulation", cleanText(details.fullAgentOutputs.step3)],
      ["4. Audit", cleanText(details.fullAgentOutputs.step4)],
      ["5. Proposal Synthesis", cleanText(details.fullAgentOutputs.step5)],
    ];

    autoTable(doc, {
      startY: cursorY,
      head: [['Agent Stage', 'Advisory Output']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 40], textColor: 255, fontSize: 10, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: 50 },
      columnStyles: {
        0: { cellWidth: 35, fontStyle: 'bold' },
        1: { cellWidth: 'auto' }
      },
      margin: { left: marginLeft, right: marginLeft },
      didDrawPage: (data) => {
        // Update cursorY in case we want to add things after the table
        cursorY = data.cursor ? data.cursor.y + 10 : cursorY;
      }
    });
    // add small spacing after table
    cursorY += 10;
  }

  // Check if we need a new page for footer
  if (cursorY > doc.internal.pageSize.getHeight() - 20) {
    doc.addPage();
    cursorY = marginTop;
  }
  
  addLine("Document generated by CIVICTAS", 8, false, 0);

  const sanitizedCategory = details.category
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .slice(0, 30);
  
  doc.save(`civictas_decision_brief_${sanitizedCategory}.pdf`);
}
