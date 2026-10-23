// usage: node check_noplay.mjs : nothing moves before the reader acts (normal and reduced motion)
import { createRequire } from 'module'; import { fileURLToPath } from 'url'; import path from 'path';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const b = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] }); let bad = 0;
for (const rm of ['no-preference', 'reduce']) {
  const p = await b.newPage(); await p.setViewport({ width: 920, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: rm }]);
  await p.goto('file://' + path.join(here, '../index.html'));
  const read = () => p.evaluate(() => [...document.querySelectorAll('.an-ctl input[type=range]')].map(r => r.id + '=' + r.value).join(' '));
  const h = await p.evaluate(() => document.body.scrollHeight); const before = [];
  for (let y = 0; y < h; y += 400) { await p.evaluate(y => scrollTo(0, y), y); await new Promise(r => setTimeout(r, 250)); before.push(await read()); }
  await new Promise(r => setTimeout(r, 2500)); const after = await read();
  const moved = before[0] !== after || new Set(before).size > 1;
  console.log(rm, moved ? 'MOVED' : 'still', after); if (moved) bad++; await p.close();
}
await b.close(); process.exit(bad ? 1 : 0);
