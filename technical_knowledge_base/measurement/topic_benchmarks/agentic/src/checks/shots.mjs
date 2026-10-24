// Element screenshots for review: node checks/shots.mjs [light|dark] [width]  (writes ../.shots/el-*.png)
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const [scheme = 'light', width = '920'] = process.argv.slice(2);
const page = path.resolve(here, '../../index.html'), out = path.resolve(here, '../../.shots');
const b = await puppeteer.launch({ headless: 'shell' });
const p = await b.newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.setViewport({ width: +width, height: 1000 });
await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
await p.goto('file://' + page);
const wait = ms => new Promise(r => setTimeout(r, ms));
async function shot(tab, sel, name, pre) {
  await p.click(`button[data-t=${tab}]`); await wait(250);
  if (pre) { await pre(); await wait(250) }
  const el = await p.$(sel); if (!el) { errs.push('missing ' + sel); return }
  await el.scrollIntoView(); await wait(150);
  await el.screenshot({ path: `${out}/el-${name}-${scheme}-${width}.png` });
}
const open = id => p.evaluate(i => { const d = document.getElementById(i); if (d) d.open = true }, id);
await shot('t-read', '#hero-card', 'hero');
await shot('t-read', '#an1', 'an1-s4', async () => { for (let i = 0; i < 4; i++) await p.click('#an1-ctl-f') });
await shot('t-read', '#an1', 'an1-m1', async () => { await p.click('#an1-mode button[data-m="1"]'); for (let i = 0; i < 4; i++) await p.click('#an1-ctl-f') });
await shot('t-read', '#tk-card', 'task', async () => open('tk-card'));
await shot('t-read', '#an2', 'an2-k4', async () => { for (let i = 0; i < 5; i++) await p.click('#an2-ctl-f') });
await shot('t-read', '#pk-card', 'pk');
await shot('t-read', '#pk-more', 'pkmore', async () => open('pk-more'));
await shot('t-read', '#hs-card', 'hs');
await shot('t-read', '#tbb-more', 'tbb', async () => open('tbb-more'));
await shot('t-read', '#rd-map .rd-fig', 'map');
await shot('t-read', '#tbl', 'tbl');
await shot('t-read', '#rd-comp figure', 'osfig');
await shot('t-read', '#rd-tau-task', 'tautask');
await shot('t-read', '#th-card', 'th');
await shot('t-read', '#th-tcard', 'thtrend');
await shot('t-read', '#rd-rdi', 'rdi');
await shot('t-read', '#rd-check', 'check', async () => open('rd-dated'));
console.log('errors', errs);
await b.close();
