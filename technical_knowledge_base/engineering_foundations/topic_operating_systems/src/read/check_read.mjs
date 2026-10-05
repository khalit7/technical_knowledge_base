// Exercise every control of the Reading and Further reading tabs at 390 dark and 920 light; report errors,
// NaN/undefined text and sideways scroll; screenshot each card into SHOTS (default: the page's .shots/rd/).
// usage (from the repo root): node technical_knowledge_base/engineering_foundations/topic_operating_systems/src/read/check_read.mjs
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const HERE = path.dirname(new URL(import.meta.url).pathname);
const require = createRequire(path.resolve(HERE, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const page = path.resolve(HERE, '../../index.html');
const SHOTS = process.env.SHOTS || path.resolve(HERE, '../../.shots/rd');
fs.mkdirSync(SHOTS, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell' });
let bad = 0;
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + page);
  for (const tab of ['t-read', 't-more']) {
    await p.click(`button[data-t=${tab}]`);
    await new Promise(r => setTimeout(r, 200));
    // every segmented button, then every animation control
    const segs = await p.$$(`#${tab} .seg button`);
    for (const s of segs) { await s.evaluate(e => e.scrollIntoView()); await s.click(); await new Promise(r => setTimeout(r, 60)); }
    const ctls = await p.$$(`#${tab} .an-ctl`);
    for (const c of ctls) {
      const id = await c.evaluate(e => e.id);
      await c.evaluate(e => e.scrollIntoView({ block: 'center' }));
      for (let k = 0; k < 12; k++) await p.click(`#${id}-f`);
      await p.click(`#${id}-b`); await p.click(`#${id}-p`); await new Promise(r => setTimeout(r, 100)); await p.click(`#${id}-p`);
      await p.select(`#${id}-v`, '2');
    }
    // segmented modes again, stepping each to its end
    for (const s of segs) {
      await s.click();
      const ctl = await s.evaluate(e => { const card = e.closest('.card'); const c = card && card.querySelector('.an-ctl'); return c ? c.id : '' });
      if (ctl) for (let k = 0; k < 12; k++) await p.click(`#${ctl}-f`);
    }
    const txt = await p.$eval('#' + tab, e => e.innerText);
    const m = txt.match(/.{0,40}\b(NaN|undefined|null|Infinity)\b.{0,40}/g);
    if (m) { errs.push('bad text: ' + m.slice(0, 5).join(' | ')); }
    const cards = await p.$$(`#${tab} .card`);
    let i = 0;
    for (const c of cards) { await c.evaluate(e => e.scrollIntoView()); await c.screenshot({ path: `${SHOTS}/${tab}-${scheme}-${width}-${String(i++).padStart(2, '0')}.png` }); }
  }
  const sw = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  const box = await p.evaluate(() => { const d = document.getElementById('jsErr'); return d && !d.hidden ? d.textContent : '' });
  if (box) errs.push('error box: ' + box);
  console.log(scheme, width, 'errors', JSON.stringify(errs), 'sideways', sw);
  if (errs.length || sw) bad = 1;
  await p.close();
}
await b.close();
process.exit(bad);
