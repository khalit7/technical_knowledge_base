// Check the learning map on the home page: builds the site to a scratch folder, serves it, and opens the home page
// at 920 px light and 390 px dark in headless Chrome.
// usage: node html_utils/check_learning_map.mjs <scratch dir> [screenshot dir, default <scratch dir>]
// Checks: no script errors, no sideways scroll, every map node links to a built page, every topic page is on the map,
// node labels fit their boxes and nodes never overlap, each overview bar spans exactly its topic's earliest and latest
// page stage (stage = longest prerequisite chain, recomputed here), "path to" for three sample pages lists exactly the prerequisite
// closure in a valid order, and nothing changes or animates before a click. Ends "learning map: fail=0" when clean.
import puppeteer from 'puppeteer';
import { execFileSync } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scratch = path.resolve(process.argv[2] || '');
if (!process.argv[2]) { console.error('usage: node html_utils/check_learning_map.mjs <scratch dir> [shots dir]'); process.exit(2) }
const shots = path.resolve(process.argv[3] || scratch);
const OUT = path.join(scratch, 'lm_site');
fs.mkdirSync(shots, { recursive: true });
execFileSync('python3', [path.join(ROOT, 'html_utils/build_site.py'), OUT, '/'], { stdio: ['ignore', 'ignore', 'inherit'] });

