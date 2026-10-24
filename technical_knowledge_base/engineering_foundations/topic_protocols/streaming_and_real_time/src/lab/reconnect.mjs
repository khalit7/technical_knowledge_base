// Chrome's EventSource against a stream that is cut mid-answer: when does it reconnect, what does it send,
// and what does the reader see. Usage: node reconnect.mjs <base url> <html_utils node_modules dir>
import { createRequire } from 'module';
const [BASE, HNM] = process.argv.slice(2);
const puppeteer = createRequire(HNM + '/')('puppeteer');
const SCEN = {
  no_ids: { q: 'drop_after=3&gap=0.05', secs: 8, note: 'no id: lines; the server cuts the connection after 3 events' },
  ids: { q: 'ids=1&drop_after=3', secs: 12, note: 'id: on every event; cut after 3 events per connection; the server resumes after Last-Event-ID' },
  ids_retry_204: { q: 'ids=1&drop_after=3&retry=500&stop204=1', secs: 6, note: 'as before, plus retry: 500 and a 204 once nothing is left' },
};
const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.goto(`${BASE}/log`);
const out = { chrome: (await browser.version()).replace('HeadlessChrome/', ''), scenarios: {} };
for (const [name, s] of Object.entries(SCEN)) {
  await fetch(`${BASE}/log/clear`, { method: 'POST' });
  const tag = name;
  const client = await page.evaluate((url, secs) => new Promise(res => {
    const t0 = performance.now(); const log = []; const T = () => Math.round(performance.now() - t0) / 1000;
    const es = new EventSource(url);
    es.onopen = () => log.push([T(), 'open', '']);
    es.onerror = () => log.push([T(), 'error', ['CONNECTING', 'OPEN', 'CLOSED'][es.readyState]]);
    ['message_start', 'content_block_delta', 'message_stop'].forEach(t => es.addEventListener(t, e => {
      const d = JSON.parse(e.data); log.push([T(), t, (d.delta ? d.delta.text : '') + (e.lastEventId ? ' #' + e.lastEventId : '')]);
    }));
    setTimeout(() => { es.close(); res(log); }, secs * 1000);
  }), `${BASE}/sse?tag=${tag}&${s.q}`, s.secs);
  const server = await (await fetch(`${BASE}/log`)).json();
  const t0 = server.length ? server[0].t : 0;
  out.scenarios[name] = { url: `/sse?tag=${tag}&${s.q}`, note: s.note, secs: s.secs, client,
    server: server.filter(r => r.tag === tag).map(r => ({ t: Math.round((r.t - t0) * 1000) / 1000, last_event_id: r.last_event_id ?? null, work: r.work ?? null })) };
}
await browser.close();
console.log(JSON.stringify(out, null, 1));
