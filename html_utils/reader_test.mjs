// End-to-end test of the paper reader (html_utils/kb_reader.js) on a locally built site, in Chromium and in WebKit (Safari's engine), at a
// laptop size and an iPad size. usage: node html_utils/reader_test.mjs [chromium|webkit]   (screenshots: html_utils/.shots/reader/)
// It builds the site into a temporary folder and serves it under /technical_knowledge_base/ as GitHub Pages does. arXiv is real (the test
// needs the network for its first visit); Claude is faked (a fixed answer; the request is read to check the paper is the document Claude
// gets); any other outside request is aborted. On the Attention paper's reader (paper/):
//   1 the paper is on the page: every page, with its text in paragraphs
//   2 nothing from arXiv can run: no script, frame, object, form, event attribute or script URL in the paper
//   3 the AI buddy loads after the paper; a passage selected with the mouse opens its Ask box (with no row of page changes: a printed
//     page cannot be changed), and the question sent to Claude carries the paper as its document
//   4 the pages near the screen are drawn, and the text layer lies on the printed words
//   5 offline: the page reloaded with no network still shows the paper (the cache and the service worker), with the buddy's toolbar;
//     with no Claude key the block handle does not show; the old address paper/pdf/ lands on paper/
//   6 another paper (BERT) opens too
import { chromium, webkit } from 'playwright';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtempSync, mkdirSync, readFileSync, existsSync, statSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, extname, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const H = dirname(fileURLToPath(import.meta.url)), ROOT = resolve(H, '..'), SHOTS = join(H, '.shots', 'reader');
const PAPER = '/technical_knowledge_base/whats_new/papers/attention_is_all_you_need_transformer/';
const OUT = mkdtempSync(join(tmpdir(), 'kb-reader-'));
execFileSync('python3', [join(H, 'build_site.py'), OUT, '/technical_knowledge_base/'], { stdio: 'inherit' });
mkdirSync(SHOTS, { recursive: true });
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.wasm': 'application/wasm', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const server = createServer((q, r) => {
  let p = decodeURIComponent(new URL(q.url, 'http://x').pathname);
  if (!p.startsWith('/technical_knowledge_base/')) { r.writeHead(404); return r.end() }
  let f = join(OUT, p.slice('/technical_knowledge_base/'.length));
  if (!f.startsWith(OUT)) { r.writeHead(403); return r.end() }
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  if (!existsSync(f)) { r.writeHead(404); return r.end() }
  r.writeHead(200, { 'content-type': TYPES[extname(f)] || 'application/octet-stream' }); r.end(readFileSync(f));
});
await new Promise(ok => server.listen(0, '127.0.0.1', ok));
// localhost, not 127.0.0.1: Cache Storage and service workers need a secure context, which localhost is
const SITE = 'http://localhost:' + server.address().port;
const KEY = 'sk-ant-test-reader';
let failures = 0;
const assert = (c, m) => { if (!c) throw new Error(m) };
async function check(name, fn) { try { await fn(); console.log('  ok  ', name) } catch(e) { failures++; console.log('  FAIL', name, '\n       ', String(e.message || e).split('\n')[0]) } }

