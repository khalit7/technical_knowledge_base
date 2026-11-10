// The 2026-11-06 rollout checks for Libraries and tensor cores (2026-11-10), adapted from The compiler stack's check_stages.mjs:
// the three 3D stages (Fig. 1 tiles, waves, split-K and Stream-K; Fig. 2 one MMA instruction per generation; Fig. 3 one tile through the
// pipeline of each generation, three modes) play by themselves once scrolled into view, step to their last step with one step-list item
// per step, stop redrawing off screen and never move under reduced motion; the GEMM scheduler (a reader-driven widget) never plays by
// itself; the mode switch swaps the step list and replays; no errors, NaN, undefined or sideways scroll; splits are two columns at 1400 px
// and one below 1100 px; scene labels do not overlap each other, leave or touch the card at 1400 px, at the end of each step and in the
// middle of its tween; every number written in the step lists equals the page's own model and data (window.GS, window.LT, window.CUTE).
// usage (from the repo root): node technical_knowledge_base/systems_and_performance/topic_cuda_and_gpu_programming/libraries_and_tensor_cores/src/check/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../../index.html'), shots = process.argv[2] || path.resolve(here, '../../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = [['stg-waves', 'sx-waves'], ['stg-mma', 'sx-mma'], ['stg-pipe', 'sx-pa']];
const MODES = [['stg-pipe', 'lt-pipeMode', [['hopper', 'sx-ph'], ['blackwell', 'sx-pb'], ['ampere', 'sx-pa']]]];
const SPLITS = 11;
const wait = ms => new Promise(r => setTimeout(r, ms));
const problems = [];
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(400);
  const tag = `${scheme} ${width}`, shoot = width === 1400 || width === 390;
  const audit = async (where, tab = 't-read') => {
    const r = await p.evaluate(tab => { const c = document.getElementById(tab).cloneNode(true); c.querySelectorAll('pre,code').forEach(x => x.remove());
      return { bad: (c.innerText.match(/.{0,30}\b(NaN|undefined|Infinity)\b(?! constant).{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } }, tab);
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  // labels drawn in the canvas: boxes from the renderer's own label list, measured with the same font, must not overlap, leave or touch the card
  const overlaps = async (id, where) => {
    if (width !== 1400) return;
    const r = await p.evaluate(id => { const st = (window.LTSTG || {})[id]; if (!st) return null; const cv = st.host.querySelector('canvas'), cx = cv.getContext('2d'), W = cv.clientWidth, H = cv.clientHeight;
      const boxes = [], out = [];
      (st.R.lab || []).forEach(L => { if (L.a < .35) return; const o = L.o, fs = Math.max(12, o.fs || 12.5); cx.font = (o.b ? '600 ' : '') + fs + 'px ' + (o.mono ? 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace' : 'ui-sans-serif,-apple-system,"Segoe UI",Helvetica,Arial,sans-serif');
        const w = cx.measureText(L.text).width, x0 = o.al === 'right' ? L.x - w : o.al === 'left' ? L.x : L.x - w / 2; boxes.push([x0, L.y - fs / 2, x0 + w, L.y + fs / 2, L.text]);
        if (x0 < 5 || x0 + w > W - 5 || L.y - fs / 2 < 3 || L.y + fs / 2 > H - 3) out.push('outside or touching the card: ' + L.text) });
      for (let i = 0; i < boxes.length; i++)for (let j = i + 1; j < boxes.length; j++) { const A = boxes[i], B = boxes[j], ox = Math.min(A[2], B[2]) - Math.max(A[0], B[0]), oy = Math.min(A[3], B[3]) - Math.max(A[1], B[1]);
        if (ox > 2 && oy > 2) out.push(A[4] + ' / ' + B[4]) }
      return out }, id);
    if (r === null) { problems.push(`${tag}: ${id} is not registered in window.LTSTG`); return }
    r.forEach(x => problems.push(`${tag}: ${id} ${where}: labels overlap or leave the card: ${x}`));
  };
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (cols.length !== SPLITS || cols.some(c => c !== 'grid'))) problems.push(`${tag}: splits are not ${SPLITS} two-column grids (${cols.length}: ${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  if (width === 1400) {
    const over = await p.$$eval('#t-read .s3R', xs => xs.map(x => { const r = x.getBoundingClientRect(), k = x.firstElementChild && x.firstElementChild.getBoundingClientRect(); return k && r.width && (k.right > r.right + 1 || k.left < r.left - 1) ? x.innerHTML.slice(0, 40) : '' }).filter(Boolean));
    over.forEach(o => problems.push(`${tag}: right-column content wider than its column: ${o}`));
    // the step lists against the page's own model and data, recomputed here
    const r = await p.evaluate(() => { const out = [], txt = el => el.textContent.replace(/\s+/g, ' ').trim();
      const span = (lid, w) => { const e = document.querySelector(`#${lid} .lt-w[data-w="${w}"]`); return e ? txt(e) : null };
      const want = (lid, w, v) => { const s = span(lid, w); if (s !== v) out.push(`${lid} ${w}: page says ${s}, data ${v}`) };
      const need = (lid, k, x) => { const li = document.getElementById(lid).children[k]; if (!li || !txt(li).includes(x)) out.push(`${lid} item ${k + 1} lacks "${x}"`) };
      const pct = u => (100 * u).toFixed(1) + '%', mib = x => (x / 2 ** 20).toFixed(1) + ' MiB', n = x => x.toLocaleString('en-US');
      // Fig. 1 against GS.plan
      const W = window.LT_WAVES, plan = (c, s) => GS.plan(...c, s), busy = R => R.segs.filter(x => x.length).length;
      const A1 = [2304, 1536, 4096, 256, 128, 108], A2 = [2304, 1544, 4096, 256, 128, 108], B = [1024, 1024, 16384, 128, 256, 132];
      const R1 = plan(A1, 'dp'), R2 = plan(A2, 'dp'), R4 = plan(B, 'dp'), R5 = plan(B, 'sk4'), R6 = plan(B, 'stream');
      if (R1.T !== 108 || R2.T !== 117 || R4.T !== 32) out.push('tile counts changed');
      want('sx-waves', 'I1', String(R1.I)); want('sx-waves', 'busy2', String(busy(R1))); want('sx-waves', 'time2', String(R1.time)); want('sx-waves', 'util2', pct(R1.util));
      want('sx-waves', 'tail3', String(R2.T - R2.P)); want('sx-waves', 'idle3', String(2 * R2.P - R2.T)); want('sx-waves', 'time3', String(R2.time)); want('sx-waves', 'util3', pct(R2.util));
      want('sx-waves', 'T4', String(R4.T)); want('sx-waves', 'I4', String(R4.I)); want('sx-waves', 'busy4', String(busy(R4))); want('sx-waves', 'util4', pct(R4.util)); want('sx-waves', 'time4', String(R4.time));
      want('sx-waves', 'units5', String(R5.units)); want('sx-waves', 'busy5', String(busy(R5))); want('sx-waves', 'time5', String(R5.time)); want('sx-waves', 'util5', pct(R5.util)); want('sx-waves', 'extra5', mib(R5.extra));
      want('sx-waves', 'W6', n(R6.T * R6.I)); want('sx-waves', 'per6', String(Math.ceil(R6.T * R6.I / R6.P))); want('sx-waves', 'busy6', String(busy(R6))); want('sx-waves', 'time6', String(R6.time)); want('sx-waves', 'util6', pct(R6.util)); want('sx-waves', 'extra6', mib(R6.extra));
      // the scene's own Stream-K pieces add up to GS.plan's per-SM work
      const per = R6.segs.map(s => s.reduce((a, x) => a + x[1], 0)), mine = new Array(R6.P).fill(0); W.chunks6.forEach(c => mine[c.sm] += c.l);
      if (per.join() !== mine.join()) out.push('Fig. 1 Stream-K pieces differ from GS.plan');
      if (Math.abs(R2.util - .5417) > 1e-3 || R2.time !== 128) out.push('NVIDIA example no longer halves');
      // Fig. 2: lane 0's fragment from CuTe's layouts, and the multiply-adds of each shape
      const M = window.LT_MMA; want('sx-mma', 'a0', String(M.a0)); want('sx-mma', 'b0', String(M.b0)); need('sx-mma', 1, M.c0.replace(/\) \(/g, '), (').replace(/, \((8,1)\)$/, ' and ($1)'));
      if (M.c0 !== '(0,0) (0,1) (8,0) (8,1)') out.push('lane 0 of C is ' + M.c0);
      need('sx-mma', 0, n(M.mac[0])); need('sx-mma', 2, n(M.mac[1])); need('sx-mma', 3, n(M.mac[2]));
      if (M.mac[1] / M.mac[0] !== 128 || M.mac[2] / M.mac[1] !== 2) out.push('Fig. 2 ratios changed');
      // Fig. 3 against window.LT.tile and the step tables
      const T = window.LT.tile; want('sx-pa', 'pa_copy', String(T.ampere.copy)); want('sx-pa', 'pa_ldsm', String(T.ampere.ldsm)); want('sx-pa', 'pa_mma', String(T.ampere.mma));
      want('sx-ph', 'ph_mma', String(T.hopper.mma)); want('sx-pb', 'pb_mma', String(T.blackwell.mma)); want('sx-pb', 'pb_cols', String(T.blackwell.tmem_cols)); want('sx-pb', 'pb_kb', String(T.blackwell.tmem_kb));
      const S = window.LT_PIPE; [['ampere', 'sx-pa'], ['hopper', 'sx-ph'], ['blackwell', 'sx-pb']].forEach(([g, l]) => { if (S[g].steps.length !== document.getElementById(l).children.length) out.push(`${l}: ${S[g].steps.length} scene steps`) });
      if (T.ampere.mma !== 128 / 16 * 128 / 8 * 64 / 16 || T.hopper.mma !== 2 * 64 / 16 || T.blackwell.mma !== 64 / 16) out.push('MMA counts do not follow from the shapes');
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  // every stage plays once scrolled into view; the scheduler does not
  for (const [id] of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
    if (shoot) { await wait(300); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-autoplay-${scheme}-${width}.png` }) }
  }
  { const v0 = await p.$eval('#gs-t', e => e.value); await p.$eval('#gs-card', e => e.scrollIntoView({ block: 'center' })); await wait(2000);
    if ((await p.$eval('#gs-t', e => e.value)) !== v0 || (await p.$eval('#gs-play', e => e.getAttribute('aria-label'))) !== 'Play') problems.push(`${tag}: the scheduler moved by itself`) }
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
      if (shoot) {
        await wait(650); await overlaps(id, `${label} step ${k + 1} mid-tween`); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${label}-s${k + 1}-midtween-${scheme}-${width}.png` });
        await wait(1300); await overlaps(id, `${label} step ${k + 1}`); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${label}-s${k + 1}-${scheme}-${width}.png` })
      } else await wait(200);
    }
    await wait(1900);
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
  for (const t of ['t-layout', 't-atlas', 't-more']) { await p.click(`#tabs button[data-t="${t}"]`); await wait(300); await audit(t, t) }
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
