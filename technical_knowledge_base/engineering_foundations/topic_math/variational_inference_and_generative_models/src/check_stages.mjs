// The 2026-11-06 rollout checks (adapted from Information theory for ML, 2026-11-07): every 3D stage plays by itself once scrolled into view,
// steps to its last step, has one step-list item per step, never moves under reduced motion, stops drawing off screen; no errors, NaN,
// undefined or sideways scroll; the splits are two columns at 1400 px; the numbers each stage draws match inputs/numbers.json (recompute.py).
// usage (from anywhere): node src/check_stages.mjs [shots dir]   (needs html_utils' node_modules)
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = ['stg-hero', 'stg-cavi', 'stg-vae', 'stg-diff'];
const NUM = JSON.parse(fs.readFileSync(path.resolve(here, 'inputs/numbers.json'), 'utf8'));
const wait = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const problems = [];
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(400);
  const tag = `${scheme} ${width}`;
  const audit = async where => {
    const r = await p.evaluate(() => ({ bad: (document.getElementById('t-read').innerText.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) }));
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  if (width === 1400) { // the numbers the stages draw and quote
    const g = await p.evaluate(() => ({ h: window.VI_HERO, c: window.VI_CAVI, v: window.VI_VAE, d: window.VI_DIFF }));
    const near = (n, a, b, t = 6e-5) => { const A = [].concat(a), B = [].concat(b); if (A.length !== B.length || A.some((v, i) => Math.abs(v - B[i]) > t)) problems.push(`stage numbers ${n}: ${A} against ${B}`) };
    near('hero log p(x)', g.h.logpx, NUM.A.logpx); near('hero ELBO', g.h.elbo0, NUM.A.q.elbo); near('hero gap', g.h.gap0, NUM.A.q.kl_post);
    near('hero gap, mean matched', g.h.gapMid, NUM.stages.hero_gap_mean_matched); near('hero gap at the posterior', g.h.gapEnd, 0);
    near('hero B log p(x)', g.h.logpxB, NUM.B.logpx, 2e-4); near('hero B gap', g.h.gapB, NUM.B.best_gap, 3e-4);
    near('cavi round 1', [g.c.lam1, g.c.b1, g.c.Et1], NUM.cavi.hist[0].slice(1)); near('cavi round 5 lambda, E[tau]', [g.c.lam5, g.c.Et5], [NUM.cavi.hist[4][1], NUM.cavi.hist[4][3]]);
    near('cavi end', [g.c.lamEnd, g.c.bEnd, g.c.EtEnd], NUM.cavi.hist[11].slice(1)); near('cavi var mu', [g.c.varMuQ, g.c.varMuExact], [NUM.cavi.mf_var_mu, NUM.cavi.exact_var_mu], 1e-5);
    near('cavi var tau', [g.c.varTauQ, g.c.varTauExact], [NUM.cavi.mf_var_tau, NUM.cavi.exact_var_tau]);
    near('vae kl', [g.v.kl1, g.v.kl2, g.v.klT], [NUM.kl.dim1, NUM.kl.dim2, NUM.kl.closed]);
    near('diff abar', g.d.abar.slice(1), ['100', '200', '500', '1000'].map(t => NUM.sched.lin[t]), 1e-6); near('diff x200', g.d.x200, NUM.root.xt);
    near('diff weights', g.d.w, ['1', '100', '200', '500', '1000'].map(t => NUM.w12[t]));
    const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
    if (!cols.length || cols.some(c => c !== 'grid')) problems.push(`${tag}: a split is not two columns`);
    await p.screenshot({ path: `${shots}/x-top-${scheme}-${width}.png` });
  }
  for (const id of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2200);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
  }
  // flows stop off screen: draws do not rise while every stage is out of view
  await p.evaluate(() => window.scrollTo(0, document.getElementById('vi-s9').getBoundingClientRect().top + scrollY)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  for (const id of STAGES) {
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1);
    const lis = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx'); return l ? l.children.length : 0 });
    if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but ${lis} items`);
    for (let k = 1; k < n; k++) {
      await p.$eval(`#${id}-f`, e => e.click()); await wait(80);
      if (k === Math.floor(n / 2)) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2600); const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}-mid-${scheme}-${width}.png` }) }
    }
    await wait(2600);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
    if (width !== 920) { const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}-last-${scheme}-${width}.png` }) }
    const on = await p.$eval('#' + id, h => [...h.closest('.s3sp').querySelector('ol.sx').children].findIndex(li => li.classList.contains('on'))); if (on !== n - 1) problems.push(`${tag}: ${id} list marks ${on}`);
    await audit(`${id} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((id, k) => document.getElementById(id).closest('.s3sp').querySelector('ol.sx').children[k].click(), id, k);
    if (width !== 920) for (let k = 0; k < n; k++) { if (k === Math.floor(n / 2) || k === 0) continue;
      await p.evaluate((id, k) => document.getElementById(id).closest('.s3sp').querySelector('ol.sx').children[k].click(), id, k); await wait(1900);
      const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}-s${k + 1}-${scheme}-${width}.png` }) }
  }
  await audit('end');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file);
  for (const id of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !r[1].startsWith('step 1 of')) problems.push(`reduced motion: ${id} moved by itself (${r})`);
    const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800); const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0);
    if (d1 !== d0) problems.push(`reduced motion: ${id} kept drawing (${d0} -> ${d1})`) }
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
