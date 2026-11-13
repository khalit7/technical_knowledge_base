// The 2026-11-06 layout and motion checks for the LLM Modules page, at 1400 px light, 920 px light and 390 px dark:
// the two 3D stages (#stg-arch, Fig. 1, the CombinedModel as model.py builds it; #stg-leak, Fig. 2, the trained toy's cross-attention as released
// and with a causal mask, two step lists) each play by themselves once scrolled into view, step to their last step, and have exactly one
// step-list item per step in every mode; flows stop drawing off screen; at 1400 px every split shows two columns; no errors, NaN, undefined or
// sideways scroll; under prefers-reduced-motion nothing moves by itself; and the numbers and tokens the step lists state match the data the
// stages draw (PAPER.rc for Fig. 1; the toy's forward pass, LM and LEAK, and the toy summary TOY for Fig. 2).
// Writes a mid-step screenshot of each stage in each mode.
// usage (from the repo root): node technical_knowledge_base/whats_new/papers/llm_modules/src/check_stages.mjs [shots dir]
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
const ANIMS = {};
const STAGE_MODES = { 'stg-leak': 'lkM' }; // the mode toggle swaps the stage's step list and replays it
const COUNTERS = { 'stg-leak': ['lkCnt', /Probability of the right token/i] };
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
    // the split: two columns side by side at 1100 px and wider, stacked below
    const splits = await p.$$eval(`#${t} .s3sp`, ss => ss.map(s => { const L = s.querySelector(':scope > .s3L'), R = s.querySelector(':scope > .s3R'); if (!L || !R) return 'missing column';
      const a = L.getBoundingClientRect(), r = R.getBoundingClientRect(); return { side: r.left >= a.right - 1 && r.width > 200 && a.width > 200 } }));
    splits.forEach((s, i) => { if (s === 'missing column') problems.push(`${tag} ${t}: split ${i + 1} lacks a column`); else if (width >= 1100 && !s.side) problems.push(`${tag} ${t}: split ${i + 1} is not two columns`) });
    // 3D stages
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
      for (let k = 1; k < n; k++) { await clk(`#${id}-f`); await wait(80); if (k === Math.floor(n / 2)) { await wait(1700); await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-mid-${scheme}-${width}.png` }) } }
      await wait(1700);
      const shown = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (shown !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on "${shown}"`);
      const on = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return [...l.children].findIndex(x => x.classList.contains('on')) });
      if (on !== n - 1) problems.push(`${tag}: ${id} list marks item ${on + 1} at the last step`);
      const still = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent)); if (still) problems.push(`${tag}: ${id} still playing after a reader control`);
      if (COUNTERS[id]) { const cnt = await p.$eval('#' + COUNTERS[id][0], e => e.innerText); if (!COUNTERS[id][1].test(cnt)) problems.push(`${tag}: ${id}: counters missing`) }
      if (STAGE_MODES[id]) for (const m of await p.$$eval(`#${STAGE_MODES[id]} button`, bs => bs.map(b => b.dataset.m))) {
        const f0 = await p.$eval('#' + id, e => +e.dataset.frames || 0);
        await clk(`#${STAGE_MODES[id]} button[data-m=${m}]`); await wait(2600);
        const f1m = await p.$eval('#' + id, e => +e.dataset.frames || 0), plm = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent));
        if (!(f1m > f0) || !plm) problems.push(`${tag}: ${id} did not replay after switching to ${m}`);
        const nm = await p.$eval(`#${id}-r`, e => +e.max + 1), lm = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelectorAll('ol.sx:not([hidden])'); return [l.length, l[0] ? l[0].children.length : 0, l[0] ? l[0].id : ''] });
        if (lm[0] !== 1 || lm[1] !== nm) problems.push(`${tag}: ${id} ${m}: ${lm[0]} visible lists, ${lm[1]} items for ${nm} steps (${lm[2]})`);
        for (let k = 1; k < nm; k++) { await clk(`#${id}-f`); await wait(60); if (k === Math.floor(nm / 2)) { await wait(2100); await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-${m}-mid-${scheme}-${width}.png` }) } }
        await wait(2100); const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${nm} of ${nm}`) problems.push(`${tag}: ${id} ${m} ended on "${sh}"`);
        if (COUNTERS[id]) { const cnt = await p.$eval('#' + COUNTERS[id][0], e => e.innerText); if (!COUNTERS[id][1].test(cnt)) problems.push(`${tag}: ${id} ${m}: counters missing`) }
      }
    }
    // 2D step animations (makeAnim): each mode
    for (const [id, tab] of Object.entries(ANIMS)) {
      if (tab !== t || !(await p.$('#' + id))) continue;
      checked++;
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      const fr = await p.$eval('#' + id, e => +e.dataset.frames || 0), pl = await p.$eval('#' + id, e => e.hasAttribute('data-playing'));
      if (!(fr > 0) || !pl) problems.push(`${tag}: ${id} did not play when scrolled into view (frames ${fr}, playing ${pl})`);
      const modes0 = await p.$$eval(`#${id}M button`, bs => bs.map(b => b.dataset.m)), modes = modes0.length ? modes0 : [null];
      for (const m of modes) {
        if (m) { await clk(`#${id}M button[data-m=${m}]`); await wait(1200);
        if (!(await p.$eval('#' + id, e => e.hasAttribute('data-playing')))) problems.push(`${tag}: ${id} did not replay after switching to ${m}`); }
        const n = await p.$eval(`#${id}Scrub`, e => +e.max / 100);
        const lis = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return l ? l.children.length : 0 });
        if (lis !== n) problems.push(`${tag}: ${id} ${m} has ${n} steps but ${lis} list items`);
        if (n > 12) problems.push(`${tag}: ${id} ${m} has ${n} steps (a replay over about 12 steps must be grouped into stretches)`);
        for (let k = 0; k < n; k++) { await clk(`#${id}Fwd`); if (k === Math.floor(n / 2) - 1) await (await p.$('#' + id)).screenshot({ path: `${shots}/anim-${id}-${m}-mid-${scheme}-${width}.png` }) }
        if (await p.$eval('#' + id, e => e.hasAttribute('data-playing'))) problems.push(`${tag}: ${id} still playing after the forward button`);
        const on = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return [...l.children].findIndex(x => x.classList.contains('on')) });
        if (on !== n - 1) problems.push(`${tag}: ${id} ${m} list marks item ${on + 1} at the last step`);
        // a click on a list item plays that step once and stops on it
        await p.evaluate(id => document.getElementById(id).closest('.s3sp').querySelector('ol.sx:not([hidden])').children[1].click(), id);
        const pl2 = await p.$eval('#' + id, e => e.hasAttribute('data-playing'));
        await p.waitForFunction(id => !document.getElementById(id).hasAttribute('data-playing'), { timeout: 15000 }, id).catch(() => problems.push(`${tag}: ${id} ${m} list click did not stop`));
        if (!pl2) problems.push(`${tag}: ${id} ${m} list click did not play its step`);
      }
    }
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
  for (const t of ['t-read']) { await p.$eval(`#tabs button[data-t=${t}]`, e => e.click()); await wait(300);
    for (const id of await p.$$eval(`#${t} .stg`, xs => xs.map(x => x.id))) {
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800); const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0);
      const f = await p.$eval('#' + id, e => +e.dataset.frames || 0), pl = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent));
      if (f > 0 || pl || d1 !== d0) problems.push(`reduced motion: ${id} moved by itself (frames ${f}, redraws ${d1 - d0})`) }
    for (const id of Object.keys(ANIMS).filter(a => ANIMS[a] === t)) {
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      const f = await p.$eval('#' + id, e => +e.dataset.frames || 0), pl = await p.$eval('#' + id, e => e.hasAttribute('data-playing'));
      if (f > 0 || pl) problems.push(`reduced motion: ${id} moved by itself (frames ${f})`) } }
  await p.close() }
{ // the numbers and tokens the step lists state are the ones the stages draw
  const p = await b.newPage(); await p.goto(file); await wait(800);
  const r = await p.evaluate(() => {
    const bad = []; let n = 0; const items = id => [...document.getElementById(id).children].map(li => li.textContent);
    const want = (id, i, s) => { n++; const L = items(id); if (!L[i] || !L[i].includes(s)) bad.push(id + ' item ' + (i + 1) + ': expected "' + s + '"') };
    // Fig. 1: every count from recompute.py
    const RC = PAPER.rc, BR = RC.bridge, M = v => (v / 1e6).toLocaleString('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'M';
    want('sx-arch', 0, M(RC.qwen_params) + ' parameters'); want('sx-arch', 1, '(' + M(BR.pre_proj) + ';'); want('sx-arch', 2, M(BR.intermediate) + ';'); want('sx-arch', 2, M(BR.proj) + ';');
    want('sx-arch', 3, M(BR.per_enhanced_layer) + ' per layer'); want('sx-arch', 3, 'cross-attention ' + M(BR.cross_attention)); want('sx-arch', 3, 'adapter ' + M(BR.adapter)); want('sx-arch', 3, 'gate ' + M(BR.gate));
    want('sx-arch', 4, '(' + M(RC.neo_blocks) + ')'); want('sx-arch', 5, '(' + M(RC.new_lm_head) + ','); want('sx-arch', 5, Math.round(100 * RC.head_share_of_trained) + '% of all trained');
    want('sx-arch', 5, Math.round(151646 / 768) + ' times longer'); want('sx-arch', 6, (RC.inference_params / 1e9).toFixed(2) + 'B parameters'); want('sx-arch', 6, RC.inference_vs_qwen.toFixed(2) + ' times');
    want('sx-arch', 6, M(RC.trained_params) + ' of them train'); want('sx-arch', 6, M(BR.total));
    n++; if (items('sx-arch').length !== ARCH.steps) bad.push('Fig. 1: ' + ARCH.steps + ' steps, ' + items('sx-arch').length + ' items');
    // Fig. 2: the rows each step names are those tokens of the trace; the overview claims hold; the generation rates are the toy summary's
    const D = LEAK.pick(), tok = i => LM.vocab[D.full[i]], R = LEAK.ROWS, F = D.F;
    n++; if (!(F[0] === 'sum' && tok(2) === 'sum' && +tok(3) === F[1] && +tok(4) === F[2] && tok(5) === 'T' && +tok(8) === F[2] && tok(9) === '=' && +tok(12) === F[3] && tok(13) === '-' && tok(18) === 'A' && +tok(19) === F[3])) bad.push('Fig. 2: the trace is not laid out as the step list says');
    n++; if (R.join() !== [-1, 2, 3, 5, 8, LM.eqPos, 12, 18, LM.eqPos].join()) bad.push('Fig. 2: rows ' + R.join());
    n++; if (+tok(R[3] + 1) !== F[1] || tok(R[4] + 1) !== '=' || +tok(R[5] + 1) !== F[3] || tok(R[6] + 1) !== '-' || +tok(R[7] + 1) !== F[3]) bad.push('Fig. 2: a step predicts another token than its list says');
    const fut = m => { const W = D.W[m].w; let s = 0; for (let i = 0; i < W.length - 1; i++) for (let j = i + 1; j < W.length; j++) s += W[i][j]; return s / (W.length - 1) };
    n++; if (!(fut('released') > .5)) bad.push('Fig. 2 released: weight right of the diagonal is ' + fut('released').toFixed(2) + ', not most');
    n++; if (fut('causal') > 1e-9) bad.push('Fig. 2 causal: weight right of the diagonal');
    const colTot = j => D.W.released.w.reduce((s, w, i) => s + (i < w.length - 1 ? w[j] : 0), 0), cols = D.full.map((_, j) => [colTot(j), j]).sort((a, b) => b[0] - a[0]).slice(0, 4).map(c => c[1]);
    n++; if (cols.slice(0, 2).sort().join() !== '15,16' || tok(15) !== '=' || +tok(16) !== F[1]) bad.push('Fig. 2 released: the two heaviest columns are not the check line\'s second "=" and the number after it (' + cols.join(',') + ')');
    const out = m => D.GS[m].slice(LM.promptLen - 1, D.GS[m].length - 1).map(i => LM.vocab[i]).join(' ');
    n++; if (D.GR.released !== 5 || LM.vocab[D.GS.released[6]] !== '16' || +tok(16) !== F[1]) bad.push('Fig. 2 released: first departure at row ' + D.GR.released + ', token ' + LM.vocab[D.GS.released[6]]);
    want('sx-lk-released', 8, out('released')); want('sx-lk-causal', 8, out('causal')); n++; if (D.GR.causal !== LM.eqPos) bad.push('Fig. 2 causal: departs from the trace');
    const g = D.G.causal.w[LM.eqPos], w = D.W.causal.w[LM.eqPos]; n++; if (g.some((v, j) => Math.abs(v - w[j]) > 1e-9)) bad.push('Fig. 2 causal: generating changes the weights at "="');
    const gen = v => Math.round(100 * TOY.runs[v].reduce((a, r) => a + r.test.gen_acc, 0) / TOY.runs[v].length) + '%';
    want('sx-lk-released', 8, 'right answer ' + gen('released')); want('sx-lk-causal', 8, 'right answer ' + gen('causal'));
    for (const m of ['released', 'causal']) { n++; if (items('sx-lk-' + m).length !== R.length) bad.push(m + ': ' + R.length + ' steps, ' + items('sx-lk-' + m).length + ' items') }
    return { bad, n } });
  r.bad.forEach(x => problems.push('step list number: ' + x)); console.log('step-list numbers checked', r.n);
  await p.close() }
await b.close();
console.log('stages and animations checked', checked, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
