/**
 * Free web search (DuckDuckGo HTML endpoint) — no API key required.
 *
 * Used to give the Evidence agent real retrieval when the provider has no
 * native grounding (e.g. Groq). Resilient by design: on any failure it returns
 * an empty list so the pipeline degrades gracefully to benchmark reasoning.
 */

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function unwrapDdgUrl(href: string): string {
  // DuckDuckGo wraps results as /l/?uddg=<encoded-url>
  const m = href.match(/[?&]uddg=([^&]+)/);
  if (m) {
    try {
      return decodeURIComponent(m[1]);
    } catch {
      return href;
    }
  }
  return href.startsWith("//") ? `https:${href}` : href;
}

export async function webSearch(query: string, limit = 5): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const resp = await fetch("https://html.duckduckgo.com/html/", {
      method: "POST",
      headers: {
        "User-Agent": UA,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `q=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });
    if (!resp.ok) return [];
    const html = await resp.text();

    const results: SearchResult[] = [];
    const linkRe = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
    const snippetRe = /<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    const snippets: string[] = [];
    let sm: RegExpExecArray | null;
    while ((sm = snippetRe.exec(html)) !== null) snippets.push(decodeEntities(sm[1]));

    let lm: RegExpExecArray | null;
    let i = 0;
    while ((lm = linkRe.exec(html)) !== null && results.length < limit) {
      const url = unwrapDdgUrl(lm[1]);
      const title = decodeEntities(lm[2]);
      if (!url || !title) {
        i++;
        continue;
      }
      results.push({ title, url, snippet: snippets[i] || "" });
      i++;
    }
    return results;
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

export function formatSearchResults(results: SearchResult[]): string {
  return results
    .map((r, i) => `${i + 1}. [${r.title}](${r.url})${r.snippet ? ` — ${r.snippet}` : ""}`)
    .join("\n");
}
