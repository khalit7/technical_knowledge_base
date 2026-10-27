// Check the learning map on the home page: builds the site to a scratch folder, serves it, and opens the home page
// at 920 px light, 920 px dark, 920 px with reduced motion, and 390 px dark in headless Chrome.
// usage: node html_utils/check_learning_map.mjs <scratch dir> [screenshot dir, default <scratch dir>]
// Checks, against the graph recomputed here from pages.json:
//   overview  every topic has one card, in the layer the rule gives (topic A below topic B when at least a third of
//             A's pages have a page of B in their prerequisite closure; layer = longest chain of such links; topics with no
//             such link either way in layer 1's upper rows, no other band; phone lists layer 1's linked topics last), layers
//             stacked top to bottom; card numbers (pages, hours, pages per stage with each pill titled "n pages at
//             stage k" under stage numbers 1..N, the "Some pages also use" list); every strong link drawn as a line from card to card, thickness
//             by share, passing through no other card; no weak link visible before a focus; cards and labels fit
//   focus     hovering (wide) or tapping (narrow) each topic lights exactly it, the topics it builds on and the topics
//             building on it, shows its weak links dotted and its strong links' labels, runs dots along the lines into
//             it while focused, and clears (dots stopped and removed) on leave
//   views     every topic view links only to built pages and holds every topic page; it grows in under 700 ms after a
//             click; "path to" three sample pages lists exactly the closure in a valid order with the right minutes
//             and topic strip; Step draws the arriving lines before filling the page
//   reveal    the one-time load reveal runs, ends within 1.3 s, and leaves exactly the layout that reduced motion shows
//             at once (boxes, lines, opacities); after it nothing moves before a click; frames saved as screenshots
//   names     every card, phone card and topic view shows the topic's name (from its "Topic: slug" title, acronyms such as
//             LLM, ML, RAG, GPU in capitals), never the slug
//   feel      hovering a card grows it to about 1.025 and fades unrelated cards to about .38; leaving restores both; the
//             wide drawing is used at 1280 px and holds every strong line card to card; after the reveal nothing animates
//   colour    each section colour against the card and panel in both themes: pill counts (text) at least 4.5:1 on their
//             pill, the drawn lines (at the opacity they are drawn) and the card's colour bar at least 3:1
//   manners   no script errors or outside fetches, no sideways scroll, reduced motion runs no animation (also none on
//             load, nothing moves, no hover growth while the fade stays) and drops Play, phone path rows put topic and minutes under the title
// Ends "learning map: fail=0" when clean.
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

// ---------------- the graph, read independently from pages.json
const STRONG = 1 / 3;
const pages = JSON.parse(fs.readFileSync(path.join(ROOT, 'technical_knowledge_base/pages.json'), 'utf8')).pages;
const byId = {}; pages.forEach(p => byId[p.id.replace(/-/g, '')] = p);
pages.forEach(p => (p.aliases || []).forEach(a => byId[a.replace(/-/g, '')] ??= p));
const urlOf = p => '/' + p.path.replace(/^technical_knowledge_base\//, '') + '/';
const pre = p => (p.prereqs || []).map(r => byId[r.replace(/-/g, '')]).filter(Boolean);
const closure = (p, s = new Set()) => { for (const q of pre(p)) if (!s.has(q)) { s.add(q); closure(q, s) } return s };
const topicPages = pages.filter(p => p.status === 'html_only' && !p.path.includes('/whats_new/') && fs.existsSync(path.join(ROOT, p.path, 'index.html')));
const byPath = Object.fromEntries(pages.map(p => [p.path, p]));
const stageMemo = new Map();
const stage = p => { if (!stageMemo.has(p)) stageMemo.set(p, 1 + Math.max(-1, ...pre(p).map(stage))); return stageMemo.get(p) };
const rootOf = p => { let r = p.path, q = p.path; while (q.includes('/')) { q = q.slice(0, q.lastIndexOf('/')); if (byPath[q]) r = q } return r };
const slugOf = p => rootOf(p).split('/').pop().replace(/^topic_/, '');
const minutesOf = p => { const m = fs.readFileSync(path.join(ROOT, p.path, 'index.html'), 'utf8').match(/Reading:\s*(?:<[^>]+>\s*)*(\d+)\s*min/); return m ? +m[1] : 0 };
const nst = Math.max(...topicPages.map(stage)) + 1;
const ACR = { llm: 'LLM', ml: 'ML', rl: 'RL', rag: 'RAG', gpu: 'GPU', cuda: 'CUDA', jax: 'JAX', tpu: 'TPU', swe: 'SWE', pytorch: 'PyTorch', ai: 'AI', api: 'API', os: 'OS' };
const FIX = { rl: 'Reinforcement learning', 'llm-training-and-post-training': 'LLM training and post-training' };
const nameOfSlug = {};   // slug -> the name readers should see
topicPages.forEach(p => { const r = byPath[rootOf(p)], m = r.title.match(/^Topic: (.+)$/); if (!m) return; const sl = m[1].trim();
  let w = sl.split('-').map(x => ACR[x] || x.toLowerCase()); if (w[0] === w[0].toLowerCase()) w[0] = w[0][0].toUpperCase() + w[0].slice(1);
  nameOfSlug[slugOf(p)] = FIX[sl] || w.join(' ') });
const TP = {};   // slug -> {n, m, alone, st, cnt: {slug: pages building on it}}
for (const p of topicPages) {
  const s = slugOf(p), t = TP[s] ??= { n: 0, m: 0, alone: 0, st: Array(nst).fill(0), cnt: {} };
  t.n++; t.m += minutesOf(p); t.st[stage(p)]++;
  const d = new Set([...closure(p)].map(slugOf)); d.delete(s);
  if (!d.size) t.alone++;
  d.forEach(b => t.cnt[b] = (t.cnt[b] || 0) + 1);
}
const strong = new Map(), weak = new Map();   // "b>a" -> count (a's pages build on b)
for (const [a, t] of Object.entries(TP)) for (const [b, c] of Object.entries(t.cnt)) (c >= STRONG * t.n - 1e-9 ? strong : weak).set(b + '>' + a, c);
const layerMemo = {}, visiting = new Set();
const layerOf = a => { if (a in layerMemo) return layerMemo[a]; if (visiting.has(a)) { console.log('NOTE strong links form a cycle at', a); return 0 }
  visiting.add(a); const l = 1 + Math.max(-1, ...[...strong.keys()].filter(k => k.endsWith('>' + a)).map(k => layerOf(k.split('>')[0]))); visiting.delete(a); return layerMemo[a] = l };
Object.keys(TP).forEach(layerOf);
const upOf = a => new Set(Object.keys(TP[a].cnt));
const dnOf = b => new Set(Object.keys(TP).filter(a => TP[a].cnt[b]));
const weakUses = a => Object.keys(TP[a].cnt).filter(b => weak.has(b + '>' + a));
console.log(`graph: ${Object.keys(TP).length} topics, ${strong.size} strong links, ${weak.size} weak, ${Math.max(...Object.values(layerMemo)) + 1} layers`);

// ---------------- serve and drive
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
const setEq = (a, b) => a.size === b.size && [...a].every(x => b.has(x));
const fmt = s => [...s].sort().join(', ');

const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined,
  args: process.platform === 'linux' ? ['--no-sandbox'] : [] });

