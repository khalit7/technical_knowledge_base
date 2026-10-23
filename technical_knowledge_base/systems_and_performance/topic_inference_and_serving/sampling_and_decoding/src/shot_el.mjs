// Screenshot chosen Reading figures at 390 px dark and 920 px light, to look at them.
// usage: node <page>/src/shot_el.mjs <page index.html> <out dir> [selector ...]
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const [page, out, ...sels] = process.argv.slice(2);
const want = sels.length ? sels : ['#sd-hero-card', '#sd-pen', '#sd-mask', '#sd-msz', '#dg-plot', '#rd-js', '#rd-pp', '#rd-bm'];
fs.mkdirSync(out, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + path.resolve(page)); await new Promise(r => setTimeout(r, 400));
  for (const s of want) { const el = await p.$(s); if (!el) { console.log('missing', s); continue; }
    await el.screenshot({ path: path.join(out, s.replace(/\W/g, '') + '-' + scheme + '-' + width + '.png') }); }
  await p.close();
}
await b.close();
