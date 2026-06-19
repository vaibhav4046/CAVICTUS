import React, { useState, useEffect } from "react";
import { Play, RotateCcw, ShieldCheck } from "lucide-react";
import { DecisionConstraints } from "../types";

interface SetupPanelProps {
  isPipelineRunning: boolean;
  isPipelineDone: boolean;
  onRunPipeline: (category: string, situation: string, constraints: DecisionConstraints, dataset?: string) => void;
  onReset: () => void;
  // Support loading a saved record template
  loadedTemplate: {
    category: string;
    situation: string;
    constraints: DecisionConstraints;
  } | null;
}

const REQUIRED = (
  <>
    <span className="text-danger" aria-hidden="true"> *</span>
    <span className="sr-only"> (required)</span>
  </>
);

export default function SetupPanel(props: SetupPanelProps) {
  const [category, setCategory] = useState("Cooling centers (extreme heat)");
  const [situation, setSituation] = useState(
    "Riverside, a mid-size city, expects 20+ extreme-heat days this summer. The health department has a $300,000 budget to open cooling centers and can staff up to 4 sites. Last year, two heat deaths occurred in the low-income Eastside, which has the fewest air-conditioned homes and the least transit access. We need to choose 4 locations that protect the most at-risk residents, not just the most people."
  );
  const [budget, setBudget] = useState("300,000");
  const [sites, setSites] = useState("4");
  const [equityGoal, setEquityGoal] = useState("Prioritize heat-vulnerable, low-AC, low-transit neighborhoods");
  const [datasetText, setDatasetText] = useState("");
  const [datasetName, setDatasetName] = useState("");

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

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "").slice(0, 8000);
      const rows = text.trim().split("\n").length;
      const cols = (text.split("\n")[0] || "").split(",").length;
      setDatasetText(text);
      setDatasetName(`${file.name} · ${rows} rows × ${cols} cols`);
    };
    reader.readAsText(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (props.isPipelineRunning) return;
    props.onRunPipeline(category, situation, { budget, sites, equityGoal }, datasetText);
  };

  const isLocked = props.isPipelineRunning || props.isPipelineDone;

  const inputBase =
    "w-full text-sm border border-border-line rounded-xl text-ink placeholder:text-faint focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/40 outline-none bg-surface-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors";

  return (
    <section
      id="setup-panel"
      className="bg-surface border border-border-line rounded-2xl shadow-sm p-6 space-y-6"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border-line pb-4">
        <h3 className="text-sm font-bold text-ink flex items-center gap-2 flex-wrap">
          <span>Operational setup</span>
          <span className="text-[10px] font-semibold text-accent bg-accent-soft border border-accent/20 px-2.5 py-0.5 rounded-full font-mono">
            Human input control
          </span>
        </h3>
        {(props.isPipelineDone || props.isPipelineRunning) && (
          <button
            onClick={props.onReset}
            className="shrink-0 text-xs text-muted hover:text-ink hover:bg-surface-2 p-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer font-medium border border-border-line bg-surface focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            title="Start fresh and unlock inputs"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            Reset
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Decision Category */}
          <div className="space-y-1.5 col-span-1 md:col-span-2">
            <label htmlFor="decision-type-select" className="block text-xs font-bold text-muted uppercase tracking-wide">
              Decision category
            </label>
            <select
              id="decision-type-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={isLocked}
              className={`${inputBase} p-3 font-medium cursor-pointer`}
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
              Decision situation &amp; specific context{REQUIRED}
            </label>
            <textarea
              id="situation-textarea"
              value={situation}
              onChange={(e) => setSituation(e.target.value)}
              placeholder="Describe the current context, issues, target communities, and factors..."
              disabled={isLocked}
              rows={4}
              required
              aria-required="true"
              className={`${inputBase} p-4 resize-none leading-relaxed`}
            />
          </div>

          {/* Budget */}
          <div className="space-y-1.5">
            <label htmlFor="budget-input" className="block text-xs font-bold text-muted uppercase tracking-wide">
              Authorized budget (USD){REQUIRED}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-2.5 text-xs font-semibold text-muted font-mono">$</span>
              <input
                id="budget-input"
                type="text"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="e.g. 150,000"
                disabled={isLocked}
                required
                aria-required="true"
                className={`${inputBase} py-2.5 pl-8 pr-4 font-mono`}
              />
            </div>
          </div>

          {/* Sites */}
          <div className="space-y-1.5">
            <label htmlFor="sites-input" className="block text-xs font-bold text-muted uppercase tracking-wide">
              Resource cap / site limit{REQUIRED}
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
              aria-required="true"
              className={`${inputBase} p-2.5 font-mono`}
            />
          </div>

          {/* Equity Guidelines */}
          <div className="space-y-1.5 col-span-1 md:col-span-2">
            <label htmlFor="equity-goal-select" className="block text-xs font-bold text-muted uppercase tracking-wide">
              Principal equity priority target
            </label>
            <select
              id="equity-goal-select"
              value={equityGoal}
              onChange={(e) => setEquityGoal(e.target.value)}
              disabled={isLocked}
              className={`${inputBase} p-3 font-medium cursor-pointer`}
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

          {/* Real data upload — grounds the agents in YOUR numbers, not estimates */}
          <div className="space-y-1.5 col-span-1 md:col-span-2">
            <label htmlFor="dataset-input" className="block text-xs font-bold text-muted uppercase tracking-wide">
              Ground in your data (CSV, optional)
            </label>
            <input
              id="dataset-input"
              type="file"
              accept=".csv,.tsv,.txt"
              disabled={isLocked}
              onChange={handleFile}
              aria-describedby="dataset-hint"
              className="w-full text-xs text-muted file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-accent-soft file:text-accent hover:file:opacity-80 file:cursor-pointer border border-dashed border-border-line rounded-xl p-2 bg-surface-2 disabled:opacity-60 cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            />
            {datasetName ? (
              <p id="dataset-hint" className="text-xs text-positive font-semibold">
                Grounded in {datasetName} — the agents will use your real figures and cite them.
              </p>
            ) : (
              <p id="dataset-hint" className="text-xs text-faint leading-relaxed">
                Upload real data (e.g. heat-vulnerability, AC, transit by tract) and the agents ground every number in it instead of estimating.
              </p>
            )}
          </div>
        </div>

        {/* Primary action */}
        {!isLocked && (
          <div className="pt-2">
            <button
              id="submit-pipeline-btn"
              type="submit"
              className="w-full py-3.5 px-6 bg-accent text-on-accent hover:opacity-90 active:scale-[0.99] font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              <Play className="w-4 h-4 fill-current" aria-hidden="true" />
              Analyze decision &amp; launch the advisory pipeline
            </button>
          </div>
        )}

        {props.isPipelineRunning && (
          <div className="p-4 bg-accent-soft border border-accent/20 rounded-xl flex items-center gap-4" id="running-hint-banner" role="status" aria-live="polite">
            <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin shrink-0" aria-hidden="true" />
            <div className="text-sm text-ink leading-relaxed">
              <span className="font-bold text-accent mr-1">Pipeline active:</span> sequential AI advisory is modeling demographics, public datasets, and risk indicators. Please keep this window open.
            </div>
          </div>
        )}

        {props.isPipelineDone && (
          <div className="p-4 bg-positive/10 border border-positive/20 rounded-xl flex gap-3" id="completed-hint-banner" role="status" aria-live="polite">
            <ShieldCheck className="w-5 h-5 text-positive shrink-0 mt-0.5" aria-hidden="true" />
            <div className="text-sm text-ink leading-relaxed">
              <span className="font-bold text-positive">Advisory complete:</span> the five sequential models produced their framing, data grounding, spatial simulation, and equity audit.
              <strong className="text-positive font-semibold"> A human decision-maker must now review, edit, and approve a choice</strong> in the panel below to save the decision or download the brief.
            </div>
          </div>
        )}
      </form>
    </section>
  );
}
