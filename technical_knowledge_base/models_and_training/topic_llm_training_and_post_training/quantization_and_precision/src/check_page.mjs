// Exercise every control of the page in headless Chrome and screenshot the visuals at their last step.
// usage: node src/check_page.mjs [outdir]
import puppeteer from '../../../../../html_utils/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.resolve(here, '../index.html');
const out = process.argv[2] || path.resolve(here, '../.shots');
const b = await puppeteer.launch({ headless: 'shell' });
const bad = [];
for (const [scheme, width] of [['light', 920], ['dark', 390]]) {
  const p = await b.newPage();
  p.on('pageerror', e => bad.push(scheme + ' pageerror ' + e.message));
  await p.setViewport({ width, height: 1000 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + file);
  await p.$eval('button[data-t=t-read]', e => e.click());
  const clk = sel => p.$eval(sel, e => e.click());
  const txt = async sel => p.$eval(sel, e => e.innerText);
  const scan = async (sel, what) => { const t = await txt(sel); if (/NaN|undefined|Infinity%|null/.test(t)) bad.push(`${scheme} ${what}: ${t.match(/.{0,40}(NaN|undefined|Infinity%|null).{0,20}/)[0]}`) };
  // block animation: every mode x row x a few blocks, last step
  for (let m = 0; m < 5; m++) {
    await clk(`#rd-bkM button[data-i="${m}"]`);
    for (const r of ['0', '1', '2', '3']) {
      await p.select('#rd-bkR', r);
      for (const blk of [0, 13, 27]) { await p.$eval('#rd-bkB', (e, v) => { e.value = v; e.dispatchEvent(new Event('input')) }, blk); await scan('#rd-bk', `block m${m} r${r} b${blk}`) }
    }
  }
  for (let st = 0; st < 5; st++) { await p.$eval('#rd-bkC-s', (e, v) => { e.value = v; e.dispatchEvent(new Event('input')) }, st); await scan('#rd-bk', 'block step ' + st) }
  await clk('#rd-bkM button[data-i="3"]'); await p.select('#rd-bkR', '1'); await p.$eval('#rd-bkB', e => { e.value = 0; e.dispatchEvent(new Event('input')) });
  await (await p.$('#rd-bk')).screenshot({ path: `${out}/x-block-${scheme}.png` });
  // migration animation
  for (let m = 0; m < 4; m++) {
    await clk(`#rd-mgM button[data-i="${m}"]`);
    for (const a of [0, 0.25, 0.5, 0.75, 1]) { await p.$eval('#rd-mgA', (e, v) => { e.value = v; e.dispatchEvent(new Event('input')) }, a);
      for (let st = 0; st < 5; st++) { await p.$eval('#rd-mgC-s', (e, v) => { e.value = v; e.dispatchEvent(new Event('input')) }, st); await scan('#rd-mg', `mig m${m} a${a} s${st}`) } }
  }
  await clk('#rd-mgM button[data-i="1"]'); await p.$eval('#rd-mgC-s', e => { e.value = 4; e.dispatchEvent(new Event('input')) });
  await (await p.$('#rd-mg')).screenshot({ path: `${out}/x-migrate-${scheme}.png` });
  // names
  const n = await p.$$eval('#rd-nmS option', o => o.length);
  for (let i = 0; i < n; i++) { await p.select('#rd-nmS', String(i)); await scan('#rd-nm', 'names ' + i) }
  await p.select('#rd-nmS', '4');
  await (await p.$('#rd-nm')).screenshot({ path: `${out}/x-names-${scheme}.png` });
  await (await p.$('#rd-kn')).screenshot({ path: `${out}/x-knee-${scheme}.png` });
  await (await p.$('#rd-fr')).screenshot({ path: `${out}/x-ranges-${scheme}.png` });
  // bit explorer
  await clk('button[data-t=t-bits]');
  const pres = await p.$$eval('#bxP button', o => o.map(x => x.dataset.v));
  for (const v of pres.concat(['-3', '0', '1e30', '1e-45', 'abc'])) { await p.$eval('#bxV', (e, v) => { e.value = v; e.dispatchEvent(new Event('input')) }, v); await scan('#bx', 'bits ' + v) }
  for (const a of ['0.001', '6', '448', '1e-6']) { await p.$eval('#bxA', (e, v) => { e.value = v; e.dispatchEvent(new Event('input')) }, a); await scan('#bx', 'block A ' + a) }
  await p.$eval('#bxS', e => { e.value = -10; e.dispatchEvent(new Event('input')) }); await scan('#bx', 'slider');
  await p.$eval('#bxV', e => { e.value = '0.1'; e.dispatchEvent(new Event('input')) }); await p.$eval('#bxA', e => { e.value = '1'; e.dispatchEvent(new Event('input')) });
  await (await p.$('#bx')).screenshot({ path: `${out}/x-bits-${scheme}.png` });
  // layer tab
  await clk('button[data-t=t-layer]');
  for (const m of ['out', 'w']) for (const bd of ['4', '8', 'all']) { await clk(`#lyM button[data-m="${m}"]`); await clk(`#lyB button[data-b="${bd}"]`); await scan('#ly', `layer ${m} ${bd}`); if (m === 'out' && bd === 'all') await (await p.$('#lyS')).screenshot({ path: `${out}/x-scatter-all-${scheme}.png` }) }
  await clk('#lyM button[data-m="out"]'); await clk('#lyB button[data-b="4"]');
  await (await p.$('#ly')).screenshot({ path: `${out}/x-layer-${scheme}.png` });
  const box = await p.evaluate(() => { const d = document.getElementById('jsErr'); return d && !d.hidden ? d.textContent : '' });
  if (box) bad.push(scheme + ' errbox ' + box);
  await p.close();
}
await b.close();
console.log(bad.length ? bad.join('\n') : 'all controls OK');
