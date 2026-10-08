// Element screenshots of the simulator tab. Run: node shots.mjs <index.html> <out dir> <light|dark> <width>
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, '../../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const [file, out, scheme, width] = process.argv.slice(2);
const b = await puppeteer.launch({ headless: 'shell' });
const p = await b.newPage();
await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
await p.setViewport({ width: +width, height: 900 });
const errs = [];
p.on('pageerror', e => errs.push(String(e)));
await p.goto('file://' + path.resolve(file));
await p.evaluate(() => document.querySelector('#tabs button[data-t="t-sim"]').click());
await new Promise(r => setTimeout(r, 1500));
for (const id of ['sim-anim', 'sim-labbox', 'sim-stbox', 'sim-swbox', 'sim-v-plot', 'sim-v-m1']) {
  const el = await p.$('#' + id);
  await el.scrollIntoView();
  await new Promise(r => setTimeout(r, 400));
  await el.screenshot({ path: path.join(out, id + '-' + scheme + '-' + width + '.png') });
}
console.log('errors', JSON.stringify(errs));
await b.close();
