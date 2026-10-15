// Click every control of every tab at 390 dark and 920 light; report errors, NaN/undefined, sideways scroll;
// screenshot each card into <shots dir>; compare the page's JavaScript formulas with out/recompute.json.
// usage: NPM_CONFIG_USERCONFIG=<empty file> node src/check_page.mjs <index.html> <shots dir>
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const here = path.dirname(new URL(import.meta.url).pathname);
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const [file, shots] = process.argv.slice(2);
fs.mkdirSync(shots, { recursive: true });
const RC = JSON.parse(fs.readFileSync(path.join(here, 'out/recompute.json'), 'utf8'));
const b = await puppeteer.launch({ headless: 'shell' });
let fails = 0;
const fail = m => { fails++; console.log('FAIL', m) };
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + path.resolve(file));
  const tabs = await p.$$eval('#tabs button', bs => bs.map(x => x.dataset.t));
  for (const t of tabs) {
    await p.click(`#tabs button[data-t=${t}]`); await new Promise(r => setTimeout(r, 150));
    // click buttons (not tab bar), step every animation control, change every select and range
    const n = await p.evaluate(async t => {
      const root = document.getElementById(t); let k = 0; const wait = ms => new Promise(r => setTimeout(r, ms));
      for (const bt of [...root.querySelectorAll('button')]) { if (bt.offsetParent === null) continue; bt.click(); k++; await wait(5) }
      for (const s of [...root.querySelectorAll('select')]) { for (const o of [...s.options]) { s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); k++; await wait(5) } }
      for (const r of [...root.querySelectorAll('input[type=range]')]) { for (const v of [r.min, r.max, Math.round((+r.min + +r.max) / 2)]) { r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); k++; await wait(5) } }
      for (const c of [...root.querySelectorAll('input[type=checkbox]')]) { c.click(); k++; await wait(5); c.click() }
      for (const tr of [...root.querySelectorAll('tr[data-row]')].slice(0, 9)) { tr.click(); k++ }
      return k
    }, t);
    // the Roofline lab: visit each mode
    if (t === 't-roof') for (const m of ['layer', 'dec', 'run', 'own']) await p.evaluate(m => window.TQ_ROOF.setMode(m), m);
    const bad = await p.evaluate(t => { const s = document.getElementById(t).innerText; const m = s.match(/.{0,40}(NaN|undefined|Infinity).{0,40}/); return m ? m[0] : '' }, t);
    if (bad) fail(`${scheme} ${t}: text "${bad}"`);
    const sw = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    if (sw) fail(`${scheme} ${width} ${t}: sideways scroll`);
    console.log(scheme, width, t, 'controls exercised', n);
  }
  // screenshots of cards (after reset to defaults)
  await p.reload(); await new Promise(r => setTimeout(r, 300));
  for (const t of tabs) {
    await p.click(`#tabs button[data-t=${t}]`); await new Promise(r => setTimeout(r, 200));
    const ids = await p.$$eval(`#${t} .tq-card, #${t} .tw, #${t} .tq-svg`, es => es.filter(e => e.offsetParent && e.id).map(e => e.id));
    for (const id of ids) { const el = await p.$('#' + id); try { await el.screenshot({ path: `${shots}/${scheme}-${width}-${id}.png` }) } catch (e) { } }
  }
  if (errs.length) fail(`${scheme}: errors ${errs.join(' | ')}`);
  const box = await p.evaluate(() => { const d = document.getElementById('jsErr'); return d && !d.hidden ? d.textContent : '' });
  if (box) fail('error box: ' + box);
  // formulas against recompute.json (only once)
  if (scheme === 'light') {
    const r = await p.evaluate(() => {
      const U = window.TQU, G = U.G, o = {};
      o.bcrit = Object.fromEntries(U.GEN_ORDER.map(k => [k, [G[k].bf16 / G[k].bw, G[k].bf16 / G[k].bw / 2]]));
      o.tiles = U.D.rc.tiles.map(t => U.hbmTile(t[1], t[2]).padded / (t[1] * t[2]));
      o.mxu = U.D.rc.mxu.map(t => [U.mxuUtil(t[1], t[2], t[3], 128), U.mxuUtil(t[1], t[2], t[3], 256)]);
      o.bf16 = U.D.rc.bf16_vals.map(v => U.bf16(v[0]));
      o.split = Object.fromEntries(Object.keys(U.D.rc.split).map(k => [k, U.split3(+k)]));
      o.decode = Object.fromEntries(U.GEN_ORDER.map(k => [k, Object.fromEntries([1, 16, 64, 240].map(B => [B, U.decode(G[k], B, 2048, 1, 2).step]))]));
      o.walk = Object.fromEntries(U.GEN_ORDER.map(k => [k, [1, 8, 32, 128, 256, 512, 1024, 4096].map(B => { const m = U.mm(1, B, 4096, 11008); return U.bound(m.fl, m.by, G[k].bf16, G[k].bw).t })]));
      return o
    });
    const close = (a, b, w) => { if (Math.abs(a - b) > 1e-9 * Math.max(1, Math.abs(b))) fail(`${w}: page ${a} vs recompute ${b}`) };
    for (const k in r.bcrit) { close(r.bcrit[k][0], RC.bcrit[k][0], 'bcrit ' + k); close(r.bcrit[k][1], RC.bcrit[k][1], 'bcrit int8 ' + k) }
    r.tiles.forEach((v, i) => close(v, RC.tiles[i][3], 'tile ' + RC.tiles[i][0]));
    r.mxu.forEach((v, i) => { close(v[0], RC.mxu[i][4], 'mxu128 ' + RC.mxu[i][0]); close(v[1], RC.mxu[i][5], 'mxu256 ' + RC.mxu[i][0]) });
    r.bf16.forEach((v, i) => close(v, RC.bf16_vals[i][1], 'bf16 ' + RC.bf16_vals[i][0]));
    for (const k in r.split) r.split[k].forEach((v, i) => close(v, RC.split[k][i], 'split ' + k));
    for (const k in r.decode) for (const B in r.decode[k]) close(r.decode[k][B], RC.decode[k][B].step, `decode ${k} B=${B}`);
    for (const k in r.walk) r.walk[k].forEach((v, i) => close(v, RC.walk[k][i][3], `walk ${k} ${i}`));
    console.log('formula checks done');
  }
  await p.close();
}
await b.close();
console.log('fails', fails);
process.exit(fails ? 1 : 0);
