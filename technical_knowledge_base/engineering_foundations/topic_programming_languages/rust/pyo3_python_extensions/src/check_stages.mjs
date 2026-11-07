// The 2026-11-06 rollout checks: every 3D stage and every 2D animation plays by itself once scrolled into view, steps to its last step,
// has one step-list item per step, never moves under reduced motion; no errors, NaN, undefined or sideways scroll; split layout at 1400 px.
// usage (from the repo root or src/): node src/check_stages.mjs [shots dir]   (needs html_utils' node_modules)
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../../html_utils/package.json'));
// (Rust: speeding up Python with PyO3 and maturin: adapted from the Rust lifetimes page; four stages, no 2D animations; the step lists' numbers are
//  checked against the page's own data, window.RB, and RB's build and wheel facts against the recordings in rb/outputs)
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
const STAGES = ['stg-build', 'stg-cross', 'stg-gil', 'stg-wheel'];
// [card, controls, {mode: step list}, mode buttons, data attribute]
const ANIMS = [];
const MODES = {};
const WIDGETS = [];
const wait = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell' });
const problems = [];
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(400);
  const tag = `${scheme} ${width}`;
  const audit = async where => {
    const r = await p.evaluate(() => ({ bad: (document.getElementById('t-read').innerText.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) }));
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
  // widgets never play by itself
  for (const [card, ctl, tab] of WIDGETS) {
    await p.click(`#tabs button[data-t="${tab}"]`); await wait(300);
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(2000);
    const t = await p.$eval(`#${ctl}-p`, e => e.textContent); if (/Pause/.test(t)) problems.push(`${tag}: widget ${card} played by itself`);
    if (width === 1400) { const c = await p.$$eval(`#${tab} .s3sp`, xs => xs.map(x => getComputedStyle(x).display)); if (c.some(d => d !== 'grid')) problems.push(`${tag}: ${tab} split not two columns`); }
    await p.screenshot({ path: `${shots}/x-tab-${tab}-${scheme}-${width}.png` });
  }
  await p.click('#tabs button[data-t="t-read"]'); await wait(300);
  // flows stop off screen: draws do not rise while every stage is out of view
  await p.evaluate(() => window.scrollTo(0, document.getElementById('t-read').getBoundingClientRect().bottom + scrollY)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  // step every stage to its last step, in every mode; list length; screenshot mid-way
  for (const id of STAGES) {
    const md = MODES[id], modes = md ? md[2] : [null];
    for (const m of modes) {
      if (m) await p.$eval(`#${md[0]} button[data-${md[1]}="${m}"]`, e => e.click());
      await p.$eval(`#${id}-b`, e => e.click()); // a control: stops autoplay
      await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
      const n = await p.$eval(`#${id}-r`, e => +e.max + 1);
      const lis = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return l ? l.children.length : 0 });
      if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but ${lis} items`);
      for (let k = 1; k < n; k++) {
        await p.$eval(`#${id}-f`, e => e.click()); await wait(80);
        if (k === Math.floor(n / 2) && (!m || m === modes[modes.length - 1])) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2800); const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}-${scheme}-${width}.png` }) }
      }
      await wait(2800);
      const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ${m || ''} ended on ${sh}`);
      await audit(`${id} ${m || ''} last step`);
      for (let k = 0; k < n; k++) await p.evaluate((id, k) => document.getElementById(id).closest('.s3sp').querySelector('ol.sx:not([hidden])').children[k].click(), id, k);
    }
  }
  for (const [card, ctl, lists, seg, at] of ANIMS) {
    for (const [m, lid] of Object.entries(lists)) {
      if (seg) { await p.$eval(`#${seg} button[data-${at}="${m}"]`, e => e.click()); await wait(100); }
      await p.$eval(`#${ctl}-b`, e => e.click());
      await p.evaluate(ctl => { const e = document.getElementById(ctl + '-s'); e.value = 0; e.dispatchEvent(new Event('input')) }, ctl);
      const n = await p.$eval(`#${ctl}-s`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.hidden ? -1 : e.children.length);
      if (lis !== n) problems.push(`${tag}: ${card} ${m} has ${n} steps but list ${lid} shows ${lis}`);
      for (let k = 1; k < n; k++) { await p.$eval(`#${ctl}-f`, e => e.click()); await wait(60);
        if (k === Math.floor(n / 2)) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); const el = await p.$('#' + card); await el.screenshot({ path: `${shots}/x-${card}-${m}-${scheme}-${width}.png` }) } }
      const on = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on'))); if (on !== n - 1) problems.push(`${tag}: ${card} ${m} list marks ${on}, not the last step`);
      await audit(`${card} ${m}`);
    }
  }
  { // the numbers written into the step lists are the page's own data (window.RB, written by rb/gen.py from rb/outputs)
    const r = await p.evaluate(() => { const out = [], f = (v, d) => (+v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
      const txt = id => document.getElementById(id).textContent.replace(/\s+/g, ' ');
      const need = (id, xs) => xs.forEach(x => { if (!txt(id).includes(String(x))) out.push(id + ' lacks "' + x + '"') });
      const B = RB.build, C = RB.convert, G = RB.gil314, T = RB.gil314t, W = RB.wheels;
      need('sx-build', ['in ' + B.compile_s + 's', B.real_s + ' s', f(B.so_bytes, 0) + ' bytes', 'zip of ' + B.files.length + ' files', B.wheel, B.deps.length === 5 ? 'five dependencies' : 'MISMATCH']);
      need('sx-cross', [f(C.call_noop.med, 1) + ' ns', f(C.len_owned.med, 1) + ' ns per string', f(C.len_borrowed.med, 1) + ' ns per string', f(C.len_owned.med / C.len_borrowed.med, 0) + 'x', f(C.floats_vec.med, 2) + ' ns per float', f(C.floats_numpy.med, 2) + ' ns per float', '19 bytes', '(1, 2, 3)', '(8.75)']);
      need('sx-gil', [f(G.serial.wall_ms, 0) + ' ms', 'at ' + f(G.held.spans[1][0], 0) + ', ' + f(G.held.spans[2][0], 0) + ' and ' + f(G.held.spans[3][0], 0) + ' ms', f(G.held.wall_ms, 0) + ' ms in all', '(' + f(G.serial.min_ms, 0) + ' to ' + f(G.serial.max_ms, 0) + ' ms', 'within ' + f(G.detached.spans[3][0], 1) + ' ms', f(G.detached.wall_ms, 0) + ' ms, ' + f(G.held.wall_ms / G.detached.wall_ms, 1) + 'x', f(T.held.wall_ms, 0) + ' ms', f(G.rayon4.wall_ms, 0) + ' ms']);
      need('sx-wheel', [W.abi3, W.abi3t, W.abi3_loaded.slice(0, -1).join(', ') + ' and ' + W.abi3_loaded.at(-1), W.abi3t_loaded[0][0]]);
      if (!W.abi3_refused_314t) out.push('the recordings no longer show the abi3 wheel refused on 3.14t');
      const enc = new TextEncoder(); if (['café', 'x86_64', 'v2.1 C++'].reduce((s, t) => s + enc.encode(t).length, 0) !== 19) out.push('UTF-8 byte total is not 19');
      if ([.5, 1.5, 2.5].reduce((s, v) => s + v * v, 0) !== 8.75) out.push('sum of squares is not 8.75');
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
    // and RB's build and wheel facts are the recordings
    const D = await p.evaluate(() => ({ B: RB.build, W: RB.wheels })), rd = n => fs.readFileSync(path.resolve(here, 'rb/outputs', n), 'utf8');
    [['b1_develop.txt', ['in ' + D.B.compile_s + 's', 'real ' + D.B.real_s, D.W.cp314.replace(/\.whl$/, '')]], ['b3_wheel.txt', [D.B.wheel]], ['b4_wheel_files.txt', D.B.files.map(x => x[1] + '').concat([D.B.files.length + ' files'])],
     ['b5_abi3.txt', [D.W.abi3]], ['b6_abi3_install.txt', D.W.abi3_loaded.map(v => 'Python ' + v + ' loads tokrs.abi3.so -> 3')], ['b7_abi3t.txt', [D.W.abi3t]], ['b8_abi3t_install.txt', D.W.abi3t_loaded.map(([v, g]) => 'Python ' + v + ' GIL enabled: ' + (g ? 'True' : 'False') + ' loads')]]
      .forEach(([f, xs]) => xs.forEach(x => { if (!rd(f).includes(String(x))) problems.push(`${tag}: ${f} lacks "${x}"`) }));
  }
  await audit('end');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file);
  for (const id of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || r[1] !== 'step 1 of ' + r[1].split(' of ')[1]) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  for (const [card, ctl] of ANIMS) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval(`#${ctl}-p`, e => e.textContent); if (/Pause/.test(r)) problems.push(`reduced motion: ${card} moved by itself`) }
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
