// The 2026-11-06 layout and motion checks for the 2026-09-28 tech-news issue, at 1400 px light, 920 px light and 390 px dark:
// - the 3D stage #stg-fusion (Dev tools: one illustrative session, three ways, and the prompt cache) plays by itself once scrolled into
//   view, steps to its last step, has one step-list item per step, stops drawing flows off screen and stops for good after a reader control;
// - the JitMem animation #v-jit (Research, makeAnim in 10b_js_anim.js) plays by itself once half in view, has one list item per step in
//   each mode (the other mode's list hidden), stops for good after a control, reaches its last step, and a list click jumps to its step;
// - every split is two columns at 1400 px; no errors, NaN, undefined or sideways scroll in any tab;
// - under prefers-reduced-motion nothing moves by itself;
// - the numbers the stage's step list states match the scene's own arithmetic (the columns it draws).
// Writes mid-step and last-step screenshots of the stage, the animation and every split.
// usage (from the repo root): node technical_knowledge_base/whats_new/tech_news/2026_09_28_tech_news/src/check_stages.mjs [shots dir]
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
// At a glance: strip; Top stories: price, share, science costs; Research: JitMem; Dev tools: Fusion stage, bits per weight; Talk: Ord
const EXPECT_SPLITS = { 't-read': 1, 't-top': 3, 't-research': 1, 't-dev': 2, 't-talk': 1 };
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) {} }); await p.goto(file); await wait(300);
  const tag = `${scheme} ${width}`;
  const clk = sel => p.$eval(sel, e => e.click());
  for (const t of await p.$$eval('#tabs button', bs => bs.map(b => b.dataset.t))) {
    await clk(`#tabs button[data-t=${t}]`); await wait(300);
    const splits = await p.$$eval(`#${t} .s3sp`, ss => ss.map(s => { const L = s.querySelector(':scope > .s3L'), R = s.querySelector(':scope > .s3R'); if (!L || !R) return 'missing column';
      const a = L.getBoundingClientRect(), r = R.getBoundingClientRect(); return { id: s.id, side: r.left >= a.right - 1 && r.width > 200 && a.width > 200 } }));
    if (splits.length !== (EXPECT_SPLITS[t] || 0)) problems.push(`${tag} ${t}: ${splits.length} splits, expected ${EXPECT_SPLITS[t] || 0}`);
    splits.forEach((s, i) => { if (s === 'missing column') problems.push(`${tag} ${t}: split ${i + 1} lacks a column`); else if (width >= 1100 && !s.side) problems.push(`${tag} ${t}: split ${i + 1} is not two columns`) });
    // the 3D stage
    for (const id of await p.$$eval(`#${t} .stg`, xs => xs.map(x => x.id))) {
      checked++;
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
      const f1 = await p.$eval('#' + id, e => +e.dataset.frames || 0);
      if (!(f1 > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
      if (!await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent))) problems.push(`${tag}: ${id} is not playing after scrolling into view`);
      const n = await p.$eval(`#${id}-r`, e => +e.max + 1);
      const lis = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return l ? l.children.length : 0 });
      if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but ${lis} list items`);
      await p.evaluate(() => window.scrollTo(0, 0)); await wait(400);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800);
      const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0); if (d1 !== d0) problems.push(`${tag}: ${id} kept drawing off screen (${d1 - d0})`);
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(200);
      await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
      for (let k = 1; k < n; k++) { await clk(`#${id}-f`); await wait(80); if (k === 3) { await wait(2600); await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-mid-${scheme}-${width}.png` }) } }
      await wait(2600);
      const shown = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (shown !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on "${shown}"`);
      const on = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return [...l.children].findIndex(x => x.classList.contains('on')) });
      if (on !== n - 1) problems.push(`${tag}: ${id} list marks item ${on + 1} at the last step`);
      if (await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent))) problems.push(`${tag}: ${id} still playing after a reader control`);
      const tab = await p.$eval('#fuTab', e => e.textContent); if (!/After turn 12/.test(tab)) problems.push(`${tag}: the stage's table does not show turn 12 at the last step`);
      await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-last-${scheme}-${width}.png` });
    }
    // the 2D animation (makeAnim): JitMem, two modes
    if (await p.$(`#${t} #v-jit`)) {
      checked++;
      const card = '#v-jit';
      await p.$eval(card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      if (!await p.$eval('#jtPlay', e => /Pause/.test(e.textContent))) problems.push(`${tag}: v-jit is not playing after scrolling into view`);
      if (!(await p.$eval(card, e => +e.dataset.frames || 0) > 0)) problems.push(`${tag}: v-jit drew no frames in view`);
      if (!await p.$eval(card, e => e.dataset.playing === '1')) problems.push(`${tag}: v-jit lacks data-playing while playing`);
      // off screen: no frames
      await p.evaluate(() => window.scrollTo(0, 0)); await wait(300);
      const fa = await p.$eval(card, e => +e.dataset.frames || 0); await wait(700); const fb = await p.$eval(card, e => +e.dataset.frames || 0);
      if (fb !== fa) problems.push(`${tag}: v-jit kept animating off screen (${fb - fa})`);
      await p.$eval(card, e => e.scrollIntoView({ block: 'center' })); await wait(300);
      for (const m of ['write', 'read']) {
        await p.$eval(`#jtM button[data-m=${m}]`, e => e.click()); await wait(400);
        const st = await p.evaluate(m => { const n = +document.getElementById('jtScrub').max / 100, l = document.getElementById('sx-jt-' + m), o = document.getElementById('sx-jt-' + (m === 'write' ? 'read' : 'write'));
          return { n, lis: l.children.length, hid: l.hidden, ohid: o.hidden } }, m);
        if (st.lis !== st.n) problems.push(`${tag}: v-jit ${m} has ${st.n} steps but ${st.lis} list items`);
        if (st.hid || !st.ohid) problems.push(`${tag}: v-jit ${m} shows the wrong step list`);
        if (!await p.$eval('#jtPlay', e => /Pause/.test(e.textContent))) problems.push(`${tag}: v-jit ${m} did not replay after the mode switch`);
        if (m === 'read') { await wait(2600); if (width >= 1100 || width < 500) await (await p.$('#sp-jit')).screenshot({ path: `${shots}/anim-jit-mid-${scheme}-${width}.png` }) }
        // a list click jumps there and stops for good
        await p.$eval(`#sx-jt-${m} li:nth-child(2)`, e => e.click()); await wait(200);
        const s2 = await p.$eval('#jtStep', e => e.textContent); if (!/step 2 of/.test(s2)) problems.push(`${tag}: v-jit ${m} list click shows "${s2}"`);
        if (await p.$eval('#jtPlay', e => /Pause/.test(e.textContent))) problems.push(`${tag}: v-jit ${m} still playing after a list click`);
        for (let k = 0; k < st.n; k++) { await clk('#jtFwd'); await wait(40) }
        await wait(300);
        const s3 = await p.$eval('#jtStep', e => e.textContent); if (!s3.includes(`step ${st.n} of ${st.n}`)) problems.push(`${tag}: v-jit ${m} ended on "${s3}"`);
        const on = await p.$eval(`#sx-jt-${m}`, l => [...l.children].findIndex(x => x.classList.contains('on'))); if (on !== st.n - 1) problems.push(`${tag}: v-jit ${m} list marks item ${on + 1} at the last step`);
        const f0 = await p.$eval(card, e => +e.dataset.frames || 0); await wait(1200); const f2 = await p.$eval(card, e => +e.dataset.frames || 0);
        if (f2 !== f0) problems.push(`${tag}: v-jit ${m} moved after a reader control`);
      }
    }
    // screenshots of every split at 1400 light and 390 dark
    if (width !== 920) for (const s of splits) if (s.id && s.id !== 'sp-jit') { const el = await p.$('#' + s.id); await el.scrollIntoView(); await wait(250); await el.screenshot({ path: `${shots}/split-${s.id}-${scheme}-${width}.png` }) }
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
  await p.$eval('#tabs button[data-t=t-dev]', e => e.click()); await wait(300);
  await p.$eval('#stg-fusion', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
  const d0 = await p.$eval('#stg-fusion', e => +e.dataset.draws || 0); await wait(800); const d1 = await p.$eval('#stg-fusion', e => +e.dataset.draws || 0);
  const f = await p.$eval('#stg-fusion', e => +e.dataset.frames || 0), pl = await p.$eval('#stg-fusion-p', e => /Pause/.test(e.textContent));
  if (f > 0 || pl || d1 !== d0) problems.push(`reduced motion: stg-fusion moved by itself (frames ${f}, redraws ${d1 - d0})`);
  await p.$eval('#tabs button[data-t=t-research]', e => e.click()); await wait(300);
  await p.$eval('#v-jit', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
  const jf = await p.$eval('#v-jit', e => +e.dataset.frames || 0), jp = await p.$eval('#jtPlay', e => /Pause/.test(e.textContent)), js = await p.$eval('#jtStep', e => e.textContent);
  if (jf > 0 || jp || !/step 1 of/.test(js)) problems.push(`reduced motion: v-jit moved by itself (frames ${jf}, "${js}")`);
  await p.$eval('#jtM button[data-m=read]', e => e.click()); await wait(1200);
  const jf2 = await p.$eval('#v-jit', e => +e.dataset.frames || 0), jp2 = await p.$eval('#jtPlay', e => /Pause/.test(e.textContent));
  if (jf2 > 0 || jp2) problems.push('reduced motion: v-jit played after a mode switch');
  await p.close() }
{ // the numbers in the stage's step list are the scene's own arithmetic
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 }); await p.goto(file); await wait(500);
  const bad = await p.evaluate(() => { const D = window.TN_FUSION, bad = [], L = [...document.getElementById('sx-fusion').children].map(li => li.textContent);
    const has = (i, x) => { if (!L[i].includes(x)) bad.push(`step ${i + 1} lacks "${x}"`) };
    if (L.length !== D.STEPS.length) bad.push(`${L.length} list items, expected ${D.STEPS.length}`);
    const at = (T, x) => T.find(u => u.x === x);
    has(0, at(D.ONE, 1).fresh + 'K starting context');
    has(1, [2, 3, 4].map(x => at(D.ONE, x).ctx + 'K').join(', ')); has(1, at(D.ONE, 2).fresh + 'K a turn'); has(1, '2K brief');
    const s5 = at(D.FU, 5); has(2, s5.ctx + 'K, read once'); if (s5.cached !== 0) bad.push('sidekick turn 5 is not cold');
    const r7 = at(D.ROUTE, 7), r10 = at(D.ROUTE, 10);
    if (!r7.miss || !r10.miss) bad.push('the switching row lacks its two misses');
    has(3, r7.fresh + 'K history'); has(5, r10.fresh + 'K history'); has(4, at(D.ROUTE, 8).fresh + 'K a turn');
    has(6, at(D.FU, 11).fresh + 'K result');
    const one = D.sums(D.ONE, 12), ro = D.sums(D.ROUTE, 12), fu = D.sums(D.FU, 12);
    has(7, `One model: ${one.total}K of input, ${one.cached}K of it from cache (${one.hit}%)`);
    has(7, `the same ${ro.total}K, but ${ro.fresh}K at full price (${ro.hit}% from cache) after two full re-reads`); if (ro.miss !== 2) bad.push('switching misses ' + ro.miss);
    has(7, `Fusion: ${fu.total}K, ${fu.cached}K from cache (${fu.hit}%)`); if (fu.miss || one.miss) bad.push('a re-read outside the switching row');
    if (!(fu.hit < one.hit)) bad.push('step 8 says Fusion\'s hit rate is below one model\'s');
    return bad });
  bad.forEach(x => problems.push('step list: ' + x));
  console.log('step-list number checks: 8 steps against the scene\'s columns');
  await p.close() }
await b.close();
console.log('animations and stages checked', checked, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
