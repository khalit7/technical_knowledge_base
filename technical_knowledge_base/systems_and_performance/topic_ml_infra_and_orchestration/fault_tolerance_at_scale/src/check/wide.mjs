// List elements wider than the viewport in one tab. usage: node wide.mjs <index.html> <tab> <width> [scheme]
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(path.resolve(process.cwd(), 'html_utils/package.json'));
const puppeteer = require('puppeteer');
const [file, tab, width = '390', scheme = 'dark'] = process.argv.slice(2);
const b = await puppeteer.launch({ headless: 'shell' });
try {
  const p = await b.newPage();
  await p.setViewport({ width: +width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + path.resolve(file));
  await p.click(`button[data-t=${tab}]`);
  await new Promise(r => setTimeout(r, 400));
  const r = await p.evaluate(() => { const W = document.documentElement.clientWidth; const out = [];
    document.querySelectorAll('#' + document.querySelector('.tab:not([hidden])').id + ' *').forEach(e => { const b = e.getBoundingClientRect();
      if (b.right > W + 1 && e.offsetParent && !e.closest('pre,.tw,.hmwrap,.nav,.tabs')) out.push(e.tagName + '#' + e.id + '.' + e.className + ' ' + Math.round(b.right) + ' ' + (e.textContent || '').slice(0, 50)); });
    return [document.documentElement.scrollWidth, W, out.slice(0, 15)]; });
  console.log(JSON.stringify(r, null, 1));
} finally { await b.close(); }
