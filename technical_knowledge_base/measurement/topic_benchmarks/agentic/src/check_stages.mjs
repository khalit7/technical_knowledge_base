// The 2026-11-06 rollout checks for Agentic benchmarks: every 3D stage (Fig. 1 hero, Fig. 2 regex-log runs, Fig. 3 pass^k) plays by itself once
// scrolled into view, steps to its last step in every mode with one step-list item per step, stops redrawing off screen and never moves under
// reduced motion; no errors, NaN, undefined or sideways scroll; the splits are two columns at 1400 px and one below 1100 px. The numbers written in the
// step lists are checked against what the scenes compute from the page's data (window.AGN, from window.AG and window.HS).
// usage (from the repo root): node technical_knowledge_base/measurement/topic_benchmarks/agentic/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = [['stg-hero', [['', 'sx-hero']], null], ['stg-run', [['0', 'sx-run-0'], ['1', 'sx-run-1'], ['2', 'sx-run-2']], '#run-mode'], ['stg-pk', [['hat', 'sx-pk-hat'], ['at', 'sx-pk-at']], '#pk-mode']];
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
  await p.evaluate(() => window.scrollTo(0, document.getElementById('rd-integ').getBoundingClientRect().top + scrollY)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  for (const [id, modes, sel] of STAGES) for (const [m, lid] of modes) {
    if (sel) { await p.$eval(`${sel} [data-m="${m}"]`, e => e.click()); await wait(150); }
    const hid = await p.evaluate(lid => [...document.querySelectorAll('ol.sx')].filter(o => o.id.startsWith(lid.replace(/-[^-]+$/, '-')) && o.id !== lid && !o.hidden).length, lid);
    if (sel && hid) problems.push(`${tag}: ${id} ${m}: another mode's list is still shown`);
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.hidden ? -1 : e.children.length);
    if (lis !== n) problems.push(`${tag}: ${id} ${m} has ${n} steps but list ${lid} shows ${lis}`);
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' }));
    for (let k = 0; k < n; k++) {
      if (k) await p.$eval(`#${id}-f`, e => e.click());
      if (width === 1400 || width === 390) {
        if (k === Math.floor(n / 2)) { await wait(650); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${m ? '-' + m : ''}-s${k + 1}-midtween-${scheme}-${width}.png` }) }
        await wait(1700); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${m ? '-' + m : ''}-s${k + 1}${k === Math.floor(n / 2) ? '-mid' : ''}-${scheme}-${width}.png` })
      }
    }
    await wait(1700);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ${m} ended on ${sh}`);
    await audit(`${id} ${m} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id} ${m} list does not mark the last step`);
  }
  if (width === 1400) { // the step lists' numbers are the page's data
    const r = await p.evaluate(() => { const out = [], li = (id, k) => document.getElementById(id).children[k].textContent.replace(/\s+/g, ' ');
      const need = (id, xs) => xs.forEach(([k, x]) => { if (!li(id, k).includes(String(x))) out.push(`${id} item ${k + 1} lacks "${x}"`) });
      const H = AGN.hero, f = v => v.toFixed(2), h1 = H.harness;
      need('sx-hero', [[1, h1[0][1].toFixed(1) + '% (' + h1[0][0] + ')'], [1, h1[h1.length - 1][1].toFixed(1) + '% (' + h1[h1.length - 1][0] + ')'], [1, 'nine agents'], [2, f(H.pk[0]) + '%'], [2, f(H.pk[3]) + '%']]);
      if (h1.length !== 9) out.push('hero: Opus 4.6 has ' + h1.length + ' agents');
      const R = AGN.run; need('sx-run-0', [[3, R.curl + ' of the ' + R.n + ' Terminal-Bench 2.0 tasks']]); need('sx-run-1', [[5, R.n + ' of ' + R.n + ' tasks']]);
      if (R.sep3 !== R.n3 || R.sep4 !== R.n4) out.push('separate verifier counts ' + JSON.stringify(R));
      if (R.steps.some(s => s !== 6)) out.push('run modes have ' + R.steps + ' steps');
      // the pk stage on the default run (GPT-5.2 retail)
      const s = document.getElementById('an2-set'); s.value = [...s.options].findIndex(o => /Retail: GPT-5\.2 \(high\)/.test(o.textContent)); s.dispatchEvent(new Event('change'));
      const K = AGN.pk, h = K.hist; if (K.label !== 'GPT-5.2 (high)' || K.dom !== 'retail') out.push('pk default run is ' + K.label);
      need('sx-pk-hat', [[0, K.nT + ' tasks'], [1, h[0] + ' tasks passed 0 times, ' + h[1] + ' once, ' + h[2] + ' twice, ' + h[3] + ' three times and ' + h[4] + ' all four times'], [5, 'Only the ' + h[4] + ' tasks'], [5, (K.nT * 4) + ' trials']]);
      [0, 1, 2, 3].forEach(i => { need('sx-pk-hat', [[i + 2, 'pass^' + (i + 1) + ' = ' + f(K.hat[i])]]); need('sx-pk-at', [[i + 2, 'pass@' + (i + 1) + ' = ' + f(K.at[i])]]); if (Math.abs(K.hat[i] - K.pub[i]) > .005) out.push('pass^' + (i + 1) + ' differs from the board') });
      need('sx-pk-at', [[5, 'only the ' + h[0] + ' never-solved']]);
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
