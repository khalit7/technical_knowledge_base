// The 2026-11-06 rollout checks for Human evaluation and annotation (2026-11-09): both 3D stages (Fig. 1 agreement against chance, Fig. 4
// finding the wrong labels and rescoring) play by themselves once scrolled into view, step to their last step with one step-list item per step
// in every mode, stop redrawing off screen and never move under reduced motion; no errors, NaN, undefined or sideways scroll; the splits are two
// columns at 1400 px and one below 1100 px. The numbers written in the step lists are compared with what the scenes compute (window.ESS).
// Adapted from the Eval statistics page's check_stages.mjs.
// usage (from the repo root): node technical_knowledge_base/measurement/topic_evaluation_and_llm_judges/human_evaluation_and_annotation/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = [['stg-agr', 'sx-agr-0'], ['stg-find', 'sx-find']];
const MODES = { 'stg-agr': ['#agr-mode', ['0', '1', '2'], m => 'sx-agr-' + m], 'stg-find': ['#fd-mode', ['virology', 'college_chemistry', 'high_school_biology'], () => 'sx-find'] };
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
  for (const [id] of STAGES) {
    const [seg, modes, lof] = MODES[id];
    for (const md of modes) {
      const lid = lof(md);
      await p.$eval(`${seg} button[data-m="${md}"]`, e => e.click()); await wait(200);
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
        } else if (width === 1400) { await wait(1800); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-${md}-s${k + 1}-${scheme}-${width}.png` }) }
      }
      await wait(1700);
      const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} mode ${md} ended on ${sh}`);
      await audit(`${id} ${md} last step`);
      for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
      const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
      if (cur !== n - 1) problems.push(`${tag}: ${id} mode ${md} list does not mark the last step`);
      if (width === 1400) { // the step list's numbers are what the scene computes for this mode
        const r = await p.evaluate((id, md, lid) => { const out = [], li = k => document.getElementById(lid).children[k].textContent.replace(/\s+/g, ' ');
          const need = (k, x) => { if (!li(k).includes(String(x))) out.push(`${lid} item ${k + 1} lacks "${x}"`) };
          const loc = x => x.toLocaleString('en-US');
          if (id === 'stg-agr') { const E = ESS.agr[+md];
            need(0, loc(E.units) + (md === '2' ? ' responses' : ' items')); need(0, loc(E.votes)); need(1, loc(E.pairs)); need(1, E.po);
            E.shares.forEach(x => { if (md !== '2') need(2, x) }); if (md === '2') need(2, E.shares[4]); need(2, E.pe); need(3, E.k); need(4, E.Do); need(4, E.De); need(4, E.a);
            if (md === '0') { need(5, E.ao); need(5, E.ac1) } if (md === '2') { need(5, E.ai); need(5, E.ac1) } if (md === '1') { need(5, ESS.agr[0].a); need(5, E.a); need(5, ESS.agr[0].po); need(5, E.po) } }
          else { const F = ESS.find; need(3, F.qe + ' of 20'); need(3, ' ' + F.qw + ' of them'); need(3, F.rest + ' more'); need(4, F.fix + ' questions'); need(4, F.ok + ' sound'); need(4, F.w + ' wrong keys'); need(5, '±' + F.hw) }
          return out }, id, md, lid);
        r.forEach(x => problems.push(`${tag}: ${x}`));
      }
    }
    await p.$eval(`${seg} button[data-m="${modes[0]}"]`, e => e.click()); await wait(200);
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
