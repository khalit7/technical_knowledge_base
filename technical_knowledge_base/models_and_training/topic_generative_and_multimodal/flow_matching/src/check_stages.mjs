// The 2026-11-06 rollout checks for Flow matching and rectified flow (2026-11-09): the seven 3D stages (Fig. 1 to Fig. 7) and the 2D
// same-noise stepper of section 10 play by themselves once scrolled into view, step to their last step with one step-list item per step,
// stop redrawing off screen and never move under reduced motion; the playground tab's stepper is a widget and never plays by itself; no errors,
// NaN, undefined or sideways scroll; the splits are two columns at 1400 px and one below 1100 px. The numbers the step lists state about what
// the scenes compute in the browser (window.FMS) are compared with the scenes. Adapted from Evaluating generative models' check_stages.mjs.
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_generative_and_multimodal/flow_matching/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = [['stg-hero', 'sx-hero'], ['stg-field', 'sx-field'], ['stg-steps', 'sx-steps'], ['stg-memo', 'sx-memo'], ['stg-cpl', 'sx-cpl'], ['stg-rf', 'sx-rf'], ['stg-sde', 'sx-sde']];
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
    if (width === 1400 || width === 390) { await wait(300); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-autoplay-tween-${scheme}-${width}.png` }) }
  }
  // the 2D stepper of section 10 plays by itself too (its play button reads Pause)
  await p.$eval('#fms-bc', e => e.scrollIntoView({ block: 'center' })); await wait(1800);
  if ((await p.$eval('#fms-ctl-p', e => e.textContent)).indexOf('Pause') < 0) problems.push(`${tag}: the section 10 stepper did not play when scrolled into view`);
  // flows and timers stop off screen
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  for (const [id, lid] of STAGES) {
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length);
    if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but list ${lid} shows ${lis}`);
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' }));
    for (let k = 0; k < n; k++) {
      if (k) await p.$eval(`#${id}-f`, e => e.click());
      if (width === 1400 || width === 390) {
        await wait(650); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}-midtween-${scheme}-${width}.png` });
        await wait(1100); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}-${scheme}-${width}.png` })
      } else await wait(200);
    }
    await wait(1700);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
    await audit(`${id} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id} list does not mark the last step`);
  }
  { // the section 10 stepper: one list item per step, and stepping to the end marks the last item
    const n = await p.$eval('#fms-ctl-s', e => +e.max + 1), lis = await p.$eval('#sx-fms', e => e.children.length);
    if (n !== lis) problems.push(`${tag}: the section 10 stepper has ${n} steps but its list ${lis}`);
    for (let k = 0; k < n; k++) await p.$eval('#fms-ctl-f', e => e.click());
    const cur = await p.$eval('#sx-fms', e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: the section 10 stepper list does not mark its last step`);
    if (width === 1400) await (await p.$('#fms-bc')).screenshot({ path: `${shots}/x-fms-bc-${scheme}-${width}.png` });
  }
  if (width === 1400) { // the step lists' numbers are what the scenes compute in the browser
    const r = await p.evaluate(() => { const out = [], li = (id, k) => document.getElementById(id).children[k].textContent.replace(/\s+/g, ' ');
      const need = (id, k, x) => { if (!li(id, k).includes(String(x))) out.push(`${id} item ${k + 1} lacks "${x}"`) };
      const M = FMS.memo; need('sx-memo', 0, 'a median ' + M.popMed.toFixed(2)); need('sx-memo', 2, 'all ' + M.n + ' end within 0.02'); need('sx-memo', 2, 'all ' + M.used + ' are used');
      if (!(M.dmax < .02)) out.push('Fig. 4: the farthest end is ' + M.dmax + ' from its training point, not within 0.02'); need('sx-memo', 3, 'Up to ' + M.top + ' of the ' + M.n);
      const C = FMS.cpl; need('sx-cpl', 0, 'mean squared length ' + C.rand.toFixed(2) + ' for this batch'); need('sx-cpl', 2, 'mean squared length ' + C.ot.toFixed(2) + ' for this batch');
      if (!(C.ot / C.rand < .4)) out.push('Fig. 5: OT is ' + (C.ot / C.rand).toFixed(2) + ' of random, not under 40%');
      const R = FMS.rf; if (!(R.rf1 === 0 && R.rf2 > R.n / 2 && R.st > R.n / 2)) out.push('Fig. 6: one-step counts ' + JSON.stringify(R));
      const S = FMS.sde; if (!(S.sde4 < S.ode4 && S.ode64 > .95 * S.n && S.sde64 > .95 * S.n)) out.push('Fig. 7: counts ' + JSON.stringify(S));
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  { // the playground is a widget: it never plays by itself
    await p.evaluate(() => document.querySelector('#tabs button[data-t="t-fmpath"]').click()); await wait(300);
    await p.$eval('#fmp-card', e => e.scrollIntoView({ block: 'center' })); await wait(2000);
    if ((await p.$eval('#fmp-ctl-p', e => e.textContent)).indexOf('Pause') >= 0) problems.push(`${tag}: the playground played by itself`);
    if (width === 1400) { const c = await p.$eval('#t-fmpath .s3sp', x => getComputedStyle(x).display); if (c !== 'grid') problems.push(`${tag}: the playground is not split`) }
    await p.evaluate(() => document.querySelector('#tabs button[data-t="t-read"]').click()); await wait(200);
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
  await p.$eval('#fms-bc', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
  if ((await p.$eval('#fms-ctl-p', e => e.textContent)).indexOf('Pause') >= 0) problems.push('reduced motion: the section 10 stepper played');
  await p.close();
}
} finally { await b.close(); }
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
