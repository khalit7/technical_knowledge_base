// node src/shot_el.mjs <index.html> <outdir> <width> <dark|light> <selector[@clicks]>...   (run from the repo root)
// Screenshots each selector in the Reading tab; clicks (comma-separated selectors after @) run first; details are opened.
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const [page, out, width, scheme, ...sels] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell' });
try { const p = await b.newPage(); await p.setViewport({ width: +width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + path.resolve(page)); await new Promise(r => setTimeout(r, 400));
  for (const s of sels) { const [sel, clicks] = s.split('@');
    for (const c of (clicks || '').split(',').filter(Boolean)) { await p.$eval(c, e => e.click()); await new Promise(r => setTimeout(r, 120)); }
    await p.$eval(sel, e => { const d = e.closest('details'); if (d) d.open = true; e.scrollIntoView(); }); await new Promise(r => setTimeout(r, 250));
    const el = await p.$(sel); const f = path.join(out, sel.replace(/[^\w-]/g, '') + (clicks ? '_' + clicks.replace(/[^\w-]/g, '').slice(0, 30) : '') + '-' + scheme + width + '.png');
    await el.screenshot({ path: f }); console.log(f); }
} finally { await b.close(); }
