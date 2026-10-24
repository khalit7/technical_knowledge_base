// node <page>/src/check_controls.mjs <page>/index.html   (from the repo root)
// Clicks every button, select, checkbox, details and lineage dot in 390 px dark and 920 px light; steps both animations
// to their last step in every mode; checks that nothing animates before a click (also under reduced motion).
import { createRequire } from 'node:module'; import path from 'node:path';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const wait = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
for (const [scheme, width, rm] of [['dark', 390, 'no-preference'], ['light', 920, 'no-preference'], ['light', 920, 'reduce']]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: rm }]);
  await p.goto('file://' + path.resolve(process.argv[2]));
  // no autoplay: scroll both animation cards into view and wait
  for (const id of ['swa', 'moe']) {
    await p.$eval('#' + id, e => e.scrollIntoView()); await wait(1500);
    const f = await p.$eval('#' + id, e => +(e.dataset.frames || 0)); if (f) errs.push(`${id} moved ${f} frames before a click`);
  }
  for (const t of await p.$$eval('#tabs button[data-t]', bs => bs.map(b => b.dataset.t))) {
    await p.click(`#tabs button[data-t=${t}]`); await wait(200);
    if (t === 't-read') {
      for (const id of ['swa', 'moe']) {
        for (const m of await p.$$eval(`#${id}M button`, bs => bs.map(b => b.dataset.m))) {
          await p.$eval(`#${id}M button[data-m="${m}"]`, b => b.click());
          for (let i = 0; i < 6; i++) await p.$eval(`#${id}Fwd`, b => b.click());
          const step = await p.$eval(`#${id}Step`, e => e.textContent); if (!/Step 6 of 6/.test(step)) errs.push(`${id} ${m} ended at ${step}`);
        }
      }
      await p.$$eval('#t-read details', ds => ds.forEach(d => d.open = true));
      await p.$$eval('#lnSvg .lnd', gs => gs.slice(0, 3).forEach(g => g.dispatchEvent(new MouseEvent('click', { bubbles: true }))));
      if (!await p.$eval('#lnNotes', d => d.open)) errs.push('a lineage dot did not open the release notes');
    }
    // every segmented button, chip and checkbox in the tab
    const n = await p.$$eval(`#${t} .seg button, #${t} .chips button, #${t} #grTab button`, bs => bs.length);
    for (let i = 0; i < n; i++) await p.$$eval(`#${t} .seg button, #${t} .chips button, #${t} #grTab button`, (bs, i) => bs[i].click(), i);
    for (const c of await p.$$(`#${t} input[type=checkbox]`)) { await c.click(); await c.click(); }
    for (const s of await p.$$(`#${t} select`)) {
      const vals = await s.$$eval('option', os => os.map(o => o.value));
      for (const v of vals) await s.select(v);
    }
    const bad = await p.$eval('#' + t, el => /\bNaN\b|\bundefined\b|\bInfinity\b/.test(el.innerText));
    const side = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    if (bad || side) errs.push(`${t}: ${bad ? 'NaN/undefined ' : ''}${side ? 'sideways' : ''}`);
  }
  const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) errs.push(box);
  console.log(scheme, width, 'reduced-motion=' + rm, errs.length ? errs : 'clean'); fails += errs.length; await p.close();
}
await b.close(); process.exit(fails ? 1 : 0);
