import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

// Lazy initialization of GoogleGenAI to prevent startup crashes when API key is missing.
let aiClient: GoogleGenAI | null = null;
function getAIClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is missing. Please authorize or configure it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for running a step of the decision pipeline
  app.post("/api/agent/:step", async (req, res) => {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");

    const { step } = req.params;
    const {
      category,
      situation,
      budget,
      sites,
      equityGoal,
      memoryContext,
      previousOutputs,
    } = req.body;

    // Define instructions and prompts for each agent
    let systemInstruction = "";
    let userPrompt = "";

    switch (step) {
      case "1":
        systemInstruction =
          "You are a public-policy decision analyst. Turn a messy real-world situation into a clear, structured decision. Be concrete and neutral. Do NOT recommend an option yet.";
        userPrompt = `The user wants to resolve a hard community resource decision.
Decision Type: ${category}
Situation: ${situation}
Constraints:
- Budget: USD ${budget}
- Number of sites/locations: ${sites}
- Equity Goal: ${equityGoal}

Historical Memory Context of past approved decisions by humans (if any):
${memoryContext || "No prior decisions yet."}

Your job is to turn this messy real-world situation into a clear, structured decision framing. Do NOT recommend an option yet. Use the following headings exactly in Markdown:

# Decision goal
[Write a single-sentence framing of the decision goal]

# Candidate options
[Propose exactly 3-4 concrete, clearly different candidate options. For each option, write a bold title and a single-line explanation. Keep each option highly actionable and specific, e.g., using mobile units, fixed allocations, etc.]

# Stakeholders affected
[Provide a list of bullet points detailing stakeholders affected. Boldly mark who is most vulnerable/at-risk.]

# Key constraints
[Summarize the budget, site counts, and equity goals from the input]

# Evidence we need to choose well
[State 3-5 specific questions about data, logistics, and constraints that the research agent should answer]

If there are past decisions in the Memory Context above, please adapt your framing to reflect past learnings/conventions. Additionally, if the Memory Context indicates past decisions, append this exact tag at the very end of your output so the user can verify the context:
[MEMORY_NOTE: Informed by past decisions | RATIONALE: A previous human decision prioritised the vulnerable — factored in.]
If there are no past decisions (or Memory Context says "No prior decisions yet."), DO NOT include any MEMORY_NOTE tag. Make sure you don't recommend a single option. Outputs should be clean, direct, and formal.`;
        break;

      case "2":
        systemInstruction =
          "You are a careful research analyst. Answer each evidence question with the best available public data or a clearly-labeled reasonable benchmark. NEVER invent precise statistics; if unsure, say so and give a range. Every item carries a confidence level and explicit data gaps.";
        userPrompt = `Below is the framing of the decision and the specific evidence questions we need to answer to choose well:

${previousOutputs?.step1 || "No prior framing provided."}

The core details:
- Category: ${category}
- Situation: ${situation}

Answer each of the evidence questions asked in the previous framing. Use Google Search grounding to gather accurate public details, research real-world indicators, or provide realistic policy benchmarks. 
Never invent precise stats; if you cannot find exact figures, state a reasonable range. Every item must have an explicit confidence level and identified data gaps.

Use the following headings exactly in Markdown:

# Evidence
For each question, follow this exact structure:
### Question: [The question]
- **Finding**: [Your findings and answers based on research and grounding. Give references and links when available.]
- **Confidence**: [High|Medium|Low]
- **Data gaps**: [Explicitly mention what data or verification is missing or uncertain]

# Sources
[Provide a markdown list of web links or URLs retrieved from research grounding, or write: "No external sources — benchmark estimates used" if none.]`;
        break;

      case "3":
        systemInstruction =
          "You are a scenario modeler. Project the outcome of EACH candidate option across three horizons (Now, 1 year, 5 years) on three decision-relevant metrics. Every cell is a specific number with units. State the key assumption behind each option. These are transparent estimates, not predictions.";
        userPrompt = `Here is our decision framing and evidence base:

### Decision Framing (Agent 1):
${previousOutputs?.step1 || ""}

### Research Evidence (Agent 2):
${previousOutputs?.step2 || ""}

The core details:
- Category: ${category}
- Situation: ${situation}

Your job is to project the outcomes of EACH candidate option (detailed in the decision framing above) across three horizons: Now, 1 Year, and 5 Years.
You must project each option based on THREE decision-relevant metrics (e.g., Financial Cost/Budget, People Sheltered/Served, Heat Index Reduction, Equity Coverage, etc.).
Produce this as a clean, compliant Markdown table. Every single cell in the table MUST contain a specific number with appropriate units (e.g. "$120,000", "450 residents", "88% coverage"). NO blanks, no "varies", no estimated ranges like "50-100" in cells.

Use the following headings exactly in Markdown:

# Outcome comparison
| Option | Metric | Now | 1 year | 5 years |
[Provide table rows containing every single Proposed Option × all 3 metrics. For instance, if there are 4 options and 3 metrics, the table must have exactly 12 data rows plus headers, covering each Option + Metric combination. Fill every cell completely.]

# Assumptions
[For each option, provide exactly 1 key assumption behind the projections in a bulleted line. Make them transparent, clear, and realistic.]

At the end of your response, write exactly this line in italics:
*These are estimates for comparison, not guarantees.*`;
        break;

      case "4":
        systemInstruction =
          "You are an equity and responsible-AI auditor. Protect the people the data tends to miss. Be direct about trade-offs and about the risks of using AI for this decision.";
        userPrompt = `You are auditing this policy decision to safeguard vulnerable groups and evaluate the risks of using AI in this process.
Here is the accumulated pipeline detail:

### Framing:
${previousOutputs?.step1 || ""}

### Evidence:
${previousOutputs?.step2 || ""}

### Outcomes Projections:
${previousOutputs?.step3 || ""}

The situation: ${situation}

Execute a constructive equity and responsibility audit. Identify who benefits, who is underserved, what the AI/data model bias risks are, and recommend human checks.

Use the following headings exactly in Markdown:

# Who benefits most
[Provide bullet points representing groups, neighborhoods, or organizations that stand to gain the most from these proposed options.]

# Who is underserved or at risk of being missed
[Provide bullet points highlighting individuals, demographics, or neighborhoods who might be left behind or underserved by the metrics or options, and why.]

# ⚠ AI / data risk
[Name exactly ONE realistic, high-impact risk of using AI or data models for this decision, such as underrepresenting heat vulnerability due to stale census data or digital divide in community feedback.]

# How CIVITAS reduces this risk
[List 2-3 concrete design features or methods that CIVITAS implements to mitigate this risk, such as human override protocols, clear tracking of data gaps, etc.]

Recommended human check before acting: [Provide exactly one concrete, physical, or organizational check the human decision-maker should do on-the-ground, such as conducting high-vulnerability door-to-door temperature surveys or listening sessions before final allocations.]`;
        break;

      case "5":
        systemInstruction =
          "You are a clear-writing chief of staff for a busy, non-technical official. Plain language. Be honest about limits. Present a recommendation but frame it as a PROPOSAL for a human to decide.";
        userPrompt = `Prepare a plain-language summary and a draft recommendation brief for a busy, non-technical city offical, based on the entire agent pipeline outputs:

### Decision Framing:
${previousOutputs?.step1 || ""}

### Research Evidence:
${previousOutputs?.step2 || ""}

### Simulation Outcomes:
${previousOutputs?.step3 || ""}

### Equity & Risk Audit:
${previousOutputs?.step4 || ""}

The situation: ${situation}

Synthesize a plain-language proposal. Be humble about limitations, clearly advise on trade-offs, and suggest the recommended option along with a confidence rating (High, Medium, or Low).

Use the following headings exactly in Markdown:

# Recommended option (proposal)
[State the proposed option in bold and include a confidence rating, exactly formatted as (Confidence: High|Medium|Low). E.g., **Option C: Vulnerability-Weighted Center Plan** (Confidence: High)]

# Top 3 reasons
[State the top 3 arguments/reasons for proposing this option, in a clean list.]

# Main trade-off
[Explain the primary disadvantage, drawback, cost, or trade-off associated with this choice in plain, non-technical language.]

# What CIVITAS does NOT know / should not decide alone
[Write down what information is missing, what political/policy issues the AI cannot handle, and what values belong entirely to human democratic decision-making.]`;
        break;

      default:
        throw new Error("Invalid agent step requested.");
    }

    try {
      const ai = getAIClient();

      // For Step 2 search grounding, we use googleSearch tool as instructed in specs.
      const useGrounding = step === "2";

      const responseStream = await ai.models.generateContentStream({
        model: "gemini-3.5-flash",
        contents: userPrompt,
        config: {
          systemInstruction: systemInstruction,
          tools: useGrounding ? [{ googleSearch: {} }] : undefined,
          temperature: 0.2, // Keep it relatively consistent and professional
        },
      });

      let groundingSources: Array<{ title: string; url: string }> = [];

      for await (const chunk of responseStream) {
        if (chunk.text) {
          res.write(chunk.text);
        }

        // Accrue any Google Search Grounding sources
        if (useGrounding) {
          const metadata = chunk.candidates?.[0]?.groundingMetadata;
          if (metadata?.groundingChunks) {
            for (const gChunk of metadata.groundingChunks) {
              if (gChunk.web?.uri) {
                groundingSources.push({
                  title: gChunk.web.title || gChunk.web.uri,
                  url: gChunk.web.uri,
                });
              }
            }
          }
        }
      }

      // If we got grounding sources during Agent 2, write them at the end.
      if (useGrounding && groundingSources.length > 0) {
        // Deduplicate
        const seen = new Set();
        const uniqueSources = groundingSources.filter((item) => {
          if (!item.url) return false;
          if (seen.has(item.url)) return false;
          seen.add(item.url);
          return true;
        });

        res.write(`\n\n[METADATA_JSON: ${JSON.stringify({ sources: uniqueSources })}]`);
      }

      res.end();
    } catch (e: any) {
      console.error(`Gemini Error on Agent ${step}:`, e);
      res.write(`\n[ERROR: ${e.message || "An error occurred calling the Gemini API."}]`);
      res.end();
    }
  });

  // API Route for sending notifications
  app.post("/api/notify", async (req, res) => {
    const webhookUrl = process.env.NOTIFY_WEBHOOK;
    if (!webhookUrl) {
      return res.json({ success: true, simulated: true, message: "Simulated notification triggered successfully." });
    }
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      });
      if (response.ok) {
        return res.json({ success: true, simulated: false, message: "Notification posted successfully." });
      } else {
        const errText = await response.text();
        return res.json({ success: false, simulated: false, error: errText });
      }
    } catch (error: any) {
      console.error("Webhook POST failed:", error);
      return res.json({ success: false, simulated: false, error: error.message || "Network error sending webhook." });
    }
  });

  // OAuth Callback endpoint for implicit Google OAuth logins
  app.get(["/auth/callback", "/auth/callback/"], (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>CIVITAS Auth Callback</title>
</head>
<body style="font-family: sans-serif; text-align: center; padding: 40px; color: #14233A; background: #F7F9FB;">
  <div style="max-width: 400px; margin: 0 auto; padding: 30px; border: 1px solid #E4E9F0; background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
    <h2 style="margin-top: 0; color: #1E6FB8;">Authorizing CIVITAS...</h2>
    <p style="color: #5B6B82; font-size: 14px;">Passing secure access token to your decision dashboard.</p>
    <div style="margin: 20px auto; width: 30px; height: 30px; border: 3px solid #E4E9F0; border-top-color: #1E6FB8; border-radius: 50%; animation: spin 1s linear infinite;"></div>
  </div>
  <script>
    const hash = window.location.hash;
    const query = window.location.search;
    
    let token = null;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      token = params.get('access_token');
    }
    
    if (!token && query) {
      const params = new URLSearchParams(query);
      token = params.get('access_token');
    }

    if (token) {
      if (window.opener) {
        window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', token: token }, '*');
        setTimeout(() => {
          window.close();
        }, 800);
      } else {
        document.body.innerHTML = '<h2>Authenticated!</h2><p>Please return to the main tab.</p>';
      }
    } else {
      document.body.innerHTML = '<h2 style="color: #B91C1C;">Authentication Error</h2><p style="color: #5B6B82;">No access token was found in the Callback URL. Please close this window and try again.</p>';
    }
  </script>
  <style>
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</body>
</html>
    `);
  });

  // Serve static UI / Dev system
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
