import type { VercelRequest, VercelResponse } from "@vercel/node";
import { dispatchReview, type ReviewPayload } from "../lib/channels.js";

// Fans the human-review request out across every channel (Telegram / Email /
// WhatsApp / Voice). Each is real when configured, simulated otherwise. Always
// returns 200 with a per-channel status list — never crashes the flow.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const b = (req.body || {}) as Record<string, string>;
  const payload: ReviewPayload = {
    decisionId: b.decisionId || "",
    title: b.title || "Community decision",
    proposal: b.proposal || "",
    confidence: b.confidence || "Medium",
    reviewLink: b.reviewLink || "",
    reviewerName: b.reviewerName || "Reviewer",
  };

  const channels = await dispatchReview(payload);
  const anyReal = channels.some((c) => c.configured && c.ok);
  res.json({
    success: true,
    simulated: !anyReal,
    channels,
    message: anyReal
      ? "Reviewer notified on configured channels."
      : "Simulated notification (no live channels configured).",
  });
}
