// node src/check_controls.mjs <page index.html> <shots dir> [tab]
// Clicks every button, sets every select option and moves every range in each tab, at 390 px dark and 920 px light;
// fails on page errors, console errors, a visible #jsErr, sideways scroll, or NaN / undefined / Infinity in tab text.
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const [page, shots, only] = process.argv.slice(2); fs.mkdirSync(shots, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
let bad = 0, actions = 0;
try {
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push('pageerror ' + e.message)); p.on('console', m => m.type() === 'error' && errs.push('console ' + m.text()));
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + path.resolve(page)); await new Promise(r => setTimeout(r, 300));
  const tabs = await p.$$eval('button[data-t]', bs => bs.map(b => b.dataset.t));
  for (const t of tabs) {
    if (only && t !== only) continue;
    await p.click(`button[data-t=${t}]`); await new Promise(r => setTimeout(r, 150));
    const check = async (what) => {
      const txt = await p.$eval('#' + t, el => el.innerText);
      const m = txt.match(/.{0,40}\b(NaN|undefined|Infinity)\b.{0,40}/);
      const side = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      if (m || side) { errs.push(`${t} ${what}: ${m ? m[0] : ''} ${side ? 'sideways' : ''}`); }
    };
    await check('open');
    // selects: every option
    const sels = await p.$$(`#${t} select`);
    for (const s of sels) {
      const vis = await s.evaluate(e => e.offsetParent !== null); if (!vis) continue;
      const opts = await s.$$eval('option', os => os.map(o => o.value));
      for (const v of opts) { await s.evaluate((e, v) => { e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })); }, v); actions++; }
      await check('select');
    }
    const rng = await p.$$(`#${t} input[type=range]`);
    for (const r of rng) {
      const vis = await r.evaluate(e => e.offsetParent !== null); if (!vis) continue;
      const [mn, mx] = await r.evaluate(e => [+e.min, +e.max]);
      for (const v of [mn, Math.round((mn + mx) / 2), mx]) { await r.evaluate((e, v) => { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }, v); actions++; }
      await check('range');
    }
    const btns = await p.$$(`#${t} button`);
    for (const x of btns) {
      const vis = await x.evaluate(e => e.offsetParent !== null && !e.closest('#tabs')); if (!vis) continue;
      await x.click().catch(() => {}); actions++;
    }
    await check('buttons');
    const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) errs.push('jsErr ' + box);
    await p.screenshot({ path: path.join(shots, `${t}-${scheme}-${width}.png`), fullPage: true });
  }
  console.log(scheme, width, errs.length ? errs : 'clean'); bad += errs.length; await p.close();
}
} finally { await b.close(); }
console.log('actions', actions, 'problems', bad); process.exit(bad ? 1 : 0);
