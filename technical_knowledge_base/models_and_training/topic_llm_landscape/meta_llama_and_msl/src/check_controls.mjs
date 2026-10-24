// Every control on every tab, in 390 px dark and 920 px light, plus a no-autoplay check (also under reduced motion).
// Run from the repo root: node <page>/src/check_controls.mjs <page>/index.html
import { createRequire } from 'node:module'; import path from 'node:path';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
let fails = 0;
for (const [scheme, width, rm] of [['dark', 390, 'no-preference'], ['light', 920, 'no-preference'], ['light', 920, 'reduce']]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: rm }]);
  await p.goto('file://' + path.resolve(process.argv[2]));
  // no autoplay: scroll both animations into view and wait
  for (const id of ['ot', 'ag']) { await p.$eval('#' + id, e => e.scrollIntoView()); await sleep(1200);
    const f = await p.$eval('#' + id, e => +(e.dataset.frames || 0)); if (f) errs.push(`#${id} moved ${f} frames before any click`); }
  if (rm === 'reduce') { const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) errs.push(box); console.log(scheme, width, rm, errs.length ? errs : 'clean'); fails += errs.length; await p.close(); continue; }
  for (const t of await p.$$eval('button[data-t]', bs => bs.map(b => b.dataset.t))) {
    await p.click(`button[data-t=${t}]`); await sleep(150);
    // segmented buttons, step buttons, details
    const n = await p.$$eval(`#${t} button`, bs => bs.length);
    for (let i = 0; i < n; i++) { await p.$$eval(`#${t} button`, (bs, i) => bs[i].click(), i); await sleep(20); }
    // step both animations to their last step in each mode
    for (const id of ['ot', 'ag']) if (await p.$(`#${t} #${id}`)) {
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
