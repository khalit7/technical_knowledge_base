// Screenshot each visual of the page in light 920 and dark 390 (predict reveals opened) for review.
// usage (from the repo root): node technical_knowledge_base/reference/papers/re_grading_six_physics_benchmarks/src/shot_parts.mjs <out dir>
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
  await p.evaluate(() => document.querySelectorAll('.pred .skip').forEach(s => s.click()));
  await new Promise(r => setTimeout(r, 400));
  for (const id of ['hero', 'gal', 'f1', 'pr1', 'pr2', 'fl', 'pr3']) { const el = await p.$('#' + id); await el.scrollIntoView(); await el.screenshot({ path: `${out}/${id}-${scheme}-${width}.png` }) }
  await p.$eval('#tabs button[data-t=t-run]', e => e.click()); await new Promise(r => setTimeout(r, 300));
  for (const id of ['sm']) { const el = await p.$('#' + id); await el.screenshot({ path: `${out}/${id}-${scheme}-${width}.png` }) }
  await p.$eval('#tabs button[data-t=t-tables]', e => e.click()); await new Promise(r => setTimeout(r, 300));
  await p.screenshot({ path: `${out}/tables-${scheme}-${width}.png`, fullPage: true });
  await p.close();
}
await b.close(); console.log('ok');
