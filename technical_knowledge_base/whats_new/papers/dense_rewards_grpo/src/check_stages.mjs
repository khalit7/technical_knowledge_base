// The 2026-11-06 layout and motion checks for the Fair Cast page (after DSec's), at 1400 px light, 920 px light and 390 px dark:
// the two 3D stages (#stg-loop, Fig. 1: the RL loop with round-to-nearest and Fair Cast modes; #stg-dz, Fig. 2: one weight under the three
// export rules, driven by the page's rounding engine) each play by themselves once scrolled into view, step to their last step, and have exactly
// one step-list item per step (each mode has its own list); flows stop drawing off screen; at 1400 px every split shows two columns; no errors,
// NaN, undefined or sideways scroll; under prefers-reduced-motion nothing moves by itself; the simulator widget on Round a weight draws no frames
// before Play; and the numbers the Fig. 2 step list states match the engine run the stage draws.
// Writes a mid-step screenshot of each stage in each mode.
// usage (from the repo root): node technical_knowledge_base/whats_new/papers/fair_cast/src/check_stages.mjs [shots dir]
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
const STAGE_MODES = { 'stg-loop': 'fcLoopM' };
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await wait(300);
  const tag = `${scheme} ${width}`;
  const clk = sel => p.$eval(sel, e => e.click());
  for (const t of await p.$$eval('#tabs button', bs => bs.map(b => b.dataset.t))) {
    await clk(`#tabs button[data-t=${t}]`); await wait(300);
    const splits = await p.$$eval(`#${t} .s3sp`, ss => ss.map(s => { const L = s.querySelector(':scope > .s3L'), R = s.querySelector(':scope > .s3R'); if (!L || !R) return 'missing column';
      const a = L.getBoundingClientRect(), r = R.getBoundingClientRect(); return { side: r.left >= a.right - 1 && r.width > 200 && a.width > 200 } }));
    splits.forEach((s, i) => { if (s === 'missing column') problems.push(`${tag} ${t}: split ${i + 1} lacks a column`); else if (width >= 1100 && !s.side) problems.push(`${tag} ${t}: split ${i + 1} is not two columns`) });
    for (const id of await p.$$eval(`#${t} .stg`, xs => xs.map(x => x.id))) {
      checked++;
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2200);
      const f1 = await p.$eval('#' + id, e => +e.dataset.frames || 0);
      if (!(f1 > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
      const playing = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent)); if (!playing) problems.push(`${tag}: ${id} is not playing after scrolling into view`);
      const n = await p.$eval(`#${id}-r`, e => +e.max + 1);
      const lis = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return l ? l.children.length : 0 });
      if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but ${lis} list items`);
      // flows stop drawing off screen
      await p.evaluate(() => window.scrollTo(0, 0)); await wait(400);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800);
      const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0); if (d1 !== d0) problems.push(`${tag}: ${id} kept drawing off screen (${d1 - d0})`);
      // a reader control stops autoplay for good; step to the last step through the forward button, with a middle screenshot
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(200);
      await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
      for (let k = 1; k < n; k++) { await clk(`#${id}-f`); await wait(80); if (k === Math.floor(n / 2)) { await wait(3600); await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-mid-${scheme}-${width}.png` }) } }
      await wait(3600);
      const shown = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (shown !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on "${shown}"`);
      const on = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return [...l.children].findIndex(x => x.classList.contains('on')) });
      if (on !== n - 1) problems.push(`${tag}: ${id} list marks item ${on + 1} at the last step`);
      const still = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent)); if (still) problems.push(`${tag}: ${id} still playing after a reader control`);
      if (width === 1400) await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-last-${scheme}-${width}.png` });
      if (STAGE_MODES[id]) for (const m of await p.$$eval(`#${STAGE_MODES[id]} button`, bs => bs.map(b => b.dataset.m))) {
        const f0 = await p.$eval('#' + id, e => +e.dataset.frames || 0);
        await clk(`#${STAGE_MODES[id]} button[data-m=${m}]`); await wait(2600);
        const f1m = await p.$eval('#' + id, e => +e.dataset.frames || 0), plm = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent));
        if (!(f1m > f0) || !plm) problems.push(`${tag}: ${id} did not replay after switching to ${m}`);
        const nm = await p.$eval(`#${id}-r`, e => +e.max + 1), lm = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelectorAll('ol.sx:not([hidden])'); return [l.length, l[0] ? l[0].children.length : 0, l[0] ? l[0].id : ''] });
        if (lm[0] !== 1 || lm[1] !== nm) problems.push(`${tag}: ${id} ${m}: ${lm[0]} visible lists, ${lm[1]} items for ${nm} steps (${lm[2]})`);
        if (lm[2] !== 'sx-loop-' + m) problems.push(`${tag}: ${id} ${m}: the visible list is ${lm[2]}`);
        for (let k = 1; k < nm; k++) { await clk(`#${id}-f`); await wait(60); if (k === Math.floor(nm / 2)) { await wait(2100); await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-${m}-mid-${scheme}-${width}.png` }) } }
        await wait(2100); const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${nm} of ${nm}`) problems.push(`${tag}: ${id} ${m} ended on "${sh}"`);
        if (width === 1400) await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-${m}-last-${scheme}-${width}.png` });
      }
    }
    // the simulator on Round a weight is a widget: nothing moves before Play
    if (t === 't-sim') { await p.$eval('#fcSim', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      if (+(await p.$eval('#fcSim', e => e.dataset.frames || 0))) problems.push(`${tag}: the simulator drew frames before Play`) }
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
  for (const t of ['t-read', 't-sim']) { await p.$eval(`#tabs button[data-t=${t}]`, e => e.click()); await wait(300);
    for (const id of await p.$$eval(`#${t} .stg`, xs => xs.map(x => x.id))) {
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800); const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0);
      const f = await p.$eval('#' + id, e => +e.dataset.frames || 0), pl = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent));
      if (f > 0 || pl || d1 !== d0) problems.push(`reduced motion: ${id} moved by itself (frames ${f}, redraws ${d1 - d0})`) } }
  await p.close() }
{ // the numbers the Fig. 2 step list states are the ones the stage draws (the engine at the simulator's defaults)
  const p = await b.newPage(); await p.goto(file); await wait(800);
  const r = await p.evaluate(() => {
    const bad = []; let n = 0; const D = window.FC_DZ, R = D.r, U = v => (v - R.w0) / R.u, L = [...document.getElementById('sx-dz').children].map(li => li.textContent);
    const has = (i, s) => { n++; if (!L[i].includes(s)) bad.push('step ' + (i + 1) + ': expected "' + s + '"') };
    const firstAt = a => { for (let t = 1; t <= R.T; t++) if (a[t] !== a[t - 1]) return t; return -1 };
    const best = (a, k) => { let run = 0, b = 0, sg = 0; for (let t = 1; t <= k; t++) { const d = Math.sign(R.th[t] - a[t]); if (d && d === sg) run++; else { run = d ? 1 : 0; sg = d } b = Math.max(b, run) } return b };
    if (L.length !== D.B.length) bad.push('list has ' + L.length + ' items for ' + D.B.length + ' stretches');
    has(0, 'u = ' + (R.u / 1e-4).toFixed(2) + ' × 10');
    has(1, 'creeps ' + U(R.th[40]).toFixed(2) + ' u'); has(1, 'changed ' + D.changes(R.qs, 40) + ' times, first at step ' + firstAt(R.qs)); has(1, 'also changed ' + D.changes(R.qe, 40) + ' times, first at step ' + firstAt(R.qe));
    if (D.changes(R.qn, 40) !== 0) bad.push('round-to-nearest moved in the first stretch');
    has(2, 'reaches ' + U(R.th[100]).toFixed(2) + ' u'); has(2, 'changed ' + D.changes(R.qs, 100) + ' times'); has(2, 'is at ' + U(R.qm[100]).toFixed(2) + ' u');
    n++; if (firstAt(R.qn) !== 101 || D.B[3] !== 101) bad.push('round-to-nearest first moves at step ' + firstAt(R.qn) + ', not 101');
    let neg = 0; for (let t = 101; t <= R.T && R.th[t] - R.qn[t] < 0; t++) neg++; has(3, 'next ' + neg + ' steps');
    has(4, 'ends at ' + U(R.th[300]).toFixed(2) + ' u'); has(4, 'changed once in 300 steps (' + (100 * D.changes(R.qn, 300) / 300).toFixed(2) + '% of steps');
    has(4, 'stochastic rounding ' + D.changes(R.qs, 300) + ' times, error feedback ' + D.changes(R.qe, 300));
    has(4, 'up to ' + best(R.qn, 300) + ' steps'); has(4, 'at most ' + best(R.qs, 300) + ' and error feedback\'s for ' + best(R.qe, 300));
    has(4, 'ends at ' + U(R.qm[300]).toFixed(2) + ' u, the master at ' + U(R.th[300]).toFixed(2));
    if (D.changes(R.qn, 300) !== 1) bad.push('round-to-nearest changed ' + D.changes(R.qn, 300) + ' times, the list says once');
    // the reproduction box on Round a weight quotes the same run
    n++; if (document.getElementById('fcRepPct').textContent !== (100 * D.changes(R.qn, 300) / 300).toFixed(2) + '%') bad.push('Round a weight quotes ' + document.getElementById('fcRepPct').textContent);
    // Fig. 1 quotes the paper's measured values, which the prose quotes too
    const txt = id => document.getElementById(id).textContent, prose = txt('s-prob') + txt('s-lag') + txt('fcFig4') + txt('s-abl');
    for (const s of ['0.4 to 0.5%', '0.10 to 0.16', '0.45', '2 to 15%', '0.01']) { n++; if (!prose.includes(s)) bad.push('Fig. 1 quotes ' + s + ', the prose does not') }
    return { bad, n } });
  r.bad.forEach(x => problems.push('step list number: ' + x)); console.log('step-list numbers checked', r.n);
  await p.close() }
await b.close();
console.log('stages checked', checked, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
