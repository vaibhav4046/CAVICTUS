/**
 * Production smoke test — browser-independent verification of the deployed site.
 *
 *   node scripts/prod-smoke.mjs            # against https://civictas.vercel.app
 *   BASE=https://<preview>.vercel.app node scripts/prod-smoke.mjs
 *
 * Validates: page shell loads, JS/CSS assets load, security headers present,
 * /api/health ok with a real provider label, /api/agent/1 streams non-empty
 * output, and the demo-fallback path is reachable. Exits non-zero on any failure.
 */

const BASE = process.env.BASE || "https://civictas.vercel.app";
const results = [];
let failed = 0;

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
}

async function main() {
  console.log(`CIVICTAS prod smoke — ${BASE}\n`);

  // 1. Page shell + security headers
  const root = await fetch(BASE);
  const html = await root.text();
  check("page shell loads (200)", root.status === 200, `status ${root.status}`);
  check("html is the SPA shell", html.includes('<div id="root"') && html.includes("/assets/"), "");
  const h = root.headers;
  check("CSP header present", !!h.get("content-security-policy"));
  check("X-Frame-Options DENY", h.get("x-frame-options") === "DENY");
  check("X-Content-Type-Options nosniff", h.get("x-content-type-options") === "nosniff");
  check("HSTS present", !!h.get("strict-transport-security"));
  check("Referrer-Policy present", !!h.get("referrer-policy"));
  check("Permissions-Policy present", !!h.get("permissions-policy"));

  // 2. Main JS + CSS assets load from self
  const jsPath = (html.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/) || [])[0];
  const cssPath = (html.match(/\/assets\/index-[A-Za-z0-9_-]+\.css/) || [])[0];
  if (jsPath) {
    const r = await fetch(`${BASE}${jsPath}`);
    check("main JS asset 200", r.status === 200, jsPath);
  } else check("main JS asset found in html", false);
  if (cssPath) {
    const r = await fetch(`${BASE}${cssPath}`);
    check("main CSS asset 200", r.status === 200, cssPath);
  } else check("main CSS asset found in html", false);

  // 3. Health + provider label
  const health = await (await fetch(`${BASE}/api/health`)).json();
  check("/api/health ok", health.ok === true);
  check("engine provider present", !!health.engine?.provider && health.engine.provider !== "", health.engine?.provider);
  check("engine has human label", !!health.engine?.label, health.engine?.label || "");
  check("council model reported", !!health.engine?.councilModel, health.engine?.councilModel || "");

  // 4. Live agent streams non-empty, no [ERROR
  const agentRes = await fetch(`${BASE}/api/agent/1`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      category: "Cooling centers (extreme heat)",
      situation: "Riverside, 4 sites, protect heat-vulnerable residents.",
      budget: "300000",
      sites: "4",
      equityGoal: "Prioritize low-AC blocks",
      memoryContext: "No prior decisions yet.",
    }),
  });
  const agentText = await agentRes.text();
  check("/api/agent/1 returns 200", agentRes.status === 200, `status ${agentRes.status}`);
  check("agent output non-empty", agentText.trim().length > 50, `${agentText.trim().length} chars`);
  check("agent output not a server [ERROR", !/\[ERROR:/.test(agentText.slice(0, 120)));
  check("agent output is structured (has a heading)", /#\s/.test(agentText));

  // 5. Demo fallback path reachable (forced mock returns canned output)
  const demoRes = await fetch(`${BASE}/api/agent/1`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category: "Cooling centers", situation: "x", budget: "1", sites: "1", equityGoal: "y", memoryContext: "No prior decisions yet.", demo: true }),
  });
  const demoText = await demoRes.text();
  check("demo-fallback path returns content", demoRes.status === 200 && demoText.trim().length > 50);

  console.log(`\n${failed === 0 ? "ALL PASS" : `${failed} FAILED`} — ${results.length} checks`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("smoke failed:", e);
  process.exit(1);
});
