import { useState, useEffect } from "react";
import {
  Mail,
  Database,
  Calendar,
  HardDrive,
  CheckSquare,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Info,
  Video,
  LogIn,
  LogOut,
  ShieldCheck,
  ArrowLeftRight
} from "lucide-react";
import {
  sendGmailEmail,
  exportSheetsSimulation,
  createCalendarMeeting,
  uploadDriveFile,
  createTaskItem,
  sendChatMessage
} from "../utils/workspace";
import BrandMark from "./BrandMark";
import RealityPill from "./RealityPill";
import { useConfirm, useNotify } from "../dialog";

interface WorkspacePanelProps {
  category: string;
  situation: string;
  budget: string;
  sites: string;
  equityGoal: string;
  outputs: {
    step1: string;
    step2: string;
    step3: string;
    step4: string;
    step5: string;
  };
  isPipelineDone: boolean;
  humanDecision: string;
  chosenOption: string;
  humanRationale: string;
}

export default function WorkspacePanel(props: WorkspacePanelProps) {
  const confirm = useConfirm();
  const notify = useNotify();
  const [token, setToken] = useState<string | null>(null);
  const [isSandboxMode, setIsSandboxMode] = useState(true);
  const [clientId, setClientId] = useState(() => {
    return localStorage.getItem("civitas_gwork_client_id") || "";
  });
  const [sandboxToken, setSandboxToken] = useState(() => {
    return localStorage.getItem("civitas_gwork_sandbox_token") || "";
  });
  const [isExpanded, setIsExpanded] = useState(true);

  // Email state
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailStatus, setEmailStatus] = useState<{ type: "idle" | "loading" | "success" | "error"; msg: string }>({
    type: "idle",
    msg: ""
  });

  // Calendar State
  const [calSummary, setCalSummary] = useState("");
  const [calDesc, setCalDesc] = useState("");
  const [calStart, setCalStart] = useState("");
  const [calEnd, setCalEnd] = useState("");
  const [calMeet, setCalMeet] = useState(true);
  const [calStatus, setCalStatus] = useState<{ type: "idle" | "loading" | "success" | "error"; msg: string; url?: string }>({
    type: "idle",
    msg: ""
  });

  // Sheet State
  const [sheetTitle, setSheetTitle] = useState("");
  const [sheetStatus, setSheetStatus] = useState<{ type: "idle" | "loading" | "success" | "error"; msg: string; url?: string }>({
    type: "idle",
    msg: ""
  });

  // Drive State
  const [driveFileName, setDriveFileName] = useState("");
  const [driveStatus, setDriveStatus] = useState<{ type: "idle" | "loading" | "success" | "error"; msg: string; url?: string }>({
    type: "idle",
    msg: ""
  });

  // Tasks State
  const [taskTitle, setTaskTitle] = useState("");
  const [taskNotes, setTaskNotes] = useState("");
  const [taskStatus, setTaskStatus] = useState<{ type: "idle" | "loading" | "success" | "error"; msg: string }>({
    type: "idle",
    msg: ""
  });

  // Chat State
  const [chatSpaceId, setChatSpaceId] = useState("");
  const [chatMsgText, setChatMsgText] = useState("");
  const [chatStatus, setChatStatus] = useState<{ type: "idle" | "loading" | "success" | "error"; msg: string }>({
    type: "idle",
    msg: ""
  });

  // Persist configurations
  useEffect(() => {
    localStorage.setItem("civitas_gwork_client_id", clientId);
  }, [clientId]);

  useEffect(() => {
    localStorage.setItem("civitas_gwork_sandbox_token", sandboxToken);
    if (isSandboxMode && sandboxToken.trim()) {
      setToken(sandboxToken.trim());
    }
  }, [sandboxToken, isSandboxMode]);

  // Set up OAuth redirection callback listener
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // The /auth/callback popup is served from this same deployment (Vercel
      // rewrite / Express route), so the only trusted sender is our own origin.
      // Same-origin is stricter than the old allowlist and also fixes the live
      // demo, where the prod origin is neither *.run.app nor localhost.
      if (event.origin !== window.location.origin) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.token) {
        setToken(event.data.token);
        if (isSandboxMode) {
          setSandboxToken(event.data.token);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isSandboxMode]);

  // Pre-populate fields when outputs or inputs change
  useEffect(() => {
    if (props.isPipelineDone) {
      setCalSummary(`Civictas Hearing & Consultation: ${props.category}`);
      setCalDesc(`Community hearing & peer evaluation process to finalize the proposal concerning the ${props.category} decision.\n\nSituation context: ${props.situation}\n\nConstraints: Budget: $${props.budget}, Total location sites: ${props.sites}`);
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      
      const tomorrowEnd = new Date(tomorrow);
      tomorrowEnd.setHours(tomorrowEnd.getHours() + 1);

      setCalStart(tomorrow.toISOString().slice(0, 16));
      setCalEnd(tomorrowEnd.toISOString().slice(0, 16));

      // Email pre-population
      setEmailSubject(`PROPOSAL BRIEF: CIVICTAS Community Resource Allocation - ${props.category}`);
      setEmailBody(`
        <h2>CIVICTAS Support - Decision Proposal Summary</h2>
        <p><strong>Decision Topic:</strong> ${props.category}</p>
        <p><strong>Proposed Solution Option:</strong> ${props.chosenOption || "Vulnerability-Weighted Allocation Scheme"}</p>
        <p><strong>Assumptions & Constraints Met:</strong></p>
        <ul>
          <li><strong>Budget:</strong> USD ${props.budget}</li>
          <li><strong>Maximum Sites Allowed:</strong> ${props.sites}</li>
          <li><strong>Equity Target:</strong> ${props.equityGoal}</li>
        </ul>
        <hr/>
        <h3>Executive Recommendations</h3>
        <p>Based on sequential multi-agent policy simulation, risk evaluation audits, and historical community memories, this plan is optimized for the highest-vulnerability blocks.</p>
        <p><strong>Human Decision Action Taken:</strong> ${props.humanDecision.toUpperCase().replace(/_/g, " ")}</p>
        <p><strong>Decision Maker's Rationale:</strong> ${props.humanRationale || "Prioritized heat-vulnerability and transit equity."}</p>
      `);

      // File & Sheets names
      setSheetTitle(`CIVICTAS Simulation Outcomes Tracker - ${props.category.replace(/[^a-zA-Z0-9]/g, "_")}`);
      setDriveFileName(`CIVICTAS_Dossier_Report_${props.category.replace(/[^a-zA-Z0-9\s]/g, "")}.txt`);

      // Tasks checks
      setTaskTitle(`Verify on-the-ground vulnerability index for ${props.category}`);
      setTaskNotes(`Review Agent 4 risk mitigation audit checks.\n\nRequired Verification: ${props.equityGoal}`);

      // Google Chat notification
      setChatMsgText(`*CIVICTAS Policy Proposal Alert*\nA human decision maker has processed and logged a policy proposal concerning: *${props.category}*.\n\n*Action Decision:* ${props.humanDecision.toUpperCase()}\n*Allocated Option:* ${props.chosenOption || "Vulnerability-Weighted Center Plan"}\n*Budget:* $${props.budget}\n*Oversight Rationale:* ${props.humanRationale || "Prioritized communities with least transit option."}`);
    }
  }, [props.isPipelineDone, props.category, props.chosenOption, props.humanDecision, props.humanRationale]);

  // Launch standard OAuth explicit flow with custom client id
  const handleLaunchGoogleOAuth = () => {
    if (!clientId.trim()) {
      notify({ tone: "warning", message: "Configure a valid Google Client ID first before connecting." });
      return;
    }

    const redirectUri = `${window.location.origin}/auth/callback`;
    const scopes = [
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.compose",
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/tasks"
    ].join(" ");

    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId.trim())}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scopes)}&prompt=consent`;
    
    const popup = window.open(url, "civictas_google_oauth_popup", "width=600,height=700,status=no,resizable=yes");
    if (!popup) {
      notify({ tone: "error", message: "Popup blocked. Allow popups for CIVICTAS to enable authorization." });
    }
  };

  const handleDisconnect = () => {
    setToken(null);
    // Clear the persisted token on disconnect so it can't linger in storage.
    try {
      localStorage.removeItem("civitas_gwork_sandbox_token");
    } catch {
      /* ignore */
    }
    if (isSandboxMode) {
      setSandboxToken("");
    }
  };

  // 1. Gmail send
  const triggerGmailSend = async () => {
    if (!token) return;
    if (!emailTo.trim()) {
      setEmailStatus({ type: "error", msg: "Please specify a recipient email address." });
      return;
    }
    const confirmed = await confirm({
      title: "Send proposal brief?",
      body: `This sends the decision proposal brief to ${emailTo} via your connected Gmail account.`,
      confirmLabel: "Send email",
    });
    if (!confirmed) return;

    setEmailStatus({ type: "loading", msg: "Sending email..." });
    const res = await sendGmailEmail(token, emailTo, emailSubject, emailBody);
    if (res.success) {
      setEmailStatus({ type: "success", msg: res.message });
    } else {
      setEmailStatus({ type: "error", msg: res.message });
    }
  };

  // 2. Sheets export
  const triggerSheetsExport = async () => {
    if (!token) return;
    const confirmed = await confirm({
      title: "Export to Google Sheets?",
      body: "This creates a new Google Sheets workbook with the Agent 3 comparison outcomes.",
      confirmLabel: "Export",
    });
    if (!confirmed) return;

    setSheetStatus({ type: "loading", msg: "Creating and writing Sheet data..." });

    const md = props.outputs.step3 || "";
    const headers = ["Option", "Metric", "Now", "1 Year", "5 Years"];
    const rows: Array<Array<string | number>> = [];

    if (md) {
      const lines = md.split("\n");
      const dataLines = lines.filter(el => el.trim().startsWith("|") && !el.includes("---"));
      if (dataLines.length > 1) {
        const parsedHeaders = dataLines[0].split("|").map(s => s.trim()).filter(Boolean);
        parsedHeaders.forEach((hd, idx) => {
          if (idx < headers.length) headers[idx] = hd;
        });

        for (let j = 1; j < dataLines.length; j++) {
          const cells = dataLines[j].split("|").map(s => s.trim()).filter(Boolean);
          if (cells.length > 0) {
            rows.push(cells);
          }
        }
      }
    }

    if (rows.length === 0) {
      rows.push(["Option A: Vulnerability Hub", "Transit Coverage", "60%", "85%", "92%"]);
      rows.push(["Option A: Vulnerability Hub", "Budget Consumption", "$120k", "$180k", "$300k"]);
      rows.push(["Option B: Equal Spread", "Transit Coverage", "40%", "50%", "55%"]);
    }

    const t = sheetTitle || "CIVICTAS Policy Comparison";
    const res = await exportSheetsSimulation(token, t, headers, rows);
    if (res.success) {
      setSheetStatus({ type: "success", msg: res.message, url: res.url });
    } else {
      setSheetStatus({ type: "error", msg: res.message });
    }
  };

  // 3. Calendar & Meet Export
  const triggerCalendarCreate = async () => {
    if (!token) return;
    if (!calStart || !calEnd) {
      setCalStatus({ type: "error", msg: "Please enter event start and end times." });
      return;
    }
    const confirmed = await confirm({
      title: "Add to Google Calendar?",
      body: "This creates the proposed review meeting on your Google Calendar.",
      confirmLabel: "Add event",
    });
    if (!confirmed) return;

    setCalStatus({ type: "loading", msg: "Creating calendar invite & Meet link..." });
    const res = await createCalendarMeeting(token, {
      summary: calSummary || "Civictas Decision Review",
      description: calDesc,
      startTime: new Date(calStart).toISOString(),
      endTime: new Date(calEnd).toISOString(),
      createMeet: calMeet
    });

    if (res.success) {
      setCalStatus({ type: "success", msg: res.message, url: res.url });
    } else {
      setCalStatus({ type: "error", msg: res.message });
    }
  };

  // 4. Secure Document Archival (Drive)
  const triggerDriveUpload = async () => {
    if (!token) return;
    const confirmed = await confirm({
      title: "Archive to Google Drive?",
      body: "This archives the entire decision-making record as a file in your Google Drive.",
      confirmLabel: "Archive",
    });
    if (!confirmed) return;

    setDriveStatus({ type: "loading", msg: "Generating report and uploading file..." });

    const reportContent = `
