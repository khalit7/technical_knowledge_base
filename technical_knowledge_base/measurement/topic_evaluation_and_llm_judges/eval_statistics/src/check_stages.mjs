// The 2026-11-06 rollout checks for Eval statistics (2026-11-09): both 3D stages (Fig. 1 a score as an estimate, Fig. 2 one comparison
// analysed three ways) play by themselves once scrolled into view, step to their last step with one step-list item per step, stop redrawing
// off screen and never move under reduced motion; no errors, NaN, undefined or sideways scroll; the splits are two columns at 1400 px and one
// below 1100 px. The numbers written in the two step lists are compared with what the scenes compute from the page's data (window.ESS).
// Adapted from the Math benchmarks page's check_stages.mjs.
// usage (from the repo root): node technical_knowledge_base/measurement/topic_evaluation_and_llm_judges/eval_statistics/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = [['stg-se', 'sx-se'], ['stg-pair', 'sx-pair']];
const wait = ms => new Promise(r => setTimeout(r, ms));
const problems = [];
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
      }
    }
    await wait(1700);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
    await audit(`${id} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id} list does not mark the last step`);
  }
  if (width === 1400) { // the step lists' numbers are what the scenes compute from the page's data
    const r = await p.evaluate(() => { const out = [], li = (id, k) => document.getElementById(id).children[k].textContent.replace(/\s+/g, ' ');
      const need = (id, k, x) => { if (!li(id, k).includes(String(x))) out.push(`${id} item ${k + 1} lacks "${x}"`) };
      const loc = x => x.toLocaleString('en-US');
      const E = ESS.se; need('sx-se', 0, loc(E.n) + ' RACE-H questions on 400 passages'); need('sx-se', 0, E.right + ' right'); need('sx-se', 0, E.p + '%');
      need('sx-se', 1, 'scores ' + E.one + '%'); need('sx-se', 1, (E.p - E.one).toFixed(1) + ' points below');
      need('sx-se', 2, '±' + E.hw[0]); need('sx-se', 2, '±' + E.boot[0].toFixed(2)); need('sx-se', 3, '±' + E.hw[1]); need('sx-se', 3, '±' + E.boot[1].toFixed(2));
      need('sx-se', 4, '±' + E.hw[2]); need('sx-se', 4, '±' + E.boot[2].toFixed(2));
      E.boot.forEach((v, i) => { if (Math.abs(v / E.hw[i] - 1) > .12) out.push(`Fig. 1 cloud ${i} width ${v} far from the formula ${E.hw[i]}`) });
      const P = ESS.pair; need('sx-pair', 0, 'A gets ' + P.rA + ' right'); need('sx-pair', 0, 'B ' + P.rB); need('sx-pair', 0, '−' + Math.abs(P.diff).toFixed(2) + ' points');
      need('sx-pair', 1, P.b11 + ' questions both are right'); need('sx-pair', 1, P.b00 + ' both are wrong'); need('sx-pair', 1, (P.b10 + P.b01) + ' discordant'); need('sx-pair', 1, P.b10 + ' right only for A');
      need('sx-pair', 1, P.b01 + ' only for B'); need('sx-pair', 1, '(' + P.b01 + ' − ' + P.b10 + ')/' + loc(P.n));
      need('sx-pair', 2, '±' + P.hw[0].toFixed(2)); need('sx-pair', 2, '±' + P.boot[0].toFixed(2)); need('sx-pair', 2, P.ex[0] ? 'excludes zero' : 'includes zero');
      need('sx-pair', 3, '±' + P.hw[1].toFixed(2)); need('sx-pair', 3, '±' + P.boot[1].toFixed(2)); need('sx-pair', 3, 'r = ' + P.r.toFixed(2)); need('sx-pair', 3, P.ratio.toFixed(2) + ' of the unpaired'); need('sx-pair', 3, P.ex[1] ? 'excludes zero' : 'includes zero');
      need('sx-pair', 4, '±' + P.hw[2].toFixed(2)); need('sx-pair', 4, '±' + P.boot[2].toFixed(2)); need('sx-pair', 4, P.C + ' of them'); need('sx-pair', 4, P.ex[2] ? 'excludes zero' : 'includes zero again');
      P.boot.forEach((v, i) => { if (Math.abs(v / P.hw[i] - 1) > .12) out.push(`Fig. 2 cloud ${i} width ${v} far from the formula ${P.hw[i]}`) });
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
