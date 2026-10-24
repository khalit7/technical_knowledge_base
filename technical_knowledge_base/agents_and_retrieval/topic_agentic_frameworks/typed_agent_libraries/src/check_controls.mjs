// node src/check_controls.mjs <page index.html>   (run from the repository root)
// Clicks every button, sets every select and range in every tab at 390 px dark and 920 px light; fails on page or
// console errors, a visible #jsErr, sideways scroll, or NaN/undefined/Infinity in the tab text. Then checks that no
// stepper advances by itself (never autoplay), after load and after a mode switch.
import { createRequire } from 'node:module'; import path from 'node:path';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let bad = 0;
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + path.resolve(process.argv[2]));
  for (const t of await p.$$eval('button[data-t]', bs => bs.map(b => b.dataset.t))) {
    await p.click(`button[data-t=${t}]`); await sleep(150);
    await p.evaluate(t => { const r = document.getElementById(t); r.querySelectorAll('details').forEach(d => d.open = true); }, t);
    const n = await p.$$eval(`#${t} button`, bs => bs.length);
    for (let i = 0; i < n; i++) await p.evaluate((t, i) => { const x = document.querySelectorAll(`#${t} button`)[i]; if (x && x.offsetParent) x.click(); }, t, i);
    await p.evaluate(t => {
      document.querySelectorAll(`#${t} select`).forEach(s => { for (const o of s.options) { s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); } });
      document.querySelectorAll(`#${t} input[type=range]`).forEach(r => { for (const v of [r.min, r.max]) { r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); } });
      document.querySelectorAll(`#${t} table.hm td.v`).forEach(c => c.click());
    }, t);
    await sleep(100);
    const txt = await p.$eval('#' + t, el => el.innerText);
    const nan = /\bNaN\b|\bundefined\b|\bInfinity\b/.test(txt);
    const side = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    if (nan || side) errs.push(`${t}: ${nan ? 'NaN/undefined ' : ''}${side ? 'sideways' : ''}`);
  }
  const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) errs.push(box);
  console.log(scheme, width, errs.length ? errs : 'clean'); bad += errs.length; await p.close();
}
// never autoplay: load, scroll the stepper into view, wait; then switch route and wait
{
  const p = await b.newPage(); await p.setViewport({ width: 920, height: 900 });
  await p.goto('file://' + path.resolve(process.argv[2]));
  await p.click('button[data-t=t-read]');
  await p.$eval('#ftyped-an-card', el => el.scrollIntoView()); await sleep(3000);
  const s1 = await p.$eval('#ftyped-an-ctl-s', el => el.value);
  await p.evaluate(() => document.querySelectorAll('#ftyped-an-mode button')[2].click()); await sleep(3000);
  const s2 = await p.$eval('#ftyped-an-ctl-s', el => el.value);
  await p.click('button[data-t=t-mech]'); await p.$eval('#ftyped-x-card', el => el.scrollIntoView()); await sleep(3000);
  const s3 = await p.$eval('#ftyped-x-ctl-s', el => el.value);
  const still = s1 === '0' && s2 === '0' && s3 === '0';
  console.log('no autoplay:', still ? 'ok' : `moved (${s1}, ${s2}, ${s3})`); if (!still) bad++;
  await p.close();
}
await b.close(); process.exit(bad ? 1 : 0);
