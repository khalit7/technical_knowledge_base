// The same proxy failures seen by Node's `ws` client and by Chrome's WebSocket.
// Usage: node ws_proxy_node.mjs <node_modules dir> <html_utils node_modules dir>
import { createRequire } from 'module';
const [NM, HNM] = process.argv.slice(2);
const WebSocket = createRequire(NM + '/')('ws');
const puppeteer = createRequire(HNM + '/')('puppeteer');

function nodeTry(url, opts = {}) {
  return new Promise(res => {
    const t0 = Date.now(); const out = { url, messages: 0, events: [] };
    const ws = new WebSocket(url, opts);
    ws.on('message', () => out.messages++);
    ws.on('error', e => out.events.push(`error: ${e.message}`));
    ws.on('close', (code, reason) => { out.events.push(`close ${code} ${reason}`); out.ended_at_s = (Date.now() - t0) / 1000; res(out); });
    setTimeout(() => { try { ws.terminate() } catch (e) {} ; res(out) }, 9000);
  });
}
const out = { ws_version: createRequire(NM + '/')('ws/package.json').version };
out.node_no_upgrade = await nodeTry('ws://127.0.0.1:30411/tokens');
out.node_idle = await nodeTry('ws://127.0.0.1:30410/idle');
out.node_origin_evil = await nodeTry('ws://127.0.0.1:30406/tokens', { origin: 'https://evil.example' });

const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.goto('http://127.0.0.1:30401/log');
out.chrome = (await browser.version()).replace('HeadlessChrome/', '');
const chromeTry = url => page.evaluate(url => new Promise(res => {
  const t0 = performance.now(); const ev = []; let n = 0; const ws = new WebSocket(url);
  ws.onmessage = () => n++; ws.onerror = () => ev.push('error');
  ws.onclose = e => { ev.push(`close code ${e.code} wasClean ${e.wasClean} reason '${e.reason}'`); res({ url, messages: n, events: ev, ended_at_s: Math.round(performance.now() - t0) / 1000 }); };
  setTimeout(() => res({ url, messages: n, events: ev, timeout: true }), 9000);
}), url);
out.chrome_idle = await chromeTry('ws://127.0.0.1:30410/idle');
out.chrome_no_upgrade = await chromeTry('ws://127.0.0.1:30411/tokens');
out.chrome_origin_checked = await chromeTry('ws://127.0.0.1:30406/tokens');   // the page's origin is http://127.0.0.1:30401
await browser.close();
console.log(JSON.stringify(out, null, 1));
