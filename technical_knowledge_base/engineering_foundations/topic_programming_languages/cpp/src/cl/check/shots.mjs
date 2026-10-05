// Screenshot pieces of one Part 3 tab: node shots.mjs <tab> <width> <scheme> <selector> [outdir]
// Each element matching <selector> inside the tab is captured on its own (long ones are cut at 2000 px).
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../../../../../..');
const require = createRequire(path.join(repo, 'html_utils/package.json'));
const puppeteer = require('puppeteer');
const [tab, w, scheme, sel] = process.argv.slice(2, 6);
const pre = process.argv[7] || '';
const out = process.argv[6] && process.argv[6] !== '-' ? process.argv[6] : '/private/tmp/claude-502/-Users-khalid-technical-knowledge-base/5f6ecf10-514c-4c28-926f-0ee784ea40bd/scratchpad/pl/cl/shots/el';
require('fs').mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ headless: 'shell' });
const p = await browser.newPage();
p.on('pageerror', e => console.log('pageerror', e.message));
await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
await p.setViewport({ width: +w, height: 1000 });
await p.goto('file://' + path.resolve(here, '../../../index.html'), { waitUntil: 'load' });
await p.evaluate(t => window.SHOW_TAB(t), tab);
await new Promise(r => setTimeout(r, 500));
if (pre) { await p.evaluate(pre); await new Promise(r => setTimeout(r, 400)); }
const els = await p.$$('#' + tab + ' ' + sel);
let i = 0;
for (const e of els) {
  const bb = await e.boundingBox(); if (!bb || bb.height < 2) continue;
  for (let y = 0; y < bb.height; y += 2000) {
    await p.screenshot({ path: `${out}/${tab}_${w}_${scheme}_${String(i).padStart(2, '0')}.png`, clip: { x: 0, y: bb.y + y, width: +w, height: Math.min(2000, bb.height - y) }, captureBeyondViewport: true });
    i++;
  }
}
console.log(i, 'shots in', out);
await browser.close();
