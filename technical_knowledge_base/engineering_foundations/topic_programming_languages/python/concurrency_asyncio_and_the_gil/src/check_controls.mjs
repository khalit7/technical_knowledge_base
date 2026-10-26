// node <page>/src/check_controls.mjs   (run from the repo root or anywhere: paths are resolved from this file)
// Clicks every button, sets every range and select, opens every <details>, steps every animation to its end, at 390 px dark
// and 920 px light, plus once under reduced motion to confirm nothing plays by itself. Fails on any page or console error,
// a visible #jsErr, sideways scroll, or NaN / undefined / Infinity in a tab's text.
import { createRequire } from 'node:module'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = execSync('git rev-parse --show-toplevel', { cwd: HERE }).toString().trim();
const R = createRequire(path.join(ROOT, 'html_utils/package.json')); const puppeteer = R('puppeteer');
const PAGE = path.resolve(HERE, '../index.html');
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
let fail = 0;
for (const [scheme, width, motion] of [['dark', 390, 'no-preference'], ['light', 920, 'no-preference'], ['light', 920, 'reduce']]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: motion }]);
  await p.goto('file://' + PAGE);
  if (motion === 'reduce') {
    // nothing may move before the reader acts: scroll every animation into view, wait, and check each is still on step 0
    for (const id of ['cg-loop-card', 'cg-ft-card']) { await p.$eval('#' + id, el => el.scrollIntoView()); await new Promise(r => setTimeout(r, 1800)); }
    const moved = await p.$$eval('.cg-ctl input[type=range]', rs => rs.filter(r => +r.value !== 0).length);
    if (moved) errs.push(moved + ' animation(s) moved without the reader');
  } else for (const t of await p.$$eval('button[data-t]', bs => bs.map(x => x.dataset.t))) {
    await p.click(`button[data-t=${t}]`);
    await p.$$eval(`#${t} details`, ds => ds.forEach(d => { d.open = true; d.dispatchEvent(new Event('toggle')); }));
    const n = await p.$$eval(`#${t} button`, bs => bs.length);
    for (let i = 0; i < n; i++) await p.evaluate((t, i) => { const x = document.querySelectorAll(`#${t} button`)[i]; x && x.click(); }, t, i);
    // each segmented mode, then step its animation to the end
    await p.evaluate(t => {
      document.querySelectorAll(`#${t} .seg button`).forEach(sb => { sb.click();
        const card = sb.closest('.cg-anim'); if (!card) return;
        const f = card.querySelector('.cg-ctl button[aria-label="Next step"]'); const r = card.querySelector('.cg-ctl input[type=range]');
        for (let k = 0; k <= +(r ? r.max : 0); k++) f && f.click(); });
      document.querySelectorAll(`#${t} input[type=range]`).forEach(r => { r.value = r.max; r.dispatchEvent(new Event('input')); r.value = 0; r.dispatchEvent(new Event('input')); });
      document.querySelectorAll(`#${t} select`).forEach(s => { s.selectedIndex = s.options.length - 1; s.dispatchEvent(new Event('change')); });
    }, t);
    const bad = await p.$eval('#' + t, el => (el.innerText.match(/\bNaN\b|\bundefined\b|\bInfinity\b/) || [''])[0]);
    const side = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    if (bad || side) errs.push(`${t} ${scheme} ${width}: ${bad} ${side ? 'sideways' : ''}`);
  }
  const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) errs.push(box);
  console.log(scheme, width, motion, errs.length ? errs : 'clean'); fail += errs.length; await p.close();
}
await b.close(); process.exit(fail ? 1 : 0);
