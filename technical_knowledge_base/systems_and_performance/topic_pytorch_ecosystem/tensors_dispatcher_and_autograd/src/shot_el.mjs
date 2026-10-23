// Screenshot Reading-tab elements for review: node shot_el.mjs <out dir> <width> <dark|light> <selector>[@<next-button id>x<clicks>] ...
// Run from the repo root. Example: node .../src/shot_el.mjs /tmp/x 390 dark '#tda-e-card@tda-e-ctl-fx20'
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const PAGE = path.resolve('technical_knowledge_base/systems_and_performance/topic_pytorch_ecosystem/tensors_dispatcher_and_autograd/index.html');
const [out, w, scheme, ...sels] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
try {
  const p = await b.newPage(); await p.setViewport({ width: +w, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + PAGE); await new Promise(r => setTimeout(r, 400));
  let i = 0;
  for (const spec of sels) {
    const [sel, act] = spec.split('@'); const el = await p.$(sel); if (!el) { console.log('missing', sel); continue }
    await el.scrollIntoView();
    if (act) { const [id, n] = act.split('x'); for (let k = 0; k < +n; k++) await p.$eval('#' + id, x => x.click()); }
    await new Promise(r => setTimeout(r, 200));
    const f = path.join(out, `${++i}_${sel.replace(/[^\w-]/g, '')}_${scheme}${w}.png`); await el.screenshot({ path: f }); console.log(f);
  }
} finally { await b.close() }
