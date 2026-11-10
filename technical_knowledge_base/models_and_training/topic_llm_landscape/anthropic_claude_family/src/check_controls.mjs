// Exercise every control of every tab in 390 px dark and 920 px light. Since the 2026-11-06 rollout the two 3D stages (Fig. 5 stg-ap, Fig. 6 stg-ss)
// play by themselves once in view: this checks that they do (check_stages.mjs covers steps, lists, off-screen and reduced motion).
// usage (from the repository root): node <page>/src/check_controls.mjs <page>/index.html
// Fails on a page or console error, a visible #jsErr, sideways scroll, or NaN/undefined/Infinity in a tab's text.
import { createRequire } from 'node:module'; import path from 'node:path';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const file = path.resolve(process.argv[2]);
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
let bad = 0;
const wait = ms => new Promise(r => setTimeout(r, ms));
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + file); await wait(300);
  await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto('file://' + file); await wait(300);
  // the stages play by themselves once scrolled into view (2026-11-06; this used to assert the opposite)
  for (const id of ['stg-ap', 'stg-ss']) {
    await p.$eval('#' + id, el => el.scrollIntoView({ block: 'center' })); await wait(2200);
    const frames = await p.$eval('#' + id, el => +(el.dataset.frames || 0));
    if (!frames) errs.push(id + ' did not play when scrolled into view');
  }
  for (const t of await p.$$eval('button[data-t]', bs => bs.map(x => x.dataset.t))) {
    await p.$eval(`button[data-t=${t}]`, x => x.click()); await wait(250);
    // open every closed block so their controls are reachable
    await p.$$eval(`#${t} details`, ds => ds.forEach(d => d.open = true));
    const n = await p.evaluate(t => {
      const root = document.getElementById(t); let k = 0;
      root.querySelectorAll('select').forEach(s => { [...s.options].forEach(o => { s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); k++ }) });
      root.querySelectorAll('input[type=range]').forEach(r => { for (const v of [r.min, r.max, (+r.min + +r.max) / 2]) { r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); k++ } });
      root.querySelectorAll('input[type=checkbox]').forEach(c => { c.click(); k++; c.click() });
      root.querySelectorAll('button:not([data-t])').forEach(x => { if (!x.closest('.stg')) { x.click(); k++ } });
      root.querySelectorAll('#lnSvg .lnd, #blTab td.v').forEach(g => { g.dispatchEvent(new MouseEvent('click', { bubbles: true })); k++ });
      return k;
    }, t);
    if (t === 't-read') { // step both stages to their last step
      for (const id of ['stg-ap', 'stg-ss']) { const n = await p.$eval(`#${id}-r`, e => +e.max + 1); for (let k = 0; k < n; k++) await p.$eval(`#${id}-f`, e => e.click()); }
      await wait(2600);
    }
    const txt = await p.$eval('#' + t, el => el.innerText);
    const m = txt.match(/\bNaN\b|\bundefined\b|\bInfinity\b/);
    const side = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    if (m || side) errs.push(`${t}: ${m ? m[0] : ''} ${side ? 'sideways scroll' : ''}`);
    console.log(scheme, width, t, 'controls exercised', n);
  }
  const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) errs.push(box);
  console.log(scheme, width, errs.length ? errs : 'clean'); bad += errs.length; await p.close();
}
await b.close();
process.exit(bad ? 1 : 0);
