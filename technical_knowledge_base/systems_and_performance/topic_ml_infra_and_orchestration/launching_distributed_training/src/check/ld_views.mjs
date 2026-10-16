// Screenshots of chosen states (for looking, not a test): node <this> <index.html> <dir>
import { createRequire } from 'node:module'; import path from 'node:path';
const require = createRequire(path.resolve('html_utils/package.json')); const puppeteer = require('puppeteer');
const [file, out] = process.argv.slice(2);
const b = await puppeteer.launch({ headless: 'shell' });
for (const [scheme, w] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); await p.setViewport({ width: w, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + path.resolve(file));
  const shot = async (sel, name) => { const e = await p.$(sel); if (e) await e.screenshot({ path: `${out}/v-${name}-${scheme}${w}.png` }) };
  await shot('#ld-chain-card', 'chain'); await shot('#ld-if-card', 'iface');
  await p.click('#tabs button[data-t=t-ldrz]'); await p.evaluate(() => { const s = document.getElementById('rz-ctl-s'); s.value = 30; s.dispatchEvent(new Event('input')) });
  await shot('#rz-card', 'rz30');
  await p.click('#tabs button[data-t=t-ldhang]'); await p.evaluate(() => document.querySelector('#hg-pick button[data-k=stuck]').click());
  await p.evaluate(() => document.querySelector('#hg-opts button').click()); await shot('#hg-body', 'stuck');
  await p.click('#tabs button[data-t=t-ldenv]'); await shot('#t-ldenv', 'env');
  await p.close();
}
await b.close();
