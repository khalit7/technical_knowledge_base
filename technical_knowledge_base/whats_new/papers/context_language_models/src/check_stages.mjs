// The 2026-11-06 layout and motion checks for this page, at 1400 px light, 920 px light and 390 px dark:
// the 3D stage (#stg-cache, one trajectory call by call) plays by itself once scrolled into view, steps to its last step, has exactly
// one step-list item per step, stops for good on a reader control, and its flows stop drawing off screen; the numbers its step list
// quotes are recomputed from the page's own engine (CLMR.simulate, checked against recompute.py by check_page.mjs);
// the Replay tab's episode (#rp, about 30 calls) is a widget under the long-replay rule: it never plays by itself, has no step list,
// and opens on the first call after the first edit; at 1400 px every split shows two columns; no errors, NaN, undefined or sideways
// scroll; under prefers-reduced-motion nothing moves by itself. Writes a mid-step screenshot of the stage.
// usage (from the repo root): node technical_knowledge_base/whats_new/papers/context_language_models/src/check_stages.mjs [shots dir]
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
// 0. the step list's numbers against the engine
{
  const p = await b.newPage(); await p.goto(file);
  const r = await p.evaluate(() => {
    const D = Object.assign({}, CLMR.DEF, { clm_keep: 1 }), K = CLMR.simulate('clm', D), S = CLMR.simulate('summary', CLMR.DEF), K0 = CLMR.simulate('clm', CLMR.DEF);
    const f = x => (x / 1e14).toFixed(2), g = v => v.toLocaleString('en-GB'), st = K.steps;
    const post = st.map((s, i) => i > 0 && st[i - 1].kind === 'edit'), sum = h => st.reduce((a, s, i) => a + (post[i] ? h(s) : 0), 0);
    let re = 0; st.forEach(s => s.blocks.forEach(b => { if (b[2] === 're') re += b[0] }));
    const want = [
      ...st.slice(0, 4).map(s => g(s.U)), ...st.slice(0, 4).map(s => f(s.f_std)), g(st[3].P), g(st[4].P), g(0.75 * D.budget), String(st[4].G), f(st[4].f_std),
      g(st[5].P), f(st[5].f_std), f(st[5].f_scr), g(st[5].U - st[5].reloc), g(st[5].U), g(st[5].reloc),
      String(K.calls), String(K.edits), g(re), (sum(s => s.f_std) / 1e15).toFixed(2), K.pflops_std.toFixed(2), (sum(s => s.f_scr) / 1e15).toFixed(2), K.pflops_scr.toFixed(2),
      Math.round(100 * (1 - K.pflops_scr / K.pflops_std)) + '%', String(S.calls), String(S.edits), S.pflops_std.toFixed(2), K0.pflops_std.toFixed(2), g(D.sum_len)];
    const txt = document.getElementById('sx-cache').innerText;
    return { miss: want.filter(w => !txt.includes(w)), scrSame: Math.abs(S.pflops_scr - S.pflops_std) < 1e-9 };
  });
  if (r.miss.length) problems.push('stage step list does not quote the engine: ' + r.miss.join(', '));
  if (!r.scrSame) problems.push('Summary run: SCR changes the total, but the step list says it saves nothing');
  await p.close();
}
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
      // a reader control stops autoplay for good; step to the last step through the forward button, with a screenshot of each step at 1400 and 390
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(200);
      await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
      if (width !== 920) { await wait(400); await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-1-${scheme}-${width}.png` }) }
      for (let k = 1; k < n; k++) { await clk(`#${id}-f`); await wait(80); if (width !== 920 || k === Math.floor(n / 2)) { await wait(2000); await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-${k + 1}-${scheme}-${width}.png` }) } }
      await wait(1900);
      const shown = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (shown !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on "${shown}"`);
      const on = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return [...l.children].findIndex(x => x.classList.contains('on')) });
      if (on !== n - 1) problems.push(`${tag}: ${id} list marks item ${on + 1} at the last step`);
      const still = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent)); if (still) problems.push(`${tag}: ${id} still playing after a reader control`);
    }
    // the replay widget: no autoplay, no step list, opens on the first call after the first edit
    if (t === 't-run') {
      checked++;
      await p.$eval('#rp', e => e.scrollIntoView({ block: 'center' })); await wait(1800);
      const fr = await p.$eval('#rp', e => +e.dataset.frames || 0), pl = await p.$eval('#rp', e => e.hasAttribute('data-playing'));
      if (fr || pl) problems.push(`${tag}: the replay widget moved by itself (frames ${fr})`);
      if (await p.$eval('#rp', h => !!h.closest('.s3sp').querySelector('ol.sx'))) problems.push(`${tag}: the replay widget has a step list`);
      for (const m of ['clm', 'summary', 'base']) {
        await clk(`#rpM button[data-m=${m}]`); await wait(200);
        const r = await p.evaluate(m => { const S = CLMR.simulate(m, Object.assign({}, CLMR.DEF)).steps, i = S.findIndex((s, j) => j > 0 && (S[j - 1].kind === 'edit' || S[j - 1].kind === 'compact'));
          return { want: (i > 0 ? i : S.length - 1) + 1, shown: document.getElementById('rpStep').textContent, playing: document.getElementById('rp').hasAttribute('data-playing') } }, m);
        if (!r.shown.startsWith(`Step ${r.want} of`)) problems.push(`${tag}: replay ${m} opens on "${r.shown}", expected call ${r.want}`);
        if (r.playing) problems.push(`${tag}: replay ${m} played after a mode switch`);
      }
      await clk('#rpM button[data-m=clm]');
      await clk('#rpPlay'); await wait(1000);
      const fr2 = await p.$eval('#rp', e => +e.dataset.frames || 0), pl2 = await p.$eval('#rp', e => e.hasAttribute('data-playing'));
      if (!(fr2 > 0) || !pl2) problems.push(`${tag}: the replay did not play on Play`);
      await clk('#rpPlay');
      if (width !== 920) await (await p.$('#rp')).screenshot({ path: `${shots}/widget-rp-${scheme}-${width}.png` });
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
  for (const t of ['t-read', 't-run']) { await p.$eval(`#tabs button[data-t=${t}]`, e => e.click()); await wait(300);
    for (const id of await p.$$eval(`#${t} .stg, #${t} #rp`, xs => xs.map(x => x.id))) {
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800); const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0);
      const f = await p.$eval('#' + id, e => +e.dataset.frames || 0), pl = await p.$eval('#' + id, e => e.hasAttribute('data-playing'));
      if (f > 0 || pl || d1 !== d0) problems.push(`reduced motion: ${id} moved by itself (frames ${f}, redraws ${d1 - d0})`) } }
  await p.close() }
await b.close();
console.log('stages and widgets checked', checked, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
