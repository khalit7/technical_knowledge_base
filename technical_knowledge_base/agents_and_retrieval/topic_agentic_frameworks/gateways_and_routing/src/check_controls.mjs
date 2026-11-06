// node technical_knowledge_base/.../gateways_and_routing/src/check_controls.mjs <page index.html>   (run from the repo root)
// Opens every closed block, clicks every button, moves every range and select in every tab, in 390 px dark and 920 px light,
// and fails on page or console errors, a visible #jsErr, sideways scroll, or NaN / undefined / Infinity in the text.
// Autoplay (2026-11-06): every 3D stage plays once scrolled into view (its data-frames rises); src/check_stages.mjs checks the rest.
import { createRequire } from 'node:module'; import path from 'node:path';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
let bad = 0;
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + path.resolve(process.argv[2]));
  await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto('file://' + path.resolve(process.argv[2])); // a previous width may have saved another tab
  for (const id of await p.$$eval('.stg', s => s.map(x => x.id))) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await new Promise(r => setTimeout(r, 2000));
    if (!(await p.$eval('#' + id, e => +e.dataset.frames || 0))) errs.push(id + ' did not play when scrolled into view');
  }
  for (const t of await p.$$eval('button[data-t]', bs => bs.map(b => b.dataset.t))) {
    await p.click(`button[data-t=${t}]`);
    await p.evaluate(t => document.querySelectorAll('#' + t + ' details').forEach(d => d.open = true), t);
    const n = await p.$$eval(`#${t} button`, bs => bs.length);
    for (let i = 0; i < n; i++) {
      await p.evaluate((t, i) => { const bt = document.querySelectorAll(`#${t} button`)[i]; if (bt) bt.click(); }, t, i);
    }
    await p.evaluate(t => {
      for (const r of document.querySelectorAll(`#${t} input[type=range]`)) for (const v of [r.min, r.max, Math.round((+r.min + +r.max) / 2)]) { r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); }
      for (const s of document.querySelectorAll(`#${t} select`)) for (const o of s.options) { s.value = o.value; s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true })); }
      for (const c of document.querySelectorAll(`#${t} input[type=checkbox]`)) { c.click(); c.click(); }
      for (const tr of document.querySelectorAll(`#${t} tr[data-id]`)) { tr.click(); break; }
    }, t);
    await new Promise(r => setTimeout(r, 300));
    const txt = await p.$eval('#' + t, el => el.innerText);
    if (/\bNaN\b|\bundefined\b|\bInfinity\b/.test(txt)) errs.push(`${t}: NaN/undefined/Infinity in text`);
    if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)) errs.push(`${t}: sideways scroll`);
  }
  const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) errs.push(box);
  console.log(scheme, width, errs.length ? errs : 'clean'); bad += errs.length; await p.close();
}
await b.close(); process.exit(bad ? 1 : 0);
