// Drive every control of the built page in headless Chrome: no script errors, no NaN or undefined in any text, no sideways scroll;
// element screenshots in ../.shots/.
// usage (from the repo root or the page folder): node src/check_page.mjs [light|dark] [width] [--testbed]
//   no arguments: 1400 light, 920 light and 390 dark, then reduced motion; --testbed also runs every testbed figure (slow, about a minute).
// Motion (Khalid, 2026-11-06): every 3D stage plays by itself once scrolled into view (its data-frames rises), stepping forward reaches
// "step n of n", its step list has one item per step, and under prefers-reduced-motion nothing moves by itself.
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const args = process.argv.slice(2), testbed = args.includes('--testbed'), pos = args.filter(a => !a.startsWith('--'));
const configs = pos.length ? [[pos[0] || 'light', +(pos[1] || 920)]] : [['light', 1400], ['light', 920], ['dark', 390]];
const out = path.resolve(here, '../.shots'), file = 'file://' + path.resolve(here, '../index.html');
fs.mkdirSync(out, { recursive: true });
const wait = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const errs = []; let actions = 0; const facts = {};
// the numbers the step lists quote, recomputed from the page's own engine in the page
const expect = () => {
  const B = window.BX, r = {}, T = B.banditTable(3);
  const ST = { greedy: { kind: 'greedy' }, eps: { kind: 'eps', eps: 0.1 }, opt: { kind: 'greedy', q0: 5, alpha: 0.1 }, ucb: { kind: 'ucb', c: 2 }, ts: { kind: 'ts' } };
  for (const k in ST) { const h = B.banditRun(T, ST[k]); r['bd ' + k] = [5, 30, 100, 300].map(c => h[c - 1].N.join(',') + ' reg ' + h[c - 1].reg.toFixed(1)) }
  for (const m of ['eps', 'cnt', 'opt']) { const h = B.gxRun(m, 1, 500, true);
    r['gx ' + m] = [1, 10, 50, 200, 500].map(c => { const x = h[c - 1]; let s = 0; for (const v of x.N) if (v) s++; return 'ep ' + c + ': steps ' + (x.path.length - 1) + ' end ' + x.end + ' cells ' + s + ' +1 ' + x.nBig + ' first ' + (x.first + 1) }) }
  return r };
const want = {
  'bd greedy': ['5,0,0,0,0 reg 6.5', '30,0,0,0,0 reg 39.0', '100,0,0,0,0 reg 130.0', '300,0,0,0,0 reg 390.0'],
  'bd eps': ['5,0,0,0,0 reg 6.5', '30,0,0,0,0 reg 39.0', '43,37,0,20,0 reg 74.4', '46,42,2,208,2 reg 86.4'],
  'bd opt': ['1,1,1,1,1 reg 4.6', '6,7,4,7,6 reg 24.3', '13,27,12,28,20 reg 71.2', '20,40,15,198,27 reg 98.8'],
  'bd ucb': ['1,1,1,1,1 reg 4.6', '6,5,1,16,2 reg 14.0', '12,12,5,60,11 reg 41.0', '15,16,6,250,13 reg 50.6'],
  'bd ts': ['1,2,1,0,1 reg 5.1', '3,20,2,2,3 reg 20.4', '4,33,2,57,4 reg 29.1', '5,36,3,250,6 reg 35.6'],
  'gx eps': ['ep 1: steps 39 end 1 cells 11 +1 0 first 0', 'ep 10: steps 4 end 1 cells 16 +1 0 first 0', 'ep 50: steps 4 end 1 cells 31 +1 0 first 0', 'ep 200: steps 4 end 1 cells 37 +1 0 first 0', 'ep 500: steps 4 end 1 cells 64 +1 1 first 493'],
  'gx cnt': ['ep 1: steps 56 end 1 cells 6 +1 0 first 0', 'ep 10: steps 60 end 0 cells 19 +1 0 first 0', 'ep 50: steps 60 end 0 cells 48 +1 0 first 0', 'ep 200: steps 19 end 2 cells 85 +1 83 first 65', 'ep 500: steps 27 end 2 cells 95 +1 367 first 65'],
  'gx opt': ['ep 1: steps 42 end 1 cells 26 +1 0 first 0', 'ep 10: steps 60 end 0 cells 66 +1 1 first 8', 'ep 50: steps 53 end 2 cells 98 +1 10 first 8', 'ep 200: steps 13 end 2 cells 98 +1 153 first 8', 'ep 500: steps 13 end 2 cells 98 +1 453 first 8'] };
