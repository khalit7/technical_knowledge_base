// node technical_knowledge_base/agents_and_retrieval/topic_agentic_harnesses/harnesses_for_training/src/check_controls.mjs <page index.html>
// Run from the repository root. Opens every tab in 390 px dark and 920 px light, opens every closed block, clicks every
// button, sets every select and range to each end, steps every animation to its last step, and fails on page or console
// errors, a visible #jsErr, sideways scroll, or NaN / undefined / Infinity in a tab's text. Then checks motion: every animation
// plays by itself once in view, and under reduced motion nothing moves by itself.
import { createRequire } from 'node:module'; import path from 'node:path';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const page = path.resolve(process.argv[2]);
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const wait = ms => new Promise(r => setTimeout(r, ms));
let bad = 0;
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + page); await wait(300);
  for (const t of await p.$$eval('button[data-t]', bs => bs.map(b => b.dataset.t))) {
    await p.click(`button[data-t=${t}]`); await wait(200);
    await p.evaluate(t => document.querySelectorAll('#' + t + ' details').forEach(d => { d.open = true; d.dispatchEvent(new Event('toggle')) }), t);
    await wait(200);
    // every select: each option index 0 and last
    const sels = await p.$$eval('#' + t + ' select', ss => ss.map(s => s.id).filter(Boolean));
    for (const id of sels) for (const end of [0, -1]) {
      await p.evaluate((id, end) => { const s = document.getElementById(id); s.selectedIndex = end < 0 ? s.options.length - 1 : 0; s.dispatchEvent(new Event('change')) }, id, end);
    }
    // every range: min then max
    const rngs = await p.$$eval('#' + t + ' input[type=range]', rs => rs.map(r => r.id).filter(Boolean));
    for (const id of rngs) for (const k of ['min', 'max']) {
      await p.evaluate((id, k) => { const r = document.getElementById(id); r.value = r[k]; r.dispatchEvent(new Event('input')) }, id, k);
    }
    // every non-tab button, twice over (segmented toggles, steppers, play/pause)
    const n = await p.$$eval('#' + t + ' button', bs => bs.length);
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < n; i++) {
      await p.evaluate((t, i) => { const x = document.querySelectorAll('#' + t + ' button')[i]; if (x && !/Pause/.test(x.textContent)) x.click() }, t, i);
    }
    // step every animation to its end
    await p.evaluate(t => document.querySelectorAll('#' + t + ' button[aria-label="Next step"]').forEach(x => { for (let k = 0; k < 40; k++) x.click() }), t);
    // the scaffold grid: open every cell
    await p.evaluate(t => document.querySelectorAll('#' + t + ' td.c').forEach(td => td.click()), t);
    await wait(150);
    const txt = await p.$eval('#' + t, el => el.innerText);
    const m = txt.match(/.{0,40}\b(NaN|undefined|Infinity)\b.{0,40}/);
    const side = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    if (m || side) errs.push(`${t} ${scheme} ${width}: ${m ? m[0] : ''} ${side ? 'sideways' : ''}`);
  }
  const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) errs.push(box);
  console.log(scheme, width, errs.length ? errs : 'clean'); bad += errs.length; await p.close();
}
// motion (2026-11-06 rule): every stage and the Fig. 5 animation play by themselves once scrolled into view; under reduced motion nothing moves
for (const rm of ['no-preference', 'reduce']) {
  const p = await b.newPage(); await p.setViewport({ width: 920, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: rm }]);
  await p.goto('file://' + page); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto('file://' + page); await wait(300); // the page remembers its last tab
  const ids = await p.$$eval('#t-read .stg', xs => xs.map(x => x.id));
  const still = [];
  for (const id of ids) { await p.$eval('#' + id, el => el.scrollIntoView({ block: 'center' })); await wait(2200);
    const f = await p.$eval('#' + id, el => +el.dataset.frames || 0); if ((rm === 'reduce') !== (f === 0)) still.push(id) }
  await p.$eval('#ht-curcard', el => el.scrollIntoView({ block: 'center' })); await wait(1500);
  const pl = await p.$eval('#ht-curctl-p', el => /Pause/.test(el.textContent)); if ((rm === 'reduce') === pl) still.push('ht-curcard');
  console.log('motion', rm, still.length ? (rm === 'reduce' ? 'MOVED BY ITSELF ' : 'DID NOT PLAY ') + still : (rm === 'reduce' ? 'nothing moves by itself' : 'every animation plays in view')); bad += still.length; await p.close();
}
await b.close();
process.exit(bad ? 1 : 0);
