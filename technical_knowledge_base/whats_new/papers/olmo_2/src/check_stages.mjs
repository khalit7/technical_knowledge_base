// The 2026-11-06 layout and motion checks for the OLMo 2 page (after Llama 3 Herd's), at 1400 px light, 920 px light and 390 px dark:
// the 3D stage (#stg-pipe, Fig. 1: one model through the recipe, in each of its three model modes) plays by itself once scrolled into view,
// steps to its last step and has exactly one step-list item per step; flows stop drawing off screen; the spike replay (makeAnim, #sw) plays
// once in view with one list item per step and stops for good on a control; at 1400 px every split shows two columns; no errors, NaN,
// undefined or sideways scroll; under prefers-reduced-motion nothing moves by itself; and every number the Fig. 1 step list states matches
// the data the stage draws (window.OLMO_PIPE, built from window.PAPER: Table 9, Table 16, recompute.py's token counts and learning rates).
// Writes a mid-step and a last-step screenshot of the stage.
// usage (from the repo root): node technical_knowledge_base/whats_new/papers/olmo_2/src/check_stages.mjs [shots dir]
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
const STAGE_MODES = { 'stg-pipe': 'pipeM' };
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
      for (let k = 1; k < n; k++) { await clk(`#${id}-f`); await wait(80); if (k === Math.floor(n / 2)) { await wait(2000); await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-mid-${scheme}-${width}.png` }) } }
      await wait(2000);
      const shown = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (shown !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on "${shown}"`);
      const on = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return [...l.children].findIndex(x => x.classList.contains('on')) });
      if (on !== n - 1) problems.push(`${tag}: ${id} list marks item ${on + 1} at the last step`);
      const still = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent)); if (still) problems.push(`${tag}: ${id} still playing after a reader control`);
      if (width === 1400 || width === 390) await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-last-${scheme}-${width}.png` });
      if (STAGE_MODES[id]) for (const m of await p.$$eval(`#${STAGE_MODES[id]} button`, bs => bs.map(b => b.dataset.m))) {
        const f0 = await p.$eval('#' + id, e => +e.dataset.frames || 0);
        await clk(`#${STAGE_MODES[id]} button[data-m="${m}"]`); await wait(2600);
        const f1m = await p.$eval('#' + id, e => +e.dataset.frames || 0), plm = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent));
        if (!(f1m > f0) || !plm) problems.push(`${tag}: ${id} did not replay after switching to ${m}`);
        const nm = await p.$eval(`#${id}-r`, e => +e.max + 1), lm = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelectorAll('ol.sx:not([hidden])'); return [l.length, l[0] ? l[0].children.length : 0, l[0] ? l[0].id : ''] });
        if (lm[0] !== 1 || lm[1] !== nm) problems.push(`${tag}: ${id} ${m}: ${lm[0]} visible lists, ${lm[1]} items for ${nm} steps (${lm[2]})`);
        for (let k = 1; k < nm; k++) { await clk(`#${id}-f`); await wait(60); if (k === Math.floor(nm / 2)) { await wait(2000); await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-${m}-mid-${scheme}-${width}.png` }) } }
        await wait(2000); const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${nm} of ${nm}`) problems.push(`${tag}: ${id} ${m} ended on "${sh}"`);
        const cnt = await p.$eval('#pipeCnt', e => e.textContent); if (!cnt.trim()) problems.push(`${tag}: the Fig. 1 counters are empty in ${m}`);
      }
    }
    // the spike replay: a 2D step animation (makeAnim) in three explained stretches that plays once in view, one list item per step, stops for good on a control
    if (t === 't-run') {
      await p.$eval('#sw', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      if (!/Pause/.test(await p.$eval('#swPlay', e => e.textContent)) || !(await p.$eval('#sw', e => e.dataset.playing))) problems.push(`${tag}: the spike replay did not play when scrolled into view`);
      const n = await p.$eval('#swScrub', e => +e.max / 100), lis = await p.$eval('#sx-sw', e => e.children.length); if (n !== lis) problems.push(`${tag}: the spike replay has ${n} steps, ${lis} list items`);
      for (let k = 1; k < n; k++) await clk('#swFwd');
      const last = await p.$eval('#sx-sw', l => [...l.children].findIndex(x => x.classList.contains('on'))); if (last !== n - 1) problems.push(`${tag}: the replay list marks item ${last + 1} at the end`);
      if (/Pause/.test(await p.$eval('#swPlay', e => e.textContent))) problems.push(`${tag}: the spike replay still playing after a control`);
      if (!(await p.$eval('#swInfo', e => e.textContent)).includes('Figure 4')) problems.push(`${tag}: the replay's figure note is missing`);
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
    for (const id of await p.$$eval(`#${t} .stg`, xs => xs.map(x => x.id))) {
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800); const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0);
      const f = await p.$eval('#' + id, e => +e.dataset.frames || 0), pl = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent));
      if (f > 0 || pl || d1 !== d0) problems.push(`reduced motion: ${id} moved by itself (frames ${f}, redraws ${d1 - d0})`) }
    if (t === 't-run') { await p.$eval('#sw', e => e.scrollIntoView({ block: 'center' })); await wait(2500);
      const f = await p.$eval('#sw', e => +e.dataset.frames || 0), pl = await p.$eval('#swPlay', e => /Pause/.test(e.textContent)); if (f || pl) problems.push('reduced motion: the spike replay moved by itself') } }
  await p.close() }
{ // every number the Fig. 1 step list states is the one the stage draws
  const p = await b.newPage(); await p.goto(file); await wait(800);
  const r = await p.evaluate(() => {
    const bad = []; let n = 0; const L = [...document.getElementById('sx-pipe').children].map(li => li.textContent.replace(/\s+/g, ' '));
    const has = (i, s) => { n++; if (!L[i].includes(s)) bad.push('Fig. 1 step ' + (i + 1) + ': expected "' + s + '"') };
    const D = window.OLMO_PIPE, M = D.M, a = M['7B'], c = M['13B'], d = M['32B'], e4 = v => Math.round(v * 1e4) + ' × 10';
    has(0, e4(a.peak)); has(0, a.warmB.toFixed(1) + 'B tokens'); has(0, '13B: peak ' + e4(c.peak)); has(0, '32B: ' + e4(d.peak)); has(0, c.warmB.toFixed(1) + 'B tokens');
    n++; if (c.warmB !== d.warmB) bad.push('Fig. 1 step 1: the 13B and 32B warm-ups differ');
    has(1, 'peak at ' + a.T + 'T'); has(1, '32B: ' + d.T + 'T'); has(1, 'about ' + (a.cut / 3.9).toFixed(1) + ' pass'); has(1, (c.cut / 3.9).toFixed(1) + ' for the 13B'); has(1, (d.cut / 3.9).toFixed(1) + ' for the 32B');
    has(1, a.ck + ' public checkpoints'); has(1, '13B: ' + c.ck); has(1, '32B: ' + d.ck);
    has(2, a.cut.toFixed(2) + 'T with the learning rate still at ' + Math.round(a.lrc * 100) + '%'); has(2, '32B: ' + d.cut.toFixed(2) + 'T, ' + Math.round(d.lrc * 100) + '%'); has(2, '(' + c.cut.toFixed(2) + 'T, ' + Math.round(c.lrc * 100) + '%)');
    has(3, 'on the ' + a.anneal[0] + 'B mix ' + ['', '', '', 'three'][a.anneal.length]); has(3, 'three ' + c.anneal[0] + 'B runs and one ' + c.anneal[3] + 'B run'); n++; if (JSON.stringify(c.anneal) !== JSON.stringify(d.anneal)) bad.push('Fig. 1 step 4: the 13B and 32B anneals differ');
    has(3, 'stretched ' + Math.round(D.zoom('7B')) + ' times'); has(3, '(' + Math.round(D.zoom('13B')) + ' times for the 13B and 32B)'); n++; if (Math.round(D.zoom('32B')) !== Math.round(D.zoom('13B'))) bad.push('Fig. 1 step 4: the 32B zoom differs');
    has(4, 'from ' + a.pre.toFixed(1) + ' after stage 1 to ' + a.mid.toFixed(1)); has(4, '(+' + (a.mid - a.pre).toFixed(1) + ')'); has(4, 'GSM8K from ' + a.gsmPre + ' to ' + a.gsmMid);
    has(4, '13B: ' + c.pre.toFixed(1) + ' to ' + c.mid.toFixed(1)); has(4, '32B: ' + d.pre.toFixed(1) + ' to ' + d.mid.toFixed(1));
    has(5, a.sft + ' prompts'); has(5, d.sft + ' prompts'); has(5, 'Instruct average ' + a.post[0][1]); has(5, '13B: ' + c.post[0][1]); has(5, '32B: ' + d.post[0][1]);
    has(6, 'Average ' + a.post[1][1] + ', +' + (a.post[1][1] - a.post[0][1]).toFixed(1)); has(6, '13B: ' + c.post[1][1]); has(6, '32B: ' + d.post[1][1]);
    has(7, 'Final Instruct average ' + a.post[2][1] + ', +' + (a.post[2][1] - a.post[1][1]).toFixed(1)); has(7, '13B: ' + c.post[2][1]); has(7, '32B: ' + d.post[2][1]);
    has(7, 'GSM8K ' + a.post[1][5] + ' to ' + a.post[2][5]); has(7, 'MATH ' + a.post[1][7] + ' to ' + a.post[2][7]);
    // the schedule the wall draws: the cosine at the cut equals recompute.py's learning rate at the cut
    ['7B', '13B', '32B'].forEach(m => { n++; const v = D.lrAt(M[m].cut, m); if (Math.abs(v - M[m].lrc) > .002) bad.push('Fig. 1: the wall at the ' + m + ' cut is ' + v.toFixed(4) + ', recompute.py says ' + M[m].lrc) });
    return { bad, n } });
  r.bad.forEach(x => problems.push('step list number: ' + x)); console.log('step-list numbers checked', r.n);
  await p.close() }
await b.close();
console.log('stages checked', checked, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
