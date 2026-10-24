// node src/check_controls.mjs <page index.html>: click every button, move every slider and select, in 390 dark and 920 light,
// with reduced motion once; fails on page errors, a visible #jsErr, sideways scroll, NaN/undefined/Infinity, or an animation that moves by itself.
import { createRequire } from 'node:module'; import path from 'node:path';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
let bad = 0;
for (const [scheme, width, rm] of [['dark', 390, 'no-preference'], ['light', 920, 'reduce']]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: rm }]);
  await p.goto('file://' + path.resolve(process.argv[2]));
  // nothing may move before the reader acts: every scrubber stays at 0 after scrolling through the page
  const moved = await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); }
    await new Promise(r => setTimeout(r, 3000)); return [...document.querySelectorAll('#t-read .an-ctl input[type=range]')].filter(x => +x.value !== 0).map(x => x.id); });
  if (moved.length) errs.push('autoplay: ' + moved.join(','));
  for (const t of await p.$$eval('button[data-t]', bs => bs.map(b => b.dataset.t))) {
    await p.click(`button[data-t=${t}]`);
    await p.evaluate(async (t) => {
      const root = document.getElementById(t); root.querySelectorAll('details').forEach(d => d.open = true);
      for (const s of root.querySelectorAll('select')) for (const o of s.options) { s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); }
      for (const r of root.querySelectorAll('input[type=range]')) { r.value = r.max; r.dispatchEvent(new Event('input', { bubbles: true })); }
      for (const x of root.querySelectorAll('button')) { x.click(); }
      for (const c of root.querySelectorAll('input[type=checkbox]')) { c.click(); }
      for (const td of root.querySelectorAll('td.c')) td.click();
      await new Promise(r => setTimeout(r, 300));
    }, t);
    const txt = await p.$eval('#' + t, el => el.innerText);
    const m = txt.match(/\bNaN\b|\bundefined\b|\bInfinity\b/); if (m) errs.push(t + ': ' + m[0] + ' near ' + txt.slice(Math.max(0, m.index - 60), m.index + 20));
    if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)) errs.push(t + ': sideways scroll');
  }
  const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) errs.push(box);
  console.log(scheme, width, rm, errs.length ? errs : 'clean'); bad += errs.length; await p.close();
}
await b.close(); process.exit(bad ? 1 : 0);
