// Click every control at 390 px dark and 920 px light; report errors, NaN/undefined text, sideways scroll; step both
// animations through every mode; compare window.HE_CHECK() with recompute.json. Screenshots to ../.shots/own_*.png
// Run from this folder: node check_page.mjs
import { createRequire } from 'module';
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const require = createRequire(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const here = path.dirname(fileURLToPath(import.meta.url));
const file = 'file://' + path.resolve(here, '../index.html');
const shots = path.resolve(here, '../.shots'); fs.mkdirSync(shots, { recursive: true });
const R = JSON.parse(fs.readFileSync(path.resolve(here, 'recompute.json'), 'utf8'));
const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
let bad = 0;
const near = (a, b, tol) => Math.abs(a - b) <= tol;
for (const [w, scheme] of [[390, 'dark'], [920, 'light']]) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: 900 });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  const errs = [];
  page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await page.goto(file, { waitUntil: 'load' });
  await page.evaluate(() => { try { localStorage.clear() } catch (e) {} });
  const tabs = await page.$$eval('#tabs button', bs => bs.map(b => b.dataset.t));
  for (const t of tabs) {
    await page.click(`#tabs button[data-t="${t}"]`); await new Promise(r => setTimeout(r, 150));
    const n = await page.evaluate(async (t) => {
      const tab = document.getElementById(t); let k = 0; if (!tab) return -1;
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      for (const b of [...tab.querySelectorAll('button')]) { if (/-play$/.test(b.id)) continue; b.click(); k++; await sleep(10) }
      for (const s of [...tab.querySelectorAll('select')]) { for (const o of [...s.options]) { s.value = o.value; s.dispatchEvent(new Event('change')); s.dispatchEvent(new Event('input')); k++; await sleep(5) } s.selectedIndex = 0; s.dispatchEvent(new Event('change')) }
      for (const r of [...tab.querySelectorAll('input[type=range]')]) { for (const v of [r.min, r.max, (+r.min + +r.max) / 2]) { r.value = v; r.dispatchEvent(new Event('input')); r.dispatchEvent(new Event('change')); k++; await sleep(5) } }
      for (const d of [...tab.querySelectorAll('details')]) { d.open = true; k++ }
      return k;
    }, t);
    const txt = await page.evaluate(t => (document.getElementById(t) || { innerText: '' }).innerText, t);
    const m = txt.match(/.{0,40}(NaN|undefined|Infinity|\?\?).{0,40}/);
    const sw = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    if (m || sw[0] > sw[1]) { bad++; console.log(w, t, 'PROBLEM', m && m[0], sw) }
    console.log(w, scheme, t, 'controls', n);
    await page.screenshot({ path: `${shots}/own_${w}_${t}.png`, fullPage: true });
  }
  // animations: every step in every mode
  await page.click('#tabs button[data-t="t-read"]');
  for (const [pre, modes, steps] of [['ag', 3, 6], ['au', 3, 5]]) {
    for (let md = 0; md < modes; md++) {
      for (let s = 0; s < steps; s++) {
        const txt = await page.evaluate((pre, md, s) => {
          document.getElementById(pre + '-m' + md).click();
          const sc = document.getElementById(pre + '-scrub'); sc.value = s; sc.dispatchEvent(new Event('input'));
          return document.getElementById(pre).innerText;
        }, pre, md, s);
        const m = txt.match(/.{0,40}(NaN|undefined|Infinity).{0,40}/);
        if (m) { bad++; console.log(w, pre, md, s, 'PROBLEM', m[0]) }
      }
      await new Promise(r => setTimeout(r, 1100)); const el = await page.$('#' + pre); await el.screenshot({ path: `${shots}/own_${w}_${pre}${md}.png` });
    }
  }
  // play button runs and pauses
  await page.evaluate(() => { document.getElementById('ag-play').click() }); await new Promise(r => setTimeout(r, 600));
  await page.evaluate(() => { document.getElementById('ag-play').click(); document.getElementById('au-play').click() }); await new Promise(r => setTimeout(r, 600));
  await page.evaluate(() => { document.getElementById('au-play').click() });
  const unfilled = await page.evaluate(() => [...document.querySelectorAll('[data-k]')].filter(e => !e.textContent || e.textContent === '?').map(e => e.dataset.k));
  if (unfilled.length) { bad++; console.log('unfilled prose numbers', unfilled) }
  const jsErr = await page.evaluate(() => { const d = document.getElementById('jsErr'); return d && !d.hidden ? d.textContent : '' });
  if (errs.length || jsErr) { bad++; console.log(w, 'ERRORS', errs, jsErr) }
  // compare with recompute.json (once)
  if (w === 390) {
    const C = await page.evaluate(() => window.HE_CHECK());
    let n = 0, miss = 0;
    const cmp = (a, b, where) => { n++; if (typeof b === 'number') { if (!near(a, b, 6e-4)) { miss++; console.log('MISMATCH', where, a, b) } } else if (JSON.stringify(a) !== JSON.stringify(b)) { miss++; console.log('MISMATCH', where, a, b) } };
    for (const t of ['t1', 't2']) for (const f of ['ties', 'noties']) for (const k in C.mtb[t][f]) cmp(C.mtb[t][f][k], R.mtb[t][f][k], `mtb.${t}.${f}.${k}`);
    for (const a in C.hs2) for (const f of ['all', 'kept']) for (const k in C.hs2[a][f]) cmp(C.hs2[a][f][k], R.hs2[a][f][k], `hs2.${a}.${f}.${k}`);
    for (const s in C.audit) {
      const A = C.audit[s], P = R.audit[s];
      for (const k of ['acc_orig', 'acc_clean', 'acc_corr']) A[k].forEach((v, i) => cmp(v, P[k][i], `${s}.${k}[${i}]`));
      for (const k of ['rank_orig', 'rank_clean', 'rank_corr', 'errors', 'wrong_key']) cmp(A[k], P[k], `${s}.${k}`);
      cmp(A.spearman_orig_clean, P.spearman_orig_clean, `${s}.sp1`); cmp(A.spearman_orig_corr, P.spearman_orig_corr, `${s}.sp2`);
      for (const nm in A.found_at) for (const k in A.found_at[nm]) cmp(A.found_at[nm][k], P.found_at[nm][k], `${s}.found.${nm}.${k}`);
    }
    cmp(C.northcutt.rank_match, R.northcutt.rank_match, 'nc.rank'); cmp(C.northcutt.crank_match, R.northcutt.crank_match, 'nc.crank'); cmp(C.northcutt.spearman, R.northcutt.spearman, 'nc.sp');
    for (const k in C.paradox) C.paradox[k].forEach((v, i) => cmp(v, R.paradox[k][i], `paradox.${k}[${i}]`));
    console.log('recompute comparisons', n, 'mismatches', miss); if (miss) bad++;
    fs.writeFileSync(path.resolve(here, 'check_out.json'), JSON.stringify({ prose: C.prose }, null, 1));
  }
  await page.close();
}
await browser.close();
console.log(bad ? 'FAIL ' + bad : 'OK');
