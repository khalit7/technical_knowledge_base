// The 2026-11-06 layout and motion checks for the RoFormer page (after Mamba's), at 1400 px light, 920 px light and 390 px dark:
// the three 3D stages (#stg-hero: a query and a key as a tower of four rotation pairs; #stg-shift: the shift test through the two trained toys;
// #stg-decay: why Figure 2's bound falls, the walk of 64 unit arrows, then one Gaussian draw) and the 2D animation (#thn: Then and now) each play
// by themselves once scrolled into view, step to their last step, and have exactly one step-list item per step; the stages' flows stop drawing
// off screen; a reader control stops autoplay; at 1400 px every split shows two columns; no errors, NaN, undefined or sideways scroll; under
// prefers-reduced-motion nothing moves by itself; and the numbers the step lists state match what the page computes (the hero's exact sums,
// the toy models' attention weights, the decay bound of Eq. 37 and recompute.py's Figure 2, the Gaussian draws of the decay chart).
// Writes a mid-step and a last-step screenshot of each stage.
// usage (from the repo root): node technical_knowledge_base/whats_new/papers/roformer/src/check_stages.mjs [shots dir]
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
const TWEEN = { 'stg-hero': 1900, 'stg-shift': 2400, 'stg-decay': 2400 };
const ANIMS = { thn: ['t-then', 'sx-thn'] };
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await wait(300);
  const tag = `${scheme} ${width}`;
  const clk = sel => p.$eval(sel, e => e.click());
  const visList = id => p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelectorAll('ol.sx:not([hidden])'); return [l.length, l[0] ? l[0].children.length : 0, l[0] ? l[0].id : '', l[0] ? [...l[0].children].findIndex(x => x.classList.contains('on')) : -1] });
  const stepThrough = async (id, n) => {
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    for (let k = 1; k < n; k++) { await clk(`#${id}-f`); await wait(80); if (k === Math.floor(n / 2)) { await wait(TWEEN[id] / 2); await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-mid-${scheme}-${width}.png` }) } }
    await wait(TWEEN[id]);
    const shown = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (shown !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on "${shown}"`);
    const [, , , on] = await visList(id); if (on !== n - 1) problems.push(`${tag}: ${id} list marks item ${on + 1} at the last step`);
    if (width === 1400 || width === 390) await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-last-${scheme}-${width}.png` });
  };
  for (const t of await p.$$eval('#tabs button', bs => bs.map(b => b.dataset.t))) {
    await clk(`#tabs button[data-t=${t}]`); await wait(300);
    const splits = await p.$$eval(`#${t} .s3sp`, ss => ss.map(s => { const L = s.querySelector(':scope > .s3L'), R = s.querySelector(':scope > .s3R'); if (!L || !R) return 'missing column';
      const a = L.getBoundingClientRect(), r = R.getBoundingClientRect(); return { side: r.left >= a.right - 1 && r.width > 200 && a.width > 200 } }));
    splits.forEach((s, i) => { if (s === 'missing column') problems.push(`${tag} ${t}: split ${i + 1} lacks a column`); else if (width >= 1100 && !s.side) problems.push(`${tag} ${t}: split ${i + 1} is not two columns`) });
    const ids = await p.$$eval(`#${t} .stg`, xs => xs.map(x => x.id));
    for (const id of ids) {
      checked++;
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2200);
      const f1 = await p.$eval('#' + id, e => +e.dataset.frames || 0);
      if (!(f1 > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
      const playing = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent)); if (!playing) problems.push(`${tag}: ${id} is not playing after scrolling into view`);
      const n = await p.$eval(`#${id}-r`, e => +e.max + 1);
      const [nl, lis] = await visList(id);
      if (nl !== 1 || lis !== n) problems.push(`${tag}: ${id} has ${n} steps but ${nl} visible lists with ${lis} items`);
      // flows stop drawing off screen: scroll far from this stage (the bottom of the tab for the first, the top for the others)
      await p.evaluate(first => window.scrollTo(0, first ? document.documentElement.scrollHeight : 0), id === ids[0]); await wait(500);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800);
      const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0); if (d1 !== d0) problems.push(`${tag}: ${id} kept drawing off screen (${d1 - d0})`);
      // a reader control stops autoplay for good; step to the last step through the forward button
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(200);
      await stepThrough(id, n);
      const still = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent)); if (still) problems.push(`${tag}: ${id} still playing after a reader control`);
    }
    for (const [id, [tab, list]] of Object.entries(ANIMS)) {
      if (tab !== t) continue; checked++;
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2000);
      if (!(await p.$eval('#' + id, e => +e.dataset.frames || 0)) || !(await p.$eval(`#${id}Play`, e => /Pause/.test(e.textContent)))) problems.push(`${tag}: ${id} did not play when scrolled into view`);
      const n = await p.$eval(`#${id}Scrub`, e => e.max / 100);
      const L = await p.$$eval('ol.sx:not([hidden])', (ls, want) => ls.filter(l => l.id === want).map(l => l.children.length), list);
      if (L.length !== 1 || L[0] !== n) problems.push(`${tag}: ${id}: ${n} steps, list ${list} visible ${L.length} with ${L[0]} items`);
      await p.evaluate(id => { const e = document.getElementById(id + 'Scrub'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
      for (let k = 1; k < n; k++) await clk(`#${id}Fwd`);
      const on = await p.$eval('#' + list, l => [...l.children].findIndex(x => x.classList.contains('on'))); if (on !== n - 1) problems.push(`${tag}: ${id} list marks item ${on + 1} at the last step`);
      if (await p.$eval(`#${id}Play`, e => /Pause/.test(e.textContent))) problems.push(`${tag}: ${id} still playing after a reader control`);
      // a click on a list item jumps there
      await p.$eval('#' + list, l => l.children[2].click()); await wait(3600);
      const on2 = await p.$eval('#' + list, l => [...l.children].findIndex(x => x.classList.contains('on'))); if (on2 !== 2) problems.push(`${tag}: ${id} list click marks item ${on2 + 1}, not 3`);
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
  for (const [t, ids] of [['t-read', ['stg-hero', 'stg-shift', 'stg-decay']], ['t-then', ['thn']]]) {
    await p.$eval(`#tabs button[data-t=${t}]`, e => e.click()); await wait(300);
    for (const id of ids) {
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      const stg = await p.$eval('#' + id, e => e.classList.contains('stg'));
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800); const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0);
      const f = await p.$eval('#' + id, e => +e.dataset.frames || 0), pl = await p.$eval(stg ? `#${id}-p` : `#${id}Play`, e => /Pause/.test(e.textContent));
      if (f > 0 || pl || d1 !== d0) problems.push(`reduced motion: ${id} moved by itself (frames ${f}, redraws ${d1 - d0})`) } }
  await p.close() }
{ // the numbers the step lists state are the page's own computations
  const p = await b.newPage(); await p.goto(file); await wait(800);
  const r = await p.evaluate(() => {
    const bad = []; let n = 0; const m3 = v => (v < 0 ? '−' : '') + Math.abs(v).toFixed(3);
    const has = (list, k, s) => { n++; const li = document.getElementById(list).children[k]; if (!li || !li.textContent.includes(s)) bad.push(`${list} item ${k + 1} lacks "${s}"`) };
    const eq = (sel, want, what) => { n++; const el = document.querySelector(sel); if (!el) { bad.push('missing ' + sel); return } if (el.textContent !== want) bad.push(`${what || sel}: list says ${el.textContent}, page computes ${want}`) };
    // the hero: exact sums of the four shares
    const H = window.__hero;
    has('sx-hero', 0, m3(H.total(0, 0))); has('sx-hero', 2, m3(H.total(5, 2))); has('sx-hero', 3, m3(H.total(43, 40))); has('sx-hero', 4, m3(H.total(43, 33)));
    n++; if (Math.abs(H.total(5, 2) - H.total(43, 40)) > 1e-12) bad.push('hero: sums at (5, 2) and (43, 40) differ');
    has('sx-hero', 0, H.QV.map(v => (v < 0 ? '−' : '') + Math.abs(v).toFixed(2)).join(', ')); has('sx-hero', 0, H.KV.map(v => (v < 0 ? '−' : '') + Math.abs(v).toFixed(2)).join(', '));
    // the shift test: the toy models' weights
    const X = window.__shift, J = X.OFFS.map((_, j) => j);
    eq('.shN[data-k=lag-rope]', Math.round(100 * X.onLag('rope')) + '%'); eq('.shN[data-k=lag-sin]', Math.round(100 * X.onLag('sin')) + '%');
    n++; if (!(X.maxd('rope', 1) < 1e-15)) bad.push('shift: RoPE weights at offset 4 changed by 1e-15 or more (the list says under)');
    n++; if (!(Math.max(...J.map(j => X.maxd('rope', j))) < 2e-15)) bad.push('shift: RoPE weights changed by more than about 1e-15 (the list says about 1e-15 at most)');
    eq('.shN[data-k=d4-sin]', X.maxd('sin', 1).toFixed(3)); const ms = J.map(j => X.maxd('sin', j)), jm = ms.indexOf(Math.max(...ms));
    eq('.shN[data-k=dmax-sin]', ms[jm].toFixed(3)); has('sx-shift', 2, 'at positions ' + X.OFFS[jm] + ' to ' + (X.OFFS[jm] + 11));
    eq('.shN[data-k=d20-sin]', X.maxd('sin', 5).toFixed(3)); eq('.shN[data-k=ok20-sin]', X.okc('sin', 5));
    has('sx-shift', 0, 'head ' + (X.HEAD.rope + 1) + ' of 4'); has('sx-shift', 0, 'sinusoidal model\'s head ' + (X.HEAD.sin + 1));
    // the decay walk: the bound of Eq. 37 (and recompute.py's Figure 2 at 8), the pairs past a radian, the Gaussian draws
    const D = window.__decay;
    document.querySelectorAll('.dcN').forEach(e => eq(`.dcN[data-r="${e.dataset.r}"]`, D.bound(+e.dataset.r).toFixed(2), 'bound at ' + e.dataset.r));
    eq('.dcN[data-r="8"]', PAPER.rc.fig2.bound[8].toFixed(2), 'recompute.py Figure 2 at 8');
    document.querySelectorAll('.dcF').forEach(e => eq(`.dcF[data-r="${e.dataset.r}"]`, String(D.nFast(+e.dataset.r)), 'pairs past a radian at ' + e.dataset.r));
    document.querySelectorAll('.dcG').forEach(e => eq(`.dcG[data-r="${e.dataset.r}"]`, D.score(+e.dataset.r).toFixed(2), 'Gaussian score at ' + e.dataset.r));
    document.querySelectorAll('.dcM').forEach(e => eq(`.dcM[data-r="${e.dataset.r}"]`, D.meanAbs(+e.dataset.r).toFixed(2), 'mean |score| at ' + e.dataset.r));
    has('sx-decay', 0, '(d/2 + 1)/2'); n++; if (Math.abs(D.bound(0) - 32.5) > 1e-9) bad.push('bound at 0 is not (64 + 1)/2');
    return { bad, n } });
  r.bad.forEach(x => problems.push('numbers: ' + x)); console.log('step-list numbers checked', r.n);
  await p.close() }
await b.close();
console.log('stages and animations checked', checked, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
