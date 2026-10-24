// Feed every edge case through Node SSE parsers and Chrome's own EventSource.
// Usage: node parsers_node.mjs <base url> <case,case,...> <node_modules dir> <html_utils node_modules dir>
// Prints one JSON line per (parser, case): events as [type, data, last event id].
import { createRequire } from 'module';
const [BASE, CASELIST, NM, HNM] = process.argv.slice(2);
const req = createRequire(NM + '/');
const { createParser } = req('eventsource-parser');
const { EventSource } = req('eventsource');
const ver = p => req(p + '/package.json').version;
const cases = CASELIST.split(',');
const TYPES = ['message', 'delta', 'x'];
const emit = (parser, version, lang, c, events, error = null) =>
  console.log(JSON.stringify({ parser, version, lang, case: c, events, error }));

async function viaParser(c, streamDecode) {
  const out = [];
  const p = createParser({ onEvent: e => out.push([e.event || 'message', e.data, e.id || '']) });
  const r = await fetch(`${BASE}/edge/${c}`);
  const td = new TextDecoder();
  for await (const chunk of r.body) p.feed(streamDecode ? td.decode(chunk, { stream: true }) : new TextDecoder().decode(chunk));
  return out;
}

function viaEventSource(ES, url) {
  return new Promise(res => {
    const out = []; const es = new ES(url);
    TYPES.forEach(t => es.addEventListener(t, e => out.push([t, e.data, e.lastEventId])));
    es.onerror = () => { es.close(); res(out); };   // the server closed the stream: stop, do not reconnect
    setTimeout(() => { es.close(); res(out); }, 3000);
  });
}

for (const c of cases) {
  try { emit('eventsource-parser', ver('eventsource-parser'), 'Node', c, await viaParser(c, true)); }
  catch (e) { emit('eventsource-parser', ver('eventsource-parser'), 'Node', c, null, String(e)); }
  try { emit('eventsource-parser, each read decoded alone', ver('eventsource-parser'), 'Node', c, await viaParser(c, false)); }
  catch (e) { emit('eventsource-parser, each read decoded alone', ver('eventsource-parser'), 'Node', c, null, String(e)); }
  try { emit('eventsource (Node EventSource)', ver('eventsource'), 'Node', c, await viaEventSource(EventSource, `${BASE}/edge/${c}`)); }
  catch (e) { emit('eventsource (Node EventSource)', ver('eventsource'), 'Node', c, null, String(e)); }
}

// Chrome's built-in EventSource, same origin (the page is the lab server's /log)
const hreq = createRequire(HNM + '/');
const puppeteer = hreq('puppeteer');
const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.goto(`${BASE}/log`);
const cver = (await browser.version()).replace('HeadlessChrome/', '');
for (const c of cases) {
  const ev = await page.evaluate((c, TYPES) => new Promise(res => {
    const out = []; const es = new EventSource(`/edge/${c}`);
    TYPES.forEach(t => es.addEventListener(t, e => out.push([t, e.data, e.lastEventId])));
    es.onerror = () => { es.close(); res(out); };
    setTimeout(() => { es.close(); res(out); }, 3000);
  }), c, TYPES);
  emit('Chrome EventSource', cver, 'Browser', c, ev);
}
await browser.close();
