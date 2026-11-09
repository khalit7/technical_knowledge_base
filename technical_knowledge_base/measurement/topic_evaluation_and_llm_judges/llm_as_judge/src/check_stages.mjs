// The 2026-11-06 rollout checks for LLM-as-judge (2026-11-09): the four 3D stages (Fig. 1 judge modes, Fig. 2 position bias, Fig. 3 the
// gold-slice correction, Fig. 4 juries) play by themselves once scrolled into view, step to their last step with one step-list item per step
// in every mode, stop redrawing off screen and never move under reduced motion; the Judge bias lab's one-pair animation plays when in view,
// has one list item per step and stops for good on a reader control; no errors, NaN, undefined or sideways scroll; the splits are two
// columns at 1400 px and one below 1100 px. The numbers written in the step lists are compared with what the scenes compute (window.LJS).
// Adapted from Human evaluation and annotation's check_stages.mjs.
// usage (from the repo root): node technical_knowledge_base/measurement/topic_evaluation_and_llm_judges/llm_as_judge/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = ['stg-modes', 'stg-order', 'stg-gold', 'stg-jury'];
const MODES = { 'stg-modes': [null, [''], () => 'sx-modes'], 'stg-order': [null, [''], () => 'sx-order'], 'stg-jury': [null, [''], () => 'sx-jury'],
  'stg-gold': ['#gd-mode', ['corr', 'naive'], m => m === 'corr' ? 'sx-gold-c' : 'sx-gold-n'] };
