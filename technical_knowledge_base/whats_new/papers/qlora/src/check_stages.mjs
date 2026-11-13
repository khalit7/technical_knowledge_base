// The 2026-11-06 layout and motion checks for the QLoRA paper page, at 1400 px light, 920 px light and 390 px dark:
// the four 3D stages (#stg-eq5, Fig. 2, Equation 5 on 1,024 real LLaMA-7B weights; #stg-nf4, Fig. 4, NF4's levels against them; #stg-dq, Fig. 5,
// double quantisation of 512 real block constants; #stg-pg, Fig. 6, memory to scale and paging on LLaMA 65B, two modes) and the 2D step
// animation (#qb, Fig. 3, one block through three 4-bit types, three modes sharing one list) each play by themselves once scrolled into view,
// step to their last step, and have exactly one step-list item per step in every mode; flows stop drawing off screen; at 1400 px every split
// shows two columns; no errors, NaN, undefined or sideways scroll; under prefers-reduced-motion nothing moves by itself; and the numbers the
// step lists state match the data the stages draw (window.QL_EQ5, QL_NF4, QL_DQ, QL_PG, computed by the scenes from QD with the page's
// engine QE), with the key ones recomputed here independently from QD.
// Writes a mid-step screenshot of each stage and animation.
// usage (from the repo root): node technical_knowledge_base/whats_new/papers/qlora/src/check_stages.mjs [shots dir]
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
const ANIMS = { qb: 't-read' };
const STAGE_MODES = { 'stg-pg': 'pgM' }; // the mode toggle swaps the stage's step list and replays it
const COUNTERS = {};
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
{ // the numbers the step lists state are the ones the stages draw
  const p = await b.newPage(); await p.goto(file); await wait(800);
  const r = await p.evaluate(() => {
    const bad = []; let n = 0; const items = id => [...document.getElementById(id).children].map(li => li.textContent.replace(/\s+/g, ' '));
    const want = (id, i, s) => { n++; const L = items(id); if (!L[i] || !L[i].includes(s)) bad.push(id + ' item ' + (i + 1) + ': expected "' + s + '"') };
    const span = (cls, k) => { const e = document.querySelector('.' + cls + '[data-k="' + k + '"]'); return e ? e.textContent : null };
    const is = (cls, k, s) => { n++; const v = span(cls, k); if (v !== s) bad.push(cls + ' ' + k + ': page says "' + v + '", data gives "' + s + '"') };
    const E = window.QL_EQ5, F = window.QL_NF4, D = window.QL_DQ, G = window.QL_PG, cm = v => Math.round(v).toLocaleString('en-GB'), pc = (v, d) => (100 * v).toFixed(d) + '%';
    if (!E || !F || !D || !G) return { bad: ['scene data missing'], n: 1 };
    // Fig. 2
    n++; if (document.getElementById('eq5Am').textContent !== E.amlo.toFixed(4) + ' to ' + E.amhi.toFixed(4)) bad.push('eq5Am');
    want('sx-eq5', 0, cm(E.bytesCodes) + ' bytes of codes plus ' + E.bytesC2 + ' bytes'); want('sx-eq5', 0, cm(E.n) + ' weights');
    n++; if (E.deqErr > 1e-4) bad.push('Fig. 2: double-quantised constants move the weights by ' + E.deqErr);
    // Fig. 4
    is('nf4n', 'amlo', F.amlo.toFixed(4)); is('nf4n', 'amhi', F.amhi.toFixed(4)); is('nf4n', 'z', F.z.toFixed(3)); is('nf4n', 'sd', F.sd.toFixed(2)); is('nf4n', 'sdn', F.sdn.toFixed(2));
    is('nf4n', 'armin', pc(F.armin, 1)); is('nf4n', 'armax', pc(F.armax, 1)); is('nf4n', 'cmin', String(F.cmin)); is('nf4n', 'cmax', String(F.cmax));
    is('nf4n', 'err', pc(F.err, 2)); is('nf4n', 'erri', pc(F.erri, 2)); want('sx-nf4', 1, F.edge + ' of 1,024, ' + pc(F.edge / 1024, 1));
    // Fig. 5
    is('dqn', 'lo', D.lo.toFixed(4)); is('dqn', 'hi', D.hi.toFixed(4)); is('dqn', 'off', D.off.toFixed(4)); is('dqn', 'c1a', D.c1[0].toFixed(4)); is('dqn', 'c1b', D.c1[1].toFixed(4));
    is('dqn', 'err', pc(D.err, 2)); is('dqn', 'emax', pc(D.emax, 2));
    want('sx-dq', 4, D.bits1.toFixed(3) + ' bits per weight instead of ' + D.bits0); want('sx-dq', 4, (D.bits0 - D.bits1).toFixed(3) + ' bits, or ' + D.gb65.toFixed(2) + ' GB');
    // Fig. 6
    is('pgn', 'full', G.towers[0].gb.toFixed(1) + ' GB'); is('pgn', 'lora', G.towers[1].gb.toFixed(1) + ' GB'); is('pgn', 'q', G.towers[2].gb.toFixed(1) + ' GB');
    is('pgn', 'static', cm(G.static) + ' MB'); is('pgn', 'head', cm(G.head) + ' MB'); is('pgn', 'p3', cm(G.peak3) + ' MB');
    is('pgn', 'p4', cm(G.sim[4].peak) + ' MB'); is('pgn', 'e4', cm(G.sim[4].evict) + ' MB'); is('pgn', 'p6', cm(G.sim[6].peak) + ' MB'); is('pgn', 'e6', cm(G.sim[6].evict) + ' MB'); is('pgn', 'tr', cm(G.traffic) + ' MB');
    want('sx-pg-on', 1, G.f6.map(t => t.gb.toFixed(1)).slice(0, 3).join(', ') + ' and ' + G.f6[3].gb.toFixed(1) + ' GB');
    n++; if (G.firstOOM !== 4 || G.sim.some(s => s.oom)) bad.push('Fig. 6: regular run should first exceed 48 GB at mini-batch 5 and the paged run should never run out');
    want('sx-pg-off', 4, cm(G.sim[4].peak) + ' MB');
    // independent recomputes from QD and the engine (not the scenes)
    const QE = window.QE, QD = window.QD, x = Array.from(QE.decF16(QD.w[1].w)).slice(0, 1024), q = QE.quantise(x, QD.types.nf4, 64);
    n++; if (Math.abs(Math.max(...q.am) - F.amhi) > 1e-12 || Math.abs(QE.stats(x, q, QD.types.nf4).relmse - F.err) > 1e-12) bad.push('Fig. 4: recomputed block constants or error differ');
    const am = QE.decF32(QD.w[1].absmax); let mu = 0; am.forEach(v => mu += v); mu /= am.length; n++; if (Math.abs(mu - D.off) > 1e-9) bad.push('Fig. 5: mean differs');
    const F6 = QD.fig.figure6, st = F6.model_MB['65B'] + 2 * F6.adapters_MB['65B'] + F6.optimizer_MB['65B']; n++; if (st !== G.static) bad.push('Fig. 6: static memory differs');
    // step counts: Fig. 2 seven, Fig. 4 six, Fig. 5 five, Fig. 6 seven paged and five regular; Fig. 3 six
    n++; const L = ['sx-eq5', 'sx-nf4', 'sx-dq', 'sx-pg-on', 'sx-pg-off', 'sx-qb'].map(i => items(i).length).join(','); if (L !== '7,6,5,7,5,6') bad.push('step list lengths ' + L);
    return { bad, n } });
  r.bad.forEach(x => problems.push('step list number: ' + x)); console.log('step-list numbers checked', r.n);
  await p.close() }
await b.close();
console.log('stages and animations checked', checked, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
