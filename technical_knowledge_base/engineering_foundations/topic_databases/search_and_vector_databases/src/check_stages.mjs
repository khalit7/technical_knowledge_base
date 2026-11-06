// The 2026-11-06 rollout checks (adapted from Query planning and performance): every 3D stage plays by itself once scrolled into view,
// steps to its last step, has one step-list item per step, never moves under reduced motion and stops redrawing off screen;
// no errors, NaN, undefined or sideways scroll; splits are two columns at 1400 px; the scenes' numbers against the page's arithmetic,
// and the step lists quote them. Mid-step screenshots of each stage go to ../.shots/ (or the folder given).
// usage: node src/check_stages.mjs [shots dir]   (from the page folder or the repo root; needs html_utils' node_modules)
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = ['stg-hero', 'stg-inv', 'stg-bm', 'stg-es', 'stg-filt'];
const wait = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const problems = [];
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(400);
  const tag = `${scheme} ${width}`;
  const audit = async where => {
    const r = await p.evaluate(() => ({ bad: (document.getElementById('t-read').innerText.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) }));
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  if (width === 1400) { const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display)); if (!cols.length || cols.some(c => c !== 'grid')) problems.push(`${tag}: a split is not two columns (${cols})`) }
  // autoplay on view
  for (const id of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2200);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
  }
  // flows stop off screen: no stage redraws while all are out of view (the Retrievers tab hides the Reading tab)
  await p.evaluate(() => window.scrollTo(0, document.getElementById('rd-s7').getBoundingClientRect().top + scrollY)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  // step each stage to its last step; one list item per step; screenshot mid-way
  for (const id of STAGES) {
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1);
    const lis = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx'); return l ? l.children.length : 0 });
    if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but ${lis} items`);
    for (let k = 1; k < n; k++) {
      await p.$eval(`#${id}-f`, e => e.click()); await wait(80);
      if (k === Math.floor(n / 2)) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2000); const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}-${scheme}-${width}.png` }) }
    }
    await wait(1800);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
    const on = await p.$eval('#' + id, h => [...h.closest('.s3sp').querySelector('ol.sx').children].findIndex(li => li.classList.contains('on'))); if (on !== n - 1) problems.push(`${tag}: ${id} list marks ${on}`);
    await audit(`${id} last step`);
    for (let k = 0; k < n; k++) { await p.evaluate((id, k) => document.getElementById(id).closest('.s3sp').querySelector('ol.sx').children[k].click(), id, k); await wait(40) }
  }
  { const r = await p.evaluate(() => { const out = [], C = window.CHK; if (!C || !C.hero || !C.inv || !C.bm || !C.es || !C.filt) return ['no CHK'];
      const eq = (n, a, b) => { if (JSON.stringify(a) !== JSON.stringify(b)) out.push(n + ' ' + JSON.stringify(a) + ' expected ' + JSON.stringify(b)) };
      eq('hero bm25', C.hero.bm25, [1.15, 1.54, 0.77, 1.54, 0.87, 0]); eq('hero fused order', C.hero.order, [2, 1, 4, 3, 5, 6]); eq('hero vector order', C.hero.vec, [2, 1, 3, 4, 5, 6]);
      eq('inv lexemes', C.inv.lexemes, 14); eq('inv hits', C.inv.hits, [1, 2, 3, 4, 5]); eq('inv bm25', C.inv.bm25, C.hero.bm25);
      eq('bm avgdl', C.bm.avg, 4); eq('bm dl', C.bm.dl, [6, 3, 3, 4, 2, 6]); eq('bm points', C.bm.pts, [[1, 1.5, 0.83], [2, 0.75, 1.11], [3, 0.75, 1.11], [4, 1, 1], [5, 0.5, 1.26]]);
      eq('es steps', C.es.steps, 8);
      const F = C.filt; eq('filt', [F.post1, F.zero1, F.strict1, F.relaxed1, F.relaxedRec1, F.pre1, F.pre10, F.post10, F.relaxed10], [0.38, 0.679, 22.658, 15.554, 0.9753, 6.551, 153.978, 3.97, 1.58]);
      const txt = id => document.getElementById(id).textContent, has = (id, s) => { if (!txt(id).includes(s)) out.push(id + ' lacks ' + s) };
      [['sx-hero', '1.54'], ['sx-hero', 'Q2 0.84, Q1 0.78, Q3 0.76, Q4 0.74, Q5 0.53, Q6 0.02'], ['sx-hero', 'Q2, Q1, Q4, Q3, Q5, Q6'], ['sx-hero', SV.facts.fts_ms + ' ms'], ['sx-hero', SV.facts.hnsw40_p50 + ' ms'],
       ['sx-inv', 'at 1.54, then 1 at 1.15, 5 at 0.87, 3 at 0.77'], ['sx-inv', SV.facts.lexemes],
       ['sx-bm', '1.26'], ['sx-bm', '0.83'], ['sx-bm', '1.11'], ['sx-bm', '1.74'], ['sx-bm', '0.88'], ['sx-bm', '1.9 times'], ['sx-bm', '1.54'], ['sx-bm', '0.69'], ['sx-filt', '0.38 rows'], ['sx-filt', '68%'], ['sx-filt', '22.7 ms'], ['sx-filt', '15.6 ms'], ['sx-filt', '6.6 ms'], ['sx-filt', '3.97'], ['sx-filt', '154 ms'], ['sx-filt', '1.6 ms'], ['sx-filt', '0.975'], ['sx-filt', '0.935']].forEach(([i, s]) => has(i, s));
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`)); }
  await audit('end');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file);
  for (const id of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1000); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows redrew (${d0} -> ${d1})`);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
