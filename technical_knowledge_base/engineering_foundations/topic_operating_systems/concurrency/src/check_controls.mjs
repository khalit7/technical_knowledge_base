// node src/check_controls.mjs <page index.html>  (run from the repository root)
// Clicks every button, moves every range and select, steps every animation to its end, in 390 px dark and 920 px light;
// fails on page or console errors, a visible #jsErr, sideways scroll, or NaN/undefined/Infinity in the text.
// Then checks with reduced motion and with normal motion that nothing moves before the reader acts.
import { createRequire } from 'node:module'; import path from 'node:path';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const file = 'file://' + path.resolve(process.argv[2]);
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let bad = 0;
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await sleep(300);
  for (const t of await p.$$eval('#tabs button[data-t]', bs => bs.map(b => b.dataset.t))) {
    await p.click(`#tabs button[data-t=${t}]`); await sleep(150);
    // every segmented button, scenario and lab button (not the lab replay, which is a timer)
    const n = await p.$$eval(`#${t} button`, bs => bs.length);
    for (let i = 0; i < n; i++) {
      await p.evaluate((t, i) => { const x = document.querySelectorAll(`#${t} button`)[i]; if (x && !x.disabled && x.dataset.a !== 'bad' && !x.classList.contains('an-play')) x.click(); }, t, i);
    }
    // step every animation to its last step via the scrubber, and move every other range
    await p.evaluate(t => { document.querySelectorAll(`#${t} input[type=range]`).forEach(r => { for (const v of [r.min, r.max, (+r.min + +r.max) / 2]) { r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); } r.value = r.max; r.dispatchEvent(new Event('input', { bubbles: true })); });
      document.querySelectorAll(`#${t} select`).forEach(s => { s.selectedIndex = s.options.length - 1; s.dispatchEvent(new Event('change', { bubbles: true })); }); }, t);
    // the lab: run random steps until each scenario ends
    if (t === 't-read') for (const sc of await p.$$eval('#il-sc button', bs => bs.map(b => b.dataset.m))) {
      await p.click(`#il-sc button[data-m=${sc}]`);
      for (let k = 0; k < 60; k++) await p.evaluate(() => { const r = document.querySelector('#il-btns button[data-a=rand]'); if (r && !r.disabled) r.click(); });
    }
    await sleep(200);
    const txt = (await p.$eval('#' + t, el => el.innerText)).replace(/undefined behaviour/g, ''); // prose mention whitelisted
    const m = txt.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/);
    const side = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    if (m || side) errs.push(`${t} ${scheme} ${width}: ${m ? m[0] : ''} ${side ? 'sideways' : ''}`);
  }
  const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) errs.push(box);
  console.log(scheme, width, errs.length ? errs : 'clean'); bad += errs.length; await p.close();
}
// nothing moves before the reader acts (normal motion and reduced motion)
for (const rm of ['no-preference', 'reduce']) {
  const p = await b.newPage(); await p.setViewport({ width: 920, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: rm }]);
  await p.goto(file);
  const ids = await p.$$eval('.an-ctl input[type=range]', rs => rs.map(r => r.id));
  for (const id of ids) { await p.$eval('#' + id, el => el.scrollIntoView({ block: 'center' })); await sleep(2600); }
  const moved = await p.$$eval('.an-ctl input[type=range]', rs => rs.filter(r => r.value !== '0').map(r => r.id));
  console.log('motion', rm, ids.length, 'animations;', moved.length ? 'MOVED ' + moved : 'none moved'); bad += moved.length; await p.close();
}
await b.close(); process.exit(bad ? 1 : 0);
