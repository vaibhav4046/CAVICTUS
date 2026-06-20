/**
 * Multi-channel human-review dispatch.
 *
 * Each adapter is REAL when its credentials are present (env vars) and falls
 * back to a clearly-labeled "simulated" status otherwise — so the app always
 * completes the flow, and goes live the moment you add a key. Every adapter is
 * wrapped in try/catch and can never crash the request.
 *
 * Design note: channels NOTIFY the reviewer and deep-link them into the app,
 * where the real human-in-the-loop gate (decision + rationale + 3 checks) lives.
 * A one-tap remote "approve" would bypass that gate, so we deliberately don't.
 *
 * Free + instant + two-way: Telegram (BotFather token + chat id).
 */

export interface ReviewPayload {
  decisionId: string;
  title: string;
  proposal: string;
  confidence: string;
  reviewLink: string;
  reviewerName: string;
}

export interface ChannelStatus {
  channel: "telegram" | "email" | "whatsapp" | "voice";
  configured: boolean;
  ok: boolean;
  simulated: boolean;
  detail: string;
}

function env(name: string): string {
  return (process.env[name] || "").replace(new RegExp(String.fromCharCode(0xfeff), "g"), "").trim();
}

// Untrusted payload fields are escaped before going into HTML (email) or XML
// (Twilio TwiML), and links are restricted to http(s), to block injection.
function htmlEscape(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function xmlEscape(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
function safeHttpUrl(u: string): string {
  try {
    const p = new URL(u);
    return p.protocol === "https:" || p.protocol === "http:" ? u : "#";
  } catch {
    return "#";
  }
}

function summary(p: ReviewPayload): string {
  return `CIVICTAS — human review needed
Decision: ${p.title}
Proposal: ${p.proposal}
AI confidence: ${p.confidence}
Open & decide: ${p.reviewLink}`;
}

async function sendTelegram(p: ReviewPayload): Promise<ChannelStatus> {
  const token = env("TELEGRAM_BOT_TOKEN");
  const chatId = env("TELEGRAM_CHAT_ID");
  if (!token || !chatId) {
    return { channel: "telegram", configured: false, ok: true, simulated: true, detail: "Simulated (set TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID)." };
  }
  try {
    const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: `🏛️ *CIVICTAS — human review needed*\n\n*${p.title}*\nProposal: ${p.proposal}\nAI confidence: ${p.confidence}`,
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: [[{ text: "✅ Open & decide", url: p.reviewLink }]] },
      }),
    });
    const ok = resp.ok;
    return { channel: "telegram", configured: true, ok, simulated: false, detail: ok ? "Sent to Telegram." : `Telegram error ${resp.status}.` };
  } catch (e: any) {
    return { channel: "telegram", configured: true, ok: false, simulated: false, detail: `Telegram failed: ${e?.message || "network error"}.` };
  }
}

async function sendEmail(p: ReviewPayload): Promise<ChannelStatus> {
  const key = env("RESEND_API_KEY");
  const to = env("REVIEW_EMAIL_TO");
  if (!key || !to) {
    return { channel: "email", configured: false, ok: true, simulated: true, detail: "Simulated (set RESEND_API_KEY + REVIEW_EMAIL_TO)." };
  }
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env("REVIEW_EMAIL_FROM") || "CIVICTAS <onboarding@resend.dev>",
        to: [to],
        subject: `CIVICTAS review: ${p.title}`,
        html: `<h2>Human review needed</h2><p><b>${htmlEscape(p.title)}</b></p><p>Proposal: ${htmlEscape(p.proposal)}<br/>AI confidence: ${htmlEscape(p.confidence)}</p><p><a href="${htmlEscape(safeHttpUrl(p.reviewLink))}">Open and decide in CIVICTAS</a></p>`,
      }),
    });
    const ok = resp.ok;
    return { channel: "email", configured: true, ok, simulated: false, detail: ok ? `Emailed ${to}.` : `Email error ${resp.status}.` };
  } catch (e: any) {
    return { channel: "email", configured: true, ok: false, simulated: false, detail: `Email failed: ${e?.message || "network error"}.` };
  }
}

async function sendWhatsApp(p: ReviewPayload): Promise<ChannelStatus> {
  const token = env("WHATSAPP_TOKEN");
  const phoneId = env("WHATSAPP_PHONE_ID");
  const to = env("WHATSAPP_TO");
  if (!token || !phoneId || !to) {
    return { channel: "whatsapp", configured: false, ok: true, simulated: true, detail: "Simulated (set WHATSAPP_TOKEN + WHATSAPP_PHONE_ID + WHATSAPP_TO)." };
  }
  try {
    const resp = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: summary(p) } }),
    });
    const ok = resp.ok;
    return { channel: "whatsapp", configured: true, ok, simulated: false, detail: ok ? "Sent to WhatsApp." : `WhatsApp error ${resp.status}.` };
  } catch (e: any) {
    return { channel: "whatsapp", configured: true, ok: false, simulated: false, detail: `WhatsApp failed: ${e?.message || "network error"}.` };
  }
}

async function placeVoiceCall(p: ReviewPayload): Promise<ChannelStatus> {
  const sid = env("TWILIO_ACCOUNT_SID");
  const token = env("TWILIO_AUTH_TOKEN");
  const from = env("TWILIO_FROM");
  const to = env("REVIEW_PHONE");
  if (!sid || !token || !from || !to) {
    return { channel: "voice", configured: false, ok: true, simulated: true, detail: "Simulated (set TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_FROM + REVIEW_PHONE)." };
  }
  try {
    const twiml = `<Response><Say voice="Polly.Joanna">This is CIVICTAS. A human review is needed for the decision: ${xmlEscape(p.title)}. The recommended option is: ${xmlEscape(p.proposal)}. With confidence ${xmlEscape(p.confidence)}.</Say><Pause length="1"/><Gather numDigits="1"><Say>Press 1 if you acknowledge and will open the review. Otherwise, hang up.</Say></Gather></Response>`;
    const body = new URLSearchParams({ To: to, From: from, Twiml: twiml });
    const auth = Buffer.from(`${sid}:${token}`).toString("base64");
    const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls.json`, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const ok = resp.ok;
    return { channel: "voice", configured: true, ok, simulated: false, detail: ok ? `Calling ${to}.` : `Twilio error ${resp.status}.` };
  } catch (e: any) {
    return { channel: "voice", configured: true, ok: false, simulated: false, detail: `Call failed: ${e?.message || "network error"}.` };
  }
}

/** Fan out to every channel; never throws. */
export async function dispatchReview(p: ReviewPayload): Promise<ChannelStatus[]> {
  const results = await Promise.allSettled([
    sendTelegram(p),
    sendEmail(p),
    sendWhatsApp(p),
    placeVoiceCall(p),
  ]);
  return results.map((r) =>
    r.status === "fulfilled"
      ? r.value
      : { channel: "telegram", configured: false, ok: false, simulated: true, detail: "Dispatch error." }
  );
}
