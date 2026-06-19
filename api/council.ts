import type { VercelRequest, VercelResponse } from "@vercel/node";
import { runCouncil } from "../lib/council.js";

export const config = { maxDuration: 60 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const b = (req.body || {}) as Record<string, string>;
  res.setHeader("Cache-Control", "no-store");
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
}
