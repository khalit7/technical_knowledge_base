// Click every control of the page at 390 dark and 920 light; report errors, NaN/undefined text, sideways scroll; screenshot the cards.
// usage (from the repo root): node <this file> <index.html> <shots dir>
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(path.resolve('html_utils/package.json'));
const puppeteer = require('puppeteer');
const [file, out] = process.argv.slice(2);
const b = await puppeteer.launch({ headless: 'shell' });
let bad = 0;
for (const [scheme, w] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width: w, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + path.resolve(file));
  const tabs = await p.$$eval('#tabs button', bs => bs.map(x => x.dataset.t));
  let clicks = 0;
  for (const t of tabs) {
    await p.click(`#tabs button[data-t=${t}]`); await new Promise(r => setTimeout(r, 200));
    const sel = `#${t} button, #${t} td.y, #${t} summary`;
    const n = (await p.$$(sel)).length;
    for (let i = 0; i < n; i++) {
      const hs = await p.$$(sel); if (!hs[i]) continue;
      const vis = await hs[i].evaluate(e => e.offsetParent !== null && !e.closest('#tabs'));
      if (!vis) continue;
      try { await hs[i].evaluate(e => e.click()); clicks++; } catch (e) { errs.push('click ' + e.message) }
    }
    for (const s of await p.$$(`#${t} select`)) {
      const opts = await s.$$eval('option', os => os.map(o => o.value));
      for (const v of opts) { await s.select(v); clicks++ }
    }
    for (const c of await p.$$(`#${t} input[type=checkbox]`)) { await c.click(); await c.click(); clicks += 2 }
    for (const r of await p.$$(`#${t} input[type=range]`)) { await r.evaluate(e => { e.value = e.max; e.dispatchEvent(new Event('input')) }); clicks++ }
    const txt = await p.$eval('#' + t, e => e.innerText);
    const m = txt.match(/\bNaN\b|\bundefined\b|\[object Object\]/g); if (m) errs.push(t + ': ' + m.join(','));
    const sw = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth); if (sw) errs.push(t + ': sideways scroll');
    const cards = await p.$$(`#${t} .card, #${t} #hg-body, #${t} .ev-wrap`);
    let k = 0; for (const c of cards) { if (await c.evaluate(e => e.offsetParent !== null)) { await c.screenshot({ path: `${out}/${t}-${scheme}-${w}-${k++}.png` }) } }
  }
  const box = await p.evaluate(() => { const d = document.getElementById('jsErr'); return d && !d.hidden ? d.textContent : '' });
  if (box) errs.push('error box: ' + box);
  console.log(scheme, w, 'clicks', clicks, 'errors', JSON.stringify(errs)); if (errs.length) bad = 1;
  await p.close();
}
await b.close(); process.exit(bad);
