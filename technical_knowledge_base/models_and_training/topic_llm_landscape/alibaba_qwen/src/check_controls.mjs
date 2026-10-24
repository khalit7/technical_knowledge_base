// node <page>/src/check_controls.mjs <page>/index.html : click every control in every tab, 390 px dark and 920 px light,
// step the hybrid-attention animation through every mode to its last step, and fail on errors, NaN/undefined, sideways scroll,
// or any animation frame before a click (reduced motion and normal).
import { createRequire } from 'node:module'; import path from 'node:path';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
let bad = 0;
for (const [scheme, width, rm] of [['dark', 390, 'no-preference'], ['light', 920, 'no-preference'], ['light', 920, 'reduce']]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: rm }]);
  await p.goto('file://' + path.resolve(process.argv[2]));
  await p.evaluate(() => document.getElementById('hx').scrollIntoView()); await new Promise(r => setTimeout(r, 1500));
  const fr = await p.$eval('#hx', e => +(e.dataset.frames || 0)); if (fr) errs.push('animation moved before a click: ' + fr + ' frames');
  for (const t of await p.$$eval('button[data-t]', bs => bs.map(b => b.dataset.t))) {
    await p.click(`button[data-t=${t}]`);
    await p.evaluate(async t => {
      const root = document.getElementById(t), sleep = ms => new Promise(r => setTimeout(r, ms));
      for (const r of root.querySelectorAll('input[type=range]')) { for (const v of [r.min, r.max, r.value]) { r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); } }
      for (const s of root.querySelectorAll('select')) { for (const o of s.options) { s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); } }
      for (const r of root.querySelectorAll('input[type=radio]')) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); }
      for (const d of root.querySelectorAll('details')) d.open = true;
      for (const bt of root.querySelectorAll('.seg button, #egR')) bt.click();
      for (const m of ['full', 'hyb', 'qsa']) { const bm = root.querySelector('#hxM button[data-m=' + m + ']'); if (!bm) continue; bm.click();
        for (let i = 0; i < 8; i++) document.getElementById('hxFwd').click(); document.getElementById('hxBack').click(); }
      for (const g of root.querySelectorAll('#tlSvg .lnd')) g.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await sleep(100);
    }, t);
    const txt = await p.$eval('#' + t, el => el.innerText);
    if (/\bNaN\b|\bundefined\b|\bInfinity\b/.test(txt)) errs.push(`${t}: NaN/undefined`);
    if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)) errs.push(`${t}: sideways scroll`);
  }
  const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) errs.push(box);
  console.log(scheme, width, rm, errs.length ? errs : 'clean'); bad += errs.length; await p.close();
}
await b.close(); process.exit(bad ? 1 : 0);
