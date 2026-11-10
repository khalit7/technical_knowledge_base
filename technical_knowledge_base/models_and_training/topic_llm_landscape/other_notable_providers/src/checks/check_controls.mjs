// node src/checks/check_controls.mjs <page index.html>   (run from the repo root)
// Clicks every non-tab button, moves every range, select and checkbox in every tab, at 390 px dark and 920 px light,
// then checks for page errors, NaN/undefined/Infinity in the tab text, sideways scroll and a visible #jsErr.
// Since the 2026-11-06 rollout the animations play by themselves once in view; that, and stillness under reduced motion, is checked by src/check_stages.mjs.
import { createRequire } from 'node:module'; import path from 'node:path';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const file = 'file://' + path.resolve(process.argv[2]);
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let bad = 0;
for (const [scheme, width, motion] of [['dark', 390, 'no-preference'], ['light', 920, 'no-preference'], ['light', 1400, 'no-preference']]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: motion }]);
  await p.goto(file); await sleep(300);
  for (const t of await p.$$eval('button[data-t]', bs => bs.map(x => x.dataset.t))) {
    await p.$eval(`button[data-t=${t}]`, x => x.click()); await sleep(250);
    await p.$$eval('#' + t + ' details', ds => ds.forEach(d => d.open = true));
    const n = await p.$$eval('#' + t + ' button', bs => bs.length);
    for (let i = 0; i < n; i++) {
      await p.$$eval('#' + t + ' button', (bs, i) => { const x = bs[i]; if (x && x.offsetParent !== null) x.click() }, i);
      await sleep(40);
    }
    // step every animation to its end with the forward button
    for (const id of ['stg-mem-f', 'stg-bits-f', 'stg-fa-f', 'dlFwd']) for (let k = 0; k < 9; k++) await p.$eval('#' + id, x => x.click()).catch(() => {});
    await p.$$eval('#' + t + ' input[type=range]', rs => rs.forEach(r => { for (const v of [r.min, r.max, (+r.min + +r.max) / 2]) { r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true })) } }));
    await p.$$eval('#' + t + ' select', ss => ss.forEach(s => { for (const o of s.options) { s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })) } }));
    await p.$$eval('#' + t + ' input[type=checkbox]', cs => cs.forEach(c => { c.click(); c.click(); c.click() }));
    // click a few chart dots and table rows
    await p.$$eval('#' + t + ' .szd, #' + t + ' tr.cr', xs => xs.slice(0, 6).forEach(x => x.dispatchEvent(new MouseEvent('click', { bubbles: true }))));
    await sleep(200);
    const txt = await p.$eval('#' + t, el => el.innerText);
    const m = txt.match(/\bNaN\b|\bundefined\b|\bInfinity\b/);
    const side = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    if (m || side) errs.push(`${t}: ${m ? m[0] + ' near "' + txt.slice(Math.max(0, m.index - 60), m.index + 20) + '"' : ''} ${side ? 'sideways' : ''}`);
  }
  const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) errs.push(box);
  console.log(scheme, width, errs.length ? errs : 'clean'); bad += errs.length; await p.close();
}
await b.close(); process.exit(bad ? 1 : 0);
