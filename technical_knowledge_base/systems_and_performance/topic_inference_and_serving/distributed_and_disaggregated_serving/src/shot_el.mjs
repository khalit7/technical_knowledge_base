// Screenshot elements of the built page: node <this file> <width> <dark|light> <out dir> <css selector>...
// Run from the repository root. Opens closed <details> that contain the element first.
import { createRequire } from 'node:module'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const here = path.dirname(fileURLToPath(import.meta.url));
const [w, scheme, out, ...sels] = process.argv.slice(2);
const b = await puppeteer.launch({ headless: 'shell' });
try { const p = await b.newPage(); await p.setViewport({ width: +w, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + path.join(here, '..', 'index.html')); await new Promise(r => setTimeout(r, 400));
  for (const sel of sels) { await p.evaluate(s => { let d = document.querySelector(s); while (d) { if (d.tagName === 'DETAILS') d.open = true; d = d.parentElement } }, sel);
    await new Promise(r => setTimeout(r, 200)); const el = await p.$(sel); if (!el) { console.log('missing', sel); continue }
    await el.scrollIntoView(); await el.screenshot({ path: path.join(out, sel.replace(/[^\w-]/g, '') + '_' + w + '.png') }); }
} finally { await b.close() }
