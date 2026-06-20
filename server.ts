import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { runAgentStream, resolveProvider, providerInfo, type AgentBody, type Source } from "./lib/agents.js";
import { runCouncil } from "./lib/council.js";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Optional shared-secret gate. When API_SHARED_SECRET is unset (default demo),
  // the pipeline is open so the public demo runs without friction.
  const SHARED_SECRET = process.env.API_SHARED_SECRET || "";
  const checkSecret = (req: express.Request): boolean => {
    if (!SHARED_SECRET) return true;
    return req.header("x-civictas-key") === SHARED_SECRET;
  };

  // Lightweight diagnostics — which provider is active, no secrets exposed.
  app.get("/api/health", (_req, res) => {
    // `engine` is the secret-free description the UI badge + harness trace read.
    res.json({ ok: true, engine: providerInfo(), provider: resolveProvider() });
  });

  // 108-persona council. Mirrors api/council.ts so dev/preview matches prod and
  // honours the demo flag (forces the deterministic mock panel).
  app.post("/api/council", async (req, res) => {
    if (!checkSecret(req)) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const b = req.body || {};
    try {
      const result = await runCouncil(
        {
          category: b.category || "",
          situation: b.situation || "",
          equityGoal: b.equityGoal || "",
          recommendation: b.recommendation || "",
        },
        { forceProvider: b.demo ? "mock" : undefined }
      );
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Council evaluation failed." });
    }
  });

  // API Route for running a step of the decision pipeline
  app.post("/api/agent/:step", async (req, res) => {
    if (!checkSecret(req)) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");

    const { step } = req.params;
    const body: AgentBody = {
      category: req.body.category,
      situation: req.body.situation,
      budget: req.body.budget,
      sites: req.body.sites,
      equityGoal: req.body.equityGoal,
      memoryContext: req.body.memoryContext,
      dataset: req.body.dataset,
      previousOutputs: req.body.previousOutputs,
    };

    try {
      let sources: Source[] = [];
      await runAgentStream(
        step,
        body,
        {
          onText: (text) => res.write(text),
          onSources: (s) => {
            sources = s;
          },
        },
        // Demo mode / client-side failure fallback forces the deterministic mock.
        { forceProvider: req.body.demo ? "mock" : undefined }
      );
      if (sources.length > 0) {
        res.write(`\n\n[METADATA_JSON: ${JSON.stringify({ sources })}]`);
      }
      res.end();
    } catch (e: any) {
      console.error(`Agent ${step} error:`, e);
      res.write(`\n[ERROR: ${e?.message || "An error occurred running the agent."}]`);
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
  <title>CIVICTAS Auth Callback</title>
</head>
<body style="font-family: sans-serif; text-align: center; padding: 40px; color: #14233A; background: #F7F9FB;">
  <div style="max-width: 400px; margin: 0 auto; padding: 30px; border: 1px solid #E4E9F0; background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
    <h2 style="margin-top: 0; color: #1E6FB8;">Authorizing CIVICTAS...</h2>
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
        window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', token: token }, window.location.origin);
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
    console.log(`CIVICTAS server running on http://localhost:${PORT} (provider: ${resolveProvider()})`);
  });
}

startServer();
