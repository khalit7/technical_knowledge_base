// The 2026-11-06 rollout checks for Profiling, benchmarking and correctness (2026-11-10), adapted from Libraries and tensor cores' check_stages.mjs:
// the three 3D stages (Fig. 1 one matmul timed four ways, Fig. 2 one Nsight Compute report read top-down, Fig. 3 sixteen float16 numbers
// summed three ways) play by themselves once scrolled into view, step to their last step with one step-list item per step in every mode,
// stop redrawing off screen and never move under reduced motion; each mode switch swaps the step list and replays; no errors, NaN,
// undefined or sideways scroll; splits are two columns at 1400 px and one below 1100 px; scene labels do not overlap each other, leave or
// touch the card at 1400 px, at the end of each step and in the middle of its tween; every number written in the step lists equals a
// value recomputed here from the page's own data (PCD) and float16 model (FP), and the rule quotes are NVIDIA's text in the reports.
// usage (from the repo root): node technical_knowledge_base/systems_and_performance/topic_cuda_and_gpu_programming/profiling_and_correctness/src/check/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../../index.html'), shots = process.argv[2] || path.resolve(here, '../../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = [['stg-time', 'sx-tl-nosync'], ['stg-walk', 'sx-wk-0'], ['stg-sum', 'sx-sum-seq']];
// mode switches: the default mode last (it was stepped already)
const MODES = [['stg-time', 'rd-tl-mode', [['sync', 'sx-tl-sync'], ['event', 'sx-tl-event'], ['queued', 'sx-tl-queued'], ['nosync', 'sx-tl-nosync']]],
  ['stg-walk', 'rd-walk-mode', [['1', 'sx-wk-1'], ['2', 'sx-wk-2'], ['0', 'sx-wk-0']]],
  ['stg-sum', 'rd-sum-mode', [['pair', 'sx-sum-pair'], ['atom', 'sx-sum-atom'], ['seq', 'sx-sum-seq']]]];
