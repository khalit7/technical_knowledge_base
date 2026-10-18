// Click every control of the Inside tab at 390 px dark and 920 px light; fail on errors, NaN/undefined/Infinity,
// "(missing)" prose numbers, a visible error box or sideways scroll. Also checks nothing autoplays under reduced motion.
// Run from the repo root: node technical_knowledge_base/models_and_training/topic_llm_architecture/src/inside/check_in.mjs <index.html> [shots dir]
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const file = path.resolve(process.argv[2]); const shots = process.argv[3];
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
let bad = 0;
try {
  for (const [scheme, width, rm] of [['dark', 390, 'no-preference'], ['light', 920, 'no-preference'], ['light', 920, 'reduce']]) {
    const p = await b.newPage(); const errs = [];
    p.on('pageerror', e => errs.push('pageerror ' + e.message)); p.on('console', m => m.type() === 'error' && errs.push('console ' + m.text()));
    await p.setViewport({ width, height: 900 });
    await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: rm }]);
    await p.goto('file://' + file);
    await p.click('button[data-t=t-inside]');
    await new Promise(r => setTimeout(r, 300));
    if (rm === 'reduce') {
      await p.evaluate(() => document.getElementById('in-ph').scrollIntoView());
      await new Promise(r => setTimeout(r, 1500));
      const playing = await p.$$eval('#t-inside [aria-label=Pause]', a => a.length);
      console.log('reduced motion: playing animations =', playing); if (playing) bad++;
      await p.close(); continue;
    }
    // every button inside the tab (segments, anim controls, drills, atlas cells sampled)
    const n = await p.$$eval('#t-inside button', bs => bs.length);
    for (let i = 0; i < n; i++) {
      await p.evaluate(i => { const bt = document.querySelectorAll('#t-inside button')[i]; if (!bt) return;
        if (bt.closest('#in-atlas') && i % 17) return; bt.click(); }, i);
    }
    // every range: min, middle, max
    await p.$$eval('#t-inside input[type=range]', rs => rs.forEach(r => { for (const v of [r.min, (+r.min + +r.max) >> 1, r.max]) { r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); } }));
    // every select: every option
    await p.$$eval('#t-inside select', ss => ss.forEach(s => { for (let k = 0; k < s.options.length; k++) { s.selectedIndex = k; s.dispatchEvent(new Event('change', { bubbles: true })); } }));
    // some tokens in the text view and a click on the map
    await p.$$eval('#in-extext span', sp => sp.filter((_, k) => k % 37 === 0).forEach(s => s.click()));
    await p.evaluate(() => { const l = document.getElementById('in-exl'); l.value = '18'; l.dispatchEvent(new Event('change')); });
    const cv = await p.$('#in-excv'); if (cv) await cv.click();
    // details open
    await p.$$eval('#t-inside details', ds => ds.forEach(d => d.open = true));
    await new Promise(r => setTimeout(r, 400));
    const txt = await p.$eval('#t-inside', el => el.innerText);
    const m = txt.match(/.{0,40}(\bNaN\b|\bundefined\b|\bInfinity\b|\(missing\)).{0,40}/);
    if (m) errs.push('text: ' + m[0]);
    const side = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    if (side) errs.push('sideways scroll ' + await p.evaluate(() => document.documentElement.scrollWidth));
    const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) errs.push('jsErr ' + box);
    if (shots) { fs.mkdirSync(shots, { recursive: true });
      for (const id of ['in-s0', 'in-s2', 'in-s3', 'in-s4', 'in-s5', 'in-s6']) {
        const el = await p.$('#' + id); if (el) await el.screenshot({ path: path.join(shots, `${id}_${scheme}_${width}.png`) }); } }
    console.log(scheme, width, errs.length ? errs : 'clean'); bad += errs.length; await p.close();
  }
} finally { await b.close(); }
process.exit(bad ? 1 : 0);
