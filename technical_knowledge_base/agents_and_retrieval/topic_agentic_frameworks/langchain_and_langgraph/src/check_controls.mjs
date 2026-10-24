// node src/check_controls.mjs <page index.html>   (run from the repository root)
// Clicks every segmented button, steps every animation to its last frame, toggles every checkbox and details block,
// at 390 px dark and 920 px light; fails on page errors, a visible #jsErr, sideways scroll or NaN/undefined/Infinity.
// Also checks nothing moves before the reader acts (reduced motion and normal), and screenshots the key cards into .shots/.
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const file = path.resolve(process.argv[2]); const shots = path.join(path.dirname(file), '.shots'); fs.mkdirSync(shots, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
let bad = 0;
const CARDS = ['flg-hero', 'flg-lc-pipe', 'flg-s-card', 'flg-st-card', 'flg-c-card', 'flg-i-card', 'flg-ag-svg', 'flg-g-real'];
for (const [scheme, width, rm] of [['dark', 390, false], ['light', 920, false], ['light', 920, true]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: rm ? 'reduce' : 'no-preference' }]);
  await p.goto('file://' + file);
  // nothing autoplays: scroll each animation into view, wait, and read its scrubber
  for (const id of ['flg-s-ctl', 'flg-c-ctl', 'flg-i-ctl']) {
    await p.$eval('#' + id, el => el.scrollIntoView({ block: 'center' })); await new Promise(r => setTimeout(r, 2500));
    const v = await p.$eval('#' + id + '-s', el => el.value); if (v !== '0') errs.push(`${id} moved by itself to ${v}`);
  }
  if (!rm) for (const t of await p.$$eval('button[data-t]', bs => bs.map(b => b.dataset.t))) {
    await p.click(`button[data-t=${t}]`);
    await p.evaluate(t => {
      const root = document.getElementById(t);
      root.querySelectorAll('details').forEach(d => d.open = true);
      root.querySelectorAll('input[type=checkbox]').forEach(c => c.click());
      const groups = [...root.querySelectorAll('.seg, .chips')];
      for (const g of groups) for (const btn of g.querySelectorAll('button')) {
        btn.click();
        root.querySelectorAll('.an-ctl input[type=range]').forEach(r => { r.value = r.max; r.dispatchEvent(new Event('input')); r.value = 1; r.dispatchEvent(new Event('input')); });
      }
      root.querySelectorAll('.an-ctl button').forEach(x => x.click());
      root.querySelectorAll('#flg-c-calls tr[data-i]').forEach(x => x.click());
    }, t);
    const txt = await p.$eval('#' + t, el => el.innerText);
    const m = txt.match(/\bNaN\b|\bundefined\b|\bInfinity\b/); const side = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    if (m || side) errs.push(`${t} ${scheme} ${width}: ${m ? m[0] : ''} ${side ? 'sideways' : ''}`);
  }
  if (!rm) { await p.click('button[data-t=t-read]'); await p.evaluate(() => { document.querySelectorAll('#t-read details').forEach(d => d.open = false); document.querySelector('#flg-s-pick button[data-m=fan_reducer]').click(); document.querySelector('#flg-c-mode button[data-m=A]').click(); });
    for (const id of CARDS) { const el = await p.$('#' + id); if (el) await el.screenshot({ path: path.join(shots, `card-${id}-${scheme}-${width}.png`) }); } }
  const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) errs.push(box);
  console.log(scheme, width, rm ? 'reduced-motion' : '', errs.length ? errs : 'clean'); bad += errs.length; await p.close();
}
await b.close(); process.exit(bad ? 1 : 0);
