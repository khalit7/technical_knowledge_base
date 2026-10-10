// Element screenshots for review. usage: node shots.mjs <out dir> <width> <dark|light> <tab> <selector>...
import { createRequire } from 'module'; import path from 'path'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const [out, w, scheme, tab, ...sels] = process.argv.slice(2);
const b = await puppeteer.launch({ headless: 'shell' }); const p = await b.newPage();
await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
await p.setViewport({ width: +w, height: 900 });
await p.goto('file://' + path.join(here, '..', 'index.html'));
await p.click(`#tabs button[data-t="${tab}"]`); await new Promise(r => setTimeout(r, 300));
for (const s of sels) { const e = await p.$(s); if (!e) { console.log('missing', s); continue; }
  await e.evaluate(x => x.scrollIntoView()); await new Promise(r => setTimeout(r, 200));
  await e.screenshot({ path: path.join(out, s.replace(/[^\w-]/g, '') + '_' + w + scheme + '.png') }); }
await b.close();
