// node <page>/src/check_controls.mjs <page>/index.html (from the repo root)
// Clicks every button, moves every slider and select, toggles every checkbox and details block, steps the
// animation to its last step in every mode, at 390 px dark and 920 px light; checks nothing moves before a click.
import { createRequire } from 'node:module'; import path from 'node:path';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
let bad = 0;
for (const [scheme, width, rm] of [['dark', 390, false], ['light', 920, false], ['light', 920, true]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: rm ? 'reduce' : 'no-preference' }]);
  await p.goto('file://' + path.resolve(process.argv[2]));
  await p.evaluate(() => document.getElementById('hya').scrollIntoView());
  await new Promise(r => setTimeout(r, 1500));
  const fr = await p.$eval('#hya', c => +(c.dataset.frames || 0));
  if (fr) errs.push('hybrid animation moved before a click: ' + fr + ' frames');
  for (const m of ['g53', 'full', 'flash']) {
    await p.click(`#hyaM button[data-m=${m}]`);
    for (let i = 0; i < 9; i++) await p.click('#hyaFwd');
    for (const L of ['131072', '1048576']) await p.select('#hyaL', L);
    await p.click('#hyaBack');
  }
  await p.click('#hyaPlay'); await new Promise(r => setTimeout(r, 400)); await p.click('#hyaPlay');
  await p.$eval('#hyaScrub', e => { e.value = 350; e.dispatchEvent(new Event('input')) });
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
