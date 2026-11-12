// The 2026-11-06 rollout checks for Streams, CUDA graphs and multi-GPU programming (2026-11-12), adapted from Profiling and correctness's check_stages.mjs:
// the three 3D stages (Fig. 1 the chunked copy pipeline, Fig. 2 twenty kernels launched three ways, Fig. 3 one DDP step on a ring of GPUs) play by
// themselves once scrolled into view, step to their last step with one step-list item per step in every mode, stop redrawing off screen and never
// move under reduced motion; each mode switch swaps the step list and replays; no errors, NaN, undefined or sideways scroll; splits are two columns
// at 1400 px and one below 1100 px; scene labels do not overlap each other, leave or touch the card at 1400 px, mid-step and at the end of each step;
// every number in the step lists equals a value recomputed here from window.SG (recompute.py's data), not from the scenes' own code, and the
// scenes' schedules end where the data says.
// usage (from the repo root or anywhere): node technical_knowledge_base/systems_and_performance/topic_cuda_and_gpu_programming/streams_graphs_and_multi_gpu/src/check/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../../index.html'), shots = process.argv[2] || path.resolve(here, '../../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = [['stg-pipe', 'sx-pipe'], ['stg-launch', 'sx-ln-sync'], ['stg-ring', 'sx-ring-serial']];
// mode switches: the default mode last (it was stepped already)
const MODES = [['stg-launch', 'sg-ln-mode', [['stream', 'sx-ln-stream'], ['graph', 'sx-ln-graph'], ['sync', 'sx-ln-sync']]],
  ['stg-ring', 'sg-ring-mode', [['overlap', 'sx-ring-overlap'], ['serial', 'sx-ring-serial']]]];
