// node technical_knowledge_base/models_and_training/topic_llm_architecture/src/check_controls.mjs <index.html>  (run from the repository root)
// Every tab at 390 px dark and 920 px light: scroll through it (nothing may start playing by itself), then click every
// button, move every range and select; fail on page errors, a visible #jsErr, sideways scroll, or NaN/undefined/Infinity.
import { createRequire } from 'node:module'; import path from 'node:path';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
let bad = 0;
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + path.resolve(process.argv[2]));
  for (const t of await p.$$eval('button[data-t]', bs => bs.map(b => b.dataset.t))) {
    await p.click(`button[data-t=${t}]`); await sleep(300);
    // scroll the whole tab, then check that no step controller moved off its first step by itself
    const h = await p.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < h; y += 700) { await p.evaluate(y => scrollTo(0, y), y); await sleep(60); }
    await sleep(1500);
    const moved = await p.$$eval(`#${t} button.an-play, #${t} [id$="-p"]`, bs => bs.filter(x => /Pause/.test(x.textContent)).length);
    if (moved) errs.push(`${t}: ${moved} animation(s) playing without a press`);
    await p.evaluate(tid => {
      const root = document.getElementById(tid);
      root.querySelectorAll('details').forEach(d => d.open = true);
      root.querySelectorAll('input[type=range]').forEach(r => { for (const v of [r.min, r.max, (+r.min + +r.max) / 2]) { r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true })); } });
      root.querySelectorAll('select').forEach(s => { [...s.options].slice(0, 8).forEach(o => { s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); s.dispatchEvent(new Event('input', { bubbles: true })); }); });
      root.querySelectorAll('button').forEach(x => { if (!/Play|Pause/.test(x.textContent)) try { x.click(); } catch (e) {} });
    }, t);
    await sleep(400);
    const txt = await p.$eval('#' + t, el => el.innerText);
    if (/\bNaN\b|\bundefined\b|\bInfinity\b/.test(txt)) errs.push(`${t}: NaN/undefined/Infinity in text`);
    if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)) errs.push(`${t}: sideways scroll`);
  }
  const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) errs.push('jsErr: ' + box);
  console.log(scheme, width, errs.length ? errs : 'clean'); bad += errs.length; await p.close();
}
await b.close(); process.exit(bad ? 1 : 0);
