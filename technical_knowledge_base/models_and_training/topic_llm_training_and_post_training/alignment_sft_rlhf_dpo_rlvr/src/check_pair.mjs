// Exercise every control of the page and compare the in-page preference-pair toy with recompute.py.
// usage (from the repo root): node technical_knowledge_base/.../alignment_sft_rlhf_dpo_rlvr/src/check_pair.mjs [shots dir]
// Uses html_utils' puppeteer (npm ci there). Fails on NaN, "undefined", errors or a mismatch.
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const puppeteer = createRequire(path.resolve(here, '../../../../../html_utils/package.json'))('puppeteer');
const page = path.join(here, '..', 'index.html');
const shots = process.argv[2] || path.join(here, '..', '.shots');
fs.mkdirSync(shots, { recursive: true });
const derived = JSON.parse(fs.readFileSync(path.join(here, 'inputs', 'derived.json'), 'utf8'));
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
let bad = 0;
for (const [scheme, width] of [['light', 920], ['dark', 390]]) {
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 1000 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + page);
  await p.click('button[data-t=t-read]');
  // 1. the JS port against recompute.py
  if (scheme === 'light') {
    const js = await p.evaluate(() => { const o = {}; for (const m of Object.keys(window.AL_PAIR.P)) { const r = window.AL_PAIR.train(m); o[m] = [0, 10, 25, 50, 100, 200, 400].map(s => r.traj[s]) } return o });
    let maxd = 0;
    for (const m of Object.keys(js)) for (const [k, s] of [0, 10, 25, 50, 100, 200, 400].entries()) {
      const py = derived.pair.train[m][String(s)], j = js[m][k];
      for (const f of ['Sc', 'Sr', 'margin', 'loss']) maxd = Math.max(maxd, Math.abs(py[f] - j[f]));
    }
    console.log('pair toy: max |JS - Python| over 8 methods x 7 checkpoints x 4 fields =', maxd.toExponential(2));
    if (!(maxd < 1e-9)) { bad++; console.log('MISMATCH') }
  }
  const textOk = async (sel, what) => {
    const t = await p.$eval(sel, e => e.innerText);
    if (/NaN|undefined|Infinity/.test(t)) { bad++; console.log('BAD TEXT', what, t.slice(0, 200)) }
  };
  // 2. loss rules
  for (const m of ['all', 'asst', 'last', 'im']) { await p.click(`#mkM button[data-m=${m}]`); await textOk('#mk', 'mask ' + m) }
  // 3. packing: both modes, every step
  for (const m of ['pad', 'pack']) {
    await p.click(`#pkM button[data-m=${m}]`);
    const n = await p.$eval('#pkCtl-s', e => +e.max + 1);
    for (let i = 0; i < n; i++) { await p.$eval('#pkCtl-s', (e, v) => { e.value = v; e.dispatchEvent(new Event('input')) }, i); await textOk('#pk', `pack ${m} ${i}`) }
    await (await p.$('#pk')).screenshot({ path: path.join(shots, `x-pack-${m}-${scheme}.png`) });
  }
  // 4. the pair: every method, every step
  const methods = await p.$$eval('#prM button', bs => bs.map(b => b.dataset.m));
  const n = await p.$eval('#prCtl-s', e => +e.max + 1);
  for (const m of methods) {
    await p.click(`#prM button[data-m=${m}]`);
    for (let i = 0; i < n; i++) { await p.$eval('#prCtl-s', (e, v) => { e.value = v; e.dispatchEvent(new Event('input')) }, i); await textOk('#pr', `pair ${m} ${i}`) }
    if (['dpo', 'simpo', 'rm'].includes(m)) await (await p.$('#pr')).screenshot({ path: path.join(shots, `x-pair-${m}-${scheme}.png`) });
  }
  await p.$eval('#prCtl-s', (e) => { e.value = 3; e.dispatchEvent(new Event('input')) });
  await p.click('#prM button[data-m=simpo]');
  await (await p.$('#pr')).screenshot({ path: path.join(shots, `x-pair-simpo3-${scheme}.png`) });
  await (await p.$('#mk')).screenshot({ path: path.join(shots, `x-mask-${scheme}.png`) });
  // 5. the tree: every lane filter, every node
  await p.click('button[data-t=t-tree]');
  const lanes = await p.$$eval('#trF button', bs => bs.map(b => b.dataset.l));
  for (const l of lanes) { await p.click(`#trF button[data-l="${l}"]`); await textOk('#t-tree', 'tree lane ' + l) }
  await p.click('#trF button[data-l=""]');
  const ids = await p.$$eval('.tr-node', ns => ns.map(n => n.dataset.id));
  for (const id of ids) { await p.$eval(`.tr-node[data-id="${id}"]`, n => n.dispatchEvent(new MouseEvent('click', { bubbles: true }))); await textOk('#trD', 'tree ' + id) }
  await p.$eval('.tr-node[data-id="dpo"]', n => n.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  await (await p.$('#t-tree')).screenshot({ path: path.join(shots, `x-tree-${scheme}.png`) });
  const sw = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  const box = await p.evaluate(() => { const d = document.getElementById('jsErr'); return d && !d.hidden ? d.textContent : '' });
  console.log(scheme, width, 'errors', errs, 'sideways', sw, 'errbox', JSON.stringify(box), 'tree nodes', ids.length, 'methods', methods.length);
  if (errs.length || sw || box) bad++;
  await p.close();
}
await b.close();
console.log(bad ? 'FAIL ' + bad : 'all controls OK');
process.exit(bad ? 1 : 0);
