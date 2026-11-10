// node <page>/src/check_controls.mjs <page>/index.html (from the repo root)
// Clicks every button, moves every slider and select, toggles every checkbox and details block, and works every 3D stage's controls
// and step list, at 390 px dark, 920 px light, 920 px reduced motion and 1400 px light (2026-11-10: the hybrid animation and its
// never-autoplay assertion were replaced by the Attention stage; autoplay and reduced motion are checked in check_stages.mjs).
import { createRequire } from 'node:module'; import path from 'node:path';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
let bad = 0;
for (const [scheme, width, rm] of [['dark', 390, false], ['light', 920, false], ['light', 920, true], ['light', 1400, false]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: rm ? 'reduce' : 'no-preference' }]);
  await p.goto('file://' + path.resolve(process.argv[2]));
  // every stage control: back, forward, play twice, the scrubber, the speed, every step-list item (autoplay and reduced motion are in check_stages.mjs)
  for (const id of ['stg-tw', 'stg-at', 'stg-sl']) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' }));
    for (let i = 0; i < 3; i++) await p.$eval(`#${id}-f`, e => e.click());
    await p.$eval(`#${id}-b`, e => e.click()); await p.$eval(`#${id}-p`, e => e.click()); await new Promise(r => setTimeout(r, 300)); await p.$eval(`#${id}-p`, e => e.click());
    await p.$eval(`#${id}-r`, e => { e.value = 1; e.dispatchEvent(new Event('input')) }); await p.select(`#${id}-s`, '2');
    await p.$$eval('#sx-' + id.slice(4) + ' > li', ls => ls.forEach(l => l.click()));
  }
  for (const v of [0, 30, 60, 100]) await p.$eval('#cxL', (e, v) => { e.value = v; e.dispatchEvent(new Event('input')) }, v);
  await p.$$eval('#zg-work input[type=checkbox]', cs => cs.forEach(c => { c.click(); c.click(); }));
  await p.click('#cxW');
  for (const m of ['z', 'all']) await p.click(`#lnR button[data-m=${m}]`);
  for (let i = 0; i < 4; i++) await p.evaluate(i => document.querySelectorAll('#lnSvg .lnd')[i * 4].dispatchEvent(new MouseEvent('click', { bubbles: true })), i);
  const open = await p.$eval('#lnNotes', d => d.open); if (!open) errs.push('release notes did not open on a dot click');
  await p.$$eval('details', ds => ds.forEach(d => d.open = true));
  for (const t of ['t-more', 't-read']) await p.click(`button[data-t=${t}]`);
  const txt = await p.$eval('body', el => el.innerText);
  if (/\bNaN\b|\bundefined\b|\bInfinity\b/.test(txt)) errs.push('NaN/undefined/Infinity in text');
  if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)) errs.push('sideways scroll');
  const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) errs.push(box);
  console.log(scheme, width, rm ? 'reduced-motion' : '', errs.length ? errs : 'clean'); bad += errs.length; await p.close();
}
await b.close(); process.exit(bad ? 1 : 0);
