// node technical_knowledge_base/agents_and_retrieval/topic_agentic_harnesses/harnesses_for_training/src/check_controls.mjs <page index.html>
// Run from the repository root. Opens every tab in 390 px dark and 920 px light, opens every closed block, clicks every
// button, sets every select and range to each end, steps every animation to its last step, and fails on page or console
// errors, a visible #jsErr, sideways scroll, or NaN / undefined / Infinity in a tab's text. Then checks that nothing
// plays by itself (normal motion and reduced motion).
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
// nothing autoplays: load, scroll every animation card into view, wait, and check every scrubber is still on step 0
for (const rm of ['no-preference', 'reduce']) {
  const p = await b.newPage(); await p.setViewport({ width: 920, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: rm }]);
  await p.goto('file://' + page); await wait(300);
  const cards = await p.$$eval('#t-read .an-ctl input[type=range]', rs => rs.map(r => r.id));
  for (const id of cards) { await p.$eval('#' + id, el => el.scrollIntoView({ block: 'center' })); await wait(2500); }
  const moved = await p.$$eval('#t-read .an-ctl input[type=range]', rs => rs.filter(r => +r.value !== 0).map(r => r.id));
  console.log('motion', rm, moved.length ? 'AUTOPLAYED ' + moved : 'nothing plays by itself'); bad += moved.length; await p.close();
}
await b.close();
process.exit(bad ? 1 : 0);
