// Reading tab check (CUDA root; adapted from Topic: hardware's): every control clicked at 390 px dark and 920 px light; errors, NaN, undefined, sideways scroll; screenshots per section.
// usage: node src/read/check/check_read.mjs <shots dir>   (run from the repo root; puppeteer comes from html_utils/node_modules)
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../../../../..');
const require = createRequire(path.join(repo, 'html_utils', 'package.json'));
const puppeteer = require('puppeteer');
const page_file = path.resolve(here, '../../../index.html');
const shots = process.argv[2] || path.resolve(here, '../../../.shots');
fs.mkdirSync(shots, { recursive: true });
const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
let bad = 0;
for (const [scheme, w] of [['dark', 390], ['light', 920]]) {
  const p = await browser.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.setViewport({ width: w, height: 900 });
  await p.goto('file://' + page_file);
  await p.evaluate(() => { try { localStorage.clear() } catch (e) {} document.querySelector('#tabs button[data-t="t-read"]').click(); });
  await new Promise(r => setTimeout(r, 300));
  // scroll through so observers fire, then click every button and move every range in the reading tab
  const n = await p.evaluate(async () => {
    const root = document.getElementById('t-read'); let c = 0;
    const secs = [...root.querySelectorAll('section')];
    for (const s of secs) { s.scrollIntoView(); await new Promise(r => setTimeout(r, 60)); }
    const btns = [...root.querySelectorAll('button')];
    for (const b of btns) { if (b.offsetParent === null) continue; b.scrollIntoView({ block: 'center' }); b.click(); c++; await new Promise(r => setTimeout(r, 25)); }
    for (const r of root.querySelectorAll('input[type=range]')) { for (const v of [r.min, r.max, Math.round((+r.min + +r.max) / 2)]) { r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true })); c++; } }
    for (const s of root.querySelectorAll('select')) { for (const o of s.options) { s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); c++; } }
    // second pass over segmented buttons so every mode is drawn with the animations at their last step
    for (const b of root.querySelectorAll('.rd-seg button')) { b.click(); const card = b.closest('.card'); const f = card && card.querySelector('button[aria-label="Next step"]'); if (f) for (let k = 0; k < 14; k++) f.click(); c++; }
    return c;
  });
  const res = await p.evaluate(() => {
    const t = document.getElementById('t-read').innerText;
    const nan = (t.match(/\bNaN\b|undefined|Infinity(?! Fabric| Cache)/g) || []).length;
    const side = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
    const errBox = !document.getElementById('jsErr').hidden;
    return { nan, side, errBox, words: t.split(/\s+/).length };
  });
  console.log(scheme, w, 'controls', n, 'errors', JSON.stringify(errs), 'nan', res.nan, 'sideways', res.side, 'errbox shown', res.errBox, 'words', res.words);
  if (errs.length || res.nan || res.side || res.errBox) bad++;
  const ids = await p.evaluate(() => [...document.querySelectorAll('#t-read section')].map(s => s.id));
  for (const id of ids) {
    const el = await p.$('#' + id);
    await p.evaluate(i => document.getElementById(i).scrollIntoView(), id);
    await new Promise(r => setTimeout(r, 120));
    await el.screenshot({ path: path.join(shots, `read-${id}-${scheme}-${w}.png`) });
  }
  await p.close();
}
await browser.close();
console.log(bad ? 'FAIL' : 'OK');
process.exit(bad ? 1 : 0);
