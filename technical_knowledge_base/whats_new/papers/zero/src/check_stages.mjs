// The 2026-11-06 layout and motion checks for the ZeRO paper page, at 1400 px light, 920 px light and 390 px dark:
// the 3D stage (#stg-f1, Figure 1 in 3D: one GPU's model states per stage to scale, and the volume each GPU sends per step) and the 2D step
// animation (#stx, one training step under two methods, four comparisons) each play by themselves once scrolled into view, step to their last
// step, and have exactly one step-list item per step in every mode; flows stop drawing off screen; at 1400 px every split shows two columns; no
// errors, NaN, undefined or sideways scroll; under prefers-reduced-motion nothing moves by itself; and the numbers the step lists state match
// what the stage and the animation draw (window.ZF1 from 31_js_sc_f1.js, window.ZSTEP from 14_js_step.js), recomputed here from §5 and §7.
// Writes a mid-step screenshot of each stage and animation.
// usage (from the repo root): node technical_knowledge_base/whats_new/papers/zero/src/check_stages.mjs [shots dir]
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
const ANIMS = { stx: 't-read' };
const STAGE_MODES = {}; // no stage on this page has a mode toggle
const COUNTERS = {};
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await wait(300);
  await p.$$eval('.pred .skip', bs => bs.forEach(b => b.click()));
  const tag = `${scheme} ${width}`;
  const clk = sel => p.$eval(sel, e => e.click());
  for (const t of await p.$$eval('#tabs button', bs => bs.map(b => b.dataset.t))) {
    await clk(`#tabs button[data-t=${t}]`); await wait(300);
    // the split: two columns side by side at 1100 px and wider, stacked below
    const splits = await p.$$eval(`#${t} .s3sp`, ss => ss.map(s => { const L = s.querySelector(':scope > .s3L'), R = s.querySelector(':scope > .s3R'); if (!L || !R) return 'missing column';
      const a = L.getBoundingClientRect(), r = R.getBoundingClientRect(); return { side: r.left >= a.right - 1 && r.width > 200 && a.width > 200 } }));
    splits.forEach((s, i) => { if (s === 'missing column') problems.push(`${tag} ${t}: split ${i + 1} lacks a column`); else if (width >= 1100 && !s.side) problems.push(`${tag} ${t}: split ${i + 1} is not two columns`) });
    // 3D stages
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
      for (let k = 1; k < n; k++) { await clk(`#${id}-f`); await wait(80); if (k === Math.floor(n / 2)) { await wait(1700); await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-mid-${scheme}-${width}.png` }) } }
      await wait(1700);
      const shown = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (shown !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on "${shown}"`);
      const on = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return [...l.children].findIndex(x => x.classList.contains('on')) });
      if (on !== n - 1) problems.push(`${tag}: ${id} list marks item ${on + 1} at the last step`);
      const still = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent)); if (still) problems.push(`${tag}: ${id} still playing after a reader control`);
      if (COUNTERS[id]) { const cnt = await p.$eval('#' + COUNTERS[id][0], e => e.innerText); if (!COUNTERS[id][1].test(cnt)) problems.push(`${tag}: ${id}: counters missing`) }
      if (STAGE_MODES[id]) for (const m of await p.$$eval(`#${STAGE_MODES[id]} button`, bs => bs.map(b => b.dataset.m))) {
        const f0 = await p.$eval('#' + id, e => +e.dataset.frames || 0);
        await clk(`#${STAGE_MODES[id]} button[data-m=${m}]`); await wait(2600);
        const f1m = await p.$eval('#' + id, e => +e.dataset.frames || 0), plm = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent));
        if (!(f1m > f0) || !plm) problems.push(`${tag}: ${id} did not replay after switching to ${m}`);
        const nm = await p.$eval(`#${id}-r`, e => +e.max + 1), lm = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelectorAll('ol.sx:not([hidden])'); return [l.length, l[0] ? l[0].children.length : 0, l[0] ? l[0].id : ''] });
        if (lm[0] !== 1 || lm[1] !== nm) problems.push(`${tag}: ${id} ${m}: ${lm[0]} visible lists, ${lm[1]} items for ${nm} steps (${lm[2]})`);
        for (let k = 1; k < nm; k++) { await clk(`#${id}-f`); await wait(60); if (k === Math.floor(nm / 2)) { await wait(2100); await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-${m}-mid-${scheme}-${width}.png` }) } }
        await wait(2100); const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${nm} of ${nm}`) problems.push(`${tag}: ${id} ${m} ended on "${sh}"`);
        if (COUNTERS[id]) { const cnt = await p.$eval('#' + COUNTERS[id][0], e => e.innerText); if (!COUNTERS[id][1].test(cnt)) problems.push(`${tag}: ${id} ${m}: counters missing`) }
      }
    }
    // 2D step animations (makeAnim): each mode
    for (const [id, tab] of Object.entries(ANIMS)) {
      if (tab !== t || !(await p.$('#' + id))) continue;
      checked++;
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      const fr = await p.$eval('#' + id, e => +e.dataset.frames || 0), pl = await p.$eval('#' + id, e => e.hasAttribute('data-playing'));
      if (!(fr > 0) || !pl) problems.push(`${tag}: ${id} did not play when scrolled into view (frames ${fr}, playing ${pl})`);
      const modes0 = await p.$$eval(`#${id}M button`, bs => bs.map(b => b.dataset.m)), modes = modes0.length ? modes0 : [null];
      for (const m of modes) {
        if (m) { await clk(`#${id}M button[data-m=${m}]`); await wait(1200);
        if (!(await p.$eval('#' + id, e => e.hasAttribute('data-playing')))) problems.push(`${tag}: ${id} did not replay after switching to ${m}`); }
        const n = await p.$eval(`#${id}Scrub`, e => +e.max / 100);
        const lis = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return l ? l.children.length : 0 });
        if (lis !== n) problems.push(`${tag}: ${id} ${m} has ${n} steps but ${lis} list items`);
        if (n > 12) problems.push(`${tag}: ${id} ${m} has ${n} steps (a replay over about 12 steps must be grouped into stretches)`);
        for (let k = 0; k < n; k++) { await clk(`#${id}Fwd`); if (k === Math.floor(n / 2) - 1) await (await p.$('#' + id)).screenshot({ path: `${shots}/anim-${id}-${m}-mid-${scheme}-${width}.png` }) }
        if (await p.$eval('#' + id, e => e.hasAttribute('data-playing'))) problems.push(`${tag}: ${id} still playing after the forward button`);
        const on = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return [...l.children].findIndex(x => x.classList.contains('on')) });
        if (on !== n - 1) problems.push(`${tag}: ${id} ${m} list marks item ${on + 1} at the last step`);
        // a click on a list item plays that step once and stops on it
        await p.evaluate(id => document.getElementById(id).closest('.s3sp').querySelector('ol.sx:not([hidden])').children[1].click(), id);
        const pl2 = await p.$eval('#' + id, e => e.hasAttribute('data-playing'));
        await p.waitForFunction(id => !document.getElementById(id).hasAttribute('data-playing'), { timeout: 15000 }, id).catch(() => problems.push(`${tag}: ${id} ${m} list click did not stop`));
        if (!pl2) problems.push(`${tag}: ${id} ${m} list click did not play its step`);
      }
    }
    const r = await p.evaluate(t => { const el = document.getElementById(t); const txt = el.innerText;
      return { bad: (txt.match(/.{0,30}(?<![-\w])(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth } }, t);
    if (r.bad.length) problems.push(`${tag} ${t}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${t}: sideways scroll`);
  }
  const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) problems.push(`${tag}: error box: ${box}`);
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file); await p.$$eval('.pred .skip', bs => bs.forEach(b => b.click()));
  for (const t of ['t-read', 't-tables']) { await p.$eval(`#tabs button[data-t=${t}]`, e => e.click()); await wait(300);
    for (const id of await p.$$eval(`#${t} .stg`, xs => xs.map(x => x.id))) {
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800); const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0);
      const f = await p.$eval('#' + id, e => +e.dataset.frames || 0), pl = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent));
      if (f > 0 || pl || d1 !== d0) problems.push(`reduced motion: ${id} moved by itself (frames ${f}, redraws ${d1 - d0})`) }
    for (const id of Object.keys(ANIMS).filter(a => ANIMS[a] === t)) {
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      const f = await p.$eval('#' + id, e => +e.dataset.frames || 0), pl = await p.$eval('#' + id, e => e.hasAttribute('data-playing'));
      if (f > 0 || pl) problems.push(`reduced motion: ${id} moved by itself (frames ${f})`) } }
  await p.close() }
{ // the numbers the step lists state are the ones the stage and the animation draw
  const p = await b.newPage(); await p.goto(file); await wait(800);
  const r = await p.evaluate(() => {
    const bad = []; let n = 0; const items = id => [...document.getElementById(id).children].map(li => li.textContent.replace(/\s+/g, ' '));
    const want = (id, i, s) => { n++; const L = items(id); if (!L[i] || !L[i].includes(s)) bad.push(id + ' item ' + (i + 1) + ': expected "' + s + '"') };
    const F = window.ZF1, Z = window.ZSTEP; if (!F || !Z) return { bad: ['ZF1 or ZSTEP missing'], n: 1 };
    // Figure 1 at the defaults: 7.5B on 64 GPUs, (2 + 2 + 12)Ψ, 4Ψ + 12Ψ/64, 2Ψ + 14Ψ/64, 16Ψ/64 bytes (§5), 2, 2, 2, 3Ψ sent (§7)
    n++; if (F.psi !== 7.5e9 || F.nd !== 64) bad.push('Figure 1 defaults are not 7.5B on 64 GPUs');
    const psi = 7.5, want4 = [16 * psi, 4 * psi + 12 * psi / 64, 2 * psi + 14 * psi / 64, 16 * psi / 64];
    want4.forEach((v, i) => { n++; if (Math.abs(F.gb[i] - v) > 1e-9) bad.push('Figure 1 stage ' + i + ': ' + F.gb[i] + ' GB, expected ' + v) });
    n++; if (F.comm.join() !== '2,2,2,3' || F.cubes.join() !== '2,2,2,3') bad.push('Figure 1 volumes ' + F.comm + ' / cubes ' + F.cubes);
    want('sx-f1', 0, '120 GB per GPU, 3.8 times the V100'); want('sx-f1', 0, 'd = 64 GPUs (four drawn)');
    want('sx-f1', 1, '= 31.4 GB per GPU, just under the 32 GB'); want('sx-f1', 2, '= 16.6 GB'); want('sx-f1', 3, '= 1.88 GB (Figure 1 prints 1.9)');
    want('sx-f1', 3, '3Ψ, 1.5 times DP'); want('sx-f1', 4, '120, 31.4, 16.6, 1.88 GB'); want('sx-f1', 4, 'the cubes go 2, 2, 2, 3');
    n++; if (!/Defaults reproduce Figure 1/.test(document.getElementById('f1Rep').textContent)) bad.push('f1Rep does not reproduce Figure 1 at the defaults');
    // the step-through: totals after the last step and the resting memory per GPU against §5's formulas at N_d = 2, 4, 8
    const tot = { dp: 2, os: 2, os_g: 2, os_g_p: 3 }, rest = { dp: nd => 16, os: nd => 4 + 12 / nd, os_g: nd => 2 + 14 / nd, os_g_p: nd => 16 / nd };
    Object.keys(tot).forEach(st => { n++; if (Math.abs(Z.commTo(st, 10) - tot[st]) > 1e-12) bad.push('step-through total for ' + st + ': ' + Z.commTo(st, 10));
      [2, 4, 8].forEach(nd => { n++; if (Math.abs(Z.memAt(st, nd, 0) - rest[st](nd)) > 1e-12) bad.push('step-through rest memory ' + st + ' at ' + nd) }) });
    ['dp_3', 'dp_1', 'z12', 'z23'].forEach(m => { n++; if (items('sx-stx-' + m).length !== Z.modes[m].length || Z.modes[m].length !== 11) bad.push('step-through list ' + m + ' length') });
    want('sx-stx-dp_3', 10, 'DDP has nothing left to do: 2Ψ moved in all'); want('sx-stx-dp_3', 10, '3Ψ in all, 1.5 times');
    want('sx-stx-z12', 10, '2Ψ in all, DDP\'s volume'); want('sx-stx-dp_3', 5, '2 × ¼Ψ per GPU');
    // each list item's title is the animation's step title
    ['dp_3', 'dp_1', 'z12', 'z23'].forEach(m => Z.TITLES.forEach((t, i) => want('sx-stx-' + m, i, t + '.')));
    // the controls move the stated numbers: 7.5B on 4 GPUs is the hero's 30 GB under ZeRO-3
    const nEl = document.getElementById('f1N'); nEl.value = 2; nEl.dispatchEvent(new Event('input'));
    n++; if (Math.abs(window.ZF1.gb[3] - 30) > 1e-9) bad.push('f1N = 4 does not give 30 GB under ZeRO-3');
    want('sx-f1', 3, '= 30.0 GB'); want('sx-f1', 0, '(all drawn)');
    nEl.value = 6; nEl.dispatchEvent(new Event('input'));
    return { bad, n } });
  r.bad.forEach(x => problems.push('step list number: ' + x)); console.log('step-list numbers checked', r.n);
  await p.close() }
await b.close();
console.log('stages and animations checked', checked, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
