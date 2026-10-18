// Exercise every control of the page in headless Chrome (light 920, dark 390), scan for NaN, undefined, Infinity or errors,
// compare the page's numbers with src/inputs/recompute.json, and screenshot the visuals in a late state.
// usage: node src/check_page.mjs [outdir]
import puppeteer from '../../../../../html_utils/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.resolve(here, '../index.html');
const out = process.argv[2] || path.resolve(here, '../.shots');
const R = JSON.parse(fs.readFileSync(path.resolve(here, 'inputs/recompute.json')));
const b = await puppeteer.launch({ headless: 'shell' });
const bad = []; let actions = 0;
for (const [scheme, width] of [['light', 920], ['dark', 390]]) {
  const p = await b.newPage();
  p.on('pageerror', e => bad.push(scheme + ' pageerror ' + e.message));
  p.on('console', m => { if (m.type() === 'error') bad.push(scheme + ' console ' + m.text()) });
  await p.setViewport({ width, height: 1000 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + file);
  const clk = async sel => { await p.$eval(sel, e => e.click()); actions++ };
  const setv = async (sel, v) => { await p.$eval(sel, (e, v) => { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })) }, v); actions++ };
  const scan = async (sel, what) => { const t = await p.$eval(sel, e => e.innerText + ' ' + e.innerHTML.replace(/<[^>]*>/g, ' ')); const m = t.match(/.{0,40}(NaN|undefined|Infinity|(?<!rope_scaling )null).{0,20}/); if (m) bad.push(`${scheme} ${what}: ${m[0]}`) };
  await clk('button[data-t=t-read]');
  // six schemes, one query
  for (const v of ['logit', 'w']) { await clk(`#scView button[data-v=${v}]`);
    for (const r of ['128', '1024', '2048']) { await clk(`#scRange button[data-r="${r}"]`);
      for (const off of [0, 512, 1024]) { await setv('#scOff', off);
        for (const h of [1, 4, 8]) { await setv('#scHead', h); await scan('#sc', `score ${v} ${r} off${off} h${h}`) } } } }
  await setv('#scBase', '500000'); await scan('#sc', 'score base 500k');
  for (const k of ['sin', 'learned', 't5', 'alibi', 'rope', 'nope']) { await clk(`#scLeg input[data-k=${k}]`); await clk(`#scLeg input[data-k=${k}]`) }
  await clk('#scView button[data-v=logit]'); await clk('#scRange button[data-r="2048"]'); await setv('#scOff', 256); await setv('#scHead', 3);
  await (await p.$('#sc')).screenshot({ path: `${out}/x-score-${scheme}.png` });
  // what breaks: every preset x method x step
  for (const pk of ['llama31', 'qwen3', 'dsv3', 'oss', 'phi3', 'gemma3']) {
    await p.select('#brP', pk); actions++;
    const ms = await p.$$eval('#brM button:not([disabled])', a => a.map(x => x.dataset.m));
    for (const m of ms) { await clk(`#brM button[data-m=${m}]`);
      for (let st = 0; st < 8; st++) { await setv('#brC-s', st); await scan('#br', `break ${pk} ${m} step ${st}`) } }
  }
  // the plain-RoPE counter at the last step must equal recompute.json's plain_unseen at 4x for Llama 3.1 (both at 8x)
  await p.select('#brP', 'llama31'); await clk('#brM button[data-m=pi]'); await setv('#brC-s', 7);
  const un = await p.$eval('#brCnt', e => e.querySelector('.stat .v').textContent);
  if (!un.startsWith(R.plain_unseen.llama31['8'] + ' of')) bad.push(`${scheme} unseen plain ${un} vs ${R.plain_unseen.llama31['8']}`);
  await (await p.$('#br')).screenshot({ path: `${out}/x-break-${scheme}.png` });
  await p.select('#brP', 'dsv3'); await clk('#brM button[data-m=yarn]'); await setv('#brC-s', 6);
  await (await p.$('#br')).screenshot({ path: `${out}/x-break-yarn-${scheme}.png` });
  // play / pause / step buttons
  await clk('#brC-p'); await new Promise(r => setTimeout(r, 300)); await clk('#brC-p'); await clk('#brC-b'); await clk('#brC-f'); await p.select('#brC-v', '2'); actions++;
  await scan('#br', 'break controls');
  // stretch the spectrum
  await clk('button[data-t=t-spec]');
  for (const pk of ['llama31', 'llama4', 'qwen3', 'dsv3', 'oss', 'phi3', 'gemma3']) {
    await p.select('#spP', pk); actions++;
    for (const s of ['cfg', '2', '32']) { await p.select('#spS', s); actions++;
      for (const x of ['wl', 'i']) { await clk(`#spX button[data-x=${x}]`); await setv('#spPair', 0); await setv('#spPair', 200); await scan('#sp', `spec ${pk} s${s} ${x}`) } }
  }
  const cells = await p.$$eval('#spTb tr[data-k]', rs => Object.fromEntries(rs.map(r => [r.dataset.k, r.querySelector('[data-c=bands]').textContent])));
  const yb = R.yarn_bands, lb = R.llama31_bands;
  const want = { oss: `${yb.oss.kept} / ${yb.oss.ramp} / ${yb.oss.interp}`, dsv3: `${yb.dsv3.kept} / ${yb.dsv3.ramp} / ${yb.dsv3.interp}`, qwen3: `${yb.qwen3.kept} / ${yb.qwen3.ramp} / ${yb.qwen3.interp}`, llama31: `${lb.kept} / ${lb.smoothed} / ${lb.divided}` };
  for (const k in want) if (cells[k] !== want[k]) bad.push(`${scheme} table ${k}: page ${cells[k]} vs recompute ${want[k]}`);
  await p.select('#spP', 'phi3'); await p.select('#spS', 'cfg');
  await (await p.$('#sp')).screenshot({ path: `${out}/x-spec-${scheme}.png` });
  await scan('#t-spec', 'spec tab');
  await clk('button[data-t=t-more]'); await scan('#t-more', 'more');
  const box = await p.evaluate(() => { const d = document.getElementById('jsErr'); return d && !d.hidden ? d.textContent : '' });
  if (box) bad.push(scheme + ' error box: ' + box);
  await p.close();
}
await b.close();
console.log(`${actions} actions, ${bad.length} problems`); bad.slice(0, 30).forEach(x => console.log(' ', x));
process.exit(bad.length ? 1 : 0);
