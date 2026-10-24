// Screenshot elements of the Reading tab: node <page>/src/shot_el.mjs <width> <dark|light> <outdir> <css selector>...
import { createRequire } from 'node:module'; import path from 'node:path';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const here = path.dirname(new URL(import.meta.url).pathname);
const [w, scheme, out, ...sels] = process.argv.slice(2);
const b = await puppeteer.launch({ headless: 'shell' });
try { const p = await b.newPage(); await p.setViewport({ width: +w, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + path.resolve(here, '../index.html')); await new Promise(r => setTimeout(r, 400));
  for (const [i, sel] of sels.entries()) { const el = await p.$(sel); if (!el) { console.log('missing', sel); continue }
    await el.scrollIntoView(); await new Promise(r => setTimeout(r, 200)); await el.screenshot({ path: path.join(out, `${scheme}${w}_${i}_${sel.replace(/[^a-z0-9]/gi, '')}.png`) }); }
} finally { await b.close() }
