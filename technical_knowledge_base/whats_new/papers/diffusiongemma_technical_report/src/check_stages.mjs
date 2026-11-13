// The 2026-11-06 layout and motion checks for this page, at 1400 px light, 920 px light and 390 px dark:
// the 3D stage (#stg-samp, Algorithm 1 on the toy, pass by pass, then AR mode) plays by itself once scrolled into view, steps to its
// last step, and has exactly one step-list item per step; its flows stop drawing off screen; a reader control stops it for good;
// the Run the toy decoder (#run) is a widget (long-replay rule, case b): it never plays by itself, has no step list and opens on its
// finished answer; at 1400 px every split shows two columns; no errors, NaN, undefined or sideways scroll; under
// prefers-reduced-motion nothing moves by itself; and the numbers the static step list states match the run the stage draws (SAMPDATA).
// Writes a mid-step screenshot of the stage at each size.
// usage (from the repo root): node technical_knowledge_base/whats_new/papers/diffusiongemma_technical_report/src/check_stages.mjs [shots dir]
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
      if (!(await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent)))) problems.push(`${tag}: ${id} is not playing after scrolling into view`);
      const n = await p.$eval(`#${id}-r`, e => +e.max + 1);
      const lis = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return l ? l.children.length : 0 });
      if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but ${lis} list items`);
      await p.evaluate(() => window.scrollTo(0, 0)); await wait(400);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800);
      const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0); if (d1 !== d0) problems.push(`${tag}: ${id} kept drawing off screen (${d1 - d0})`);
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(200);
      await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
      for (let k = 1; k < n; k++) { await clk(`#${id}-f`); await wait(80); if (k === Math.floor(n / 2)) { await wait(2000); await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-mid-${scheme}-${width}.png` }) } }
      await wait(2000);
      const shown = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (shown !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on "${shown}"`);
      const on = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return [...l.children].findIndex(x => x.classList.contains('on')) });
      if (on !== n - 1) problems.push(`${tag}: ${id} list marks item ${on + 1} at the last step`);
      if (await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent))) problems.push(`${tag}: ${id} still playing after a reader control`);
      const cnt = await p.$eval('#sampCnt', e => e.innerText); if (!/Forward passes/.test(cnt)) problems.push(`${tag}: ${id} counters missing`);
    }
    // the Run the toy widget: never plays by itself, no step list, opens on the finished answer
    if (await p.$(`#${t} #run`)) {
      checked++;
      await p.$eval('#run', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      const fr = await p.$eval('#run', e => +e.dataset.frames || 0); if (fr) problems.push(`${tag}: the run widget moved by itself (${fr} frames)`);
      const st = await p.$eval('#runStep', e => e.textContent); if (!/^Step (\d+) of \1: Done/.test(st)) problems.push(`${tag}: the run widget opens on "${st}", not its finished answer`);
      if (await p.$eval('#run', h => !!h.closest('.s3sp').querySelector('ol.sx'))) problems.push(`${tag}: the run widget has a step list`);
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
    for (const id of await p.$$eval(`#${t} .stg, #${t} #run`, xs => xs.map(x => x.id))) {
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800); const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0);
      const f = await p.$eval('#' + id, e => +e.dataset.frames || 0);
      if (f > 0 || d1 !== d0) problems.push(`reduced motion: ${id} moved by itself (frames ${f}, redraws ${d1 - d0})`) } }
  await p.close() }
{ // the numbers the static step list states are the ones the stage draws
  const p = await b.newPage(); await p.goto(file); await wait(1500);
  const r = await p.evaluate(() => { const D = SAMPDATA(), L = document.getElementById('sx-samp').innerText, f = D.run.frames, c0 = f.filter(x => x.k === 0);
    return { L, noise: f[0].x.map(D.tok).join(', '), acc: D.acc, n0: c0.length, steps: D.run.steps, fwd: D.run.fwd, ok: D.ok, okAR: D.okAR, arf: D.ar.fwd, rev: D.rev, nrev: D.run.revisions,
      ref7: D.pb.ref[6], prompt: D.pb.prompt.length } });
  const say = (cond, msg) => { if (!cond) problems.push('step list: ' + msg) };
  say(r.L.includes(r.noise.replace('<a>', '<a>')), `noise tokens are ${r.noise}`);
  say(r.prompt === 45 && r.L.includes('45-token prompt'), `prompt has ${r.prompt} tokens`);
  say(r.acc[0] === 5 && r.L.includes('keeps the 5 lowest-entropy positions') && r.L.includes('the other 3'), `pass 1 keeps ${r.acc[0]}`);
  say(r.acc[1] === 7 && r.acc[2] === 7 && r.acc[3] === 8 && r.L.includes('7, 7, then all 8'), `passes 2 to 4 keep ${r.acc.slice(1, 4)}`);
  say(r.nrev === 1 && r.rev.length === 1 && r.rev[0].k === 0 && r.rev[0].n === 5 && r.rev[0].i === 6 && r.rev[0].from === 0 && r.rev[0].to === 1 && r.rev[0].conf.toFixed(2) === '0.57' && r.ref7 === 1,
    `revision ${JSON.stringify(r.rev)} (list: pass 5, position 7, 0 to 1 at 0.57, rule gives 1)`);
  say(r.n0 === 7 && r.L.includes('after 7 passes'), `canvas 1 took ${r.n0} passes`);
  say(r.steps.join() === '7,2,2' && r.L.includes('two passes each'), `passes per canvas ${r.steps}`);
  say(r.fwd === 13 && r.L.includes('13 forward passes for 24 tokens') && r.L.includes('24 / 13 = ' + (24 / r.fwd).toFixed(2)), `forward passes ${r.fwd}`);
  say(r.ok === 24 && r.L.includes('all 24 bits right'), `diffusion gets ${r.ok} of 24`);
  say(r.arf === 24 && r.okAR === 24 && r.L.includes('24 of 24 right'), `AR: ${r.arf} passes, ${r.okAR} right`);
  await p.close() }
await b.close();
console.log('stages and widgets checked', checked, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
