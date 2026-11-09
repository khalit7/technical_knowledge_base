// The 2026-11-06 rollout checks for Math benchmarks (2026-11-09): every 3D stage (Fig. 1 one answer through four checks, Fig. 2 one AIME problem
// scored three ways, Fig. 3 answers against problems as the unit) plays by itself once scrolled into view, steps to its last step with one step-list
// item per step, stops redrawing off screen and never moves under reduced motion; the GSM-Symbolic animation plays in view (its button reads Pause)
// and the FrontierMath ladder, a widget, never plays by itself; no errors, NaN, undefined or sideways scroll; the splits are two columns at 1400 px
// and one below 1100 px. The numbers written in the step lists are compared with what the scenes compute from the page's data (window.MAS).
// Adapted from the Knowledge and reasoning benchmarks page's check_stages.mjs.
// usage (from the repo root): node technical_knowledge_base/measurement/topic_benchmarks/math/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = [['stg-ck', 'sx-ck'], ['stg-ai', 'sx-ai'], ['stg-clu', 'sx-clu']];
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
  // the 2D GSM-Symbolic animation plays in view; the FrontierMath ladder (a widget) does not
  await p.$eval('#gs-card', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
  if (!/Pause/.test(await p.$eval('#gs-ctl-p', e => e.textContent))) problems.push(`${tag}: GSM-Symbolic animation did not play when scrolled into view`);
  const gsl = await p.$eval('#sx-gs', e => e.children.length), gsn = await p.$eval('#gs-ctl-s', e => +e.max + 1);
  if (gsl !== gsn) problems.push(`${tag}: GSM-Symbolic has ${gsn} steps but its list ${gsl}`);
  await p.$eval('#gs-ctl-f', e => e.click()); for (let k = 0; k < gsn; k++) await p.$eval('#gs-ctl-f', e => e.click());
  if (await p.$eval('#gs-ctl-s', e => +e.value) !== gsn - 1) problems.push(`${tag}: GSM-Symbolic did not reach its last step`);
  if ((await p.$$eval('#sx-gs li.on', x => x.length)) !== 1 || !(await p.$eval('#sx-gs', e => e.lastElementChild.classList.contains('on')))) problems.push(`${tag}: GSM list does not mark the last step`);
  await p.$eval('#fm-card', e => e.scrollIntoView({ block: 'center' })); const fm0 = await p.$eval('#fm-ctl-s', e => e.value); await wait(2500);
  if (/Pause/.test(await p.$eval('#fm-ctl-p', e => e.textContent)) || (await p.$eval('#fm-ctl-s', e => e.value)) !== fm0) problems.push(`${tag}: FrontierMath ladder moved by itself`);
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
        if (k === Math.floor(n / 2)) { await wait(650); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}-midtween-${scheme}-${width}.png` }) }
        await wait(1700); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}${k === Math.floor(n / 2) ? '-mid' : ''}-${scheme}-${width}.png` })
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
      const C = MAS.ck; need('sx-ck', 0, C.answers + ' answers'); need('sx-ck', 0, C.right + ' right'); need('sx-ck', 0, C.wrong + ' wrong');
      need('sx-ck', 1, C.ans); need('sx-ck', 2, C.key); need('sx-ck', 2, 'Of the ' + C.right + ' answers'); if (C.exact !== 0) out.push('exact-match count is not 0: ' + C.exact);
      need('sx-ck', 3, C.norm + ' of the ' + C.right); need('sx-ck', 4, C.form + ' answers'); need('sx-ck', 5, 'Of ' + C.n13 + ' answers parsed to 1/3, ' + C.n13r + ' are graded right and ' + (C.n13 - C.n13r) + ' wrong');
      need('sx-ck', 5, 'of ' + C.n3 + ' parsed to 3, ' + C.n3r + ' is right'); need('sx-ck', 5, 'the ' + (C.n13 + C.n3) + ' lifted');
      const t = document.getElementById('s-check').textContent.replace(/\s+/g, ' '); if (!t.includes(C.nonint + ' of HMMT February 2026\'s ' + C.problems + ' problems')) out.push('s-check lacks the non-integer key count');
      const A = MAS.ai; need('sx-ai', 1, 'key is ' + A.key); need('sx-ai', 1, A.wrong + ' appears ' + A.wHere + ' times'); need('sx-ai', 1, A.wAll + ' of the ' + A.tot);
      const ps = Object.fromEntries(A.names.map((n, i) => [n, A.ps[i]])); need('sx-ai', 2, 'GPT-5 (high) gets ' + ps['GPT-5 (high)'][0] + '%'); need('sx-ai', 2, 'GPT-5.2 (high) ' + ps['GPT-5.2 (high)'][0] + '%');
      A.names.forEach((n, i) => { if (!/GPT-5/.test(n) && A.ps[i][0] !== 0) out.push(n + ' pass@1 on the problem is not 0'); if (!/GPT-5/.test(n) && A.ps[i][2] !== 0) out.push(n + ' pass@4 is not 0') });
      ['o1 (medium)', 'DeepSeek-R1', 'Claude 3.7 Sonnet (thinking)'].forEach(n => { if (ps[n][1] !== 0) out.push(n + ' maj@4 is not 0') }); if (ps['GPT-5 (high)'][1] !== 100) out.push('GPT-5 maj@4 is not 100');
      const ex = Object.fromEntries(A.names.map((n, i) => [n, A.ex[i]])); need('sx-ai', 5, 'up to ' + A.maxGap + ' points');
      ['Claude 3.7 Sonnet (thinking)', 'DeepSeek-R1'].forEach(n => ex[n].forEach(v => need('sx-ai', 5, v.toFixed(1) + '%'))); if (A.maxGapModel !== 'Claude 3.7 Sonnet (thinking)') out.push('largest gap is ' + A.maxGapModel);
      const U = MAS.clu; need('sx-clu', 0, U.right + ' of ' + U.answers); need('sx-clu', 0, U.p1.toFixed(2) + '%'); need('sx-clu', 1, U.all + ' problems are right'); need('sx-clu', 1, U.none + ' wrong'); need('sx-clu', 1, 'only ' + U.mixed);
      need('sx-clu', 2, '±' + U.ciAns.toFixed(2)); need('sx-clu', 3, '±' + U.ciClu.toFixed(2)); need('sx-clu', 4, '±' + U.ciProb.toFixed(2));
      if (Math.abs(U.ratio - 1.5) > .1) out.push('clustered over published ratio is ' + U.ratio + ', not about half as wide again');
      if (Math.abs(U.bootSdP / U.bootSdA - U.ratio) > .25) out.push('bootstrap clouds ratio ' + (U.bootSdP / U.bootSdA).toFixed(2) + ' far from formula ratio ' + U.ratio);
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
  await p.$eval('#gs-card', e => e.scrollIntoView({ block: 'center' })); await wait(2000);
  if (/Pause/.test(await p.$eval('#gs-ctl-p', e => e.textContent)) || (await p.$eval('#gs-ctl-s', e => e.value)) !== '0') problems.push('reduced motion: GSM-Symbolic moved by itself');
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
