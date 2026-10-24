// node <page>/src/check_controls.mjs <page>/index.html  (run from the repo root)
// Clicks every button, moves every slider to min, mid and max, picks every select option and toggles every checkbox
// in every tab, at 390 px dark and 920 px light; fails on page errors, a visible #jsErr, sideways scroll or NaN/undefined/Infinity.
import { createRequire } from 'node:module'; import path from 'node:path';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
let bad = 0;
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + path.resolve(process.argv[2]));
  for (const t of await p.$$eval('button[data-t]', bs => bs.map(b => b.dataset.t))) {
    await p.click(`button[data-t=${t}]`);
    await p.evaluate(id => {
      const root = document.getElementById(id); root.querySelectorAll('details').forEach(d => d.open = true);
      const fire = (el, ev) => el.dispatchEvent(new Event(ev, { bubbles: true }));
      root.querySelectorAll('button:not([data-t])').forEach(x => x.click());
      root.querySelectorAll('input[type=range]').forEach(r => { for (const v of [r.min, (+r.min + +r.max) / 2, r.max, r.defaultValue]) { r.value = v; fire(r, 'input'); } });
      root.querySelectorAll('select').forEach(s => { [...s.options].forEach(o => { s.value = o.value; fire(s, 'input'); fire(s, 'change'); }); s.selectedIndex = 0; fire(s, 'input'); });
      root.querySelectorAll('input[type=checkbox]').forEach(c => { c.click(); c.click(); });
      root.querySelectorAll('svg .lnd').forEach(g => g.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    }, t);
    const txt = await p.$eval('#' + t, el => el.innerText);
    if (/\bNaN\b|\bundefined\b|\bInfinity\b/.test(txt)) errs.push(`${t}: NaN/undefined/Infinity in text`);
    if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)) errs.push(`${t}: sideways scroll`);
  }
  const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) errs.push(box);
  console.log(scheme, width, errs.length ? errs : 'clean'); bad += errs.length; await p.close();
}
await b.close(); process.exit(bad ? 1 : 0);
