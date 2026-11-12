// Screenshots of chosen states (for looking, not a test): node <this> <index.html> <dir>. Reduced motion, so stages jump straight to the step clicked.
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
  await p.click('#tabs button[data-t=t-read]'); await p.evaluate(() => document.getElementById('sx-hero').children[3].click()); await new Promise(r => setTimeout(r, 400)); await shot('#stg-hero', 'hero4'); await shot('#ld-chain-card', 'chain'); await shot('#ld-loop-card', 'loop');
  await step('rz-ctl-s', 5); await shot('#rz-card', 'rz6');
  await step('ld-st-ctl-s', 4); await shot('#ld-st-card', 'store4');
  for (const k of [3, 7]) { await p.evaluate(k => document.getElementById('sx-nc').children[k].click(), k); await new Promise(r => setTimeout(r, 400)); await shot('#stg-nc', 'nccl' + k) }
  await p.evaluate(() => document.getElementById('sx-hang').children[4].click()); await new Promise(r => setTimeout(r, 400)); await shot('#stg-hang', 'hang5');
  await shot('#ld-if-card', 'iface'); await shot('#ld-to-card', 'timeouts');
  await p.evaluate(() => document.querySelector('#hg-pick button[data-k=stuck]').click());
  await p.evaluate(() => document.querySelector('#hg-opts button').click()); await shot('#hg-card', 'stuck');
  await p.click('#tabs button[data-t=t-ldenv]'); await shot('#t-ldenv', 'env');
  await p.close();
}
await b.close();
