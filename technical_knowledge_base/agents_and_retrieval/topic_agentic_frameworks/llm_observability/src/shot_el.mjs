// node src/shot_el.mjs <index.html> <out dir> <selector>...: screenshots of single elements in 390 px dark and 920 px light
import { createRequire } from 'node:module'; import path from 'node:path';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const [file, out, ...sels] = process.argv.slice(2);
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + path.resolve(file));
  await p.evaluate(() => document.querySelectorAll('#t-read details.dp').forEach(d => d.open = true));
  await new Promise(r => setTimeout(r, 400));
  for (const s of sels) { const el = await p.$(s); if (!el) { console.log('missing', s); continue; }
    await el.screenshot({ path: path.join(out, s.replace(/[^\w-]/g, '') + '-' + scheme + '-' + width + '.png') }); }
  await p.close();
}
await b.close();
