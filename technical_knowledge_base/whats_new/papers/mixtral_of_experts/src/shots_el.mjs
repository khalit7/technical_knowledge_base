// Screenshot chosen elements at both widths for review. usage: node .../src/shots_el.mjs <outdir> <tab> <id,id,...> [width] [scheme]
import puppeteer from '../../../../../html_utils/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';
import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const [out, tab, ids, w = '920', sch = 'light'] = process.argv.slice(2);
const b = await puppeteer.launch({ headless: true }); const p = await b.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.setViewport({ width: +w, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: sch }]);
await p.goto('file://' + path.resolve(here, '../index.html'));
await p.$eval(`#tabs button[data-t=${tab}]`, e => e.click()); await new Promise(r => setTimeout(r, 400));
for (const id of ids.split(',')) { const el = await p.$('#' + id); if (!el) { console.log('no', id); continue } await el.scrollIntoView(); await new Promise(r => setTimeout(r, 700)); await el.screenshot({ path: `${out}/${id}-${w}-${sch}.png` }) }
console.log('errors', errs); await b.close();
