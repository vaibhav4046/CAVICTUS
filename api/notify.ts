import type { VercelRequest, VercelResponse } from "@vercel/node";

// Notifies a configured reviewer webhook (Slack/Telegram/etc). When
// NOTIFY_WEBHOOK is unset the response is a simulated success so the demo
// flow completes without external dependencies.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const webhookUrl = process.env.NOTIFY_WEBHOOK;
  if (!webhookUrl) {
    res.json({ success: true, simulated: true, message: "Simulated notification triggered successfully." });
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body || {}),
    });
    if (response.ok) {
      res.json({ success: true, simulated: false, message: "Notification posted successfully." });
    } else {
      const errText = await response.text();
      res.json({ success: false, simulated: false, error: errText });
    }
  } catch (error: any) {
    console.error("Webhook POST failed:", error);
    res.json({ success: false, simulated: false, error: error?.message || "Network error sending webhook." });
  }
}
