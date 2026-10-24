// Screenshot each Reading figure in 390 px dark and 920 px light. Run from the repo root:
//   node <page>/src/shot_figs.mjs <page folder> <out dir>
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const [dir, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const ids = ['tq-hero', 'lay-card', 'tq-beh', 'tq-dbl', 'tq-pact', 'tq-int', 'pb-card', 'tq-llm', 'tq-ml3', 'tq-smoke', 'tq-fcause', 'fl-card', 'tq-cvm', 'ml-card', 'tq-ci'];
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + path.resolve(dir, 'index.html'));
  await new Promise(r => setTimeout(r, 300));
  for (const id of ids) { const el = await p.$('#' + id); if (!el) { console.log('missing', id); continue; }
    const t = (await p.evaluateHandle(e => e.closest('.fig') || e, el)).asElement();
    await t.scrollIntoView(); await t.screenshot({ path: path.join(out, id + '-' + scheme + '-' + width + '.png') }); }
  await p.close();
}
await b.close();