const wait = ms => new Promise(r => setTimeout(r, ms));
const problems = [];
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(400);
  const tag = `${scheme} ${width}`;
  const audit = async (where, tab = 't-read') => {
    const r = await p.evaluate(tab => { const c = document.getElementById(tab).cloneNode(true); c.querySelectorAll('pre,code').forEach(x => x.remove());
      return { bad: (c.innerText.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } }, tab);
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (!cols.length || cols.some(c => c !== 'grid'))) problems.push(`${tag}: a split is not two columns (${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  for (const id of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
    if (width === 1400 || width === 390) { await wait(300); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-autoplay-tween-${scheme}-${width}.png` }) }
  }
  // flows stop off screen
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  for (const id of STAGES) {
    const [seg, modes, lof] = MODES[id];
    for (const md of modes) {
      const lid = lof(md);
      if (seg) { await p.$eval(`${seg} button[data-m="${md}"]`, e => e.click()); await wait(200) }
      await p.$eval(`#${id}-b`, e => e.click());
      await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
      const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.hidden ? -1 : e.children.length);
      if (lis !== n) problems.push(`${tag}: ${id} mode ${md} has ${n} steps but list ${lid} shows ${lis}`);
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' }));
      const shoot = (width === 1400 || width === 390) && md === modes[0];
      for (let k = 0; k < n; k++) {
        if (k) await p.$eval(`#${id}-f`, e => e.click());
        if (shoot) {
          await wait(650); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}-midtween-${scheme}-${width}.png` });
          await wait(1100); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}-${scheme}-${width}.png` })
        } else await wait(250);
      }
      await wait(1700);
      const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} mode ${md} ended on ${sh}`);
      await audit(`${id} ${md} last step`);
      for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
      const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
      if (cur !== n - 1) problems.push(`${tag}: ${id} mode ${md} list does not mark the last step`);
    }
    if (seg) { await p.$eval(`${seg} button[data-m="${modes[0]}"]`, e => e.click()); await wait(200) }
  }
  if (width === 1400) { // the step lists' numbers are what the scenes compute
    const r = await p.evaluate(() => { const out = [], li = (lid, k) => document.getElementById(lid).children[k].textContent.replace(/\s+/g, ' ');
      const need = (lid, k, x) => { if (!li(lid, k).includes(String(x))) out.push(`${lid} item ${k + 1} lacks "${x}"`) };
      const M = LJS.modes; need('sx-modes', 0, M.score); need('sx-modes', 1, M.pair);
      need('sx-modes', 2, M.pa); need('sx-modes', 2, M.sa); need('sx-modes', 2, M.pk); need('sx-modes', 2, M.sk); need('sx-modes', 2, M.ha); need('sx-modes', 2, M.n);
      const O = LJS.order; need('sx-order', 2, O.n + ' comparisons'); need('sx-order', 2, O.same + ' (' + O.pct + ')'); need('sx-order', 2, 'Of the ' + O.ch); need('sx-order', 2, O.first + ' went to');
      need('sx-order', 2, O.second + ' to'); need('sx-order', 2, O.tie + ' became'); need('sx-order', 3, O.votes); need('sx-order', 3, O.kF); need('sx-order', 3, O.kB); need('sx-order', 3, O.kFB);
      need('sx-order', 3, O.tF); need('sx-order', 3, O.tFB); if (O.ex[0] !== 0 || O.ex[1] !== 1) out.push('order example no longer follows slot A in both orders');
      const G = LJS.gold; need('sx-gold-c', 0, G.n.toLocaleString('en-US')); need('sx-gold-c', 2, G.p); need('sx-gold-c', 4, G.tp + ' true positives'); need('sx-gold-c', 4, G.fn + ' wins'); need('sx-gold-c', 4, G.fp + ' losses'); need('sx-gold-c', 4, G.tn + ' true negatives');
      need('sx-gold-c', 5, G.q1); need('sx-gold-c', 5, G.q0); need('sx-gold-c', 6, G.est); need('sx-gold-c', 6, G.lo + ' to ' + G.hi); need('sx-gold-c', 7, G.th);
      const J = LJS.jury; need('sx-jury', 1, J[0][0]); need('sx-jury', 2, J[1][0]); need('sx-jury', 2, J[1][1]); need('sx-jury', 3, J[2][0]); need('sx-jury', 3, J[1][1] + ' to ' + J[2][1]);
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  await audit('end');
  // the Judge bias lab's one-pair animation (2D, its own controller)
  await p.click('#tabs button[data-t="t-bias"]'); await wait(300);
  const jcols = await p.$$eval('#t-bias .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && jcols.some(c => c !== 'grid')) problems.push(`${tag}: the bias lab split is not two columns`);
  await p.$eval('#jb-anim', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
  if (!(await p.$eval('#jb-anim', e => e.dataset.playing === '1'))) problems.push(`${tag}: jb-anim did not play when scrolled into view`);
  const jn = await p.$eval('#jb-s', e => +e.max + 1), jl = await p.$eval('#sx-jb', e => e.children.length); if (jn !== jl) problems.push(`${tag}: jb-anim ${jn} steps, list ${jl}`);
  await p.$eval('#sx-jb', e => e.children[e.children.length - 1].click()); await wait(200);
  if (await p.$eval('#jb-anim', e => e.dataset.playing === '1')) problems.push(`${tag}: jb-anim kept playing after a list click`);
  if ((await p.$eval('#jb-s', e => +e.value)) !== jn - 1) problems.push(`${tag}: jb-anim list click did not jump to the last step`);
  await wait(4600); if ((await p.$eval('#jb-s', e => +e.value)) !== jn - 1) problems.push(`${tag}: jb-anim moved after the reader took a control`);
  if (width === 1400 || width === 390) await p.screenshot({ path: `${shots}/x-jb-anim-${scheme}-${width}.png` });
  await audit('bias lab', 't-bias');
  await p.click('#tabs button[data-t="t-proto"]'); await wait(300);
  const pcols = await p.$$eval('#t-proto .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && pcols.some(c => c !== 'grid')) problems.push(`${tag}: the protocol lab split is not two columns`);
  await audit('protocol lab', 't-proto');
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
  await p.click('#tabs button[data-t="t-bias"]'); await wait(300); await p.$eval('#jb-anim', e => e.scrollIntoView({ block: 'center' })); await wait(1800);
  if ((await p.$eval('#jb-s', e => +e.value)) !== 0 || await p.$eval('#jb-anim', e => e.dataset.playing === '1')) problems.push('reduced motion: jb-anim moved by itself');
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
