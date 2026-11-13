// The 2026-11-06 layout and motion checks for the Switch Transformers page (after Mixtral's), at 1400 px light, 920 px light and 390 px dark:
// the two 3D stages (#stg-cap: one held-out batch of the toy Switch layer buffered at several capacity factors; #stg-par: the paper's Figure 9
// redrawn on 16 cores) and the two 2D animations (#rta: top-1 against top-2 on 12 tokens, a step list per router; #thn: Then and now) play by
// themselves once scrolled into view, step to their last step, and have exactly one step-list item per step in every mode; the stages' flows stop
// drawing off screen; a reader control stops autoplay; at 1400 px every split shows two columns; no errors, NaN, undefined or sideways scroll; under
// prefers-reduced-motion nothing moves by itself; and the numbers the step lists state match the page's data (CAP from mk_cap_data.cjs, the
// Figure 9 counts recomputed with the old card's formulas). Writes a mid-step and a last-step screenshot of each stage and animation.
// usage (from the repo root): node technical_knowledge_base/whats_new/papers/switch_transformers/src/check_stages.mjs [shots dir]
import puppeteer from '../../../../../html_utils/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const file = 'file://' + path.resolve(here, '../index.html');
const shots = process.argv[2] || path.resolve(here, '../.shots'); fs.mkdirSync(shots, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const problems = []; let checked = 0;
const wait = ms => new Promise(r => setTimeout(r, ms));
const TWEEN = { 'stg-cap': 1700, 'stg-par': 1500 };
const ANIMS = { rta: ['t-read', { sw: 'sx-rta-sw', moe: 'sx-rta-moe' }], thn: ['t-then', { t: 'sx-thn' }] };
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await wait(300);
  const tag = `${scheme} ${width}`;
  const clk = sel => p.$eval(sel, e => e.click());
  const visList = id => p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelectorAll('ol.sx:not([hidden])'); return [l.length, l[0] ? l[0].children.length : 0, l[0] ? l[0].id : '', l[0] ? [...l[0].children].findIndex(x => x.classList.contains('on')) : -1] });
  for (const t of await p.$$eval('#tabs button', bs => bs.map(b => b.dataset.t))) {
    await clk(`#tabs button[data-t=${t}]`); await wait(300);
    const splits = await p.$$eval(`#${t} .s3sp`, ss => ss.map(s => { const L = s.querySelector(':scope > .s3L'), R = s.querySelector(':scope > .s3R'); if (!L || !R) return 'missing column';
      const a = L.getBoundingClientRect(), r = R.getBoundingClientRect(); return { side: r.left >= a.right - 1 && r.width > 200 && a.width > 200 } }));
    splits.forEach((s, i) => { if (s === 'missing column') problems.push(`${tag} ${t}: split ${i + 1} lacks a column`); else if (width >= 1100 && !s.side) problems.push(`${tag} ${t}: split ${i + 1} is not two columns`) });
    for (const id of await p.$$eval(`#${t} .stg`, xs => xs.map(x => x.id))) {
      checked++;
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2200);
      if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
      if (!(await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent)))) problems.push(`${tag}: ${id} is not playing after scrolling into view`);
      const n = await p.$eval(`#${id}-r`, e => +e.max + 1);
      const [nl, lis] = await visList(id);
      if (nl !== 1 || lis !== n) problems.push(`${tag}: ${id} has ${n} steps but ${nl} visible lists with ${lis} items`);
      // flows stop drawing off screen
      await p.evaluate(() => window.scrollTo(0, 0)); await wait(500);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800);
      const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0); if (d1 !== d0) problems.push(`${tag}: ${id} kept drawing off screen (${d1 - d0})`);
      // a reader control stops autoplay for good; step to the last step through the forward button
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(200);
      await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
      for (let k = 1; k < n; k++) { await clk(`#${id}-f`); await wait(80); if (k === 3) { await wait(TWEEN[id] / 2); await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-mid-${scheme}-${width}.png` }) } }
      await wait(TWEEN[id]);
      const shown = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (shown !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on "${shown}"`);
      const [, , , on] = await visList(id); if (on !== n - 1) problems.push(`${tag}: ${id} list marks item ${on + 1} at the last step`);
      if (width === 1400 || width === 390) await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-last-${scheme}-${width}.png` });
      if (await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent))) problems.push(`${tag}: ${id} still playing after a reader control`);
    }
    for (const [id, [tab, lists]] of Object.entries(ANIMS)) {
      if (tab !== t) continue; checked++;
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2000);
      if (!(await p.$eval('#' + id, e => +e.dataset.frames || 0)) || !(await p.$eval(`#${id}Play`, e => /Pause/.test(e.textContent)))) problems.push(`${tag}: ${id} did not play when scrolled into view`);
      if (!(await p.$eval('#' + id, e => e.dataset.playing === '1'))) problems.push(`${tag}: ${id} does not mark data-playing while it plays`);
      for (const m of Object.keys(lists)) {
        if (await p.$(`#${id}M`)) await clk(`#${id}M button[data-m=${m}]`); await wait(200);
        const n = await p.$eval(`#${id}Scrub`, e => e.max / 100);
        const L = await p.$$eval('ol.sx:not([hidden])', (ls, want) => ls.filter(l => l.id === want).map(l => l.children.length), lists[m]);
        if (L.length !== 1 || L[0] !== n) problems.push(`${tag}: ${id} ${m}: ${n} steps, list ${lists[m]} visible ${L.length} with ${L[0]} items`);
        const others = await p.$$eval('ol.sx:not([hidden])', (ls, ids) => ls.filter(l => ids.includes(l.id)).length, Object.values(lists));
        if (others !== 1) problems.push(`${tag}: ${id} ${m}: ${others} of its lists visible`);
        await p.evaluate(id => { const e = document.getElementById(id + 'Scrub'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
        for (let k = 1; k < n; k++) { await clk(`#${id}Fwd`); if (k === Math.floor(n / 2) && (width === 1400 || width === 390)) await (await p.$('#' + id)).screenshot({ path: `${shots}/anim-${id}-${m}-mid-${scheme}-${width}.png` }) }
        const on = await p.$eval('#' + lists[m], l => [...l.children].findIndex(x => x.classList.contains('on'))); if (on !== n - 1) problems.push(`${tag}: ${id} ${m} list marks item ${on + 1} at the last step`);
        if (await p.$eval(`#${id}Play`, e => /Pause/.test(e.textContent))) problems.push(`${tag}: ${id} still playing after a reader control`);
      }
    }
    const r = await p.evaluate(t => { const txt = document.getElementById(t).innerText;
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
  for (const [id, tab] of [['stg-cap', 't-read'], ['stg-par', 't-read'], ['rta', 't-read'], ['thn', 't-then']]) {
    await p.$eval(`#tabs button[data-t=${tab}]`, e => e.click()); await wait(300);
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const stg = await p.$eval('#' + id, e => e.classList.contains('stg'));
    const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800); const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0);
    const f = await p.$eval('#' + id, e => +e.dataset.frames || 0), pl = await p.$eval(stg ? `#${id}-p` : `#${id}Play`, e => /Pause/.test(e.textContent));
    if (f > 0 || pl || d1 !== d0) problems.push(`reduced motion: ${id} moved by itself (frames ${f}, redraws ${d1 - d0})`) }
  await p.close() }
{ // the numbers the step lists state are the page's data
  const p = await b.newPage(); await p.goto(file); await wait(800);
  const r = await p.evaluate(() => {
    const bad = []; let n = 0;
    const has = (list, k, s) => { n++; const li = document.getElementById(list).children[k]; if (!li || !li.textContent.includes(s)) bad.push(`${list} item ${k + 1} lacks "${s}"`) };
    const pc = (a, b) => (100 * a / b).toFixed(1) + '%', f = v => v.toLocaleString('en-GB');
    // the capacity stage: CAP (the toy layer's recorded routing of one held-out batch)
    const K1 = CAP.runs.k1, K2 = CAP.runs.k2, T = CAP.cfg.T, N = K1.first.length;
    n++; if (T !== 512 || N !== 16 || CAP.cfg.k !== 1 || CAP.cfg.alpha !== 0.01 || CAP.cfg.cf !== 1.25 || CAP.steps !== 1500 || CAP.cfg.seed !== 1) bad.push('CAP settings differ from the text');
    has('sx-cap', 0, `${T} tokens to one of ${N} experts`); has('sx-cap', 0, `would be ${T / N} each`); has('sx-cap', 0, `gives ${Math.min(...K1.first)} to ${Math.max(...K1.first)}`);
    [[1, 1], [2, 1.25], [3, 2]].forEach(([k, cf]) => { const A = K1.at[cf]; has('sx-cap', k, `${A.C} slots`); has('sx-cap', k, `${A.dropped1}`); has('sx-cap', k, `(${pc(A.dropped1, T)})`); has('sx-cap', k, `${A.pad} of ${f(A.slots)}`) });
    has('sx-cap', 1, `${K1.at[1].dropped1} of ${T} tokens`);
    { const A = K2.at[1.25]; has('sx-cap', 4, `${f(K2.demand.reduce((a, b) => a + b, 0))} assignments`); has('sx-cap', 4, `${A.C} slots, ${f(A.slots)} in all`); has('sx-cap', 4, `twice top-1's ${K1.at[1.25].slots}`);
      n++; if (A.dropped1 !== 0) bad.push('top-2 drops a first choice at 1.25'); has('sx-cap', 4, `${A.dropped2} second choices`) }
    CAP.cfs.forEach(cf => { const A = K1.at[cf]; has('sx-cap', 5, `${A.dropped1} and ${A.pad} at ${cf.toFixed(cf === 1.25 ? 2 : 1)}`) });
    has('sx-cap', 5, `from ${K1.at[0.5].mse.toFixed(2)} to ${K1.at[2].mse.toFixed(2)}`); has('sx-cap', 5, `scores ${SWEEP.groups.experts[0].id.toFixed(2)}`);
    { const L = document.querySelector('#sx-cap').nextElementSibling.textContent; n++; const want = [1, 1.25, 2].map(cf => (100 * K1.at[cf].heldout_drop).toFixed(1) + '%');
      if (!L.includes(want[0] + ', ' + want[1] + ' and ' + want[2])) bad.push('held-out drop rates under the capacity list are not ' + want.join(', ')) }
    // the Figure 9 stage: the old card's counters, recomputed
    const B = 2 ** 20, d = 768, ff = 3072, S = window.__parScene.S, M = v => (v / 1e6).toFixed(2) + 'M';
    S.forEach((st, k) => { const tok = B / st.n, w = 2 * d * ff / st.m; has('sx-par', k, f(tok) + ' tokens'); has('sx-par', k, M(w) + ' weights') });
    has('sx-par', 1, fmtBytes(B * d * 2) + ' sent per core'); has('sx-par', 2, fmtBytes(B / 4 * d * 2) + ' per core'); has('sx-par', 3, fmtBytes(2 * B / 16 * d * 2) + ' per core');
    has('sx-par', 3, (2 * d * ff * 16 / 1e6).toFixed(1) + 'M distinct'); has('sx-par', 4, fmtBytes(2 * B / 4 * d * 2 + B / 4 * d * 2) + ' per core');
    { const L = document.querySelector('#sx-par').nextElementSibling.textContent; n++; if (!L.includes((4 * d * ff / 1e6).toFixed(2) + 'M')) bad.push('FLOPs per token under the Figure 9 list') }
    return { bad, n } });
  r.bad.forEach(x => problems.push('numbers: ' + x)); console.log('step-list numbers checked', r.n);
  await p.close() }
await b.close();
console.log('stages and animations checked', checked, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
