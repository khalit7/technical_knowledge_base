// node technical_knowledge_base/.../llm_observability/src/check_controls.mjs <index.html>  (run from the repo root)
// Clicks every button, moves every range and select, opens every closed block, in 390 px dark and 920 px light;
// fails on page errors, a visible #jsErr, sideways scroll, NaN/undefined/Infinity, or an animation that moved by itself.
import { createRequire } from 'node:module'; import path from 'node:path';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
let bad = 0;
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + path.resolve(process.argv[2]));
  // no autoplay: scroll each animation into view, wait, it must still be on step 1
  for (const id of ['fobs-a1', 'fobs-a6', 'fobs-a7']) {
    await p.$eval('#' + id, e => e.scrollIntoView()); await new Promise(r => setTimeout(r, 2500));
    const v = await p.$eval('#' + id + '-ctl-s', e => e.value); if (v !== '0') errs.push(id + ' moved by itself to ' + v);
  }
  for (const t of await p.$$eval('button[data-t]', bs => bs.map(x => x.dataset.t))) {
    await p.click(`button[data-t=${t}]`);
    await p.$$eval(`#${t} details`, ds => ds.forEach(d => d.open = true));
    const n = await p.$$eval(`#${t} button`, bs => bs.length);
    for (let i = 0; i < n; i++) await p.evaluate((t, i) => { const x = document.querySelectorAll(`#${t} button`)[i]; if (x && x.offsetParent) x.click() }, t, i);
    await p.$$eval(`#${t} input[type=range]`, rs => rs.forEach(r => { for (const v of [r.min, r.max, (+r.min + +r.max) / 2 | 0]) { r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })) } }));
    await p.$$eval(`#${t} input[type=checkbox]`, cs => cs.forEach(c => { c.click(); c.dispatchEvent(new Event('input', { bubbles: true })) }));
    await p.$$eval(`#${t} select`, ss => ss.forEach(s => { for (const o of s.options) { s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); s.dispatchEvent(new Event('input', { bubbles: true })) } }));
    const txt = await p.$eval('#' + t, el => el.innerText);
    if (/\bNaN\b|\bundefined\b|\bInfinity\b/.test(txt)) errs.push(`${t}: NaN/undefined`);
    if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)) errs.push(`${t}: sideways scroll`);
  }
  const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) errs.push(box);
  console.log(scheme, width, errs.length ? errs : 'clean'); bad += errs.length; await p.close();
}
await b.close(); process.exit(bad ? 1 : 0);
