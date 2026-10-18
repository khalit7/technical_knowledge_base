// node src/check_controls.mjs <index.html>  (run from the repo root; puppeteer from html_utils)
// Clicks every control of every tab at 390 px dark and 920 px light; fails on page or console errors, a visible
// #jsErr, sideways scroll, or NaN / undefined / Infinity in a tab's text. Then checks reduced motion: no autoplay.
import { createRequire } from 'node:module'; import path from 'node:path';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const file = 'file://' + path.resolve(process.argv[2]);
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
let bad = 0;
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function sweep(p, t) {
  await p.click(`button[data-t=${t}]`); await sleep(150);
  await p.evaluate(async (t) => {
    const tab = document.getElementById(t), wait = ms => new Promise(r => setTimeout(r, ms));
    const fire = (el, ev) => el.dispatchEvent(new Event(ev, { bubbles: true }));
    for (const btn of [...tab.querySelectorAll('button')]) { if (btn.closest('.an-ctl') && /Play|Pause/.test(btn.textContent)) continue; btn.click(); await wait(5); }
    for (const r of [...tab.querySelectorAll('input[type=range]')]) { for (const v of [r.min, r.max, (+r.min + +r.max) / 2]) { r.value = v; fire(r, 'input'); await wait(5); } }
    for (const s of [...tab.querySelectorAll('select')]) { for (const o of [...s.options]) { s.value = o.value; fire(s, 'change'); await wait(5);
      for (const btn of [...tab.querySelectorAll('.tzd-opts button')].slice(0, 1)) btn.click(); } }
    for (let i = 0; i < 12; i++) { const n = document.getElementById('tzd-next'); if (t === 't-drill' && n) { n.click(); tab.querySelector('.tzd-opts button')?.click(); } }
    for (const btn of [...tab.querySelectorAll('.an-ctl button')]) if (/Play/.test(btn.textContent)) { btn.click(); await wait(30); btn.click(); }
  }, t);
  await sleep(200);
}
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await sleep(300);
  for (const t of await p.$$eval('button[data-t]', bs => bs.map(x => x.dataset.t))) {
    await sweep(p, t);
    const txt = await p.$eval('#' + t, el => el.innerText);
    const m = txt.match(/\bNaN\b|\bundefined\b|\bInfinity\b/);
    const side = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    if (m || side) errs.push(`${t} ${scheme} ${width}: ${m ? 'found ' + m[0] : ''} ${side ? 'sideways scroll' : ''}`);
  }
  const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) errs.push(box);
  console.log(scheme, width, errs.length ? errs : 'clean'); bad += errs.length; await p.close();
}
const p = await b.newPage();
await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
await p.setViewport({ width: 920, height: 900 }); await p.goto(file); await sleep(300);
await p.evaluate(() => document.getElementById('tz-trn').scrollIntoView()); await sleep(2500);
const playing = await p.$$eval('.an-play', bs => bs.filter(x => /Pause/.test(x.textContent)).length);
console.log('reduced motion: animations playing =', playing); if (playing) bad++;
await p.close(); await b.close();
process.exit(bad ? 1 : 0);
