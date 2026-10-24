// Screenshots each Reading figure at 390 dark and 920 light: node src/shot_figs.mjs <out dir> (run from the repo root)
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const here = path.dirname(new URL(import.meta.url).pathname), out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell' });
const ids = ['rd-hero','rd-chain','rd-loop','rd-lat','rd-dl','rd-amp','rd-jit-card','rd-brk','rd-gp','rd-probe','rd-waves','slo-card','rd-stream','rd-ms-card','rd-ba-card','rd-rl-card'];
for (const [s, w] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); await p.setViewport({ width: w, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: s }]);
  await p.goto('file://' + path.resolve(here, '..', 'index.html')); await new Promise(r => setTimeout(r, 400));
  for (const id of ids) { const el = await p.$('#' + id); if (!el) { console.log('missing', id); continue }
    const t = await p.evaluateHandle(e => e.closest(".fig") || e, el); await t.scrollIntoView(); await new Promise(r => setTimeout(r, 120)); await t.screenshot({ path: path.join(out, `${id}-${s}-${w}.png`) }) }
  await p.close() }
await b.close();