const SPLITS = 12;
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
      return { bad: (c.innerText.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []).filter(m => !/fill it with NaN|infinite and NaN|producing NaN/.test(m)), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } }, tab);
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  // labels drawn in the canvas: boxes from the renderer's own label list, measured with the same font, must not overlap, leave or touch the card
  const overlaps = async (id, where) => {
    if (width !== 1400) return;
    const r = await p.evaluate(id => { const st = (window.PCSTG || {})[id]; if (!st) return null; const cv = st.host.querySelector('canvas'), cx = cv.getContext('2d'), W = cv.clientWidth, H = cv.clientHeight;
      const boxes = [], out = [];
      (st.R.lab || []).forEach(L => { if (L.a < .35) return; const o = L.o, fs = Math.max(12, o.fs || 12.5); cx.font = (o.b ? '600 ' : '') + fs + 'px ' + (o.mono ? 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace' : 'ui-sans-serif,-apple-system,"Segoe UI",Helvetica,Arial,sans-serif');
        const w = cx.measureText(L.text).width, x0 = o.al === 'right' ? L.x - w : o.al === 'left' ? L.x : L.x - w / 2; boxes.push([x0, L.y - fs / 2, x0 + w, L.y + fs / 2, L.text]);
        if (x0 < 5 || x0 + w > W - 5 || L.y - fs / 2 < 3 || L.y + fs / 2 > H - 3) out.push('outside or touching the card: ' + L.text) });
      for (let i = 0; i < boxes.length; i++)for (let j = i + 1; j < boxes.length; j++) { const A = boxes[i], B = boxes[j], ox = Math.min(A[2], B[2]) - Math.max(A[0], B[0]), oy = Math.min(A[3], B[3]) - Math.max(A[1], B[1]);
        if (ox > 2 && oy > 2) out.push(A[4] + ' / ' + B[4]) }
      return out }, id);
    if (r === null) { problems.push(`${tag}: ${id} is not registered in window.PCSTG`); return }
    r.forEach(x => problems.push(`${tag}: ${id} ${where}: labels overlap or leave the card: ${x}`));
  };
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (cols.length !== SPLITS || cols.some(c => c !== 'grid'))) problems.push(`${tag}: splits are not ${SPLITS} two-column grids (${cols.length}: ${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  if (width === 1400) {
    const over = await p.$$eval('#t-read .s3R', xs => xs.map(x => { const r = x.getBoundingClientRect(), k = x.firstElementChild && x.firstElementChild.getBoundingClientRect(); return k && r.width && (k.right > r.right + 1 || k.left < r.left - 1) ? x.innerHTML.slice(0, 40) : '' }).filter(Boolean));
    over.forEach(o => problems.push(`${tag}: right-column content wider than its column: ${o}`));
    // every number in the step lists (and the prose) against values recomputed here from PCD and FP, independently of the page's own scripts
    const r = await p.evaluate(() => { const out = [], f = MC.fmtN, A = PCD.timing.async, txt = el => el.textContent.replace(/\s+/g, ' ').trim();
      const want = (k, v) => { const els = [...document.querySelectorAll(`[data-v="${k}"]`)]; if (!els.length) out.push(`no element shows ${k}`); els.forEach(e => { if (txt(e) !== v) out.push(`${k}: page says ${txt(e)}, data ${v}`) }) };
      if ((window.RDV_MISSING || []).length) out.push('values missing: ' + window.RDV_MISSING.join(', '));
      document.querySelectorAll('[data-was]').forEach(e => out.push(`${e.dataset.v}: literal ${e.dataset.was} differs from ${e.textContent}`));
      // Fig. 1
      const L = A.host_nosync_ms.median, G = A.event_ms.median, S = A.host_sync_ms.median, Q = A.host_queued_ms.median;
      want('t_L', f(L, 2)); want('t_G', f(G, 2)); want('t_S', f(S, 2)); want('q_ms', f(Q, 2)); want('t_ratio', f(G / L, 0)); want('q_mult', f(Q / G, 1));
      if (!(L < .3 && G > 4 && Q > 4 * G)) out.push('Fig. 1: the measured medians no longer tell the story (' + [L, G, S, Q] + ')');
      // Fig. 2: NVIDIA's reports, read here from PCD.ncu directly
      const rep = s => PCD.ncu.reports.find(r => r.stem === s), sol = (r, l) => +r.sections.find(x => x.name === 'GPU Speed Of Light Throughput').tables.flatMap(t => t.rows).find(x => x[0] === l)[2].replace(/,/g, '');
      const dur = r => { const d = r.sections.find(x => x.name === 'GPU Speed Of Light Throughput').tables.flatMap(t => t.rows).find(x => x[0] === 'Duration'); const v = +String(d[2]).replace(/,/g, ''); return d[1] === 'ms' ? v * 1000 : d[1] === 'ns' ? v / 1000 : v };
      const raw = (r, k) => +r.raw[k][0], du = v => v >= 1000 ? f(v, 0) : f(v, 2);
      const P = [['addConstDouble3', 'addConstDouble', r => raw(r, 'l1tex__t_sectors_pipe_lsu_mem_global_op_ld.sum') / raw(r, 'l1tex__t_requests_pipe_lsu_mem_global_op_ld.sum'), v => f(v, 1), 'Source Counters', 'uncoalesced global accesses resulting in a total of 3145728 excessive sectors (67% of the total 4718592 sectors)'],
        ['transposeCoalesced', 'transposeNoBankConflicts', r => 100 * raw(r, 'l1tex__data_bank_conflicts_pipe_lsu_mem_shared_op_ld.sum') / Math.max(1, raw(r, 'l1tex__data_pipe_lsu_wavefronts_mem_shared_op_ld.sum')), v => f(v, 1) + '%', 'Memory Workload Analysis Tables', 'on average a 32.2 - way bank conflict across all 2097152 shared load requests'],
        ['sobelDouble', 'sobelFloat', r => raw(r, 'sm__pipe_fp64_cycles_active.avg.pct_of_peak_sustained_active'), v => f(v, 1) + '%', 'Compute Workload Analysis', 'FP64 is the highest-utilized pipeline (86.4%)']];
      P.forEach(([b, a, ev, fm, sec, quote], k) => { const B = rep(b), Af = rep(a), db = dur(B), da = dur(Af), g = (1 - da / db) * 100;
        want(`wk${k}_db`, du(db)); want(`wk${k}_da`, du(da)); want(`wk${k}_cb`, f(sol(B, 'Compute (SM) Throughput'), 1)); want(`wk${k}_mb`, f(sol(B, 'Memory Throughput'), 1));
        want(`wk${k}_ca`, f(sol(Af, 'Compute (SM) Throughput'), 1)); want(`wk${k}_ma`, f(sol(Af, 'Memory Throughput'), 1)); want(`wk${k}_eb`, fm(ev(B))); want(`wk${k}_ea`, fm(ev(Af)));
        want(`wk${k}_gain`, f(g, Math.abs(g) < 1 ? 2 : 1));
        const rules = B.sections.find(x => x.name === sec).rules, rule = rules.find(x => x.text.includes(quote.replace(/^On/, 'on')) || x.text.toLowerCase().includes(quote.toLowerCase()));
        if (!rule) out.push(`Fig. 2 pair ${k}: the quoted rule text is not in the ${sec} rules of ${b}`);
        const li = document.getElementById('sx-wk-' + k).children[3]; if (!txt(li).toLowerCase().includes(quote.toLowerCase())) out.push(`sx-wk-${k} step 4 lacks the quote`);
        const est = rule && rule.speedup ? +rule.speedup.match(/([\d.]+)%/)[1] : null;
        if (est != null) { want(`wk${k}_est`, f(est, 2)); want(`wk${k}_ghost`, du(db * (1 - est / 100))) } else if (k !== 2) out.push(`pair ${k} lost its estimate`) });
      // Fig. 3: the sixteen numbers summed here with the page's float16 rounding
      const X = [2048, 0.9, 1.1, 0.8, 1.2, 1, 0.7, 1.3, 0.95, 1.05, 0.85, 1.15, 0.6, 1.4, 1, 0.99].map(v => FP.round(v, 'fp16')), ex = FP.fsum(X);
      let s = X[0]; const seq = []; for (let i = 1; i < 16; i++) { s = FP.round(s + X[i], 'fp16'); seq.push([s, FP.fsum(X.slice(0, i + 1))]) }
      let lev = X; const tree = []; while (lev.length > 1) { const n = []; for (let i = 0; i < lev.length; i += 2)n.push(FP.round(lev[i] + lev[i + 1], 'fp16')); tree.push(n); lev = n }
      want('sum_exact', f(ex, 2)); want('sum_seq', f(seq[14][0], 0)); want('sum_seq_lost', f(ex - seq[14][0], 2)); want('sum_pair', f(lev[0], 0)); want('sum_pair_lost', f(ex - lev[0], 2));
      want('sum_a1', f(X[0] + X[1], 2)); want('sum_r1', f(seq[0][0], 0)); want('sum_a2', f(seq[0][0] + X[2], 2)); want('sum_r2', f(seq[1][0], 0));
      want('sum_s5', f(seq[4][0], 0)); want('sum_e5', f(seq[4][1], 2)); want('sum_s10', f(seq[9][0], 0)); want('sum_e10', f(seq[9][1], 2));
      want('sum_n1', String(tree[0].length)); want('sum_l1', f(Math.max(...tree[0].slice(1)), 2)); want('sum_p3', f(tree[2][0], 0)); want('sum_q3', f(tree[2][1], 2));
      if (!(Math.abs(ex - lev[0]) < Math.abs(ex - seq[14][0]))) out.push('Fig. 3: the tree no longer beats the running sum');
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
        await wait(650); await overlaps(id, `${label} step ${k + 1} mid-tween`); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${label}-s${k + 1}-midtween-${scheme}-${width}.png` });
        await wait(1700); await overlaps(id, `${label} step ${k + 1}`); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${label}-s${k + 1}-${scheme}-${width}.png` })
      } else if (shoot && k === Math.floor(n / 2)) { await wait(2400); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${label}-s${k + 1}-${scheme}-${width}.png` }) }
      else await wait(150);
    }
    await wait(2700);
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
    if (id === 'stg-sum' && m === 'atom') { // "Another run": a new order, replayed from step 1
      await p.$eval('#rd-sum-again', e => e.click()); await wait(200);
      if (!/^step 1 of/.test(await p.$eval(`#${id} .stg-st`, e => e.textContent))) problems.push(`${tag}: Another run did not restart Fig. 3`) }
  }
  await audit('end');
  for (const t of ['t-ncu', 't-more']) { await p.click(`#tabs button[data-t="${t}"]`); await wait(300); await audit(t, t) }
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