for (const [scheme, width] of configs) {
  const tag = scheme + ' ' + width, p = await b.newPage();
  p.on('pageerror', e => errs.push(tag + ': ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(tag + ': ' + m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) {} }); await p.goto(file);
  const bad = async where => { const t = await p.evaluate(() => [...document.querySelectorAll('.tab:not([hidden])')].map(x => x.innerText).join(' ')); const m = t.match(/.{0,40}\b(NaN|undefined|Infinity)\b.{0,40}/g); if (m) errs.push(tag + ' ' + where + ': ' + m.slice(0, 3).join(' | '));
    if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) errs.push(tag + ' ' + where + ': sideways scroll') };
  const shot = async (sel, name) => { const el = await p.$(sel); if (el) await el.screenshot({ path: path.join(out, name + '-' + scheme + '-' + width + '.png') }) };
  const clk = async sel => { await p.$eval(sel, e => e.click()); actions++ };
  if (width === 1400) { const e = await p.evaluate(expect); for (const k in want) if (JSON.stringify(e[k]) !== JSON.stringify(want[k])) errs.push('step-list numbers changed: ' + k + ' ' + JSON.stringify(e[k])) }
  // split layout at 1400: two columns where a section has a visual
  if (width >= 1100) { const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display)); if (cols.some(d => d !== 'grid')) errs.push(tag + ': a split is not two columns: ' + cols) }
  // static figures drawn
  for (const id of ['ab-S', 'ab-R', 'wt-P', 'bd-A', 'bd-R']) { const n = await p.evaluate(i => document.querySelectorAll('#' + i + ' svg').length, id); if (!n) errs.push(tag + ': ' + id + ' not drawn') }
  // 3D stages: autoplay on view, step to the end, list length, every list item, mid-step screenshots
  for (const id of await p.$$eval('#t-read .stg', xs => xs.map(x => x.id))) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2200);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) errs.push(`${tag}: ${id} did not play when scrolled into view`);
    if (!(await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent)))) { const st = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (!/step [2-9]/.test(st)) errs.push(`${tag}: ${id} is not playing (${st})`) }
    const modes = id === 'stg-gx' ? ['eps', 'cnt', 'opt'] : [null];
    for (const m of modes) {
      if (m) { await clk(`#gx-M button[data-m=${m}]`); await wait(300) }
      const n = await p.$eval(`#${id} .stg-r`, e => +e.max + 1);
      const lis = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return l ? l.children.length : 0 });
      if (lis !== n) errs.push(`${tag}: ${id} ${m || ''} has ${n} steps but ${lis} list items`);
      await clk(`#${id}-b`); for (let k = 0; k < n + 1; k++) await clk(`#${id}-f`);
      await wait(2800); const shown = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (shown !== `step ${n} of ${n}`) errs.push(`${tag}: ${id} ${m || ''} ended on "${shown}"`);
      for (let k = 0; k < n; k++) { await p.evaluate((id, k) => document.getElementById(id).closest('.s3sp').querySelector('ol.sx:not([hidden])').children[k].click(), id, k); actions++; await bad(id + ' ' + (m || '') + ' step ' + (k + 1)) }
      const mid = Math.floor((n - 1) / 2);
      await p.evaluate((id, k) => document.getElementById(id).closest('.s3sp').querySelector('ol.sx:not([hidden])').children[k].click(), id, mid); await wait(200);
      await shot('#' + id, id + (m ? '-' + m : '') + '-mid');
      await p.evaluate((id, k) => document.getElementById(id).closest('.s3sp').querySelector('ol.sx:not([hidden])').children[k].click(), id, n - 1); await wait(200);
      await shot('#' + id, id + (m ? '-' + m : '') + '-last');
      // the stopped stage stays stopped
      const f0 = await p.$eval('#' + id, e => +e.dataset.frames || 0); await wait(1500); if ((await p.$eval('#' + id, e => +e.dataset.frames || 0)) !== f0) errs.push(`${tag}: ${id} kept moving after a reader control`) }
    // play from the start by the button
    await clk(`#${id}-b`); const f0 = await p.$eval('#' + id, e => +e.dataset.frames || 0); await clk(`#${id}-p`); await wait(1200);
    if ((await p.$eval('#' + id, e => +e.dataset.frames || 0)) <= f0) errs.push(`${tag}: ${id} did not animate on play`); await clk(`#${id}-p`) }
  // weights slider over its range
  await p.$eval('#wt', e => e.scrollIntoView());
  for (const v of ['0.02', '0.1', '0.33', '0.5']) { await p.evaluate(v => { const s = document.getElementById('wt-a'); s.value = v; s.dispatchEvent(new Event('input')) }, v); actions++; await bad('wt ' + v) }
  await shot('#wt', 'wt'); await shot('#ab', 'ab');
  // the pull-by-pull explorer: every strategy at several pulls, both buttons, two seeds
  await p.$eval('#bd', e => e.scrollIntoView());
  for (const k of ['greedy', 'eps', 'opt', 'ucb', 'ts']) { await clk(`#bd-M button[data-k=${k}]`);
    for (const v of [0, 1, 7, 60, 300]) { await p.evaluate(v => { const s = document.getElementById('bd-C-s'); s.value = v; s.dispatchEvent(new Event('input')) }, v); actions++; await bad('bd ' + k + ' ' + v) }
    await clk('#bd-C-b'); await clk('#bd-C-f');
    if (k === 'ts' || k === 'ucb') { await p.evaluate(() => { const s = document.getElementById('bd-C-s'); s.value = 40; s.dispatchEvent(new Event('input')) }); await shot('#bd', 'bd-' + k) } }
  for (const sd of ['1', '5', '3']) { await p.select('#bd-S', sd); actions++; await bad('bd seed ' + sd) }
  // regret chart
  await p.$eval('#rg', e => e.scrollIntoView()); await p.waitForFunction(() => /Arms/.test(document.getElementById('rg-X').textContent), { timeout: 120000 });
  await bad('rg close'); await shot('#rg', 'rg-close'); facts.rgN = await p.evaluate(() => document.getElementById('rg-N').innerText.replace(/\n+/g, ' / '));
  await clk('#rg-pre button[data-p=far]'); await p.waitForFunction(() => /0\.9, 0\.8/.test(document.getElementById('rg-X').textContent), { timeout: 120000 }); await bad('rg far');
  facts.rgF = await p.evaluate(() => document.getElementById('rg-N').innerText.replace(/\n+/g, ' / '));
  if (width === 920) { await p.select('#rg-runs', '50'); actions++; await p.waitForFunction(() => /50 runs/.test(document.getElementById('rg-X').textContent), { timeout: 120000 }); await bad('rg far 50') }
  facts.gxY = await p.evaluate(() => document.getElementById('gx-Y').innerText.replace(/\n+/g, ' / '));
  await p.evaluate(() => scrollTo(0, 0)); await shot('#t-read .s3sp', 'top');
  // testbed tab: Fig 2.2 at 200 tasks always; every figure with --testbed
  await clk('button[data-t=t-test]'); await wait(200); await p.select('#tb-runs', '200');
  for (const f of testbed ? ['f22', 'f23', 'f24', 'f25', 'f26', 'fall', 'fns'] : ['f22', 'f26']) { await clk(`#tb-fig button[data-f=${f}]`);
    await p.waitForFunction(() => /^Done/.test(document.getElementById('tb-stat').textContent), { timeout: 300000 }); await wait(100);
    await bad('tb ' + f); facts['tb ' + f] = await p.evaluate(() => document.getElementById('tb-repro').innerText); await shot('#t-test', 'tb-' + f) }
  if (width >= 1100) { const d = await p.$eval('#t-test .s3sp', x => getComputedStyle(x).display); if (d !== 'grid') errs.push(tag + ': testbed split not two columns') }
  await clk('button[data-t=t-more]'); await bad('more');
  const box = await p.evaluate(() => { const d = document.getElementById('jsErr'); return d && !d.hidden ? d.textContent : '' }); if (box) errs.push(tag + ' errbox: ' + box);
  await p.close() }
{ // reduced motion: no stage moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file);
  for (const id of await p.$$eval('#t-read .stg', xs => xs.map(x => x.id))) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    if ((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0) errs.push(`reduced motion: ${id} moved by itself`);
    if ((await p.$eval(`#${id} .stg-st`, e => e.textContent)) !== 'step 1 of ' + (await p.$eval(`#${id} .stg-r`, e => +e.max + 1))) errs.push(`reduced motion: ${id} advanced by itself`) }
  await p.close() }
await b.close();
console.log(JSON.stringify({ actions, errs, facts }, null, 1));
if (errs.length) process.exitCode = 1;
