// The 2026-11-06 rollout checks for Google DeepMind: Gemini and Gemma (2026-11-10), adapted from Anthropic: Claude family's check_stages.mjs:
// the three 3D stages (Fig. 3 media against the window, driven by window.GGMED; Fig. 4 the edge checkpoints, window.GGPL; Fig. 5 sparse
// against dense, window.GEMMA and window.GGSD) play by themselves once scrolled into view, step to their last step with one step-list item
// per step, stop redrawing off screen and never move under reduced motion; no errors, NaN, undefined or sideways scroll in any tab; the splits
// are two columns at 1400 px and one below 1100 px; the numbers the step lists write are what the page's own data gives. Screenshots of every
// step (mid-tween and settled) at 1400 light, and of the middle step at 390 dark, go to the shots dir (outside the repo).
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_llm_landscape/google_deepmind_gemini_and_gemma/src/check_stages.mjs <shots dir>
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2];
if (!shots) { console.log('usage: check_stages.mjs <shots dir outside the repo>'); process.exit(2); }
fs.mkdirSync(shots, { recursive: true });
const STAGES = ['stg-md', 'stg-pl', 'stg-sd'];
const wait = ms => new Promise(r => setTimeout(r, ms));
const problems = [];
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
try {
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(400);
  const tag = `${scheme} ${width}`, shoot = width === 1400 || width === 390;
  const audit = async (where, tab = 't-read') => {
    const r = await p.evaluate(tab => { const c = document.getElementById(tab).cloneNode(true); c.querySelectorAll('pre,code').forEach(x => x.remove());
      return { bad: (c.innerText.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } }, tab);
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (!cols.length || cols.some(c => c !== 'grid'))) problems.push(`${tag}: a split is not two columns (${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  if (width === 1400) { const over = await p.$$eval('#t-read .s3R', xs => xs.map(x => { const r = x.getBoundingClientRect(), k = x.firstElementChild && x.firstElementChild.getBoundingClientRect(); return k && (k.right > r.right + 1 || k.left < r.left - 1) ? x.innerHTML.slice(0, 40) : '' }).filter(Boolean));
    over.forEach(o => problems.push(`${tag}: right-column content wider than its column: ${o}`)) }
  for (const id of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
  }
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(800);
  const offs = () => p.$$eval('.stg', xs => xs.map(x => { const r = x.getBoundingClientRect(); return r.bottom < 0 || r.top > innerHeight ? (+x.dataset.draws || 0) + (+x.dataset.frames || 0) : -1 }));
  const d0 = await offs(); await wait(1200); const d1 = await offs();
  if (d1.some((v, i) => v >= 0 && v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  const stepAll = async (id, lid) => {
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length);
    if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but list ${lid} shows ${lis}`);
    if (n > 8) problems.push(`${tag}: ${id} has ${n} steps, more than about 8`);
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' }));
    for (let k = 0; k < n; k++) {
      if (k) await p.$eval(`#${id}-f`, e => e.click());
      if (shoot && (width === 1400 || k === Math.floor(n / 2))) {
        await wait(700); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}-midtween-${scheme}-${width}.png` });
        await wait(2000); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}-${scheme}-${width}.png` })
      } else await wait(250);
    }
    await wait(2000);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
    await audit(`${id} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id} list ${lid} does not mark the last step`);
  };
  for (const id of STAGES) await stepAll(id, 'sx-' + id.slice(4));
  if (width === 1400) { // the numbers the step lists write are what the page's data gives
    const r = await p.evaluate(() => { const out = [], n = v => v.toLocaleString('en-GB');
      const li = (lid, k) => document.getElementById(lid).children[k].textContent.replace(/\s+/g, ' ');
      const need = (lid, k, x) => { if (!li(lid, k).includes(String(x))) out.push(`${lid} item ${k + 1} lacks "${x}"`) };
      // Fig. 3: media rates (window.GGMED) and what the scene lays on the window (window.GGMD)
      const M = GGMED, W = M.WIN, g = M.g3, h = 3600, per = g.lo + g.a, hr = h * per, hi = h * (g.hi + g.a), left = W - hr, b = M.g25;
      need('sx-md', 0, g.lo + ' tokens'); need('sx-md', 0, g.a + ' more'); need('sx-md', 0, (1024 / per).toFixed(1) + ' seconds');
      need('sx-md', 1, '3,600 × ' + per + ' = ' + n(hr)); need('sx-md', 1, n(h * g.lo) + ' for the frames'); need('sx-md', 1, n(h * g.a) + ' for the sound');
      need('sx-md', 1, (hr / W * 100).toFixed(1) + '% of the window'); need('sx-md', 1, Math.round(hr / 1024) + ' of the 1,024 tiles'); need('sx-md', 1, '$' + (hr / 1e6 * 0.75).toFixed(4));
      need('sx-md', 2, '3,600 × ' + (g.hi + g.a) + ' = ' + n(hi)); need('sx-md', 2, 'by ' + n(hi - W)); need('sx-md', 2, n(Math.round(W / per)) + ' seconds'); need('sx-md', 2, n(Math.round(W / (g.hi + g.a))) + ' seconds');
      need('sx-md', 3, n(left) + ' tokens are left'); need('sx-md', 3, Math.floor(left / g.img) + ' images'); need('sx-md', 3, n(Math.floor(left / g.pdf)) + ' PDF pages'); need('sx-md', 3, g.img / g.lo + ' frames');
      if (GGMD.SEGS[3][2] !== Math.floor(left / g.img) * g.img) out.push('Fig. 3 step 4 images do not match the list');
      need('sx-md', 4, n(h * (b.hi + b.a))); need('sx-md', 4, (h * (b.hi + b.a) / W * 100).toFixed(1) + '%'); need('sx-md', 4, n(Math.round(W / (b.lo + b.a) / 100) * 100) + ' seconds'); need('sx-md', 4, (W / (b.lo + b.a) / 3600).toFixed(2) + ' hours');
      need('sx-md', 5, '~1.08M'); need('sx-md', 5, '~108K'); if (GGMD.GHOST !== 1080000 || GGMD.SEGS[5][0] !== 108000) out.push('Fig. 3 step 6 does not draw the quoted counts');
      // Fig. 4: the edge checkpoints (window.GGPL)
      const D = GGPL; need('sx-pl', 0, D.e4.tot + 'B parameters'); need('sx-pl', 0, D.e4.L + ' decoder layers'); need('sx-pl', 1, (D.e4.tot - D.e4.eff).toFixed(1) + 'B embedding parameters (' + D.e4.tot + ' − ' + D.e4.eff + ')'); need('sx-pl', 1, D.e4.eff + 'B stay');
      need('sx-pl', 3, D.e2.L + ' layers'); need('sx-pl', 3, D.e2.eff + 'B effective'); need('sx-pl', 3, D.e2.tot + 'B with embeddings'); need('sx-pl', 3, (D.e2.tot - D.e2.eff).toFixed(1) + 'B (' + D.e2.tot + ' − ' + D.e2.eff + ')');
      need('sx-pl', 4, '(' + D.n2.res + 'B)'); need('sx-pl', 4, 'over 5B');
      // Fig. 5: sparse against dense (window.GEMMA and window.GGSD)
      const gm = k => GEMMA.GM.find(m => m.k === k), m26 = gm('26b'), m31 = gm('31b'), m12 = gm('12b'), S = GGSD;
      need('sx-sd', 0, m31.wt.bf.toFixed(1) + ' GB'); need('sx-sd', 0, (2 * m31.act).toFixed(1) + ' GFLOP');
      need('sx-sd', 1, m26.wt.bf.toFixed(1) + ' GB resident, ' + m26.aw.bf.toFixed(1) + ' GB read'); need('sx-sd', 1, '= ' + S.pexp('bf').toFixed(2) + ' GB'); need('sx-sd', 1, '= ' + S.psh('bf').toFixed(2) + ' GB');
      need('sx-sd', 1, (2 * m26.act).toFixed(1) + ' GFLOP'); need('sx-sd', 1, '(52 / 64 = ' + (m26.wt.bf / m31.wt.bf).toFixed(2) + ')');
      need('sx-sd', 2, m26.wt.q4.toFixed(1) + ' GB against ' + m31.wt.q4.toFixed(1) + ' GB'); need('sx-sd', 2, m26.rep.toFixed(2) + ' GB against ' + m31.rep.toFixed(2) + ' GB'); need('sx-sd', 2, m26.aw.q4.toFixed(1) + ' GB at 4 bits');
      need('sx-sd', 3, m12.wt.q4.toFixed(2) + ' GB at 4 bits'); need('sx-sd', 3, m12.rep.toFixed(2) + ' GB');
      if (!(m26.wt.q4 + m26.rep > 16 && m31.wt.q4 + m31.rep > 16 && m12.wt.q4 + m12.rep < 16)) out.push('Fig. 5 step 4 fit claims do not hold');
      const e = S.E(32); need('sx-sd', 4, 'touch ' + Math.round(e) + ' experts'); need('sx-sd', 4, '(' + Math.round(e / 128 * 100) + '%'); need('sx-sd', 4, '≈ ' + Math.round(S.psh('bf') + e * S.pexp('bf')) + ' GB');
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  await audit('end');
  for (const t of ['t-gemma', 't-more']) { await p.click(`#tabs button[data-t="${t}"]`); await wait(300); await audit(t, t); }
  await p.click('#tabs button[data-t="t-read"]');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file);
  for (const id of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
} finally { await b.close(); }
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
