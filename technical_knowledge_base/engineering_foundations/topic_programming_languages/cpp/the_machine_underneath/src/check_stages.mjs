// The 2026-11-06 rollout checks: every 3D stage and every 2D animation plays by itself once scrolled into view, steps to its last step,
// has one step-list item per step, never moves under reduced motion; no errors, NaN, undefined or sideways scroll; split layout at 1400 px.
// usage (from the repo root or src/): node src/check_stages.mjs [shots dir]   (needs html_utils' node_modules)
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../../html_utils/package.json'));
// (C++: the machine underneath: adapted from the classes sibling; five stages (the cache ladder, AoS against SoA, SIMD schedules, message passing, false sharing),
//  two autoplaying 2D steppers (the measured ladder, the cache model); the step lists' numbers are checked against the page's own data, window.CB)
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
(await import('node:fs')).mkdirSync(shots, { recursive: true });
const STAGES = ['stg-mem', 'stg-aos', 'stg-simd', 'stg-mo', 'stg-fs'];
// [card, controls, {mode: step list}, mode buttons, data attribute]
const ANIMS = [['cb-ld-card', 'cb-ld-ctl', { ladder: 'sx-ld' }, null, null], ['cb-cm-card', 'cb-cm-ctl', { rc: 'sx-rc' }, null, null]];
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
  await p.evaluate(() => window.scrollTo(0, document.getElementById('cb-s11').getBoundingClientRect().top + scrollY)); await wait(800);
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
  { // the numbers written into the step lists are the page's own data (window.CB) or the page's cache model (window.CB_RC)
    const r = await p.evaluate(() => { const out = [], D = CB;
      const txt = id => document.getElementById(id).textContent.replace(/\s+/g, ' ');
      const need = (id, xs) => xs.forEach(x => { if (!txt(id).includes(String(x))) out.push(id + ' lacks "' + x + '"') });
      const R = D.ladder.random, S = D.ladder.seq, at = (run, i) => run.pts[i][1];
      // the ladder stage and stepper: the latencies, the spread of the three runs, the address-order range
      need('sx-mem', [at(R[0], 4).toFixed(2), at(R[0], 16).toFixed(2), at(R[0], 34).toFixed(2), at(S[0], 34).toFixed(2)]);
      const sp = R[0].pts.map((_, i) => { const v = R.map(r => at(r, i)); return (Math.max(...v) - Math.min(...v)) / Math.min(...v) }), kb = R[0].pts.map(p => p[0]);
      const outside = sp.filter((v, i) => kb[i] < 2048 || kb[i] > 16384); if (Math.max(...outside) > .085) out.push('ladder spread outside 2 to 16 MB is ' + Math.max(...outside).toFixed(3));
      const mx = Math.max(...sp); need('sx-ld', ['up to ' + Math.round(mx * 100) + '% (at ' + (kb[sp.indexOf(mx)] / 1024) + ' MB)']);
      const dr = S.flatMap(r => r.pts.filter(p => p[0] >= 65536).map(p => p[1])); need('sx-ld', [Math.min(...dr).toFixed(1) + ' to ' + Math.max(...dr).toFixed(1) + ' ns from 64 MB']);
      if (Math.max(...S.flatMap(r => r.pts.filter(p => p[0] <= 6144).map(p => p[1]))) >= 2.1) out.push('address order is not under about 2 ns up to 6 MB');
      // the cache model's states at each stretch
      const M = window.CB_RC, st = M.STR.map(([m, j]) => M.SIM[m][j]), li = [...document.querySelectorAll('#sx-rc li')].map(l => l.textContent);
      const fmt = n => n.toLocaleString('en-US');
      [[1, st[1].misses === 1 && st[1].used.size === 32], [2, st[2].misses === 16], [3, st[3].misses === 8 && st[3].used.size * 4 === 32], [4, st[4].misses === 16], [5, st[5].misses === 32], [6, st[6].misses === 512 && st[6].used.size * 4 === 2048]].forEach(([i, ok]) => { if (!ok) out.push('cache model state ' + (i + 1) + ' does not match its step') });
      if (!li[6].includes(fmt(st[6].misses * 128) + ' bytes moved to use ' + fmt(st[6].used.size * 4))) out.push('sx-rc step 7 bytes');
      if (!li[2].includes(fmt(st[2].misses * 128) + ' bytes moved')) out.push('sx-rc step 3 bytes');
      // AoS against SoA: 4 records of 32 bytes per 128-byte line, 32 records
      need('sx-aos', ['8 lines fetched, 1,024 bytes moved to use 128', '(12.5%)', D.aos.v.i_aos.runs[0].toFixed(3), D.aos.v.i_soa.runs[0].toFixed(3), D.aos.v.a_aos.runs[0].toFixed(2), D.aos.v.a_soa.runs[0].toFixed(2)]);
      if (!/sizeof\(Token\) = 32 bytes/.test(D.aos.raw)) out.push('Token is not 32 bytes');
      // SIMD: the block's sum and the cycle counts of the three schedules
      let s = 0; for (let i = 0; i < 16; i++) s += ((i % 17) / 4) * ((i % 13) / 2);
      need('sx-simd', [String(s), '64 cycles', '52 cycles', '16 for this lone block', D.dot.v.l1_scalar.runs[0].toFixed(2), D.dot.v.l1_auto.runs[0].toFixed(2), D.dot.v.l1_neon.runs[0].toFixed(3)]);
      // message passing and false sharing
      need('sx-mo', [String(D.litmus.v.relaxed.runs[0]), D.litmus.v.trials.runs[0].toLocaleString('en-US')]);
      need('sx-fs', [D.fs.v.one.runs[0].toLocaleString('en-US'), D.fs.v.b8.runs[0].toLocaleString('en-US'), D.fs.v.b64.runs[0].toLocaleString('en-US'), D.fs.v.b128.runs[0].toLocaleString('en-US'), Math.round(D.fs.v.b8.runs[0] / D.fs.v.one.runs[0]) + ' times']);
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`)); }
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
