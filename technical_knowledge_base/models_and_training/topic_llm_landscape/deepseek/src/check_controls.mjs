// node <page>/src/check_controls.mjs <page>/index.html  (run from the repository root)
// Clicks every button, sets every range and select in every tab, opens every closed block, in 390 px dark and 920 px light;
// fails on page or console errors, a visible #jsErr, sideways scroll, or NaN / undefined / Infinity in the tab text.
import { createRequire } from 'node:module'; import path from 'node:path';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
let bad = 0;
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + path.resolve(process.argv[2]));
  for (const t of await p.$$eval('button[data-t]', bs => bs.map(b => b.dataset.t))) {
    await p.click(`button[data-t=${t}]`);
    const n = await p.evaluate(async id => {
      const root = document.getElementById(id); let k = 0;
      root.querySelectorAll('details').forEach(d => d.open = true);
      for (const s of root.querySelectorAll('select')) for (const o of [...s.options]) { s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); k++; }
      for (const r of root.querySelectorAll('input[type=range]')) for (const v of [r.min, r.max, r.defaultValue]) { r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true })); k++; }
      for (const c of root.querySelectorAll('input[type=checkbox]')) { c.click(); c.click(); k += 2; }
      for (const bt of [...root.querySelectorAll('button')]) { if (bt.isConnected) { bt.click(); k++; } }
      for (const g of root.querySelectorAll('svg g[data-i], svg g[tabindex]')) { g.dispatchEvent(new MouseEvent('click', { bubbles: true })); k++; }
      return k;
    }, t);
    const txt = await p.$eval('#' + t, el => el.innerText);
    const m = txt.match(/[^]{0,80}\b(NaN|undefined|Infinity)\b[^]{0,80}/);
    const side = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    if (m || side) errs.push(`${t} ${scheme} ${width}: ${m ? m[0] : ''} ${side ? 'sideways' : ''}`);
    console.log(scheme, width, t, 'controls exercised', n);
  }
  const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) errs.push(box);
  console.log(scheme, width, errs.length ? errs : 'clean'); bad += errs.length; await p.close();
}
// reduced motion: nothing on the page animates by itself (no rAF loop or timer chain running after load)
{ const p = await b.newPage(); await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.evaluateOnNewDocument(() => { window.__raf = 0; const r = window.requestAnimationFrame; window.requestAnimationFrame = f => { window.__raf++; return r(f) }; });
  await p.goto('file://' + path.resolve(process.argv[2])); await new Promise(r => setTimeout(r, 1500));
  const a = await p.evaluate(() => window.__raf); await new Promise(r => setTimeout(r, 1500)); const c = await p.evaluate(() => window.__raf);
  console.log('animation frames requested after load:', c - a, c - a ? 'MOVING' : 'still'); if (c - a) bad++; await p.close(); }
await b.close(); process.exit(bad ? 1 : 0);
