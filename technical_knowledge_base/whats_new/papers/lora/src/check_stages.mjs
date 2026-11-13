// The 2026-11-06 layout and motion checks for the LoRA paper page, at 1400 px light, 920 px light and 390 px dark:
// the two 3D stages (#stg-lora, Fig. 2, Equation 3 on the toy's Wv with its trained A and B and the known edit; #stg-sub, Fig. 4, phi between
// learned subspaces on the toy) and the two 2D step animations (#mx, Fig. 3, LoRA against an adapter, two modes; #tn, Then and now) each play
// by themselves once scrolled into view, step to their last step, and have exactly one step-list item per step in every mode; flows stop drawing
// off screen; at 1400 px every split shows two columns; no errors, NaN, undefined or sideways scroll; under prefers-reduced-motion nothing moves
// by itself; and the numbers the step lists state match the data the stages draw (window.LORA_SC and window.LORA_SUB, computed by the scenes
// from LORA_DATA with the page's engine), recomputed here independently from LORA_DATA where cheap.
// Writes a mid-step screenshot of each stage and animation.
// usage (from the repo root): node technical_knowledge_base/whats_new/papers/lora/src/check_stages.mjs [shots dir]
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
const ANIMS = { mx: 't-read', tn: 't-then' };
const STAGE_MODES = {}; // the mode toggle swaps the stage's step list and replays it
const COUNTERS = {};
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
  for (const t of ['t-read', 't-then']) { await p.$eval(`#tabs button[data-t=${t}]`, e => e.click()); await wait(300);
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
{ // the numbers the step lists state are the ones the stages draw
  const p = await b.newPage(); await p.goto(file); await wait(800);
  const r = await p.evaluate(() => {
    const bad = []; let n = 0; const items = id => [...document.getElementById(id).children].map(li => li.textContent.replace(/\s+/g, ' '));
    const want = (id, i, s) => { n++; const L = items(id); if (!L[i] || !L[i].includes(s)) bad.push(id + ' item ' + (i + 1) + ': expected "' + s + '"') };
    const C = window.LORA_SC, U = window.LORA_SUB, f2 = v => v.toFixed(2), pc = v => (100 * v).toFixed(1) + '%', cm = v => v.toLocaleString('en-GB');
    if (!C || !U) return { bad: ['scene data missing'], n: 1 };
    // Fig. 2
    want('sx-lora', 0, C.n + ' × ' + C.n + ' = ' + cm(C.frozen) + ' numbers'); want('sx-lora', 1, 'At r = ' + C.r); want('sx-lora', 1, cm(C.trainable) + ' trainable numbers against');
    want('sx-lora', 1, Math.round(100 * C.trainable / C.frozen) + '% because'); want('sx-lora', 2, 'seed ' + C.seed + ', ' + cm(C.steps) + ' steps'); want('sx-lora', 2, 'α/r = ' + C.scale);
    want('sx-lora', 3, 'rank ' + C.rankT + ' with four singular values of ' + f2(C.svT[0])); n++; if (C.svT.some(v => Math.abs(v - C.svT[0]) > 5e-3)) bad.push('Fig. 2: the true edit\'s singular values are not equal');
    want('sx-lora', 3, 'singular values ' + C.svL.slice(0, 3).map(f2).join(', ') + ' and ' + f2(C.svL[3])); want('sx-lora', 3, 'cosine similarity of ' + f2(C.cos)); want('sx-lora', 3, pc(C.changed) + ' of the sequences');
    // the GPT-3 comparison in step 2 is the hero's: 2 x 4 x 12,288 / 12,288^2
    want('sx-lora', 1, (100 * 2 * 4 * 12288 / 12288 / 12288).toFixed(3) + '% of a matrix');
    // Fig. 4
    want('sx-sub', 0, U.sv16.slice(0, 3).map(f2).join(', ') + ' and ' + f2(U.sv16[3]) + ', then ' + f2(U.sv16[4])); want('sx-sub', 0, 'four, of ' + f2(U.svT[0]));
    n++; if (!(U.sv16[4] < 0.25 * U.sv16[3])) bad.push('Fig. 4: no gap after four singular values'); n++; if (U.svT[4] > 1e-6) bad.push('Fig. 4: the true edit has more than four directions');
    want('sx-sub', 1, 'φ(1, 1) = ' + f2(U.r[0][0])); want('sx-sub', 1, 'φ(4, 4) = ' + f2(U.r[3][3]));
    want('sx-sub', 2, 'φ(1, 1) = ' + f2(U.s[0][0])); want('sx-sub', 2, 'φ(4, 4) = ' + f2(U.s[3][3])); want('sx-sub', 2, 'φ(16, 16) = ' + f2(U.s[15][15]));
    want('sx-sub', 3, 'φ(4, 4) = ' + f2(U.t[3][3])); want('sx-sub', 3, 'φ(16, 4) = ' + f2(U.t[15][3]));
    want('sx-sub', 4, 'φ(1, 1) = ' + f2(U.g[0][0])); want('sx-sub', 4, 'φ(16, 16) = ' + f2(U.g[15][15]));
    n++; if (Math.abs(U.g[15][15] - 0.5) > 0.06) bad.push('Fig. 4: random floor ' + U.g[15][15] + ' is not about half');
    // independent recompute of Fig. 2's update from LORA_DATA with the engine (not the scene)
    const E = window.LORA, D = window.LORA_DATA, a = D.adapters.v4['1']['4'].Wv, A = E.decode(a.A, a.sA, 128), B = E.decode(a.B, a.sB, 128);
    const dW = new Float64Array(1024); for (let i = 0; i < 32; i++) for (let q = 0; q < 4; q++) for (let j = 0; j < 32; j++) dW[i * 32 + j] += a.s * B[i * 4 + q] * A[q * 32 + j];
    const sv = E.svd(dW, 32, 32).S; n++; if (Math.abs(sv[0] - C.svL[0]) > 1e-9 || sv[4] > 1e-9) bad.push('Fig. 2: recomputed update differs or is not rank 4');
    // step counts: Fig. 2 five, Fig. 4 six; the 2D animations' lists against their data
    n++; if (items('sx-lora').length !== 5 || items('sx-sub').length !== 6) bad.push('step list lengths ' + items('sx-lora').length + ', ' + items('sx-sub').length);
    n++; if (items('sx-mx-lora').length !== 7 || items('sx-mx-adp').length !== 6 || items('sx-tn').length !== 8) bad.push('2D step list lengths');
    return { bad, n } });
  r.bad.forEach(x => problems.push('step list number: ' + x)); console.log('step-list numbers checked', r.n);
  await p.close() }
await b.close();
console.log('stages and animations checked', checked, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
