// Exercise every control of the page in headless Chrome (light 920, dark 390), scan for NaN, undefined, Infinity or errors,
// compare the page's seq2seq forward pass with PyTorch's reference outputs, dump the page's recurrent-cell outputs and
// analogy-test results for check_cells.py and recompute.py, and screenshot the visuals in a late state.
// usage: node src/check_page.mjs [outdir]   (from the page folder or anywhere; needs html_utils/node_modules)
import puppeteer from '../../../../../html_utils/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.resolve(here, '../index.html');
const out = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(out, { recursive: true });
const W = JSON.parse(fs.readFileSync(path.resolve(here, 'model/runs/seq2seq_weights.json')));
const b = await puppeteer.launch({ headless: 'shell' });
const bad = []; let actions = 0; const dump = {};
for (const [scheme, width] of [['light', 920], ['dark', 390]]) {
  const p = await b.newPage();
  p.on('pageerror', e => bad.push(scheme + ' pageerror ' + e.message));
  p.on('console', m => { if (m.type() === 'error') bad.push(scheme + ' console ' + m.text()) });
  await p.setViewport({ width, height: 1000 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + file);
  const clk = async sel => { await p.$eval(sel, e => e.click()); actions++ };
  const setv = async (sel, v) => { await p.$eval(sel, (e, v) => { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })) }, v); actions++ };
  const scan = async (sel, what) => { const t = await p.$eval(sel, e => e.innerText + ' ' + e.innerHTML.replace(/<[^>]*>/g, ' ')); const m = t.match(/.{0,40}(NaN|undefined|Infinity|null).{0,20}/); if (m) bad.push(`${scheme} ${what}: ${m[0]}`) };
  const scrub = async (ctl, card, what) => { const n = await p.$eval(`#${ctl}-s`, e => +e.max); for (const i of [0, 1, 2, 3, 4, 5, 6, Math.floor(n / 2), n - 6, n - 4, n - 3, n - 2, n - 1, n]) { if (i < 0 || i > n) continue; await setv(`#${ctl}-s`, i); await scan('#' + card, what + ' step ' + i) } };
  const shot = async (sel, name) => { const el = await p.$(sel); await el.scrollIntoView(); await el.screenshot({ path: path.join(out, `x-${name}-${scheme}.png`) }) };
  await clk('button[data-t=t-read]');
  await scan('#rd-over', 'overview');
  // the memory animation: every mode, keys, lengths
  for (const m of ['lstm', 'gru', 'rnn', 'rnn_short']) {
    await clk(`#mm-mode button[data-m=${m}]`);
    for (const T of [8, 40, 120]) { await setv('#mm-T', T);
      for (const k of [0, 3]) { await setv('#mm-key', k); await scrub('mm-ctl', 'mm', `mem ${m} T${T} k${k}`) } }
    await clk('#mm-new'); await scrub('mm-ctl', 'mm', `mem ${m} new`);
  }
  // shots at a late step: LSTM and plain RNN at "?" (output gate), length 40
  await setv('#mm-T', 40); await setv('#mm-key', 1);
  for (const m of ['lstm', 'rnn', 'gru']) { await clk(`#mm-mode button[data-m=${m}]`); const n = await p.$eval('#mm-ctl-s', e => +e.max); await setv('#mm-ctl-s', n - (m === 'gru' ? 1 : m === 'rnn' ? 1 : 1)); await shot('#mm', 'mem-' + m) }
  // dump the page's cell outputs for check_cells.py (light pass only)
  if (scheme === 'light') dump.cells = await p.evaluate(() => {
    const o = []; for (const m of ['lstm', 'gru', 'rnn', 'rnn_short']) for (const [k, T, s] of [[0, 8, 7], [1, 40, 7], [2, 120, 99], [3, 50, 1234]]) {
      const seq = CELL.sequence(k, T, s), r = CELL.run(CELL.models[m], seq); o.push({ m, seq, p: r.p, h: r.tr[T - 1].h }) } return o });
  // results charts
  for (const v of ['acc', 'grad']) { await clk(`#mr-view button[data-v=${v}]`); for (const t of ['10', '20', '50', '100']) { if (v === 'acc') await clk(`#mr-tm button[data-v="${t}"]`); await scan('#mr', `memres ${v} ${t}`) } }
  await clk('#mr-view button[data-v=acc]'); await clk('#mr-tm button[data-v="10"]'); await shot('#mr', 'memres-acc10');
  await clk('#mr-view button[data-v=grad]'); await shot('#mr', 'memres-grad');
  // seq2seq animation
  for (const m of ['fixed', 'attention']) {
    await clk(`#sa-mode button[data-m=${m}]`);
    for (const x of ['314159265358', '12', '9876543210987654321012345', '0000000000']) { await setv('#sa-in', x); await scrub('sa-ctl', 'sa', `s2s ${m} ${x}`) }
    await setv('#sa-len', 30); await clk('#sa-rand'); await scrub('sa-ctl', 'sa', `s2s ${m} rand30`);
    await setv('#sa-in', 'abc'); await scan('#sa', 's2s bad input');
  }
  await setv('#sa-in', '314159265358');
  for (const m of ['fixed', 'attention']) { await clk(`#sa-mode button[data-m=${m}]`); const n = await p.$eval('#sa-ctl-s', e => +e.max); await setv('#sa-ctl-s', n - 4); await shot('#sa', 's2s-' + m) }
  for (const v of ['seq_acc', 'tok_acc', 'pos']) { await clk(`#sr-view button[data-v=${v}]`); await scan('#sr', 'sr ' + v) }
  await clk('#sr-view button[data-v=seq_acc]'); await shot('#sr', 's2sres');
  // the page's seq2seq against PyTorch (dequantised weights) on the stored references
  if (scheme === 'light') dump.s2s = await p.evaluate(refs => {
    const res = []; for (const m of ['fixed', 'attention']) for (const r of refs[m]) { const d = S2S[m].decode(r.x, r.x.length + 1);
      let ha = 0; d.hs[d.hs.length - 1].forEach((v, i) => ha = Math.max(ha, Math.abs(v - r.hT[i])));
      let aa = 0; if (r.att) r.att.forEach((row, t) => row.forEach((v, j) => aa = Math.max(aa, Math.abs(v - d.atts[t][j]))));
      res.push({ m, L: r.x.length, same: d.out.join() === r.out.join(), hT_maxdiff: ha, att_maxdiff: aa }) } return res }, { fixed: W.fixed_refs, attention: W.attention_refs });
  // WaveNet
  for (const m of ['dil', 'plain']) { await clk(`#wv-mode button[data-m=${m}]`); for (const L of [1, 2, 4, 6]) { await setv('#wv-L', L); await scrub('wv-ctl', 'wv', `wave ${m} L${L}`) } }
  for (const bks of [1, 3, 6]) { await setv('#wv-b', bks); await scan('#wv-cfg', 'wave cfg ' + bks) }
  await setv('#wv-L', 4); for (const m of ['dil', 'plain']) { await clk(`#wv-mode button[data-m=${m}]`); const n = await p.$eval('#wv-ctl-s', e => +e.max); await setv('#wv-ctl-s', n); await shot('#wv', 'wave-' + m) }
  await scan('#t-read', 'whole reading tab');
  // Word vectors tab
  await clk('button[data-t=t-vec]');
  for (const w of ['frog', 'bank', 'memory', 'zzzz', 'king']) { await setv('#vn-w', w); await scan('#vn', 'nn ' + w) }
  const np = await p.$$eval('#vn-pre button', e => e.length); for (let i = 0; i < np; i++) { await clk(`#vn-pre button:nth-child(${i + 1})`); await scan('#vn', 'nn preset ' + i) }
  const na = await p.$$eval('#va-pre button', e => e.length); for (let i = 0; i < na; i++) { await clk(`#va-pre button:nth-child(${i + 1})`); await scan('#va', 'an preset ' + i) }
  await setv('#va-a', 'qqq'); await scan('#va', 'an missing'); await clk('#va-pre button:nth-child(1)');
  await clk('#vt-run'); await p.waitForFunction(() => document.querySelector('#vt-out .bars'), { timeout: 60000 }); await scan('#vt', 'test');
  if (scheme === 'light') dump.vt = await p.$eval('#vt-out', e => e.innerText);
  for (const k of ['Countries and capitals', 'Comparatives', 'Gendered pairs']) { await clk(`#vp-set button[data-k="${k}"]`); await scan('#vp', 'pca ' + k) }
  await clk('#vp-set button[data-k="Countries and capitals"]');
  await shot('#vn', 'vec-nn'); await shot('#va', 'vec-an'); await shot('#vt', 'vec-test'); await shot('#vp', 'vec-pca');
  await clk('button[data-t=t-more]'); await scan('#t-more', 'more');
  const box = await p.evaluate(() => { const d = document.getElementById('jsErr'); return d && !d.hidden ? d.textContent : '' }); if (box) bad.push(scheme + ' errbox ' + box);
  const sw = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth); if (sw) bad.push(scheme + ' sideways scroll');
  await p.close();
}
await b.close();
fs.writeFileSync(path.resolve(here, 'model/runs/page_dump.json'), JSON.stringify(dump));
const s2sOk = dump.s2s.every(r => r.same && r.hT_maxdiff < 1e-3 && r.att_maxdiff < 1e-3);
console.log('seq2seq JS against PyTorch:', JSON.stringify(dump.s2s));
console.log('actions', actions, 'problems', bad.length, s2sOk ? 'seq2seq forward OK' : 'SEQ2SEQ FORWARD MISMATCH');
bad.slice(0, 30).forEach(x => console.log('  ' + x));
