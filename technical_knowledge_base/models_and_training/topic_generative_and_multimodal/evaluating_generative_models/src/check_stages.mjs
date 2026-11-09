// The 2026-11-06 rollout checks for Evaluating generative models (2026-11-09): the three 3D stages (Fig. 1 FID from zero, Fig. 2 FID against N,
// Fig. 3 pitfalls) play by themselves once scrolled into view, step to their last step with one step-list item per step, stop redrawing off
// screen and never move under reduced motion; no errors, NaN, undefined or sideways scroll; the splits are two columns at 1400 px and one below
// 1100 px; no play control outside the stages. The numbers written in the step lists are compared with what the scenes compute from the page's
// data (window.EVS) and with EV itself. Adapted from Eval statistics' check_stages.mjs.
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_generative_and_multimodal/evaluating_generative_models/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = [['stg-fid', 'sx-fid'], ['stg-n', 'sx-n'], ['stg-pit', 'sx-pit']];
const wait = ms => new Promise(r => setTimeout(r, ms));
const problems = [];
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(400);
  const tag = `${scheme} ${width}`;
  const audit = async where => {
    const r = await p.evaluate(() => { const c = document.getElementById('t-read').cloneNode(true); c.querySelectorAll('pre,code').forEach(x => x.remove());
      return { bad: (c.innerText.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } });
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (!cols.length || cols.some(c => c !== 'grid'))) problems.push(`${tag}: a split is not two columns (${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  const plays = await p.$$eval('#t-read .an-play', xs => xs.filter(x => !x.closest('.stg')).length);
  if (plays) problems.push(`${tag}: ${plays} play controls outside the stages`);
  for (const [id] of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
    if (width === 1400 || width === 390) { await wait(300); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-autoplay-tween-${scheme}-${width}.png` }) }
  }
  // flows stop off screen
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  for (const [id, lid] of STAGES) {
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length);
    if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but list ${lid} shows ${lis}`);
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' }));
    for (let k = 0; k < n; k++) {
      if (k) await p.$eval(`#${id}-f`, e => e.click());
      if (width === 1400 || width === 390) {
        await wait(650); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}-midtween-${scheme}-${width}.png` });
        await wait(1100); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}-${scheme}-${width}.png` })
      }
    }
    await wait(1700);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
    await audit(`${id} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id} list does not mark the last step`);
  }
  // the set chooser of Fig. 1 replays the stage and rewrites the numbers in its step list
  for (const m of ['vae', 'half', 'ddpm']) {
    await p.evaluate(m => document.querySelector('#ev-fid-set button[data-m="' + m + '"]').click(), m);
    await p.$eval('#stg-fid', e => e.scrollIntoView({ block: 'center' })); await wait(700);
    const r = await p.evaluate(() => ({ k: EVS.fid.k, li: document.getElementById('sx-fid').children[3].textContent, want: EVS.fid.mean, st: document.querySelector('#stg-fid .stg-st').textContent }));
    if (r.k !== m || !r.li.includes(r.want)) problems.push(`${tag}: Fig. 1 set ${m}: step 4 does not name its mean term ${r.want}`);
    if (width === 1400 && m === 'half') { await wait(9000); await (await p.$('#stg-fid')).screenshot({ path: `${shots}/x-stg-fid-half-${scheme}-${width}.png` }) }
  }
  if (width === 1400) { // the step lists' numbers are what the scenes compute from the page's data
    const r = await p.evaluate(() => { const out = [], li = (id, k) => document.getElementById(id).children[k].textContent.replace(/\s+/g, ' ');
      const need = (id, k, x) => { if (!li(id, k).includes(String(x))) out.push(`${id} item ${k + 1} lacks "${x}"`) };
      const F = EVS.fid; need('sx-fid', 0, F.set); need('sx-fid', 3, F.mean); need('sx-fid', 4, F.cov); need('sx-fid', 5, F.fid); need('sx-fid', 5, F.floor);
      const note = document.querySelector('#ev-s2 p.small').textContent; if (!note.includes('(' + EV.pca.var_pct + ' of their variance)')) out.push('Fig. 1 note lacks the variance share ' + EV.pca.var_pct);
      { const m = EV.pca.stats.ddpm.mu, t = EV.pca.stats.test.mu, q = ((m[0] - t[0]) ** 2 + (m[1] - t[1]) ** 2) / EV.dec.ddpm.mean; if (!(q > .2 && q < .3)) out.push('Fig. 1 step 4: the drawn share of DDPM\'s mean term is ' + q.toFixed(2) + ', not about a quarter'); }
      const N = EVS.n; need('sx-n', 0, 'scores ' + N.real250 + ' at 250 samples and ' + N.real10k + ' at 10,000'); need('sx-n', 1, 'K = ' + N.realK); need('sx-n', 1, 'is ' + N.realInf.replace(/0$/, ''));
      need('sx-n', 2, 'from ' + N.ddpm250 + ' at 250 to ' + N.ddpm10k + ' at 10,000 (FID∞ ' + N.ddpmInf + ')'); need('sx-n', 2, 'FID∞ ' + N.g4Inf); need('sx-n', 2, 'K from ' + N.Kmin + ' to ' + N.Kmax);
      need('sx-n', 2, 'from ' + N.vae250 + ' to ' + N.vae10k); need('sx-n', 3, '(FID ' + N.real250 + ')'); need('sx-n', 3, '(' + N.ddpm1k + ')'); need('sx-n', 4, N.gap250 + ' at 250 and ' + N.gap10k + ' at 10,000');
      document.querySelectorAll('#ev-s5 [data-evs]').forEach(el => { const k = el.dataset.evs, v = EVS.pit[k]; if (v == null) out.push('pit: no value for ' + k); else if (el.textContent !== v) out.push(`pit ${k}: page ${el.textContent}, data ${v}`) });
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  await audit('end');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file);
  for (const [id] of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
