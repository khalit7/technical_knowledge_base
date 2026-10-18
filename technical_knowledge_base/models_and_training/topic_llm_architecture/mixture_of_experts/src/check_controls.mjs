// Click every control of the MoE page at 390 px dark and 920 px light; fail on page errors, console errors, a visible
// #jsErr, sideways scroll, or NaN / undefined / Infinity in a tab's text. Also checks reduced motion does not autoplay.
// Run from the repo root: node technical_knowledge_base/models_and_training/topic_llm_architecture/mixture_of_experts/src/check_controls.mjs
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const page = path.resolve('technical_knowledge_base/models_and_training/topic_llm_architecture/mixture_of_experts/index.html');
const shots = path.join(path.dirname(page), '.shots'); fs.mkdirSync(shots, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
let bad = 0;
try {
  for (const [scheme, width, rm] of [['dark', 390, 'no-preference'], ['light', 920, 'no-preference'], ['light', 920, 'reduce']]) {
    const p = await b.newPage(); const errs = [];
    p.on('pageerror', e => errs.push('pageerror ' + e.message)); p.on('console', m => m.type() === 'error' && errs.push('console ' + m.text()));
    await p.setViewport({ width, height: 900 });
    await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: rm }]);
    await p.goto('file://' + page, { waitUntil: 'load' });
    const tabs = await p.$$eval('button[data-t]', bs => bs.map(x => x.dataset.t));
    for (const t of tabs) {
      await p.click(`button[data-t=${t}]`); await new Promise(r => setTimeout(r, 250));
      if (rm === 'reduce') continue;
      // every button (segmented controls, drills, animation controls), every select option, every range position
      const n = await p.$$eval(`#${t} button`, bs => bs.length);
      for (let i = 0; i < n; i++) {
        await p.evaluate((t, i) => { const x = document.querySelectorAll(`#${t} button`)[i]; if (x && x.offsetParent) x.click(); }, t, i);
      }
      await p.evaluate(t => {
        document.querySelectorAll(`#${t} select`).forEach(s => { for (const o of s.options) { s.value = o.value; s.dispatchEvent(new Event('change')); } });
        document.querySelectorAll(`#${t} input[type=range]`).forEach(r => { for (let v = +r.min; v <= +r.max; v += (+r.step || 1)) { r.value = v; r.dispatchEvent(new Event('input')); } });
      }, t);
      await new Promise(r => setTimeout(r, 200));
      const txt = await p.$eval('#' + t, el => el.innerText);
      const m = txt.match(/.{0,40}\b(NaN|undefined|Infinity)\b.{0,40}/);
      const side = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      if (m) errs.push(`${t}: text contains "${m[0]}"`);
      if (side) errs.push(`${t}: sideways scroll`);
      if (/PENDING/.test(txt)) errs.push(`${t}: PENDING placeholder visible`);
      await p.screenshot({ path: path.join(shots, `ctl_${t}_${scheme}_${width}.png`), fullPage: true });
    }
    if (rm === 'reduce') {
      await p.click('button[data-t=t-route]'); await new Promise(r => setTimeout(r, 2500));
      const label = await p.$eval('#rt-ctl-p', x => x.textContent).catch(() => 'none');
      if (/Pause/.test(label)) errs.push('reduced motion: route animation autoplays');
    }
    const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) errs.push('jsErr ' + box);
    console.log(scheme, width, rm, errs.length ? errs : 'clean'); bad += errs.length; await p.close();
  }
} finally { await b.close(); }
process.exit(bad ? 1 : 0);
