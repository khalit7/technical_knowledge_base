// The 2026-11-06 rollout checks for Performance math (2026-11-12), adapted from Memory technology's check_stages.mjs:
// the three 3D stages (Fig. 1 three counts over one H100, Fig. 2 one training step's FLOPs as a volume, Fig. 3 what one training step holds)
// play by themselves once scrolled into view, step to their last step with one step-list item per step, stop redrawing off screen and never
// move under reduced motion; no errors, NaN, undefined or sideways scroll in any tab; splits are two columns at 1400 px and one below 1100 px;
// scene labels do not overlap each other, leave or touch the card at 1400 px, at the end of each step and in the middle of its tween;
// the numbers in the step lists equal the page's own data (window.PMD, PMA, PM_HERO, PM_FLOPS, PM_MEM).
// usage (from the repo root): node technical_knowledge_base/systems_and_performance/topic_hardware/performance_math/src/check/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../../index.html'), shots = process.argv[2] || path.resolve(here, '../../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = [['stg-hero', 'sx-hero'], ['stg-flops', 'sx-flops'], ['stg-mem', 'sx-mem']];
const ANIMS = [];
const SPLITS = 8;
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
      return { bad: (c.innerText.match(/.{0,30}(?<![-\w])(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } }, tab);
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  // labels drawn in the canvas: boxes from the renderer's own label list, measured with the same font, must not overlap, leave or touch the card
  const overlaps = async (id, where) => {
    if (width !== 1400) return;
    const r = await p.evaluate(id => { const st = (window.PMSTG || {})[id]; if (!st) return null; const cv = st.host.querySelector('canvas'), cx = cv.getContext('2d'), W = cv.clientWidth, H = cv.clientHeight;
      const boxes = [], out = [];
      (st.R.lab || []).forEach(L => { if (L.a < .35) return; const o = L.o, fs = Math.max(12, o.fs || 12.5); cx.font = (o.b ? '600 ' : '') + fs + 'px ' + (o.mono ? 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace' : 'ui-sans-serif,-apple-system,"Segoe UI",Helvetica,Arial,sans-serif');
        const w = cx.measureText(L.text).width, x0 = o.al === 'right' ? L.x - w : o.al === 'left' ? L.x : L.x - w / 2; boxes.push([x0, L.y - fs / 2, x0 + w, L.y + fs / 2, L.text]);
        if (x0 < 3 || x0 + w > W - 3 || L.y - fs / 2 < 2 || L.y + fs / 2 > H - 2) out.push('outside or touching the card: ' + L.text) });
      for (let i = 0; i < boxes.length; i++)for (let j = i + 1; j < boxes.length; j++) { const A = boxes[i], B = boxes[j], ox = Math.min(A[2], B[2]) - Math.max(A[0], B[0]), oy = Math.min(A[3], B[3]) - Math.max(A[1], B[1]);
        if (ox > 2 && oy > 2) out.push(A[4] + ' / ' + B[4]) }
      return out }, id);
    if (r === null) { problems.push(`${tag}: ${id} is not registered in window.PMSTG`); return }
    r.forEach(x => problems.push(`${tag}: ${id} ${where}: labels overlap or leave the card: ${x}`));
  };
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (cols.length !== SPLITS || cols.some(c => c !== 'grid'))) problems.push(`${tag}: splits are not ${SPLITS} two-column grids (${cols.length}: ${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  if (width === 1400) {
    const over = await p.$$eval('#t-read .s3R', xs => xs.map(x => { const r = x.getBoundingClientRect(), k = x.firstElementChild && x.firstElementChild.getBoundingClientRect(); return k && r.width && (k.right > r.right + 1 || k.left < r.left - 1) ? x.innerHTML.slice(0, 40) : '' }).filter(Boolean));
    over.forEach(o => problems.push(`${tag}: right-column content wider than its column: ${o}`));
    // the step lists against the page's own data, recomputed here
    const r = await p.evaluate(() => { const out = [], txt = el => el.textContent.replace(/\s+/g, ' ').trim(), n = (x, d = 0) => x.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
      const need = (lid, k, x) => { const li = document.getElementById(lid).children[k]; if (!li || !txt(li).includes(x)) out.push(`${lid} item ${k + 1} lacks "${x}"`) };
      const D = window.PMD, G = 1e9;
      // Fig. 1: the four divisions
      const H = window.PM_HERO;
      need('sx-hero', 0, n(H.step_tf) + ' TFLOP'); need('sx-hero', 0, n(H.step_s, 2) + ' s'); need('sx-hero', 0, n(D.ledger_l8['8192'].traced_total / G, 1) + ' GFLOP per token');
      need('sx-hero', 1, n(H.state, 1) + ' GB of model state'); need('sx-hero', 1, n(H.act, 1) + ' GB of activations'); need('sx-hero', 1, 'about ' + n(H.peak) + ' GB');
      need('sx-hero', 2, n(2 * D.l8_P / G, 2) + ' GB of weights'); need('sx-hero', 2, n(D.kv_seq_4k_GB, 2) + ' GB KV cache'); need('sx-hero', 2, n(H.ms, 2) + ' ms'); need('sx-hero', 2, n(H.tps) + ' tokens/s');
      need('sx-hero', 3, n(H.gpuh / 1e3) + 'K H100-hours'); need('sx-hero', 3, '$' + n(H.usd / 1e6, 2) + 'M'); need('sx-hero', 3, n(H.gpus) + ' H100s');
      if (Math.abs(H.flops - 7.2e23) / 7.2e23 > .01) out.push('Fig. 1 run FLOPs ' + H.flops);
      // Fig. 2: the volume
      const F = window.PM_FLOPS, L8 = D.ledger_l8['8192'], L128 = D.ledger_l8['131072'];
      need('sx-flops', 0, n(F.mm1 / 1e6, 1) + ' MFLOP'); need('sx-flops', 0, n(F.mm8k / G) + ' GFLOP');
      need('sx-flops', 1, 'projections ' + n(F.np / G, 2) + 'B'); need('sx-flops', 1, 'MLP ' + n(F.nm / G, 2) + 'B'); need('sx-flops', 1, 'head ' + n(F.nh / G, 2) + 'B');
      need('sx-flops', 1, n(D.l8_matmulN / G, 2) + 'B = ' + n(F.fwd / G, 1) + ' GFLOP'); need('sx-flops', 1, '(' + n(F.ne / G, 2) + 'B)');
      need('sx-flops', 2, n(F.six_mm / G, 1) + ' GFLOP'); need('sx-flops', 2, n(F.six_n / G, 2)); need('sx-flops', 2, n(100 * D.l8_emb / D.l8_P, 1) + '%');
      need('sx-flops', 3, n(F.na8 / G, 2) + 'B numbers'); need('sx-flops', 3, n(F.att8 / G, 1) + ' GFLOP'); need('sx-flops', 3, n(F.tot8 / G, 2) + ' GFLOP'); need('sx-flops', 3, n(F.tot8 / F.six_n, 2) + ' ×');
      need('sx-flops', 3, n(D.step_tf_8k) + ' TFLOP'); need('sx-flops', 4, n(F.na128 / G, 1) + 'B numbers'); need('sx-flops', 4, n(F.att128 / G, 1) + ' GFLOP');
      need('sx-flops', 4, n(F.tot128 / G, 1) + ' GFLOP'); need('sx-flops', 4, n(F.tot128 / L128.six_n, 1) + ' ×'); need('sx-flops', 4, n(F.na128 / F.na8) + ' times');
      if (Math.abs(F.np + F.nm + F.nh - D.l8_matmulN) > 1e6) out.push('Fig. 2 matmul parameters ' + (F.np + F.nm + F.nh));
      if (Math.abs(2 * F.na8 * 3.5 - F.att8) > 1e3) out.push('Fig. 2 attention volume ' + F.att8);
      // Fig. 3: the memory stack
      const M = window.PM_MEM;
      need('sx-mem', 0, n(M.state / G, 1) + ' GB'); need('sx-mem', 1, n(M.shard / G, 1) + ' GB each');
      need('sx-mem', 2, n(M.layer.flash / G, 2) + ' GB'); need('sx-mem', 2, n(D.act_layers_flash_GB, 1) + ' GB after 32 layers'); need('sx-mem', 2, n(M.post / G, 2) + ' GB of FP32 logits'); need('sx-mem', 2, n(M.peak.flash / G, 1) + ' GB');
      need('sx-mem', 3, n(D.step_tf_8k) + ' TFLOP'); need('sx-mem', 3, n(M.time.flash, 2) + ' s');
      need('sx-mem', 4, n((M.layer.eager - M.layer.flash) / G, 1) + ' GB: ' + n(M.layer.eager / G, 1) + ' GB per layer'); need('sx-mem', 4, n(M.peak.eager / G) + ' GB');
      need('sx-mem', 5, '(' + n(M.layer.ckpt / 1e6) + ' MB)'); need('sx-mem', 5, n(M.peak.ckpt / G, 1) + ' GB'); need('sx-mem', 5, n(M.rec / G, 2) + ' GB is rebuilt'); need('sx-mem', 5, n(M.hfu, 2) + ' times'); need('sx-mem', 5, n(M.time.ckpt, 2) + ' s');
      if (Math.abs(M.hfu - D.hfu_ratio_ckpt) > 1e-9) out.push('Fig. 3 recompute ratio ' + M.hfu + ' against ' + D.hfu_ratio_ckpt);
      if (Math.abs(M.peak.flash / G - D.anim_peaks_GB.flash) > 1e-6 || Math.abs(M.time.flash - D.anim_time_s.flash) > 1e-9) out.push('Fig. 3 engine against recompute.json');
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
  await p.evaluate(() => document.getElementById('rd-s8').scrollIntoView({ block: 'start' })); await wait(800); // a full-width section with no stage
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
  for (const t of ['t-ledger', 't-plan', 't-more']) { await p.click(`#tabs button[data-t="${t}"]`); await wait(400); await audit(t, t); if (shoot) await p.screenshot({ path: `${shots}/x-tab-${t}-${scheme}-${width}.png`, fullPage: true }); }
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
