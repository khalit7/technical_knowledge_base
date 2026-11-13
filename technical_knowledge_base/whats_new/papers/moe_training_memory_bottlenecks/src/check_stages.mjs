// The 2026-11-06 layout and motion checks for the MoE memory-bottlenecks paper page, at 1400 px light, 920 px light and 390 px dark:
// the three 3D stages (#stg-pk, one GPU at two moments of a step with the four operators switched on in turn; #stg-dsx, one MoE layer's
// send matrices chunk by chunk, strided and contiguous; #stg-rgx, Ring-DTP on four ranks, three schedules) and the two 2D step animations
// (#scx, SCO's boundaries, four host budgets sharing one list; #osx, the optimizer stream, stream and CPU lists) each play by themselves once
// scrolled into view, step to their last step, and have exactly one step-list item per step in every mode; flows stop drawing off screen;
// at 1400 px every split shows two columns; no errors, NaN, undefined or sideways scroll; under prefers-reduced-motion nothing moves by
// itself; and the numbers the step lists state match what the stages draw (window.MM_PK from 31_js_sc_pk.js, rtData from 12b_js_route.js,
// window.__ringCheck from 33_js_sc_rgx.js), recomputed here independently where cheap. Writes a mid-step screenshot of each stage and animation.
// usage (from the repo root): node technical_knowledge_base/whats_new/papers/moe_training_memory_bottlenecks/src/check_stages.mjs [shots dir]
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
const ANIMS = { scx: 't-read', osx: 't-read' };
const STAGE_MODES = { 'stg-dsx': 'dsxM', 'stg-rgx': 'rgxM' }; // the mode toggle swaps the stage's step list and replays it
const COUNTERS = { 'stg-pk': ['pkCnt', /Inside an MoE layer[\s\S]*Rough peak/], 'stg-dsx': ['dsxCnt', /Busiest destination now[\s\S]*Peak so far/], 'stg-rgx': ['rgxCnt', /Live logits per rank[\s\S]*Loss against dense/] };
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await wait(300);
  await p.$$eval('.pred .skip', bs => bs.forEach(b => b.click()));
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
      return { bad: (txt.match(/.{0,30}(?<![-\w])(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth } }, t);
    if (r.bad.length) problems.push(`${tag} ${t}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${t}: sideways scroll`);
  }
  const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) problems.push(`${tag}: error box: ${box}`);
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file); await p.$$eval('.pred .skip', bs => bs.forEach(b => b.click()));
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
  const raw = fs.readFileSync(path.resolve(here, '../index.html'), 'utf8');
  // the step texts as written (before any script fills a span), for the stage defaults
  const staticPk = {}; for (const m of raw.matchAll(/<span data-pk="(\w+)">([^<]*)<\/span>/g)) staticPk[m[1]] = m[2];
  const p = await b.newPage(); await p.goto(file); await wait(800);
  const r = await p.evaluate(staticPk => {
    const bad = []; let n = 0; const items = id => [...(document.getElementById(id) || { children: [] }).children].map(li => li.textContent.replace(/\s+/g, ' '));
    const want = (id, i, s) => { n++; const L = items(id); if (!L[i] || !L[i].includes(s)) bad.push(id + ' item ' + (i + 1) + ': expected "' + s + '"') };
    const cm = v => v.toLocaleString('en-GB');
    // Which peak runs out first: the written defaults equal what the model computes, and the model equals Table 1's formulas recomputed here
    const K = window.MM_PK; if (!K) return { bad: ['MM_PK missing'], n: 1 };
    n++; if (K.model !== 'm667' || K.N !== 65536) bad.push('the towers do not open on 667B at 65,536 tokens per rank');
    const live = {}; document.querySelectorAll('#sx-pk [data-pk]').forEach(el => { live[el.dataset.pk] = el.textContent });
    for (const k of Object.keys(staticPk)) { n++; if (staticPk[k] !== live[k]) bad.push('towers: written "' + staticPk[k] + '" but the model gives "' + live[k] + '" (' + k + ')') }
    const Th = 667e9, W = 64, N = 65536, H = 7168, V = 200000, nb = 78, k8 = 8, c = 6554, st = 2 * 142.076e6 * 16;
    const ind = { sb: 16 * Th / W, sa: 4 * Th / W + st, nb: nb * N * H * 2, na: 2 * N * H * 2, lb: 3 * N * V * 4, la: 4 * N * (V / 8) * 4, db: 2 * k8 * N * H * 2, da: 2 * k8 * c * H * 2 };
    for (const [k, v] of Object.entries(ind)) { n++; if (Math.abs(K.n[k] - v) > 1) bad.push('towers: ' + k + ' is ' + K.n[k] + ', Table 1 recomputed gives ' + v) }
    const top = (s, b, x) => s + b + x;
    const pk = [Math.max(top(ind.sb, ind.nb, ind.lb), top(ind.sb, ind.nb, ind.db)), Math.max(top(ind.sb, ind.nb, ind.la), top(ind.sb, ind.nb, ind.db)), Math.max(top(ind.sa, ind.nb, ind.la), top(ind.sa, ind.nb, ind.db)),
      Math.max(top(ind.sa, ind.na, ind.la), top(ind.sa, ind.na, ind.db)), Math.max(top(ind.sa, ind.na, ind.la), top(ind.sa, ind.na, ind.da))];
    pk.forEach((v, i) => { n++; if (Math.abs(K.peak[i] - v) > 1) bad.push('towers: peak after step ' + (i + 1) + ' is ' + K.peak[i] + ', recomputed ' + v) });
    n++; if (!(pk[2] > 141e9 && pk[3] < 141e9 && pk[1] > 141e9)) bad.push('towers: "still over" after step 3 and "fit" after step 4 no longer hold at the defaults');
    n++; if (Math.abs(K.n.ho - (12 * Th / W + ind.nb)) > 1) bad.push('towers: host total');
    n++; if (items('sx-pk').length !== 6) bad.push('towers: 6 steps');
    // Expert dispatch: the replay's numbers on 50% / 4 (the default) and the other profiles
    const S = rtData(3), B = RT.bound;
    n++; if (B !== 8 * 8 * 6554 || RT.c !== 6554) bad.push('dispatch: the bound is not 8 x 8 x 6,554');
    want('sx-dsx', 0, '524,288 routes'); want('sx-dsx', 0, 'c = 6,554'); n++; if (Math.max(...S.recv(S.whole)) !== 524288 || Math.min(...S.recv(S.whole)) !== 524288) bad.push('dispatch: LLEP does not give every destination 524,288');
    want('sx-dsx', 1, cm(S.maxRecv.str) + ' routes (on 50% / 4'); want('sx-dsx', 1, S.ratio.str.toFixed(2) + ' times its mean'); n++; if (Math.abs(S.ratio.str - S.ratio.llep) > .005) bad.push('dispatch: strided ratio differs from the whole batch\'s');
    want('sx-dsx', 2, cm(S.maxRecv.cont) + ' routes to one destination'); want('sx-dsx', 2, S.ratio.cont.toFixed(2) + ' times its mean');
    let worst = 0; for (let i = 0; i < 5; i++) worst = Math.max(worst, rtData(i).maxRecv.str / B); want('sx-dsx', 3, (100 * worst).toFixed(1) + '% of the guarantee');
    want('sx-dsx', 3, (100 * S.maxRecv.cont / B).toFixed(1) + '% on 50% / 4'); want('sx-dsx', 3, Math.round(100 * rtData(4).maxRecv.cont / B) + '% on 30% / 16');
    want('sx-dsx', 4, cm(B) + ' routes'); want('sx-dsx', 4, Math.round(100 * B / 524288) + '% of the whole batch');
    n++; if (items('sx-dsx').length !== 5) bad.push('dispatch: 5 steps');
    // Ring-DTP: exact against dense, list lengths
    const rc = window.__ringCheck(); n++; if (!(rc.wts < 1e-12 && rc.act < 1e-12)) bad.push('ring: losses differ from dense by ' + JSON.stringify(rc));
    n++; if (items('sx-rgx-wts').length !== 5 || items('sx-rgx-act').length !== 5 || items('sx-rgx-dense').length !== 3) bad.push('ring: list lengths');
    // SCO and the optimizer stream
    want('sx-scx', 0, '21 boundaries at 8 GiB, 42 at 16 GiB'); n++; if (Math.floor(8 / (557056 / 8 * 2880 * 2 / 2 ** 30)) !== 21 || Math.floor(16 / (557056 / 8 * 2880 * 2 / 2 ** 30)) !== 42) bad.push('SCO: 21 and 42 do not recompute');
    want('sx-scx', 3, '139.790 GiB with checkpointing only, 133.546 at 8 GiB, 125.677 at 16 GiB and 123.728');
    n++; if (items('sx-scx').length !== 4 || items('sx-osx').length !== 4 || items('sx-osx-cpu').length !== 2) bad.push('SCO and optimizer list lengths');
    want('sx-osx', 2, '1.930 against 1.951 s'); want('sx-osx-cpu', 1, '3.95 s');
    return { bad, n } }, staticPk);
  r.bad.forEach(x => problems.push('step list number: ' + x)); console.log('step-list numbers checked', r.n);
  await p.close() }
await b.close();
console.log('stages and animations checked', checked, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
