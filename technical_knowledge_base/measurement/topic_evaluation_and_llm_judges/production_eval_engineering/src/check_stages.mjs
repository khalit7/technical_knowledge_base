// The 2026-11-06 rollout checks for Production eval engineering (2026-11-09), adapted from LLM-as-judge's check_stages.mjs: the four 3D stages
// (Fig. 1 error analysis, Fig. 2 one swap through two gates, Fig. 3 gates in CI, Fig. 4 who sees the challenger) play by themselves once scrolled
// into view, step to their last step with one step-list item per step in every mode, stop redrawing off screen and never move under reduced
// motion; no errors, NaN, undefined or sideways scroll; the splits are two columns at 1400 px and one below 1100 px; the numbers written in the
// step lists equal what the page computes from the released data (window.PES, 22_js_vals.js).
// usage (from the repo root): node technical_knowledge_base/measurement/topic_evaluation_and_llm_judges/production_eval_engineering/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = ['stg-ea', 'stg-gate', 'stg-ci', 'stg-exp'];
const MODES = { 'stg-ea': [null, [''], () => 'sx-ea'], 'stg-ci': [null, [''], () => 'sx-ci'], 'stg-exp': [null, [''], () => 'sx-exp'],
  'stg-gate': ['#ga-mode', ['a', 's'], () => 'sx-gate'] };
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
  // the figure or stage of every split stays inside the right column at 1400 px
  if (width === 1400) { const over = await p.$$eval('#t-read .s3R', xs => xs.map(x => { const r = x.getBoundingClientRect(), k = x.firstElementChild && x.firstElementChild.getBoundingClientRect(); return k && (k.right > r.right + 1 || k.left < r.left - 1) ? x.innerHTML.slice(0, 40) : '' }).filter(Boolean));
    over.forEach(o => problems.push(`${tag}: right-column content wider than its column: ${o}`)) }
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
      if (seg) { await p.$eval(`${seg} button[data-m="${md}"]`, e => e.click()); await wait(200);
        const vis = await p.$$eval(`#${lof(md)} .pe-m${md}`, xs => xs.every(x => !x.hidden)), hid = await p.$$eval(`#${lof(md)} .pe-m${md === 'a' ? 's' : 'a'}`, xs => xs.every(x => x.hidden));
        if (!vis || !hid) problems.push(`${tag}: ${id} mode ${md} shows the other mode's step text`) }
      await p.$eval(`#${id}-b`, e => e.click());
      await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
      const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.hidden ? -1 : e.children.length);
      if (lis !== n) problems.push(`${tag}: ${id} mode ${md} has ${n} steps but list ${lid} shows ${lis}`);
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' }));
      const shoot = width === 1400 || width === 390;
      for (let k = 0; k < n; k++) {
        if (k) await p.$eval(`#${id}-f`, e => e.click());
        if (shoot) {
          await wait(650); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${md}-s${k + 1}-midtween-${scheme}-${width}.png` });
          await wait(1100); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${md}-s${k + 1}-${scheme}-${width}.png` })
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
  if (width === 1400) { // the step lists' numbers are what the page computes
    const r = await p.evaluate(() => { const out = [], li = (lid, k) => document.getElementById(lid).children[k].textContent.replace(/\s+/g, ' ');
      const need = (lid, k, x) => { if (!li(lid, k).includes(String(x))) out.push(`${lid} item ${k + 1} lacks "${x}"`) };
      const S = PES, C = PEC, E = S.ea, G = S.G, sl = S.sl;
      need('sx-ea', 0, E.traces.length); need('sx-ea', 1, E.fails.length + ' of the ' + E.traces.length); need('sx-ea', 2, 'the ' + E.fails.length + ' fall into ' + E.modes.length + ' categories');
      need('sx-ea', 3, E.modes.map(m => (m.c === 'stem' ? 'STEM' : m.c) + ' ' + m.n).join(', ').replace(/, (math \d+)$/, ', $1'));
      need('sx-ea', 4, 'at trace ' + E.satN); need('sx-ea', 4, 'median of ' + E.med); need('sx-ea', 4, 'by trace ' + E.p90 + ' in 90%'); need('sx-ea', 4, 'within 100 traces in ' + E.w100);
      E.worst.forEach(w => need('sx-ea', 6, 'question ' + w.q + ', ' + w.a + ' to ' + w.b));
      for (const m of ['a']) { const l = 'sx-gate';
        need(l, 1, 'mean ' + S.champMean); need(l, 2, 'mean is ' + S.challMean + ' over ' + G.agg.n); need(l, 2, G.agg.n + ' pairs');
        need(l, 3, G.agg.worse + ' turns got worse, ' + G.agg.same + ' stayed level, ' + G.agg.better + ' got better');
        need(l, 5, S.price.pr + ' times lower for prompts'); need(l, 5, S.price.cr + ' times lower for completions'); need(l, 5, S.price.shorter + '% shorter') }
      need('sx-gate', 4, C.f(G.agg.mean) + ' points (95% interval ' + C.n(G.agg.lo) + ' to ' + C.f(G.agg.hi) + ')'); if (G.aggV !== 'pass') out.push('aggregate gate no longer passes');
      need('sx-gate', 6, S.calls + ' judge calls, $' + (S.callCost * S.calls).toFixed(2));
      need('sx-gate', 4, 'Writing: ' + C.f(sl('writing').mean) + ' points, interval ' + C.n(sl('writing').lo) + ' to ' + C.n(sl('writing').hi));
      need('sx-gate', 4, 'Extraction: ' + C.f(sl('extraction').mean) + ', but its interval reaches ' + C.f(sl('extraction').hi)); need('sx-gate', 4, 'Math rises by ' + C.f(sl('math').mean));
      if (sl('writing').v !== 'fail' || sl('extraction').v !== 'escalate' || G.slices.filter(r => r.v !== 'pass').length !== 2) out.push('slice verdicts changed');
      E.worst.forEach(w => need('sx-gate', 6, 'question ' + w.q + ', ' + w.a + ' to ' + w.b));
      need('sx-ci', 0, S.calls + ' GPT-4 calls, $' + (S.callCost * S.calls).toFixed(2)); need('sx-ci', 2, S.calls + ' judge calls'); need('sx-ci', 2, 'fails with ' + C.f(sl('writing').mean));
      need('sx-ci', 3, 'extraction (' + C.f(sl('extraction').mean) + ', interval reaching ' + C.f(sl('extraction').hi) + ')'); need('sx-ci', 4, '1 of this swap\'s ' + S.calls);
      if (S.B.filter(x => x === null).length !== 1) out.push('the challenger no longer has exactly one missing grade');
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  await audit('end');
  for (const t of ['t-gate', 't-cases', 't-more']) { await p.click(`#tabs button[data-t="${t}"]`); await wait(300); await audit(t, t) }
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
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
