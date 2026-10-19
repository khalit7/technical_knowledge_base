// Clicks every control on every tab at 390 px dark and 920 px light; fails on page errors, console errors, a visible
// #jsErr, sideways scroll, or NaN / undefined / Infinity in a tab's text. Also checks nothing autoplays under reduced motion.
// Run from the repo root: node technical_knowledge_base/models_and_training/topic_llm_architecture/beyond_attention/src/check_controls.mjs [shots]
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const PAGE = path.resolve('technical_knowledge_base/models_and_training/topic_llm_architecture/beyond_attention/index.html');
const SHOTS = process.argv[2] ? path.resolve(process.argv[2]) : null; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
let bad = 0;
try {
  for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
    const p = await b.newPage(); const errs = [];
    p.on('pageerror', e => errs.push('pageerror ' + e.message)); p.on('console', m => m.type() === 'error' && errs.push('console ' + m.text()));
    await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
    await p.goto('file://' + PAGE); await new Promise(r => setTimeout(r, 300));
    const tabs = await p.$$eval('button[data-t]', bs => bs.map(x => x.dataset.t));
    let n = 0;
    for (const t of tabs) {
      await p.click(`button[data-t=${t}]`); await new Promise(r => setTimeout(r, 150));
      n += await p.evaluate(async (t) => {
        const root = document.getElementById(t); let c = 0; const sleep = ms => new Promise(r => setTimeout(r, ms));
        for (const s of root.querySelectorAll('select')) { for (const o of [...s.options]) { s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); c++ } s.selectedIndex = 0; s.dispatchEvent(new Event('change', { bubbles: true })) }
        for (const r of root.querySelectorAll('input[type=range]')) { for (let v = +r.min; v <= +r.max; v += Math.max(1, Math.round((+r.max - +r.min) / 8))) { r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); c++ } r.value = r.max; r.dispatchEvent(new Event('input', { bubbles: true })) }
        for (const x of root.querySelectorAll('button, [role=button]')) { if (x.closest('a')) continue; x.click(); c++; await sleep(5) }
        for (const x of root.querySelectorAll('details')) { x.open = true }
        return c;
      }, t);
      await new Promise(r => setTimeout(r, 200));
      const txt = await p.$eval('#' + t, el => el.innerText);
      const m = txt.match(/.{0,40}\b(NaN|undefined|Infinity)\b.{0,40}/);
      const side = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      if (m || side) errs.push(`${t}: ${m ? 'text: ' + m[0] : ''} ${side ? 'sideways scroll' : ''}`);
      if (SHOTS) await p.screenshot({ path: path.join(SHOTS, `${t}_${scheme}${width}.png`), fullPage: true });
    }
    const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) errs.push('jsErr ' + box);
    console.log(scheme, width, 'controls', n, errs.length ? errs : 'clean'); bad += errs.length; await p.close();
  }
  const p = await b.newPage(); await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.setViewport({ width: 920, height: 900 }); await p.goto('file://' + PAGE);
  const tabs = await p.$$eval('button[data-t]', bs => bs.map(x => x.dataset.t)); const playing = [];
  for (const t of tabs) { await p.click(`button[data-t=${t}]`); await new Promise(r => setTimeout(r, 1500));
    playing.push(...await p.$$eval('#' + t + ' .an-play', bs => bs.filter(x => /Pause/.test(x.textContent)).map(x => x.id))) }
  console.log('reduced motion autoplay', playing.length ? playing : 'none'); bad += playing.length; await p.close();
} finally { await b.close() }
process.exit(bad ? 1 : 0);
