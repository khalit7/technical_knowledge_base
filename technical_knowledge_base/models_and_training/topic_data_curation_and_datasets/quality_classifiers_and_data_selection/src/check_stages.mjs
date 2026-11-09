// The 2026-11-06 rollout checks for Quality classifiers and data selection (2026-11-09), adapted from Extraction and filtering's check_stages.mjs:
// the three 3D stages (Fig. 1 one real page through fastText, Fig. 2 six reference sets, Fig. 3 the threshold plane) play by themselves once
// scrolled into view, step to their last step with one step-list item per step, stop redrawing off screen and never move under reduced motion;
// no errors, NaN, undefined or sideways scroll; the splits are two columns at 1400 px and one below 1100 px; the numbers written in the step
// lists equal what the page computes from window.QC (for Fig. 1, for every page and classifier the chips offer).
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_data_curation_and_datasets/quality_classifiers_and_data_selection/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = { 'stg-ft': 'sx-ft', 'stg-ref': 'sx-ref', 'stg-th': 'sx-th' };
const wait = ms => new Promise(r => setTimeout(r, ms));
const problems = [];
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(400);
  const tag = `${scheme} ${width}`, shoot = width === 1400 || width === 390;
  const audit = async (where, tab = 't-read') => {
    const r = await p.evaluate(tab => { const c = document.getElementById(tab).cloneNode(true); c.querySelectorAll('pre,code').forEach(x => x.remove());
      return { bad: (c.innerText.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } }, tab);
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (!cols.length || cols.some(c => c !== 'grid'))) problems.push(`${tag}: a split is not two columns (${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  if (width === 1400) { const over = await p.$$eval('#t-read .s3R', xs => xs.map(x => { const r = x.getBoundingClientRect(), k = x.firstElementChild && x.firstElementChild.getBoundingClientRect(); return k && (k.right > r.right + 1 || k.left < r.left - 1) ? x.innerHTML.slice(0, 40) : '' }).filter(Boolean));
    over.forEach(o => problems.push(`${tag}: right-column content wider than its column: ${o}`)) }
  // autoplay on view
  for (const id of Object.keys(STAGES)) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2600);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
    if (shoot) await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-autoplay-${scheme}-${width}.png` });
  }
  // flows and timers stop off screen
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  // step every stage to its end
  for (const [id, lid] of Object.entries(STAGES)) {
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length);
    if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but list ${lid} has ${lis}`);
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' }));
    for (let k = 0; k < n; k++) {
      if (k) await p.$eval(`#${id}-f`, e => e.click());
      if (shoot) {
        await wait(800); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${lid}-s${k + 1}-mid-${scheme}-${width}.png` });
        await wait(2000); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${lid}-s${k + 1}-${scheme}-${width}.png` })
      } else await wait(300);
    }
    await wait(2600);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
    await audit(`${id} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id} does not mark the last step`);
  }
  // Fig. 1 with every page and classifier: no errors, the step list's numbers follow the chips
  const combos = await p.evaluate(() => { const out = []; document.querySelectorAll('#qc-a1-doc button').forEach(d => document.querySelectorAll('#qc-a1-mod button').forEach(m => out.push([d.dataset.m, m.dataset.m]))); return out });
  for (const [d, m] of combos) {
    await p.$eval(`#qc-a1-doc button[data-m="${d}"]`, e => e.click()); await p.$eval(`#qc-a1-mod button[data-m="${m}"]`, e => e.click()); await wait(120);
    const r = await p.evaluate(() => { const A = QC.a1, st = QCFT, e = A.ex[st.doc][st.mod], M = A.models.find(x => x.key === st.mod), li = k => document.getElementById('sx-ft').children[k].textContent, out = [];
      const nf = x => Math.round(x).toLocaleString('en-GB');
      if (!li(1).includes(nf(e.ntok) + ' tokens')) out.push('ntok'); if (!li(2).includes(nf(e.nU) + ' word features')) out.push('nU'); if (!li(3).includes(nf(e.nB) + ' bigrams')) out.push('nB');
      if (!li(4).includes('/ ' + nf(e.nU + e.nB) + ' = ')) out.push('N'); if (Math.abs((e.sumU + e.sumB) / (e.nU + e.nB) - e.logit) > 0.006) out.push('logit is not the mean push');
      if (Math.abs(1 / (1 + Math.exp(-e.logit)) - e.p) > Math.max(2e-3, e.p * .02)) out.push('P is not sigmoid(logit)');
      if (!li(5).includes(e.p >= M.cut ? 'kept' : 'dropped')) out.push('verdict'); return out.length ? st.doc + '/' + st.mod + ': ' + out.join(', ') : '' });
    if (r) problems.push(`${tag}: Fig. 1 ${r}`);
  }
  await p.$eval('#qc-a1-doc button', e => e.click()); await p.$eval('#qc-a1-mod button', e => e.click());
  await audit('after the Fig. 1 chips');
  if (width === 1400) { // the step lists' numbers are what the page computes
    const r = await p.evaluate(() => { const out = [], li = (lid, k) => document.getElementById(lid).children[k].textContent.replace(/\s+/g, ' ');
      const need = (lid, k, x) => { if (!li(lid, k).includes(String(x))) out.push(`${lid} item ${k + 1} lacks "${x}"`) }, pc = x => Math.round(x * 100) + '%';
      // Fig. 2
      const T = QCRS.T, C = QCRS.CORE;
      need('sx-ref', 1, pc(T[1].j_dclm) + ' and ' + pc(T[2].j_dclm)); need('sx-ref', 1, pc(T[3].j_dclm) + ', ' + pc(T[4].j_dclm) + ' and ' + pc(T[5].j_dclm));
      [0, 1, 2, 3, 4, 5].forEach(i => need('sx-ref', 2, pc(T[i].hand_prec) + ' (' + T[i].hand_kept + ')'));
      [0, 1, 2, 3, 4, 5].forEach(i => need('sx-ref', 3, T[i].annot_auc.toFixed(3)));
      [0, 3, 4, 5].forEach(i => need('sx-ref', 4, C[i].toFixed(1)));
      need('sx-ref', 4, (C[0] - Math.max(C[3], C[4], C[5])).toFixed(1) + ' to ' + (C[0] - Math.min(C[3], C[4], C[5])).toFixed(1));
      // Fig. 3
      const H = QCTH, L = H.labs, cnt = c => L.filter(l => l.keep === c).length;
      need('sx-th', 0, 'Green: worth training a general model on (' + cnt('y') + ')'); need('sx-th', 0, 'red: not (' + cnt('n') + ')'); need('sx-th', 0, 'grey: unsure (' + cnt('u') + ')');
      for (const [k, sh] of [[1, .6], [2, .3], [3, .1], [4, .05]]) { const q = H.count('dclm', sh); need('sx-th', k, q.ky + ' of ' + q.kl) }
      { const q = H.count('dclm', .6); need('sx-th', 1, q.ky + ' of the ' + cnt('y') + ' "yes" pages') }
      need('sx-th', 5, H.count('edu', .6).ky + ' of ' + H.count('edu', .6).kl); need('sx-th', 5, H.count('edu', .1).ky + ' of ' + H.count('edu', .1).kl);
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  await audit('end');
  for (const t of ['t-more']) { await p.click(`#tabs button[data-t="${t}"]`); await wait(300); await audit(t, t) }
  await p.click('#tabs button[data-t="t-read"]');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file);
  for (const id of Object.keys(STAGES)) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
