// The 2026-11-06 layout and motion checks for the FlashAttention page (after Fair Cast's), at 1400 px light, 920 px light and 390 px dark:
// the two 3D stages (#stg-hero, Fig. 1: where attention's bytes go, with Figure 2's numbers; #stg-kx, Fig. 2: one forward pass of the toy run
// three ways, driven by the page's simulator) each play by themselves once scrolled into view, step to their last step, and have exactly one
// step-list item per step (Fig. 2 has a list per mode, plus one for standard attention with masking and dropout); flows stop drawing off screen;
// at 1400 px every split shows two columns; no errors, NaN, undefined or sideways scroll; under prefers-reduced-motion nothing moves by itself;
// and the numbers the step lists and the block-size table state match the simulator (FA.simulate) and the paper's Figure 2 table (PAPER.tables.f2).
// Writes a mid-step and a last-step screenshot of each stage (each mode of Fig. 2).
// usage (from the repo root): node technical_knowledge_base/whats_new/papers/flashattention/src/check_stages.mjs [shots dir]
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
const STAGE_MODES = { 'stg-kx': 'kxM' };
const TWEEN = { 'stg-hero': 1700, 'stg-kx': 4800 };
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await wait(300);
  const tag = `${scheme} ${width}`;
  const clk = sel => p.$eval(sel, e => e.click());
  const stepThrough = async (id, n, name) => {
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    for (let k = 1; k < n; k++) { await clk(`#${id}-f`); await wait(80); if (k === Math.floor(n / 2)) { await wait(TWEEN[id] / 2); await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${name}-mid-${scheme}-${width}.png` }) } }
    await wait(TWEEN[id]);
    const shown = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (shown !== `step ${n} of ${n}`) problems.push(`${tag}: ${name} ended on "${shown}"`);
    const on = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return [...l.children].findIndex(x => x.classList.contains('on')) });
    if (on !== n - 1) problems.push(`${tag}: ${name} list marks item ${on + 1} at the last step`);
    if (width === 1400 || width === 390) await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${name}-last-${scheme}-${width}.png` });
  };
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
      // flows stop drawing off screen (the end of the tab is far from both stages)
      await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await wait(500);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800);
      const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0); if (d1 !== d0) problems.push(`${tag}: ${id} kept drawing off screen (${d1 - d0})`);
      // a reader control stops autoplay for good; step to the last step through the forward button
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(200);
      await stepThrough(id, n, id);
      const still = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent)); if (still) problems.push(`${tag}: ${id} still playing after a reader control`);
      if (STAGE_MODES[id]) {
        const runs = (await p.$$eval(`#${STAGE_MODES[id]} button`, bs => bs.map(b => b.dataset.m))).map(m => [m, false]).concat([['std', true]]);
        for (const [m, md] of runs) {
          const f0 = await p.$eval('#' + id, e => +e.dataset.frames || 0);
          if (md) { await clk(`#${STAGE_MODES[id]} button[data-m=std]`); await wait(300); await clk('#kxMd') } else await clk(`#${STAGE_MODES[id]} button[data-m=${m}]`);
          await wait(2600);
          const f1m = await p.$eval('#' + id, e => +e.dataset.frames || 0), plm = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent));
          if (!(f1m > f0) || !plm) problems.push(`${tag}: ${id} did not replay after switching to ${m}${md ? ' with masking' : ''}`);
          const want = 'sx-kx-' + (md ? 'stdmd' : m);
          const nm = await p.$eval(`#${id}-r`, e => +e.max + 1), lm = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelectorAll('ol.sx:not([hidden])'); return [l.length, l[0] ? l[0].children.length : 0, l[0] ? l[0].id : ''] });
          if (lm[0] !== 1 || lm[1] !== nm) problems.push(`${tag}: ${id} ${want}: ${lm[0]} visible lists, ${lm[1]} items for ${nm} steps`);
          if (lm[2] !== want) problems.push(`${tag}: ${id}: the visible list is ${lm[2]}, not ${want}`);
          await stepThrough(id, nm, id + '-' + (md ? 'stdmd' : m));
          if (md) await clk('#kxMd');
        }
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
{ // the numbers the step lists and the table state are the simulator's and the paper's
  const p = await b.newPage(); await p.goto(file); await wait(800);
  const r = await p.evaluate(() => {
    const bad = []; let n = 0; const N = 32, d = 4, B = 8, T = N / B, seed = 7;
    const tot = s => s.rd + s.wr, f = v => v.toLocaleString('en-GB');
    const lastNum = s => { const m = [...s.matchAll(/(?:[Ss]o far|Whole run):? ([\d,]+)/g)]; return m.length ? m[m.length - 1][1] : null };
    for (const [list, mode, md] of [['std', 'std', false], ['stdmd', 'std', true], ['fa', 'fa', false], ['fa2', 'fa2', false]]) {
      const sim = FA.simulate(mode, N, d, B, md, seed), L = [...document.getElementById('sx-kx-' + list).children].map(li => li.textContent);
      const want = mode === 'std' ? sim.steps.length : T + 2; if (L.length !== want) bad.push(`sx-kx-${list} has ${L.length} items, the run ${want} steps`);
      L.forEach((txt, k) => { const got = lastNum(txt); if (got == null) return; n++;
        const si = mode === 'std' ? k : k === 0 ? 0 : k <= T ? k * T : sim.steps.length - 1;
        if (got !== f(tot(sim.steps[si]))) bad.push(`sx-kx-${list} item ${k + 1} says ${got}, the simulator ${f(tot(sim.steps[si]))}`) });
      if (mode !== 'std') { n++; if (sim.err > 1e-12) bad.push(mode + ' output differs from the plain formula by ' + sim.err) }
    }
    const fa1 = document.getElementById('sx-kx-fa').children[0].textContent; n++; if (!fa1.includes(f(2 * N) + ' values against standard attention\'s ' + f(2 * N * N))) bad.push('FA list item 1: extra state');
    const s2 = document.getElementById('sx-kx-std').children[1].textContent; n++; if (!s2.includes(f(N * N) + ' values, ' + (N / d) + ' times the size of Q')) bad.push('std list item 2: size of S');
    // the block-size table
    const rows = [...document.querySelectorAll('#kxTab tr')].slice(1).map(tr => [...tr.children].map(td => td.textContent));
    [4, 8, 16].forEach((bs, i) => { const g = (m, md) => f(tot(FA.simulate(m, N, d, bs, md, seed).steps.slice(-1)[0]));
      const exp = [g('std', false), g('std', true), g('fa', false), g('fa2', false)];
      exp.forEach((v, j) => { n++; if (rows[i][j + 1] !== v) bad.push(`table B=${bs} column ${j + 2}: ${rows[i][j + 1]} against ${v}`) }) });
    // Fig. 1's last step quotes Figure 2's printed numbers and their ratios
    const F = {}; PAPER.tables.f2.rows.forEach(r => F[r[0]] = r.slice(1)); const h = document.getElementById('sx-hero').children[5].textContent;
    const gb = F['HBM R/W (GB)'], ms = F['Runtime (ms)'], gf = F['GFLOPs'];
    for (const s of [gb[0] + ' GB against ' + gb[1] + ' GB', ms[0] + ' ms against ' + ms[1] + ' ms', gf[0] + ' against ' + gf[1] + ' GFLOPs',
      Math.round(100 * (gf[1] / gf[0] - 1)) + '% more arithmetic', (gb[0] / gb[1]).toFixed(1) + '× less traffic', (ms[0] / ms[1]).toFixed(1) + '× faster']) { n++; if (!h.includes(s)) bad.push('Fig. 1 step 6 lacks "' + s + '"') }
    const h2 = document.getElementById('sx-hero').children[1].textContent; n++; if (!h2.includes((1024 / 64) + ' times the size of Q')) bad.push('Fig. 1 step 2: size of S');
    return { bad, n } });
  r.bad.forEach(x => problems.push('numbers: ' + x)); console.log('step-list and table numbers checked', r.n);
  await p.close() }
await b.close();
console.log('stages checked', checked, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
