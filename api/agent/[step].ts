import type { VercelRequest, VercelResponse } from "@vercel/node";
import { runAgentStream, type AgentBody, type Source } from "../../lib/agents.js";

export const config = { maxDuration: 60 };

// Best-effort in-memory rate limit. Resets on cold start (no shared store on
// Hobby), so it blunts casual abuse rather than guaranteeing a hard ceiling.
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 40;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_REQUESTS;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const sharedSecret = process.env.API_SHARED_SECRET || "";
  if (sharedSecret && req.headers["x-civictas-key"] !== sharedSecret) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";
  if (rateLimited(ip)) {
    res.status(429).json({ error: "Too many requests — please slow down." });
    return;
  }

  const step = String(req.query.step || "");
  const b = (req.body || {}) as Record<string, unknown>;
  const body: AgentBody = {
    category: b.category as string,
    situation: b.situation as string,
    budget: b.budget as string,
    sites: b.sites as string,
    equityGoal: b.equityGoal as string,
    memoryContext: b.memoryContext as string,
    dataset: b.dataset as string,
    previousOutputs: b.previousOutputs as AgentBody["previousOutputs"],
  };

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

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
      { forceProvider: b.demo ? "mock" : undefined }
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
}
