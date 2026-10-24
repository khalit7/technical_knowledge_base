// node <page>/src/check_controls.mjs <index.html>   (run from the repo root)
// Clicks every button, moves every range to min, mid and max, opens every <details>, in 390 px dark and 920 px light;
// fails on page or console errors, a visible #jsErr, sideways scroll, or NaN/undefined/Infinity in a tab's text.
// Also checks, under reduced motion and normal motion, that no animation advances before the reader acts.
import { createRequire } from 'node:module'; import path from 'node:path';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
let bad = 0;
try {
  for (const [scheme, width, motion] of [['dark', 390, 'reduce'], ['light', 920, 'no-preference']]) {
    const p = await b.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
    await p.setViewport({ width, height: 900 });
    await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: motion }]);
    await p.goto('file://' + path.resolve(process.argv[2]));
    await p.evaluate(() => { for (const id of ['ttcSp', 'ttcLp']) document.getElementById(id).scrollIntoView(); });
    const read = () => p.evaluate(() => ['ttcSpScrub', 'ttcLpScrub', 'ttcPrmCtl-s'].map(i => +document.getElementById(i).value));
    const s0 = await read(); await new Promise(r => setTimeout(r, 2500)); const s1 = await read();
    // first step only: 0, or its end state (100) under reduced motion, which draws without tweening
    if (s0.join() !== s1.join() || s1.some(v => v > 100)) errs.push('animation moved before the reader acted: ' + s0 + ' then ' + s1);
    for (const t of await p.$$eval('button[data-t]', bs => bs.map(b => b.dataset.t))) {
      await p.click(`button[data-t=${t}]`); await new Promise(r => setTimeout(r, 200));
      await p.evaluate(t => {
        const tab = document.getElementById(t);
        tab.querySelectorAll('details').forEach(d => d.open = true);
        tab.querySelectorAll('button').forEach(x => { for (let i = 0; i < 6; i++) x.click(); });
        tab.querySelectorAll('input[type=range]').forEach(r => { for (const v of [r.min, (+r.min + +r.max) / 2, r.max, r.defaultValue]) { r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); } });
        tab.querySelectorAll('select').forEach(s => { s.value = s.options[s.options.length - 1].value; s.dispatchEvent(new Event('change', { bubbles: true })); });
      }, t);
      await new Promise(r => setTimeout(r, 300));
      const txt = await p.$eval('#' + t, el => el.innerText);
      const m = txt.match(/.{0,40}\b(NaN|undefined|Infinity)\b.{0,40}/);
      const side = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      if (m || side) errs.push(`${t}: ${m ? m[0] : ''} ${side ? 'sideways scroll' : ''}`);
    }
    const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) errs.push(box);
    console.log(scheme, width, motion, errs.length ? errs : 'clean'); bad += errs.length; await p.close();
  }
} finally { await b.close(); }
process.exit(bad ? 1 : 0);
