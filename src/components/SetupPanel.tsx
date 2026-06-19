import React, { useState, useEffect } from "react";
import { Play, RotateCcw, ShieldAlert } from "lucide-react";
import { DecisionConstraints } from "../types";

interface SetupPanelProps {
  isPipelineRunning: boolean;
  isPipelineDone: boolean;
  onRunPipeline: (category: string, situation: string, constraints: DecisionConstraints) => void;
  onReset: () => void;
  // Support loading a saved record template
  loadedTemplate: {
    category: string;
    situation: string;
    constraints: DecisionConstraints;
  } | null;
}

export default function SetupPanel(props: SetupPanelProps) {
  const [category, setCategory] = useState("Cooling centers (extreme heat)");
  const [situation, setSituation] = useState(
    "Riverside, a mid-size city, expects 20+ extreme-heat days this summer. The health department has a $300,000 budget to open cooling centers and can staff up to 4 sites. Last year, two heat deaths occurred in the low-income Eastside, which has the fewest air-conditioned homes and the least transit access. We need to choose 4 locations that protect the most at-risk residents, not just the most people."
  );
  const [budget, setBudget] = useState("300,000");
  const [sites, setSites] = useState("4");
  const [equityGoal, setEquityGoal] = useState("Prioritize heat-vulnerable, low-AC, low-transit neighborhoods");

  // Load selected template if clicked from Decision Memory
  useEffect(() => {
    if (props.loadedTemplate) {
      setCategory(props.loadedTemplate.category);
      setSituation(props.loadedTemplate.situation);
      setBudget(props.loadedTemplate.constraints.budget);
      setSites(props.loadedTemplate.constraints.sites);
      setEquityGoal(props.loadedTemplate.constraints.equityGoal);
    }
  }, [props.loadedTemplate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (props.isPipelineRunning) return;
    props.onRunPipeline(category, situation, {
      budget,
      sites,
      equityGoal,
    });
  };

  const isLocked = props.isPipelineRunning || props.isPipelineDone;

  return (
    <section
      id="setup-panel"
      className="bg-surface-solid/70 dark:bg-surface-solid/40 border border-border-line backdrop-blur-md rounded-2xl shadow-lg shadow-black/[0.02] p-6 space-y-6"
    >
      <div className="flex items-center justify-between border-b border-border-line pb-4">
        <h3 className="text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-2">
          <span>1. Operational Setup</span>
          <span className="text-[10px] font-semibold text-accent bg-accent/10 border border-accent/20 px-2.5 py-0.5 rounded-full font-mono normal-case">
            Human input control
          </span>
        </h3>
        {(props.isPipelineDone || props.isPipelineRunning) && (
          <button
            onClick={props.onReset}
            className="text-xs text-muted hover:text-ink hover:bg-surface/50 p-1.5 px-3 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer font-medium border border-border-line bg-surface-solid/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            title="Start fresh and unlock inputs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Setup
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Decision Category */}
          <div className="space-y-1.5 col-span-1 md:col-span-2">
            <label htmlFor="decision-type-select" className="block text-xs font-bold text-muted uppercase tracking-wide">
              Decision Category
            </label>
            <select
              id="decision-type-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={isLocked}
              className="w-full text-sm border border-border-line p-3 rounded-xl font-medium text-ink focus:border-accent focus:ring-2 focus:ring-accent/10 outline-none bg-surface-solid dark:bg-[#121620] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <option value="Cooling centers (extreme heat)">Cooling centers (extreme heat)</option>
              <option value="Warming shelters (winter)">Warming shelters (winter)</option>
              <option value="Mobile health van routes">Mobile health van routes</option>
              <option value="Affordable Housing Site allocation">Affordable Housing Site allocation</option>
              <option value="Custom Community Resource Plan">Custom Community Resource Plan</option>
            </select>
          </div>

          {/* Situation Text */}
          <div className="space-y-1.5 col-span-1 md:col-span-2">
            <label htmlFor="situation-textarea" className="block text-xs font-bold text-muted uppercase tracking-wide">
              Decision Situation & Specific Context
            </label>
            <textarea
              id="situation-textarea"
              value={situation}
              onChange={(e) => setSituation(e.target.value)}
              placeholder="Describe the current context, issues, target communities, and factors..."
              disabled={isLocked}
              rows={4}
              required
              className="w-full text-sm border border-border-line p-4 rounded-xl text-ink placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/10 outline-none bg-surface-solid dark:bg-[#121620] resize-none disabled:opacity-60 disabled:bg-surface-solid/50 disabled:cursor-not-allowed leading-relaxed transition-colors"
            />
          </div>

          {/* Budget */}
          <div className="space-y-1.5">
            <label htmlFor="budget-input" className="block text-xs font-bold text-muted uppercase tracking-wide">
              Authorized Budget (USD)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-xs font-semibold text-muted font-mono">$</span>
              <input
                id="budget-input"
                type="text"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="e.g. 150,000"
                disabled={isLocked}
                required
                className="w-full text-sm border border-border-line py-2.5 pl-8 pr-4 rounded-xl font-mono text-ink placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/10 outline-none bg-surface-solid dark:bg-[#121620] disabled:opacity-60 disabled:bg-surface-solid/50 disabled:cursor-not-allowed transition-colors"
              />
            </div>
          </div>

          {/* Sites */}
          <div className="space-y-1.5">
            <label htmlFor="sites-input" className="block text-xs font-bold text-muted uppercase tracking-wide">
              Resource Cap / Site Limit
            </label>
            <input
              id="sites-input"
              type="number"
              min="1"
              max="20"
              value={sites}
              onChange={(e) => setSites(e.target.value)}
              placeholder="e.g. 4"
              disabled={isLocked}
              required
              className="w-full text-sm border border-border-line p-2.5 rounded-xl font-mono text-ink placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/10 outline-none bg-surface-solid dark:bg-[#121620] disabled:opacity-60 disabled:bg-surface-solid/50 disabled:cursor-not-allowed transition-colors"
            />
          </div>

          {/* Equity Guidelines */}
          <div className="space-y-1.5 col-span-1 md:col-span-2">
            <label htmlFor="equity-goal-select" className="block text-xs font-bold text-muted uppercase tracking-wide">
              Principal Equity Priority Target
            </label>
            <select
              id="equity-goal-select"
              value={equityGoal}
              onChange={(e) => setEquityGoal(e.target.value)}
              disabled={isLocked}
              className="w-full text-sm border border-border-line p-3 rounded-xl font-medium text-ink focus:border-accent focus:ring-2 focus:ring-accent/10 outline-none bg-surface-solid dark:bg-[#121620] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <option value="Prioritize heat-vulnerable, low-AC, low-transit neighborhoods">
                Prioritize heat-vulnerable, low-AC, low-transit neighborhoods
              </option>
              <option value="Prioritize highest-risk blocks over raw footfall">
                Prioritize highest-risk blocks over total footfall (vulnerability index)
              </option>
              <option value="Prioritize transit-poor zones and car-less residents">
                Prioritize transit-poor zones and car-less residents (access gap)
              </option>
              <option value="Maximize overall footfall and central transit hub reach">
                Maximize overall footfall and core central service hubs
              </option>
              <option value="Distribute equally by geographical census blocks">
                Distribute locations equally by geographic census blocks
              </option>
            </select>
          </div>
        </div>

        {/* Call to action button */}
        {!isLocked && (
          <div className="pt-2">
            <button
              id="submit-pipeline-btn"
              type="submit"
              className="w-full py-3.5 px-6 bg-gradient-to-r from-accent to-accent-2 hover:opacity-90 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-lg shadow-accent/20 transition-all flex items-center justify-center gap-2 outline-none cursor-pointer uppercase tracking-wider focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              <Play className="w-4 h-4 fill-current" />
              Analyze Decision & Launch AI Copilot Pipeline
            </button>
          </div>
        )}

        {props.isPipelineRunning && (
          <div className="p-4 bg-accent/5 border border-accent/20 rounded-xl flex items-center gap-4 animate-pulse" id="running-hint-banner">
            <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin shrink-0" />
            <div className="text-xs text-ink/90 leading-relaxed">
              <span className="font-bold text-accent mr-1">Pipeline Active:</span> Sequential AI simulation is modeling demographics, public datasets, and risk indicators. Please do not close this window.
            </div>
          </div>
        )}

        {props.isPipelineDone && (
          <div className="p-4 bg-emerald-500/5 dark:bg-emerald-400/5 border border-emerald-500/20 dark:border-emerald-400/20 rounded-xl flex gap-3" id="completed-hint-banner">
            <ShieldAlert className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-ink/95 leading-relaxed">
              <span className="font-bold text-emerald-600 dark:text-emerald-400">Recommendation Complete:</span> The 5 sequential advisory models have generated their framing, data grounding, spatial simulation, and equity audit. Under our safety guidelines,
              <strong className="text-emerald-700 dark:text-emerald-400 font-semibold"> a Human Decision-Maker must now review, edit, and approve a choice</strong> in the panel below to save this decision or download the brief.
            </div>
          </div>
        )}
      </form>
    </section>
  );
}
