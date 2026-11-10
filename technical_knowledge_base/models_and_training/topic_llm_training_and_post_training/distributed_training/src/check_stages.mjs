// The 2026-11-06 rollout checks for Distributed Training (2026-11-10), adapted from Alignment's check_stages.mjs: the ten 3D stages
// (Fig. 2 memory, Fig. 3 collectives, Figs. 4, 6, 8, 9, 11, 12 one step under each split, Fig. 7 the TP block, Fig. 14 the mesh) play by
// themselves once scrolled into view, step to their last step with one step-list item per step, stop redrawing off screen and never move
// under reduced motion; mode switches (ZeRO stages and HSDP, TP and TP + SP, the two layouts) swap the list and replay; no errors, NaN,
// undefined or sideways scroll; splits are two columns at 1400 px and one below 1100 px; scene labels do not overlap each other at 1400 px,
// at the end of each step and in the middle of its tween; the step lists equal window.DTSTEP (the step-through model) and their numbers equal
// window.ANIM and window.LAY (the page's own models, themselves checked against recompute.py by check_calc.mjs).
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_llm_training_and_post_training/distributed_training/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = [['stg-mem', 'sx-mem'], ['stg-coll', 'sx-coll'], ['stg-dp', 'sx-dp'], ['stg-zero', 'sx-z3'], ['stg-tpb', 'sx-tpb'], ['stg-tp', 'sx-tp'],
  ['stg-pp', 'sx-pp'], ['stg-ep', 'sx-ep'], ['stg-cp', 'sx-cp'], ['stg-mesh', 'sx-mesh']];
