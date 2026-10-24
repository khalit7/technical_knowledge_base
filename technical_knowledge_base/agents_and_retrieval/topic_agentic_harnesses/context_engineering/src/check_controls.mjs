// node technical_knowledge_base/agents_and_retrieval/topic_agentic_harnesses/context_engineering/src/check_controls.mjs <page index.html>  (run from the repository root)
// Clicks every button, moves every slider and select, steps every animation to its end, opens every details block,
// in 390 px dark and 920 px light; fails on page or console errors, a visible #jsErr, sideways scroll, or NaN/undefined/Infinity in the text.
// Then, under reduced motion and normal motion, checks that no animation has moved before the reader acts.
import { createRequire } from 'node:module'; import path from 'node:path';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const page = path.resolve(process.argv[2]);
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
let bad = 0;
const wait = ms => new Promise(r => setTimeout(r, ms));
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + page); await wait(300);
  for (const t of await p.$$eval('button[data-t]', bs => bs.map(x => x.dataset.t))) {
    await p.click(`button[data-t=${t}]`); await wait(150);
    await p.$$eval(`#${t} details`, ds => ds.forEach(d => { d.open = true }));
    // every non-control button (segments, chips, presets), then animation step-forward to the end
    const n = await p.$$eval(`#${t} button:not([id$="-p"]):not([id$="-b"]):not([id$="-f"])`, bs => bs.length);
    for (let i = 0; i < n; i++) {
      await p.$$eval(`#${t} button:not([id$="-p"]):not([id$="-b"]):not([id$="-f"])`, (bs, i) => bs[i].click(), i);
      await wait(20);
    }
    for (const id of await p.$$eval(`#${t} button[id$="-f"]`, bs => bs.map(x => x.id))) {
      for (let k = 0; k < 40; k++) await p.$eval('#' + id, x => x.click());
      await p.$eval('#' + id.replace(/-f$/, '-b'), x => x.click());
    }
    for (const id of await p.$$eval(`#${t} input[type=range]`, xs => xs.map(x => x.id))) {
      for (const f of [0, 0.5, 1]) await p.$eval('#' + id, (x, f) => { x.value = +x.min + f * (+x.max - +x.min); x.dispatchEvent(new Event('input', { bubbles: true })) }, f);
    }
    for (const id of await p.$$eval(`#${t} select`, xs => xs.map(x => x.id))) {
      const opts = await p.$eval('#' + id, x => [...x.options].map(o => o.value));
      for (const v of opts) await p.$eval('#' + id, (x, v) => { x.value = v; x.dispatchEvent(new Event('change', { bubbles: true })) }, v);
    }
    // a needle cell
    await p.$$eval(`#${t} g[data-id]`, gs => { if (gs[0]) gs[0].dispatchEvent(new MouseEvent('click', { bubbles: true })) });
    await wait(100);
    const txt = await p.$eval('#' + t, el => el.innerText);
    const m = txt.match(/.{0,40}\b(NaN|undefined|Infinity)\b.{0,40}/);
    const side = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    if (m || side) errs.push(`${t} ${scheme} ${width}: ${m ? m[0] : ''} ${side ? 'sideways' : ''}`);
  }
  const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) errs.push(box);
  console.log(scheme, width, errs.length ? errs : 'clean'); bad += errs.length; await p.close();
}
for (const rm of ['reduce', 'no-preference']) {
  const p = await b.newPage(); await p.setViewport({ width: 920, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: rm }]);
  await p.goto('file://' + page);
  // scroll every animation card into view and wait: nothing may move by itself
  for (const id of await p.$$eval('input[type=range][id$="-s"]', xs => xs.map(x => x.id))) { await p.$eval('#' + id, x => x.scrollIntoView()); await wait(1600) }
  const moved = await p.$$eval('input[type=range][id$="-s"]', xs => xs.filter(x => +x.value !== 0).map(x => x.id));
  console.log('motion', rm, moved.length ? 'MOVED ' + moved : 'all on step 0'); bad += moved.length; await p.close();
}
await b.close();
process.exit(bad ? 1 : 0);
