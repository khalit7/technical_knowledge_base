// The 2026-11-06 layout and motion checks for the WSM page (after OLMo 2's), at 1400 px light, 920 px light and 390 px dark:
// both 3D stages (#stg-merge, Fig. 1: a merge is a decay schedule; #stg-rv, Fig. 2: the river valley) play by themselves once scrolled into view,
// step to their last step and have exactly one step-list item per step; a reader control stops autoplay for good; flows stop drawing off screen;
// at 1400 px every split shows two columns; no errors, NaN, undefined or sideways scroll; under prefers-reduced-motion nothing moves by itself;
// and every number the two step lists state matches the data the stages draw (window.WSM_MERGE: the toy's 8 seeds and Theorem 3.1's weights,
// Ling-mini's Figure 3 points; window.WSM_RV: the river-valley toy). Writes a mid-step and a last-step screenshot of each stage.
// usage (from the repo root): node technical_knowledge_base/whats_new/papers/wsm/src/check_stages.mjs [shots dir]
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
      const a = L.getBoundingClientRect(), r = R.getBoundingClientRect(); return { side: Math.abs(r.left - a.right) < 80 && r.left >= a.right - 1 && r.width > 200 && a.width > 200 } }));
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
      for (let k = 1; k < n; k++) { await clk(`#${id}-f`); await wait(80); if (k === Math.floor(n / 2)) { await wait(2400); await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-mid-${scheme}-${width}.png` }) } }
      await wait(3600);
      const shown = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (shown !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on "${shown}"`);
      const on = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return [...l.children].findIndex(x => x.classList.contains('on')) });
      if (on !== n - 1) problems.push(`${tag}: ${id} list marks item ${on + 1} at the last step`);
      const still = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent)); if (still) problems.push(`${tag}: ${id} still playing after a reader control`);
      if (width === 1400 || width === 390) await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-last-${scheme}-${width}.png` });
      // every step once, for a look at each (1400 light only)
      if (width === 1400) for (let k = 0; k < n; k++) { await p.evaluate((id, k) => { const l = document.getElementById(id).closest('.s3sp').querySelector('ol.sx'); l.children[k].click() }, id, k); await wait(3600);
        await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-step${k + 1}-${scheme}-${width}.png` }) }
    }
    if (t === 't-read') { const c = await p.$eval('#rvCnt', e => e.textContent); if (!/step/.test(c)) problems.push(`${tag}: the river counters are empty`) }
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
{ // every number the two step lists state is the one the stages draw
  const p = await b.newPage(); await p.goto(file); await wait(800);
  const r = await p.evaluate(() => {
    const bad = []; let n = 0; const txt = id => [...document.getElementById(id).children].map(li => li.textContent.replace(/\s+/g, ' '));
    const L = txt('sx-merge'), V = txt('sx-rv');
    const has = (A, nm, i, s) => { n++; if (!A[i].includes(s)) bad.push(nm + ' step ' + (i + 1) + ': expected "' + s + '"') };
    const D = window.WSM_MERGE, f4 = v => v.toFixed(4), pc = v => Math.round(v * 100) + '%';
    has(L, 'Fig. 1', 0, 'peak, ' + D.PEAK + ','); has(L, 'Fig. 1', 0, D.DUR.toLocaleString('en-GB') + ' steps'); has(L, 'Fig. 1', 0, 'every ' + D.CK + ' steps');
    n++; if (D.cMean.length !== 16) bad.push('Fig. 1: ' + D.cMean.length + ' checkpoints, the list says sixteen');
    has(L, 'Fig. 1', 1, '= ' + D.cMean[0].toFixed(4)); n++; if (D.cMean.some(v => Math.abs(v - 1 / 16) > 1e-12)) bad.push('Fig. 1 step 2: the mean weights are not all 1/16');
    n++; if (Math.abs(D.wMean[2] - 13 / 16) > 1e-12) bad.push('Fig. 1 step 3: w_3 is ' + D.wMean[2] + ', the list says 13/16'); has(L, 'Fig. 1', 2, 'keeps 13/16');
    n++; if (Math.abs(D.wMean[0] - 15 / 16) > 1e-12 || Math.abs(D.wMean[14] - 1 / 16) > 1e-12) bad.push('Fig. 1 step 3: the staircase ends are not 15/16 and 1/16');
    has(L, 'Fig. 1', 3, D.PEAK + ' ×'); has(L, 'Fig. 1', 3, pc(D.ratLo) + ' to ' + pc(D.ratHi).replace('%', '') + '% of the distance');
    has(L, 'Fig. 1', 3, 'flat-rate weights ' + f4(D.cons)); has(L, 'Fig. 1', 3, 'decayed run ' + f4(D.decay)); has(L, 'Fig. 1', 3, 'the merge ' + f4(D.merge)); has(L, 'Fig. 1', 3, 'branch reaches ' + f4(D.wsd)); has(L, 'Fig. 1', 3, 'lower in ' + D.wins + ' of 8');
    has(L, 'Fig. 1', 4, 'carries ' + D.cSqrt[0].toFixed(3)); has(L, 'Fig. 1', 4, 'newest ' + D.cSqrt[15].toFixed(3));
    n++; if (Math.abs(D.cSqrt.reduce((a, b) => a + b, 0) - 1) > 1e-12) bad.push('Fig. 1 step 5: the 1-sqrt weights do not sum to 1');
    const G = D.ling; has(L, 'Fig. 1', 5, 'checkpoint ' + G.raw.toFixed(2)); has(L, 'Fig. 1', 5, 'decay ' + G.wsd.toFixed(2)); has(L, 'Fig. 1', 5, 'merge ' + G.merge.toFixed(2)); has(L, 'Fig. 1', 5, '+' + (G.merge - G.wsd).toFixed(2));
    has(L, 'Fig. 1', 5, G.best.toFixed(2) + ' at ' + G.bestAt + 'B'); has(L, 'Fig. 1', 5, '+' + (G.best - G.wsd).toFixed(2));
    const W = window.WSM_RV; has(V, 'Fig. 2', 4, 'loss is ' + W.draw.wsd.toFixed(3)); has(V, 'Fig. 2', 4, "point's " + W.draw.merged.toFixed(3)); has(V, 'Fig. 2', 4, 'end at ' + W.draw.live.toFixed(3));
    has(V, 'Fig. 2', 4, 'decayed ' + W.avg.wsd.toFixed(3)); has(V, 'Fig. 2', 4, 'merged ' + W.avg.merged.toFixed(3)); has(V, 'Fig. 2', 4, 'lower in ' + W.mWins + ' of 200'); has(V, 'Fig. 2', 4, 'live weights ' + W.avg.live.toFixed(3));
    return { bad, n } });
  r.bad.forEach(x => problems.push('step list number: ' + x)); console.log('step-list numbers checked', r.n);
  // the static HTML carries the same Fig. 2 numbers the script writes (the page reads the same with scripts off)
  const html = fs.readFileSync(path.resolve(here, '../index.html'), 'utf8'); const W = await p.evaluate(() => window.WSM_RV);
  [['dw', W.draw.wsd.toFixed(3)], ['dm', W.draw.merged.toFixed(3)], ['dl', W.draw.live.toFixed(3)], ['aw', W.avg.wsd.toFixed(3)], ['am', W.avg.merged.toFixed(3)], ['al', W.avg.live.toFixed(3)], ['n', String(W.mWins)]]
    .forEach(([k, v]) => { if (!html.includes(`data-rv="${k}">${v}<`)) problems.push(`static Fig. 2 number ${k} is not ${v}`) });
  await p.close() }
await b.close();
console.log('stages checked', checked, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
