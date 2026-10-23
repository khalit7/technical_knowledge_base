// Screenshot elements of the Reading tab in both themes: node <this file> <out dir> <selector> [<selector> ...]
// (run from the repo root). Closed <details> around a selector are opened first.
import { createRequire } from 'node:module'; import path from 'node:path'; import url from 'node:url';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const page = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..', 'index.html');
const [out, ...sels] = process.argv.slice(2);
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
try {
  for (const [scheme, w] of [['dark', 390], ['light', 920]]) {
    const p = await b.newPage(); await p.setViewport({ width: w, height: 900 });
    await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
    await p.goto('file://' + page); await new Promise(r => setTimeout(r, 300));
    for (const sel of sels) {
      const el = await p.$(sel); if (!el) { console.log('missing', sel); continue; }
      await p.evaluate(e => { const d = e.closest('details'); if (d && !d.open) d.open = true; }, el);
      await el.scrollIntoView(); await new Promise(r => setTimeout(r, 250));
      await el.screenshot({ path: path.join(out, sel.replace(/[^\w-]/g, '') + '-' + scheme + '.png') });
    }
    await p.close();
  }
} finally { await b.close(); }
