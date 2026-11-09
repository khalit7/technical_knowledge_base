// The 2026-11-06 rollout checks for Native multimodal and any-to-any models (2026-11-09): the five 3D stages (Fig. 1 to Fig. 5) play by
// themselves once scrolled into view, step to their last step with one step-list item per step (Fig. 1 in both modes), stop redrawing off
// screen and never move under reduced motion; the token-by-token widget (section 3, closed block) never plays by itself; no errors, NaN,
// undefined or sideways scroll; the splits are two columns at 1400 px and one below 1100 px; the step lists' numbers equal what the scenes
// draw (window.NM.sc, written by make_scene_data.py). Adapted from Flow matching's check_stages.mjs.
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_generative_and_multimodal/native_multimodal_models/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = [['stg-fuse', 'sx-fuse-pipe'], ['stg-tok', 'sx-tok'], ['stg-ar', 'sx-ar'], ['stg-par', 'sx-par'], ['stg-sp', 'sx-sp']];
const wait = ms => new Promise(r => setTimeout(r, ms));
const problems = [];
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
try {
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
    if (width === 1400 || width === 390) { await wait(300); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-autoplay-${scheme}-${width}.png` }) }
  }
  // flows and timers stop off screen
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  const runs = [...STAGES.map(([id, lid]) => [id, lid, null]), ['stg-fuse', 'sx-fuse-early', 'early']];
  for (const [id, lid, mode] of runs) {
    if (mode) await p.$eval(`#nm-fuse-mode button[data-m=${mode}]`, e => e.click());
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length);
    if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but list ${lid} shows ${lis}`);
    if (await p.$eval('#' + lid, e => e.hidden)) problems.push(`${tag}: ${lid} is hidden while it drives ${id}`);
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' }));
    for (let k = 0; k < n; k++) {
      if (k) await p.$eval(`#${id}-f`, e => e.click());
      if (width === 1400 || width === 390) {
        await wait(700); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${mode ? '-' + mode : ''}-s${k + 1}-mid-${scheme}-${width}.png` });
        await wait(3400); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${mode ? '-' + mode : ''}-s${k + 1}-${scheme}-${width}.png` })
      } else await wait(200);
    }
    await wait(800);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
    await audit(`${id} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id} list does not mark the last step`);
    if (mode) await p.$eval('#nm-fuse-mode button[data-m=pipe]', e => e.click());
  }
  if (width === 1400) { // the step lists quote what the scenes draw
    const r = await p.evaluate(() => { const out = [], li = (id, k) => document.getElementById(id).children[k].textContent.replace(/\s+/g, ' ');
      const need = (id, k, x) => { if (!li(id, k).includes(String(x))) out.push(`${id} item ${k + 1} lacks "${x}"`) };
      const A = NM.sc.ar, H = NM.smp.ar_record['1.0'].H[NM.sc.cls];
      A.rowbits.forEach((v, r) => { const s = H.slice(r * 8, r * 8 + 8).reduce((a, b) => a + b, 0); if (Math.abs(s - v) > .051) out.push('row ' + (r + 1) + ' sum ' + s); need('sx-ar', r, 'Row ' + (r + 1) + ': ' + v.toFixed(1) + ' bits') });
      need('sx-ar', 7, A.Hsum.toFixed(1) + ' bits of entropy'); need('sx-ar', 3, A.Hmax.toFixed(2) + ' bits');
      const M = NM.sc.mask; if (M.cum[M.cum.length - 1] !== 64 || M.per_round.reduce((a, b) => a + b, 0) !== 64) out.push('mask rounds do not fill 64: ' + M.per_round);
      need('sx-par', 2, M.per_round.slice(0, 7).join(', ') + ' and ' + M.per_round[7] + ' positions');
      need('sx-par', 4, NM.sc.cost.ddim_over_ar.toFixed(1) + ' times');
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  { // the token-by-token widget is driven by the reader: it never plays by itself
    await p.evaluate(() => { const d = document.getElementById('g-watch').closest('details'); d.open = true }); await wait(200);
    await p.$eval('#g-watch', e => e.scrollIntoView({ block: 'center' })); await wait(2000);
    if ((await p.$eval('#g-wctl-p', e => e.textContent)).indexOf('Pause') >= 0) problems.push(`${tag}: the token-by-token widget played by itself`);
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
} finally { await b.close(); }
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