async function open(width, scheme, reduced = false) {
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/pagefind|Failed to load resource/i.test(m.text())) errs.push(m.text()) });
  p.on('requestfailed', r => { if (!/pagefind/.test(r.url())) errs.push('request failed ' + r.url()) });
  await p.setRequestInterception(true);
  p.on('request', r => r.url().startsWith(BASE) || r.url().startsWith('data:') ? r.continue() : (errs.push('outside fetch ' + r.url()), r.abort()));
  await p.setViewport({ width, height: 1000 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' }]);
  await p.goto(BASE, { waitUntil: 'load' });
  return { p, errs };
}
const sideways = p => p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
const shot = async (p, name, sel = '#lm') => { const el = await p.$(sel); await el.screenshot({ path: path.join(shots, name) }); console.log('shot', path.join(shots, name)) };
const slugs = p => p.evaluate(() => JSON.parse(document.getElementById('lm-data').textContent).T.map(t => t.slug));

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
const finalLayout = p => p.evaluate(() => [...document.querySelectorAll('#lm-ov .lm-t, #lm-ov .lm-se, #lm-ov .lm-bd, #lm-ovcap, #lm-ovl > *')].map(e => {
  const b = e.getBoundingClientRect(), cs = getComputedStyle(e);
  return [b.x, b.y, b.width, b.height].map(v => Math.round(v)).join(',') + ':' + (+cs.opacity).toFixed(2) + ':' + cs.transform + ':' + cs.strokeDasharray + ':' + cs.strokeDashoffset }).join('|'));
const infinite = p => p.evaluate(() => document.getAnimations().filter(a => a.effect && a.effect.getTiming().iterations === Infinity).length);
// pause every running animation at time t (ms from its start, delays included) for a screenshot, then let them go on
const freezeAt = (p, t) => p.evaluate(t => document.getAnimations().forEach(a => { a.pause(); a.currentTime = t }), t);
const resume = p => p.evaluate(() => document.getAnimations().forEach(a => a.play()));
const finishAll = p => p.evaluate(() => document.getAnimations().forEach(a => { try { a.finish() } catch (e) { a.cancel() } }));
let finalNormal = null;
// WCAG contrast of two CSS colours (any syntax the browser knows), with fg drawn at opacity op over bg
const contrast = (p, fg, bg, op = 1) => p.evaluate((fg, bg, op) => {
  const c = document.createElement('canvas'); c.width = c.height = 1; const x = c.getContext('2d', { willReadFrequently: true });
  const rgb = (col, base) => { x.globalAlpha = 1; x.fillStyle = base || '#fff'; x.fillRect(0, 0, 1, 1); x.fillStyle = col; x.fillRect(0, 0, 1, 1); return [...x.getImageData(0, 0, 1, 1).data].slice(0, 3) };
  const b = rgb(bg); x.fillStyle = `rgb(${b})`; x.fillRect(0, 0, 1, 1); x.globalAlpha = op; x.fillStyle = fg; x.fillRect(0, 0, 1, 1); const f = [...x.getImageData(0, 0, 1, 1).data].slice(0, 3);
  const L = v => { v = v.map(u => u / 255).map(u => u <= .04045 ? u / 12.92 : ((u + .055) / 1.055) ** 2.4); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2] };
  const a = L(f), d = L(b); return (Math.max(a, d) + .05) / (Math.min(a, d) + .05) }, fg, bg, op);
