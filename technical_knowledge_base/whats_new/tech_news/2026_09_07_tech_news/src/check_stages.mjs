// The 2026-11-06 layout and motion checks for the 2026-09-07 tech-news issue, at 1400 px light, 920 px light and 390 px dark:
// - the 3D stage #stg-route (Dev tools: one illustrative Claude Code session with and without routing) plays by itself once scrolled
//   into view, steps to its last step, has one step-list item per step, stops drawing flows off screen and stops for good after a
//   reader control; it is the issue's only animation (the other visuals are static or reader-driven charts);
// - every split is two columns at 1400 px; no errors, NaN, undefined or sideways scroll in any tab;
// - under prefers-reduced-motion nothing moves by itself;
// - the numbers the stage's step list states match the scene's own arithmetic (the columns it draws).
// Writes mid-step and last-step screenshots of the stage.
// usage (from the repo root): node technical_knowledge_base/whats_new/tech_news/2026_09_07_tech_news/src/check_stages.mjs [shots dir]
import puppeteer from '../../../../../html_utils/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const file = 'file://' + path.resolve(here, '../index.html');
const shots = process.argv[2] || path.resolve(here, '../.shots'); fs.mkdirSync(shots, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell' });
const problems = []; let checked = 0;
const wait = ms => new Promise(r => setTimeout(r, ms));
const EXPECT_SPLITS = { 't-read': 1, 't-models': 1, 't-industry': 2, 't-dev': 1 }; // Industry: the GPU split and the money split
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) {} }); await p.goto(file); await wait(300);
  const tag = `${scheme} ${width}`;
  const clk = sel => p.$eval(sel, e => e.click());
  for (const t of await p.$$eval('#tabs button', bs => bs.map(b => b.dataset.t))) {
    await clk(`#tabs button[data-t=${t}]`); await wait(300);
    const splits = await p.$$eval(`#${t} .s3sp`, ss => ss.map(s => { const L = s.querySelector(':scope > .s3L'), R = s.querySelector(':scope > .s3R'); if (!L || !R) return 'missing column';
      const a = L.getBoundingClientRect(), r = R.getBoundingClientRect(); return { side: r.left >= a.right - 1 && r.width > 200 && a.width > 200 } }));
    if (splits.length !== (EXPECT_SPLITS[t] || 0)) problems.push(`${tag} ${t}: ${splits.length} splits, expected ${EXPECT_SPLITS[t] || 0}`);
    splits.forEach((s, i) => { if (s === 'missing column') problems.push(`${tag} ${t}: split ${i + 1} lacks a column`); else if (width >= 1100 && !s.side) problems.push(`${tag} ${t}: split ${i + 1} is not two columns`) });
    for (const id of await p.$$eval(`#${t} .stg`, xs => xs.map(x => x.id))) {
      checked++;
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
      const f1 = await p.$eval('#' + id, e => +e.dataset.frames || 0);
      if (!(f1 > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
      if (!await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent))) problems.push(`${tag}: ${id} is not playing after scrolling into view`);
      const n = await p.$eval(`#${id}-r`, e => +e.max + 1);
      const lis = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return l ? l.children.length : 0 });
      if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but ${lis} list items`);
      await p.evaluate(() => window.scrollTo(0, 0)); await wait(400);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800);
      const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0); if (d1 !== d0) problems.push(`${tag}: ${id} kept drawing off screen (${d1 - d0})`);
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(200);
      await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
      for (let k = 1; k < n; k++) { await clk(`#${id}-f`); await wait(80); if (k === 3) { await wait(2600); await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-mid-${scheme}-${width}.png` }) } }
      await wait(2600);
      const shown = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (shown !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on "${shown}"`);
      const on = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return [...l.children].findIndex(x => x.classList.contains('on')) });
      if (on !== n - 1) problems.push(`${tag}: ${id} list marks item ${on + 1} at the last step`);
      if (await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent))) problems.push(`${tag}: ${id} still playing after a reader control`);
      await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-last-${scheme}-${width}.png` });
      if (width >= 1100) await (await p.$('#sp-route')).screenshot({ path: `${shots}/split-route-${scheme}-${width}.png` });
    }
    const r = await p.evaluate(t => { const el = document.getElementById(t); const txt = el.innerText;
      return { bad: (txt.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth } }, t);
    if (r.bad.length) problems.push(`${tag} ${t}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${t}: sideways scroll`);
  }
  const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) problems.push(`${tag}: error box: ${box}`);
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file);
  await p.$eval('#tabs button[data-t=t-dev]', e => e.click()); await wait(300);
  await p.$eval('#stg-route', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
  const d0 = await p.$eval('#stg-route', e => +e.dataset.draws || 0); await wait(800); const d1 = await p.$eval('#stg-route', e => +e.dataset.draws || 0);
  const f = await p.$eval('#stg-route', e => +e.dataset.frames || 0), pl = await p.$eval('#stg-route-p', e => /Pause/.test(e.textContent));
  if (f > 0 || pl || d1 !== d0) problems.push(`reduced motion: stg-route moved by itself (frames ${f}, redraws ${d1 - d0})`);
  await p.close() }
{ // the numbers in the stage's step list are the scene's own arithmetic
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 }); await p.goto(file); await wait(500);
  const bad = await p.evaluate(() => { const D = window.TN_ROUTE, bad = [], L = [...document.getElementById('sx-route').children].map(li => li.textContent);
    const fx = v => Math.round(v).toLocaleString('en-GB'), has = (i, x) => { if (!L[i].includes(x)) bad.push(`step ${i + 1} lacks "${x}"`) };
    if (L.length !== 7) bad.push(`${L.length} list items, expected 7`);
    has(0, fx(D.tot(D.CA[0])) + '-token');
    for (let i = 1; i <= 5; i++) { has(i, fx(D.tot(D.CA[i]))); has(i, fx(D.tot(D.CB[i]))) }
    const pa = D.proc(D.CA), pb = D.proc(D.CB);
    has(6, fx(pa) + ' input tokens'); has(6, fx(pb)); has(6, Math.round(100 * (1 - pb / pa)) + '% fewer');
    has(6, fx(D.CA[5].o) + ' to ' + fx(D.CB[5].o)); has(6, fx(D.CB[5].w) + ' tokens');
    return bad });
  bad.forEach(x => problems.push('step list: ' + x));
  console.log('step-list number checks: 7 steps against the scene\'s columns');
  await p.close() }
await b.close();
console.log('animations and stages checked', checked, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
