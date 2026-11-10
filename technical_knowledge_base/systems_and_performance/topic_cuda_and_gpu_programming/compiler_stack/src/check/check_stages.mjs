// The 2026-11-06 rollout checks for The compiler stack (2026-11-10), adapted from Distributed training's check_stages.mjs:
// the four 3D stages (Fig. 3 nvcc's programs, Fig. 4 the softmax on its way down, Fig. 5 which image each GPU runs, Fig. 6 torch.compile)
// and the three 2D step animations (Fig. 2 Inductor's fusion rounds, Fig. 7 e^x four ways, the Dynamo graph break in its closed block)
// play by themselves once scrolled into view, step to their last step with one step-list item per step, stop redrawing off screen and
// never move under reduced motion; the two reader-driven tools (the driver's search, the scoreboard replay) never play by themselves;
// mode switches swap the step list and replay; no errors, NaN, undefined or sideways scroll; splits are two columns at 1400 px and one
// below 1100 px; scene labels do not overlap each other or leave the card at 1400 px, at the end of each step and in the middle of its
// tween; every number written in the step lists equals the page's recorded data (window.CSD, window.CSC, window.CSRUN.decide).
// usage (from the repo root): node technical_knowledge_base/systems_and_performance/topic_cuda_and_gpu_programming/compiler_stack/src/check/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../../index.html'), shots = process.argv[2] || path.resolve(here, '../../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = [['stg-nvcc', 'sx-nvcc'], ['stg-down', 'sx-down'], ['stg-fat', 'sx-fat'], ['stg-tc', 'sx-tc']];
const MODES = [['stg-nvcc', 'cs-nvccMode', [['p', 'sx-nvccp'], ['a', 'sx-nvcc']]], ['stg-fat', 'cs-fatMode', [['n', 'sx-fatn'], ['w', 'sx-fat']]], ['stg-tc', 'cs-tcMode', [['b', 'sx-tcb'], ['r', 'sx-tc']]]];
const ANIMS = [['cs-fuCard', 'cs-fuCtl', 'sx-fu'], ['cs-expCard', 'cs-expCtl', 'sx-exp']];
const WIDGETS = ['run-ctl', 'sx-ctl'];
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
      return { bad: (c.innerText.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } }, tab);
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  // labels drawn in the canvas: boxes from the renderer's own label list, measured with the same font, must not overlap or leave the card
  const overlaps = async (id, where) => {
    if (width !== 1400) return;
    const r = await p.evaluate(id => { const st = (window.CSSTG || {})[id]; if (!st) return null; const cv = st.host.querySelector('canvas'), cx = cv.getContext('2d'), W = cv.clientWidth, H = cv.clientHeight;
      const boxes = [], out = [];
      (st.R.lab || []).forEach(L => { if (L.a < .35) return; const o = L.o, fs = Math.max(12, o.fs || 12.5); cx.font = (o.b ? '600 ' : '') + fs + 'px ' + (o.mono ? 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace' : 'ui-sans-serif,-apple-system,"Segoe UI",Helvetica,Arial,sans-serif');
        const w = cx.measureText(L.text).width, x0 = o.al === 'right' ? L.x - w : o.al === 'left' ? L.x : L.x - w / 2; boxes.push([x0, L.y - fs / 2, x0 + w, L.y + fs / 2, L.text]);
        if (x0 < 0 || x0 + w > W + 1 || L.y - fs / 2 < -1 || L.y + fs / 2 > H + 1) out.push('outside the card: ' + L.text) });
      for (let i = 0; i < boxes.length; i++)for (let j = i + 1; j < boxes.length; j++) { const A = boxes[i], B = boxes[j], ox = Math.min(A[2], B[2]) - Math.max(A[0], B[0]), oy = Math.min(A[3], B[3]) - Math.max(A[1], B[1]);
        if (ox > 3 && oy > 3) out.push(A[4] + ' / ' + B[4]) }
      return out }, id);
    if (r === null) { problems.push(`${tag}: ${id} is not registered in window.CSSTG`); return }
    r.forEach(x => problems.push(`${tag}: ${id} ${where}: labels overlap or leave the card: ${x}`));
  };
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (cols.length < 15 || cols.some(c => c !== 'grid'))) problems.push(`${tag}: a split is not two columns (${cols.length}: ${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  if (width === 1400) {
    const over = await p.$$eval('#t-read .s3R', xs => xs.map(x => { const r = x.getBoundingClientRect(), k = x.firstElementChild && x.firstElementChild.getBoundingClientRect(); return k && r.width && (k.right > r.right + 1 || k.left < r.left - 1) ? x.innerHTML.slice(0, 40) : '' }).filter(Boolean));
    over.forEach(o => problems.push(`${tag}: right-column content wider than its column: ${o}`));
    // the step lists against the recorded data, recomputed here
    const r = await p.evaluate(() => { const out = [], D = window.CSD, C = window.CSC, T = D.tc, txt = el => el.textContent.replace(/\s+/g, ' ').trim();
      const need = (lid, k, x) => { const li = document.getElementById(lid).children[k]; if (!li || !txt(li).includes(x)) out.push(`${lid} item ${k + 1} lacks "${x}"`) };
      const keep = {}; D.keep.forEach(k => keep[k[0]] = +k[1]); const kb = n => n >= 1e6 ? (n / 1e6).toFixed(2) + ' MB' : (n / 1e3).toFixed(1) + ' KB';
      need('sx-nvcc', 0, kb(keep['softmax.cpp4.ii'])); need('sx-nvcc', 0, kb(keep['softmax.compute_90a.cudafe1.cpp'])); need('sx-nvcc', 0, kb(keep['softmax.compute_90a.cudafe1.stub.c']));
      need('sx-nvcc', 1, (keep['softmax.compute_90.cpp1.ii'] / 1e6).toFixed(1) + ' MB for a 32-line kernel'); need('sx-nvcc', 1, kb(keep['softmax.compute_90.ptx']));
      need('sx-nvcc', 3, kb(keep['softmax.compute_90a.ptx'])); need('sx-nvcc', 4, kb(keep['softmax.compute_90a.sm_90a.cubin']));
      need('sx-nvcc', 5, kb(keep['softmax.fatbin'])); need('sx-nvcc', 5, kb(keep['softmax.fatbin.c'])); need('sx-nvcc', 6, kb(keep['softmax.o']));
      if (D.dryrun.length !== 11 || D.dryrun_sm90.length !== 8) out.push('nvcc command counts changed');
      if (!/^ptxas -arch=compute_90 /.test(D.dryrun[4]) || !/^ptxas -arch=sm_90a /.test(D.dryrun[7]) || !/^fatbinary/.test(D.dryrun[8]) || !/^ptxas -arch=sm_90 /.test(D.dryrun_sm90[4])) out.push('nvcc commands are not where the step lists say');
      need('sx-nvcc', 5, ['three', 'two'][3 - D.fat.arch_sm90a.images.length] + ' images'); need('sx-nvccp', 3, ['three', 'two'][3 - D.fat.arch_sm90.images.length] + ' images');
      const src = D.src_softmax.replace(/\n$/, '').split('\n').length, R = D.ptx_regs, LV = {}; D.ptxas_levels.forEach(l => LV[l[0]] = l);
      need('sx-down', 0, src + ' lines'); need('sx-down', 1, D.ptx_softmax.length + ' lines, ' + (R.pred + R.f32 + R.b32 + R.b64) + ' virtual registers');
      need('sx-down', 1, R.pred + ' predicates'); need('sx-down', 1, R.f32 + ' floats'); need('sx-down', 1, R.b32 + ' 32-bit'); need('sx-down', 1, R.b64 + ' 64-bit');
      need('sx-down', 2, LV[0][2] + ' instruction slots, ' + LV[0][1] + ' registers'); need('sx-down', 3, LV[3][2] + ' slots, ' + LV[3][1] + ' registers');
      if (LV[1][1] !== LV[3][1] || LV[1][2] !== LV[3][2] || LV[2][2] !== LV[3][2]) out.push('-O1 to -O3 no longer give the same counts');
      if (!(LV[3][2] / LV[0][2] < 1 / 3)) out.push('-O3 is no longer under a third of -O0');
      if (!D.res_sm90a.includes('REG:18') || !D.res_sm90a.includes('SHARED:1056') || !D.res_sm90a.includes('LOCAL:0')) out.push('res-usage line changed');
      const tg = ['sm_80', 'sm_90a', 'sm_100a', 'sm_120'];
      need('sx-down', 4, tg.map(t => D.sass_check['softmax.' + t][0]).join(', ').replace(/, (\d+)$/, ' and $1') + ' instruction slots');
      need('sx-down', 4, tg.map(t => D.sass_regs[t]).join(', ').replace(/, (\d+)$/, ' and $1') + ' registers');
      // Fig. 5: every outcome from the page's own port of compat.py
      const dec = (L, cc) => window.CSRUN.decide(L, cc, 134, 134, false, false), W = C.fat.wheel, N = C.fat.nightly;
      need('sx-fat', 0, W.map(x => x).join(', ').replace(/, (\S+)$/, ' and $1'));
      [[1, 80], [1, 89], [2, 90], [2, 100], [3, 103], [4, 120]].forEach(([k, cc]) => { const o = dec(W, cc); if (o.outcome !== 'sass') out.push('wheel on CC ' + cc + ' is ' + o.outcome); else need('sx-fat', k, o.image) });
      { const o = dec(W, 130); if (o.outcome !== 'error' || o.code !== 'cudaErrorNoKernelImageForDevice') out.push('wheel on CC 13.0 does not fail'); need('sx-fat', 5, o.code) }
      { const o = dec(N, 130); if (o.outcome !== 'jit') out.push('nightly on CC 13.0 is ' + o.outcome); need('sx-fatn', 2, o.image) }
      if (N.filter(x => !W.includes(x)).join() !== 'compute_120') out.push('the nightly adds more than PTX compute_120');
      [80, 89, 90, 100, 103, 120].forEach(cc => { if (dec(N, cc).image !== dec(W, cc).image) out.push('nightly changes CC ' + cc) });
      if (!C.gpus.some(g => g[1] === 89 && /L4/.test(g[0])) || !C.gpus.some(g => g[1] === 103 && /B300/.test(g[0]))) out.push('GPU table changed');
      // Fig. 6
      need('sx-tc', 0, T.bc_orig.length + ' bytecode instructions'); const G = T.graph.filter(x => /^\s+\w+: "/.test(x)).map(x => x.trim().split(':')[0]);
      if (G.join() !== 'mul,softmax,matmul') out.push('FX graph ops are ' + G); need('sx-tc', 1, T.guards.length + ' guard lines'); need('sx-tc', 1, 'recompile_limit = ' + T.modes.recompile_limit);
      need('sx-tc', 3, (window.CSFUSE || []).length === 7 ? 'seven scheduler nodes' : '?'); need('sx-tc', 4, T.cpp_kernel.length + ' lines'); need('sx-tc', 4, T.triton_name);
      need('sx-tc', 5, D.triton_ptx_head.find(l => /^\.version/.test(l)).trim());
      need('sx-tcb', 1, T.bc_orig.length + ' instructions become ' + T.bc_mod.length); need('sx-tcb', 2, T.bc_resume_orig.length + ' instructions');
      need('sx-tcb', 3, T.explain.with_print.graphs + ' graphs and ' + T.explain.with_print.breaks + ' break'); need('sx-tcb', 1, T.explain.with_print.reasons[0]);
      // Fig. 7
      const arith = l => /MUFU|FMUL|FFMA|FADD|FSETP|SHF|FSEL/.test(l) && !/IMAD/.test(l);
      [['default', 'k_expf'], ['default', 'k_fast'], ['default', 'k_inline'], ['use_fast_math', 'k_expf']].forEach(([m, k], i) => { const n = D.exp[m][k].filter(arith).length, li = document.getElementById('sx-exp').children[i];
        if (!li || !new RegExp(':\\s*' + n + '\\b').test(li.querySelector('b').textContent)) out.push('sx-exp item ' + (i + 1) + ' does not say ' + n) });
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  // every stage, and the 2D step animations, play once scrolled into view; the tools do not
  for (const [id] of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
    if (shoot) { await wait(300); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-autoplay-${scheme}-${width}.png` }) }
  }
  for (const [card, ctl] of ANIMS) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    if ((await p.$eval(`#${ctl}-p`, e => e.getAttribute('aria-label') || '')) !== 'Pause') problems.push(`${tag}: ${card} did not play when scrolled into view`);
  }
  for (const id of WIDGETS) {
    const v0 = await p.$eval(`#${id}-s`, e => e.value); await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2000);
    if ((await p.$eval(`#${id}-s`, e => e.value)) !== v0) problems.push(`${tag}: the tool ${id} moved by itself`);
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
      if (shoot) {
        await wait(700); await overlaps(id, `${label} step ${k + 1} mid-tween`); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${label}-s${k + 1}-midtween-${scheme}-${width}.png` });
        await wait(1100); await overlaps(id, `${label} step ${k + 1}`); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${label}-s${k + 1}-${scheme}-${width}.png` })
      } else await wait(200);
    }
    await wait(1600);
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
  // the 2D animations: every step, one list item per step; the Dynamo break in its closed block, both modes
  await p.evaluate(() => { const d = document.getElementById('cs-dynCard').closest('details'); d.open = true });
  for (const [card, ctl, lid, seg, m] of [...ANIMS.map(a => [...a]), ['cs-dynCard', 'cs-dynCtl', 'sx-dyn'], ['cs-dynCard', 'cs-dynCtl', 'sx-dynf', 'cs-dynMode', 'f']]) {
    if (seg) { await p.$eval(`#${seg} button[data-m="${m}"]`, e => e.click()); await wait(150) }
    else if (card === 'cs-dynCard') { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      if ((await p.$eval(`#${ctl}-p`, e => e.getAttribute('aria-label') || '')) !== 'Pause') problems.push(`${tag}: ${card} did not play once its block was opened and in view`) }
    const n = await p.$eval(`#${ctl}-s`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length);
    if (n !== lis) problems.push(`${tag}: ${card} has ${n} steps, list ${lid} ${lis}`);
    for (let k = 0; k < n; k++) await p.$eval(`#${ctl}-s`, (e, k) => { e.value = k; e.dispatchEvent(new Event('input')) }, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on'))); if (cur !== n - 1) problems.push(`${tag}: ${lid} does not mark the last step`);
    if (shoot && card !== 'cs-dynCard') { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(200); await (await p.$('#' + card)).screenshot({ path: `${shots}/x-${card}-last-${scheme}-${width}.png` }) }
  }
  await audit('end');
  for (const t of ['t-tc', 't-more']) { await p.click(`#tabs button[data-t="${t}"]`); await wait(300); await audit(t, t) }
  await p.click('#tabs button[data-t="t-read"]');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file);
  for (const [id] of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1400);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  for (const [card, ctl] of ANIMS) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1400);
    if ((await p.$eval(`#${ctl}-s`, e => +e.value)) !== 0) problems.push(`reduced motion: ${card} moved by itself`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
