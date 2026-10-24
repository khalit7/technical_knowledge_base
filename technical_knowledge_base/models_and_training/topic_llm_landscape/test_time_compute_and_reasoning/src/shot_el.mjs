// node <page>/src/shot_el.mjs <index.html> <outdir> <width> <dark|light> tab:selector[:clicks;clicks] ...
// One browser; screenshots each element after optional clicks (separated by ;). Run from the repo root.
import { createRequire } from 'node:module'; import path from 'node:path';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const [page, outdir, width, scheme, ...specs] = process.argv.slice(2);
const b = await puppeteer.launch({ headless: 'shell' });
try {
  for (const spec of specs) {
    const [tab, sel, clicks] = spec.split('|');
    const p = await b.newPage(); await p.setViewport({ width: +width, height: 900 });
    await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
    await p.goto('file://' + path.resolve(page)); await p.click(`button[data-t=${tab}]`); await new Promise(r => setTimeout(r, 300));
    for (const c of (clicks || '').split(';').filter(Boolean)) { await p.evaluate(c => { const e = document.querySelector(c); if (e.tagName === 'DETAILS') e.open = true; else e.click(); }, c); await new Promise(r => setTimeout(r, 200)); }
    const el = await p.$(sel); await el.scrollIntoView(); await new Promise(r => setTimeout(r, 200));
    await el.screenshot({ path: path.join(outdir, `${sel.replace(/[^\w]/g, '')}_${(clicks||'').length}_${scheme}${width}.png`) }); await p.close();
  }
} finally { await b.close(); }
