// Screenshots of each visual for review, and a scripted pass over every control (errors, NaN, undefined).
// Run from the repo root: node technical_knowledge_base/models_and_training/topic_ml_fundamentals/evaluation_metrics/src/shot_parts.mjs [outdir]
import puppeteer from '../../../../../html_utils/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';
import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), page = path.join(here, '..', 'index.html');
const out = process.argv[2] || path.join(here, '..', '.shots'); fs.mkdirSync(out, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell' }); const errs = []; let bad = 0;
const wait = ms => new Promise(r => setTimeout(r, ms));
for (const [scheme, width] of [['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 1000 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + page); await wait(300); await p.click('button[data-t="t-read"]'); await wait(200);
  const scan = async (sel, what) => { const t = await p.$eval(sel, e => e.innerText); if (/NaN|undefined(?! *\|)|Infinity/.test(t.replace(/undefined\b(?=<)/g, ''))) { if (/NaN|Infinity/.test(t) || /\bundefined\b/.test(t.replace('undefined', ''))) { bad++; console.log('BAD TEXT', what, t.slice(0, 200)) } } };
  const shot = async (sel, name) => { const el = await p.$(sel); await el.scrollIntoView(); await wait(150); await el.screenshot({ path: path.join(out, name + '-' + scheme + '-' + width + '.png') }) };
  for (const id of ['rd-trap', 'rd-mc', 'rd-pn', 'rd-bs']) await shot('#' + id, id);
  // animations: step through every step of every mode
  const stepAll = async (card, ctl, modesSel, presetSel) => {
    const modes = modesSel ? await p.$$(modesSel + ' button') : [null]; const pres = presetSel ? await p.$$(presetSel + ' button') : [null];
    for (let pi = 0; pi < pres.length; pi++) for (let mi = 0; mi < modes.length; mi++) {
      if (pres[pi]) await pres[pi].click(); if (modes[mi]) await modes[mi].click(); await wait(30);
      const n = await p.$eval('#' + ctl + '-s', e => +e.max + 1);
      for (let k = 0; k < n; k++) { await p.$eval('#' + ctl + '-s', (e, k) => { e.value = k; e.dispatchEvent(new Event('input')) }, k); await scan('#' + card, card + ' p' + pi + ' m' + mi + ' s' + k) }
    }
  };
  await stepAll('rd-cal', 'rd-calC', null, null);
  await p.$eval('#rd-calC-s', e => { e.value = 2; e.dispatchEvent(new Event('input')) }); await wait(1000); await shot('#rd-cal', 'rd-cal-s3');
  await p.$eval('#rd-calC-s', e => { e.value = 4; e.dispatchEvent(new Event('input')) }); await wait(1000); await shot('#rd-cal', 'rd-cal-s5');
  await stepAll('rd-tx', 'rd-txC', '#rd-txM', '#rd-txP');
  for (const [m, k] of [['bleu', 2], ['met', 3], ['bs', 2], ['chrf', 1], ['rl', 1]]) { await p.click('#rd-txP button[data-k="reorder"]'); await p.click('#rd-txM button[data-m="' + m + '"]'); await p.$eval('#rd-txC-s', (e, k) => { e.value = k; e.dispatchEvent(new Event('input')) }, k); await shot('#rd-tx', 'rd-tx-' + m) }
  await stepAll('rd-px', 'rd-pxC', '#rd-pxM', '#rd-pxT');
  await p.click('#rd-pxT button[data-k="num"]'); await p.click('#rd-pxM button[data-m="qwen"]'); await p.$eval('#rd-pxC-s', e => { e.value = 20; e.dispatchEvent(new Event('input')) }); await shot('#rd-px', 'rd-px-mid');
  await p.$eval('#rd-pxC-s', e => { e.value = e.max; e.dispatchEvent(new Event('input')) }); await shot('#rd-px', 'rd-px-end');
  for (const a of ['weighted', 'micro', 'macro']) { await p.click('#rd-mcM button[data-a="' + a + '"]'); await scan('#rd-mc', 'mc ' + a) }
  for (const v of [50, 200, 872]) { await p.$eval('#rd-bsN', (e, v) => { e.value = v; e.dispatchEvent(new Event('input')) }, v); await wait(400); await scan('#rd-bs', 'bs ' + v) }
  await p.click('#rd-bsR'); await wait(300);
  // threshold lab
  await p.click('button[data-t="t-thr"]'); await wait(200);
  for (const m of ['lr', 'nb', 'nbc']) for (const d of ['all', 'rare']) {
    await p.click('#th-M button[data-m="' + m + '"]'); await p.click('#th-D button[data-d="' + d + '"]');
    for (const t of ['0.5', 'f1', 'mcc', 'bacc']) { await p.click('#t-thr .pre button[data-th="' + t + '"]'); await scan('#t-thr', 'thr ' + m + d + t) }
    for (const v of [0, 1, 250, 999, 1000]) { await p.$eval('#th-T', (e, v) => { e.value = v; e.dispatchEvent(new Event('input')) }, v); await scan('#t-thr', 'thr slider ' + m + d + v) }
    for (const c of ['tp', 'fp', 'fn', 'tn']) { await p.click('#th-CM button[data-c="' + c + '"]'); await scan('#t-thr', 'thr cell ' + c) }
  }
  await p.click('#th-M button[data-m="nb"]'); await p.click('#th-D button[data-d="rare"]'); await p.click('#t-thr .pre button[data-th="mcc"]'); await p.click('#th-CM button[data-c="fp"]');
  await p.click('#th-X button[data-x="l"]'); await scan('#t-thr', 'thr logodds'); await shot('#t-thr .card', 'thr');
  // text lab
  await p.click('button[data-t="t-text"]'); await wait(200);
  for (const k of ['copy', 'reorder', 'para', 'syn', 'neg', 'morph', 'short', 'salad']) { await p.click('#tx-P button[data-k="' + k + '"]'); await scan('#t-text', 'text ' + k) }
  for (const [r, c] of [['a', 'b'], ['', 'x'], ['The cat.', 'The cat.'], ['x y z', 'z y x'], ['Ünïcode façade 123-456, 7.5!', 'unicode facade 123 456 7,5']]) {
    await p.$eval('#tx-R', (e, v) => { e.value = v; e.dispatchEvent(new Event('input')) }, r); await p.$eval('#tx-C', (e, v) => { e.value = v; e.dispatchEvent(new Event('input')) }, c); await wait(200); await scan('#t-text', 'text custom ' + r + '|' + c) }
  await p.click('#tx-P button[data-k="neg"]'); await wait(150); await shot('#t-text', 'text');
  await p.close();
}
await b.close();
console.log('shot_parts: errors', JSON.stringify(errs), 'bad text', bad); process.exit(errs.length || bad ? 1 : 0);
