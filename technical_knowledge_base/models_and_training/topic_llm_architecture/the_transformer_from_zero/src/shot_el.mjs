// Screenshot elements of this page (run from the repository root):
//   node <page>/src/shot_el.mjs <width> <dark|light> <out dir> <tab id> <css selector>[@<click selector>] ...
// One browser for every shot; reduced motion so steppers stay still. Clicks (optional) run before the shot.
import { createRequire } from 'node:module'; import path from 'node:path';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const page = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'index.html');
const [w, scheme, out, tab, ...sels] = process.argv.slice(2);
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
try {
  const p = await b.newPage(); await p.setViewport({ width: +w, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + page); await p.click(`button[data-t=${tab}]`); await new Promise(r => setTimeout(r, 400));
  let i = 0;
  for (const s of sels) {
    const [sel, ...clicks] = s.split('@');
    for (const c of clicks) { await p.$eval(c, el => el.click()); await new Promise(r => setTimeout(r, 150)); }
    const el = await p.$(sel); if (!el) { console.log('missing', sel); continue; }
    await el.scrollIntoView(); await new Promise(r => setTimeout(r, 200));
    const f = path.join(out, `${String(i++).padStart(2, '0')}_${sel.replace(/[^\w-]+/g, '')}_${scheme}${w}.png`);
    await el.screenshot({ path: f }); console.log(f);
  }
} finally { await b.close(); }
