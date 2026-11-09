// The 2026-11-06 rollout checks for Agent and trajectory evaluation: every 3D stage (Fig. 1 hero, Fig. 2 state diff, Fig. 3 pass^k estimator) plays by
// itself once scrolled into view, steps to its last step with one step-list item per step, stops redrawing off screen and never moves under reduced
// motion; the trial stepper (a reader-driven widget) never plays by itself; no errors, NaN, undefined or sideways scroll; the splits are two columns at
// 1400 px and one below 1100 px. The numbers written in the step lists are checked against what the scenes compute from the page's data (window.ATJN).
// usage (from the repo root): node technical_knowledge_base/measurement/topic_evaluation_and_llm_judges/agent_and_trajectory_evaluation/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = [['stg-hero', 'sx-hero'], ['stg-diff', 'sx-diff'], ['stg-pk', 'sx-pk']];
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
  if (width === 1400 && (cols.length < 10 || cols.some(c => c !== 'grid'))) problems.push(`${tag}: a split is not two columns (${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  // the trial stepper is a widget: it opens on its last step and never plays by itself
  { await p.$eval('#an', e => e.scrollIntoView({ block: 'center' })); await wait(2200);
    const r = await p.evaluate(() => [document.getElementById('an-scrub').value, document.getElementById('an-scrub').max, document.getElementById('an-play').textContent]);
    if (r[0] !== r[1] || r[2] !== 'Replay') problems.push(`${tag}: the trial stepper moved by itself or did not open on its last step (${r})`); }
  for (const [id] of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
    if (!/Pause/.test(await p.$eval(`#${id}-p`, e => e.textContent))) problems.push(`${tag}: ${id} is not playing after it came into view`);
    if (width === 1400 || width === 390) { await wait(300); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-autoplay-tween-${scheme}-${width}.png` }) }
  }
  // flows stop off screen
  await p.evaluate(() => window.scrollTo(0, document.getElementById('rd-check').getBoundingClientRect().top + scrollY)); await wait(800);
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
  if (width === 1400) { // the step lists' numbers are the page's data
    const r = await p.evaluate(() => { const out = [], li = (id, k) => document.getElementById(id).children[k].textContent.replace(/\s+/g, ' ');
      const need = (id, xs) => xs.forEach(([k, x]) => { if (!li(id, k).includes(String(x))) out.push(`${id} item ${k + 1} lacks "${x}"`) });
      const H = ATJN.hero;
      need('sx-hero', [[0, H.n + ' records'], [0, H.msgs + ' messages'], [0, H.calls + ' tool calls'], [1, (H.calls - H.writes) + ' reads'], [1, H.writes + ' writes'], ...H.writeNames.map(w => [1, w]),
        [2, H.nl[1] + ' natural-language assertions and marks all ' + H.nl[0] + ' met'], [2, '"' + H.lastA.replace(/\*/g, '').slice(0, 7)], [3, H.diff + ' fields differ'], [4, H.gold[0] + ' of ' + H.gold[1] + ' exact'], [4, H.extra + ' reads are not in the gold path'], [5, 'record ' + H.ask]]);
      if (H.nl[0] !== H.nl[1] || H.reward !== 0 || H.gold[0] === H.gold[1]) out.push('hero verdicts are not pass, fail, fail: ' + JSON.stringify(H));
      const F = ATJN.diff; need('sx-diff', [[0, F.start], [1, F.gold.length + ' gold actions'], ...F.gold.map(g => [1, g]), [2, F.calls + ' calls'], [2, F.writes.length + ' writes'], [4, F.nd + ' fields differ'], [5, F.nullPass + ' of the ' + F.nullN + ' airline tasks']]);
      const vals = window.ATJ.cases['gpt52/29/1'].diff.flatMap(d => [d[2], d[3]]).filter(v => v != null).map(String);
      vals.forEach(v => { if (!li('sx-diff', 4).includes(v)) out.push(`sx-diff item 5 lacks the diff value ${v}`) });
      const K = ATJN.pk, h = K.hist, f2 = v => v.toFixed(2), f1 = v => v.toFixed(1);
      const passed = K.trials.map((t, i) => t ? i + 1 : 0).filter(Boolean);
      need('sx-pk', [[0, 'task ' + K.task], [0, 'trials ' + passed.slice(0, -1).join(', ') + ' and ' + passed[passed.length - 1] + ' passed'], [0, 'c = ' + K.c],
        [1, K.c + '/4 = ' + f2(K.hat[0])], [2, 'C(4,2) = ' + K.draws[1][0]], [2, K.draws[1][1] + '/' + K.draws[1][0] + ' = ' + f2(K.hat[1])], [3, K.draws[2][1] + '/' + K.draws[2][0] + ' = ' + f2(K.hat[2])],
        [4, 'pass^4 = ' + K.hat[3]], [4, 'pass@4 = ' + K.at[3]], [5, 'all ' + K.nT + ' tasks'], [5, h[4] + ' passed 4 of 4, ' + h[3] + ' three, ' + h[2] + ' two, ' + h[1] + ' one, ' + h[0] + ' none'],
        [5, K.HAT.map(f1).join(', ')], [5, K.AT.map(f1).join(', ')]]);
      if (K.at.slice(1).some(v => v !== 1)) out.push('pass@k of the task is not 1 for k >= 2: ' + K.at);
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
  const an = await p.evaluate(() => document.getElementById('an-play').textContent); if (an !== 'Replay') problems.push('reduced motion: the trial stepper moved');
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
