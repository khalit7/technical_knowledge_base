// Screenshot chosen elements of the built page for review (not part of the build).
// usage (repo root): node technical_knowledge_base/reference/papers/repo_to_skill/src/shoot.mjs <outdir> <scheme> <width> <tab> <selector>[@steps] ...
import puppeteer from '../../../../../html_utils/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';
import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const [out, scheme, width, tab, ...sels] = process.argv.slice(2);
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.setViewport({ width: +width, height: 1000 });
await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
await p.goto('file://' + path.resolve(here, '../index.html'));
await p.$eval(`#tabs button[data-t=${tab}]`, e => e.click()); await new Promise(r => setTimeout(r, 300));
let i = 0;
for (const s of sels) {
  const [sel, act] = s.split('@');
  if (act) for (const a of act.split(',')) { await p.$eval(a, e => e.click()); await new Promise(r => setTimeout(r, 150)); }
  const el = await p.$(sel); if (!el) { console.log('missing', sel); continue; }
  await el.scrollIntoView(); await new Promise(r => setTimeout(r, 200));
  await el.screenshot({ path: `${out}/${tab}-${scheme}-${width}-${i++}.png` });
}
console.log('errors', errs); await b.close();
