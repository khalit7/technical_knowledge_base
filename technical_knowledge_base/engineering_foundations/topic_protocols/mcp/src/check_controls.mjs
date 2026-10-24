// node <page>/src/check_controls.mjs <page>/index.html [shot dir]
// From the repo root. Clicks every control of the Reading tab at 390 px dark and 920 px light, steps every stepper to
// its end, fails on page errors, NaN/undefined/Infinity, sideways scroll or a visible error box; checks that nothing moves
// before the reader acts (normal motion); optionally screenshots every figure and card.
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const page = path.resolve(process.argv[2]); const shots = process.argv[3];
if (shots) fs.mkdirSync(shots, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
let bad = 0;
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + page);
  await p.evaluate(() => { try { localStorage.clear() } catch (e) {} });
  await p.reload();
  // nothing plays before the reader acts: scroll every card into view, wait, check every scrubber is still at 0
  const moved = await p.evaluate(async () => {
    for (const c of document.querySelectorAll('#t-read .card')) { c.scrollIntoView(); await new Promise(r => setTimeout(r, 400)); }
    await new Promise(r => setTimeout(r, 2500));
    return [...document.querySelectorAll('#t-read .an-ctl input[type=range]')].filter(s => +s.value !== 0).map(s => s.id);
  });
  if (moved.length) errs.push('autoplay: ' + moved.join(', '));
  await p.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    document.querySelectorAll('#t-read details').forEach(d => d.open = true);
    for (const s of document.querySelectorAll('#t-read select')) for (let i = 0; i < s.options.length; i++) { s.selectedIndex = i; s.dispatchEvent(new Event('change')); }
    for (const seg of document.querySelectorAll('#t-read .seg')) for (const btn of seg.querySelectorAll('button')) {
      btn.click(); await sleep(20);
      const ctl = seg.parentElement.querySelector('.an-ctl'); const f = ctl && ctl.querySelector('button[aria-label="Next step"]');
      const r = ctl && ctl.querySelector('input[type=range]');
      if (f) for (let i = 0; i <= +r.max; i++) f.click();
    }
    for (const ctl of document.querySelectorAll('#t-read .an-ctl')) { const f = ctl.querySelector('button[aria-label="Next step"]'), r = ctl.querySelector('input[type=range]');
      for (let i = 0; i <= +r.max; i++) f.click(); ctl.querySelector('button[aria-label="Previous step"]').click(); }
    document.querySelectorAll('#t-read .pr .opts button').forEach(x => x.click());
    document.querySelectorAll('#rd-cm td.cell').forEach(td => td.click());
    document.getElementById('rd-cm-all').click();
  });
  const txt = await p.$eval('#t-read', el => el.innerText);
  const m = txt.match(/\bNaN\b|\bundefined\b|\bInfinity\b/); if (m) errs.push('text has ' + m[0]);
  if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)) errs.push('sideways scroll');
  const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) errs.push(box);
  if (shots) {
    const els = await p.$$('#t-read .hero, #t-read .fig, #t-read .card');
    let i = 0; for (const el of els) { await el.scrollIntoView(); await el.screenshot({ path: path.join(shots, `${scheme}-${width}-${String(i++).padStart(2, '0')}.png`) }); }
  }
  console.log(scheme, width, errs.length ? errs : 'clean'); bad += errs.length; await p.close();
}
await b.close(); process.exit(bad ? 1 : 0);
