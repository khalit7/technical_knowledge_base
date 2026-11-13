// The 2026-11-06 layout and motion checks for the Trained Persistent Memory page, at 1400 px light, 920 px light and 390 px dark:
// the 3D stage (#stg-meth, Fig. 1, where each method attaches the bank) and the two 2D step animations (#tl, the stateless model against a bank;
// #cap, the 64 rows of a 1x bank, in the Simulate tab) each play by themselves once scrolled into view, step to their last step and have exactly
// one step-list item per step in every mode; a list click jumps to its step and stops; flows stop drawing off screen; at 1400 px every split shows
// two columns; no errors, NaN, undefined or sideways scroll; under prefers-reduced-motion nothing moves by itself; and the numbers the step lists
// state match the data (PAPER.rc from recompute.py, PAPER.tables, and SIM.simulate for the row-collapse snapshots).
// Writes a mid-step screenshot of each stage and animation.
// usage (from the repo root): node technical_knowledge_base/whats_new/papers/trained_persistent_memory/src/check_stages.mjs [shots dir]
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
const ANIMS = { tl: 't-read', cap: 't-run' };
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
      await p.evaluate(() => window.scrollTo(0, 0)); await wait(400);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800);
      const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0); if (d1 !== d0) problems.push(`${tag}: ${id} kept drawing off screen (${d1 - d0})`);
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(200);
      await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
      for (let k = 1; k < n; k++) { await clk(`#${id}-f`); await wait(80); if (k === Math.floor(n / 2)) { await wait(1700); await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-mid-${scheme}-${width}.png` }) } }
      await wait(1700);
      const shown = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (shown !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on "${shown}"`);
      const on = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return [...l.children].findIndex(x => x.classList.contains('on')) });
      if (on !== n - 1) problems.push(`${tag}: ${id} list marks item ${on + 1} at the last step`);
      const still = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent)); if (still) problems.push(`${tag}: ${id} still playing after a reader control`);
    }
    // 2D step animations (makeAnim): each mode
    for (const [id, tab] of Object.entries(ANIMS)) {
      if (tab !== t || !(await p.$('#' + id))) continue;
      checked++;
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      const fr = await p.$eval('#' + id, e => +e.dataset.frames || 0), pl = await p.$eval('#' + id, e => e.hasAttribute('data-playing'));
      if (!(fr > 0) || !pl) problems.push(`${tag}: ${id} did not play when scrolled into view (frames ${fr}, playing ${pl})`);
      for (const m of await p.$$eval(`#${id}M button`, bs => bs.map(b => b.dataset.m))) {
        await clk(`#${id}M button[data-m=${m}]`); await wait(1200);
        if (!(await p.$eval('#' + id, e => e.hasAttribute('data-playing')))) problems.push(`${tag}: ${id} did not play after switching to ${m}`);
        const n = await p.$eval(`#${id}Scrub`, e => +e.max / 100);
        const lis = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelectorAll('ol.sx:not([hidden])'); return [l.length, l[0] ? l[0].children.length : 0] });
        if (lis[0] !== 1 || lis[1] !== n) problems.push(`${tag}: ${id} ${m}: ${lis[0]} visible lists with ${lis[1]} items for ${n} steps`);
        if (n > 12) problems.push(`${tag}: ${id} ${m} has ${n} steps (a long replay must be grouped into stretches)`);
        for (let k = 0; k < n; k++) { await clk(`#${id}Fwd`); if (k === Math.floor(n / 2) - 1) await (await p.$('#' + id)).screenshot({ path: `${shots}/anim-${id}-${m}-mid-${scheme}-${width}.png` }) }
        if (await p.$eval('#' + id, e => e.hasAttribute('data-playing'))) problems.push(`${tag}: ${id} still playing after the forward button`);
        const on = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return [...l.children].findIndex(x => x.classList.contains('on')) });
        if (on !== n - 1) problems.push(`${tag}: ${id} ${m} list marks item ${on + 1} at the last step`);
        // a click on a list item jumps to that step and leaves it stopped
        await p.evaluate(id => document.getElementById(id).closest('.s3sp').querySelector('ol.sx:not([hidden])').children[1].click(), id); await wait(300);
        const on2 = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return [...l.children].findIndex(x => x.classList.contains('on')) });
        if (on2 !== 1 || await p.$eval('#' + id, e => e.hasAttribute('data-playing'))) problems.push(`${tag}: ${id} ${m} list click did not jump to step 2 and stop`);
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
    for (const id of Object.keys(ANIMS).filter(a => ANIMS[a] === t)) {
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      const f = await p.$eval('#' + id, e => +e.dataset.frames || 0), pl = await p.$eval('#' + id, e => e.hasAttribute('data-playing'));
      if (f > 0 || pl) problems.push(`reduced motion: ${id} moved by itself (frames ${f})`) } }
  await p.close() }
{ // the numbers the step lists state are the ones the data gives
  const p = await b.newPage(); await p.goto(file); await wait(800);
  const r = await p.evaluate(() => {
    const bad = []; let n = 0; const items = id => [...document.getElementById(id).children].map(li => li.textContent);
    const want = (id, i, s) => { n++; const L = items(id); if (!L[i] || !L[i].includes(s)) bad.push(id + ' item ' + (i + 1) + ': expected "' + s + '"') };
    const RC = PAPER.rc, PR = RC.params, BB = RC.backbone, T2 = PAPER.tables.t2.rows, M = v => (v / 1e6).toFixed(2) + 'M';
    // Fig. 1
    n++; if (items('sx-meth').length !== METH.steps) bad.push('Fig. 1: ' + METH.steps + ' steps, ' + items('sx-meth').length + ' items');
    want('sx-meth', 0, BB.layers + ' encoder layers'); want('sx-meth', 0, BB.layers + ' decoder layers'); want('sx-meth', 0, (BB.total / 1e9).toFixed(2) + 'B parameters');
    want('sx-meth', 0, BB.d_model.toLocaleString('en-GB'));
    want('sx-meth', 2, M(PR['M.1'].count) + ' parameters (Table 2: ' + T2[0].params + ')'); want('sx-meth', 2, PR['M.1'].pct_of_backbone.toFixed(3) + '% of the backbone');
    want('sx-meth', 3, M(PR['M.3'].count)); want('sx-meth', 4, M(PR['M.6'].count)); want('sx-meth', 4, '8 of 64');
    want('sx-meth', 5, M(PR['M.4'].count) + ' (Table 2: ' + T2[3].params + ')'); want('sx-meth', 5, M(PR['M.4_at_10x'].count) + ' at 10x');
    want('sx-meth', 6, M(PR['M.2'].count) + ' trained'); want('sx-meth', 6, '(M.5, ' + M(PR['M.5'].count) + ')');
    const cs = Object.keys(PR).filter(k => /^M\.\d$/.test(k)).map(k => PR[k]), lo = Math.min(...cs.map(x => x.count)), hi = Math.max(...cs.map(x => x.count));
    want('sx-meth', 7, 'between ' + M(lo) + ' and ' + M(hi)); want('sx-meth', 7, 'at most ' + Math.max(...cs.map(x => x.pct_of_backbone)).toFixed(2) + '%');
    // the stateless-against-bank animation
    const D = RC.decay, pc = v => Math.round(v * 100) + '%';
    want('sx-tl-mem', 2, '= ' + pc(D['20'])); want('sx-tl-mem', 3, '= ' + pc(Math.pow(.95, 40))); want('sx-tl-mem', 4, pc(RC.share_lag_ge_256) + ' of the test questions');
    n++; if (Math.round(D['256'] * 1e6) !== 2) bad.push('0.95^256 is not about 2 in a million: ' + D['256']);
    // the row-collapse snapshots
    const T = [1, 2, 5, 20, 100, 600], z = SIM.simulate({ rule: 'ac', scale: 1, init: 'zero', T: 600, snap: T }).snaps, rr = SIM.simulate({ rule: 'ac', scale: 1, init: 'rand', T: 600, snap: T }).snaps;
    n++; if (T.some(t => z[t].distinct !== 1)) bad.push('zero start: not one distinct row at every snapshot (' + T.map(t => z[t].distinct).join(',') + ')');
    n++; if (!(rr[1].distinct > 1 && rr[100].spread < .01 && rr[600].spread < rr[100].spread)) bad.push('random start: rows do not converge as the list says');
    T.forEach((t, i) => { want('sx-cap-zero', i, 'After turn ' + t); want('sx-cap-rand', i, 'After turn ' + t) });
    return { bad, n } });
  r.bad.forEach(x => problems.push('step list number: ' + x)); console.log('step-list numbers checked', r.n);
  await p.close() }
await b.close();
console.log('stages and animations checked', checked, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
