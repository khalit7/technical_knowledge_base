// The 2026-11-06 rollout checks for Test-time compute and reasoning (2026-11-10): every 3D stage (Fig. 2 one budget two shapes, Fig. 3 the selector,
// Fig. 4 ORM against PRM and beam search, Fig. 5 recurrent depth in three modes) plays by itself once scrolled into view, steps to its last step with
// one step-list item per step, stops redrawing off screen and never moves under reduced motion; no errors, NaN, undefined or sideways scroll; the
// splits are two columns at 1400 px and one below 1100 px; no two scene labels overlap at 1400 px, at the end of a step or mid-way through it, and none
// is clamped against the card's edge; the numbers written in the step lists are the ones the scenes compute (window.TTCS).
// Adapted from the Math benchmarks page's check_stages.mjs.
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_llm_landscape/test_time_compute_and_reasoning/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = [['stg-sp', 'sx-sp', 'sp'], ['stg-sel', 'sx-sel', 'sel'], ['stg-prm', 'sx-prm', 'prm'], ['stg-lp', 'sx-lp-ord', 'lp']];
const wait = ms => new Promise(r => setTimeout(r, ms));
const problems = [];
// label boxes as the renderer drew them (after spreading and clamping); overlaps between two visible labels, and labels pushed against the edge
const labelAudit = (p, name) => p.evaluate(name => {
  const st = TTCS.stage[name], R = st.R, cx = R.cx, W = R.W, H = R.H, out = [];
  const box = L => { const o = L.o, fs = Math.max(12, o.fs || 12.5); cx.font = (o.b ? '600 ' : '') + fs + 'px ' + (o.mono ? 'ui-monospace,Menlo,monospace' : 'ui-sans-serif,Helvetica,Arial,sans-serif');
    const w = cx.measureText(L.text).width, x0 = o.al === 'right' ? L.x - w : o.al === 'left' ? L.x : L.x - w / 2; return { t: L.text, a: L.a, x0, x1: x0 + w, y0: L.y - fs / 2, y1: L.y + fs / 2 } };
  const bs = R.lab.filter(L => L.a > .35).map(box);
  for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) { const a = bs[i], b = bs[j];
    const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), oy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
    if (ox > 2 && oy > 2) out.push(`"${a.t}" overlaps "${b.t}"`) }
  bs.forEach(b => { if (b.x0 < 3 || b.x1 > W - 3 || b.y0 < 2 || b.y1 > H - 2) out.push(`"${b.t}" is against the edge`) });
  return out }, name);
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(400);
  const tag = `${scheme} ${width}`;
  const audit = async where => {
    const r = await p.evaluate(() => { const c = document.getElementById('t-read').cloneNode(true); c.querySelectorAll('pre,code').forEach(x => x.remove());
      return { bad: (c.innerText.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } });
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (!cols.length || cols.some(c => c !== 'grid'))) problems.push(`${tag}: a split is not two columns (${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  for (const [id] of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
    if (width === 1400 || width === 390) { await wait(300); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-autoplay-tween-${scheme}-${width}.png` }) }
  }
  // flows stop off screen
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  // every stage (and every mode of Fig. 5) stepped to its end; labels audited at 1400 px, mid-step and settled
  const runs = STAGES.map(s => [...s, null]).concat([['stg-lp', 'sx-lp-loop', 'lp', 'loop'], ['stg-lp', 'sx-lp-rlt', 'lp', 'rlt']]);
  for (const [id, lid, name, mode] of runs) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(300);
    if (mode) { await p.$eval(`#lpM button[data-m=${mode}]`, e => e.click()); await wait(300);
      if (await p.$eval('#' + lid, e => e.hidden)) problems.push(`${tag}: ${lid} stays hidden after its mode is chosen`) }
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length);
    if (lis !== n) problems.push(`${tag}: ${id}${mode ? ' ' + mode : ''} has ${n} steps but list ${lid} shows ${lis}`);
    const tagS = id + (mode ? '-' + mode : '');
    for (let k = 0; k < n; k++) {
      if (k) await p.$eval(`#${id}-f`, e => e.click());
      if (width === 1400 && k) { await wait(750); (await labelAudit(p, name)).forEach(x => problems.push(`${tag}: ${tagS} step ${k + 1} mid-way: ${x}`)) }
      if (width === 1400 || width === 390) {
        if (k === Math.floor(n / 2)) { await wait(650); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${tagS}-s${k + 1}-midtween-${scheme}-${width}.png` }) }
        await wait(1700); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${tagS}-s${k + 1}${k === Math.floor(n / 2) ? '-mid' : ''}-${scheme}-${width}.png` })
      } else await wait(1800);
      if (width === 1400) (await labelAudit(p, name)).forEach(x => problems.push(`${tag}: ${tagS} step ${k + 1}: ${x}`));
    }
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${tagS} ended on ${sh}`);
    await audit(`${tagS} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${tagS} list does not mark the last step`);
  }
  if (width === 1400) { // the step lists' numbers are what the scenes compute
    const r = await p.evaluate(() => { const out = [], li = (id, k) => document.getElementById(id).children[k].textContent.replace(/\s+/g, ' ');
      const need = (id, k, x) => { if (!li(id, k).includes(String(x))) out.push(`${id} item ${k + 1} lacks "${x}"`) };
      const A = TTCS.sp; need('sx-sp', 0, '40 blocks of 250'); need('sx-sp', 3, A.serialS + ' seconds'); need('sx-sp', 4, A.serialS + ' seconds as one chain and ' + A.parS + ' as five');
      need('sx-sp', 6, A.v1 + '%'); need('sx-sp', 6, A.v4 + '%'); need('sx-sp', 7, A.pk.toFixed(3));
      const B = TTCS.sel; need('sx-sel', 1, B.cnt[0] + ' right; ' + B.cnt.slice(1, 4).join(', ') + ' and ' + B.cnt[4] + ' wrong'); need('sx-sel', 2, B.pk5.toFixed(3)); need('sx-sel', 2, String(B.pk15));
      need('sx-sel', 3, B.v4_5 + '%'); need('sx-sel', 3, B.v4_15.toFixed(1) + '%'); need('sx-sel', 4, B.v1_5 + '%'); need('sx-sel', 4, B.v1_15 + '%'); need('sx-sel', 5, B.v4_63 + '%'); need('sx-sel', 5, B.v1_63 + '%');
      const C = TTCS.prm; C.chain.forEach(v => need('sx-prm', 2, v.toFixed(2))); need('sx-prm', 3, C.d1.map(v => v.toFixed(2)).join(', ')); need('sx-prm', 5, C.d2.map(v => v.toFixed(2)).join(', '));
      need('sx-prm', 7, '= ' + C.s42.toFixed(2)); need('sx-prm', 7, '17 gets ' + C.s17.toFixed(2));
      const D = TTCS.lp; need('sx-lp-ord', 4, D.ord + ' layer applications'); need('sx-lp-loop', 4, '2 + 4 × 7 + 2 = ' + D.loop); need('sx-lp-loop', 4, '2 + 4 × 32 + 2 = ' + D.huginn); need('sx-lp-rlt', 3, D.rltPath(4) + ' decoder blocks');
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  await audit('end');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file);
  for (const [id] of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
