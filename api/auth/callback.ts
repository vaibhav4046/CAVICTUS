import type { VercelRequest, VercelResponse } from "@vercel/node";

// Implicit OAuth callback. Receives the access token in the URL fragment and
// posts it back to the opener window. Served at /auth/callback via a rewrite.
export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(`<!DOCTYPE html>
<html>
<head><title>CIVICTAS Auth Callback</title></head>
<body style="font-family: sans-serif; text-align: center; padding: 40px; color: #14233A; background: #F7F9FB;">
  <div style="max-width: 400px; margin: 0 auto; padding: 30px; border: 1px solid #E4E9F0; background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
    <h2 style="margin-top: 0; color: #1E6FB8;">Authorizing CIVICTAS...</h2>
    <p style="color: #5B6B82; font-size: 14px;">Passing secure access token to your decision dashboard.</p>
    <div style="margin: 20px auto; width: 30px; height: 30px; border: 3px solid #E4E9F0; border-top-color: #1E6FB8; border-radius: 50%; animation: spin 1s linear infinite;"></div>
  </div>
  <script>
    const hash = window.location.hash;
    const query = window.location.search;
    let token = null;
    let state = null;
    if (hash) { const p = new URLSearchParams(hash.substring(1)); token = p.get('access_token'); state = p.get('state'); }
    if (query) { const p = new URLSearchParams(query); if (!token) token = p.get('access_token'); if (!state) state = p.get('state'); }
    if (token) {
      if (window.opener) {
        window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', token: token, state: state }, window.location.origin);
        setTimeout(() => window.close(), 800);
      } else {
        document.body.innerHTML = '<h2>Authenticated!</h2><p>Please return to the main tab.</p>';
      }
    } else {
      document.body.innerHTML = '<h2 style="color: #B91C1C;">Authentication Error</h2><p style="color: #5B6B82;">No access token was found. Please close this window and try again.</p>';
    }
  </script>
  <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
</body>
</html>`);
}
