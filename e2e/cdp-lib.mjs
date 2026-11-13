// Tiny headless-Edge driver over CDP for end-to-end checks.
import { spawn } from 'node:child_process'; import fs from 'node:fs';
export async function launch({ out, base, w = 1360, h = 800, theme = 'light' }) {
  const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
  const port = 9400 + Math.floor(Math.random() * 400);
  const proc = spawn(edge, ['--headless=new', `--remote-debugging-port=${port}`, '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--user-data-dir=' + process.env.TEMP.replace(/\\/g, '/') + '/jt-e2e' + port + '-' + Date.now(), 'about:blank'], { stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 2500));
  const tabs = await (await fetch(`http://localhost:${port}/json`)).json();
  const ws = new WebSocket(tabs.find((x) => x.type === 'page').webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
  let id = 0; const pend = new Map(); const errors = [];
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d.result || d.error); pend.delete(d.id); }
    if (d.method === 'Runtime.exceptionThrown') errors.push('exception: ' + (d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text));
    if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errors.push('console.error: ' + d.params.args.map((a) => a.value ?? a.description).join(' ')); };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 600 });
  const api = {
    errors, sleep, send,
    async js(expression) { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error('js failed: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text)); return r.result?.value; },
    async goto(path, wait = 1500) { await send('Page.navigate', { url: base + path }); await sleep(wait); },
    async url() { return api.js('location.pathname + location.search'); },
    async text(sel = 'body') { return api.js(`document.querySelector(${JSON.stringify(sel)})?.innerText ?? ''`); },
    async waitFor(cond, ms = 8000) { const t = Date.now(); while (Date.now() - t < ms) { if (await api.js(cond)) return true; await sleep(150); } return false; },
    async fill(sel, value) { await api.js(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); el.focus(); const set = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set; set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', { bubbles: true })); })()`); },
    async blur(sel) { await api.js(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); el.focus(); el.blur(); el.dispatchEvent(new FocusEvent('focusout', { bubbles: true })); })()`); },
    async click(sel) { await api.js(`document.querySelector(${JSON.stringify(sel)}).click()`); },
    async shot(name, full = false) { const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: full }); fs.writeFileSync(out + '/' + name + '.png', Buffer.from(r.data, 'base64')); },
    async setFiles(sel, files) { const { root } = await send('DOM.getDocument'); const { nodeId } = await send('DOM.querySelector', { nodeId: root.nodeId, selector: sel }); await send('DOM.setFileInputFiles', { files, nodeId }); },
    async emulate(features) { await send('Emulation.setEmulatedMedia', { features }); },
    async setTheme(t) { await api.js(`localStorage.setItem('theme-v2', '${t}')`); },
    close() { proc.kill(); ws.close(); },
  };
  await api.goto('/', 500); await api.setTheme(theme);
  return api;
}
export function check(label, ok, detail = '') { console.log((ok ? 'PASS ' : 'FAIL ') + label + (ok ? '' : detail ? '  -> ' + detail : '')); if (!ok) process.exitCode = 1; }
