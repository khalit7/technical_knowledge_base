// The 2026-11-06 layout and motion checks for the SA-MRPO page (after GRAFT's), at 1400 px light, 920 px light and 390 px dark:
// the two 3D stages (#stg-adv, Stage 1: Figure 1's group through GRPO, GDPO and SA-MRPO, three modes with three step lists;
// #stg-batch, Stage 2: the four steps on one batch of the toy) each play by themselves once scrolled into view, step to their last
// step, and have exactly one step-list item per step; Stage 1 replays after each mode switch; flows stop drawing off screen; at 1400 px
// every split shows two columns; no errors, NaN, undefined or sideways scroll; under prefers-reduced-motion nothing moves by itself; the
// live trainer on Train the toy does not run by itself; and every number the step lists state matches what the stages draw
// (Figure 1's printed rewards recomputed, TOYSTAGE, and the toy engine rerun in the page).
// Writes a mid-step and a last-step screenshot of each stage (and of each Stage 1 mode).
// usage (from the repo root): node technical_knowledge_base/whats_new/papers/learn_whats_left_not_whats_mastered/src/check_stages.mjs [shots dir]
import puppeteer from '../../../../../html_utils/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const file = 'file://' + path.resolve(here, '../index.html');
const shots = process.argv[2] || path.resolve(here, '../.shots'); fs.mkdirSync(shots, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell' });
const problems = []; let checked = 0;
const wait = ms => new Promise(r => setTimeout(r, ms));
const STAGE_MODES = { 'stg-adv': 'advM' };
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await wait(300);
  const tag = `${scheme} ${width}`;
  const clk = sel => p.$eval(sel, e => e.click());
  for (const t of await p.$$eval('#tabs button', bs => bs.map(b => b.dataset.t))) {
    await clk(`#tabs button[data-t=${t}]`); await wait(300);
    const splits = await p.$$eval(`#${t} .s3sp`, ss => ss.map(s => { const L = s.querySelector(':scope > .s3L'), R = s.querySelector(':scope > .s3R'); if (!L || !R) return 'missing column';
      const a = L.getBoundingClientRect(), r = R.getBoundingClientRect(); return { side: r.left >= a.right - 1 && r.width > 200 && a.width > 200 } }));
    splits.forEach((s, i) => { if (s === 'missing column') problems.push(`${tag} ${t}: split ${i + 1} lacks a column`); else if (width >= 1100 && !s.side) problems.push(`${tag} ${t}: split ${i + 1} is not two columns`) });
    for (const id of await p.$$eval(`#${t} .stg`, xs => xs.map(x => x.id))) {
      checked++;
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2200);
      const f1 = await p.$eval('#' + id, e => +e.dataset.frames || 0);
      if (!(f1 > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
      const playing = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent)); if (!playing) problems.push(`${tag}: ${id} is not playing after scrolling into view`);
      const n = await p.$eval(`#${id}-r`, e => +e.max + 1);
      const lis = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return l ? l.children.length : 0 });
      if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but ${lis} list items`);
      // flows stop drawing off screen
      await p.evaluate(() => window.scrollTo(0, 0)); await wait(400);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800);
      const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0); if (d1 !== d0) problems.push(`${tag}: ${id} kept drawing off screen (${d1 - d0})`);
      // a reader control stops autoplay for good; step to the last step through the forward button, with a middle screenshot
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(200);
      await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
      for (let k = 1; k < n; k++) { await clk(`#${id}-f`); await wait(80); if (k === Math.floor(n / 2)) { await wait(3600); await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-mid-${scheme}-${width}.png` }) } }
      await wait(3600);
      const shown = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (shown !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on "${shown}"`);
      const on = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return [...l.children].findIndex(x => x.classList.contains('on')) });
      if (on !== n - 1) problems.push(`${tag}: ${id} list marks item ${on + 1} at the last step`);
      const still = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent)); if (still) problems.push(`${tag}: ${id} still playing after a reader control`);
      if (width === 1400) await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-last-${scheme}-${width}.png` });
      if (STAGE_MODES[id]) for (const m of await p.$$eval(`#${STAGE_MODES[id]} button`, bs => bs.map(b => b.dataset.m))) {
        const f0 = await p.$eval('#' + id, e => +e.dataset.frames || 0);
        await clk(`#${STAGE_MODES[id]} button[data-m=${m}]`); await wait(2600);
        const f1m = await p.$eval('#' + id, e => +e.dataset.frames || 0), plm = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent));
        if (!(f1m > f0) || !plm) problems.push(`${tag}: ${id} did not replay after switching to ${m}`);
        const nm = await p.$eval(`#${id}-r`, e => +e.max + 1), lm = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelectorAll('ol.sx:not([hidden])'); return [l.length, l[0] ? l[0].children.length : 0, l[0] ? l[0].id : ''] });
        if (lm[0] !== 1 || lm[1] !== nm) problems.push(`${tag}: ${id} ${m}: ${lm[0]} visible lists, ${lm[1]} items for ${nm} steps (${lm[2]})`);
        for (let k = 1; k < nm; k++) { await clk(`#${id}-f`); await wait(60); if (k === Math.floor(nm / 2)) { await wait(2100); await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-${m}-mid-${scheme}-${width}.png` }) } }
        await wait(2100); const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${nm} of ${nm}`) problems.push(`${tag}: ${id} ${m} ended on "${sh}"`);
        if (width === 1400) await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-${m}-last-${scheme}-${width}.png` });
      }
    }
    // the live trainer on Train the toy is a widget: it trains only when the reader presses its button
    if (t === 't-run') { const v0 = await p.$eval('#runOut', e => e.innerText); await p.$eval('#runLive', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      if ((await p.$eval('#runOut', e => e.innerText)) !== v0) problems.push(`${tag}: the live trainer ran by itself`) }
    const r = await p.evaluate(t => { const el = document.getElementById(t); const txt = el.innerText;
      return { bad: (txt.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth } }, t);
    if (r.bad.length) problems.push(`${tag} ${t}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${t}: sideways scroll`);
  }
  const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) problems.push(`${tag}: error box: ${box}`);
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file);
  for (const t of ['t-read', 't-run']) { await p.$eval(`#tabs button[data-t=${t}]`, e => e.click()); await wait(300);
    for (const id of await p.$$eval(`#${t} .stg`, xs => xs.map(x => x.id))) {
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800); const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0);
      const f = await p.$eval('#' + id, e => +e.dataset.frames || 0), pl = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent));
      if (f > 0 || pl || d1 !== d0) problems.push(`reduced motion: ${id} moved by itself (frames ${f}, redraws ${d1 - d0})`) } }
  await p.close() }
{ // every number the step lists state is the one the stages draw
  const p = await b.newPage(); await p.goto(file); await wait(800);
  const r = await p.evaluate(() => {
    const bad = []; let n = 0; const items = id => [...document.getElementById(id).children].map(li => li.textContent.replace(/\s+/g, ' '));
    const has = (L, i, s, id) => { n++; if (!L[i] || !L[i].includes(s)) bad.push(id + ' step ' + (i + 1) + ': expected "' + s + '"') };
    const M = '\u2212', sg = v => (v >= 0 ? '+' : M) + Math.abs(v).toFixed(2), f2 = v => (v < 0 ? M : '') + Math.abs(v).toFixed(2);
    // Stage 1: Figure 1's group (F1, recomputed in the page)
    const G = items('sx-grpo'), D = items('sx-gdpo'), A = items('sx-sa'), sum = F1.f.map((v, j) => v + F1.c[j]);
    const mu = sum.reduce((a, b) => a + b) / 4, sd = Math.sqrt(sum.reduce((a, b) => a + (b - mu) ** 2, 0) / 4);
    has(G, 1, 'both sum to ' + sum[1], 'GRPO'); n++; if (sum[1] !== sum[2]) bad.push('GRPO: answers 2 and 3 do not tie');
    has(G, 2, 'group mean (' + mu + ')', 'GRPO'); has(G, 2, 'deviation (' + sd.toFixed(2) + ')', 'GRPO');
    has(D, 1, '(100) gets ' + sg(F1.Af[2]), 'GDPO'); has(D, 1, '(97) gets ' + f2(F1.Af[0]), 'GDPO');
    has(D, 2, F1.Ac.map(f2).join(', ').replace(/^(.*), (.*)$/, '$1, ') , 'GDPO'); has(D, 2, sg(F1.Ac[3]), 'GDPO');
    const gd = F1.Af.map((x, j) => x + F1.Ac[j]); n++; if (!(gd[2] > gd[1])) bad.push('GDPO: answer 3 does not rank above answer 2');
    has(A, 2, 's = ' + F1.s[0].toFixed(2), 'SA'); has(A, 2, 's = ' + F1.s[1].toFixed(2), 'SA');
    has(A, 3, (1 - F1.s[0]).toFixed(2), 'SA'); has(A, 3, (1 - F1.s[1]).toFixed(2), 'SA');
    for (const g of [0.25, 0.5, 1]) { const a = saAdv(g, false); n++; if (!(a[2] < 0)) bad.push('SA: answer 3 not negative at gamma ' + g); n++; if (a.indexOf(Math.max(...a)) !== 3) bad.push('SA: answer 4 not largest at gamma ' + g) }
    // Stage 2: the toy batch (TOYSTAGE) against the step list
    const T = TOYSTAGE, L = items('sx-batch'), intro = document.querySelector('#s-meth > p').textContent.replace(/\s+/g, ' ');
    const chk = (s, w) => { n++; if (!intro.includes(s)) bad.push('method intro: expected "' + s + '"') };
    chk('γ = ' + T.gamma); chk('seed ' + T.seed); chk('step ' + T.step); chk(T.B + ' questions × ' + T.G + ' answers');
    has(L, 2, 'correctness s = ' + T.s[0].toFixed(2), 'Stage 2'); has(L, 2, 'length s = ' + T.s[1].toFixed(2), 'Stage 2'); has(L, 2, 'all ' + T.B * T.G, 'Stage 2');
    has(L, 3, T.w[0].toFixed(2) + ' for correctness', 'Stage 2'); has(L, 3, T.w[1].toFixed(2) + ' for length', 'Stage 2');
    has(L, 3, 'read ' + T.s_step1[0].toFixed(2) + ' and ' + T.s_step1[1].toFixed(2), 'Stage 2'); has(L, 3, 'weights ' + T.w_step1[0].toFixed(2) + ' and ' + T.w_step1[1].toFixed(2), 'Stage 2');
    n++; if (!(T.w[1] / T.w[0] < 1 / 3)) bad.push('Stage 2: length weight is not under a third of correctness\'s');
    const gi = T.groups.findIndex(g => g.kind === 'cl'), g2 = T.groups[gi], j = g2.al.indexOf(Math.min(...g2.al));
    n++; if (gi !== 1 || g2.rc[j] !== 1 || g2.al.filter(v => v > 0).length !== 7) bad.push('Stage 2: group 2 is not "one correct answer that ran long among seven short ones"');
    has(L, 4, 'ends at ' + sg(g2.sa[j]), 'Stage 2'); has(L, 4, 'gives it ' + sg(g2.gdpo[j]), 'Stage 2');
    has(L, 4, (100 * T.shareL_gdpo).toFixed(1) + '% under GDPO', 'Stage 2'); has(L, 4, 'to ' + (100 * T.shareL).toFixed(1) + '%', 'Stage 2');
    n++; if (T.groups.map(g => g.kind).join(',') !== 'c,cl,l,') bad.push('Stage 2: the four groups are not the four kinds in order');
    n++; if (!(T.groups[2].ac.every(v => v === 0) && T.groups[3].ac.every(v => v === 0) && T.groups[3].al.every(v => v === 0))) bad.push('Stage 2: the silent rows are not silent');
    // the stage data is the engine's: rerun the same run in the page up to step 80 and compare the batch
    let B = null; TOY.train({ setting: T.setting, method: T.method, seed: T.seed, steps: T.step, onBatch: (t, b) => { if (t === T.step) B = b } });
    n++; if (Math.abs(B.ad.s[0] - T.s[0]) > 6e-5 || Math.abs(B.ad.s[1] - T.s[1]) > 6e-5) bad.push('Stage 2: the live engine\'s saturations differ from TOYSTAGE');
    n++; if (T.groups.some(g => g.sa.some((v, k) => Math.abs(v - B.ad.A[g.i][k]) > 6e-5))) bad.push('Stage 2: the live engine\'s advantages differ from TOYSTAGE');
    return { bad, n } });
  r.bad.forEach(x => problems.push('step list number: ' + x)); console.log('step-list numbers checked', r.n);
  await p.close() }
await b.close();
console.log('stages checked', checked, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
