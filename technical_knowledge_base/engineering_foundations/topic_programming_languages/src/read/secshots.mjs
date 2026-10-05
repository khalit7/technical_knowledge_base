// Screenshot each Reading section at 390 dark and 920 light (for visual review). Run from the repo root.
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(path.resolve(here, '../../../../..'), 'html_utils', 'package.json'));
const puppeteer = require('puppeteer');
const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
const ids = (process.argv[3] || 'rd-one,rd-s1').split(',');
const b = await puppeteer.launch({ headless: 'shell' });
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + path.resolve(here, '../../index.html')); await new Promise(r => setTimeout(r, 400));
  for (const id of ids) { const e = await p.$('#' + id); if (!e) continue; await p.evaluate(e => e.scrollIntoView(), e); await new Promise(r => setTimeout(r, 200)); await e.screenshot({ path: path.join(out, `${id}-${scheme}-${width}.png`) }); }
  await p.close();
}
await b.close();
