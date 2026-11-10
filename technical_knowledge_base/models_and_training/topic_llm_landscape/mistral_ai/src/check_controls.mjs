// node <page>/src/check_controls.mjs <page>/index.html   (from the repo root)
// Clicks every button, select, checkbox, details and lineage dot in 390 px dark, 920 px light and 1400 px light; steps the cache animation
// to its last step in every mode and the two 3D stages to theirs; checks that the cache animation and the stages play by themselves once
// scrolled into view (2026-11-06 rule) and that nothing moves by itself under reduced motion. check_stages.mjs checks the stages in depth.
import { createRequire } from 'node:module'; import path from 'node:path';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const wait = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
for (const [scheme, width, rm] of [['dark', 390, 'no-preference'], ['light', 920, 'no-preference'], ['light', 1400, 'no-preference'], ['light', 920, 'reduce']]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: rm }]);
  await p.goto('file://' + path.resolve(process.argv[2])); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto('file://' + path.resolve(process.argv[2]));
  // autoplay on view (inverted from the old never-autoplay check): each plays once in view, and none moves under reduced motion
  for (const id of ['swa', 'stg-mix', 'stg-now']) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2000);
    const f = await p.$eval('#' + id, e => +(e.dataset.frames || 0));
    if (rm === 'reduce' && f) errs.push(`${id} moved ${f} frames by itself under reduced motion`);
    if (rm !== 'reduce' && !f) errs.push(`${id} did not play when scrolled into view`);
  }
  for (const t of await p.$$eval('#tabs button[data-t]', bs => bs.map(b => b.dataset.t))) {
    await p.click(`#tabs button[data-t=${t}]`); await wait(200);
    if (t === 't-read') {
      for (const m of await p.$$eval('#swaM button', bs => bs.map(b => b.dataset.m))) {
        await p.$eval(`#swaM button[data-m="${m}"]`, b => b.click());
        for (let i = 0; i < 6; i++) await p.$eval('#swaFwd', b => b.click());
        const on = await p.$eval('#sx-swa-' + m, e => [...e.children].findIndex(li => li.classList.contains('on')));
        if (on !== 5) errs.push(`swa ${m} ended at list item ${on + 1}`);
        await p.$$eval('#sx-swa-' + m + ' li', ls => ls.forEach(l => l.click()));
      }
      for (const id of ['stg-mix', 'stg-now']) {
        for (let i = 0; i < 6; i++) await p.$eval(`#${id}-f`, b => b.click());
        await wait(1800); const st = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (!/step 5 of 5/.test(st)) errs.push(`${id} ended at ${st}`);
        await p.$eval(`#${id}-b`, b => b.click()); await p.$eval(`#${id}-p`, b => b.click()); await p.$eval(`#${id}-p`, b => b.click());
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
