// Screenshot each section of the Numbers to know tab in its default state (for visual review).
// Run from anywhere: node shot_sections.mjs <out dir>
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const out = process.argv[2] || path.resolve(here, '../../.shots'); fs.mkdirSync(out, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell' });
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + path.resolve(here, '../../index.html')); await p.click('button[data-t=t-num]'); await new Promise(r => setTimeout(r, 400));
  const ids = await p.$$eval('#t-num h2', es => es.map(e => e.id));
  for (let i = 0; i < ids.length; i++) {
    const clip = await p.evaluate((a, b) => { const A = document.getElementById(a).getBoundingClientRect(); const B = b ? document.getElementById(b).getBoundingClientRect() : document.getElementById('t-num').getBoundingClientRect(); const top = A.top + scrollY; const bot = b ? B.top + scrollY : B.bottom + scrollY; return { x: 0, y: top, width: innerWidth, height: Math.min(3000, bot - top) } }, ids[i], ids[i + 1]);
    await p.screenshot({ path: `${out}/sec-${i}-${ids[i]}-${scheme}-${width}.png`, clip, captureBeyondViewport: true });
  }
  await p.close();
}
await b.close();
