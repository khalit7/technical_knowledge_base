// The 2026-11-06 layout and motion checks for the Mamba page (after FlashAttention's), at 1400 px light, 920 px light and 390 px dark:
// the three 3D stages (#stg-cache: the KV cache against a fixed state at 2.8B scale; #stg-sel: Selective Copying through the trained toys,
// two modes with a step list each; #stg-fuse: the scan's HBM traffic, naive against fused) and the two 2D animations (#scn: loop against
// Blelloch scan, two modes; #thn: Then and now) each play by themselves once scrolled into view, step to their last step, and have exactly
// one step-list item per step in every mode; the stages' flows stop drawing off screen; a reader control stops autoplay; at 1400 px every
// split shows two columns; no errors, NaN, undefined or sideways scroll; under prefers-reduced-motion nothing moves by itself; and the
// numbers the step lists state match the page's data (PAPER.rc: mem_28, probe, io_fig8, hybrids; the shipped toys' results; the live run).
// Writes a mid-step and a last-step screenshot of each stage (each mode).
// usage (from the repo root): node technical_knowledge_base/whats_new/papers/mamba/src/check_stages.mjs [shots dir]
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
const STAGE_MODES = { 'stg-sel': ['selM', { s6: 'sx-sel-s6', s4: 'sx-sel-s4' }] };
const TWEEN = { 'stg-cache': 2700, 'stg-sel': 2900, 'stg-fuse': 1700 };
const ANIMS = { scn: ['t-read', { seq: 'sx-scn-seq', par: 'sx-scn-par' }], thn: ['t-then', { x: 'sx-thn' }] };
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await wait(300);
  const tag = `${scheme} ${width}`;
  const clk = sel => p.$eval(sel, e => e.click());
  const visList = id => p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelectorAll('ol.sx:not([hidden])'); return [l.length, l[0] ? l[0].children.length : 0, l[0] ? l[0].id : '', l[0] ? [...l[0].children].findIndex(x => x.classList.contains('on')) : -1] });
  const stepThrough = async (id, n, name) => {
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    for (let k = 1; k < n; k++) { await clk(`#${id}-f`); await wait(80); if (k === Math.floor(n / 2)) { await wait(TWEEN[id] / 2); await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${name}-mid-${scheme}-${width}.png` }) } }
    await wait(TWEEN[id]);
    const shown = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (shown !== `step ${n} of ${n}`) problems.push(`${tag}: ${name} ended on "${shown}"`);
    const [, , , on] = await visList(id); if (on !== n - 1) problems.push(`${tag}: ${name} list marks item ${on + 1} at the last step`);
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
      const [nl, lis] = await visList(id);
      if (nl !== 1 || lis !== n) problems.push(`${tag}: ${id} has ${n} steps but ${nl} visible lists with ${lis} items`);
      // flows stop drawing off screen (the top of the tab is far from every stage but the first; scroll the other way for that one)
      await p.evaluate(id => window.scrollTo(0, id === 'stg-cache' ? document.documentElement.scrollHeight : 0), id); await wait(500);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800);
      const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0); if (d1 !== d0) problems.push(`${tag}: ${id} kept drawing off screen (${d1 - d0})`);
      // a reader control stops autoplay for good; step to the last step through the forward button
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(200);
      await stepThrough(id, n, id + (STAGE_MODES[id] ? '-s6' : ''));
      const still = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent)); if (still) problems.push(`${tag}: ${id} still playing after a reader control`);
      if (STAGE_MODES[id]) {
        const [seg, lists] = STAGE_MODES[id];
        for (const m of ['s4', 's6']) {
          const f0 = await p.$eval('#' + id, e => +e.dataset.frames || 0);
          await clk(`#${seg} button[data-m=${m}]`); await wait(2600);
          const f1m = await p.$eval('#' + id, e => +e.dataset.frames || 0), plm = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent));
          if (!(f1m > f0) || !plm) problems.push(`${tag}: ${id} did not replay after switching to ${m}`);
          const nm = await p.$eval(`#${id}-r`, e => +e.max + 1), lm = await visList(id);
          if (lm[0] !== 1 || lm[1] !== nm) problems.push(`${tag}: ${id} ${m}: ${lm[0]} visible lists, ${lm[1]} items for ${nm} steps`);
          if (lm[2] !== lists[m]) problems.push(`${tag}: ${id}: the visible list is ${lm[2]}, not ${lists[m]}`);
          await stepThrough(id, nm, id + '-' + m);
        }
      }
    }
    // 2D animations: autoplay on view, one list item per step in each mode, last step reached
    for (const [id, [tab, lists]] of Object.entries(ANIMS)) {
      if (tab !== t) continue; checked++;
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2000);
      if (!(await p.$eval('#' + id, e => +e.dataset.frames || 0)) || !(await p.$eval(`#${id}Play`, e => /Pause/.test(e.textContent)))) problems.push(`${tag}: ${id} did not play when scrolled into view`);
      for (const m of Object.keys(lists)) {
        if (Object.keys(lists).length > 1) { await clk(`#${id}M button[data-m=${m}]`); await wait(200) }
        const n = await p.$eval(`#${id}Scrub`, e => e.max / 100);
        const L = await p.$$eval('ol.sx:not([hidden])', (ls, want) => ls.filter(l => l.id === want).map(l => l.children.length), lists[m]);
        if (L.length !== 1 || L[0] !== n) problems.push(`${tag}: ${id} ${m}: ${n} steps, list ${lists[m]} visible ${L.length} with ${L[0]} items`);
        await p.evaluate(id => { const e = document.getElementById(id + 'Scrub'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
        for (let k = 1; k < n; k++) await clk(`#${id}Fwd`);
        const on = await p.$eval('#' + lists[m], l => [...l.children].findIndex(x => x.classList.contains('on'))); if (on !== n - 1) problems.push(`${tag}: ${id} ${m} list marks item ${on + 1} at the last step`);
        if (await p.$eval(`#${id}Play`, e => /Pause/.test(e.textContent))) problems.push(`${tag}: ${id} still playing after a reader control`);
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
  for (const [t, ids] of [['t-read', ['stg-cache', 'stg-sel', 'stg-fuse', 'scn']], ['t-then', ['thn']]]) {
    await p.$eval(`#tabs button[data-t=${t}]`, e => e.click()); await wait(300);
    for (const id of ids) {
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      const stg = await p.$eval('#' + id, e => e.classList.contains('stg'));
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800); const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0);
      const f = await p.$eval('#' + id, e => +e.dataset.frames || 0), pl = await p.$eval(stg ? `#${id}-p` : `#${id}Play`, e => /Pause/.test(e.textContent));
      if (f > 0 || pl || d1 !== d0) problems.push(`reduced motion: ${id} moved by itself (frames ${f}, redraws ${d1 - d0})`) } }
  await p.close() }
{ // the numbers the step lists state are the page's data
  const p = await b.newPage(); await p.goto(file); await wait(800);
  const r = await p.evaluate(() => {
    const bad = []; let n = 0; const f = v => v.toLocaleString('en-GB'), pc = (v, d) => (v * 100).toFixed(d == null ? (v > 0.999 && v < 1 ? 2 : 1) : d) + '%';
    const has = (list, k, s) => { n++; const li = document.getElementById(list).children[k]; if (!li || !li.textContent.includes(s)) bad.push(`${list} item ${k + 1} lacks "${s}"`) };
    const M = PAPER.rc.mem_28, MiB = 2 ** 20;
    has('sx-cache', 1, (M.kv_per_token / 1024) + ' KiB'); has('sx-cache', 3, M.crossover_tokens + ' tokens');
    has('sx-cache', 4, (M.kv_2048 / MiB) + ' MiB'); has('sx-cache', 4, (M.state_bytes / MiB).toFixed(1) + ' MiB'); has('sx-cache', 4, Math.round(M.ratio_2048) + ' times');
    const PB = PAPER.rc.probe, V = MBW.variants;
    has('sx-sel-s6', 1, PB.delta[0].data + ' against ' + PB.delta[0].noise); has('sx-sel-s6', 2, PB.corr_position_layer2 + ' with position against ' + PB.corr_is_data_layer2);
    has('sx-sel-s6', 3, pc(PB.base) + ' to ' + pc(PB.freeze_delta_layer1)); has('sx-sel-s6', 3, pc(PB.freeze_delta_layer2)); has('sx-sel-s6', 3, 'layer 1 gives ' + pc(PB.freeze_B_layer1)); has('sx-sel-s6', 3, 'layer 2 ' + pc(PB.freeze_C_layer2));
    has('sx-sel-s6', 6, pc(V.sc_s6.res_q.tok) + ' of copied tokens and ' + pc(V.sc_s6.res_q.seq)); has('sx-sel-s4', 6, pc(V.sc_s4.res_q.tok) + ' of copied tokens and ' + pc(V.sc_s4.res_q.seq));
    // the live answers written into the lists are the live run's
    const S = window.__selScene; ['s6', 's4'].forEach(m => { n++; const sp = document.querySelector('.selOk[data-m=' + m + ']'), run = S.runs[m];
      const ok = run.pred.filter((p, i) => p === S.inp.y[i]).length; if (sp.textContent !== String(ok) || run.ok !== ok) bad.push(`answers on this input (${m}): list ${sp.textContent}, run ${ok}`) });
    // the scan's traffic: the scene's counts are recompute.py's, and the list quotes them
    const F = PAPER.rc.io_fig8, X = window.__fuse; n += 3;
    if (X.naive !== F.naive) bad.push(`naive ${X.naive} against recompute ${F.naive}`); if (X.fused !== F.fused) bad.push(`fused ${X.fused} against recompute ${F.fused}`); if (X.ratio !== F.ratio) bad.push(`ratio ${X.ratio} against ${F.ratio}`);
    has('sx-fuse', 1, f(X.ph.read) + ' elements'); has('sx-fuse', 1, f(X.ph.read + X.ph.disc)); has('sx-fuse', 2, f(X.ph.read + X.ph.disc + X.ph.scan)); has('sx-fuse', 3, f(F.naive) + ' elements');
    has('sx-fuse', 5, f(F.fused) + ' elements, ' + F.ratio + ' times fewer'); has('sx-fuse', 0, f(F.L)); has('sx-fuse', 0, f(F.D));
    // Then and now: one item per model, named in order
    const H = PAPER.rc.hybrids; H.forEach((h, k) => has('sx-thn', k, h.name + '.'));
    n++; if (document.getElementById('sx-thn').children.length !== H.length) bad.push('sx-thn length');
    return { bad, n } });
  r.bad.forEach(x => problems.push('numbers: ' + x)); console.log('step-list numbers checked', r.n);
  await p.close() }
await b.close();
console.log('stages and animations checked', checked, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
