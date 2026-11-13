// The 2026-11-06 layout and motion checks for the GPT-3 page (after Fair Cast's), at 1400 px light, 920 px light and 390 px dark:
// the two 3D stages (#stg-hero, Fig. 1: the eight sizes to scale with zero- and few-shot accuracy; #stg-icl, Fig. 2: in-context against
// fine-tuning on Figure 2.1's task, two modes with their own step lists) each play by themselves once scrolled into view, step to their last
// step, and have exactly one step-list item per step; flows stop drawing off screen; at 1400 px every split shows two columns; no errors,
// NaN, undefined or sideways scroll; under prefers-reduced-motion nothing moves by itself; and the numbers the step lists state match the
// data the stages draw (RC from recompute.py, the token counts of inputs/fig21_tokens.json).
// Writes a mid-step and a last-step screenshot of each stage in each mode.
// usage (from the repo root): node technical_knowledge_base/whats_new/papers/gpt_3/src/check_stages.mjs [shots dir]
import puppeteer from '../../../../../html_utils/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const file = 'file://' + path.resolve(here, '../index.html');
const shots = process.argv[2] || path.resolve(here, '../.shots'); fs.mkdirSync(shots, { recursive: true });
const TOK = JSON.parse(fs.readFileSync(path.resolve(here, 'inputs/fig21_tokens.json'), 'utf8')).map(x => x.n);
const b = await puppeteer.launch({ headless: 'shell' });
const problems = []; let checked = 0;
const wait = ms => new Promise(r => setTimeout(r, ms));
const STAGE_MODES = { 'stg-icl': 'iclM' };
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
      for (let k = 1; k < n; k++) { await clk(`#${id}-f`); await wait(80); if (k === Math.floor(n / 2)) { await wait(2600); await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-mid-${scheme}-${width}.png` }) } }
      await wait(2600);
      const shown = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (shown !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on "${shown}"`);
      const on = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return [...l.children].findIndex(x => x.classList.contains('on')) });
      if (on !== n - 1) problems.push(`${tag}: ${id} list marks item ${on + 1} at the last step`);
      const still = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent)); if (still) problems.push(`${tag}: ${id} still playing after a reader control`);
      await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-last-${scheme}-${width}.png` });
      if (STAGE_MODES[id]) for (const m of await p.$$eval(`#${STAGE_MODES[id]} button`, bs => bs.map(b => b.dataset.m))) {
        const f0 = await p.$eval('#' + id, e => +e.dataset.frames || 0);
        await clk(`#${STAGE_MODES[id]} button[data-m=${m}]`); await wait(2600);
        const f1m = await p.$eval('#' + id, e => +e.dataset.frames || 0), plm = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent));
        if (!(f1m > f0) || !plm) problems.push(`${tag}: ${id} did not replay after switching to ${m}`);
        const nm = await p.$eval(`#${id}-r`, e => +e.max + 1), lm = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelectorAll('ol.sx:not([hidden])'); return [l.length, l[0] ? l[0].children.length : 0, l[0] ? l[0].id : ''] });
        if (lm[0] !== 1 || lm[1] !== nm) problems.push(`${tag}: ${id} ${m}: ${lm[0]} visible lists, ${lm[1]} items for ${nm} steps (${lm[2]})`);
        if (lm[2] !== 'sx-icl-' + m) problems.push(`${tag}: ${id} ${m}: the visible list is ${lm[2]}`);
        for (let k = 1; k < nm; k++) { await clk(`#${id}-f`); await wait(60); if (k === Math.floor(nm / 2)) { await wait(2400); await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-${m}-mid-${scheme}-${width}.png` }) } }
        await wait(2400); const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${nm} of ${nm}`) problems.push(`${tag}: ${id} ${m} ended on "${sh}"`);
        await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-${m}-last-${scheme}-${width}.png` });
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
  await p.$eval('#tabs button[data-t=t-read]', e => e.click()); await wait(300);
  for (const id of await p.$$eval('#t-read .stg', xs => xs.map(x => x.id))) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800); const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0);
    const f = await p.$eval('#' + id, e => +e.dataset.frames || 0), pl = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent));
    if (f > 0 || pl || d1 !== d0) problems.push(`reduced motion: ${id} moved by itself (frames ${f}, redraws ${d1 - d0})`) }
  await p.close() }
{ // the numbers the step lists state are the ones the stages draw
  const p = await b.newPage(); await p.goto(file); await wait(800);
  const r = await p.evaluate(TOK => {
    const bad = []; let n = 0; const RC = window.PAPER.rc, f1 = v => v.toFixed(1), fm = v => v.toLocaleString('en-GB');
    const L = id => [...document.getElementById(id).children].map(li => li.textContent);
    const has = (id, i, s) => { n++; const l = L(id); if (!l[i] || !l[i].includes(s)) bad.push(id + ' step ' + (i + 1) + ': expected "' + s + '"') };
    const M = RC.params, A = RC.agg, G = RC.agg_gap, last = M.length - 1;
    has('sx-hero', 0, M[0].L + ' for the 125M model, ' + M[last].L + ' for 175B'); has('sx-hero', 0, fm(M[0].d) + ' to ' + fm(M[last].d));
    has('sx-hero', 1, M[0].L + ' layers of ' + fm(M[0].d) + ' to ' + M[6].L + ' layers of ' + fm(M[6].d)); has('sx-hero', 1, M[last].L + ' layers of ' + fm(M[last].d));
    has('sx-hero', 1, 'about ' + Math.round(RC.nparams[last] / RC.nparams[6]) + ' times');
    has('sx-hero', 2, f1(A.z[0]) + '% at 125M'); has('sx-hero', 2, f1(A.z[last]) + '% at 175B');
    has('sx-hero', 3, f1(A.f[0]) + '% at 125M'); has('sx-hero', 3, f1(A.f[last]) + '% at 175B');
    has('sx-hero', 4, G.slice(0, -1).map(f1).join(', ') + ' and ' + f1(G[last]) + ' points');
    // Fig. 1's gaps are the ones the curve's caption and the Run tab quote
    for (const id of ['fig13', 't-run']) { n++; if (!document.getElementById(id).textContent.includes(G.slice(0, -1).map(f1).join(', ') + ' and ' + f1(G[last]))) bad.push(id + ' does not quote the same gaps') }
    // Fig. 2: token counts from count_tokens.py
    const S = window.GPT3_ICL.SEG; n++; if (S.map(s => s.n).join() !== TOK.slice(0, 5).join() || window.GPT3_ICL.ANS !== TOK[5]) bad.push('scene token counts differ from fig21_tokens.json');
    has('sx-icl-icl', 1, TOK[0] + ' tokens'); has('sx-icl-icl', 2, TOK[1] + ' tokens'); has('sx-icl-icl', 3, TOK[2] + ' tokens');
    has('sx-icl-icl', 4, (TOK[0] + TOK[1] + TOK[2] + TOK[3]) + ' tokens'); has('sx-icl-icl', 5, TOK[4] + ' tokens');
    const used = TOK.slice(0, 5).reduce((a, b) => a + b, 0); has('sx-icl-icl', 5, used + ' of the 2,048 slots'); has('sx-icl-icl', 5, 'about ' + Math.round(100 * used / 2048) + '%');
    has('sx-icl-icl', 6, TOK[5] + ' tokens'); has('sx-icl-ft', 6, TOK[4] + ' tokens');
    n++; if (window.GPT3_ICL.COLS * window.GPT3_ICL.ROWS !== 2048) bad.push('the tray is not 2,048 slots');
    return { bad, n } }, TOK);
  r.bad.forEach(x => problems.push('step list number: ' + x)); console.log('step-list numbers checked', r.n);
  await p.close() }
await b.close();
console.log('stages checked', checked, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
