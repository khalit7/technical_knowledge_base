// Every control on every tab, in 390 px dark, 920 px light and 1400 px light, plus the motion rules (2026-11-06): the 2D animation (#ot) and the three
// 3D stages play by themselves once scrolled into view, and nothing moves by itself under reduced motion. check_stages.mjs checks the stages in depth.
// Run from the repo root: node <page>/src/check_controls.mjs <page>/index.html
import { createRequire } from 'node:module'; import path from 'node:path';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
let fails = 0;
for (const [scheme, width, rm] of [['dark', 390, 'no-preference'], ['light', 920, 'no-preference'], ['light', 1400, 'no-preference'], ['light', 920, 'reduce']]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: rm }]);
  // the page remembers the last tab: clear it so each pass starts on Reading
  await p.goto('file://' + path.resolve(process.argv[2])); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto('file://' + path.resolve(process.argv[2]));
  // autoplay on view (inverted 2026-11-10 from the old never-autoplay check): each plays once at least half in view; under reduced motion none moves
  for (const id of ['ot', 'stg-ot', 'stg-l4', 'stg-ag']) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await sleep(1800);
    const f = await p.$eval('#' + id, e => +(e.dataset.frames || 0));
    if (rm === 'reduce' && f) errs.push(`#${id} moved ${f} frames by itself under reduced motion`);
    if (rm !== 'reduce' && !f) errs.push(`#${id} did not play when scrolled into view`); }
  if (rm === 'reduce') { const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) errs.push(box); console.log(scheme, width, rm, errs.length ? errs : 'clean'); fails += errs.length; await p.close(); continue; }
  for (const t of await p.$$eval('button[data-t]', bs => bs.map(b => b.dataset.t))) {
    await p.click(`button[data-t=${t}]`); await sleep(150);
    // segmented buttons, step buttons, details, step-list items
    const n = await p.$$eval(`#${t} button`, bs => bs.length);
    await p.$$eval(`#${t} ol.sx > li`, ls => ls.forEach(l => l.click()));
    for (let i = 0; i < n; i++) { await p.$$eval(`#${t} button`, (bs, i) => bs[i].click(), i); await sleep(20); }
    // step the 2D animation to its last step in each mode
    for (const id of ['ot']) if (await p.$(`#${t} #${id}`)) {
      for (const m of await p.$$eval(`#${id} .seg button`, bs => bs.map(b => b.dataset.m))) {
        await p.$eval(`#${id} .seg button[data-m="${m}"]`, b => b.click());
        for (let k = 0; k < 8; k++) await p.$eval(`#${id}Fwd`, b => b.click());
        await p.$eval(`#${id}Play`, b => b.click()); await sleep(300); await p.$eval(`#${id}Play`, b => b.click());
        await p.$eval(`#${id}Back`, b => b.click());
      } }
    await p.$$eval(`#${t} details`, ds => ds.forEach(d => d.open = true));
    await p.$$eval(`#${t} svg .lnd`, gs => gs.slice(0, 3).forEach(g => g.dispatchEvent(new MouseEvent('click', { bubbles: true }))));
    for (const id of await p.$$eval(`#${t} select`, ss => ss.map(s => s.id))) {
      for (const v of await p.$$eval(`#${id} option`, os => os.map(o => o.value))) { await p.select('#' + id, v); await sleep(20); } }
    for (const id of await p.$$eval(`#${t} input[type=range]`, rs => rs.map(r => r.id))) {
      for (const f of [0, 0.5, 1]) await p.$eval('#' + id, (r, f) => { r.value = +r.min + f * (r.max - r.min); r.dispatchEvent(new Event('input', { bubbles: true })) }, f); }
    await sleep(100);
    const bad = await p.$eval('#' + t, el => (el.innerText.match(/\bNaN\b|\bundefined\b|\bInfinity\b/) || [''])[0]);
    const side = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    if (bad || side) errs.push(`${t}: ${bad} ${side ? 'sideways' : ''}`);
  }
  const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) errs.push(box);
  console.log(scheme, width, rm, errs.length ? errs : 'clean'); fails += errs.length; await p.close();
}
await b.close(); process.exit(fails ? 1 : 0);
