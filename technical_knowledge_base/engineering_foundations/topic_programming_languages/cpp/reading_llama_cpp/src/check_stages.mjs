// The 2026-11-06 rollout checks: every 3D stage and every 2D animation plays by itself once scrolled into view, steps to its last step,
// has one step-list item per step, never moves under reduced motion; no errors, NaN, undefined or sideways scroll; split layout at 1400 px;
// and the numbers the step lists quote are the page's own data (window.CL, written by src/cl/gen_data.py).
// usage (from the repo root): node <page>/src/check_stages.mjs [shots dir]   (needs html_utils' node_modules)
// (C++: reading llama.cpp: adapted from the ownership sibling; four stages, three 2D animations with a step list per mode)
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = ['stg-hero', 'stg-graph', 'stg-quant', 'stg-kv'];
// [card, controls, {mode: step list}, mode buttons, closed block to open first]
const ANIMS = [['cl-chk', 'cl-chk-ctl', { dyn: 'sx-chk-dyn', static: 'sx-chk-static' }, 'cl-chk-m', null],
  ['tr-card', 'tr-ctl', { prompt: 'sx-tr-prompt', next: 'sx-tr-next' }, 'tr-mode', null],
  ['qb-card', 'qb-ctl', { q8: 'sx-qb-q8', q4: 'sx-qb-q4' }, 'qb-mode', 'cl-qb']];
