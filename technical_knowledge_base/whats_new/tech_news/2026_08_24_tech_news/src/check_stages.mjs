// The 2026-11-06 layout and motion checks for the 2026-08-24 tech-news issue, at 1400 px light, 920 px light and 390 px dark:
// - the 3D stage #stg-diff (Research: one 256-token block decoded three ways) plays by itself once scrolled into view, steps to its last
//   step, has one step-list item per step, stops drawing flows off screen and stops for good after a reader control;
// - the 2D harness animation #v-harness (Top stories, RD.anim) plays once in view (the Play button reads Pause), has one list item per
//   step in each of its three modes, shows exactly one list per mode, replays after a mode switch and reaches its last step;
// - every split is two columns at 1400 px; no errors, NaN, undefined or sideways scroll in any tab;
// - under prefers-reduced-motion nothing moves by itself;
// - the numbers the stage's step list states match the scene's own arithmetic, at the defaults and after moving both sliders.
// Writes mid-step screenshots of both animations.
// usage (from the repo root): node technical_knowledge_base/whats_new/tech_news/2026_08_24_tech_news/src/check_stages.mjs [shots dir]
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
    splits.forEach((s, i) => { if (s === 'missing column') problems.push(`${tag} ${t}: split ${i + 1} lacks a column`); else if (width >= 1100 && !s.side) problems.push(`${tag} ${t}: split ${i + 1} is not two columns`) });
    // the 3D stage
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
      for (let k = 1; k < n; k++) { await clk(`#${id}-f`); await wait(80); if (k === Math.floor(n / 2)) { await wait(3200); await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-mid-${scheme}-${width}.png` }) } }
      await wait(3200);
      const shown = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (shown !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on "${shown}"`);
      const on = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return [...l.children].findIndex(x => x.classList.contains('on')) });
      if (on !== n - 1) problems.push(`${tag}: ${id} list marks item ${on + 1} at the last step`);
      if (await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent))) problems.push(`${tag}: ${id} still playing after a reader control`);
      await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-last-${scheme}-${width}.png` });
    }
    // the 2D harness animation (RD.anim) and its three modes
    if (await p.$(`#${t} #v-harness`)) {
      checked++;
      await p.$eval('#v-harness', e => e.scrollIntoView({ block: 'center' })); await wait(1800);
      if (!await p.$eval('#hsCtl-p', e => /Pause/.test(e.textContent))) problems.push(`${tag}: the harness animation is not playing after scrolling into view`);
      for (const m of await p.$$eval('#hsM button', bs => bs.map(b => b.dataset.m))) {
        await clk(`#hsM button[data-m=${m}]`); await wait(1500);
        if (!await p.$eval('#hsCtl-p', e => /Pause/.test(e.textContent))) problems.push(`${tag}: the harness animation did not replay after switching to ${m}`);
        const n = await p.$eval('#hsCtl-s', e => +e.max + 1);
        const vis = await p.$$eval('ol[id^="sx-hs-"]', os => os.filter(o => !o.hidden).map(o => [o.id, o.children.length]));
        if (vis.length !== 1 || vis[0][0] !== 'sx-hs-' + m || vis[0][1] !== n) problems.push(`${tag}: harness ${m}: visible lists ${JSON.stringify(vis)} for ${n} steps`);
        const f0 = await p.$eval('#v-harness', e => +e.dataset.frames || 0);
        for (let k = 1; k < n; k++) { await clk('#hsCtl-f'); await wait(60); if (k === Math.floor(n / 2)) { await wait(2600); await (await p.$('#sp-harness-run')).screenshot({ path: `${shots}/anim-harness-${m}-mid-${scheme}-${width}.png` }) } }
        await wait(300);
        const f1 = await p.$eval('#v-harness', e => +e.dataset.frames || 0); if (!(f1 > f0)) problems.push(`${tag}: harness ${m}: stepping forward drew no frames`);
        const on = await p.$eval('#sx-hs-' + m, l => [...l.children].findIndex(x => x.classList.contains('on')));
        if (on !== n - 1) problems.push(`${tag}: harness ${m}: list marks item ${on + 1} at the last step`);
        if (await p.$eval('#hsCtl-p', e => /Pause/.test(e.textContent))) problems.push(`${tag}: harness ${m} still playing after a reader control`);
      }
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
  await p.$eval('#tabs button[data-t=t-research]', e => e.click()); await wait(300);
  await p.$eval('#stg-diff', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
  const d0 = await p.$eval('#stg-diff', e => +e.dataset.draws || 0); await wait(800); const d1 = await p.$eval('#stg-diff', e => +e.dataset.draws || 0);
  const f = await p.$eval('#stg-diff', e => +e.dataset.frames || 0), pl = await p.$eval('#stg-diff-p', e => /Pause/.test(e.textContent));
  if (f > 0 || pl || d1 !== d0) problems.push(`reduced motion: stg-diff moved by itself (frames ${f}, redraws ${d1 - d0})`);
  await p.$eval('#tabs button[data-t=t-top]', e => e.click()); await wait(300);
  await p.$eval('#v-harness', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
  const hf = await p.$eval('#v-harness', e => +e.dataset.frames || 0), hp = await p.$eval('#hsCtl-p', e => /Pause/.test(e.textContent));
  if (hf > 0 || hp) problems.push(`reduced motion: the harness animation moved by itself (frames ${hf})`);
  await p.close() }
{ // the numbers in the stage's step list are the scene's own arithmetic, at the defaults and after moving the sliders; a slider stops autoplay
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 }); await p.goto(file); await wait(500);
  const run = () => p.evaluate(() => { const D = window.TN_DIFF, s = D.st, bad = [], L = [...document.getElementById('sx-diff').children].map(li => li.textContent);
    const has = (i, x) => { if (!L[i].includes(x)) bad.push(`step ${i + 1} lacks "${x}"`) };
    const P = s.P, m = D.pm(), fx = v => v.toLocaleString('en-GB', { maximumFractionDigits: 0 });
    has(1, 'Passes 1 to ' + P); has(1, 'speculative decoding about ' + fx(Math.min(256, Math.floor(P * s.tpf))));
    if (m > P) has(2, 'Passes ' + (P + 1) + ' to ' + m); else has(2, 'already finished');
    has(3, 'Passes ' + (Math.max(P, m) + 1) + ' to 256'); has(3, '256 against ' + m + ' against ' + P);
    const dD = P * D.msD(), mD = 1000 * 256 / D.TPS_M;
    has(4, D.msD().toFixed(1) + ' ms'); has(4, D.msM().toFixed(1) + ' ms'); has(4, fx(dD) + ' ms against ' + fx(mD) + ' ms'); has(4, (mD / dD).toFixed(1) + ' times faster');
    // the scene: every diffusion cell is final by pass P and the last finishes exactly at P
    const d = D.diff(); if (Math.max(...d.f) > P) bad.push('a diffusion cell finishes after pass ' + P); if (d.f.some((v, i) => v < d.s[i])) bad.push('a cell is final before it settles');
    return bad });
  const b0 = await run(); b0.forEach(x => problems.push('defaults: ' + x));
  // the report's own figures at the defaults
  const t5 = await p.$eval('#sx-diff', l => l.children[4].textContent);
  for (const x of ['14.4 ms', '14.9 ms', '173 ms against 845 ms', '4.9 times faster']) if (!t5.includes(x)) problems.push('defaults: step 5 lacks ' + x);
  await p.$eval('#tabs button[data-t=t-research]', e => e.click()); await wait(300);
  await p.$eval('#stg-diff', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
  await p.evaluate(() => { const set = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input')) }; set('dgP', 48); set('dgT', 6) }); await wait(300);
  if (await p.$eval('#stg-diff-p', e => /Pause/.test(e.textContent))) problems.push('the stage kept playing after a slider moved');
  const b1 = await run(); b1.forEach(x => problems.push('P 48, 6 a pass: ' + x));
  await p.evaluate(() => { const set = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input')) }; set('dgP', 20); set('dgT', 3) }); await wait(100);
  const b2 = await run(); b2.forEach(x => problems.push('P 20, 3 a pass: ' + x));
  console.log('step-list number checks: 3 slider settings');
  await p.close() }
await b.close();
console.log('animations and stages checked', checked, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
