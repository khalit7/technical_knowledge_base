// The 2026-11-06 layout and motion checks for the Llama 3 page (after InstructGPT's), at 1400 px light, 920 px light and 390 px dark:
// the two 3D stages (#stg-iso, Fig. 1: the scaling law that sized the 405B; #stg-post, Fig. 2: one prompt through a round of
// post-training, in both modes) each play by themselves once scrolled into view, step to their last step and have exactly one
// step-list item per step; flows stop drawing off screen; the pipeline-schedule animation (makeAnim) plays once in view with one list
// item per step, and the 54-day replay (a widget) never moves by itself; at 1400 px every split shows two columns; no errors, NaN,
// undefined or sideways scroll; under prefers-reduced-motion nothing moves by itself; and every number the step lists state matches
// the data the stages draw (window.PAPER: the Figure 2 points, recompute.py's parabolas, power law and forecast).
// Writes a mid-step and a last-step screenshot of each stage.
// usage (from the repo root): node technical_knowledge_base/whats_new/papers/llama_3_herd/src/check_stages.mjs [shots dir]
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
const STAGE_MODES = { 'stg-post': 'ptM' };
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
      for (let k = 1; k < n; k++) { await clk(`#${id}-f`); await wait(80); if (k === Math.floor(n / 2)) { await wait(2400); await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-mid-${scheme}-${width}.png` }) } }
      await wait(2400);
      const shown = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (shown !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on "${shown}"`);
      const on = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return [...l.children].findIndex(x => x.classList.contains('on')) });
      if (on !== n - 1) problems.push(`${tag}: ${id} list marks item ${on + 1} at the last step`);
      const still = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent)); if (still) problems.push(`${tag}: ${id} still playing after a reader control`);
      if (width === 1400 || width === 390) await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-last-${scheme}-${width}.png` });
      if (STAGE_MODES[id]) for (const m of await p.$$eval(`#${STAGE_MODES[id]} button`, bs => bs.map(b => b.dataset.m))) {
        const f0 = await p.$eval('#' + id, e => +e.dataset.frames || 0);
        await clk(`#${STAGE_MODES[id]} button[data-m=${m}]`); await wait(2600);
        const f1m = await p.$eval('#' + id, e => +e.dataset.frames || 0), plm = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent));
        if (!(f1m > f0) || !plm) problems.push(`${tag}: ${id} did not replay after switching to ${m}`);
        const nm = await p.$eval(`#${id}-r`, e => +e.max + 1), lm = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelectorAll('ol.sx:not([hidden])'); return [l.length, l[0] ? l[0].children.length : 0, l[0] ? l[0].id : ''] });
        if (lm[0] !== 1 || lm[1] !== nm) problems.push(`${tag}: ${id} ${m}: ${lm[0]} visible lists, ${lm[1]} items for ${nm} steps (${lm[2]})`);
        for (let k = 1; k < nm; k++) { await clk(`#${id}-f`); await wait(60); if (k === Math.floor(nm / 2)) { await wait(2100); await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-${m}-mid-${scheme}-${width}.png` }) } }
        await wait(2100); const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${nm} of ${nm}`) problems.push(`${tag}: ${id} ${m} ended on "${sh}"`);
      }
    }
    // the pipeline schedule: a 2D step animation (makeAnim) that plays once in view, one list item per step, stops for good on a control;
    // the 54-day replay is a widget: it opens on its last step and never plays by itself
    if (t === 't-run') {
      await p.$eval('#pp', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      if (!/Pause/.test(await p.$eval('#ppPlay', e => e.textContent)) || !(await p.$eval('#pp', e => e.dataset.playing))) problems.push(`${tag}: the pipeline animation did not play when scrolled into view`);
      const n = await p.$eval('#ppScrub', e => +e.max / 100), lis = await p.$eval('#sx-pp', e => e.children.length); if (n !== lis) problems.push(`${tag}: the pipeline animation has ${n} steps, ${lis} list items`);
      for (let k = 1; k < n; k++) await clk('#ppFwd');
      const last = await p.$eval('#sx-pp', l => [...l.children].findIndex(x => x.classList.contains('on'))); if (last !== n - 1) problems.push(`${tag}: the pipeline list marks item ${last + 1} at the end`);
      if (/Pause/.test(await p.$eval('#ppPlay', e => e.textContent))) problems.push(`${tag}: the pipeline animation still playing after a control`);
      await p.$eval('#rl', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      if ((await p.$eval('#rl', e => +e.dataset.frames || 0)) || /Pause/.test(await p.$eval('#rlPlay', e => e.textContent))) problems.push(`${tag}: the 54-day widget moved by itself`);
      if (!/^Days 50 to 54/.test(await p.$eval('#rlCap', e => e.textContent))) problems.push(`${tag}: the 54-day widget does not open on the whole run`);
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
  for (const t of ['t-read', 't-run']) { await p.$eval(`#tabs button[data-t=${t}]`, e => e.click()); await wait(300);
    for (const id of await p.$$eval(`#${t} .stg`, xs => xs.map(x => x.id))) {
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800); const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0);
      const f = await p.$eval('#' + id, e => +e.dataset.frames || 0), pl = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent));
      if (f > 0 || pl || d1 !== d0) problems.push(`reduced motion: ${id} moved by itself (frames ${f}, redraws ${d1 - d0})`) }
    if (t === 't-run') for (const id of ['pp', 'rl']) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2500);
      const f = await p.$eval('#' + id, e => +e.dataset.frames || 0), pl = await p.$eval(`#${id}Play`, e => /Pause/.test(e.textContent)); if (f || pl) problems.push(`reduced motion: ${id} moved by itself`) } }
  await p.close() }
{ // every number the step lists state is the one the stages draw
  const p = await b.newPage(); await p.goto(file); await wait(800);
  const r = await p.evaluate(() => {
    const bad = []; let n = 0; const items = id => [...document.getElementById(id).children].map(li => li.textContent.replace(/\s+/g, ' '));
    const has = (L, i, s, id) => { n++; if (!L[i].includes(s)) bad.push(id + ' step ' + (i + 1) + ': expected "' + s + '"') };
    const RC = window.PAPER.rc, FG = window.PAPER.figs, L = items('sx-iso'), id = 'Fig. 1';
    const bil = v => (v / 1e9).toFixed(v >= 1e11 ? 0 : 1) + 'B', pts = FG.fig2['1e21'].points, toks = pts.map(q => q[0]), loss = pts.map(q => q[1]);
    has(L, 0, pts.length + ' models', id); has(L, 0, bil(Math.min(...toks)) + ' to ' + bil(Math.max(...toks)), id);
    has(L, 0, Math.min(...loss).toFixed(3) + ' to ' + Math.max(...loss).toFixed(3), id); has(L, 1, 'those ' + pts.length + ' points', id);
    const q = RC.iso['1e21']; has(L, 1, bil(q.min_tokens) + ' tokens and loss ' + q.min_loss.toFixed(3), id); n++; if (Math.abs(q.tok_diff_pct) > .5) bad.push(id + ': the refitted 1e21 minimum is not where the paper draws it');
    has(L, 1, (1e21 / 6 / q.min_tokens / 1e9).toFixed(2) + 'B parameters', id);
    const runs = Object.values(FG.fig2).reduce((s, v) => s + v.points.length, 0); has(L, 2, runs + ' runs', id);
    has(L, 2, (RC.iso['6e18'].min_tokens / 1e9).toFixed(2) + 'B tokens at loss ' + RC.iso['6e18'].min_loss.toFixed(3), id); has(L, 2, bil(RC.iso['1e22'].min_tokens) + ' at ' + RC.iso['1e22'].min_loss.toFixed(3), id);
    has(L, 3, RC.iso['6e18'].c[2].toFixed(3), id); has(L, 3, RC.iso['3e21'].c[2].toFixed(3) + ' and ' + RC.iso['1e22'].c[2].toFixed(3), id);
    has(L, 4, RC.fit.A.toFixed(4), id); has(L, 4, RC.fit.alpha.toFixed(4), id);
    const F = RC.forecast.refit; has(L, 5, RC.extrapolation_orders.toFixed(1) + ' orders', id);
    has(L, 5, (F.D_at_4e25 / 1e12).toFixed(2) + 'T tokens and ' + (F.N_at_4e25 / 1e9).toFixed(1) + 'B parameters', id);
    has(L, 5, (F['D_at_3.8e25'] / 1e12).toFixed(1) + 'T and ' + (F['N_at_3.8e25'] / 1e9).toFixed(0) + 'B', id);
    n++; if (Math.abs(RC.C_for_16_55T / 4e25 - 1) > .005) bad.push(id + ': 16.55T is not reached at 4.0e25 FLOPs');
    // Fig. 2: K, the kept response, the data columns
    const D = window.L3_POST, P2 = items('sx-pt-l3'), id2 = 'Fig. 2';
    has(P2, 1, D.K + ' are drawn here', id2); n++; if (D.SC[D.BEST] !== Math.max(...D.SC)) bad.push(id2 + ': the kept response is not the best scored');
    n++; if (Math.abs(D.T7.reduce((s, r) => s + r[1], 0) - 100) > .05 || Math.abs(D.T6.reduce((s, r) => s + r[1], 0) - 100) > .05) bad.push(id2 + ': a data column does not add up to 100%');
    has(P2, 5, 'β = 0.1', id2); has(P2, 5, '0.2', id2); has(P2, 7, 'six times', id2);
    return { bad, n } });
  r.bad.forEach(x => problems.push('step list number: ' + x)); console.log('step-list numbers checked', r.n);
  await p.close() }
await b.close();
console.log('stages checked', checked, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