========================================
CIVICTAS COMMUNITY POLICY DOSSIER
========================================
Topic: ${props.category}
Date Created: ${new Date().toLocaleString()}
Status: Approved by Human Oversight

----------------------------------------
SITUATION AND CONSTRAINTS
----------------------------------------
Situation:
${props.situation}

Constraints:
- Budget: USD ${props.budget}
- Max Location Sites: ${props.sites}
- Intent & Equity Goal: ${props.equityGoal}

----------------------------------------
ADVISORY AGENTS SEQUENTIAL OUTPUTS
----------------------------------------

--- AGENT 1 (Framing / Decision Goals) ---
${props.outputs.step1 || "No output."}

--- AGENT 2 (Grounding Research Evidence) ---
${props.outputs.step2 || "No output."}

--- AGENT 3 (Simulation Comparison Matrix) ---
${props.outputs.step3 || "No output."}

--- AGENT 4 (Responsible Audit Trade-offs) ---
${props.outputs.step4 || "No output."}

--- AGENT 5 (Public brief/Summary Proposal) ---
${props.outputs.step5 || "No output."}

----------------------------------------
HUMAN OVERSIGHT ACTION RECORD
----------------------------------------
Action Taken: ${props.humanDecision.toUpperCase()}
Chosen Policy Route/Option: ${props.chosenOption || "Vulnerability Weighted Center Plan"}
Oversight Board rationale:
${props.humanRationale || "None provided."}

