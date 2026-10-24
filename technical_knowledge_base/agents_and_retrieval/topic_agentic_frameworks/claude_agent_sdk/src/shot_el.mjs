// Screenshot elements of this page: node <this file> <out dir> <width> <dark|light> <css selector>...
// Run from the repo root. One browser, closed at the end.
import { createRequire } from 'node:module'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const page = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'index.html');
const [out, w, scheme, ...sels] = process.argv.slice(2);
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
try { const p = await b.newPage(); await p.setViewport({ width: +w, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + page); await new Promise(r => setTimeout(r, 400));
  for (const sel of sels) { const el = await p.$(sel); if (!el) { console.log('missing', sel); continue; }
    await el.scrollIntoView(); await new Promise(r => setTimeout(r, 150));
    await el.screenshot({ path: path.join(out, sel.replace(/[^a-z0-9]+/gi, '') + '-' + scheme + '-' + w + '.png') }); }
} finally { await b.close() }
