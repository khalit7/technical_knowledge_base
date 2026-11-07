// The 2026-11-06 rollout checks (Topic: programming-languages): the hero stage (Fig. 1), the Reading tab's four step animations and the
// Toolchain atlas walkthrough play by themselves once scrolled into view, step to their last step, have one step-list item per step
// (in every mode), never move under reduced motion; the stage's flows stop off screen; the Rosetta memory walk is a widget and never
// plays by itself; splits are two columns at 1400 px; no errors, NaN, undefined or sideways scroll.
// usage (from the repo root): node technical_knowledge_base/engineering_foundations/topic_programming_languages/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = ['stg-hero'];
// [card prefix, step list id, modes]
const ANIMS = [['rd-run', 'sx-run', ['py', 'cpp', 'rs', 'js', 'ts']], ['rd-mem', 'sx-mem', ['py', 'cpp', 'rs']], ['rd-own', 'sx-own', ['cpp', 'rs', 'py']], ['rd-conc', 'sx-conc', ['py', 'pyt', 'js', 'jsw', 'cpp', 'rs']]];
const wait = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const problems = [];
const tab = async (p, t) => { await p.click(`#tabs button[data-t="${t}"]`); await wait(500) };
const bad = /.{0,30}\b(NaN|Infinity)\b.{0,30}|.{0,30}\bundefined\b(?! behaviou?r| \+ 1|\)).{0,30}/g;
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(400);
  const tag = `${scheme} ${width}`;
  const audit = async (where, t) => {
    const r = await p.evaluate((t, src) => { const c = document.getElementById(t).cloneNode(true); c.querySelectorAll('pre,code').forEach(x => x.remove());
      return { bad: (c.innerText || c.textContent).match(new RegExp(src, 'g')) || [], side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } }, t, bad.source);
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  const splits = async t => { const c = await p.$$eval(`#${t} .s3sp`, xs => xs.filter(x => x.offsetParent !== null).map(x => getComputedStyle(x).display)); if (!c.length || c.some(d => d !== 'grid')) problems.push(`${tag}: ${t} splits not two columns (${c})`) };
  if (width === 1400) await splits('t-read');
  // the hero stage: autoplay on view
  for (const id of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
  }
  // flows stop off screen
  await p.$eval('#rd-s11', e => e.scrollIntoView({ block: 'start' })); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  // step the stage to its last step; list length; screenshot mid-way
  for (const id of STAGES) {
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1);
    const lis = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx'); return l ? l.children.length : 0 });
    if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but ${lis} items`);
    for (let k = 1; k < n; k++) {
      await p.$eval(`#${id}-f`, e => e.click()); await wait(60);
      if (k === Math.floor(n / 2)) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2600); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-${scheme}-${width}.png` }) }
    }
    await wait(2000);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
    const on = await p.$eval('#' + id, h => [...h.closest('.s3sp').querySelector('ol.sx').children].findIndex(li => li.classList.contains('on'))); if (on !== n - 1) problems.push(`${tag}: ${id} list marks ${on}`);
  }
  // the Reading tab's four step animations, every mode
  for (const [a, sx, modes] of ANIMS) {
    await p.$eval(`#${a}-card`, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    if (!/Pause/.test(await p.$eval(`#${a}-ctl-p`, e => e.textContent))) problems.push(`${tag}: ${a} did not play when scrolled into view`);
    for (const m of modes) {
      await p.$eval(`#${a}-seg button[data-m="${m}"]`, e => e.click()); await wait(100);
      await p.$eval(`#${a}-ctl-b`, e => e.click());
      const n = await p.$eval(`#${a}-ctl-s`, e => +e.max + 1), lis = await p.$eval(`#${sx}`, e => e.children.length);
      if (lis !== n) problems.push(`${tag}: ${a} ${m} has ${n} steps but ${lis} items`);
      for (let k = 1; k < n; k++) { await p.$eval(`#${a}-ctl-f`, e => e.click()); await wait(40);
        if (k === Math.floor(n / 2) && m === modes[0]) { await p.$eval(`#${a}-card`, e => e.scrollIntoView({ block: 'center' })); await wait(200); await (await p.$(`#${a}-card`)).screenshot({ path: `${shots}/x-${a}-${scheme}-${width}.png` }) } }
      const on = await p.$eval(`#${sx}`, e => [...e.children].findIndex(li => li.classList.contains('on'))); if (on !== n - 1) problems.push(`${tag}: ${a} ${m} list marks ${on}`);
    }
  }
  await audit('reading', 't-read');
  // Rosetta: the memory walk is a widget and never plays by itself
  await tab(p, 't-rosetta'); if (width === 1400) await splits('t-rosetta');
  await p.$eval('#ro-memcard', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
  if (/Pause/.test(await p.$eval('#ro-memctl-p', e => e.textContent))) problems.push(`${tag}: ro-mem played by itself`);
  await audit('rosetta', 't-rosetta');
  await tab(p, 't-bench'); if (width === 1400) await splits('t-bench'); await audit('bench', 't-bench');
  // Toolchain atlas: the walkthrough plays once in view, one list item per command, in every walkthrough
  await tab(p, 't-tools'); await p.$eval('#ta-views button[data-v="walk"]', e => e.click()); await wait(300);
  if (width === 1400) await splits('t-tools');
  await p.$eval('#ta-wcard', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
  if (!/Pause/.test(await p.$eval('#ta-wp', e => e.textContent))) problems.push(`${tag}: walkthrough did not play when scrolled into view`);
  const walks = await p.$$eval('#ta-wsel button', xs => xs.length);
  for (let w = 0; w < walks; w++) {
    await p.evaluate(w => document.querySelectorAll('#ta-wsel button')[w].click(), w); await wait(100);
    await p.$eval('#ta-wb', e => e.click());
    const n = await p.$eval('#ta-ws', e => +e.max + 1), lis = await p.$eval('#ta-wsx', e => e.children.length);
    if (lis !== n) problems.push(`${tag}: walkthrough ${w} has ${n} steps but ${lis} items`);
    for (let k = 1; k < n; k++) { await p.$eval('#ta-wf', e => e.click()); await wait(30) }
    const on = await p.$eval('#ta-wsx', e => [...e.children].findIndex(li => li.classList.contains('on'))); if (on !== n - 1) problems.push(`${tag}: walkthrough ${w} list marks ${on}`);
  }
  if (width !== 920) await (await p.$('#ta-v-walk')).screenshot({ path: `${shots}/x-ta-walk-${scheme}-${width}.png` });
  await audit('tools', 't-tools');
  await tab(p, 't-design'); await audit('design', 't-design');
  await tab(p, 't-more'); await audit('more', 't-more');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file);
  await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(300);
  for (const id of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, +e.dataset.draws || 0, e.querySelector('.stg-st').textContent]);
    await wait(1000); const d = await p.$eval('#' + id, e => +e.dataset.draws || 0);
    if (r[0] > 0 || !r[2].startsWith('step 1 of') || d !== r[1]) problems.push(`reduced motion: ${id} moved by itself (${r}, draws ${d})`) }
  for (const [a] of ANIMS) { await p.$eval(`#${a}-card`, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    if (/Pause/.test(await p.$eval(`#${a}-ctl-p`, e => e.textContent)) || (await p.$eval(`#${a}-ctl-s`, e => +e.value)) !== 0) problems.push(`reduced motion: ${a} moved by itself`) }
  await tab(p, 't-tools'); await p.$eval('#ta-views button[data-v="walk"]', e => e.click()); await wait(300);
  await p.$eval('#ta-wcard', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
  if (/Pause/.test(await p.$eval('#ta-wp', e => e.textContent)) || (await p.$eval('#ta-ws', e => +e.value)) !== 0) problems.push('reduced motion: walkthrough moved by itself');
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