const wait = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell' });
const problems = [];
const openBlocks = p => p.evaluate(() => { const d = document.getElementById('cl-qb'); if (d) d.open = true; });
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(400);
  await openBlocks(p);
  const tag = `${scheme} ${width}`;
  const audit = async where => {
    const r = await p.evaluate(() => ({ bad: (document.getElementById('t-read').innerText.replace(/undefined behaviour/g, '').match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) }));
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  if (width === 1400) { // two columns where a section has a visual
    const cols = await p.$$eval('.s3sp', xs => xs.map(x => getComputedStyle(x).display));
    if (cols.some(c => c !== 'grid')) problems.push(`${tag}: a split is not two columns`);
  }
  // autoplay on view
  for (const id of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2200);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
  }
  for (const [card, ctl] of ANIMS) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const t = await p.$eval(`#${ctl}-p`, e => e.textContent); if (!/Pause/.test(t)) problems.push(`${tag}: ${card} did not play when scrolled into view (${t})`);
  }
  // flows stop off screen: draws do not rise while every stage is out of view
  await p.evaluate(() => window.scrollTo(0, document.getElementById('cl-s4').getBoundingClientRect().top + scrollY)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  // step every stage to its last step; list length; screenshot mid-way
  for (const id of STAGES) {
    await p.$eval(`#${id}-b`, e => e.click()); // a control: stops autoplay
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1);
    const lis = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return l ? l.children.length : 0 });
    if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but ${lis} items`);
    for (let k = 1; k < n; k++) {
      await p.$eval(`#${id}-f`, e => e.click()); await wait(80);
      if (k === Math.floor(n / 2)) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2800); const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}-${scheme}-${width}.png` }) }
    }
    await wait(2800);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
    await audit(`${id} last step`);
    for (let k = 0; k < n; k++) { await p.evaluate((id, k) => document.getElementById(id).closest('.s3sp').querySelector('ol.sx:not([hidden])').children[k].click(), id, k); if (width === 1400) { await wait(1700); const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}-s${k + 1}-${scheme}-${width}.png` }) } }
  }
  for (const [card, ctl, lists, seg] of ANIMS) {
    for (const [m, lid] of Object.entries(lists)) {
      if (seg) { await p.$eval(`#${seg} button[data-m="${m}"]`, e => e.click()); await wait(100); }
      await p.$eval(`#${ctl}-b`, e => e.click());
      await p.evaluate(ctl => { const e = document.getElementById(ctl + '-s'); e.value = 0; e.dispatchEvent(new Event('input')) }, ctl);
      const n = await p.$eval(`#${ctl}-s`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.hidden ? -1 : e.children.length);
      if (lis !== n) problems.push(`${tag}: ${card} ${m} has ${n} steps but list ${lid} shows ${lis}`);
      const others = await p.evaluate((lists, lid) => Object.values(lists).filter(x => x !== lid && !document.getElementById(x).hidden), lists, lid);
      if (others.length) problems.push(`${tag}: ${card} ${m} shows other lists too: ${others}`);
      for (let k = 1; k < n; k++) { await p.$eval(`#${ctl}-f`, e => e.click()); await wait(60);
        if (k === Math.floor(n / 2)) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); const el = await p.$('#' + card); await el.screenshot({ path: `${shots}/x-${card}-${m}-${scheme}-${width}.png` }) } }
      const on = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on'))); if (on !== n - 1) problems.push(`${tag}: ${card} ${m} list marks ${on}, not the last step`);
      await audit(`${card} ${m}`);
    }
  }
  { // the numbers written into the step lists are the page's own data
    const r = await p.evaluate(() => { const out = [], CL = window.CL, v = CL.v, f = (x, d) => CLX.fmt(x, d);
      const txt = id => document.getElementById(id).textContent.replace(/\s+/g, ' ');
      const need = (id, xs) => xs.forEach(x => { if (!txt(id).includes(String(x))) out.push(id + ' lacks "' + x + '"') });
      need('sx-hero', [f(v.tg_ms_tok, 2) + ' ms per token', f(v.nodes) + ' nodes', 'reused ' + v.graphs_reused + ' times', f(v.compute_mib, 1) + ' MiB', 'each of the ' + f(v.real_ops), v.n_mulmat + ' products × 16 chunks = ' + f(v.gemv_tok) + ' kernel calls']);
      if (v.gemv_tok !== v.n_mulmat * 16) out.push('gemv_tok is not n_mulmat × 16');
      const L0 = CL.trace.layer0, cnt = o => L0.filter(r => r[2] === o).length, empty = cnt('VIEW') + cnt('RESHAPE') + cnt('PERMUTE');
      if (L0.length !== v.nodes_per_layer) out.push('layer 0 has ' + L0.length + ' nodes, not nodes_per_layer');
      need('sx-graph', [L0.length + ' nodes for this layer', cnt('MUL_MAT') + ' of them matrix products', 'skips the ' + empty + ' views', 'the other ' + (L0.length - empty)]);
      if (cnt('MUL_MAT') !== 7 || cnt('PERMUTE') !== 3 || cnt('VIEW') !== 5) out.push('layer 0 operation counts changed: the step text names 7 products, 2 + 3 views and 3 permutes');
      if (v.n_mulmat !== 7 * 30 + 1) out.push('n_mulmat is not 7 x 30 + 1');
      const Q = CL.quant, amaxI = Q.x.reduce((b, y, i) => Math.abs(y) > Math.abs(Q.x[b]) ? i : b, 0);
      if (Math.abs(Q.q8[amaxI]) !== 127) out.push('the largest weight is not stored as 127');
      need('sx-quant', ['weight ' + amaxI + ', is stored as 127', Q.d8.toPrecision(4), Q.d4.toPrecision(4).replace('-', '−'), f(Q.rel_rms_q4_tensor, 4)]);
      if (Q.hex.length / 2 !== 34 || Q.q4_block_hex.length / 2 !== 18) out.push('block byte counts are not 34 and 18');
      const kv = 2 * 30 * v.n_ctx * 192 * 2; if (kv !== v.kv_bytes_formula) out.push('KV formula ' + kv + ' != ' + v.kv_bytes_formula);
      if (Math.abs(kv / 1048576 - v.kv_mib) > .006) out.push('KV bytes do not give the logged MiB');
      need('sx-kv', [v.n_ctx + ' cells', '30 of each', 'asked for 12', '2 × 30 × ' + v.n_ctx + ' × 192 × 2 bytes']);
      need('sx-tr-prompt', [f(v.nodes) + ' nodes, ' + v.n_mulmat, f(v.gemm_prompt) + ' gemm and ' + f(v.gemv_prompt) + ' gemv', f(v.pp_ms, 1) + ' ms for 5 tokens', f(v.compute_mib, 2) + ' MiB']);
      need('sx-tr-next', ['graphs reused = ' + v.graphs_reused + ' over', f(v.gemv_tok) + ' gemv calls per token = ' + v.n_mulmat, f(v.tg_ms_tok, 2) + ' ms per generated token']);
      // the chunk animation's step lists against a recompute of its schedule (4 threads, thread 3 at half speed, 16 chunks)
      const t = [1, 1, 1, 2], took = [1, 1, 1, 1]; let next = 4; while (next < 16) { let i = 0; for (let k = 1; k < 4; k++) if (t[k] < t[i]) i = k; t[i] += i === 3 ? 2 : 1; took[i]++; next++ }
      need('sx-chk-dyn', ['Done at t = ' + Math.max(...t), 'slow thread did ' + took[3] + ' chunks, the others ' + took[0] + ', ' + took[1] + ' and ' + took[2]]);
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`)); }
  await audit('end');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file); await openBlocks(p);
  for (const id of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || r[1] !== 'step 1 of ' + r[1].split(' of ')[1]) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  for (const [card, ctl] of ANIMS) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval(`#${ctl}-p`, e => e.textContent); if (/Pause/.test(r)) problems.push(`reduced motion: ${card} moved by itself`) }
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
