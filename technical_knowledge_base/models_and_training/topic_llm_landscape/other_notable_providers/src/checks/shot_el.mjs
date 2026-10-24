// node src/checks/shot_el.mjs <page index.html> <out dir> <selector>...   screenshot elements at 920 light and 390 dark
import { createRequire } from 'node:module'; import path from 'node:path';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const [file, out, ...sels] = process.argv.slice(2);
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
for (const [scheme, width] of [['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + path.resolve(file)); await new Promise(r => setTimeout(r, 400));
  for (const s of sels) {
    const [tab, sel] = s.includes('|') ? s.split('|') : ['t-read', s];
    await p.$eval(`button[data-t="${tab}"]`, x => x.click()); await new Promise(r => setTimeout(r, 300));
    await p.$$eval('details', ds => ds.forEach(d => d.open = true));
    const el = await p.$(sel); if (!el) { console.log('missing', sel); continue; }
    await el.scrollIntoView(); await new Promise(r => setTimeout(r, 200));
    await el.screenshot({ path: path.join(out, `${sel.replace(/[^\w]/g, '')}-${scheme}-${width}.png`) });
  }
  await p.close();
}
await b.close();
