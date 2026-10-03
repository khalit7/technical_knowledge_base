// Screenshot elements of the page for review: node src/shoot.mjs <outdir> <scheme> <width> <tab> <selector,...>
import puppeteer from '../../../../../html_utils/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';
import path from 'node:path';import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));const [out, scheme, width, tab, sels] = process.argv.slice(2);
const b = await puppeteer.launch({ headless: true });const p = await b.newPage();
await p.setViewport({ width: +width, height: 900 });await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
await p.goto('file://' + path.resolve(here, '../index.html'));await p.$eval(`#tabs button[data-t=${tab}]`, e => e.click());await new Promise(r => setTimeout(r, 400));
for (const s of sels.split(',')) { const el = await p.$(s); if (!el) { console.log('missing', s); continue } await el.evaluate(e => e.scrollIntoView());await new Promise(r => setTimeout(r, 300));
  await el.screenshot({ path: `${out}/${scheme}-${width}-${s.replace(/[^a-z0-9-]/gi, '')}.png` }) }
await b.close();
