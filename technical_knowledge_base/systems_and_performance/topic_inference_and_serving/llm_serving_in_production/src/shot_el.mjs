// usage: node shot_el.mjs <outdir> : screenshots of the Reading figures (parent of each listed element) at 390 dark and 920 light
import { createRequire } from 'module'; import { fileURLToPath } from 'url'; import path from 'path';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer'); const fs = require('fs');
const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
const ids = ['pr-arch', 'pr-cs-svg', 'rl-cdf', 'rl-sim', 'pr-s0', 'rl-dots', 'll-dots'];
const b = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
for (const [w, scheme] of [[390, 'dark'], [920, 'light']]) {
  const p = await b.newPage(); await p.setViewport({ width: w, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + path.join(here, '../index.html')); await new Promise(r => setTimeout(r, 300));
  await p.evaluate(() => document.querySelectorAll('details.dp').forEach(d => { d.open = true; d.dispatchEvent(new Event('toggle')) }));
  await new Promise(r => setTimeout(r, 300));
  for (const id of ids) { const el = await p.$('#' + id); if (!el) continue; const par = id.startsWith('pr-s') ? el : await el.evaluateHandle(e => e.closest('.fig,details,.card') || e); await par.asElement().screenshot({ path: path.join(out, id + '_' + w + '.png') }); }
  await p.close();
}
await b.close();
