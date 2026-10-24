// node src/check_controls.mjs <page index.html>   (run from the repository root)
// Clicks every button, moves every slider, select and number input in every tab, steps every animation to its end,
// in 390 px dark and 920 px light; fails on page errors, a visible #jsErr, sideways scroll, or NaN/undefined/Infinity.
// Then, under prefers-reduced-motion and under normal motion, confirms that no animation moves before the reader acts.
import { createRequire } from 'node:module'; import path from 'node:path';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const file = 'file://' + path.resolve(process.argv[2]);
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
let bad = 0;
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file);
  for (const t of await p.$$eval('button[data-t]', bs => bs.map(b => b.dataset.t))) {
    await p.$eval(`button[data-t="${t}"]`, x => x.click());
    await p.evaluate(t => {
      const root = document.getElementById(t);
      root.querySelectorAll('details').forEach(d => d.open = true);
      for (const btn of root.querySelectorAll('button')) { if (btn.closest('.drill') || !btn.offsetParent) continue; btn.click(); }
      for (const s of root.querySelectorAll('input[type=range]')) { for (const v of [s.min, s.max, (+s.min + +s.max) >> 1]) { s.value = v; s.dispatchEvent(new Event('input', { bubbles: true })); } }
      for (const s of root.querySelectorAll('select')) { for (const o of s.options) { s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); } }
      for (const s of root.querySelectorAll('input[type=number]')) { s.value = s.min || 0; s.dispatchEvent(new Event('input', { bubbles: true })); s.value = s.defaultValue; s.dispatchEvent(new Event('input', { bubbles: true })); }
      root.querySelectorAll('.drill .ch button').forEach(x => x.click());
    }, t);
    // every mode of every segmented control, each animation stepped to its last frame
    const n = await p.$$eval(`#${t} .seg button`, bs => bs.length);
    for (let i = 0; i < n; i++) {
      await p.evaluate((t, i) => { const bt = document.querySelectorAll(`#${t} .seg button`)[i]; bt.click(); const card = bt.closest('.card');
        const s = card && card.querySelector('.an-ctl input[type=range]'); if (s) { s.value = s.max; s.dispatchEvent(new Event('input', { bubbles: true })); } }, t, i);
    }
    const txt = await p.$eval('#' + t, el => el.innerText);
    if (/\bNaN\b|\bundefined\b|\bInfinity\b/.test(txt)) errs.push(`${t}: NaN/undefined/Infinity in text`);
    if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)) errs.push(`${t}: sideways scroll`);
  }
  const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) errs.push('jsErr: ' + box);
  console.log(scheme, width, errs.length ? errs : 'clean'); bad += errs.length; await p.close();
}
for (const motion of ['reduce', 'no-preference']) {
  const p = await b.newPage(); await p.setViewport({ width: 920, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: motion }]);
  await p.goto(file);
  const moved = [];
  for (const id of ['vm-walk-card', 'vm-flt-card', 'vm-cow-card', 'vm-hp-card', 'cg-card']) {
    await p.$eval('#' + id, e => e.scrollIntoView());
    await new Promise(r => setTimeout(r, 2500));
    const v = await p.$eval('#' + id + ' .an-ctl input[type=range]', s => +s.value);
    if (v !== 0) moved.push(id + ' at step ' + v);
  }
  console.log('motion', motion, moved.length ? 'MOVED: ' + moved.join(', ') : 'nothing plays by itself'); bad += moved.length; await p.close();
}
await b.close();
console.log(bad ? `check_controls: ${bad} problems` : 'check_controls: PASS'); process.exit(bad ? 1 : 0);