async function colours(p, scheme) {
  const v = await p.evaluate(() => { const lm = document.getElementById('lm'), cs = getComputedStyle(lm), out = [];
    for (let k = 0; k < 5; k++) { const g = document.querySelector(`#lm-ov .lm-t.s${k}`); if (!g) continue;
      const cell = g.querySelector('.lm-cell:not(.z)'), cnt = g.querySelector('.lm-cnt'), se = document.querySelector(`#lm-ov .lm-se`);
      out.push({ k, sc: getComputedStyle(g).getPropertyValue('--sc').trim(), pill: getComputedStyle(cell).fill, txt: getComputedStyle(cnt).fill }) }
    const se = document.querySelector('#lm-ov .lm-se'), ses = getComputedStyle(se);
    return { out, card: cs.getPropertyValue('--card').trim(), panel: getComputedStyle(document.getElementById('lm-view')).backgroundColor, edge: +ses.strokeOpacity * +ses.opacity } });
  for (const c of v.out) {
    const t = await contrast(p, c.txt, c.pill), ln = await contrast(p, c.sc, v.panel, v.edge), bar = await contrast(p, c.sc, v.card);
    if (t < 4.5) bad(`${scheme}: section ${c.k} pill count contrast ${t.toFixed(2)} under 4.5`);
    if (ln < 3) bad(`${scheme}: section ${c.k} line contrast ${ln.toFixed(2)} (at opacity ${v.edge}) under 3`);
    if (bar < 3) bad(`${scheme}: section ${c.k} colour on the card ${bar.toFixed(2)} under 3`);
    console.log(`contrast ${scheme} s${c.k} ${c.sc}: pill text ${t.toFixed(2)}, line ${ln.toFixed(2)}, bar ${bar.toFixed(2)}`);
  }
}
const scaleOf = p => p.evaluate(sel => { const t = getComputedStyle(document.querySelector(sel)).transform; if (t === 'none') return 1; return +t.match(/matrix\(([^,]+)/)[1] }, '#lm-ov .lm-t.me');
const idleCheck = async (p, where) => { for (let i = 0; i < 3; i++) { await wait(600); const n = await p.evaluate(() => document.getAnimations().length); if (n) { bad(where, 'something animates after the reveal with no input', n); return } } };
const namesCheck = async (p, where) => {
  const r = await p.evaluate(() => { const D = JSON.parse(document.getElementById('lm-data').textContent);
    return { T: D.T.map(t => [t.slug, t.n]), cards: [...document.querySelectorAll('#lm-ov .lm-t, #lm-ovl .lm-c')].map(g => [+g.dataset.k, g.matches('.lm-c') ? g.querySelector('b').textContent : [...g.querySelectorAll('.lm-tl')].map(t => t.textContent).join(' '), g.textContent]) } });
  const T = r.T;
  T.forEach(([sl, n]) => { if (n !== nameOfSlug[sl]) bad(where, `topic ${sl} named "${n}", want "${nameOfSlug[sl]}"`) });
  r.cards.forEach(([k, title, all]) => { const [sl, n] = T[k];
    if (title.replace(/\s+/g, ' ').replace(/- /g, '-').trim() !== n) bad(where, `card shows "${title}", want "${n}"`);
    if (all.includes(sl) || all.includes(sl.replace(/_/g, '-')) || /Topic:/.test(all)) bad(where, `card ${n} shows slug text`) }) };
const state = p => p.evaluate(() => document.getElementById('lm').innerHTML + '|' + document.getAnimations().length + '|' + location.hash);
const focusSets = p => p.evaluate(() => { const D = JSON.parse(document.getElementById('lm-data').textContent), g = c => [...document.querySelectorAll('#lm .lm-t.' + c)].filter(x => x.getBoundingClientRect().width > 0).map(x => D.T[+x.dataset.k].slug);
  return { foc: document.getElementById('lm').classList.contains('foc'), me: g('me'), up: g('up'), dn: g('dn') } });
const checkFocus = (s, f, where) => {
  if (!f.foc || f.me.length !== 1 || f.me[0] !== s) { bad(where, 'focus on', s, 'lit', f.me); return }
  if (!setEq(new Set(f.up), upOf(s))) bad(where, s, 'builds on lit:', fmt(new Set(f.up)), 'want', fmt(upOf(s)));
  if (!setEq(new Set(f.dn), dnOf(s))) bad(where, s, 'built on by lit:', fmt(new Set(f.dn)), 'want', fmt(dnOf(s)));
};

// ---------------- 920 light
{
  const { p, errs } = await open(920, 'light');
  if (!(await p.evaluate(() => document.getAnimations().length))) bad('no load reveal');
  await wait(1300);
  if (await p.evaluate(() => document.getAnimations().length)) bad('the load reveal still runs 1.3 s after load');
  finalNormal = await finalLayout(p);
  const s0 = await state(p); await wait(2000); const s1 = await state(p);
  if (s0 !== s1) bad('the map changed before any click (after the reveal)');
  if (await p.$('#lm .cur,#lm .todo,#lm.foc')) bad('something is highlighted on load');
  await idleCheck(p, '920');
  await namesCheck(p, '920');
  await colours(p, 'light');
  if (await sideways(p)) bad('920: sideways scroll');
  if (!await p.$eval('#lm-ov', e => e.getBoundingClientRect().width > 0)) bad('920: the topic graph is not shown');
  (await geometry(p)).forEach(m => bad('overview', m));
  const S = await slugs(p);
  const NAME = Object.fromEntries(await p.evaluate(() => JSON.parse(document.getElementById('lm-data').textContent).T.map(t => [t.slug, t.n])));
  // each topic view places every page in the column of its global stage, the same stage its card's pills count
  const viewDrift = await p.evaluate(() => { const D = JSON.parse(document.getElementById('lm-data').textContent), out = [];
    D.T.forEach((t, k) => { const v = D.V.topic[k]; t.p.forEach(i => { if (v.lay[i] !== D.P[i].g + v.before) out.push(t.slug + ':' + i) }) }); return out });
  if (viewDrift.length) bad(`topic view stage differs from the card's stage for ${viewDrift.length} pages: ${viewDrift.slice(0, 5).join(', ')}`);
  // cards: one per topic, right layer, right numbers
  const cards =await p.evaluate(() => [...document.querySelectorAll('#lm-ov .lm-t')].map(g => { const r = g.querySelector('.lm-box').getBBox();
    return { k: +g.dataset.k, l: +g.dataset.l, y0: r.y, y1: r.y + r.height, x0: r.x, x1: r.x + r.width, text: [...g.querySelectorAll('text')].map(t => t.textContent).join(' '),
      cells: g.querySelectorAll('.lm-cell').length, sl: [...g.querySelectorAll('.lm-sl')].map(t => t.textContent).join(' '),
      tips: [...g.querySelectorAll('.lm-cell')].map(c => (c.querySelector('title') || {}).textContent || ''), cnts: [...g.querySelectorAll('.lm-cell')].map(c => { const t = c.nextElementSibling; return t && t.matches('.lm-cnt') ? +t.textContent : 0 }),
      free: g.dataset.free === '1', wk: [...document.querySelectorAll(`#lm-ov .lm-wkp[data-k="${g.dataset.k}"] .lm-wk`)].map(t => t.textContent).join(''),
      wkResting: g.querySelectorAll('.lm-wk').length } }));
  const seenT = new Set();
  for (const c of cards) {
    const s = S[c.k], w = TP[s];
    if (!w) { bad('card for an unknown topic', s); continue }
    if (seenT.has(s)) bad('two cards for', s); seenT.add(s);
    if (c.l !== layerMemo[s]) bad(`card ${s} in layer ${c.l + 1}, the rule gives ${layerMemo[s] + 1}`);
    if (!c.text.includes(`${w.n} pages, ${(w.m / 60).toFixed(1)} h`)) bad(`card ${s}: want "${w.n} pages, ${(w.m / 60).toFixed(1)} h" in "${c.text}"`);
    if (c.text.includes('need no other topic')) bad(`card ${s}: still shows the "need no other topic" line`);
    if (c.cells !== nst || c.cnts.join() !== w.st.join()) bad(`card ${s}: strip ${c.cnts} want ${w.st}`);
    if (c.sl !== [...Array(nst).keys()].map(g => g + 1).join(' ')) bad(`card ${s}: stage labels "${c.sl}"`);
    const wantTips = w.st.map((n, g) => `${n} page${n !== 1 ? 's' : ''} at stage ${g + 1}`);
    if (c.tips.join('|') !== wantTips.join('|')) bad(`card ${s}: pill titles ${c.tips} want ${wantTips}`);
    const wu = weakUses(s).map(x => NAME[x]);
    const nw = x => x.replace(/\s+/g, '');
    if (wu.some(x => !nw(c.wk).includes(nw(x))) || (!wu.length && c.wk)) bad(`card ${s}: "Some pages also use" shows "${c.wk}", want ${wu}`);
    if (c.wkResting) bad(`card ${s}: the "also use" list sits on the resting card`);
    const isFree = ![...strong.keys()].some(e => e.split('>').includes(s));
    if (c.free !== isFree) bad(`card ${s}: marked ${c.free ? 'without' : 'with'} a strong link, the rule says ${isFree ? 'none' : 'it has one'}`);
    if (isFree && c.l !== 0) bad(`card ${s}: no strong link either way but not in layer 1`);
  }
  Object.keys(TP).forEach(s => { if (!seenT.has(s)) bad('topic without a card', s) });
  const nl = Math.max(...Object.values(layerMemo)) + 1;
  const spine = cards.filter(c => !c.free), freeC = cards.filter(c => c.free);
  for (let l = 1; l < nl; l++) {
    const above = Math.max(...spine.filter(c => c.l === l - 1).map(c => c.y1)), below = Math.min(...spine.filter(c => c.l === l).map(c => c.y0));
    if (!(below > above + 20)) bad(`layer ${l + 1} is not below layer ${l}`);
  }
  // layer 1 holds the topics with no strong link either way, in rows above its linked row; no other band exists
  const l1 = spine.filter(c => c.l === 0);
  if (freeC.length && l1.length && Math.max(...freeC.map(c => c.y1)) > Math.min(...l1.map(c => c.y0)) - 8) bad('layer 1: unlinked topics are not in the rows above its linked row');
  if (freeC.length && spine.some(c => c.l === 1) && Math.max(...freeC.map(c => c.y1)) > Math.min(...spine.filter(c => c.l === 1).map(c => c.y0)) - 20) bad('layer 1: unlinked topics reach into layer 2');
  const bands = await p.evaluate(() => [...document.querySelectorAll('#lm-ov .lm-bd')].map(g => { const r = g.querySelector('rect').getBBox(); return { l: g.dataset.l, y0: r.y, y1: r.y + r.height, h: g.textContent } }));
  if (bands.length !== nl || bands.some((b, i) => b.l !== String(i))) bad(`want exactly ${nl} layer bands, got ${JSON.stringify(bands.map(b => b.l))}`);
  if (await p.$('#lm-ov .lm-bandf, #lm-ov .lm-lh2')) bad('a separate band is still drawn');
  if (bands[0] && !bands[0].h.startsWith('Layer 1: start here')) bad(`layer 1 band reads "${bands[0].h}"`);
  cards.forEach(c => { const b = bands[c.l]; if (b && (c.y0 < b.y0 || c.y1 > b.y1)) bad(`card ${S[c.k]} outside its layer band`) });
  console.log(`overview: ${cards.length} cards; ` + [...Array(nl).keys()].map(l => `layer ${l + 1}: ${cards.filter(c => c.l === l).map(c => S[c.k]).join(', ')}`).join(' | ') + `; ${freeC.length} of layer 1 with no strong link`);
  // lines: every strong link drawn card to card, through no other card; no weak link visible
  const lines = await p.evaluate(() => { const box = k => document.querySelector(`#lm-ov .lm-t[data-k="${k}"] .lm-box`).getBBox();
    const all = [...document.querySelectorAll('#lm-ov .lm-t')].map(g => [+g.dataset.k, g.querySelector('.lm-box').getBBox()]);
    const f = e => { const L = e.getTotalLength(), a = +e.dataset.a, b = +e.dataset.b, s = e.getPointAtLength(0), t = e.getPointAtLength(L), A = box(a), B = box(b), cs = getComputedStyle(e);
      const through = []; for (let i = 1; i < 40; i++) { const q = e.getPointAtLength(L * i / 40); for (const [k, r] of all) if (k !== a && k !== b && q.x > r.x + 2 && q.x < r.x + r.width - 2 && q.y > r.y + 2 && q.y < r.y + r.height - 2) through.push(k) }
      return { a, b, w: parseFloat(e.getAttribute('stroke-width') || 0), op: +cs.opacity * +cs.strokeOpacity, vis: cs.display !== 'none' && cs.visibility !== 'hidden', title: e.textContent,
        startOk: Math.abs(s.y - (A.y + A.height)) < 3 && s.x > A.x && s.x < A.x + A.width, endOk: Math.abs(t.y - B.y) < 4 && t.x > B.x && t.x < B.x + B.width, through: [...new Set(through)] } };
    return { strong: [...document.querySelectorAll('#lm-ov .lm-se')].map(f), weak: [...document.querySelectorAll('#lm-ov .lm-we')].map(e => ({ a: +e.dataset.a, b: +e.dataset.b, op: +getComputedStyle(e).opacity })) } });
  const drawn = new Set();
  for (const e of lines.strong) {
    const key = S[e.a] + '>' + S[e.b]; drawn.add(key);
    if (!strong.has(key)) { bad('line drawn for a link that is not strong', key); continue }
    const c = strong.get(key), n = TP[S[e.b]].n;
    if (!e.vis || e.op < 0.3) bad('strong line not visible', key);
    if (Math.abs(e.w - (1 + 6.5 * c / n)) > 0.15) bad('line thickness does not follow its share', key, e.w);
    if (!e.title.includes(`${c} of ${n} pages build on`)) bad('line tooltip', key, e.title);
    if (!e.startOk || !e.endOk) bad('line does not run from card to card', key);
    if (e.through.length) bad('line passes through cards', key, e.through.map(k => S[k]));
  }
  [...strong.keys()].forEach(k => { if (!drawn.has(k)) bad('strong link not drawn', k) });
  const wset = new Set(lines.weak.map(e => S[e.a] + '>' + S[e.b]));
  if (!setEq(wset, new Set(weak.keys()))) bad('weak links in the drawing differ from the data', fmt(wset), 'want', fmt(new Set(weak.keys())));
  if (lines.weak.some(e => e.op > 0.01)) bad('a weak link is visible before any focus');
  // focus: hover each card
  for (const c of cards) {
    const s = S[c.k];
    await p.hover(`#lm-ov .lm-t[data-k="${c.k}"] .lm-box`); await wait(20);
    checkFocus(s, await focusSets(p), 'hover');
  }
  const fk = S.indexOf('inference_and_serving') >= 0 ? S.indexOf('inference_and_serving') : cards[0].k;
  await p.mouse.move(5, 5); await wait(40);
  await p.hover(`#lm-ov .lm-t[data-k="${fk}"] .lm-box`); await wait(300);
  const fv = await p.evaluate(k => { const on = s => [...document.querySelectorAll(s)].map(e => [+e.dataset.a, +e.dataset.b, +getComputedStyle(e).opacity]);
    return { we: on('#lm-ov .lm-we'), el: on('#lm-ov .lm-el'), dim: [...document.querySelectorAll('#lm-ov .lm-t')].map(g => [+g.dataset.k, +getComputedStyle(g).opacity]),
    wkp: [...document.querySelectorAll('#lm-ov .lm-wkp')].map(e => [+e.dataset.k, +getComputedStyle(e).opacity]) } }, fk);
  fv.wkp.forEach(([k, op]) => { if ((k === fk) !== op > 0.5) bad('focus: "also use" panel', S[k], op) });
  if (weakUses(S[fk]).length && !fv.wkp.some(([k]) => k === fk)) bad('focus: no "also use" panel for', S[fk]);
  fv.we.forEach(([a, bb, op]) => { const inc = a === fk || bb === fk; if (inc && op < 0.5) bad('focus: weak link not shown', S[a], S[bb]); if (!inc && op > 0.01) bad('focus: unrelated weak link shown', S[a], S[bb]) });
  fv.el.forEach(([a, bb, op]) => { const inc = a === fk || bb === fk; if (inc !== op > 0.5) bad('focus: line label', S[a], S[bb], op) });
  const lit = new Set([S[fk], ...upOf(S[fk]), ...dnOf(S[fk])]);
  fv.dim.forEach(([k, op]) => { if (lit.has(S[k]) !== op > 0.5) bad('focus: card opacity', S[k], op) });
  { const sc = await scaleOf(p); if (Math.abs(sc - 1.025) > .006) bad('hover: the card does not grow to about 1.025, scale', sc);
    const lift = await p.$eval('#lm-ov .lm-t.me .lm-lift', e => +getComputedStyle(e).opacity); if (lift < .9) bad('hover: the lift shadow does not fade in', lift);
    const dim = fv.dim.filter(([k]) => !lit.has(S[k])).map(([, op]) => op); if (dim.some(op => Math.abs(op - .38) > .05)) bad('hover: unrelated cards not faded to about .38', dim) }
  const nIn = [...strong.keys()].filter(k => k.endsWith('>' + S[fk])).length;
  await wait(500);
  const dots = await p.$$eval('#lm-ov .lm-dot', ds => ds.length), inf = await infinite(p);
  if (nIn && (!dots || !inf)) bad('focus: no dots run along the lines into', S[fk], dots, inf);
  if (!nIn && dots) bad('focus: dots without incoming lines', S[fk]);
  await shot(p, 'lm_920_light_focus.png');
  await p.mouse.move(5, 5); await wait(40);
  if (await p.$('#lm.foc')) bad('focus stays after the pointer leaves');
  if (await infinite(p) || await p.$('#lm-ov .lm-dot')) bad('focus dots keep running after blur');
  { await wait(450); const back = await p.evaluate(() => [...document.querySelectorAll('#lm-ov .lm-t')].filter(g => getComputedStyle(g).transform !== 'none' || +getComputedStyle(g).opacity < .99).length);
    if (back) bad('after leaving, cards stay grown or faded', back) }
  await wait(300);
  await shot(p, 'lm_920_light_overview.png');
  // every topic view: grows after the click and settles in time, links exist, every topic page appears, geometry
  const seen = new Set();
  for (const c of cards) {
    const k = c.k;
    await p.click(`#lm-ov .lm-t[data-k="${k}"] .lm-box`); await wait(30);
    if (k === cards[0].k && !(await p.evaluate(() => document.getAnimations().length))) bad('opening a topic does not grow the card into its view');
    await wait(670);
    if (await p.evaluate(() => document.getAnimations().length)) bad('topic view still animating 700 ms after the click', S[k]);
    const hrefs = await p.$$eval('#lm-view .lm-n a', as => as.map(a => a.getAttribute('href')));
    if (!hrefs.length) bad('topic view empty', S[k]);
    hrefs.forEach(h => { seen.add(h); if (!exists(h)) bad('node links to a missing page', h) });
    (await geometry(p)).forEach(m => bad('topic', S[k], m));
    if (S[k] === 'inference_and_serving') await shot(p, 'lm_920_light_topic.png');
    { const h = await p.$eval('#lm-head b', e => e.textContent); if (h !== nameOfSlug[S[k]]) bad('topic view heading', JSON.stringify(h), 'want', nameOfSlug[S[k]]) }
    await p.click('#lm-back'); await wait(40);
  }
  topicPages.forEach(tp => { if (!seen.has(urlOf(tp))) bad('topic page missing from the map', tp.title) });
  console.log(`topic views ${cards.length}, distinct page nodes ${seen.size} of ${topicPages.length}`);
  // path to three sample pages, picked through the search box
  const samples = ['xai_spacexai_grok', 'parameter_efficient_fine_tuning', 'attention_variants']
    .map(s => topicPages.find(t => t.path.endsWith('/' + s)) || topicPages.find(t => t.path.includes(s))).filter(Boolean);
  if (samples.length < 3) samples.push(...topicPages.filter(t => closure(t).size > 3).slice(0, 3 - samples.length));
  for (const t of samples) {
    await p.click('#lm-q', { clickCount: 3 }); await p.type('#lm-q', t.title.split(':')[0].slice(0, 40));
    await wait(80);
    const first = await p.$$eval('#lm-sug button', bs => bs.map(x => x.textContent));
    const idx = await p.$$eval('#lm-sug button', (bs, title) => bs.findIndex(x => x.textContent.startsWith(title)), t.title);
    if (idx < 0) { bad('search did not offer', t.title, first); continue }
    for (let i = 0; i < idx; i++) await p.keyboard.press('ArrowDown');
    await p.keyboard.press('Enter'); await wait(120);
    const got = await p.$$eval('#lm-order li a', as => as.map(a => a.getAttribute('href')));
    const wantPages = [...closure(t), t], want = new Set(wantPages.map(urlOf));
    const gotSet = new Set(got);
    if (got.length !== want.size || [...want].some(u => !gotSet.has(u))) bad('path list is not the closure', t.title, got.length, want.size);
    const posn = Object.fromEntries(got.map((u, i) => [u, i]));
    for (const u of got) { const pg = pages.find(x => urlOf(x) === u); for (const q of pre(pg)) if (!(posn[urlOf(q)] < posn[u])) bad('order invalid', pg.title, 'before', q.title) }
    if (got[got.length - 1] !== urlOf(t)) bad('target is not last', t.title);
    const mapHrefs = await p.$$eval('#lm-view .lm-n a', as => as.map(a => a.getAttribute('href')));
    if (mapHrefs.length !== want.size || mapHrefs.some(h => !want.has(h))) bad('path map nodes differ from the closure', t.title);
    (await geometry(p)).forEach(m => bad('path', t.title, m));
    const total = await p.$eval('.lm-sum', e => e.textContent);
    const mins = wantPages.reduce((s, q) => s + minutesOf(q), 0);
    if (!total.includes(mins + ' min')) bad('total minutes', t.title, total, mins);
    // topic strip: each topic on the way once, with its minutes on this path
    const fp = await p.$$eval('#lm-fp .ch', cs => cs.map(c => c.textContent));
    const wantFp = {}; wantPages.forEach(q => wantFp[slugOf(q)] = (wantFp[slugOf(q)] || 0) + minutesOf(q));
    const D = await p.evaluate(() => JSON.parse(document.getElementById('lm-data').textContent).T.map(t => [t.slug, t.n]));
    const nameOf = Object.fromEntries(D);
    if (fp.length !== Object.keys(wantFp).length || Object.entries(wantFp).some(([s, m]) => !fp.includes(`${nameOf[s]} ${m} min`))) bad('topic strip', t.title, fp, wantFp);
    console.log(`path to ${t.title}: ${got.length} pages, ${mins} min, ok order; topics ${fp.join(' | ')}`);
    // nothing moves until a step is pressed
    const a0 = await state(p); await wait(1500);
    if (a0 !== await state(p) || await p.$('#lm .cur')) bad('path view changed before a click', t.title);
    if (t === samples[0]) {
      // Step: the lines arriving from read pages draw first, then the page fills and its row lights
      const order = await p.$$eval('#lm-order li', ls => ls.map(l => +l.dataset.i));
      const incoming = await p.evaluate(() => { const o = {}; document.querySelectorAll('#lm-view .lm-e').forEach(e => (o[e.dataset.b] ??= []).push(+e.dataset.a)); return o });
      let checkedDraw = false;
      for (let s = 0; s < Math.min(3, order.length); s++) {
        await p.click('#lm-next');
        if (!checkedDraw && incoming[order[s]]) {
          const mid = await p.evaluate(i => ({ an: document.getAnimations().length, cur: !!document.querySelector(`#lm-view .lm-n[data-i="${i}"].cur`) }), order[s]);
          if (!mid.an || mid.cur) bad('step does not draw the arriving lines before filling the page', JSON.stringify(mid));
          checkedDraw = true;
        }
        await wait(450);
      }
      const st = await p.evaluate(() => ({ cur: document.querySelectorAll('#lm-view .lm-n.cur').length, li: document.querySelectorAll('#lm-order li.cur').length,
        done: document.querySelectorAll('#lm-view .lm-n.done').length, on: [...document.querySelectorAll('#lm-view .lm-e.on')].map(e => +e.dataset.b) }));
      const s = Math.min(3, order.length) - 1;
      if (st.cur !== 1 || st.li !== 1) bad('step did not highlight exactly one page', st.cur, st.li);
      if (st.done !== s) bad('step: read pages filled', st.done, 'want', s);
      if (st.on.some(x => x !== order[s]) || st.on.length !== (incoming[order[s]] || []).length) bad('step: lit lines are not the ones arriving at the current page');
      await shot(p, 'lm_920_light_path_step.png');
    }
  }
  if (await sideways(p)) bad('920: sideways scroll after use');
  errs.forEach(e => bad('920 error:', e));
  await p.close();
}

// ---------------- 1280 light: the wide drawing, its geometry and lines, names, hover
{
  const { p, errs } = await open(1280, 'light');
  await wait(1300);
  if (!await p.$('#lm-ov[data-w="wide"]')) bad('1280: the wide drawing is not used');
  await idleCheck(p, '1280');
  if (await sideways(p)) bad('1280: sideways scroll');
  (await geometry(p)).forEach(m => bad('1280 overview', m));
  await namesCheck(p, '1280');
  const S = await slugs(p);
  const ln = await p.evaluate(() => { const all = [...document.querySelectorAll('#lm-ov .lm-t')].map(g => [+g.dataset.k, g.querySelector('.lm-box').getBBox()]), box = k => all.find(x => x[0] === k)[1];
    return [...document.querySelectorAll('#lm-ov .lm-se')].map(e => { const L = e.getTotalLength(), a = +e.dataset.a, b = +e.dataset.b, s = e.getPointAtLength(0), t = e.getPointAtLength(L), A = box(a), B = box(b), th = [];
      for (let i = 1; i < 40; i++) { const q = e.getPointAtLength(L * i / 40); for (const [k, r] of all) if (k !== a && k !== b && q.x > r.x + 2 && q.x < r.x + r.width - 2 && q.y > r.y + 2 && q.y < r.y + r.height - 2) th.push(k) }
      return { a, b, ok: Math.abs(s.y - (A.y + A.height)) < 3 && Math.abs(t.y - B.y) < 4, th: th.length } }) });
  const got = new Set(ln.map(e => S[e.a] + '>' + S[e.b]));
  if (!setEq(got, new Set(strong.keys()))) bad('1280: strong lines differ from the data');
  ln.forEach(e => { if (!e.ok) bad('1280: line not card to card', S[e.a], S[e.b]); if (e.th) bad('1280: line through a card', S[e.a], S[e.b]) });
  const cards = await p.$$eval('#lm-ov .lm-t', gs => gs.map(g => [+g.dataset.k, +g.dataset.l]));
  if (cards.length !== Object.keys(TP).length || cards.some(([k, l]) => l !== layerMemo[S[k]])) bad('1280: cards or layers differ from the rule');
  await p.hover(`#lm-ov .lm-t .lm-box`); await wait(450);
  const sc = await scaleOf(p); if (Math.abs(sc - 1.025) > .006) bad('1280 hover: scale', sc);
  await p.mouse.move(5, 5); await wait(400);
  await shot(p, 'lm_1280_light_overview.png');
  errs.forEach(e => bad('1280 error:', e));
  await p.close();
}

// ---------------- 920 light and dark: frames of the load reveal, focus with its dots, a topic view, a path mid-step
for (const scheme of ['light', 'dark']) {
  const { p, errs } = await open(920, scheme);
  for (const t of [120, 330, 560, 800]) { await freezeAt(p, t); await shot(p, `lm_920_${scheme}_reveal_${t}.png`) }
  await finishAll(p); await wait(50);
  if (scheme === 'dark') { await shot(p, 'lm_920_dark_overview.png'); await colours(p, 'dark') }
  const S = await slugs(p), fk = S.indexOf('inference_and_serving') >= 0 ? S.indexOf('inference_and_serving') : 0;
  await p.hover(`#lm-ov .lm-t[data-k="${fk}"] .lm-box`); await wait(1000);
  await shot(p, `lm_920_${scheme}_focus_mid.png`);
  await p.mouse.move(5, 5); await wait(300);
  await p.click(`#lm-ov .lm-t[data-k="${fk}"] .lm-box`); await wait(40);
  await freezeAt(p, 200); await shot(p, `lm_920_${scheme}_topic_grow.png`); await finishAll(p); await wait(60);
  if (scheme === 'dark') await shot(p, 'lm_920_dark_topic.png');
  const t = topicPages.find(x => x.path.endsWith('/xai_spacexai_grok')) || topicPages.find(x => closure(x).size > 2);
  await p.evaluate(id => { location.hash = 'path=' + id }, t.id.replace(/-/g, '')); await wait(150);
  await p.click('#lm-next'); await wait(450); await p.click('#lm-next'); await wait(450); await p.click('#lm-next'); await wait(20);
  await freezeAt(p, 150); await shot(p, `lm_920_${scheme}_path_midstep.png`); await finishAll(p);
  errs.forEach(e => bad(`920 ${scheme} error:`, e));
  await p.close();
}

// ---------------- 920 with reduced motion: no animation anywhere, Play dropped
{
  const { p, errs } = await open(920, 'light', true);
  if (await p.evaluate(() => document.getAnimations().length)) bad('reduced motion: something animates on load');
  await wait(300);
  if (await p.evaluate(() => document.getAnimations().length)) bad('reduced motion: something animates after load');
  const fr = await finalLayout(p);
  if (fr !== finalNormal) { const a = fr.split('|'), c = (finalNormal || '').split('|'); const i = a.findIndex((x, j) => x !== c[j]); bad('the load reveal does not end in the reduced-motion layout, first difference at', i, a[i], 'vs', c[i]) }
  { const r0 = await p.evaluate(() => [...document.querySelectorAll('#lm-ov .lm-t, #lm-ov .lm-se, #lm-ovl > *')].map(e => JSON.stringify(e.getBoundingClientRect())).join());
    await wait(400); const r1 = await p.evaluate(() => [...document.querySelectorAll('#lm-ov .lm-t, #lm-ov .lm-se, #lm-ovl > *')].map(e => JSON.stringify(e.getBoundingClientRect())).join());
    if (r0 !== r1) bad('reduced motion: something moves on load') }
  { const S0 = await slugs(p), k0 = S0.indexOf('inference_and_serving') >= 0 ? S0.indexOf('inference_and_serving') : 0;
    await p.hover(`#lm-ov .lm-t[data-k="${k0}"] .lm-box`); await wait(20);
    if (await p.evaluate(() => document.getAnimations().length)) bad('reduced motion: hover animates');
    const sc = await scaleOf(p); if (sc !== 1) bad('reduced motion: the hovered card grows', sc);
    const dim = await p.evaluate(() => [...document.querySelectorAll('#lm-ov .lm-t:not(.me):not(.up):not(.dn)')].map(g => +getComputedStyle(g).opacity));
    if (!dim.length || dim.some(op => Math.abs(op - .38) > .05)) bad('reduced motion: the fade of unrelated cards is lost', dim.slice(0, 4)) }
  if (await p.$('#lm-ov .lm-dot') || await infinite(p)) bad('reduced motion: focus runs dots');
  await p.mouse.move(5, 5);
  const S = await slugs(p);
  await p.click(`#lm-ov .lm-t[data-k="${S.indexOf('cuda_and_gpu_programming') >= 0 ? S.indexOf('cuda_and_gpu_programming') : 0}"] .lm-box`); await wait(60);
  if (!(await p.$('#lm-view .lm-n'))) bad('reduced motion: the topic did not open');
  if (await p.evaluate(() => document.getAnimations().length)) bad('reduced motion: opening a topic animates');
  await p.evaluate(() => { const b = [...document.querySelectorAll('#lm-view .lm-pb')].pop(); b.dispatchEvent(new MouseEvent('click', { bubbles: true })) }); await wait(60);
  if (await p.$('#lm-next')) {
    if (await p.$('#lm-play')) bad('reduced motion: Play is offered');
    await p.click('#lm-next'); await p.click('#lm-next');
    if (await p.evaluate(() => document.getAnimations().length) || !(await p.$('#lm-view .lm-n.cur'))) bad('reduced motion: Step does not jump to its final state');
  }
  errs.forEach(e => bad('reduced motion error:', e));
  await p.close();
}

// ---------------- 390 dark
{
  const { p, errs } = await open(390, 'dark');
  await freezeAt(p, 150); await shot(p, 'lm_390_dark_reveal_150.png'); await resume(p);
  await wait(1300);
  if (await p.evaluate(() => document.getAnimations().length)) bad('390: the load reveal still runs after 1.3 s');
  const s0 = await state(p); await wait(1500);
  if (s0 !== await state(p)) bad('390: the map changed before any click');
  if (await sideways(p)) bad('390: sideways scroll');
  if (await p.$eval('#lm-view', e => e.offsetParent !== null)) bad('390: the wide map is shown instead of the cards');
  const small = await p.$$eval('#lm .lm-list *, #lm .lm-sub, #lm-ovcap *', es => es.filter(e => e.offsetParent !== null && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 11).length);
  if (small) bad('390: text under 11 px', small);
  const S = await slugs(p);
  await namesCheck(p, '390');
  // cards: one per topic, under its layer's heading, with "Builds on" naming exactly its strong links
  const nc = await p.evaluate(() => [...document.querySelectorAll('#lm-ovl .lm-c')].map(c => ({ k: +c.dataset.k, head: (c.parentElement.previousElementSibling.matches('p') ? c.parentElement.previousElementSibling.previousElementSibling : c.parentElement.previousElementSibling).textContent,
    cwShown: (c.querySelector('.lm-cw') || { offsetParent: null }).offsetParent !== null,
    cb: (c.querySelector('.lm-cb') || {}).textContent || '', sl: [...c.querySelectorAll('.lm-strip em')].map(e => e.textContent).join(' '),
    cnt: [...c.querySelectorAll('.lm-strip i')].map(e => +e.textContent || 0).join(), tx: c.textContent, w: c.getBoundingClientRect().width, over: c.scrollWidth > c.clientWidth + 1 })));
  const seenN = new Set();
  for (const c of nc) {
    const s = S[c.k]; seenN.add(s);
    const isFree = ![...strong.keys()].some(e => e.split('>').includes(s));
    if (!c.head.startsWith(`Layer ${layerMemo[s] + 1}`) || /\d/.test(c.head.charAt(`Layer ${layerMemo[s] + 1}`.length)) || (isFree && layerMemo[s] !== 0)) bad(`390: ${s} under "${c.head}", want layer ${layerMemo[s] + 1}`);
    const want = [...strong.keys()].filter(k => k.endsWith('>' + s));
    if (want.length !== (c.cb.match(/ of /g) || []).length) bad(`390: ${s} builds on "${c.cb}", want ${want}`);
    want.forEach(k => { const [bb] = k.split('>'); if (!c.cb.includes(`(${strong.get(k)} of ${TP[s].n} pages)`)) bad(`390: ${s} builds on text lacks ${bb}`) });
    if (c.over) bad('390: card content wider than its card', s);
    if (c.sl !== [...Array(nst).keys()].map(g => g + 1).join(' ') || c.cnt !== TP[s].st.join()) bad(`390: ${s} strip labels "${c.sl}" counts ${c.cnt} want ${TP[s].st}`);
    if (c.tx.includes('need no other topic')) bad(`390: ${s} still shows "need no other topic"`);
    if (c.cwShown) bad('390: "also use" list shown on a resting card', s);
  }
  if (seenN.size !== Object.keys(TP).length || nc.length !== seenN.size) bad('390: cards', nc.length, 'topics', Object.keys(TP).length);
  { const l1 = nc.filter(c => layerMemo[S[c.k]] === 0), lk = l1.map(c => [...strong.keys()].some(e => e.split('>').includes(S[c.k])));
    if (lk.some((x, i) => !x && lk.slice(0, i).some(Boolean))) bad('390: layer 1 does not list its linked topics last');
    if (new Set(nc.map(c => c.head)).size !== Math.max(...Object.values(layerMemo)) + 1) bad('390: headings are not exactly one per layer', [...new Set(nc.map(c => c.head))]) }
  const perRow = await p.evaluate(() => { const c = [...document.querySelectorAll('#lm-ovl .lm-c')].slice(0, 3).map(x => x.getBoundingClientRect().top); return c[0] === c[1] ? 2 : 1 });
  if (perRow !== 2) bad('390: cards are not two per row');
  await shot(p, 'lm_390_dark_overview.png');
  // tap: focus; tap again: open
  const ki = S.indexOf('generative_and_multimodal') >= 0 ? S.indexOf('generative_and_multimodal') : 0;
  await p.click(`#lm-ovl .lm-c[data-k="${ki}"] b`); await wait(250);
  checkFocus(S[ki], await focusSets(p), '390 tap');
  if (!(await p.$eval(`#lm-ovl .lm-c[data-k="${ki}"] .lm-open`, e => e.offsetParent !== null))) bad('390: focused card shows no Open button');
  await p.evaluate(k => document.querySelector(`#lm-ovl .lm-c[data-k="${k}"]`).scrollIntoView({ block: 'center' }), ki);
  await p.screenshot({ path: path.join(shots, 'lm_390_dark_focus.png') }); console.log('shot', path.join(shots, 'lm_390_dark_focus.png'));
  await p.click(`#lm-ovl .lm-c[data-k="${ki}"] b`); await wait(700);
  const hrefs = await p.$$eval('#lm-plist a', as => as.map(a => a.getAttribute('href')));
  if (!hrefs.length) bad('390: topic list empty after the second tap');
  hrefs.forEach(h => { if (!exists(h)) bad('390: list links to a missing page', h) });
  if (await sideways(p)) bad('390: sideways scroll in a topic');
  await shot(p, 'lm_390_dark_topic.png');
  const btns = await p.$$('#lm-plist .lm-pbt'); await btns[btns.length - 1].click(); await wait(80);
  if (!(await p.$$('#lm-order li')).length) bad('390: path list empty');
  const under = await p.$$eval('#lm-order li', ls => ls.every(l => { const a = l.querySelector('a').getBoundingClientRect(), m = l.querySelector('.mm').getBoundingClientRect(); return m.top >= a.bottom - 2 }));
  if (!under) bad('390: path rows do not put topic and minutes under the title');
  if (await p.$('#lm-next')) { await p.click('#lm-next'); await wait(450); await p.click('#lm-next'); await wait(450) }
  if (await sideways(p)) bad('390: sideways scroll in a path');
  await shot(p, 'lm_390_dark_path_step.png');
  errs.forEach(e => bad('390 error:', e));
  await p.close();
}
await b.close();
server.close();
console.log(`learning map: fail=${fail}`);
process.exit(fail ? 1 : 0);
