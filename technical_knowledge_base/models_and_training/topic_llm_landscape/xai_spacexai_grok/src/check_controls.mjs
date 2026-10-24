// node <page>/src/check_controls.mjs <page>/index.html   (from the repo root)
// Clicks every button, select, details and some lineage dots in 390 px dark and 920 px light; moves every slider;
// steps both animations to their last step in every mode; checks nothing animates before a click (also under reduced motion).
import { createRequire } from 'node:module'; import path from 'node:path';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const wait = ms => new Promise(r => setTimeout(r, ms));
const LAST = { hv: { par: 'Step 4 of 4', ser: 'Step 4 of 4' }, ij: { enc: '(of 7)', plain: '(of 4)', gate: '(of 7)' } };
let fails = 0;
for (const [scheme, width, rm] of [['dark', 390, 'no-preference'], ['light', 920, 'no-preference'], ['light', 920, 'reduce']]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: rm }]);
  await p.goto('file://' + path.resolve(process.argv[2]));
  for (const id of ['hv', 'ij']) {
    await p.$eval('#' + id, e => e.scrollIntoView()); await wait(1500);
    const f = await p.$eval('#' + id, e => +(e.dataset.frames || 0)); if (f) errs.push(`${id} moved ${f} frames before a click`);
  }
  for (const t of await p.$$eval('#tabs button[data-t]', bs => bs.map(b => b.dataset.t))) {
    await p.click(`#tabs button[data-t=${t}]`); await wait(200);
    if (t === 't-read') {
      for (const id of ['hv', 'ij']) {
        for (const m of await p.$$eval(`#${id}M button`, bs => bs.map(b => b.dataset.m))) {
          await p.$eval(`#${id}M button[data-m="${m}"]`, b => b.click()); await wait(300);
          const f0 = await p.$eval('#' + id, e => +(e.dataset.frames || 0));
          await wait(600); if (await p.$eval('#' + id, e => +(e.dataset.frames || 0)) !== f0) errs.push(`${id} ${m} started by itself after a mode switch`);
          for (let i = 0; i < 8; i++) await p.$eval(`#${id}Fwd`, b => b.click());
          const step = await p.$eval(`#${id}Step`, e => e.textContent); if (!step.includes(LAST[id][m])) errs.push(`${id} ${m} ended at ${step}`);
          for (let i = 0; i < 8; i++) await p.$eval(`#${id}Back`, b => b.click());
        }
        await p.$eval('#' + id, e => e.scrollIntoView()); await wait(400);
        await p.$eval(`#${id}Play`, b => b.click()); await wait(700); await p.$eval(`#${id}Play`, b => b.click());
        if (!await p.$eval('#' + id, e => +(e.dataset.frames || 0))) errs.push(`${id} did not play on click`);
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