const MODES = [['stg-zero', 'stg-zero-m', [['ZeRO-1', 'sx-z1'], ['ZeRO-2', 'sx-z2'], ['HSDP', 'sx-hsdp'], ['ZeRO-3', 'sx-z3']]],
  ['stg-tpb', 'tpbM', [['sp', 'sx-tpbs'], ['tp', 'sx-tpb']]], ['stg-mesh', 'meshM', [['dsv3', 'sx-meshd'], ['l405_8k_16k', 'sx-mesh']]]];
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
      return { bad: (c.innerText.replace(/ZeRO-Infinity/g, 'ZeRO-Inf').match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } }, tab);
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  // labels drawn in the canvas: boxes from the renderer's own label list, measured with the same font, must not overlap
  const overlaps = async (id, where) => {
    if (width !== 1400) return;
    const r = await p.evaluate(id => { const host = document.getElementById(id), cv = host.querySelector('canvas'), cx = cv.getContext('2d'), W = cv.clientWidth, H = cv.clientHeight;
      const st = (window.DTSTG || {})[id]; const labs = st && st.R ? st.R.lab || [] : []; const boxes = [], out = [];
      labs.forEach(L => { if (L.a < .35) return; const o = L.o, fs = Math.max(12, o.fs || 12.5); cx.font = (o.b ? '600 ' : '') + fs + 'px ' + (o.mono ? 'ui-monospace,Menlo,monospace' : 'ui-sans-serif,Helvetica,Arial,sans-serif');
        const w = cx.measureText(L.text).width, x0 = o.al === 'right' ? L.x - w : o.al === 'left' ? L.x : L.x - w / 2; boxes.push([x0, L.y - fs / 2, x0 + w, L.y + fs / 2, L.text]);
        if (x0 < 0 || x0 + w > W + 1 || L.y - fs / 2 < -1 || L.y + fs / 2 > H + 1) out.push('outside the card: ' + L.text) });
      for (let i = 0; i < boxes.length; i++)for (let j = i + 1; j < boxes.length; j++) { const A = boxes[i], B = boxes[j], ox = Math.min(A[2], B[2]) - Math.max(A[0], B[0]), oy = Math.min(A[3], B[3]) - Math.max(A[1], B[1]);
        if (ox > 3 && oy > 3) out.push(A[4] + ' / ' + B[4]) }
      return out }, id);
    if (r === null) problems.push(`${tag}: ${id} is not registered in window.DTSTG`);
    r.forEach(x => problems.push(`${tag}: ${id} ${where}: labels overlap or leave the card: ${x}`));
  };
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (!cols.length || cols.some(c => c !== 'grid'))) problems.push(`${tag}: a split is not two columns (${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  if (width === 1400) { const over = await p.$$eval('#t-read .s3R', xs => xs.map(x => { const r = x.getBoundingClientRect(), k = x.firstElementChild && x.firstElementChild.getBoundingClientRect(); return k && (k.right > r.right + 1 || k.left < r.left - 1) ? x.innerHTML.slice(0, 40) : '' }).filter(Boolean));
    over.forEach(o => problems.push(`${tag}: right-column content wider than its column: ${o}`)) }
  // every stage plays once in view
  for (const [id] of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2600);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
    if (shoot) { await wait(300); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-autoplay-${scheme}-${width}.png` }) }
  }
  // flows stop off screen
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
        await wait(900); await overlaps(id, `${label} step ${k + 1} mid-tween`); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${label}-s${k + 1}-midtween-${scheme}-${width}.png` });
        await wait(1700); await overlaps(id, `${label} step ${k + 1}`); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${label}-s${k + 1}-${scheme}-${width}.png` })
      } else await wait(250);
    }
    await wait(2400);
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
    await stepAll(id, lid, '-' + m);
  }
  if (width === 1400) { // the step lists are the page's own models, recomputed here
    const r = await p.evaluate(() => { const out = [], txt = el => el.textContent.replace(/\s+/g, ' ').trim();
      document.querySelectorAll('ol.sx[data-mode]').forEach(ol => { const S = DTSTEP.steps(ol.dataset.mode), lis = [...ol.children];
        if (lis.length !== S.length) out.push(ol.id + ': ' + lis.length + ' items, DTSTEP has ' + S.length);
        S.forEach((s, i) => { const want = (s.t + '. ' + s.p).replace(/\s+/g, ' '); if (lis[i] && txt(lis[i]) !== want) out.push(ol.id + ' item ' + (i + 1) + ' differs from DTSTEP: rerun node src/mk_lists.mjs') }) });
      const need = (lid, k, x) => { const li = document.getElementById(lid).children[k]; if (!li || !txt(li).includes(x)) out.push(`${lid} item ${k + 1} lacks "${x}"`) };
      const A = ANIM, GB = 1e9, g1 = v => (v / GB).toFixed(1) + ' GB';
      need('sx-mem', 0, 'bf16 weights ' + g1(2 * A.P)); need('sx-mem', 1, 'bf16 gradients ' + g1(2 * A.P)); need('sx-mem', 2, 'Adam moments ' + g1(12 * A.P)); need('sx-mem', 2, 'Model states ' + g1(16 * A.P));
      need('sx-mem', 3, 'sequence ' + g1(A.seqA)); need('sx-mem', 3, 'About ' + Math.round((16 * A.P + A.seqA) / GB) + ' GB in all');
      const L = LAY.layout(LAY.PRESETS.l405_8k_16k), D = LAY.layout(LAY.PRESETS.dsv3), s2 = x => x.toFixed(2) + ' s';
      need('sx-mesh', 0, L.comm.TP.toFixed(1) + ' GB per GPU per step, but on NVLink, ' + s2(L.t.TP)); need('sx-mesh', 1, L.comm.PP.toFixed(2) + ' GB per GPU per step, ' + s2(L.t.PP));
      need('sx-mesh', 2, L.comm.DP.toFixed(1) + ' GB, ' + s2(L.t.DP)); need('sx-mesh', 2, 'twelve times the bytes'); if (Math.floor(L.comm.TP / L.comm.DP) !== 12) out.push('TP/DP is no longer twelve times');
      need('sx-mesh', 3, 'of the ' + L.t_comp.toFixed(2) + ' s of compute'); if (L.N !== 16384) out.push('Llama mesh is not 16,384 GPUs');
      if ((L.t.TP + L.t.DP + L.t.PP) / L.t_comp >= 1 / 6) out.push('Llama: the three axes are no longer under a sixth of compute');
      need('sx-meshd', 0, D.N.toLocaleString('en-US') + ' H800s'); need('sx-meshd', 1, D.comm.EP.toFixed(0) + ' GB per GPU per step, ' + D.t.EP.toFixed(1) + ' s');
      need('sx-meshd', 2, D.comm.DP.toFixed(1) + ' GB, ' + s2(D.t.DP)); need('sx-meshd', 2, D.comm.PP.toFixed(1) + ' GB (' + s2(D.t.PP) + ')'); need('sx-meshd', 3, D.t_comp.toFixed(1) + ' s of compute');
      document.querySelectorAll('.dt-ro').forEach(e => { if (!e.textContent.trim()) out.push(e.id + ' readout is empty') });
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  await audit('end');
  for (const t of ['t-calc', 't-more']) { await p.click(`#tabs button[data-t="${t}"]`); await wait(300); await audit(t, t) }
  await p.click('#tabs button[data-t="t-read"]');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file);
  for (const [id] of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
