// Screenshot chosen elements after opening every predict-then-reveal (for looking at the reveals).
// usage (from the repo root): node technical_knowledge_base/reference/papers/olmo_2/src/shot_parts.mjs <out dir>
import puppeteer from '../../../../../html_utils/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const out = process.argv[2] || path.resolve(here, '../.shots');
const b = await puppeteer.launch({ headless: true });
for (const [scheme, width] of [['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + path.resolve(here, '../index.html'));
  await p.evaluate(() => document.querySelectorAll('.pred .skip').forEach(s => s.click()));
  await new Promise(r => setTimeout(r, 400));
  for (const id of ['pr-qk', 'pr-lr', 'pr-micro', 'soupcard', 't9card', 'postcard', 'f1card', 'norm', 'f5card']) {
    const el = await p.$('#' + id); if (!el) continue; await el.scrollIntoView(); await new Promise(r => setTimeout(r, 150));
    await el.screenshot({ path: `${out}/p-${id}-${scheme}-${width}.png` });
  }
  await p.close();
}
await b.close(); console.log('ok');
