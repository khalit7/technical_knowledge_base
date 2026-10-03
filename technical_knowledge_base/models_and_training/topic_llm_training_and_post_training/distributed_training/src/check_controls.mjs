// Exercise every control on the page in headless Chrome and look for NaN, undefined, Infinity or script errors.
// Run from the repo root: node technical_knowledge_base/.../distributed_training/src/check_controls.mjs [shots dir]
import puppeteer from '../../../../../html_utils/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.resolve(here, '../index.html');
const shots = process.argv[2] || path.resolve(here, '../.shots');
const b = await puppeteer.launch({ headless: 'shell' });
let bad = 0, checks = 0;
for (const [scheme, width] of [['light', 920], ['dark', 390]]) {
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + file);
  await p.$eval('button[data-t=t-read]', e => e.click());
  const scan = async (sel, tag) => {
    checks++;
    const t = await p.$eval(sel, e => e.innerText + ' ' + e.innerHTML);
    const m = t.match(/NaN|undefined|Infinity|null GB/);
    if (m) { bad++; console.log('BAD', scheme, tag, m[0], t.slice(Math.max(0, t.indexOf(m[0]) - 80), t.indexOf(m[0]) + 40)) }
  };
  // animation: every mode, both batches, every step
  const modes = await p.$$eval('#anM button', bs => bs.map(b => b.dataset.m));
  for (const B of ['4', '1']) {
    await p.select('#anB', B);
    for (const m of modes) {
      await p.$eval('#anM button[data-m="' + m + '"]', e => e.click());
      const n = await p.$eval('#anC-s', e => +e.max + 1);
      for (let i = 0; i < n; i++) {
        await p.$eval('#anC-s', (e, i) => { e.value = i; e.dispatchEvent(new Event('input')) }, i);
        await scan('#an', m + ' B' + B + ' step ' + i);
      }
      if (width === 920 || ['DP', 'PP', 'EP', 'HSDP'].includes(m)) {
        await p.$eval('#anC-s', (e, i) => { e.value = i; e.dispatchEvent(new Event('input')) }, Math.min(2, n - 1));
        const el = await p.$('#an'); await el.screenshot({ path: path.join(shots, `an-${m}-b${B}-${scheme}-${width}.png`) });
      }
    }
  }
  for (const c of ['ZeRO-3', 'TP']) { await p.select('#anCmp', c); await scan('#anCnt', 'compare ' + c) }
  // collectives calculator
  for (const k of ['ar', 'rs', 'ag', 'a2a', 'p2p']) for (const n of ['2', '8', '1024']) for (const L of ['450', '160', '50', '25']) {
    await p.select('#ccK', k); await p.$eval('#ccN', (e, n) => { e.value = n; e.dispatchEvent(new Event('input')) }, n);
    await p.select('#ccL', L); await scan('#cc', 'cc ' + k + n + L);
  }
  // bubble table
  for (const [P, M, V] of [['2', '1', '1'], ['8', '20', '2'], ['32', '64', '4'], ['32', '1', '1']]) {
    for (const [id, v] of [['pbP', P], ['pbM', M], ['pbV', V]]) await p.$eval('#' + id, (e, v) => { e.value = v; e.dispatchEvent(new Event('input')) }, v);
    await scan('#pb', 'pb ' + P + M + V);
  }
  // layout calculator: every preset, then each control on its extremes
  await p.$eval('button[data-t=t-calc]', e => e.click());
  const presets = await p.$$eval('#lcP option', os => os.map(o => o.value));
  for (const pr of presets) {
    await p.select('#lcP', pr); await scan('#lc', 'preset ' + pr);
    if (pr !== 'custom') { const el = await p.$('#lc'); await el.screenshot({ path: path.join(shots, `lc-${pr}-${scheme}-${width}.png`) }) }
  }
  await p.select('#lcP', 'zero75');
  for (const z of ['0', '1', '2', '3']) { await p.select('#lcZ', z); await scan('#lcRep', 'zero stage ' + z) }
  const sels = ['lcMo', 'lcR', 'lcG', 'lcTP', 'lcCP', 'lcPP', 'lcDP', 'lcEP', 'lcZ', 'lcS', 'lcA', 'lcI'];
  for (const mo of ['deepseek_v3', 'llama3_70b', 'zero_7p5b']) {
    await p.select('#lcP', 'dsv3'); await p.select('#lcMo', mo);
    for (const s of sels) {
      const vals = await p.$$eval('#' + s + ' option', os => os.map(o => o.value));
      for (const v of [vals[0], vals[vals.length - 1]]) { await p.select('#' + s, v); await scan('#lc', mo + ' ' + s + '=' + v) }
    }
    for (const v of ['1', '512']) { await p.$eval('#lcM', (e, v) => { e.value = v; e.dispatchEvent(new Event('input')) }, v); await scan('#lc', 'm=' + v) }
  }
  if (errs.length) { bad++; console.log('ERRORS', scheme, errs) }
  await p.close();
}
await b.close();
console.log(bad ? 'FAIL ' + bad : 'ok', checks, 'states checked');
