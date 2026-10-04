// Element screenshots for review (writes ../.shots/el-*.png). usage (from src/): node checks/shots.mjs
import { createRequire } from 'node:module'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const page = 'file://' + path.resolve(here, '../../index.html'); const out = path.resolve(here, '../../.shots');
const b = await puppeteer.launch({ headless: 'shell' }); const wait = ms => new Promise(r => setTimeout(r, ms));
for (const [s, w] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); await p.setViewport({ width: w, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: s }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto(page); await wait(300);
  await p.evaluate(() => { const e = document.getElementById('xa-ctl-s'); e.value = 9; e.dispatchEvent(new Event('input')) }); await wait(100);
  for (const id of ['xa-card', 'rd-grade', 'rd-ovt', 'rd-jb']) { const el = await p.$('#' + id); await el.screenshot({ path: `${out}/el-${id}-${s}-${w}.png` }) }
  await p.evaluate(() => document.querySelector('#tabs button[data-t="t-hb"]').click()); await wait(300);
  await (await p.$('#s-hb')).screenshot({ path: `${out}/el-hb-${s}-${w}.png` });
  await p.evaluate(() => document.querySelector('#tabs button[data-t="t-xs"]').click()); await wait(300);
  await p.evaluate(() => document.querySelectorAll('#xs-list .xs-row')[0].click()); await wait(100);
  await (await p.$('#s-xs')).screenshot({ path: `${out}/el-xs-${s}-${w}.png` });
  await p.close();
}
await b.close(); console.log('done');