// the graph, read independently from pages.json
const pages = JSON.parse(fs.readFileSync(path.join(ROOT, 'technical_knowledge_base/pages.json'), 'utf8')).pages;
const byId = {}; pages.forEach(p => byId[p.id.replace(/-/g, '')] = p);
pages.forEach(p => (p.aliases || []).forEach(a => byId[a.replace(/-/g, '')] ??= p));
const urlOf = p => '/' + p.path.replace(/^technical_knowledge_base\//, '') + '/';
const pre = p => (p.prereqs || []).map(r => byId[r.replace(/-/g, '')]).filter(Boolean);
const closure = (p, s = new Set()) => { for (const q of pre(p)) if (!s.has(q)) { s.add(q); closure(q, s) } return s };
const topicPages = pages.filter(p => p.status === 'html_only' && !p.path.includes('/reference/') && fs.existsSync(path.join(ROOT, p.path, 'index.html')));
// page stage (0 = needs nothing) and topic (top-most ancestor in pages.json) -> expected bar per topic slug
const byPath = Object.fromEntries(pages.map(p => [p.path, p]));
const stageMemo = new Map();
const stage = p => { if (!stageMemo.has(p)) stageMemo.set(p, 1 + Math.max(-1, ...pre(p).map(stage))); return stageMemo.get(p) };
const rootOf = p => { let r = p.path, q = p.path; while (q.includes('/')) { q = q.slice(0, q.lastIndexOf('/')); if (byPath[q]) r = q } return r };
const wantBar = {};
for (const p of topicPages) { const slug = rootOf(p).split('/').pop().replace(/^topic_/, ''), g = stage(p);
  const w = wantBar[slug] ??= { a: g, b: g, n: 0 }; w.a = Math.min(w.a, g); w.b = Math.max(w.b, g); w.n++ }

const server = http.createServer((req, res) => {
  let f = path.join(OUT, decodeURIComponent(req.url.split(/[?#]/)[0]));
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!f.startsWith(OUT) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return }
  res.writeHead(200, { 'content-type': f.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}/`;

let fail = 0;
const bad = (...m) => { fail++; console.log('FAIL', ...m) };
const exists = href => { const u = new URL(href, BASE); if (u.origin !== new URL(BASE).origin) return false;
  return fs.existsSync(path.join(OUT, decodeURIComponent(u.pathname), 'index.html')) };
const wait = ms => new Promise(r => setTimeout(r, ms));

const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined,
  args: process.platform === 'linux' ? ['--no-sandbox'] : [] });

async function open(width, scheme) {
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/pagefind|Failed to load resource/i.test(m.text())) errs.push(m.text()) });
  p.on('requestfailed', r => { if (!/pagefind/.test(r.url())) errs.push('request failed ' + r.url()) });
  await p.setRequestInterception(true);
  p.on('request', r => r.url().startsWith(BASE) ? r.continue() : (errs.push('outside fetch ' + r.url()), r.abort()));
  await p.setViewport({ width, height: 1000 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(BASE, { waitUntil: 'load' });
  return { p, errs };
}
const sideways = p => p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
const shot = async (p, name) => { const el = await p.$('#lm'); await el.screenshot({ path: path.join(shots, name) }); console.log('shot', path.join(shots, name)) };

// labels inside their boxes, no two boxes overlapping, in the SVG shown now
const geometry = p => p.evaluate(() => {
  const out = [], svg = document.querySelector('#lm-view svg'); if (!svg || !svg.getBoundingClientRect().width) return out;
  const boxes = [];
  svg.querySelectorAll('.lm-n,.lm-t').forEach(g => {
    const r = g.querySelector('.lm-box').getBBox(); boxes.push([r, g.textContent.slice(0, 40)]);
    g.querySelectorAll('text').forEach(t => { const tb = t.getBBox(); if (tb.x + tb.width > r.x + r.width - 2 || tb.y + tb.height > r.y + r.height + 1) out.push('label overflows: ' + t.textContent) });
    if (g.matches('.lm-n')) { const lt = [...g.querySelectorAll('text')].slice(-1)[0].getBBox(), pb = g.querySelector('.lm-pb circle').getBBox();
      if (lt.x + lt.width > pb.x - 1 && lt.y + lt.height > pb.y) out.push('minutes under the path button: ' + g.textContent.slice(0, 40)) }
  });
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const [a] = boxes[i], [c] = boxes[j];
    if (a.x < c.x + c.width && c.x < a.x + a.width && a.y < c.y + c.height && c.y < a.y + a.height) out.push('overlap: ' + boxes[i][1] + ' / ' + boxes[j][1]);
  }
  const sc = svg.closest('.lm-scroll'); if (sc && sc.scrollWidth > sc.clientWidth + 1) out.push('map scrolls sideways inside its box at this width');
  const sb = svg.getBBox(), w = +svg.getAttribute('width'), h = +svg.getAttribute('height');
  if (sb.x + sb.width > w + 1 || sb.y + sb.height > h + 1 || sb.x < -3) out.push(`drawing outside its svg ${JSON.stringify([sb.x, sb.y, sb.width, sb.height, w, h])}`);
  return out;
});
const state = p => p.evaluate(() => document.getElementById('lm').innerHTML + '|' + document.getAnimations().length + '|' + location.hash);

// ---------------- 920 light
{
  const { p, errs } = await open(920, 'light');
  const s0 = await state(p); await wait(2000); const s1 = await state(p);
  if (s0 !== s1) bad('the map changed before any click');
  if (await p.evaluate(() => document.getAnimations().length)) bad('animations running on load');
  if (await p.$('#lm .cur,#lm .todo')) bad('a step is highlighted on load');
  if (await sideways(p)) bad('920: sideways scroll');
  (await geometry(p)).forEach(m => bad('overview', m));
  // each bar spans exactly its pages' min and max stage, in data and on screen
  const bars = await p.evaluate(() => {
    const D = JSON.parse(document.getElementById('lm-data').textContent);
    const heads = [...document.querySelectorAll('#lm-ov .lm-col')].map(t => { const b = t.getBBox(); return b.x + b.width / 2 });
    const cw = heads.length > 1 ? heads[1] - heads[0] : 0;
    return { cols: heads.length, bars: [...document.querySelectorAll('#lm-ov .lm-t')].map(g => { const r = g.querySelector('.lm-span').getBBox(), k = +g.dataset.t;
      const a = +g.dataset.a, b = +g.dataset.b;
      return { slug: D.T[k].slug, a, b, n: D.T[k].p.length, x0: r.x, x1: r.x + r.width, c0: heads[a] - cw / 2, c1: heads[b] + cw / 2 } }) };
  });
  const maxStage = Math.max(...topicPages.map(stage));
  if (bars.cols !== maxStage + 1) bad('overview has', bars.cols, 'stage columns, want', maxStage + 1);
  for (const bar of bars.bars) {
    const w = wantBar[bar.slug];
    if (!w) { bad('bar for an unknown topic', bar.slug); continue }
    if (bar.a !== w.a || bar.b !== w.b) bad(`bar ${bar.slug} spans stages ${bar.a + 1}--${bar.b + 1}, its pages span ${w.a + 1}--${w.b + 1}`);
    if (bar.n !== w.n) bad(`bar ${bar.slug} has ${bar.n} pages, want ${w.n}`);
    if (Math.abs(bar.x0 - bar.c0) > 5 || Math.abs(bar.x1 - bar.c1) > 5) bad(`bar ${bar.slug} drawn from x ${bar.x0.toFixed(0)} to ${bar.x1.toFixed(0)}, its stage cells run ${bar.c0.toFixed(0)} to ${bar.c1.toFixed(0)}`);
    w.seen = true;
  }
  Object.entries(wantBar).forEach(([s, w]) => { if (!w.seen) bad('topic without a bar', s) });
  console.log(`overview: ${bars.bars.length} bars on ${bars.cols} stages`);
  // hover lights up the topics a bar's pages build on, and only them
  {
    const k = await p.$eval('#lm-ov .lm-t[data-dep]:not([data-dep=""])', g => g.dataset.t).catch(() => null);
    if (k != null) {
      await p.hover(`#lm-ov .lm-t[data-t="${k}"] .lm-span`); await wait(40);
      const r = await p.evaluate(k => { const g = document.querySelector(`#lm-ov .lm-t[data-t="${k}"]`), ds = g.dataset.dep.split(' ');
        const lit = [...document.querySelectorAll('#lm-ov .lm-t.dep')].map(x => x.dataset.t);
        return lit.length === ds.length && ds.every(d => lit.includes(d)) && g.classList.contains('me') }, k);
      if (!r) bad('hover does not light up exactly the topics a bar depends on');
      await shot(p, 'lm_920_light_overview_hover.png');
      await p.mouse.move(5, 5); await wait(40);
      if (await p.$('#lm-ov.hov')) bad('hover highlight stays after the pointer leaves');
    }
  }
  await shot(p, 'lm_920_light_overview.png');
  // every topic view: links exist, every topic page appears, geometry
  const nT = await p.$$eval('#lm-ov .lm-t', g => g.length);
  const seen = new Set();
  for (let k = 0; k < nT; k++) {
    await p.click(`#lm-ov .lm-t[data-t="${k}"]`).catch(async () => { await p.evaluate(k => document.querySelector(`#lm-ov .lm-t[data-t="${k}"]`).dispatchEvent(new MouseEvent('click', { bubbles: true })), k) });
    await wait(60);
    const hrefs = await p.$$eval('#lm-view .lm-n a', as => as.map(a => a.getAttribute('href')));
    if (!hrefs.length) bad('topic view empty', k);
    hrefs.forEach(h => { seen.add(h); if (!exists(h)) bad('node links to a missing page', h) });
    (await geometry(p)).forEach(m => bad('topic', k, m));
    if (k === 0 || k === 19) await shot(p, `lm_920_light_topic${k}.png`);
    await p.click('#lm-back'); await wait(40);
  }
  topicPages.forEach(tp => { if (!seen.has(urlOf(tp))) bad('topic page missing from the map', tp.title) });
  console.log(`topics ${nT}, distinct page nodes ${seen.size} of ${topicPages.length}`);
  // path to three sample pages, picked through the search box
  const samples = ['xai_spacexai_grok', 'parameter_efficient_fine_tuning', 'attention_variants']
    .map(s => topicPages.find(t => t.path.endsWith('/' + s)) || topicPages.find(t => t.path.includes(s))).filter(Boolean);
  if (samples.length < 3) samples.push(...topicPages.filter(t => closure(t).size > 3).slice(0, 3 - samples.length));
  for (const t of samples) {
    await p.click('#lm-q', { clickCount: 3 }); await p.type('#lm-q', t.title.split(':')[0].slice(0, 40));
    await wait(80);
    const first = await p.$$eval('#lm-sug button', bs => bs.map(x => x.textContent));
    // choose the suggestion that is this page
    const idx = await p.$$eval('#lm-sug button', (bs, title) => bs.findIndex(x => x.textContent.startsWith(title)), t.title);
    if (idx < 0) { bad('search did not offer', t.title, first); continue }
    for (let i = 0; i < idx; i++) await p.keyboard.press('ArrowDown');
    await p.keyboard.press('Enter'); await wait(120);
    const got = await p.$$eval('#lm-order li a', as => as.map(a => a.getAttribute('href')));
    const want = new Set([...closure(t)].map(urlOf).concat([urlOf(t)]));
    const gotSet = new Set(got);
    if (got.length !== want.size || [...want].some(u => !gotSet.has(u))) bad('path list is not the closure', t.title, got.length, want.size);
    const posn = Object.fromEntries(got.map((u, i) => [u, i]));
    for (const u of got) { const pg = pages.find(x => urlOf(x) === u); for (const q of pre(pg)) if (!(posn[urlOf(q)] < posn[u])) bad('order invalid', pg.title, 'before', q.title) }
    if (got[got.length - 1] !== urlOf(t)) bad('target is not last', t.title);
    const mapHrefs = await p.$$eval('#lm-view .lm-n a', as => as.map(a => a.getAttribute('href')));
    if (mapHrefs.length !== want.size || mapHrefs.some(h => !want.has(h))) bad('path map nodes differ from the closure', t.title);
    (await geometry(p)).forEach(m => bad('path', t.title, m));
    const total = await p.$eval('.lm-sum', e => e.textContent);
    const mins = [...want].reduce((s, u) => { const f = path.join(ROOT, 'technical_knowledge_base', u, 'index.html'); const m = fs.readFileSync(f, 'utf8').match(/Reading:\s*(\d+)\s*min/); return s + (m ? +m[1] : 0) }, 0);
    if (!total.includes(mins + ' min')) bad('total minutes', t.title, total, mins);
    console.log(`path to ${t.title}: ${got.length} pages, ${mins} min, ok order`);
    // nothing moves until a step is pressed
    const a0 = await state(p); await wait(1500);
    if (a0 !== await state(p) || await p.$('#lm .cur')) bad('path view changed before a click', t.title);
    if (t === samples[0]) {
      await shot(p, 'lm_920_light_path.png');
      await p.click('#lm-next'); await p.click('#lm-next'); await p.click('#lm-next'); await wait(60);
      const cur = await p.$$eval('#lm-view .lm-n.cur', g => g.length), li = await p.$$eval('#lm-order li.cur', g => g.length);
      if (cur !== 1 || li !== 1) bad('step did not highlight exactly one page', cur, li);
      await shot(p, 'lm_920_light_path_step3.png');
    }
  }
  if (await sideways(p)) bad('920: sideways scroll after use');
  errs.forEach(e => bad('920 error:', e));
  await p.close();
}

// ---------------- 390 dark
{
  const { p, errs } = await open(390, 'dark');
  const s0 = await state(p); await wait(1500);
  if (s0 !== await state(p)) bad('390: the map changed before any click');
  if (await sideways(p)) bad('390: sideways scroll');
  if (await p.$eval('#lm-view', e => e.offsetParent !== null)) bad('390: the wide map is shown instead of the list');
  const small = await p.$$eval('#lm .lm-list *, #lm .lm-sub', es => es.filter(e => e.childNodes.length && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 11).length);
  if (small) bad('390: text under 11 px', small);
  await shot(p, 'lm_390_dark_overview.png');
  await p.click('#lm-ovl .lm-chip'); await wait(80);
  const hrefs = await p.$$eval('#lm-plist a', as => as.map(a => a.getAttribute('href')));
  if (!hrefs.length) bad('390: topic list empty');
  hrefs.forEach(h => { if (!exists(h)) bad('390: list links to a missing page', h) });
  if (await sideways(p)) bad('390: sideways scroll in a topic');
  await shot(p, 'lm_390_dark_topic.png');
  const btns = await p.$$('#lm-plist .lm-pbt'); await btns[btns.length - 1].click(); await wait(80);
  if (!(await p.$$('#lm-order li')).length) bad('390: path list empty');
  if (await sideways(p)) bad('390: sideways scroll in a path');
  await shot(p, 'lm_390_dark_path.png');
  errs.forEach(e => bad('390 error:', e));
  await p.close();
}
await b.close();
server.close();
console.log(`learning map: fail=${fail}`);
process.exit(fail ? 1 : 0);
