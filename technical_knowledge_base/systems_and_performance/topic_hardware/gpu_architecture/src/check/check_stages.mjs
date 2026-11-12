// The 2026-11-06 rollout checks for GPU architecture (2026-11-12), adapted from The CUDA programming model's check_stages.mjs:
// the four 3D stages (Fig. 1 one H100, Fig. 2 one SM per generation, Fig. 3 six chips, Fig. 4 B200 against MI300X) and the two 2D animations
// (the scheduler timeline, the tile through three generations) play by themselves once scrolled into view, step to their last step with one
// step-list item per step, stop redrawing off screen and never move under reduced motion; the two mode switches swap the step list and replay;
// no errors, NaN, undefined or sideways scroll in any tab; splits are two columns at 1400 px and one below 1100 px; scene labels do not overlap
// each other, leave or touch the card at 1400 px, at the end of each step and in the middle of its tween; the numbers in the step lists equal
// the page's own data and models (window.GA, GA_HERO, GA_SMSC, GA_GEN, GA_AMD, GA_HIDE, GA_TC).
// usage (from the repo root): node technical_knowledge_base/systems_and_performance/topic_hardware/gpu_architecture/src/check/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../../index.html'), shots = process.argv[2] || path.resolve(here, '../../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = [['stg-hero', 'sx-hero'], ['stg-sm', 'sx-sm'], ['stg-gen', 'sx-gen'], ['stg-amd', 'sx-amd']];
// 2D animations: card, control prefix, step list, and the mode switch (segment id, [mode, list] pairs) if any
const ANIMS = [['ga-hideCard', 'ga-hideCtl', 'sx-hide-0', ['ga-hideSeg', [['1', 'sx-hide-1'], ['2', 'sx-hide-2'], ['0', 'sx-hide-0']]]],
  ['ga-tcCard', 'ga-tcCtl', 'sx-tc-amp', ['ga-tcSeg', [['hop', 'sx-tc-hop'], ['bw', 'sx-tc-bw'], ['amp', 'sx-tc-amp']]]]];
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
      return { bad: (c.innerText.match(/.{0,30}\b(NaN|undefined|Infinity(?! Cache))\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } }, tab);
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  // labels drawn in the canvas: boxes from the renderer's own label list, measured with the same font, must not overlap, leave or touch the card
  const overlaps = async (id, where) => {
    if (width !== 1400) return;
    const r = await p.evaluate(id => { const st = (window.GASTG || {})[id]; if (!st) return null; const cv = st.host.querySelector('canvas'), cx = cv.getContext('2d'), W = cv.clientWidth, H = cv.clientHeight;
      const boxes = [], out = [];
      (st.R.lab || []).forEach(L => { if (L.a < .35) return; const o = L.o, fs = Math.max(12, o.fs || 12.5); cx.font = (o.b ? '600 ' : '') + fs + 'px ' + (o.mono ? 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace' : 'ui-sans-serif,-apple-system,"Segoe UI",Helvetica,Arial,sans-serif');
        const w = cx.measureText(L.text).width, x0 = o.al === 'right' ? L.x - w : o.al === 'left' ? L.x : L.x - w / 2; boxes.push([x0, L.y - fs / 2, x0 + w, L.y + fs / 2, L.text]);
        if (x0 < 3 || x0 + w > W - 3 || L.y - fs / 2 < 2 || L.y + fs / 2 > H - 2) out.push('outside or touching the card: ' + L.text) });
      for (let i = 0; i < boxes.length; i++)for (let j = i + 1; j < boxes.length; j++) { const A = boxes[i], B = boxes[j], ox = Math.min(A[2], B[2]) - Math.max(A[0], B[0]), oy = Math.min(A[3], B[3]) - Math.max(A[1], B[1]);
        if (ox > 2 && oy > 2) out.push(A[4] + ' / ' + B[4]) }
      return out }, id);
    if (r === null) { problems.push(`${tag}: ${id} is not registered in window.GASTG`); return }
    r.forEach(x => problems.push(`${tag}: ${id} ${where}: labels overlap or leave the card: ${x}`));
  };
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (cols.length !== SPLITS || cols.some(c => c !== 'grid'))) problems.push(`${tag}: splits are not ${SPLITS} two-column grids (${cols.length}: ${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  if (width === 1400) {
    const over = await p.$$eval('#t-read .s3R', xs => xs.map(x => { const r = x.getBoundingClientRect(), k = x.firstElementChild && x.firstElementChild.getBoundingClientRect(); return k && r.width && (k.right > r.right + 1 || k.left < r.left - 1) ? x.innerHTML.slice(0, 40) : '' }).filter(Boolean));
    over.forEach(o => problems.push(`${tag}: right-column content wider than its column: ${o}`));
    // the step lists against the page's own data and models, recomputed here
    const r = await p.evaluate(() => { const out = [], txt = el => el.textContent.replace(/\s+/g, ' ').trim(), n = x => x.toLocaleString('en-US');
      const need = (lid, k, x) => { const li = document.getElementById(lid).children[k]; if (!li || !txt(li).includes(x)) out.push(`${lid} item ${k + 1} lacks "${x}"`) };
      const G = window.GA, chip = id => G.chips.find(c => c.id === id);
      // Fig. 1: one H100
      const H = window.GA_HERO, h = chip('h100'), L = G.luo.H800;
      if (H.on !== h.sm_on || H.full !== h.sm_full || H.gpcs !== h.gpc_full) out.push('Fig. 1 counts differ from GA.chips: ' + JSON.stringify(H));
      need('sx-hero', 0, h.area + ' mm'); need('sx-hero', 0, h.gb + ' GB'); need('sx-hero', 0, h.tbs + ' TB/s'); need('sx-hero', 1, n(h.sm_full) + ' SMs'); need('sx-hero', 1, 'enables ' + h.sm_on); need('sx-hero', 1, h.l2_mb + ' MB L2');
      need('sx-hero', 2, '64 KB'); need('sx-hero', 2, h.l1_kb + ' KB'); need('sx-hero', 3, Math.round(L.glob) + ' cycles'); need('sx-hero', 3, '(' + Math.round(L.l2) + ')'); need('sx-hero', 3, '(' + Math.round(L.smem) + ')'); need('sx-hero', 3, n(G.tile.h100_fma_clk_sm) + ' FMAs');
      // Fig. 2: one SM per generation
      const S = window.GA_SMSC.gen;
      if (window.GA_SMSC.acc !== 0.25) out.push('Fig. 2: accumulators are not a quarter of the register file');
      need('sx-sm', 0, S[0].warps / 4 + ' warp slots'); need('sx-sm', 0, S[0].lanes + ' FP32 lanes'); need('sx-sm', 1, S[1].l1 + ' KB'); need('sx-sm', 1, 'up to ' + S[1].smem + ' KB');
      need('sx-sm', 2, G.tile.acc_bytes / 1024 + '</span> KB'.replace('</span>', '')); need('sx-sm', 2, 'a quarter');
      need('sx-sm', 3, 'from ' + S[3].lanes + ' to ' + S[0].lanes); need('sx-sm', 3, S[3].l1 + ' KB (up to ' + S[3].smem + ' KB shared)'); if (S[3].tma) out.push('Fig. 2: A100 drawn with TMA');
      need('sx-sm', 4, S[4].tmem + ' KB per SM'); need('sx-sm', 5, S[5].l1 + ' KB, up to ' + S[5].smem + ' KB shared'); need('sx-sm', 5, S[5].warps + ' resident warps (' + S[5].warps / 4 + ' per scheduler)');
      // Fig. 3: six chips and the bars
      const C = window.GA_GEN, gl = (id, k, s) => need('sx-gen', k, s);
      [['a100', 0], ['h100', 1], ['rtx5090', 2]].forEach(([id, k]) => { const c = chip(id); if (C[id].on !== c.sm_on || C[id].full !== c.sm_full) out.push(`Fig. 3 ${id}: ${C[id].on} of ${C[id].full}`); gl(id, k, c.sm_on + ' of ' + c.sm_full) });
      gl('b200', 3, C.b200.on + ' SMs'); gl('b300', 4, C.b300.on + ' SMs'); gl('rubin', 5, C.rubin.on + ' SMs');
      if (C.b200.on !== chip('b200').sm_on || C.b300.on !== chip('b300').sm_full || C.rubin.on !== chip('rubin').sm_on) out.push('Fig. 3: two-die SM counts differ from GA.chips');
      const r1 = x => x.toFixed(x < 1 ? 2 : 1);
      [['h100', 'H100'], ['b200', 'B200'], ['rubin', 'Rubin'], ['rtx5090', 'RTX 5090']].forEach(([id, nm]) => gl(id, 6, nm + ' ' + r1(C[id].bf) + ' and ' + r1(C[id].bw)));
      // Fig. 4: MI300X
      const A = window.GA_AMD; if (A.xcd !== 8 || A.iod !== 4 || A.cu !== 304) out.push('Fig. 4 counts: ' + JSON.stringify(A));
      need('sx-amd', 1, 'Four I/O dies'); need('sx-amd', 1, 'eight HBM3'); need('sx-amd', 2, 'Eight XCDs'); need('sx-amd', 2, '38 are enabled'); need('sx-amd', 2, A.cu + ' CUs');
      // the scheduler timeline: instructions issued at the frames the lists name, from the page's port of hide_sim
      const HD = window.GA_HIDE;
      HD.FR.forEach((fr, m) => { const cum = HD.R[m].cum; need('sx-hide-' + m, 3, n(cum[fr[3]]) + ' instructions');
        if (m === 0) need('sx-hide-0', 1, cum[fr[1]] + ' instructions by cycle ' + fr[1]); else { need('sx-hide-' + m, 1, n(cum[fr[1]]) + ' instructions by cycle ' + fr[1]); need('sx-hide-' + m, 2, n(cum[fr[2]]) + (m === 1 ? ' instructions so far' : ' instructions so far')) } });
      // the tile through three generations: instruction counts from GA.tile
      const TL = G.tile; need('sx-tc-amp', 1, n(TL.cpasync_16B) + ' copies'); need('sx-tc-amp', 4, n(TL.ampere_instr)); need('sx-tc-amp', 4, n(TL.a100_clk) + ' clocks');
      need('sx-tc-hop', 1, TL.tma_instr + ' copies'); need('sx-tc-hop', 4, TL.hopper_instr + ' <code>wgmma</code>'.replace(/<[^>]+>/g, '')); need('sx-tc-hop', 4, TL.ampere_instr / TL.hopper_instr + ' times fewer'); need('sx-tc-hop', 4, TL.h100_clk + ' clocks');
      need('sx-tc-bw', 3, TL.blackwell_instr + ' instructions'); need('sx-tc-bw', 2, TL.tmem_cols + ' of its 512 columns');
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  // every stage and animation plays once scrolled into view; the two widgets do not move
  for (const [id] of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
    if (shoot) { await wait(300); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-autoplay-${scheme}-${width}.png` }) }
  }
  for (const [card, ctl] of ANIMS) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const lab = await p.$eval(`#${ctl}-p`, e => e.getAttribute('aria-label')); if (lab !== 'Pause') problems.push(`${tag}: ${card} did not play when scrolled into view`);
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
        await wait(750); await overlaps(id, `${label} step ${k + 1} mid-tween`); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${label}-s${k + 1}-midtween-${scheme}-${width}.png` });
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
  // 2D animations: step to the end with the forward button; one list item per step; the mode switch swaps the list and replays
  const step2d = async (card, ctl, lid, label) => {
    await p.$eval(`#${ctl}-b`, e => e.click()); await p.evaluate(ctl => { const e = document.getElementById(ctl + '-s'); e.value = 0; e.dispatchEvent(new Event('input')) }, ctl);
    const n = await p.$eval(`#${ctl}-s`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length), vis = await p.$eval('#' + lid, e => !e.hidden);
    if (lis !== n || !vis) problems.push(`${tag}: ${card}${label} has ${n} steps but list ${lid} shows ${lis}${vis ? '' : ' (hidden)'}`);
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' }));
    for (let k = 1; k < n; k++) { await p.$eval(`#${ctl}-f`, e => e.click()); await wait(60);
      if (shoot && k === Math.floor(n / 2)) await (await p.$('#' + card)).screenshot({ path: `${shots}/x-${card}${label}-mid-${scheme}-${width}.png` }) }
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${card}${label} list does not mark the last step (${cur})`);
    await audit(`${card}${label} last step`);
  };
  for (const [card, ctl, lid, modes] of ANIMS) {
    await step2d(card, ctl, lid, '');
    if (modes) for (const [m, ml] of modes[1]) {
      await p.$eval(`#${modes[0]} button[data-m="${m}"]`, e => e.click()); await wait(1600);
      const st = await p.$eval(`#${ctl}-s`, e => +e.value), lab = await p.$eval(`#${ctl}-p`, e => e.getAttribute('aria-label'));
      if (st > 1 || (lab !== 'Pause' && !(st === 0))) problems.push(`${tag}: ${card} mode ${m} did not restart (${st}, ${lab})`);
      await step2d(card, ctl, ml, '-' + m);
    }
  }
  await audit('end');
  { await p.click('#tabs button[data-t="t-more"]'); await wait(300); await audit('t-more', 't-more'); }
  await p.click('#tabs button[data-t="t-read"]');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file);
  for (const [id] of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1400);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  for (const [card, ctl] of ANIMS) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1200);
    const r = await p.$eval(`#${ctl}-p`, e => e.getAttribute('aria-label')); if (r !== 'Play') problems.push(`reduced motion: ${card} played by itself`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
