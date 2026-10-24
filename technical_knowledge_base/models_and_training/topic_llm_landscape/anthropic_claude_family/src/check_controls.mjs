// Exercise every control of every tab in 390 px dark and 920 px light, then check that nothing animates by itself.
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
  // nothing may move before the reader acts: scroll the session animation into view and wait
  await p.$eval('#sa', el => el.scrollIntoView({ block: 'center' })); await wait(1500);
  const frames = await p.$eval('#sa', el => +(el.dataset.frames || 0));
  if (frames) errs.push('session animation advanced ' + frames + ' frames without a click');
  for (const t of await p.$$eval('button[data-t]', bs => bs.map(x => x.dataset.t))) {
    await p.$eval(`button[data-t=${t}]`, x => x.click()); await wait(250);
    // open every closed block so their controls are reachable
    await p.$$eval(`#${t} details`, ds => ds.forEach(d => d.open = true));
    const n = await p.evaluate(t => {
      const root = document.getElementById(t); let k = 0;
      root.querySelectorAll('select').forEach(s => { [...s.options].forEach(o => { s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); k++ }) });
      root.querySelectorAll('input[type=range]').forEach(r => { for (const v of [r.min, r.max, (+r.min + +r.max) / 2]) { r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); k++ } });
      root.querySelectorAll('input[type=checkbox]').forEach(c => { c.click(); k++; c.click() });
      root.querySelectorAll('button:not([data-t])').forEach(x => { if (x.id !== 'saPlay') { x.click(); k++ } });
      root.querySelectorAll('#lnSvg .lnd, #blTab td.v').forEach(g => { g.dispatchEvent(new MouseEvent('click', { bubbles: true })); k++ });
      return k;
    }, t);
    if (t === 't-read') { // play the session animation to its end at 2x
      await p.select('#saSpd', '2'); await p.$eval('#saScrub', s => { s.value = 0; s.dispatchEvent(new Event('input')) });
      await p.click('#saPlay'); await wait(1500); await p.click('#saPlay');
      await p.$eval('#saScrub', s => { s.value = s.max; s.dispatchEvent(new Event('input')) });
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
