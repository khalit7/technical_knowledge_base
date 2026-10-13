// Page check for the Distributed lab: every control clicked at 390 px dark and 920 px light, no errors/NaN/undefined,
// no sideways scroll; and the DTensor values the page derives equal the recorded local tensors of every rank in every pair.
// node check_page.mjs [shots dir]
import { createRequire } from 'module';
import fs from 'fs'; import path from 'path'; import url from 'url';
const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../../../../..');
const require = createRequire(path.join(REPO, 'html_utils/package.json'));
const puppeteer = require('puppeteer');
const SHOTS = process.argv[2] || '/tmp/dst_shots'; fs.mkdirSync(SHOTS, { recursive: true });
const page_url = 'file://' + path.resolve(HERE, '../../index.html');
const opts = { headless: 'shell' }; if (process.env.CHROME_PATH) opts.executablePath = process.env.CHROME_PATH;
const browser = await puppeteer.launch(opts);
let fails = 0; const log = (...a) => console.log(...a);
// recorded DTensor locals
const rec = {};
for (const w of [2, 4]) rec[w] = JSON.parse(fs.readFileSync(path.join(HERE, 'inputs', `dtensor_w${w}.json`)));
for (const [W, dark] of [[390, true], [920, false]]) {
  const p = await browser.newPage(); const errs = [];
  p.on('pageerror', e => errs.push('pageerror ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text()) });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: dark ? 'dark' : 'light' }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.setViewport({ width: W, height: 900 });
  await p.goto(page_url, { waitUntil: 'load' });
  await p.evaluate(() => { try { localStorage.clear() } catch (e) { } document.querySelector('#tabs button[data-t="t-dist"]').click() });
  await new Promise(r => setTimeout(r, 300));
  // click every button and change every select inside the tab
  const n = await p.evaluate(async () => {
    const t = document.getElementById('t-dist'); let n = 0; const sleep = ms => new Promise(r => setTimeout(r, ms));
    for (const b of [...t.querySelectorAll('button')]) { b.click(); n++; await sleep(15) }
    for (const s of [...t.querySelectorAll('select')]) { for (const o of [...s.options]) { s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); n++; await sleep(10) } }
    for (const r of [...t.querySelectorAll('input[type=range]')]) { for (const v of [r.min, r.max, (+r.min + +r.max) / 2 | 0]) { r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); n++ } }
    // re-select each first segment so screenshots show defaults
    for (const g of [...t.querySelectorAll('.seg')]) { const b = g.querySelector('button'); if (b) b.click() }
    return n;
  });
  // every mesh and every pair in the explorer
  const dtBad = await p.evaluate(() => {
    const out = []; const sel = document.getElementById('dst-dt-sel'); const M = window.DST.dtensor; const PL = ['S0', 'S1', 'R', 'P'];
    M.forEach((m, mi) => { const ms = document.getElementById('dst-dt-m'); ms.value = mi; ms.dispatchEvent(new Event('change', { bubbles: true }));
      m.pairs.forEach(pr => { const s = pr.s.split(','), d = pr.d.split(',');
        s.forEach((v, i) => { const e = document.getElementById('dst-dt-s' + i); e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })) });
        d.forEach((v, i) => { const e = document.getElementById('dst-dt-d' + i); e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })) });
        const txt = document.getElementById('dst-dt-out').innerText + document.getElementById('dst-dt-cap').innerText;
        if (/NaN|undefined/.test(txt)) out.push(m.mesh + ' ' + pr.s + '->' + pr.d) }) });
    return out;
  });
  if (dtBad.length) { fails++; log('explorer NaN/undefined', dtBad.slice(0, 5)) }
  const txt = await p.evaluate(() => document.getElementById('t-dist').innerText);
  if (/NaN|undefined|Infinity/.test(txt)) { fails++; log('NaN/undefined in tab text', txt.match(/.{40}(NaN|undefined|Infinity).{40}/)) }
  const sw = await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  if (sw[0] > sw[1] + 1) { fails++; log('sideways scroll', sw) }
  const wide = await p.evaluate(() => [...document.querySelectorAll('#t-dist svg')].filter(s => s.getBoundingClientRect().right > document.documentElement.clientWidth + 1).map(s => s.getAttribute('aria-label')));
  if (wide.length) { fails++; log('svg wider than page', wide) }
  if (errs.length) { fails++; log('errors', errs) }
  if (W === 390) {
    // DTensor derivation against every recorded rank, every pair
    let checked = 0, bad = [];
    const derived = await p.evaluate(() => {
      const res = {}; const F = window.DST_DERIVE;
      window.DST.dtensor.forEach((m, mi) => { res[mi] = m.pairs.map(pr => pr.err != null ? null : m.coords.map(cc => ({ s: F.srcLocal(pr.s.split(','), cc, m.shape), d: F.dstLocal(pr.s.split(','), pr.d.split(','), cc, m.shape) }))) });
      return res });
    const meshes = [[rec[2], 0, 0], [rec[4], 0, 1], [rec[4], 1, 2]];
    for (const [R, k, mi] of meshes) {
      R.ranks[0].meshes[k].pairs.forEach((pr, pi) => { if (pr.error) return;
        R.ranks.forEach((rr, r) => { const q = rr.meshes[k].pairs[pi], dv = derived[mi][pi][r];
          const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b) || (a.length === 0 && (b.length === 0 || b[0].length === 0)) || (b.length === 0 && a.length && a[0].length === 0);
          checked++;
          if (!eq(dv.s, q.src_local) || !eq(dv.d, q.dst_local)) bad.push(R.ranks[0].meshes[k].mesh + ' ' + pr.src + '->' + pr.dst + ' r' + r + ' got ' + JSON.stringify(dv.d) + ' rec ' + JSON.stringify(q.dst_local)) }) });
    }
    log('dtensor locals checked', checked, 'mismatches', bad.length); if (bad.length) { fails++; log(bad.slice(0, 6)) }
  }
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.screenshot({ path: path.join(SHOTS, `dist_${W}.png`), fullPage: true });
  log(W, dark ? 'dark' : 'light', 'controls exercised', n, 'errors', errs.length);
  await p.close();
}
await browser.close();
log('fails', fails); process.exit(fails ? 1 : 0);
