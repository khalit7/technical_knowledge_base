// node <page>/src/check_controls.mjs <page>/index.html   (from the repo root)
// Clicks every button, select, details and some lineage dots in 390 px dark, 920 px light and 1400 px light; moves every slider;
// steps the injection animation to its last step in every scenario; since 2026-11-10 (autoplay rule) it checks that the animation plays by itself
// once in view and never under reduced motion. The 3D stages (Figs. 3 to 5) are checked by check_stages.mjs.
import { createRequire } from 'node:module'; import path from 'node:path';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const wait = ms => new Promise(r => setTimeout(r, ms));
const LAST = { ij: { enc: 'step 7 of 7', plain: 'step 4 of 4', gate: 'step 7 of 7' } };
let fails = 0;
for (const [scheme, width, rm] of [['dark', 390, 'no-preference'], ['light', 920, 'no-preference'], ['light', 1400, 'no-preference'], ['light', 920, 'reduce']]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: rm }]);
  await p.goto('file://' + path.resolve(process.argv[2])); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto('file://' + path.resolve(process.argv[2]));
  { await wait(600); await p.$eval('#ij', e => e.scrollIntoView({ block: 'center' })); await wait(500); await p.$eval('#ij', e => e.scrollIntoView({ block: 'center' })); await wait(rm === 'reduce' ? 5200 : 1500);
    const playing = await p.$eval('#ijCtl-p', e => /Pause/.test(e.textContent)), step = await p.$eval('#ijStep', e => e.textContent);
    if (rm === 'reduce' && (playing || step !== 'step 1 of 7')) errs.push(`ij moved under reduced motion (${step})`);
    if (rm !== 'reduce' && !playing) errs.push('ij did not play once in view'); }
  for (const t of await p.$$eval('#tabs button[data-t]', bs => bs.map(b => b.dataset.t))) {
    await p.click(`#tabs button[data-t=${t}]`); await wait(200);
    if (t === 't-read') {
      for (const m of ['enc', 'plain', 'gate']) {
        await p.$eval(`#ijM button[data-m="${m}"]`, b => b.click()); await wait(300);
        for (let i = 0; i < 8; i++) await p.$eval('#ijCtl-f', b => b.click());
        const step = await p.$eval('#ijStep', e => e.textContent); if (step !== LAST.ij[m]) errs.push(`ij ${m} ended at ${step}`);
        if (await p.$eval('#ijCtl-p', e => /Pause/.test(e.textContent))) errs.push(`ij ${m} kept playing after the reader stepped`);
        for (let i = 0; i < 8; i++) await p.$eval('#ijCtl-b', b => b.click());
      }
      await p.$$eval('#lnSvg g[data-i]', gs => gs.slice(0, 3).forEach(g => g.dispatchEvent(new MouseEvent('click', { bubbles: true }))));
      if (!await p.$eval('#lnDet', d => d.open)) errs.push('a lineage dot did not open the release notes');
      await p.$$eval('#t-read details', ds => ds.forEach(d => d.open = true));
      for (const [id, vals] of [['lcP', [0, 150000, 199000, 200000, 260000, 500000]], ['lcC', [0, 50, 95]], ['lcO', [0, 50000]], ['g1C', [10, 13, 17]]]) {
        for (const v of vals) await p.$eval('#' + id, (e, v) => { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); }, v);
      }
      for (const [id, v] of [['lcC', 0], ['lcO', 5000], ['lcP', 199000]]) await p.$eval('#' + id, (e, v) => { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); }, v);
      const c = await p.$eval('#lcOut', e => e.innerText); if (!c.includes('$0.428')) errs.push('cliff default is not $0.428: ' + c.slice(0, 60));
    }
    const n = await p.$$eval(`#${t} .seg button, #${t} .chips button`, bs => bs.length);
    for (let i = 0; i < n; i++) await p.$$eval(`#${t} .seg button, #${t} .chips button`, (bs, i) => bs[i].click(), i);
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