const SPLITS = 14;
const wait = ms => new Promise(r => setTimeout(r, ms));
const problems = [];
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(400);
  const tag = `${scheme} ${width}`, shoot = width === 1400 || width === 390, full = width === 1400;
  const audit = async (where, tab = 't-read') => {
    const r = await p.evaluate(tab => { const c = document.getElementById(tab).cloneNode(true); c.querySelectorAll('pre,code').forEach(x => x.remove());
      return { bad: c.innerText.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || [], side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } }, tab);
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  // labels drawn in the canvas: boxes from the renderer's own label list, measured with the same font, must not overlap, leave or touch the card
  const overlaps = async (id, where) => {
    if (width !== 1400) return;
    const r = await p.evaluate(id => { const st = (window.SGSTG || {})[id]; if (!st) return null; const cv = st.host.querySelector('canvas'), cx = cv.getContext('2d'), W = cv.clientWidth, H = cv.clientHeight;
      const boxes = [], out = [];
      (st.R.lab || []).forEach(L => { if (L.a < .35) return; const o = L.o, fs = Math.max(12, o.fs || 12.5); cx.font = (o.b ? '600 ' : '') + fs + 'px ' + (o.mono ? 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace' : 'ui-sans-serif,-apple-system,"Segoe UI",Helvetica,Arial,sans-serif');
        const w = cx.measureText(L.text).width, x0 = o.al === 'right' ? L.x - w : o.al === 'left' ? L.x : L.x - w / 2; boxes.push([x0, L.y - fs / 2, x0 + w, L.y + fs / 2, L.text]);
        if (x0 < 3 || x0 + w > W - 3 || L.y - fs / 2 < 2 || L.y + fs / 2 > H - 2) out.push('outside or touching the card: ' + L.text) });
      for (let i = 0; i < boxes.length; i++)for (let j = i + 1; j < boxes.length; j++) { const A = boxes[i], B = boxes[j], ox = Math.min(A[2], B[2]) - Math.max(A[0], B[0]), oy = Math.min(A[3], B[3]) - Math.max(A[1], B[1]);
        if (ox > 2 && oy > 2) out.push(A[4] + ' / ' + B[4]) }
      return out }, id);
    if (r === null) { problems.push(`${tag}: ${id} is not registered in window.SGSTG`); return }
    r.forEach(x => problems.push(`${tag}: ${id} ${where}: labels overlap or leave the card: ${x}`));
  };
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (cols.length !== SPLITS || cols.some(c => c !== 'grid'))) problems.push(`${tag}: splits are not ${SPLITS} two-column grids (${cols.length}: ${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  if (width === 1400) {
    const over = await p.$$eval('#t-read .s3R', xs => xs.map(x => { const r = x.getBoundingClientRect(), k = x.firstElementChild && x.firstElementChild.getBoundingClientRect(); return k && r.width && (k.right > r.right + 1 || k.left < r.left - 1) ? x.innerHTML.slice(0, 40) : '' }).filter(Boolean));
    over.forEach(o => problems.push(`${tag}: right-column content wider than its column: ${o}`));
    // every derived number in the step lists against a value recomputed here from window.SG
    const r = await p.evaluate(() => { const out = [], S = SG, P = S.pipe, B = S.blog, st = S.step, MiB = 1048576, txt = el => el.textContent.trim();
      const want = (k, v) => { const els = [...document.querySelectorAll(`[data-sgd="${k}"]`)]; if (!els.length) out.push(`no element shows ${k}`); els.forEach(e => { if (txt(e) !== v) out.push(`${k}: page says ${txt(e)}, recomputed ${v}`) }) };
      const ar = bytes => bytes * 2 * (st.cfg.gpus - 1) / st.cfg.gpus / st.cfg.busbw * 1e3;
      want('chunk_ms', (P.h2d_ms / 8).toFixed(2)); want('chunk_k_ms', (P.k_ms / 8).toFixed(2)); want('pipe_speedup', (P.serial_ms / P.pipe8_ms).toFixed(2));
      want('copies_ms', (P.h2d_ms + P.d2h_ms).toFixed(2)); want('sm_pct', String(Math.round(100 * P.k_ms / P.pipe8_ms)));
      want('ln_busy_sync', String(Math.round(100 * B.kernel / B.sync_each))); want('ln_idle', (B.launch_cpu - B.kernel).toFixed(1));
      want('ln_x_stream', (B.step_us.sync_each / B.step_us.stream).toFixed(1)); want('ln_graph_first', (B.launch_cpu + B.n * B.kernel + (B.n - 1) * B.graph_gap).toFixed(1));
      want('ln_busy_graph', String(Math.round(100 * B.kernel / B.graph)));
      const bk = st.overlap.buckets; want('b1_mib', (bk[0][1] / MiB).toFixed(1)); want('b2_mib', (bk[1][1] / MiB).toFixed(1));
      if (!bk.slice(1, 6).every(x => x[1] === bk[1][1])) out.push('buckets 2 to 6 are not all the same size');
      want('ar1_ms', ar(bk[0][1]).toFixed(1)); want('ar2_ms', ar(bk[1][1]).toFixed(1)); want('b_gap_ms', (bk[1][0] - bk[0][0]).toFixed(1));
      if (Math.abs(st.serial.comm / st.serial.total - .25) > .02) out.push('Fig. 3: communication is no longer a quarter of the serial step');
      // the scenes' schedules end where the data says
      const two = SGPIPE(8, true).T, one = SGPIPE(8, false).T;
      if (two.toFixed(2) !== P.pipe8_ms.toFixed(2) || one.toFixed(2) !== P.pipe8_one_engine_ms.toFixed(2)) out.push(`Fig. 1 schedules end at ${two}, ${one}, data ${P.pipe8_ms}, ${P.pipe8_one_engine_ms}`);
      const S1 = window.SG_PIPE3.SCH; if (Math.abs(S1.one.T - P.serial_ms) > .006) out.push('Fig. 1 one-stream schedule ends at ' + S1.one.T);
      for (let k = 1; k <= 16; k++) if (SGPIPE(k, false).T < .9 * P.serial_ms) out.push('one engine falls below 90% of serial at ' + k + ' chunks');
      const L3 = window.SG_LN3.MOD; if (Math.abs(L3.sync.total - B.step_us.sync_each) > 1e-6) out.push('Fig. 2 sync total ' + L3.sync.total);
      const R3 = window.SG_RING3; ['serial', 'overlap'].forEach(m => { if (Math.abs(R3[m].r.total - st[m].total) > 1e-3) out.push(`Fig. 3 ${m} total ${R3[m].r.total} against ${st[m].total}`);
        if (R3[m].win[R3[m].win.length - 1][1].toFixed(3) !== st[m].total.toFixed(3)) out.push(`Fig. 3 ${m} last window does not end the step`) });
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  // every stage plays once scrolled into view
  for (const [id] of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
    if (shoot) { await wait(300); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-autoplay-${scheme}-${width}.png` }) }
  }
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  const stepAll = async (id, lid, label) => {
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length);
    if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but list ${lid} shows ${lis}`);
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' }));
    for (let k = 0; k < n; k++) {
      if (k) await p.$eval(`#${id}-f`, e => e.click());
      if (full) {
        await wait(1200); await overlaps(id, `${label} step ${k + 1} mid-step`); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${label}-s${k + 1}-mid-${scheme}-${width}.png` });
        await wait(3000); await overlaps(id, `${label} step ${k + 1}`); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${label}-s${k + 1}-${scheme}-${width}.png` })
      } else if (shoot && k === Math.floor(n / 2)) { await wait(2400); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${label}-s${k + 1}-${scheme}-${width}.png` }) }
      else await wait(150);
    }
    await wait(1500);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id}${label} ended on ${sh}`);
    await audit(`${id}${label} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id}${label} list does not mark the last step`);
  };
  for (const [id, lid] of STAGES) await stepAll(id, lid, '');
  for (const [id, seg, ms] of MODES) for (const [m, lid] of ms) {
    await p.$eval(`#${seg} button[data-m="${m}"]`, e => e.click()); await wait(200);
    const st = await p.$eval(`#${id} .stg-st`, e => e.textContent), vis = await p.$eval('#' + lid, e => !e.hidden);
    const others = await p.evaluate((ms, lid) => ms.filter(x => x[1] !== lid).map(x => document.getElementById(x[1]).hidden), ms, lid);
    if (!/^step 1 of/.test(st) || !vis || others.some(h => !h)) problems.push(`${tag}: ${id} mode ${m} did not swap to ${lid} (${st})`);
    if (m !== ms[ms.length - 1][0]) await stepAll(id, lid, '-' + m);
  }
  await audit('end');
  await p.click('#tabs button[data-t="t-more"]'); await wait(300); await audit('t-more', 't-more');
  await p.click('#tabs button[data-t="t-read"]');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file);
  for (const [id] of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1400);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
