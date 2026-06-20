import type { VercelRequest, VercelResponse } from "@vercel/node";
import { providerInfo } from "../lib/agents.js";

// Secret-free engine status for the UI badge: which provider + model is live.
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  res.setHeader("Cache-Control", "no-store");
  res.json({ ok: true, engine: providerInfo() });
}
