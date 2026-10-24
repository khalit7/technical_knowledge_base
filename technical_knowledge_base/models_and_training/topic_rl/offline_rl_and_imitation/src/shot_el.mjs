// Screenshot chosen Reading elements in 390 px dark and 920 px light: node src/shot_el.mjs <id> [<id> ...] (from the page folder; writes ../.shots/el-<id>-<scheme>-<width>.png)
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const R = createRequire(path.resolve(here, '../../../../../html_utils/package.json')); const puppeteer = R('puppeteer');
const out = path.resolve(here, '../.shots'); fs.mkdirSync(out, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell' });
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + path.resolve(here, '../index.html'));
  for (const id of process.argv.slice(2)) { const el = await p.$('#' + id); if (!el) { console.log('missing', id); continue }
    await el.scrollIntoView(); await new Promise(r => setTimeout(r, 250)); await el.screenshot({ path: path.join(out, `el-${id}-${scheme}-${width}.png`) }) }
  await p.close() }
await b.close();
