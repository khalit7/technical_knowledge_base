// Screenshot chosen cards at 390 dark and 920 light (optionally after clicking a button inside a segmented control).
// usage: node src/shot_el.mjs <index.html> <out dir> <id>[:<button selector>] ...
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs';
const here = path.dirname(new URL(import.meta.url).pathname);
const R = createRequire(path.resolve(here, '../../../../../html_utils/package.json')); const puppeteer = R('puppeteer');
const [file, out, ...ids] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell' });
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + path.resolve(file)); await new Promise(r => setTimeout(r, 300));
  for (const spec of ids) {
    const [id, sel] = spec.split(':');
    const tab = await p.$eval('#' + id, e => e.closest('.tab').id); await p.click(`#tabs button[data-t=${tab}]`);
    await p.$eval('#' + id, e => { const d = e.closest('details'); if (d) d.open = true; });
    if (sel) await p.$eval('#' + id + ' ' + sel, e => e.click());
    await new Promise(r => setTimeout(r, 200));
    const el = await p.$('#' + id); await el.screenshot({ path: `${out}/${scheme}-${width}-${id}${sel ? '-' + sel.replace(/\W+/g, '') : ''}.png` });
  }
  await p.close();
}
await b.close();
