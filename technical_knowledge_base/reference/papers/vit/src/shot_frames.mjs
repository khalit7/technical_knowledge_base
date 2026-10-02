// Screenshot chosen animation frames, paused (for looking at mid-animation states).
// usage (from the repo root): node technical_knowledge_base/reference/papers/vit/src/shot_frames.mjs <outdir>
import puppeteer from '../../../../../html_utils/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const out = process.argv[2] || path.resolve(here, '../.shots');
const b = await puppeteer.launch({ headless: true });
for (const [scheme, width] of [['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); await p.setViewport({ width, height: 1000 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + path.resolve(here, '../index.html'));
  const clk = s => p.$eval(s, e => e.click());
  const frame = async (id, mode, k, name) => {
    if (mode) await clk(`#${id}M button[data-m=${mode}]`);
    await p.evaluate((id, k) => { const e = document.getElementById(id + 'Scrub'); e.value = k * 100 + 99; e.dispatchEvent(new Event('input')) }, id, k);
    await p.$eval('#' + id, e => e.scrollIntoView()); await new Promise(r => setTimeout(r, 150));
    await (await p.$('#' + id)).screenshot({ path: `${out}/f-${name}-${scheme}-${width}.png` });
  };
  await frame('vx', 'vit', 2, 'vit-project'); await frame('vx', 'vit', 5, 'vit-layer2'); await frame('vx', 'vit', 8, 'vit-classify');
  await frame('vx', 'cnn', 5, 'cnn-block2');
  await clk('#tabs button[data-t=t-then]'); await new Promise(r => setTimeout(r, 200));
  await frame('tn', null, 2, 'then-mae'); await frame('tn', null, 5, 'then-navit');
  await p.close();
}
await b.close(); console.log('frames written to', out);
