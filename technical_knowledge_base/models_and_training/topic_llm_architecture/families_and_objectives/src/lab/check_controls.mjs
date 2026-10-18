// check_controls.mjs: click every control in every tab at 390 px dark and 920 px light; fail on page errors,
// a visible #jsErr, NaN/undefined/Infinity/(pending) in tab text, or sideways scroll. One browser, closed at the end.
// Run from the repo root: node <page>/src/lab/check_controls.mjs <page>/index.html
import { createRequire } from 'node:module'; import path from 'node:path';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
let fails = 0;
const shots = path.resolve(path.dirname(process.argv[2]), '.shots'); await import('node:fs').then(fs => fs.mkdirSync(shots, { recursive: true }));
try {
  for (const [scheme, width, rm] of [['dark', 390, 'no-preference'], ['light', 920, 'no-preference'], ['light', 920, 'reduce']]) {
    const p = await b.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
    await p.setViewport({ width, height: 900 });
    await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: rm }]);
    await p.goto('file://' + path.resolve(process.argv[2]));
    await p.evaluate(() => { try { localStorage.clear() } catch (e) {} });
    const tabs = await p.$$eval('#tabs button[data-t]', bs => bs.map(x => x.dataset.t));
    for (const t of tabs) {
      await p.click(`#tabs button[data-t=${t}]`); await new Promise(r => setTimeout(r, 250));
      if (rm === 'reduce') {   // nothing may autoplay: every Pause-labelled button must be absent
        const playing = await p.$$eval(`#${t} .an-play`, bs => bs.filter(x => /Pause/.test(x.textContent)).length);
        if (playing) errs.push(`${t}: ${playing} animation(s) autoplay under reduced motion`);
        continue;
      }
      // click every button (segments, steps, play, predict options), set every range to min, mid, max
      const n = await p.$$eval(`#${t} button`, bs => bs.length);
      for (let i = 0; i < n; i++) {
        await p.evaluate((t, i) => { const bt = document.querySelectorAll(`#${t} button`)[i]; if (bt && bt.offsetParent) bt.click() }, t, i);
      }
      await p.evaluate(t => { document.querySelectorAll(`#${t} input[type=range]`).forEach(r => { for (const v of [r.min, (+r.min + +r.max) / 2, r.max]) { r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })) } }) }, t);
      // step every animation to its end with the forward buttons
      await p.evaluate(t => { document.querySelectorAll(`#${t} [id$="-f"]`).forEach(f => { for (let k = 0; k < 60; k++) f.click() }) }, t);
      // click tokens in the mask explorer
      await p.evaluate(t => { document.querySelectorAll(`#${t} #mk-toks span[data-i]`).forEach((s, k) => { if (k % 5 === 0) s.click() }) }, t);
      await new Promise(r => setTimeout(r, 150));
      const txt = await p.$eval('#' + t, el => el.innerText);
      const bad = (txt.match(/\bNaN\b|\bundefined\b|\bInfinity\b|\(pending\)/g) || []);
      const side = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      if (bad.length || side) errs.push(`${t} ${scheme} ${width}: ${bad.join(',')} ${side ? 'sideways' : ''}`);
      await p.screenshot({ path: path.join(shots, `ctl_${t}_${scheme}_${width}.png`), fullPage: true });
    }
    const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) errs.push(box);
    console.log(scheme, width, rm, errs.length ? errs : 'clean'); fails += errs.length; await p.close();
  }
} finally { await b.close(); }
process.exit(fails ? 1 : 0);
