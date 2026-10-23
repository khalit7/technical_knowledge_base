// (1) The page's JavaScript (BANKSIM) against out/expected.json from code/build_data.py.
// (2) Every control (Reading and Further reading tabs) at 390 px dark and 920 px light: no page errors, NaN/undefined text or sideways scroll; screenshots.
// Run from the repo root: node technical_knowledge_base/systems_and_performance/topic_hardware/memory_technology/src/check/check_ui.mjs <shots dir>
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const require = createRequire(path.resolve('html_utils/package.json'));
const puppeteer = require('puppeteer');
const dir = 'technical_knowledge_base/systems_and_performance/topic_hardware/memory_technology';
const page = path.resolve(dir, 'index.html');
const exp = JSON.parse(fs.readFileSync(path.resolve(dir, 'src/out/expected.json'), 'utf8'));
const out = process.argv[2] || '.';
fs.mkdirSync(out, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell' });
let bad = 0;
// ---- (1) JS against the Python reference
{
  const p = await b.newPage();
  await p.goto('file://' + page); await sleep(200);
  const r = await p.evaluate(exp => {
    const D = MEMD, M = {}, C = {}; D.models.forEach(m => M[m.id] = m); D.chips.forEach(c => C[c.id] = c);
    const rel = (a, b) => Math.abs(a - b) <= 1e-7 * Math.max(1, Math.abs(b));
    let n = 0, bad = [];
    // KVM.kvSeq and KVM.plan left with the KV tab on 2026-10-23 (cache sizing now on Long context's calculator)
    for (const mode of ['seq', 'rand1', 'randB']) {
      const g = BANKSIM(mode, D.bank), e = exp.banks[mode]; n++;
      if (JSON.stringify(g) !== JSON.stringify(e)) bad.push(['bank', mode, g.end, e.end]);
      // embedded data must equal the reference too
      n++; if (JSON.stringify(D.banks[mode]) !== JSON.stringify(e)) bad.push(['bank-embed', mode]);
    }
    return { n, bad: bad.slice(0, 10), nbad: bad.length };
  }, exp);
  console.log('JS vs Python reference:', r.n, 'values,', r.nbad, 'mismatches', r.nbad ? JSON.stringify(r.bad) : '');
  bad += r.nbad; await p.close();
}
// ---- (2) controls
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + page);
  await p.evaluate(() => { try { localStorage.clear() } catch (e) {} });
  await p.reload(); await sleep(300);
  const check = async (tab, label) => {
    const t = await p.$eval('#' + tab, e => e.innerText);
    // "ZeRO-Infinity" is a paper title, not a broken number
    for (const [w, re] of [['NaN', /NaN/], ['undefined', /undefined/], ['Infinity', /(^|[^-\w])Infinity/], ['[object', /\[object/]]) { const i = t.search(re); if (i >= 0) errs.push(label + ': text contains ' + w + ' near "' + t.slice(Math.max(0, i - 60), i + 20).replace(/\n/g, ' ') + '"') }
    const svgBad = await p.$$eval('#' + tab + ' svg', ss => ss.filter(s => /NaN|undefined/.test(s.outerHTML)).length);
    if (svgBad) errs.push(label + ': ' + svgBad + ' svg with NaN/undefined');
    if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) errs.push(label + ': sideways scroll');
    const jsErr = await p.$eval('#jsErr', e => e.hidden ? '' : e.textContent);
    if (jsErr) errs.push(label + ': error box: ' + jsErr.slice(0, 200));
  };
  const ctl = async c => {
    for (let k = 0; k < 20; k++) await p.$eval('#' + c + '-f', e => e.click());
    await p.$eval('#' + c + '-b', e => e.click());
    await p.$eval('#' + c + '-s', e => { e.value = 0; e.dispatchEvent(new Event('input')) });
    await p.$eval('#' + c + '-s', e => { e.value = e.max; e.dispatchEvent(new Event('input')) });
    await p.$eval('#' + c + '-v', e => { e.value = '2'; e.dispatchEvent(new Event('change')) });
    await p.$eval('#' + c + '-p', e => e.click()); await sleep(150); await p.$eval('#' + c + '-p', e => e.click());
  };
  const segs = async (segId, after) => {
    const n = await p.$$eval('#' + segId + ' button', bs => bs.length);
    for (let i = 0; i < n; i++) { await p.$$eval('#' + segId + ' button', (bs, i) => bs[i].click(), i); await sleep(40); if (after) await after(i) }
  };
  const tab = async t => { await p.$eval('#tabs button[data-t="' + t + '"]', e => e.click()); await sleep(250) };
  // Reading
  await tab('t-read');
  for (const s of ['rd-gen-mode', 'rd-lad-mode', 'rd-ladder-mode', 'rd-kv-mode']) await segs(s);
  await p.$$eval('#t-read details', ds => ds.forEach(d => d.open = true)); await sleep(100);
  await segs('rd-bank-mode', async () => ctl('rd-bank-ctl'));
  await p.$$eval('#t-read .pr .opts button', bs => bs.forEach(b => b.click()));
  await check('t-read', scheme + ' read');
  await p.screenshot({ path: path.join(out, 'read-' + scheme + '-' + width + '.png'), fullPage: true });
  // the Memory lab tab was folded into Reading on 2026-10-23 (its charts are now in sections 2, 3, 6 and 7)
  await tab('t-more'); await check('t-more', scheme + ' more');
  console.log(scheme, width, errs.length ? 'ERRORS:\n  ' + errs.join('\n  ') : 'ok');
  bad += errs.length; await p.close();
}
await b.close();
console.log(bad ? 'FAIL ' + bad : 'PASS');
process.exit(bad ? 1 : 0);
