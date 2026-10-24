// Screenshots of chosen states (for looking, not a test): node <this> <index.html> <dir>
import { createRequire } from 'node:module'; import path from 'node:path';
const require = createRequire(path.resolve('html_utils/package.json')); const puppeteer = require('puppeteer');
const [file, out] = process.argv.slice(2);
const b = await puppeteer.launch({ headless: 'shell' });
for (const [scheme, w] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); await p.setViewport({ width: w, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + path.resolve(file));
  const shot = async (sel, name) => { const e = await p.$(sel); if (!e) return console.log("missing", sel); try { await e.screenshot({ path: `${out}/v-${name}-${scheme}${w}.png` }) } catch (x) { console.log("not shot", sel, x.message) } };
  const step = async (id, v) => p.evaluate((id, v) => { const s = document.getElementById(id); s.value = v; s.dispatchEvent(new Event('input')) }, id, v);
  await p.click('#tabs button[data-t=t-read]'); await shot('#ld-hero-card', 'hero'); await shot('#ld-chain-card', 'chain'); await shot('#ld-loop-card', 'loop');
  await step('rz-ctl-s', 30); await shot('#rz-card', 'rz30');
  await step('ld-st-ctl-s', 4); await shot('#ld-st-card', 'store4');
  await step('ld-nc-ctl-s', 3); await shot('#ld-nc-card', 'nccl3'); await step('ld-nc-ctl-s', 7); await shot('#ld-nc-card', 'nccl7');
  await shot('#ld-if-card', 'iface'); await shot('#ld-to-card', 'timeouts');
  await p.evaluate(() => document.querySelector('#hg-pick button[data-k=stuck]').click());
  await p.evaluate(() => document.querySelector('#hg-opts button').click()); await shot('#hg-card', 'stuck');
  await p.click('#tabs button[data-t=t-ldenv]'); await shot('#t-ldenv', 'env');
  await p.close();
}
await b.close();
