// Screenshot single elements: node shot_el.mjs <width> <dark|light> <tab> <id> [<id> ...]  -> ../.shots/el/<id>_<width>_<scheme>.png
import { createRequire } from 'module'; import path from 'path'; import fs from 'fs'; import { fileURLToPath } from 'url';
const H = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(H, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const [w, scheme, tab, ...ids] = process.argv.slice(2);
const out = path.join(H, '../.shots/el'); fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: +w, height: 900 });
await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
page.on('pageerror', e => console.log('pageerror', e.message));
await page.goto('file://' + path.join(H, '../index.html'), { waitUntil: 'load' });
await page.click('#tabs button[data-t="' + tab + '"]'); await new Promise(r => setTimeout(r, 400));
for (const id of ids) {
  const [eid, clicks] = id.split(':');
  if (clicks) for (const c of clicks.split(',')) { await page.evaluate(s => { const e = document.querySelector(s); if (e) e.click() }, c); await new Promise(r => setTimeout(r, 120)) }
  const el = await page.$('#' + eid); if (!el) { console.log('missing', eid); continue }
  await el.scrollIntoView(); await new Promise(r => setTimeout(r, 200));
  await el.screenshot({ path: path.join(out, `${eid}_${w}_${scheme}.png`) });
}
await browser.close();
