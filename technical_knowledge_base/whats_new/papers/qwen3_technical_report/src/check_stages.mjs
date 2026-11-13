// The 2026-11-06 layout and motion checks for the Qwen3 page (after Llama 3 Herd's), at 1400 px light, 920 px light and 390 px dark:
// the two 3D stages (#stg-post, Fig. 1: post-training, the flagships' four stages and strong-to-weak distillation; #stg-fz, Fig. 2:
// two models against one fused checkpoint with a flag and a budget), each in both modes, play by themselves once scrolled into view,
// replay on a mode switch, step to their last step and have exactly one step-list item per step; flows stop drawing off screen;
// at 1400 px every split shows two columns; no errors, NaN, undefined or sideways scroll; under prefers-reduced-motion nothing moves
// by itself; and every number the step lists state matches the data the stages draw (window.PAPER's Tables 21 and 22 and parameter
// recount, read by the scenes into window.Q3_POST and window.Q3_FZ). Writes a mid-step and a last-step screenshot of each stage.
// usage (from the repo root): node technical_knowledge_base/whats_new/papers/qwen3_technical_report/src/check_stages.mjs [shots dir]
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
const STAGE_MODES = { 'stg-post': 'postM', 'stg-fz': 'fzM' };
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
      for (let k = 1; k < n; k++) { await clk(`#${id}-f`); await wait(80); if (k === Math.floor(n / 2)) { await wait(2400); await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-mid-${scheme}-${width}.png` }) } }
      await wait(2400);
      const shown = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (shown !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on "${shown}"`);
      const on = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return [...l.children].findIndex(x => x.classList.contains('on')) });
      if (on !== n - 1) problems.push(`${tag}: ${id} list marks item ${on + 1} at the last step`);
      const still = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent)); if (still) problems.push(`${tag}: ${id} still playing after a reader control`);
      if (width === 1400 || width === 390) await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-last-${scheme}-${width}.png` });
      if (STAGE_MODES[id]) for (const m of await p.$$eval(`#${STAGE_MODES[id]} button`, bs => bs.map(b => b.dataset.m))) {
        const f0 = await p.$eval('#' + id, e => +e.dataset.frames || 0);
        await clk(`#${STAGE_MODES[id]} button[data-m=${m}]`); await wait(2600);
        const f1m = await p.$eval('#' + id, e => +e.dataset.frames || 0), plm = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent));
        if (!(f1m > f0) || !plm) problems.push(`${tag}: ${id} did not replay after switching to ${m}`);
        const nm = await p.$eval(`#${id}-r`, e => +e.max + 1), lm = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelectorAll('ol.sx:not([hidden])'); return [l.length, l[0] ? l[0].children.length : 0, l[0] ? l[0].id : ''] });
        if (lm[0] !== 1 || lm[1] !== nm) problems.push(`${tag}: ${id} ${m}: ${lm[0]} visible lists, ${lm[1]} items for ${nm} steps (${lm[2]})`);
        for (let k = 1; k < nm; k++) { await clk(`#${id}-f`); await wait(60); if (k === Math.floor(nm / 2)) { await wait(2100); await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-${m}-mid-${scheme}-${width}.png` }) } }
        await wait(2100); const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${nm} of ${nm}`) problems.push(`${tag}: ${id} ${m} ended on "${sh}"`);
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
  for (const t of ['t-read', 't-run']) { await p.$eval(`#tabs button[data-t=${t}]`, e => e.click()); await wait(300);
    for (const id of await p.$$eval(`#${t} .stg`, xs => xs.map(x => x.id))) {
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800); const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0);
      const f = await p.$eval('#' + id, e => +e.dataset.frames || 0), pl = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent));
      if (f > 0 || pl || d1 !== d0) problems.push(`reduced motion: ${id} moved by itself (frames ${f}, redraws ${d1 - d0})`) }
  }
  await p.close() }
{ // every number the step lists state is the one the stages draw
  const p = await b.newPage(); await p.goto(file); await wait(800);
  const r = await p.evaluate(() => {
    const bad = []; let n = 0; const items = id => [...document.getElementById(id).children].map(li => li.textContent.replace(/\s+/g, ' '));
    const has = (L, i, s, id) => { n++; if (!L[i].includes(s)) bad.push(id + ' step ' + (i + 1) + ': expected "' + s + '"') };
    const Q = window.Q3_POST, F = window.Q3_FZ, A = window.PAPER.rc.arch, par = m => A.find(r => r.model === m).total;
    const L = items('sx-post-flag'), id = 'Fig. 1 flagship';
    has(L, 2, '3,995', id); has(L, 2, '70.1 to 85.1 in 170 steps', id);
    has(L, 3, Q.AIME[0].toFixed(1) + ' to ' + Q.AIME[1].toFixed(1), id);
    has(L, 4, 'ThinkFollow ' + Q.TF[0].toFixed(1) + ' to ' + Q.TF[1].toFixed(1), id); has(L, 4, 'ToolUse +' + Q.TOOL.toFixed(1), id);
    has(L, 5, Math.round(Q.flag[0]) + 'B and ' + Q.flag[1].toFixed(1) + 'B', id);
    const S = items('sx-post-small'), id2 = 'Fig. 1 small';
    has(S, 0, '0.6B, 1.7B, 4B, ' + par('Qwen3-8B').toFixed(1) + 'B and ' + par('Qwen3-14B').toFixed(1) + 'B dense', id2);
    { const m = A.find(r => r.model === 'Qwen3-30B-A3B'); has(S, 0, m.card_total.toFixed(1) + 'B total (' + m.card_active.toFixed(1) + 'B active)', id2); n++; if (Math.abs(m.total - m.card_total) > .05 || Math.abs(m.active - m.card_active) > .06) bad.push(id2 + ': the recount is not within rounding of the card') }
    has(S, 2, '151,669', id2);
    has(S, 3, 'AIME\'24 ' + Q.A21[0].toFixed(1) + ' for ' + Q.GH[0].toLocaleString('en-GB') + ' GPU hours', id2);
    has(S, 3, Q.A21[1].toFixed(1) + ' for ' + Q.GH[1].toLocaleString('en-GB'), id2); has(S, 3, (Q.GH[1] / Q.GH[0] * 100).toFixed(1) + '%', id2);
    const T = items('sx-fz-two'), O = items('sx-fz-one'), id3 = 'Fig. 2';
    has(T, 1, (F.GB.inst + F.GB.qwq) + ' GB in BF16', id3); has(O, 0, F.GB.q3.toFixed(1) + ' GB in BF16', id3);
    n++; const cap = document.getElementById('s-fuse').textContent.replace(/\s+/g, ' '); if (!cap.includes('(' + F.NTH + ' thinking tokens, ' + F.NB + ' under the budget)')) bad.push(id3 + ': the caption does not give the drawn token counts');
    return { bad, n } });
  r.bad.forEach(x => problems.push('step list number: ' + x)); console.log('step-list numbers checked', r.n);
  await p.close() }
await b.close();
console.log('stages checked', checked, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
