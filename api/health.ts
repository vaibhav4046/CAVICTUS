import type { VercelRequest, VercelResponse } from "@vercel/node";
import { providerInfo } from "../lib/agents.js";

// Secret-free engine status for the UI badge: which provider + model is live.
export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  res.json({ ok: true, engine: providerInfo() });
}
