// node src/shot_el.mjs <index.html> <tab> <selector> <out.png> <width> <dark|light> [clicks: selector,selector]
import { createRequire } from 'node:module'; import path from 'node:path';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const [page, tab, sel, out, width, scheme, clicks] = process.argv.slice(2);
const b = await puppeteer.launch({ headless: 'shell' });
try { const p = await b.newPage(); await p.setViewport({ width: +width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + path.resolve(page)); await p.click(`button[data-t=${tab}]`); await new Promise(r => setTimeout(r, 300));
  for (const c of (clicks || '').split(',').filter(Boolean)) { await p.click(c); await new Promise(r => setTimeout(r, 150)); }
  const el = await p.$(sel); await el.screenshot({ path: out }); } finally { await b.close(); }
