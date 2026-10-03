// Screenshot one element of the built page: node shoot.mjs <tab> <light|dark> <width> <css selector> <out.png> [js to run first]
import puppeteer from '../../../../../html_utils/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const [tab, scheme, width, sel, out, js] = process.argv.slice(2);
const b = await puppeteer.launch({ headless: true }); const p = await b.newPage();
await p.setViewport({ width: +width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
await p.goto('file://' + path.resolve(here, '../index.html'));
await p.$eval(`#tabs button[data-t=${tab}]`, e => e.click()); await new Promise(r => setTimeout(r, 300));
if (js) { await p.evaluate(js); await new Promise(r => setTimeout(r, 400)); }
const el = await p.$(sel); await el.scrollIntoView(); await el.screenshot({ path: out }); await b.close();
