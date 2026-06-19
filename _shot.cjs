// Offline screenshot harness for CIVICTAS (no deps; node 24 global WebSocket/fetch).
// Captures the LIVE deployed site in dark/light/mobile and after a real run.
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const URL = "https://civictas.vercel.app/";
const OUT = "D:/project/CAVICTUS/_shots";
const PORT = 9223;
fs.mkdirSync(OUT, { recursive: true });
const udd = fs.mkdtempSync(path.join(os.tmpdir(), 'cvcdp-'));

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=' + PORT, '--user-data-dir=' + udd,
  '--window-size=1440,900', '--hide-scrollbars', URL
], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getWsUrl() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await r.json();
      const page = list.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) return page.webSocketDebuggerUrl;
    } catch (e) {}
    await sleep(200);
  }
  throw new Error('no devtools endpoint');
}

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let id = 0; const pending = new Map(); const errors = [];
    const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
    ws.onopen = () => resolve({ send, errors });
    ws.onerror = e => reject(e);
    ws.onmessage = ev => {
      const m = JSON.parse(ev.data);
      if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
      if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; errors.push('EXCEPTION: ' + ((d.exception && d.exception.description) || d.text)); }
      if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') { errors.push('CONSOLE.ERROR: ' + m.params.args.map(a => a.value || a.description || '').join(' ')); }
    };
  });
}

(async () => {
  const wsUrl = await getWsUrl();
  const { send, errors } = await connect(wsUrl);
  await send('Page.enable');
  await send('Runtime.enable');
  const ev = expr => send('Runtime.evaluate', { expression: expr });
  async function reload(seen, theme) {
    await ev(`try{${seen ? "localStorage.setItem('civictas_seen','1');" : "localStorage.removeItem('civictas_seen');"}localStorage.setItem('civictas_theme','${theme}');}catch(e){}`);
    await send('Page.reload'); await sleep(3500);
  }
  async function shot(name) { const { data } = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(data, 'base64')); }
  async function full(name, h) { const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: 1440, height: h, scale: 0.5 } }); fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(data, 'base64')); }

  // 1. Landing (dark + light)
  await reload(false, 'dark'); await shot('landing-dark');
  await reload(false, 'light'); await shot('landing-light');

  // 2. Studio empty (dark)
  await reload(true, 'dark'); await sleep(600); await shot('studio-dark');

  // 3. Run the sample, wait for pipeline + council + ledger, capture full page
  await ev("(()=>{const b=[...document.querySelectorAll('button')].find(x=>/run the sample/i.test(x.textContent||''));if(b)b.click();})()");
  await sleep(22000);
  await ev("window.scrollTo(0,0)"); await sleep(400);
  await shot('studio-ran-top');
  await full('studio-ran-full', 5200);

  // 4. Light studio (after run state persists in same session)
  await ev("document.documentElement.classList.remove('dark');localStorage.setItem('civictas_theme','light');");
  await sleep(600); await shot('studio-light');

  // 5. Mobile (dark, landing)
  await reload(false, 'dark');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await sleep(1200); await shot('landing-mobile');
  await reload(true, 'dark');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await sleep(1000); await shot('studio-mobile');

  console.log('CONSOLE_ERRORS=' + JSON.stringify(errors));
  console.log('SHOTS=' + fs.readdirSync(OUT).join(','));
  try { chrome.kill(); } catch (e) {}
  process.exit(0);
})().catch(e => { console.error('HARNESS_FAIL', e); try { chrome.kill(); } catch (_) {} process.exit(1); });
