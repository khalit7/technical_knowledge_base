// Viewport screenshots of the atlas tab's parts (for looking at), at a given scheme and width.
// node shot_atlas.mjs dark 390 [setup-js]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../../..');
const require = createRequire(path.join(root, 'html_utils', 'package.json'));
const puppeteer = require('puppeteer');
const page = path.resolve(here, '../../index.html');
const shots = path.resolve(here, '../../.shots'); fs.mkdirSync(shots, { recursive: true });
const [scheme = 'dark', w = '390', setup = ''] = process.argv.slice(2);
const b = await puppeteer.launch({ headless: 'shell' });
const p = await b.newPage();
await p.setViewport({ width: +w, height: 860 });
await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
await p.goto('file://' + page);
await p.click('button[data-t=t-atlas]');
await new Promise(r => setTimeout(r, 300));
if (setup) await p.evaluate(setup);
await new Promise(r => setTimeout(r, 200));
for (const sel of ['#t-atlas h2', '#da-q', '#da-res', '#da-filters', '.da-tw', '#da-cmpwrap', '#da-detail', '#da-lt', '#da-claims']) {
  const ok = await p.evaluate(s => { const e = document.querySelector(s); if (!e || !e.offsetHeight) return false; scrollTo(0, e.getBoundingClientRect().top + scrollY - 10); return true }, sel);
  if (!ok) continue;
  await new Promise(r => setTimeout(r, 80));
  await p.screenshot({ path: path.join(shots, `atlas-${sel.replace(/[^a-z]/g, '')}-${scheme}-${w}.png`) });
}
await b.close();
console.log('done');
