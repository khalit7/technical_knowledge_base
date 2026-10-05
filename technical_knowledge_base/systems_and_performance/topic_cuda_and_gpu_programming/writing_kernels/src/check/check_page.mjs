// Click every control of the page at 390 px dark and 920 px light; report errors, NaN, undefined and sideways scroll;
// save element screenshots to <out dir>. Usage (from the repo root):
//   node <page>/src/check/check_page.mjs <page folder> <out dir>
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
const require = createRequire(path.resolve('html_utils/package.json'));
const puppeteer = require('puppeteer');
const dir = process.argv[2], out = process.argv[3] || path.join(dir, '.shots');
fs.mkdirSync(out, { recursive: true });
const url = 'file://' + path.resolve(dir, 'index.html');
const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
let problems = 0;
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.setViewport({ width, height: 900 });
  await page.goto(url, { waitUntil: 'load' });
  const tabs = await page.$$eval('#tabs button', bs => bs.map(b => b.dataset.t));
  for (const t of tabs) {
    await page.click(`#tabs button[data-t="${t}"]`);
    await new Promise(r => setTimeout(r, 150));
    // every segmented button, predict option, step and play button, select and range in this tab
    const n = await page.evaluate(async (t) => {
      const root = document.getElementById(t); let c = 0;
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      for (const b of root.querySelectorAll('.seg button, .opts button, .bn-codesel button')) { b.click(); c++; await sleep(20);
        for (const f of root.querySelectorAll('.an-ctl button[aria-label="Next step"]')) for (let i = 0; i < 12; i++) { f.click(); await sleep(5); } }
      for (const r of root.querySelectorAll('input[type=range]')) { for (const v of [r.min, r.max, (+r.min + +r.max) / 2]) { r.value = v; r.dispatchEvent(new Event('input')); c++; await sleep(10); } }
      for (const p of root.querySelectorAll('.an-ctl button.an-play')) { p.click(); await sleep(60); p.click(); c++; }
      for (const b of root.querySelectorAll('.an-ctl button[aria-label="Previous step"]')) { b.click(); c++; }
      for (const s of root.querySelectorAll('.an-ctl select')) { s.value = '2'; s.dispatchEvent(new Event('change')); c++; }
      for (const d of root.querySelectorAll('details')) { d.open = true; }
      return c;
    }, t);
    const bad = await page.evaluate((t) => {
      const txt = document.getElementById(t).innerText;
      const ok = ['with NaN before', ') = NaN', 'or NaN to flag'];
      const m = (txt.match(/.{0,30}(NaN|undefined|Infinity).{0,30}/g) || []).filter(x => !ok.some(o => x.includes(o)));
      return { m, side: document.documentElement.scrollWidth > window.innerWidth + 1 };
    }, t);
    if (bad.m.length || bad.side) { problems++; console.log('PROBLEM', scheme, width, t, JSON.stringify(bad)); }
    // element shots
    const els = await page.$$(`#${t} .card, #${t} .rd-fig, #${t} .bars, #${t} table`);
    let k = 0;
    for (const e of els.slice(0, 14)) { const bb = await e.boundingBox(); if (!bb || bb.height < 4) continue;
      await e.screenshot({ path: path.join(out, `${t}-${scheme}-${width}-${k++}.png`) }); }
    console.log(scheme, width, t, 'controls', n, 'shots', k);
  }
  if (errs.length) { problems++; console.log('ERRORS', scheme, width, errs.slice(0, 5)); }
  await page.close();
}
await browser.close();
console.log(problems ? `FAIL ${problems}` : 'OK no errors, NaN, undefined or sideways scroll');