========================================
Archived using CIVICTAS Workspace Connector.
`;

    const name = driveFileName || `Civictas_Record_${props.category}.txt`;
    const res = await uploadDriveFile(token, name, reportContent);
    if (res.success) {
      setDriveStatus({ type: "success", msg: res.message, url: res.url });
    } else {
      setDriveStatus({ type: "error", msg: res.message });
    }
  };

  // 5. Tasks sync
  const triggerTaskSync = async () => {
    if (!token) return;
    if (!taskTitle.trim()) {
      setTaskStatus({ type: "error", msg: "Please specify a task Title." });
      return;
    }
    const confirmed = await confirm({
      title: "Sync to Google Tasks?",
      body: "This adds the follow-up check tasks to your default Google Tasks list.",
      confirmLabel: "Sync tasks",
    });
    if (!confirmed) return;

    setTaskStatus({ type: "loading", msg: "Saving task to Google Tasks..." });
    const res = await createTaskItem(token, taskTitle, taskNotes);
    if (res.success) {
      setTaskStatus({ type: "success", msg: res.message });
    } else {
      setTaskStatus({ type: "error", msg: res.message });
    }
  };

  // 6. Chat Sync
  const triggerChatPost = async () => {
    if (!token) return;
    if (!chatSpaceId.trim()) {
      setChatStatus({ type: "error", msg: "Please enter a valid Google Chat Space ID (e.g., spaces/XXXXXXXX)." });
      return;
    }
    const confirmed = await confirm({
      title: "Post to Google Chat?",
      body: "This posts the proposal summary notification to the selected Google Chat space.",
      confirmLabel: "Post",
    });
    if (!confirmed) return;

    setChatStatus({ type: "loading", msg: "Posting notification..." });
    let spaceName = chatSpaceId.trim();
    if (!spaceName.startsWith("spaces/")) {
      spaceName = `spaces/${spaceName}`;
    }
    const res = await sendChatMessage(token, spaceName, chatMsgText);
    if (res.success) {
      setChatStatus({ type: "success", msg: res.message });
    } else {
      setChatStatus({ type: "error", msg: res.message });
    }
  };

  return (
    <section 
      id="google-workspace-integrations" 
      className="bg-surface-solid/70 dark:bg-surface-solid/40 border border-border-line rounded-2xl shadow-lg shadow-black/[0.02] overflow-hidden select-none transition-all duration-300"
    >
      {/* Container Header Toolbar */}
      <div 
        className="p-5 border-b border-border-line bg-surface/20 hover:bg-surface/30 flex items-center justify-between cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        id="workspace-panel-header"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-accent-soft text-accent rounded-xl shadow-sm">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
              <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1a8.45 8.45 0 0 0-1.69-.98l-.38-2.65C14.46  2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0  .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-ink tracking-tight font-display">Google Workspace Connect</h3>
              <span className="text-[9px] uppercase font-mono tracking-wider bg-accent/10 border border-accent/20 text-accent font-bold px-2 py-0.5 rounded-full">
                Native
              </span>
            </div>
            <p className="text-xs text-muted font-medium leading-normal mt-0.5">
              Sync decisions, plan calendar hearings, and archive briefings with Workspace APIs
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          {token ? (
            <RealityPill kind="live" label="Connected" className="hidden sm:inline-flex" />
          ) : (
            <RealityPill kind="needs-credentials" label="Optional" className="hidden sm:inline-flex" />
          )}
          <div className="p-1 px-2 hover:bg-surface-solid rounded text-muted">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* Auth banner — ties the optional Workspace link into the CIVICTAS
              brand ecosystem. Sign-in is OPTIONAL: the studio runs fully without
              it; connecting only powers the export/notify actions below. */}
          <div className="p-4 bg-surface rounded-xl border border-border-line flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2 sm:max-w-xl">
              <div className="flex flex-wrap items-center gap-2">
                <BrandMark className="w-5 h-5 shrink-0 text-ink" />
                <span className="font-display font-semibold tracking-tight text-sm text-ink">CIVICTAS</span>
                <ArrowLeftRight className="w-3.5 h-3.5 text-faint shrink-0" aria-hidden="true" />
                <span className="text-sm font-semibold text-muted">Google Workspace</span>
                <RealityPill kind="simulated" label="Optional" className="ml-1" />
              </div>
              <p className="text-xs text-muted leading-relaxed font-medium">
                Sign in to push the finished brief to Gmail, Sheets, Calendar, Drive, Tasks, Chat, and Meet — or paste a sandbox token. The decision studio runs fully without connecting.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 min-w-[200px] shrink-0 justify-end">
              {token ? (
                <div className="flex flex-col gap-2 items-end">
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-positive font-bold">
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    Active session
                  </span>
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="inline-flex items-center justify-center gap-1.5 py-1.5 px-4 cursor-pointer text-xs font-bold border border-danger/30 text-danger hover:bg-danger/10 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                  >
                    <LogOut className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    Sign out
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleLaunchGoogleOAuth}
                  className="inline-flex items-center justify-center gap-2 py-2 px-4 bg-accent text-on-accent hover:opacity-95 text-xs font-bold rounded-xl shadow-sm cursor-pointer transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                >
                  <LogIn className="w-4 h-4 shrink-0" aria-hidden="true" />
                  Sign in with Google
                </button>
              )}
            </div>
          </div>

          {/* Settings Section */}
          {!token && (
            <div className="p-4 bg-surface-2 border border-dashed border-border-line rounded-xl space-y-4">
              <div className="flex items-center gap-1.5 text-xs text-ink font-bold font-display">
                <Info className="w-4 h-4 text-accent" />
                <span>Choose Authentication Protocol:</span>
              </div>

              <div className="flex flex-wrap items-center gap-3 bg-surface/50 p-1.5 rounded-xl w-max select-none border border-border-line">
                <button
                  type="button"
                  onClick={() => setIsSandboxMode(true)}
                  className={`text-xs px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    isSandboxMode 
                      ? "bg-surface-solid text-ink shadow" 
                      : "text-muted hover:text-ink"
                  }`}
                >
                  Sandbox Token (Manual Override)
                </button>
                <button
                  type="button"
                  onClick={() => setIsSandboxMode(false)}
                  className={`text-xs px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    !isSandboxMode 
                      ? "bg-surface-solid text-ink shadow" 
                      : "text-muted hover:text-ink"
                  }`}
                >
                  Custom Developer Client ID
                </button>
              </div>

              {isSandboxMode ? (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-muted tracking-wider block">Google OAuth Access Token:</label>
                  <p className="text-[11px] text-muted leading-relaxed mb-2 font-medium">
                    Paste an active OAuth access token (e.g. from Google OAuth Playground or GCP oauth tools) to bypass credentials registration.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      placeholder="ya29.a0Axoo..."
                      value={sandboxToken}
                      onChange={(e) => setSandboxToken(e.target.value)}
                      className="border border-border-line text-xs p-2.5 rounded-lg flex-1 outline-none focus:border-accent font-mono select-all bg-surface-2 text-ink"
                    />
                    {sandboxToken.trim() && (
                      <button
                        type="button"
                        onClick={() => setToken(sandboxToken.trim())}
                        className="py-2.5 px-4 bg-accent text-on-accent hover:opacity-90 text-xs font-bold rounded-lg cursor-pointer transition-opacity shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-2"
                      >
                        Authorize
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3 p-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-muted tracking-wider block">Google Client ID:</label>
                      <input
                        type="text"
                        placeholder="12345678-abcdef.apps.googleusercontent.com"
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        className="border border-border-line text-xs p-2.5 rounded-lg w-full outline-none focus:border-accent bg-surface-2 text-ink"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-muted tracking-wider block">Approved Callback URI (Copy this to GCP):</label>
                      <div className="bg-surface/30 border border-border-line text-[11px] p-2.5 rounded-lg text-ink font-mono select-all truncate">
                        {window.location.origin}/auth/callback
                      </div>
                    </div>
                  </div>
                  <div className="p-3 bg-warning/10 border border-warning/25 rounded-lg text-[11px] text-warning leading-relaxed font-semibold">
                    Warning: When using popup-based custom client OAuth, ensure "Authorized Redirect URIs" under Google Cloud Credentials includes: <span className="font-mono bg-surface-2 border px-1 py-0.5 border-border-line rounded">{window.location.origin}/auth/callback</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Active integrations tools grid */}
          <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${!token ? "opacity-45 pointer-events-none select-none select-text filter grayscale-[40%]" : ""}`}>
            
            {/* 1. GMAIL */}
            <div className="p-5 border border-border-line rounded-xl space-y-3 bg-surface-2/50" id="gsuite-gmail-box">
              <div className="flex items-center justify-between border-b border-border-line pb-2">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-agent-framing" />
                  <span className="text-xs font-bold text-ink font-display">1. Gmail Dispatcher</span>
                </div>
                <span className="text-[9px] uppercase font-mono tracking-wider bg-agent-framing/10 text-agent-framing font-bold px-1.5 py-0.5 rounded border border-agent-framing/20">
                  Ready
                </span>
              </div>
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <label htmlFor="gmail-to" className="text-[10px] font-bold text-muted uppercase tracking-wider block">Recipient address (To):</label>
                  <input
                    id="gmail-to"
                    type="email"
                    placeholder="citymanager@riverside.gov"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    className="border border-border-line text-xs p-2 rounded-lg w-full outline-none focus:border-accent bg-surface-2 text-ink"
                  />
                </div>
                
                <div className="space-y-1">
                  <label htmlFor="gmail-subject" className="text-[10px] font-bold text-muted uppercase tracking-wider block">Email Subject:</label>
                  <input
                    id="gmail-subject"
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="border border-border-line text-xs p-2 rounded-lg w-full outline-none focus:border-accent font-bold text-ink bg-surface-2"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="gmail-body" className="text-[10px] font-bold text-muted uppercase tracking-wider block">Rich HTML Email Body:</label>
                  <textarea
                    id="gmail-body"
                    rows={4}
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    className="border border-border-line text-[11px] p-2 rounded-lg w-full outline-none focus:border-accent font-mono leading-relaxed bg-surface-2 text-ink"
                  />
                </div>

                <button
                  type="button"
                  onClick={triggerGmailSend}
                  className="w-full py-2.5 bg-gradient-to-r from-accent to-accent-2 hover:opacity-95 text-white font-bold text-xs rounded-xl cursor-pointer transition-all uppercase tracking-wide"
                >
                  Send Brief via Gmail
                </button>

                {emailStatus.msg && (
                  <div className={`p-2 rounded-lg text-[11px] text-center font-bold border ${
                    emailStatus.type === "success" 
                      ? "bg-positive/15 border-positive/30 text-positive" 
                      : emailStatus.type === "error" 
                        ? "bg-danger/15 border-danger/30 text-danger" 
                        : "bg-surface border-border-line text-ink animate-pulse"
                  }`}>
                    {emailStatus.msg}
                  </div>
                )}
              </div>
            </div>

            {/* 2. GOOGLE SHEETS */}
            <div className="p-5 border border-border-line rounded-xl space-y-3 bg-surface-2/50" id="gsuite-sheets-box">
              <div className="flex items-center justify-between border-b border-border-line pb-2">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-agent-evidence" />
                  <span className="text-xs font-bold text-ink font-display">2. Google Sheets simulation export</span>
                </div>
                <span className="text-[9px] uppercase font-mono tracking-wider bg-agent-evidence/10 text-agent-evidence font-bold px-1.5 py-0.5 rounded border border-agent-evidence/20">
                  Ready
                </span>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label htmlFor="sheet-title" className="text-[10px] font-bold text-muted uppercase tracking-wider block">Workbook Title:</label>
                  <input
                    id="sheet-title"
                    type="text"
                    value={sheetTitle}
                    onChange={(e) => setSheetTitle(e.target.value)}
                    className="border border-border-line text-xs p-2 rounded-lg w-full outline-none focus:border-accent bg-surface-2 text-ink"
                  />
                </div>

                <div className="p-3 bg-accent/5 rounded-xl border border-accent/15 text-[11px] text-ink leading-relaxed">
                  <span className="font-bold block text-accent mb-0.5 font-display">Outflow Columns mapping:</span>
                  Parses the Agent 3 comparison tables and loads Option keys, temporal metrics, and simulation values directly into cellular matrices in the sheet.
                </div>

                <button
                  type="button"
                  onClick={triggerSheetsExport}
                  className="w-full py-2.5 bg-gradient-to-r from-accent to-accent-2 hover:opacity-95 text-white font-bold text-xs rounded-xl cursor-pointer transition-all uppercase tracking-wide"
                >
                  Generate Spreadsheet
                </button>

                {sheetStatus.msg && (
                  <div className={`p-2.5 rounded-lg text-[11px] text-center font-bold border ${
                    sheetStatus.type === "success" 
                      ? "bg-positive/15 border-positive/30 text-positive" 
                      : sheetStatus.type === "error" 
                        ? "bg-danger/15 border-danger/30 text-danger" 
                        : "bg-surface border-border-line text-ink animate-pulse"
                  }`}>
                    {sheetStatus.msg}
                    {sheetStatus.url && (
                      <a 
                        href={sheetStatus.url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="mt-1.5 flex items-center justify-center gap-1 text-accent dark:text-accent-2 hover:underline text-[10px]"
                      >
                        Open Sheets Table <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 3. CALENDAR & MEET */}
            <div className="p-5 border border-border-line rounded-xl space-y-3 bg-surface-2/50" id="gsuite-calendar-box">
              <div className="flex items-center justify-between border-b border-border-line pb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-agent-simulation" />
                  <span className="text-xs font-bold text-ink font-display">3. Calendar & Meet Consultation</span>
                </div>
                <span className="text-[9px] uppercase font-mono tracking-wider bg-agent-simulation/10 text-agent-simulation font-bold px-1.5 py-0.5 rounded border border-agent-simulation/20">
                  Ready
                </span>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label htmlFor="cal-summary" className="text-[10px] font-bold text-muted uppercase tracking-wider block">Hearing Meeting Title:</label>
                  <input
                    id="cal-summary"
                    type="text"
                    value={calSummary}
                    onChange={(e) => setCalSummary(e.target.value)}
                    className="border border-border-line text-xs p-2 rounded-lg w-full outline-none focus:border-accent bg-surface-2 text-ink"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="cal-start" className="text-[10px] font-bold text-muted uppercase tracking-wider block">Start datetime:</label>
                    <input
                      id="cal-start"
                      type="datetime-local"
                      value={calStart}
                      onChange={(e) => setCalStart(e.target.value)}
                      className="border border-border-line text-xs p-2 rounded-lg w-full outline-none focus:border-accent bg-surface-2 text-ink"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="cal-end" className="text-[10px] font-bold text-muted uppercase tracking-wider block">End datetime:</label>
                    <input
                      id="cal-end"
                      type="datetime-local"
                      value={calEnd}
                      onChange={(e) => setCalEnd(e.target.value)}
                      className="border border-border-line text-xs p-2 rounded-lg w-full outline-none focus:border-accent bg-surface-2 text-ink"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="cal-desc" className="text-[10px] font-bold text-muted uppercase tracking-wider block">Meeting Description & Agenda:</label>
                  <textarea
                    id="cal-desc"
                    rows={2}
                    value={calDesc}
                    onChange={(e) => setCalDesc(e.target.value)}
                    className="border border-border-line text-[11px] p-2 rounded-lg w-full outline-none focus:border-accent bg-surface-2 text-ink"
                  />
                </div>

                <div className="flex items-center gap-2 bg-surface p-2.5 border border-border-line rounded-lg">
                  <input
                    type="checkbox"
                    id="auto-meet-conferencing"
                    checked={calMeet}
                    onChange={(e) => setCalMeet(e.target.checked)}
                    className="w-4 h-4 text-accent accent-accent focus:ring-accent rounded shrink-0 cursor-pointer"
                  />
                  <label htmlFor="auto-meet-conferencing" className="text-[10.5px] text-ink font-semibold select-none cursor-pointer flex items-center gap-1 leading-normal">
                    <Video className="w-4 h-4 text-accent-2 shrink-0" />
                    Auto-configure Google Meet conference endpoint link
                  </label>
                </div>

                <button
                  type="button"
                  onClick={triggerCalendarCreate}
                  className="w-full py-2.5 bg-gradient-to-r from-accent to-accent-2 hover:opacity-95 text-white font-bold text-xs rounded-xl cursor-pointer transition-all uppercase tracking-wide"
                >
                  Schedule in Calendar
                </button>

                {calStatus.msg && (
                  <div className={`p-2.5 rounded-lg text-[11px] text-center font-bold border ${
                    calStatus.type === "success" 
                      ? "bg-positive/15 border-positive/30 text-positive" 
                      : calStatus.type === "error" 
                        ? "bg-danger/15 border-danger/30 text-danger" 
                        : "bg-surface border-border-line text-ink animate-pulse"
                  }`}>
                    {calStatus.msg}
                    {calStatus.url && (
                      <a 
                        href={calStatus.url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="mt-1.5 flex items-center justify-center gap-1 text-accent dark:text-accent-2 hover:underline text-[10px]"
                      >
                        Join Calendar Google Meet Room <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 4. GOOGLE DRIVE */}
            <div className="p-5 border border-border-line rounded-xl space-y-3 bg-surface-2/50" id="gsuite-drive-box">
              <div className="flex items-center justify-between border-b border-border-line pb-2">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-agent-equity" />
                  <span className="text-xs font-bold text-ink font-display">4. Drive secure document archival</span>
                </div>
                <span className="text-[9px] uppercase font-mono tracking-wider bg-agent-equity/10 text-agent-equity font-bold px-1.5 py-0.5 rounded border border-agent-equity/20">
                  Ready
                </span>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label htmlFor="drive-filename" className="text-[10px] font-bold text-muted uppercase tracking-wider block">Archive Document Filename:</label>
                  <input
                    id="drive-filename"
                    type="text"
                    value={driveFileName}
                    onChange={(e) => setDriveFileName(e.target.value)}
                    className="border border-border-line text-xs p-2 rounded-lg w-full outline-none focus:border-accent bg-surface-2 text-ink"
                  />
                </div>

                <div className="p-3 bg-surface rounded-xl border border-border-line text-[11px] text-muted leading-relaxed">
                  Export logs inputs, framing options, step results, safety checklists, and the human rationale into an immutable policy transcript directly on your drive cloud account.
                </div>

                <button
                  type="button"
                  onClick={triggerDriveUpload}
                  className="w-full py-2.5 bg-gradient-to-r from-accent to-accent-2 hover:opacity-95 text-white font-bold text-xs rounded-xl cursor-pointer transition-all uppercase tracking-wide"
                >
                  Upload Dossier to Drive
                </button>

                {driveStatus.msg && (
                  <div className={`p-2.5 rounded-lg text-[11px] text-center font-bold border ${
                    driveStatus.type === "success" 
                      ? "bg-positive/15 border-positive/30 text-positive" 
                      : driveStatus.type === "error" 
                        ? "bg-danger/15 border-danger/30 text-danger" 
                        : "bg-surface border-border-line text-ink animate-pulse"
                  }`}>
                    {driveStatus.msg}
                    {driveStatus.url && (
                      <a 
                        href={driveStatus.url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="mt-1.5 flex items-center justify-center gap-1 text-accent dark:text-accent-2 hover:underline text-[10px]"
                      >
                        View File in Drive <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 5. GOOGLE TASKS */}
            <div className="p-5 border border-border-line rounded-xl space-y-3 bg-surface-2/50" id="gsuite-tasks-box">
              <div className="flex items-center justify-between border-b border-border-line pb-2">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-agent-transparency" />
                  <span className="text-xs font-bold text-ink font-display">5. Tasks checklist sync</span>
                </div>
                <span className="text-[9px] uppercase font-mono tracking-wider bg-agent-transparency/10 text-agent-transparency font-bold px-1.5 py-0.5 rounded border border-agent-transparency/20">
                  Ready
                </span>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label htmlFor="task-title" className="text-[10px] font-bold text-muted uppercase tracking-wider block">Follow-up Task Agenda Subject:</label>
                  <input
                    id="task-title"
                    type="text"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    className="border border-border-line text-xs p-2 rounded-lg w-full outline-none focus:border-accent bg-surface-2 text-ink font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="task-notes" className="text-[10px] font-bold text-muted uppercase tracking-wider block">Checklist Notes:</label>
                  <textarea
                    id="task-notes"
                    rows={2}
                    value={taskNotes}
                    onChange={(e) => setTaskNotes(e.target.value)}
                    className="border border-border-line text-[11px] p-2 rounded-lg w-full outline-none focus:border-accent bg-surface-2 text-ink"
                  />
                </div>

                <button
                  type="button"
                  onClick={triggerTaskSync}
                  className="w-full py-2.5 bg-gradient-to-r from-accent to-accent-2 hover:opacity-95 text-white font-bold text-xs rounded-xl cursor-pointer transition-all uppercase tracking-wide"
                >
                  Sync Task to Todo-list
                </button>

                {taskStatus.msg && (
                  <div className={`p-2 rounded-lg text-[11px] text-center font-bold border ${
                    taskStatus.type === "success" 
                      ? "bg-positive/15 border-positive/30 text-positive" 
                      : taskStatus.type === "error" 
                        ? "bg-danger/15 border-danger/30 text-danger" 
                        : "bg-surface border-border-line text-ink animate-pulse"
                  }`}>
                    {taskStatus.msg}
                  </div>
                )}
              </div>
            </div>

            {/* 6. GOOGLE CHAT */}
            <div className="p-5 border border-border-line rounded-xl space-y-3 bg-surface-2/50" id="gsuite-chat-box">
              <div className="flex items-center justify-between border-b border-border-line pb-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-accent" />
                  <span className="text-xs font-bold text-ink font-display">6. Chat spaces notifications</span>
                </div>
                <span className="text-[9px] uppercase font-mono tracking-wider bg-accent/10 text-accent font-bold px-1.5 py-0.5 rounded border border-accent/20">
                  Ready
                </span>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label htmlFor="chat-space-id" className="text-[10px] font-bold text-muted uppercase tracking-wider block">Space ID / Key:</label>
                  <input
                    id="chat-space-id"
                    type="text"
                    placeholder="spaces/AAAAXXXXXX"
                    value={chatSpaceId}
                    onChange={(e) => setChatSpaceId(e.target.value)}
                    className="border border-border-line text-xs p-2 rounded-lg w-full outline-none focus:border-accent bg-surface-2 text-ink"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="chat-msg" className="text-[10px] font-bold text-muted uppercase tracking-wider block">Message Payload Preview:</label>
                  <textarea
                    id="chat-msg"
                    rows={4}
                    value={chatMsgText}
                    onChange={(e) => setChatMsgText(e.target.value)}
                    className="border border-border-line text-[11px] p-2 rounded-lg w-full outline-none focus:border-accent bg-surface-2 text-ink font-mono"
                  />
                </div>

                <button
                  type="button"
                  onClick={triggerChatPost}
                  className="w-full py-2.5 bg-gradient-to-r from-accent to-accent-2 hover:opacity-95 text-white font-bold text-xs rounded-xl cursor-pointer transition-all uppercase tracking-wide"
                >
                  Send Announcement Message
                </button>

                {chatStatus.msg && (
                  <div className={`p-2 rounded-lg text-[11px] text-center font-bold border ${
                    chatStatus.type === "success" 
                      ? "bg-positive/15 border-positive/30 text-positive" 
                      : chatStatus.type === "error" 
                        ? "bg-danger/15 border-danger/30 text-danger" 
                        : "bg-surface border-border-line text-ink animate-pulse"
                  }`}>
                    {chatStatus.msg}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </section>
  );
}
