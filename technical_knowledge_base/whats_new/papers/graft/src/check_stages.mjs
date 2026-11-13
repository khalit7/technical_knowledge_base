// The 2026-11-06 layout and motion checks for the GRAFT page (after Fair Cast's), at 1400 px light, 920 px light and 390 px dark:
// the three 3D stages (#stg-hero, Fig. 1: one RL step under GRAFT; #stg-base, Fig. 2: the routed baseline on one group of the toy;
// #stg-toy, Fig. 3: the toy's two adapters over the default run) each play by themselves once scrolled into view, step to their last
// step, and have exactly one step-list item per step; flows stop drawing off screen; at 1400 px every split shows two columns; no errors,
// NaN, undefined or sideways scroll; under prefers-reduced-motion nothing moves by itself; the step-through widget on Train the toy draws
// nothing by itself; and every number the three step lists state matches the data the stages draw (the page's figure data and the toy).
// Writes a mid-step and a last-step screenshot of each stage.
// usage (from the repo root): node technical_knowledge_base/whats_new/papers/graft/src/check_stages.mjs [shots dir]
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
const STAGE_MODES = {};
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
    // the one-run step-through on Train the toy is a widget: its step slider stays where the reader left it
    if (t === 't-toy') { const v0 = await p.$eval('#gfStep', e => e.value); await p.$eval('#gfRun', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      if ((await p.$eval('#gfStep', e => e.value)) !== v0) problems.push(`${tag}: the step-through widget moved by itself`) }
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
  for (const t of ['t-read', 't-toy']) { await p.$eval(`#tabs button[data-t=${t}]`, e => e.click()); await wait(300);
    for (const id of await p.$$eval(`#${t} .stg`, xs => xs.map(x => x.id))) {
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800); const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0);
      const f = await p.$eval('#' + id, e => +e.dataset.frames || 0), pl = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent));
      if (f > 0 || pl || d1 !== d0) problems.push(`reduced motion: ${id} moved by itself (frames ${f}, redraws ${d1 - d0})`) } }
  await p.close() }
{ // every number the three step lists state is the one the stages draw
  const p = await b.newPage(); await p.goto(file); await wait(800);
  const r = await p.evaluate(() => {
    const bad = []; let n = 0; const items = id => [...document.getElementById(id).children].map(li => li.textContent.replace(/\s+/g, ' '));
    const has = (L, i, s, id) => { n++; if (!L[i].includes(s)) bad.push(id + ' step ' + (i + 1) + ': expected "' + s + '"') };
    const f1 = v => (100 * v).toFixed(1) + '%', sg = v => (v >= 0 ? '+' : '\u2212') + Math.abs(v).toFixed(2);
    // Fig. 1: the two hack rates, from Figure 2's data
    const H = window.GF_HERO, L1 = items('sx-hero');
    has(L1, 4, H.peak.toFixed(1) + '%', 'Fig. 1'); has(L1, 4, 'step ' + H.peakStep, 'Fig. 1'); has(L1, 4, H.dep.toFixed(1) + '%', 'Fig. 1');
    // Fig. 2: the sampled group and its advantages
    const G = TOYREF.stage.group, S = G.samples, L2 = items('sx-base'), cnt = f => S.filter(f).length, W = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
    has(L2, 0, 'step ' + G.step, 'Fig. 2'); has(L2, 0, W[cnt(s => s.t === 0 && s.ok)] + ' right and ' + W[cnt(s => s.t === 0 && !s.ok)] + ' wrong real solution', 'Fig. 2');
    has(L2, 0, W[cnt(s => s.t === 2)] + ' hack 2', 'Fig. 2'); has(L2, 0, W[cnt(s => s.t === 3)] + ' hack 3', 'Fig. 2'); has(L2, 0, W[cnt(s => s.t === 1)] + ' hack 1', 'Fig. 2');
    const nf = cnt(s => s.fl), nu = S.length - nf, cap = w => w[0].toUpperCase() + w.slice(1);
    has(L2, 1, cap(W[nf]) + ' answers are flagged', 'Fig. 2');
    has(L2, 2, G.mean_all.toFixed(2), 'Fig. 2'); has(L2, 2, 'The ' + W[nu] + ' unflagged', 'Fig. 2'); has(L2, 2, 'sum to ' + sg(G.sum_unflagged_all), 'Fig. 2');
    has(L2, 3, W[nu] + ' unflagged rewards, ' + G.mean_unflagged.toFixed(2), 'Fig. 2');
    has(L2, 3, sg(S.find(s => s.r === 1 && !s.fl).a_graft), 'Fig. 2'); has(L2, 3, 'wrong solution ' + sg(S.find(s => s.r === 0).a_graft), 'Fig. 2');
    n++; if (Math.abs(G.sum_unflagged_graft) > 1e-9) bad.push('Fig. 2: GRAFT unflagged sum is ' + G.sum_unflagged_graft); has(L2, 3, 'sum to 0', 'Fig. 2');
    n++; if (new Set(S.filter(s => s.r === 1).map(s => s.a_graft)).size !== 1 || new Set(S.filter(s => s.r === 1).map(s => s.a_all)).size !== 1) bad.push('Fig. 2: reward-1 answers do not share one advantage');
    has(L2, 4, 'The ' + W[cnt(s => s.t === 2)] + ' hack 2 answers', 'Fig. 2');
    // Fig. 3: the toy's adapters at the ends of the stretches
    const T = TOYREF.stage.traj, at = t => T.find(x => x.t === t), L3 = items('sx-toy'), a0 = at(0), a15 = at(15), a40 = at(40), a300 = at(300);
    n++; if (window.GF_TOY.B.length !== L3.length) bad.push('Fig. 3: ' + window.GF_TOY.B.length + ' stretches, ' + L3.length + ' items');
    a0.pre.forEach(v => has(L3, 0, f1(v), 'Fig. 3'));
    has(L3, 1, f1(a15.pre[1]) + ' hack 1', 'Fig. 3'); has(L3, 1, 'hack-1 logit ' + sg(a15.uF[1]), 'Fig. 3'); has(L3, 1, 'exactly ' + a15.uR[1].toFixed(2), 'Fig. 3');
    n++; if (T.some(x => x.uR[1] !== 0)) bad.push('Fig. 3: the retain adapter\'s hack-1 logit is not exactly 0 throughout');
    has(L3, 1, f1(a15.pre[2]) + ' of answers at step 15', 'Fig. 3'); has(L3, 1, sg(a15.uR[2]), 'Fig. 3');
    has(L3, 2, 'hack 1 at ' + f1(a40.pre[1]), 'Fig. 3'); has(L3, 2, '(' + f1(a40.pre[2]) + ')', 'Fig. 3'); has(L3, 2, sg(a40.uR[2]) + ' at step 40', 'Fig. 3');
    has(L3, 3, f1(a300.pre[1]) + ' hack 1', 'Fig. 3'); has(L3, 3, 'only ' + f1(a300.pre[2]), 'Fig. 3'); has(L3, 3, 'to ' + sg(a300.uR[2]), 'Fig. 3'); has(L3, 3, 'skill logit to ' + sg(a300.uR[4]), 'Fig. 3');
    const d = a300.dep; has(L3, 4, f1(d[0]) + ' real solutions', 'Fig. 3'); has(L3, 4, f1(d[1] + d[2] + d[3]) + ' hacks', 'Fig. 3');
    has(L3, 4, 'hack 2 ' + f1(d[2]), 'Fig. 3'); has(L3, 4, 'hack 3 ' + f1(d[3]), 'Fig. 3'); has(L3, 4, 'hack 1 ' + f1(d[1]), 'Fig. 3');
    n++; if (!(a300.uR[0] < 0)) bad.push('Fig. 3: the text says the retain adapter lowered the real-solution logit');
    // the stage data is the engine's: rerun seed 1 in the page and compare the last step
    const live = TOY.run('graft', { seed: 1 }), h = live.hist[live.hist.length - 1];
    n++; if (h.uR.some((v, i) => Math.abs(v - a300.uR[i]) > 6e-4) || h.uF.some((v, i) => Math.abs(v - a300.uF[i]) > 6e-4)) bad.push('Fig. 3: the live engine disagrees with TOYREF.stage');
    return { bad, n } });
  r.bad.forEach(x => problems.push('step list number: ' + x)); console.log('step-list numbers checked', r.n);
  await p.close() }
await b.close();
console.log('stages checked', checked, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
