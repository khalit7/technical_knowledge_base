// Screenshot each visual of the page in light 920 and dark 390 (predict reveals opened) for review.
// usage (from the repo root): node technical_knowledge_base/whats_new/papers/re_grading_six_physics_benchmarks/src/shot_parts.mjs <out dir>
import puppeteer from '../../../../../html_utils/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const file = 'file://' + path.resolve(here, '../index.html');
const out = process.argv[2] || path.resolve(here, '../.shots');
const b = await puppeteer.launch({ headless: 'shell' });
for (const [scheme, width] of [['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]); await p.goto(file);
  await p.$eval('#tabs button[data-t=t-read]', e => e.click());
  await p.evaluate(() => document.querySelectorAll('.pred .skip').forEach(s => s.click()));
  await new Promise(r => setTimeout(r, 400));
  for (const id of ['stg-hero', 'gal', 'stg-res', 'pr1', 'pr2', 'fl', 'pr3']) {
    // clip to the element's box after scrolling it to the top (a sticky stage beside it can make puppeteer's own visibility test fail)
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'start' })); await new Promise(r => setTimeout(r, 300));
    const r = await p.$eval('#' + id, e => { const b = e.getBoundingClientRect(); return { x: b.x + scrollX, y: b.y + scrollY, width: b.width, height: b.height } }); if (!(r.width > 0)) { console.log('not shown', id, scheme, width); continue }
    await p.screenshot({ path: `${out}/${id}-${scheme}-${width}.png`, clip: r, captureBeyondViewport: true }) }
  await p.$eval('#tabs button[data-t=t-run]', e => e.click()); await new Promise(r => setTimeout(r, 300));
  for (const id of ['sm']) { const el = await p.$('#' + id); await el.screenshot({ path: `${out}/${id}-${scheme}-${width}.png` }) }
  await p.$eval('#tabs button[data-t=t-tables]', e => e.click()); await new Promise(r => setTimeout(r, 300));
  { const el = await p.$('#f1'); await el.scrollIntoView(); await el.screenshot({ path: `${out}/f1-${scheme}-${width}.png` }) }
  await p.screenshot({ path: `${out}/tables-${scheme}-${width}.png`, fullPage: true });
  await p.close();
}
await b.close(); console.log('ok');
