/**
 * Best-effort in-memory rate limit shared across API routes. Resets on cold
 * start (no shared store on Hobby), so it blunts casual abuse and protects the
 * paid LLM / notify endpoints rather than guaranteeing a hard ceiling.
 */
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 40;
const hits = new Map<string, { count: number; resetAt: number }>();

interface MinimalReq {
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
}

/**
 * The LEFTMOST X-Forwarded-For hop is the client IP that Vercel's edge prepended;
 * the last hop is attacker-controlled, so never key the limiter on it.
 */
export function clientIp(req: MinimalReq): string {
  const xff = req.headers["x-forwarded-for"];
  const raw = Array.isArray(xff) ? xff[0] : xff || "";
  const first = raw.split(",")[0].trim();
  return first || req.socket?.remoteAddress || "unknown";
}

export function rateLimited(ip: string, max = MAX_REQUESTS, windowMs = WINDOW_MS): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > max;
}
