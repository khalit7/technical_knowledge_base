// node src/shot_el.mjs <page index.html> <out dir> : screenshots of the Reading figures at 390 px dark and 920 px light
import { createRequire } from 'node:module'; import path from 'node:path';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const [file, out] = process.argv.slice(2);
const ids = ['rd-hero-card','rd-tuple-card','rd-tr-card','rd-rtt-card','rd-fsm-card','rd-tc-card','rd-cc-card','rd-nat-card','rd-mig-card','rd-thru-card'];
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + path.resolve(file));
  for (const id of ids) {
    const el = await p.$('#' + id); if (!el) { console.log('missing', id); continue; }
    await el.scrollIntoView();
    for (let k = 0; k < 3; k++) { const f = await p.$('#' + id + ' button[aria-label="Next step"]'); if (f) await f.click(); }
    await new Promise(r => setTimeout(r, 150));
    await el.screenshot({ path: path.join(out, `${id}-${scheme}-${width}.png`) });
  }
  await p.close();
}
await b.close();
