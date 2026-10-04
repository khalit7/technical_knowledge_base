// 1. Compare the page's own numbers (window.ES_CHECK) with recompute.json.
// 2. Click every control at 390 px dark and 920 px light; report errors, NaN/undefined text, sideways scroll; screenshots to ../.shots/own_*.png
// usage (from this folder): node check_page.mjs
import { createRequire } from 'module';
import path from 'path'; import fs from 'fs'; import { fileURLToPath } from 'url';
const require = createRequire(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const here = path.dirname(fileURLToPath(import.meta.url));
const file = 'file://' + path.resolve(here, '../index.html');
const shots = path.resolve(here, '../.shots'); fs.mkdirSync(shots, { recursive: true });
const R = JSON.parse(fs.readFileSync(path.resolve(here, 'recompute.json'), 'utf8'));
const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
let bad = 0;
const near = (name, a, b, tol) => { const ok = Math.abs(a - b) <= tol; if (!ok) bad++; console.log((ok ? 'ok  ' : 'BAD ') + name, +(+a).toFixed(5), +(+b).toFixed(5)); };
{ // numbers
  const page = await browser.newPage(); await page.setViewport({ width: 920, height: 900 });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(file, { waitUntil: 'load' });
  await page.click('#tabs button[data-t="t-size"]'); await new Promise(r => setTimeout(r, 300));
  for (const k of ['prod', 'card']) { await page.evaluate(k => { const b = [...document.querySelectorAll('#sz-bpre button')].find(x => x.dataset.k === k); b.click() }, k); await new Promise(r => setTimeout(r, 2500)); }
  const C = await page.evaluate(() => { const c = window.ES_CHECK; const strip = o => JSON.parse(JSON.stringify(o, (k, v) => k === 'd' || k === 'x' || k === 'its' ? undefined : v)); return strip(c) });
  const rr = R.race, f = C.race.four, fr = rr.four_greedy;
  near('race acc A greedy', C.race.accG[0], rr.acc_greedy_A, 1e-9); near('race acc B greedy', C.race.accG[1], rr.acc_greedy_B, 1e-9);
  near('race acc A prob', C.race.accP[0], rr.acc_p_A, 1e-9);
  for (const k of ['diff', 'unpaired', 'paired', 'clustered', 'unpairedClu', 'r']) near('race greedy ' + k, f[k], fr[k], 1e-9);
  for (const k of ['diff', 'unpaired', 'paired', 'clustered', 'r']) near('race prob ' + k, C.race.fourP[k], rr.four_p[k], 1e-9);
  near('race McNemar exact p', C.testsRace.mcx, rr.mc.p_exact, 1e-6); near('race McNemar chi p', C.testsRace.mcc, rr.mc.p_chi_cc, 2e-4);
  for (const k of ['diff', 'unpaired', 'paired', 'clustered', 'r']) near('mtb claude ' + k, C.mtbClaude[k], R.mtb_claude[k], 1e-9);
  near('mtb all pairs count', C.mtbAll.pairs, R.mtb_all.pairs, 0); near('mtb paired/unpaired median', C.mtbAll.pu_med, R.mtb_all.paired_over_unpaired_median, 1e-9);
  near('mtb clustered/paired median', C.mtbAll.cp_med, R.mtb_all.clu_over_paired_median, 1e-9);
  near('race clustered/naive A', C.cluRace[0], rr.seclu_greedy_A / rr.se_greedy_A, 1e-9);
  near('var A Var(x)', C.var[0].vx, rr.var_x_A, 1e-9); near('var A E[s2]', C.var[0].es, rr.e_sig2_A, 1e-9); near('var A pred K=5', C.var[0].pred5, rr.se_K_pred_A['5'], 1e-9);
  near('Card power 500', C.card.p500, R.card.p500[0], 1e-6); near('Card Type-M 500', C.card.m500, R.card.p500[1], 1e-4); near('Card power 2000', C.card.p2000, R.card.p2000[0], 1e-6);
  near('old example exact power 300', C.prodExact.power, R.old.mc_power_exact_300, 1e-6); near('old example exact n80', C.prodExact.n80, R.old.mc_n80_exact_step5, 0);
  near('root nU', C.sizeRootCore.nU, R.root.nU, 0); near('root nP', C.sizeRootCore.nP, R.root.nP, 0); near('root ciU', C.sizeRootCore.ciU, R.root.ciU, 0.01); near('root ciP', C.sizeRootCore.ciP, R.root.ciP, 0.01);
  near('root mdeP', C.sizeRootCore.mdeP, R.root.mdeP, 0.01); near('root mdeU', C.sizeRootCore.mdeU, R.root.mdeU, 0.01);
  near('Miller n969', C.genCore.m969, Math.ceil(R.miller.n969), 0); near('Miller MDE K1', C.genCore.mk1, 100 * R.miller.mde_K1, 0.001); near('Miller MDE K10', C.genCore.mk10, 100 * R.miller.mde_K10, 0.001);
  near('Bowyer wald 100', C.cov100.wald, R.bowyer['100'].wald, 2e-4); near('Bowyer wilson 100', C.cov100.wilson, R.bowyer['100'].wilson, 2e-4); near('Bowyer cp 100', C.cov100.cp, R.bowyer['100'].cp, 2e-4); near('Bowyer bayes 100', C.cov100.bayes, R.bowyer['100'].bayes, 2e-4);
  near('20 slices FWER', C.mult20.fw, R.root.fwer20, 1e-9);
  for (const k of Object.keys(R.madaan)) near('Madaan CI at mean ' + k, C.madaan[k], R.madaan[k].ci_at_mean, 1e-9);
  C.ma.forEach(m => near('MathArena median within share ' + m.name, m.medShare, (R.ma_rows[m.name].map(r => r.sig2 + r.varx > 0 ? r.sig2 / (r.sig2 + r.varx) : null).filter(v => v !== null).sort((a, b) => a - b))[R.ma_rows[m.name].filter(r => r.sig2 + r.varx > 0).length >> 1], 1e-9));
  C.hv.pairs.forEach((p, i) => { near('hv within ' + i, p.w, R.hv[i].within, 1e-9); near('hv between ' + i, p.b, R.hv[i].between, 1e-9) });
  if (errs.length) { bad++; console.log('errors', errs) }
  await page.close();
}
for (const [w, scheme] of [[390, 'dark'], [920, 'light']]) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: 900 });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  const errs = [];
  page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await page.goto(file, { waitUntil: 'load' });
  const tabs = await page.$$eval('#tabs button', bs => bs.map(b => b.dataset.t));
  for (const t of tabs) {
    await page.click(`#tabs button[data-t="${t}"]`); await new Promise(r => setTimeout(r, 200));
    const n = await page.evaluate(async (t) => {
      const tab = document.getElementById(t); let k = 0; if (!tab) return -1;
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      for (const b of [...tab.querySelectorAll('button')]) { if (b.classList.contains('an-play')) continue; b.click(); k++; await sleep(15) }
      for (const s of [...tab.querySelectorAll('select')]) { for (const o of [...s.options].slice(0, 8)) { s.value = o.value; s.dispatchEvent(new Event('change')); s.dispatchEvent(new Event('input')); k++; await sleep(10) } }
      for (const r of [...tab.querySelectorAll('input[type=range]')]) { for (const v of [r.min, r.max, (+r.min + +r.max) / 2]) { r.value = v; r.dispatchEvent(new Event('input')); r.dispatchEvent(new Event('change')); k++; await sleep(10) } }
      for (const c of [...tab.querySelectorAll('input[type=checkbox]')]) { c.click(); k++; await sleep(5); c.click() }
      for (const c of [...tab.querySelectorAll('input[type=number]')]) { c.value = 0; c.dispatchEvent(new Event('input')); c.value = 30; c.dispatchEvent(new Event('input')); k++ }
      return k;
    }, t);
    await new Promise(r => setTimeout(r, 1500));
    const txt = await page.evaluate(t => (document.getElementById(t) || { innerText: '' }).innerText, t);
    const m = txt.match(/.{0,40}(NaN|undefined|Infinity|MISSING).{0,40}/);
    const sw = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    if (m || sw[0] > sw[1]) { bad++; console.log(w, t, 'PROBLEM', m && m[0], sw) }
    console.log(w, scheme, t, 'controls', n);
    await page.screenshot({ path: `${shots}/own_${w}_${t}.png`, fullPage: true });
  }
  // the animation: every step on both data sets
  await page.click('#tabs button[data-t="t-read"]');
  for (const ds of ['race', 'mtb']) {
    await page.evaluate(ds => document.querySelector('#rd-an-ds button[data-m="' + ds + '"]').click(), ds);
    for (let i = 0; i < 6; i++) {
      await page.evaluate(i => { const s = document.getElementById('rd-an-ctl-s'); s.value = i; s.dispatchEvent(new Event('input')) }, i);
      const cap = await page.evaluate(() => document.getElementById('rd-an-card').innerText);
      if (/NaN|undefined/.test(cap)) { bad++; console.log('anim problem', ds, i) }
    }
    const el = await page.$('#rd-an-card'); await el.screenshot({ path: `${shots}/own_${w}_anim_${ds}.png` });
  }
  const jsErr = await page.evaluate(() => document.getElementById('jsErr').hidden);
  if (errs.length || !jsErr) { bad++; console.log(w, 'errors', errs, 'jsErr hidden', jsErr) }
  await page.close();
}
await browser.close();
console.log('problems', bad);