async function visit(browserType, size) {
  const browser = await browserType.launch();
  const tag = browserType.name() + '-' + size.name;
  console.log(`\n${tag} (${size.width}x${size.height})`);
  for (const mode of ['pdf']) {
    const url = SITE + PAPER + 'paper/';
    const context = await browser.newContext({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: size.dpr, hasTouch: false, serviceWorkers: 'block',   // a service worker hides the page's requests from route() in WebKit, so the fake Claude would be missed

      storageState: { cookies: [], origins: [{ origin: SITE, localStorage: [{ name: 'kbAsk.key', value: KEY }, { name: 'kbBuddy.min', value: '0' }] }] } });
    const requests = [], stray = [];
    await context.route(u => /^https?:$/.test(u.protocol) && u.origin !== SITE && u.hostname !== 'arxiv.org', route => {
      const u = new URL(route.request().url());
      if (u.hostname === 'api.anthropic.com') {
        if (route.request().method() === 'GET') return route.fulfill({ headers: { 'access-control-allow-origin': '*' }, json: { data: [], has_more: false } });
        requests.push(route.request().postDataJSON());
        const sse = (type, d) => `event: ${type}\ndata: ${JSON.stringify({ type, ...d })}\n\n`, message = { id: 'm', type: 'message', role: 'assistant', model: 'x' }, usage = { input_tokens: 1, output_tokens: 1 };
        if (!requests.at(-1).stream) return route.fulfill({ headers: { 'access-control-allow-origin': '*' }, json: { ...message, content: [{ type: 'text', text: 'A test answer.' }], stop_reason: 'end_turn', usage } });
        return route.fulfill({ headers: { 'access-control-allow-origin': '*' }, contentType: 'text/event-stream', body: sse('message_start', { message: { ...message, content: [], stop_reason: null, usage } })
          + sse('content_block_start', { index: 0, content_block: { type: 'text', text: '' } }) + sse('content_block_delta', { index: 0, delta: { type: 'text_delta', text: 'A test answer.' } })
          + sse('content_block_stop', { index: 0 }) + sse('message_delta', { delta: { stop_reason: 'end_turn', stop_sequence: null }, usage }) + sse('message_stop', {}) });
      }
      if (u.hostname === 'fonts.googleapis.com') return route.fulfill({ contentType: 'text/css', body: '' });
      stray.push(u.href); return route.abort();
    });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(url);
    await check(`${mode} 1 the paper is on the page`, async () => {
      await page.waitForFunction(() => document.querySelectorAll('#kbPaper .pg').length > 10 && document.querySelectorAll('#kbPaper .kb-pp').length > 100, null, { timeout: 45000 });
      const s = await page.evaluate(() => ({ pages: document.querySelectorAll('#kbPaper .pg').length, paras: document.querySelectorAll('#kbPaper .kb-pp').length,
        first: [...document.querySelectorAll('#kbPaper .pg')[0].querySelectorAll('.kb-pp')].map(p => p.textContent).join(' | ').slice(0, 400) }));
      assert(s.pages === 15 && /Attention Is All You Need/.test(s.first), JSON.stringify(s));
    });
    await check(`${mode} 2 nothing from arXiv can run`, async () => {
      const bad = await page.evaluate(() => [...document.querySelectorAll('#kbPaper *')].filter(e => /^(script|iframe|object|embed|form|style|link|meta|base|svg)$/i.test(e.localName) ||
        [...e.attributes].some(a => /^on/i.test(a.name) || /^\s*javascript:/i.test(a.value))).map(e => e.outerHTML.slice(0, 80)));
      assert(!bad.length, bad.join(' ; '));
    });
    await check(`${mode} 3 the buddy loads after the paper; a selected passage asked about sends the paper as Claude's document`, async () => {
      await page.waitForSelector('#kbBar', { timeout: 20000 });
      const target = '#kbPaper .pg:nth-child(3) .kb-pp';
      const el = await page.evaluateHandle(sel => { const es = [...document.querySelectorAll(sel)].filter(e => e.textContent.length > 200); return es[0] }, target);
      await el.evaluate(e => e.scrollIntoView({ block: 'center' }));
      await page.waitForTimeout(400);
      // the drag starts on the first words of the paragraph (its first text, not a hidden TeX span)
      const r = await el.evaluate(e => { const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT, { acceptNode: t => t.nodeValue.trim().length > 3 && !t.parentElement.closest('.rd-tex,math') ? 1 : 3 }), t = w.nextNode(), g = document.createRange();
        g.setStart(t, 0); g.setEnd(t, 1); const q = g.getBoundingClientRect(); return { x: q.left + 4, y: q.top + q.height / 2 } });
      await page.mouse.move(r.x, r.y); await page.mouse.down(); await page.mouse.move(r.x + 220, r.y, { steps: 8 }); await page.mouse.up();
      await page.waitForSelector('#kbAskPop:not([hidden])', { timeout: 8000 }).catch(async e => { await page.screenshot({ path: join(SHOTS, `${tag}-${mode}-noselect.png`) }); throw new Error('no Ask box; the selection is "' + await page.evaluate(() => String(getSelection()).slice(0, 80)) + '"') });
      await page.screenshot({ path: join(SHOTS, `${tag}-${mode}-select.png`) });
      const row = await page.evaluate(() => !!document.querySelector('#kbAskPop .kb-blk'));
      assert(!row, 'the reader offers page changes (Hide, move, + Text, + Visual) on a printed page');
      await page.fill('#kbAskPop input', 'What does this say?'); await page.press('#kbAskPop input', 'Enter');
      await page.waitForFunction(() => [...document.querySelectorAll('.kb-note .kb-na')].some(a => a.textContent.includes('A test answer')), null, { timeout: 15000 });
      const body = JSON.stringify(requests.at(-1) || {});
      assert(/Scaled Dot-Product Attention/.test(body) && /multi-head attention/i.test(body), 'the request does not carry the paper');
      await page.screenshot({ path: join(SHOTS, `${tag}-${mode}-note.png`) });
    });
    if (mode === 'pdf') await check('pdf 4 the pages near the screen are drawn, and the text layer lies on the printed words', async () => {
      await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(300);
      await page.waitForFunction(() => { const c = document.querySelector('#kbPaper .pg canvas'); return c && c.width > 0 }, null, { timeout: 15000 });
      const s = await page.evaluate(() => { const pg = document.querySelector('#kbPaper .pg'), c = pg.querySelector('canvas'), x = c.getContext('2d'), d = x.getImageData(0, 0, c.width, c.height).data;
        let dark = 0; for (let i = 0; i < d.length; i += 4 * 97) if (d[i] < 128) dark++;
        // the title's span should lie over dark pixels on the canvas
        const t = [...pg.querySelectorAll('.kb-pp span')].find(s => /Attention/.test(s.textContent)), tr = t.getBoundingClientRect(), cr = c.getBoundingClientRect();
        const sx = c.width / cr.width, img = x.getImageData((tr.left - cr.left) * sx, (tr.top - cr.top) * sx, Math.max(1, tr.width * sx), Math.max(1, tr.height * sx)).data;
        let ink = 0; for (let i = 0; i < img.length; i += 4) if (img[i] < 128) ink++;
        return { dark, ink: ink / (img.length / 4), far: document.querySelectorAll('#kbPaper .pg canvas[width="0"], #kbPaper .pg canvas:not([width])').length } });
      assert(s.dark > 100 && s.ink > 0.05 && s.far > 3, JSON.stringify(s));
      await page.screenshot({ path: join(SHOTS, `${tag}-pdf-top.png`) });
    });
    await check(`${mode} no page errors, no stray requests`, async () => { assert(!errors.length && !stray.length, errors.concat(stray).join(' ; ')) });
    await context.close();
    // offline, in a visit of its own with the service worker and no Claude key (so the buddy calls nothing outside)
    const off = await browser.newContext({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: size.dpr, serviceWorkers: 'allow' });
    await off.route(u => /^https?:$/.test(u.protocol) && u.origin !== SITE && u.hostname !== 'arxiv.org', route => route.abort());
    await check(`${mode} 5 offline: the page reloaded with no network still shows the paper, with the buddy's toolbar`, async () => {
      const p2 = await off.newPage(); await p2.goto(url);
      await p2.waitForFunction(() => document.querySelectorAll('#kbPaper .kb-pp').length > 100, null, { timeout: 45000 });
      await p2.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 10000 }).catch(() => {});
      await p2.waitForTimeout(3000);   // the reader keeps its files in the background
      await off.setOffline(true);
      await p2.reload();
      await p2.waitForFunction(() => document.querySelectorAll('#kbPaper .kb-pp').length > 100, null, { timeout: 30000 });
      await p2.waitForSelector('#kbBar', { timeout: 15000 });
      await p2.screenshot({ path: join(SHOTS, `${tag}-${mode}-offline.png`) });
      if (mode === 'pdf') {   // with no Claude key, the hover handle on a printed page would open an empty menu: it is not shown
        const errs = []; p2.on('pageerror', e => errs.push(String(e)));
        const q = await p2.evaluate(() => { const e = [...document.querySelectorAll('#kbPaper .pg:nth-child(2) .kb-pp')].find(x => x.textContent.length > 200); e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.left + 30, y: r.top + 5 } });
        await p2.mouse.move(q.x, q.y); await p2.mouse.move(q.x + 5, q.y + 2); await p2.waitForTimeout(400);
        assert(await p2.evaluate(() => { const h = document.getElementById('kbHandle'); return !h || h.hidden }), 'the block handle shows on the PDF view with no Claude key');
        assert(!errs.length, errs.join(' ; '));
      }
    });
    await check('pdf 5 the old address paper/pdf/ lands on paper/', async () => {
      await off.setOffline(false);
      const p3 = await off.newPage(); await p3.goto(SITE + PAPER + 'paper/pdf/'); await p3.waitForURL(u => u.pathname.endsWith('/paper/'), { timeout: 15000 });
    });
    await check('pdf 6 another paper (BERT) opens, its pages and text', async () => {
      const p4 = await off.newPage(); await p4.goto(SITE + '/technical_knowledge_base/whats_new/papers/bert/paper/');
      await p4.waitForFunction(() => document.querySelectorAll('#kbPaper .pg').length > 10 && [...document.querySelectorAll('#kbPaper .kb-pp')].some(p => /BERT/.test(p.textContent)), null, { timeout: 60000 });
      await p4.waitForSelector('#kbBar', { timeout: 20000 });
    });
    await off.close();
  }
  await browser.close();
}
const which = process.argv[2];
for (const b of which === 'webkit' ? [webkit] : which === 'chromium' ? [chromium] : [chromium, webkit])
  for (const size of [{ name: 'laptop', width: 1366, height: 860, dpr: 2 }, { name: 'ipad', width: 1024, height: 1366, dpr: 2 }]) await visit(b, size);
server.close(); rmSync(OUT, { recursive: true, force: true });
console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
process.exit(failures ? 1 : 0);
