// Click every control of the page in 390 px dark and 920 px light (and once under reduced motion), fail on errors.
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_data_curation_and_datasets/synthetic_data/src/check_controls.mjs
import { createRequire } from 'node:module'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const page = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'index.html');
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let bad = 0;
for (const [scheme, width, rm] of [['dark', 390, false], ['light', 920, false], ['light', 920, true]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: rm ? 'reduce' : 'no-preference' }]);
  await p.goto('file://' + page); await sleep(300);
  // nothing may move before the reader acts: every animation sits on its first step
  const steps0 = await p.$$eval('#t-read .an-ctl input[type=range]', xs => xs.map(x => x.value));
  await sleep(2500);
  const steps1 = await p.$$eval('#t-read .an-ctl input[type=range]', xs => xs.map(x => x.value));
  if (steps0.join() !== steps1.join() || steps1.some(v => v !== '0')) errs.push('an animation moved without the reader: ' + steps1.join(','));
  for (const t of await p.$$eval('button[data-t]', bs => bs.map(b => b.dataset.t))) {
    await p.click(`button[data-t=${t}]`); await sleep(200);
    await p.$$eval(`#${t} details`, ds => ds.forEach(d => d.open = true));
    const n = await p.$$eval(`#${t} button:not([data-t])`, bs => bs.length);
    for (let i = 0; i < n; i++) {
      await p.evaluate((t, i) => { const bt = document.querySelectorAll(`#${t} button:not([data-t])`)[i]; if (bt && bt.offsetParent !== null) bt.click(); }, t, i);
      await sleep(40);
    }
    await p.$$eval(`#${t} input[type=range]`, xs => xs.forEach(x => { for (const v of [x.min, x.max, Math.round((+x.min + +x.max) / 2)]) { x.value = v; x.dispatchEvent(new Event('input', { bubbles: true })); } }));
    await p.$$eval(`#${t} select`, ss => ss.forEach(s => { for (const o of [...s.options].reverse()) { s.value = o.value; s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true })); } }));
    await p.$$eval(`#${t} input[type=number]`, xs => xs.forEach(x => { x.value = x.min || 1; x.dispatchEvent(new Event('input', { bubbles: true })); x.dispatchEvent(new Event('change', { bubbles: true })); }));
    await sleep(300);
    const txt = await p.$eval('#' + t, el => el.innerText);
    if (/\bNaN\b|\bundefined\b|\bInfinity\b/.test(txt)) errs.push(`${t}: NaN/undefined/Infinity in text`);
    if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)) errs.push(`${t}: sideways scroll`);
  }
  const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) errs.push('error box: ' + box);
  console.log(scheme, width, rm ? 'reduced-motion' : '', errs.length ? errs : 'clean'); bad += errs.length; await p.close();
}
await b.close(); process.exit(bad ? 1 : 0);
