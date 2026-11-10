// node <page>/src/check_controls.mjs <page>/index.html (from the repo root)
// Clicks every button, moves every slider and select in the Reading tab, clicks every timeline dot, opens every
// closed block, at 390 px dark, 920 px light and 1400 px light (and 920 px light with reduced motion); fails on page or
// console errors, a visible #jsErr, sideways scroll or NaN/undefined/Infinity in the text. The 3D stages' autoplay and
// reduced-motion rules (which replaced the old never-autoplay assertions on the 2D KDA/MLA animation, 2026-11-10) are
// checked by check_stages.mjs.
import { createRequire } from 'node:module'; import path from 'node:path';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const wait = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
let bad = 0;
for (const [scheme, width, motion] of [['dark', 390, 'no-preference'], ['light', 920, 'no-preference'], ['light', 1400, 'no-preference'], ['light', 920, 'reduce']]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: motion }]);
  await p.goto('file://' + path.resolve(process.argv[2]));
  await p.evaluate(() => { try { localStorage.clear() } catch (e) {} });
  const n = await p.$$eval('#t-read button', bs => bs.length);
  for (let i = 0; i < n; i++) await p.evaluate(i => { const x = document.querySelectorAll('#t-read button')[i]; x.scrollIntoView({ block: 'center' }); x.click(); }, i);
  await p.$$eval('#t-read input[type=range]', rs => rs.forEach(r => { for (const v of [r.min, r.max, (+r.min + +r.max) / 2]) { r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); } }));
  await p.$$eval('#t-read select', ss => ss.forEach(s => [...s.options].forEach(o => { s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); })));
  for (const id of ['ppM', 'pmS', 'drP', 'drR']) for (const m of await p.$$eval(`#${id} button`, bs => bs.map(x => x.dataset.m))) { await p.click(`#${id} button[data-m="${m}"]`); }
  await p.$$eval('#lnSvg .lnd', gs => gs.forEach(g => g.dispatchEvent(new MouseEvent('click', { bubbles: true }))));
  await p.$$eval('details', ds => ds.forEach(d => d.open = true));
  for (const t of ['t-more', 't-read']) {
    await p.click(`button[data-t=${t}]`); await wait(200);
    const txt = await p.$eval('#' + t, el => el.innerText);
    const m = txt.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/); if (m) errs.push(`${t}: ${m[0]}`);
    if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)) errs.push(`${t}: sideways scroll`);
  }
  const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) errs.push(box);
  console.log(scheme, width, motion, errs.length ? errs : 'clean'); bad += errs.length; await p.close();
}
await b.close(); process.exit(bad ? 1 : 0);
