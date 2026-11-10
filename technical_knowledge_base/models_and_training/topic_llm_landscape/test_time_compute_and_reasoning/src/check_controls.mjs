// node <page>/src/check_controls.mjs <index.html>   (run from the repo root)
// Clicks every button, moves every range to min, mid and max, opens every <details>, in 390 px dark and 920 px light;
// fails on page or console errors, a visible #jsErr, sideways scroll, or NaN/undefined/Infinity in a tab's text.
// Also checks (2026-11-10, the autoplay rule) that every 3D stage plays by itself once scrolled into view under normal motion and never moves under reduced motion.
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
    // a pass before this one saved its last tab; start every pass on the Reading tab
    await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto('file://' + path.resolve(process.argv[2]));
    for (const id of ['stg-sp', 'stg-sel', 'stg-prm', 'stg-lp']) {
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await new Promise(r => setTimeout(r, 2200));
      const f = await p.$eval('#' + id, e => +e.dataset.frames || 0);
      if (motion === 'reduce' && f > 0) errs.push(id + ' moved by itself under reduced motion');
      if (motion !== 'reduce' && !(f > 0)) errs.push(id + ' did not play when scrolled into view');
    }
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
