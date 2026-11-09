// The 2026-11-06 rollout checks for Data mixing (2026-11-09), adapted from Production eval engineering's check_stages.mjs: the five 3D stages
// (Fig. 1 The Pile's weights and epochs, Fig. 2 repeated data, Fig. 3 RegMix, Fig. 4 a loader hitting the weights, Fig. 6 the replay toy's nine runs)
// and the 2D animation of 6a (Fig. 5) play by themselves once scrolled into view, step to their last step with one step-list item per step,
// stop redrawing off screen and never move under reduced motion; no errors, NaN, undefined or sideways scroll; the splits are two columns at
// 1400 px and one below 1100 px; the numbers written in the step lists equal what the page computes from its own data (window.MX2, window.CPT).
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_data_curation_and_datasets/data_mixing/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = ['stg-pile', 'stg-rep', 'stg-rm', 'stg-bl', 'stg-ty'];
const MODES = Object.fromEntries(STAGES.map(id => [id, [null, [''], () => 'sx-' + id.slice(4)]]));
const wait = ms => new Promise(r => setTimeout(r, ms));
const problems = [];
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(400);
  const tag = `${scheme} ${width}`;
  const audit = async (where, tab = 't-read') => {
    const r = await p.evaluate(tab => { const c = document.getElementById(tab).cloneNode(true); c.querySelectorAll('pre,code').forEach(x => x.remove());
      return { bad: (c.innerText.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } }, tab);
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (!cols.length || cols.some(c => c !== 'grid'))) problems.push(`${tag}: a split is not two columns (${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  // the figure or stage of every split stays inside the right column at 1400 px
  if (width === 1400) { const over = await p.$$eval('#t-read .s3R', xs => xs.map(x => { const r = x.getBoundingClientRect(), k = x.firstElementChild && x.firstElementChild.getBoundingClientRect(); return k && (k.right > r.right + 1 || k.left < r.left - 1) ? x.innerHTML.slice(0, 40) : '' }).filter(Boolean));
    over.forEach(o => problems.push(`${tag}: right-column content wider than its column: ${o}`)) }
  for (const id of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
    if (width === 1400 || width === 390) { await wait(300); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-autoplay-tween-${scheme}-${width}.png` }) }
  }
  // flows stop off screen
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  for (const id of STAGES) {
    const [seg, modes, lof] = MODES[id];
    for (const md of modes) {
      const lid = lof(md);
      if (seg) { await p.$eval(`${seg} button[data-m="${md}"]`, e => e.click()); await wait(200);
        const vis = await p.$$eval(`#${lof(md)} .pe-m${md}`, xs => xs.every(x => !x.hidden)), hid = await p.$$eval(`#${lof(md)} .pe-m${md === 'a' ? 's' : 'a'}`, xs => xs.every(x => x.hidden));
        if (!vis || !hid) problems.push(`${tag}: ${id} mode ${md} shows the other mode's step text`) }
      await p.$eval(`#${id}-b`, e => e.click());
      await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
      const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.hidden ? -1 : e.children.length);
      if (lis !== n) problems.push(`${tag}: ${id} mode ${md} has ${n} steps but list ${lid} shows ${lis}`);
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' }));
      const shoot = width === 1400 || width === 390;
      for (let k = 0; k < n; k++) {
        if (k) await p.$eval(`#${id}-f`, e => e.click());
        if (shoot) {
          await wait(650); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${md}-s${k + 1}-midtween-${scheme}-${width}.png` });
          await wait(1100); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${md}-s${k + 1}-${scheme}-${width}.png` })
        } else await wait(250);
      }
      await wait(1700);
      const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} mode ${md} ended on ${sh}`);
      await audit(`${id} ${md} last step`);
      for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
      const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
      if (cur !== n - 1) problems.push(`${tag}: ${id} mode ${md} list does not mark the last step`);
    }
    if (seg) { await p.$eval(`${seg} button[data-m="${modes[0]}"]`, e => e.click()); await wait(200) }
  }
  if (width === 1400) { // the step lists' numbers are what the page computes
    const r = await p.evaluate(() => { const out = [], li = (lid, k) => document.getElementById(lid).children[k].textContent.replace(/\s+/g, ' ');
      const need = (lid, k, x) => { if (!li(lid, k).includes(String(x))) out.push(`${lid} item ${k + 1} lacks "${x}"`) };
      const D = MX2, pl = D.pile, T = D.pile_totals, g = n => n.toLocaleString('en-GB', { minimumFractionDigits: 2 }), by = pl.slice().sort((a, b) => b.raw_gib - a.raw_gib), sm = by.slice(11);
      const smRaw = sm.reduce((s, p) => s + p.raw_gib, 0), smW = sm.reduce((s, p) => s + p.weight_pct, 0), W = pl.find(p => /^Wikipedia/.test(p.name)), PC = pl.find(p => p.name === 'Pile-CC');
      need('sx-pile', 0, by[0].raw_gib.toFixed(2) + ' GiB'); need('sx-pile', 0, by[21].raw_gib.toFixed(2) + ' GiB'); need('sx-pile', 0, T.raw.toFixed(2) + ' GiB'); need('sx-pile', 0, smRaw.toFixed(1) + ' GiB, ' + (100 * smRaw / T.raw).toFixed(1) + '%');
      pl.slice(0, 3).forEach(p => need('sx-pile', 1, p.weight_pct.toFixed(2) + '%')); need('sx-pile', 1, by[21].weight_pct.toFixed(2) + '%'); need('sx-pile', 1, smW.toFixed(2) + '%');
      need('sx-pile', 2, g(T.eff) + ' GiB'); const ep = e => pl.filter(p => p.epochs === e).length; if (ep(1) !== 2 || ep(1.5) !== 4 || ep(2) !== 14 || ep(2.5) !== 1 || ep(3) !== 1) out.push('epoch counts per pile changed');
      need('sx-pile', 3, W.weight_pct.toFixed(2) + '% of ' + g(T.eff) + ' GiB is ' + (W.weight_pct / 100 * T.eff).toFixed(2) + ' GiB'); need('sx-pile', 3, W.raw_gib + ' GiB: ' + (W.weight_pct / 100 * T.eff / W.raw_gib).toFixed(1) + ' passes');
      need('sx-pile', 4, g(T.eff) + ' / ' + T.raw.toFixed(2) + ' = ' + (T.eff / T.raw).toFixed(2)); need('sx-pile', 4, (100 * PC.raw_gib / T.raw).toFixed(1) + '%'); need('sx-pile', 4, (100 * W.raw_gib / T.raw).toFixed(2) + '%');
      const eff = RD.mx2eff, RS = D.muennighoff.R_D_star, val = k => eff(k) - eff(k - 1), pc = e => Math.round(100 * eff(e) / e) + '%';
      need('sx-rep', 1, val(2).toFixed(2) + ' U'); need('sx-rep', 1, val(4).toFixed(2) + ' U'); need('sx-rep', 1, eff(4).toFixed(2) + ' U, ' + pc(4));
      need('sx-rep', 2, eff(8).toFixed(2) + ' U (' + pc(8) + ')'); need('sx-rep', 2, eff(16).toFixed(2) + ' U (' + pc(16) + ')'); need('sx-rep', 2, val(16).toFixed(2) + ' U');
      need('sx-rep', 3, eff(32).toFixed(2) + ' U (' + pc(32) + ')'); need('sx-rep', 3, eff(64).toFixed(2) + ' U (' + pc(64) + ')'); need('sx-rep', 3, val(64).toFixed(3) + ' U'); need('sx-rep', 3, (1 + RS).toFixed(2) + ' U');
      const G = D.regmix, Y = [0, 2, 5, 7].map(i => G.train.Y.pile_cc[i].toFixed(2)), tt = G.fit.dml_params.t, tm = Math.max(...Object.values(tt));
      need('sx-rm', 1, Y.slice(0, 3).join(', ') + ' and ' + Y[3]); ['pile_cc', 'enron_emails', 'philpapers'].forEach(d => need('sx-rm', 2, (tm - tt[d]).toFixed(2)));
      if (tm !== tt.github) out.push('GitHub is no longer the least helpful domain'); const M = G.mixtures_1b.regmix, m = d => (100 * M['train_the_pile_' + d]).toFixed(1) + '%';
      ['pile_cc', 'ubuntu_irc', 'pubmed_abstracts', 'wikipedia_en', 'hackernews'].forEach(d => need('sx-rm', 3, m(d)));
      const five = ['pile_cc', 'ubuntu_irc', 'pubmed_abstracts', 'wikipedia_en', 'hackernews'].reduce((s, d) => s + M['train_the_pile_' + d], 0); need('sx-rm', 3, (100 * (1 - five)).toFixed(1) + '% together');
      const t4 = G.table4, av = c => t4.avg[t4.cols.indexOf(c)].toFixed(1); need('sx-rm', 4, av('RegMix')); need('sx-rm', 4, av('Human')); need('sx-rm', 4, av('DoReMi') + ' for DoReMi'); need('sx-rm', 4, av('Pile-CC') + ' for Pile-CC alone');
      const B = RD.mx2blend, run = (s, n) => { const c = [0, 0, 0]; let mx = 0; s.slice(0, n).forEach((d, k) => { c[d]++; mx = Math.max(mx, ...c.map((v, j) => Math.abs(v - B.BW[j] * (k + 1)))) }); return [c, mx] };
      const tg = n => B.BW.map(w => Math.round(w * n)).join(', ').replace(/, (\d+)$/, ' and $1'), cs = c => c.join(', ').replace(/, (\d+)$/, ' and $1');
      const r20 = run(B.seqRand(), 20), r60 = run(B.seqRand(), 60), m20 = run(B.seqMeg(), 20), m60 = run(B.seqMeg(), 60);
      need('sx-bl', 2, 'web ' + r20[0][0] + ', code ' + r20[0][1] + ', maths ' + r20[0][2]); need('sx-bl', 2, 'targets of ' + tg(20)); need('sx-bl', 3, cs(r60[0]) + ' against ' + tg(60)); need('sx-bl', 3, r60[1].toFixed(1) + ' samples');
      need('sx-bl', 4, cs(m20[0]) + ', exactly'); if (m20[0].join() !== B.BW.map(w => Math.round(w * 20)).join()) out.push('blend at 20 no longer on target'); need('sx-bl', 5, cs(m60[0])); need('sx-bl', 5, m60[1].toFixed(1) + ' of a sample');
      const S = CPT.toy.summary, nm = (pk, rp) => 'p' + (pk === 1 ? '1.0' : pk) + '_r' + (rp === 0 ? '0.0' : rp), f2 = v => v.toFixed(2), best = Math.min(...Object.keys(S).filter(k => k[0] === 'p').map(k => S[k].de));
      need('sx-ty', 0, f2(S.base.en) + ' bits'); need('sx-ty', 0, 'German ' + f2(S.base.de)); need('sx-ty', 1, f2(S[nm(1, 0)].forget));
      need('sx-ty', 2, f2(S[nm(.33, 0)].forget) + ' at 0.33× and ' + f2(S[nm(.1, 0)].forget) + ' at 0.1×'); need('sx-ty', 2, 'only ' + Math.round(S[nm(.1, 0)].removed_pct) + '%');
      need('sx-ty', 3, [1, .33, .1].map(pk => f2(S[nm(pk, .05)].forget)).join(', ').replace(/, ([\d.]+)$/, ' and $1')); need('sx-ty', 3, [1, .33, .1].map(pk => f2(S[nm(pk, .25)].forget)).join(', ').replace(/, ([\d.]+)$/, ' and $1'));
      const rem = Object.keys(S).filter(k => k[0] === 'p' && !k.endsWith('r0.0')).map(k => S[k].removed_pct); need('sx-ty', 3, Math.round(Math.min(...rem)) + ' to ' + Math.round(Math.max(...rem)) + '%');
      need('sx-ty', 4, '(' + best.toFixed(3) + ','); need('sx-ty', 4, 'costs ' + f2(S[nm(1, .25)].de - best)); need('sx-ty', 4, 'costs ' + f2(S[nm(.1, 0)].de - best));
      need('sx-ty', 5, S[nm(1, .25)].removed_pct + '%'); need('sx-ty', 5, 'English ' + f2(S[nm(1, .25)].en) + ' and German ' + f2(S[nm(1, .25)].de)); need('sx-ty', 5, f2(S.union.en) + ' and ' + f2(S.union.de));
      const M2 = CPT.toy.meta; need('sx-ty', 5, M2.cpt_steps.toLocaleString('en-GB') + ' steps'); need('sx-ty', 5, (M2.pt_steps + M2.cpt_steps).toLocaleString('en-GB') + ' from scratch');
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  { // the 2D animation of 6a: plays once in view, one list item per step, reaches its last step
    await p.$eval('#fgCard', e => e.scrollIntoView({ block: 'center' })); await wait(2600);
    const pl = await p.$eval('#fgCard .an-play', e => e.getAttribute('aria-label')); if (pl !== 'Pause') problems.push(`${tag}: fgCard did not play when scrolled into view`);
    const n = await p.$eval('#fgCtl-s', e => +e.max + 1), lis = await p.$eval('#sx-fg', e => e.children.length); if (n !== lis) problems.push(`${tag}: fgCard has ${n} steps, list ${lis}`);
    const empty = await p.$$eval('#sx-fg .fg-x', xs => xs.filter(x => !x.textContent.trim()).length); if (empty) problems.push(`${tag}: ${empty} empty step texts in sx-fg`);
    for (let k = 0; k < n; k++) await p.$eval('#fgCtl-f', e => e.click());
    const at = await p.$eval('#fgCtl-s', e => +e.value); if (at !== n - 1) problems.push(`${tag}: fgCard ended at ${at}`);
    const cur = await p.$eval('#sx-fg', e => [...e.children].findIndex(li => li.classList.contains('on'))); if (cur !== n - 1) problems.push(`${tag}: sx-fg does not mark the last step`);
    if (width === 1400 || width === 390) await (await p.$('#fgCard')).screenshot({ path: `${shots}/x-fgCard-last-${scheme}-${width}.png` });
  }
  await audit('end');
  for (const t of ['t-plan', 't-rcp', 't-more']) { await p.click(`#tabs button[data-t="${t}"]`); await wait(300); await audit(t, t) }
  await p.click('#tabs button[data-t="t-read"]');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file);
  for (const id of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.$eval('#fgCard', e => e.scrollIntoView({ block: 'center' })); await wait(2000);
  const fr = await p.$eval('#fgCard', c => [c.querySelector('.an-play').getAttribute('aria-label'), +c.querySelector('input[type=range]').value]); if (fr[0] !== 'Play' || fr[1] !== 0) problems.push(`reduced motion: fgCard moved by itself (${fr})`);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
