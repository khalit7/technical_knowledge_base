// The 2026-11-06 rollout checks for Distributed and disaggregated serving (2026-11-12), adapted from Batching, KV cache and scheduling's check_stages.mjs:
// the seven 3D stages (Fig. 1 five ways to spread serving, Fig. 2 the KV-aware router, Fig. 3a tensor parallel, Fig. 3b pipeline parallel,
// Fig. 5 one MoE layer under expert parallelism, Fig. 6 colocated against disaggregated, Fig. 8 the serving-layer stack) and the 2D step animation
// (Fig. 4, one decode step four ways) play by themselves once scrolled into view, step to their last step with one step-list item per step, stop
// redrawing off screen and never move under reduced motion; the two long replays (Fig. 7 the prompt on a time axis, the EPLB stepper) are widgets
// that never play by themselves and open on their last frame; no errors, NaN, undefined or sideways scroll; splits are two columns at 1400 px and
// one below 1100 px; scene labels do not overlap or leave the card at 1400 px; the numbers in the step lists equal the page's planner data (window.DDC
// through the scenes' DD_* objects).
// usage (from the repo root): node technical_knowledge_base/systems_and_performance/topic_inference_and_serving/distributed_and_disaggregated_serving/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = [['stg-hero', 'sx-hero'], ['stg-rt', 'sx-rt'], ['stg-tp', 'sx-tp'], ['stg-pp', 'sx-pp'], ['stg-ep', 'sx-ep'], ['stg-pd', 'sx-pd'], ['stg-stack', 'sx-stack']];
const ANIMS = [['dd-split-card', 'dd-split-ctl', 'sx-split', null]];
const WIDGETS = [['dd-pdan-card', 'dd-pdan-ctl'], ['ep-an-card', 'ep-an-ctl']];
const SPLITS = 15;
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
  const overlaps = async (id, where) => {
    if (width !== 1400) return;
    const r = await p.evaluate(id => { const st = (window.DDSTG || {})[id]; if (!st) return null; const cv = st.host.querySelector('canvas'), cx = cv.getContext('2d'), W = cv.clientWidth, H = cv.clientHeight;
      const boxes = [], out = [];
      (st.R.lab || []).forEach(L => { if (L.a < .35) return; const o = L.o, fs = Math.max(12, o.fs || 12.5); cx.font = (o.b ? '600 ' : '') + fs + 'px ' + (o.mono ? 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace' : 'ui-sans-serif,-apple-system,"Segoe UI",Helvetica,Arial,sans-serif');
        const w = cx.measureText(L.text).width, x0 = o.al === 'right' ? L.x - w : o.al === 'left' ? L.x : L.x - w / 2; boxes.push([x0, L.y - fs / 2, x0 + w, L.y + fs / 2, L.text]);
        if (x0 < 3 || x0 + w > W - 3 || L.y - fs / 2 < 2 || L.y + fs / 2 > H - 2) out.push('outside or touching the card: ' + L.text) });
      for (let i = 0; i < boxes.length; i++)for (let j = i + 1; j < boxes.length; j++) { const A = boxes[i], B = boxes[j], ox = Math.min(A[2], B[2]) - Math.max(A[0], B[0]), oy = Math.min(A[3], B[3]) - Math.max(A[1], B[1]);
        if (ox > 2 && oy > 2) out.push(A[4] + ' / ' + B[4]) }
      return out }, id);
    if (r === null) { problems.push(`${tag}: ${id} is not registered in window.DDSTG`); return }
    r.forEach(x => problems.push(`${tag}: ${id} ${where}: labels overlap or leave the card: ${x}`));
  };
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (cols.length !== SPLITS || cols.some(c => c !== 'grid'))) problems.push(`${tag}: splits are not ${SPLITS} two-column grids (${cols.length}: ${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  if (width === 1400) {
    const over = await p.$$eval('#t-read .s3R', xs => xs.map(x => { const r = x.getBoundingClientRect(), k = x.firstElementChild && x.firstElementChild.getBoundingClientRect(); return k && r.width && (k.right > r.right + 1 || k.left < r.left - 1) ? x.innerHTML.slice(0, 40) : '' }).filter(Boolean));
    over.forEach(o => problems.push(`${tag}: right-column content wider than its column: ${o}`));
    // the step lists against the simulator's own numbers, recomputed here
    const r = await p.evaluate(() => { const out = [], txt = el => el.textContent.replace(/\s+/g, ' ').trim(), n = (x, d = 0) => x.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
      const need = (lid, k, x) => { const li = document.getElementById(lid).children[k]; if (!li || !txt(li).includes(x)) out.push(`${lid} item ${k + 1} lacks "${x}"`) };
      const f1 = v => n(v, 1), f0 = v => n(v, 0), C = window.DDC, H = window.DD_HERO, Q = window.DD_RT, T = window.DD_TP, E = window.DD_EP, PD = window.DD_PD;
      // Fig. 1
      need('sx-hero', 1, H.tp); need('sx-hero', 3, H.ep); need('sx-hero', 4, H.kv); need('sx-hero', 4, 'about ' + H.nic); need('sx-hero', 4, H.nvl + ' over NVLink');
      // Fig. 2 (Dynamo's cost on the illustrative loads)
      const c = [0, 1, 2].map(w => Q.cost(w, Q.L0[0]));
      need('sx-rt', 1, Q.OV[0] + ' of those blocks'); need('sx-rt', 1, 'A ' + Q.L0[0] + ', B ' + Q.L0[1] + ', C ' + Q.L0[2]);
      need('sx-rt', 2, 'A ' + (Q.PB - Q.OV[0]) + ', B and C ' + Q.PB); need('sx-rt', 2, 'A ' + c[0] + ', B ' + c[1] + ', C ' + c[2]);
      need('sx-rt', 3, (Q.PB - Q.OV[0]) + ' blocks of prompt instead of ' + Q.PB);
      need('sx-rt', 4, 'under ' + Q.cross); need('sx-rt', 4, 'At ' + Q.LA2 + ', A costs ' + Q.cost(0, Q.LA2) + " against B's " + c[1]);
      if (Q.cost(0, Q.cross - 1) >= c[1] || Q.cost(0, Q.cross) < c[1]) out.push('Fig. 2 crossover is not at ' + Q.cross);
      // Fig. 3a and 3b
      need('sx-tp', 0, T.w1 + ' GB'); need('sx-tp', 0, T.t1 + ' ms'); need('sx-tp', 1, T.w8 + ' GB'); need('sx-tp', 2, T.ar + ' KiB'); need('sx-tp', 2, T.nar + ' per token, ' + T.tok + ' MB');
      need('sx-tp', 2, 'about ' + T.comm + ' ms'); need('sx-tp', 3, T.t8 + ' ms'); need('sx-tp', 3, T.m1 + ' ms to ' + T.m8 + ' ms'); need('sx-tp', 3, T.comm + ' ms');
      need('sx-tp', 4, T.nvl + ' GB/s'); need('sx-tp', 4, T.nic + ' GB/s'); if (T.ratio !== '9') out.push('Fig. 3a link ratio ' + T.ratio);
      need('sx-pp', 0, T.w8 + ' GB'); need('sx-pp', 1, T.p8 + ' ms'); need('sx-pp', 2, T.tps + ' tokens per second'); need('sx-pp', 2, T.p64 + ' ms');
      // Fig. 4 (the 2D animation), from the planner's step times
      const SP = window.DD_SPLIT, ps = [0, 1, 2, 3, 4, 5, 6].map(i => SP.plan(i));
      need('sx-split', 0, f1(ps[0].r.t_ms) + ' ms'); need('sx-split', 1, f1(ps[1].r.t_ms) + ' ms'); need('sx-split', 2, f1(ps[2].wgb) + ' GB'); need('sx-split', 2, n(ps[2].r.comm_ms, 2) + ' ms'); need('sx-split', 2, f1(ps[2].r.t_ms) + ' ms');
      need('sx-split', 3, f1(ps[3].r.t_ms) + ' ms'); need('sx-split', 4, f1(ps[4].r.t_ms) + ' ms'); need('sx-split', 4, f0(ps[4].tps) + ' tokens'); need('sx-split', 5, f1(ps[5].r.t_ms) + ' ms'); need('sx-split', 5, f0(ps[5].tps) + ' tokens');
      need('sx-split', 6, f1(ps[6].r.t_ms) + ' ms'); need('sx-split', 6, f0(ps[6].tps) + ' tokens');
      // Fig. 5
      need('sx-ep', 0, C.ep.E + ' routed experts'); need('sx-ep', 0, E.per + ' each'); need('sx-ep', 1, E.k + ' experts'); need('sx-ep', 1, E.disp + ' bytes'); need('sx-ep', 2, E.comb + ' bytes'); need('sx-ep', 2, E.layer + ' bytes per token'); need('sx-ep', 2, E.tok + ' MB per token over ' + E.L);
      // Fig. 6
      need('sx-pd', 0, PD.co + ' ms'); need('sx-pd', 1, PD.mix + ' ms'); need('sx-pd', 2, PD.pd + ' ms'); need('sx-pd', 3, PD.pre + ' ms'); need('sx-pd', 3, PD.kib + ' KiB = ' + PD.mib + ' MiB across ' + PD.L);
      need('sx-pd', 4, PD.nic + ' ms'); need('sx-pd', 4, PD.nvl + ' ms over NVLink');
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  // every stage and step animation plays once scrolled into view; the widgets do not move
  for (const [id] of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
    if (shoot) { await wait(300); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-autoplay-${scheme}-${width}.png` }) }
  }
  for (const [card, ctl] of ANIMS) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const lab = await p.$eval(`#${ctl}-p`, e => e.getAttribute('aria-label')); if (lab !== 'Pause') problems.push(`${tag}: ${card} did not play when scrolled into view`);
  }
  for (const [card, ctl] of WIDGETS) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); const v0 = await p.$eval(`#${ctl}-s`, e => e.value); await wait(1500);
    const r = await p.$eval(`#${ctl}-s`, e => [e.value, +e.max]), lab = await p.$eval(`#${ctl}-p`, e => e.getAttribute('aria-label'));
    if (lab !== 'Play' || r[0] !== v0 || +r[0] !== r[1]) problems.push(`${tag}: widget ${card} moved by itself or does not open on its last frame (${lab}, ${v0} -> ${r[0]} of ${r[1]})`);
  }
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  // the hero sits at the top: only it may keep redrawing (its flows) while the page is scrolled to the top
  if (d1.some((v, i) => i > 0 && v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  const stepAll = async (id, lid) => {
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length);
    if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but list ${lid} shows ${lis}`);
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' }));
    for (let k = 0; k < n; k++) {
      if (k) await p.$eval(`#${id}-f`, e => e.click());
      if (shoot) {
        await wait(750); await overlaps(id, `step ${k + 1} mid-tween`); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}-midtween-${scheme}-${width}.png` });
        await wait(1500); await overlaps(id, `step ${k + 1}`); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}-${scheme}-${width}.png` })
      } else await wait(200);
    }
    await wait(2300);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
    await audit(`${id} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id} list does not mark the last step`);
  };
  for (const [id, lid] of STAGES) await stepAll(id, lid);
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
    for (const [m, ml] of (modes ? modes[1] : [])) {
      await p.$eval(`#${modes[0]} button[data-m="${m}"]`, e => e.click()); await wait(1600);
      const st = await p.$eval(`#${ctl}-s`, e => +e.value), lab = await p.$eval(`#${ctl}-p`, e => e.getAttribute('aria-label'));
      if (st > 1 || (lab !== 'Pause' && !(st === 0))) problems.push(`${tag}: ${card} mode ${m} did not restart (${st}, ${lab})`);
      const hid = await p.$eval('#' + card, (c, ml) => [...c.closest('.s3sp').querySelectorAll('ol.sx')].filter(o => !o.hidden).map(o => o.id), ml);
      if (hid.length !== 1 || hid[0] !== ml) problems.push(`${tag}: ${card} mode ${m} shows lists ${hid}`);
      await step2d(card, ctl, ml, '-' + m);
    }
  }
  // the widgets: every control, every option
  for (const [card, ctl] of WIDGETS) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' }));
    await p.evaluate(async card => { const c = document.getElementById(card), sl = ms => new Promise(r => setTimeout(r, ms));
      for (const btn of c.querySelectorAll('.seg button')) { btn.click(); await sl(20) }
      for (const sel of c.querySelectorAll('select:not([id$="-v"])')) for (const o of sel.options) { sel.value = o.value; sel.dispatchEvent(new Event('change')); await sl(10) } }, card);
    for (let k = 0; k < 20; k++) await p.$eval(`#${ctl}-b`, e => e.click());
    await audit(`${card} controls`);
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
  for (const [card, ctl] of ANIMS.concat(WIDGETS)) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1200);
    const r = await p.$eval(`#${ctl}-p`, e => e.getAttribute('aria-label')); if (r !== 'Play') problems.push(`reduced motion: ${card} played by itself`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
