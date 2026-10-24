// Screenshot elements of this page, one browser: node <page>/src/shot_el.mjs <dark|light> <width> <out dir> <tab>:<css selector>[:open] ...
// ":open" opens every <details> that contains the element first. Run from the repo root.
import { createRequire } from 'node:module'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const page = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'index.html');
const [scheme, w, out, ...items] = process.argv.slice(2);
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
try {
  const p = await b.newPage(); await p.setViewport({ width: +w, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + page);
  let k = 0;
  for (const it of items) {
    const [tab, sel, open] = it.split('|');
    await p.click(`button[data-t=${tab}]`); await new Promise(r => setTimeout(r, 300));
    if (open) await p.$eval(sel, el => { for (let d = el.closest('details'); d; d = d.parentElement.closest('details')) d.open = true; });
    await new Promise(r => setTimeout(r, 400));
    const el = await p.$(sel); await el.scrollIntoView(); await new Promise(r => setTimeout(r, 200));
    await el.screenshot({ path: path.join(out, `${k++}_${sel.replace(/[^\w-]/g, '')}_${scheme}${w}.png`) });
  }
} finally { await b.close(); }
