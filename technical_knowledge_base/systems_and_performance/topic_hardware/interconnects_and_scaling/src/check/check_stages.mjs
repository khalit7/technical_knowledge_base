// The 2026-11-06 rollout checks for Interconnects and scaling (2026-11-12), adapted from GPU architecture's check_stages.mjs:
// the three 3D stages (Fig. 1 the ladder, Fig. 2 one server, Fig. 5 parallelism) and the two 2D animations (the all-reduce schedules, the RDMA
// stepper) play by themselves once scrolled into view, step to their last step with one step-list item per step, stop redrawing off screen and
// never move under reduced motion; the algorithm switch swaps the step list and replays; the simulator tab's widget never plays by itself;
// no errors, NaN, undefined or sideways scroll in any tab; splits are two columns at 1400 px and one below 1100 px; scene labels do not overlap
// each other, leave or touch the card at 1400 px, at the end of each step and in the middle of its tween; the numbers in the step lists equal
// the page's own data (window.IC, IC_HERO, IC_SRV, IC_PAR, IC_ARSTR).
// usage (from the repo root): node technical_knowledge_base/systems_and_performance/topic_hardware/interconnects_and_scaling/src/check/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../../index.html'), shots = process.argv[2] || path.resolve(here, '../../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = [['stg-hero', 'sx-hero'], ['stg-srv', 'sx-srv'], ['stg-par', 'sx-par']];
// 2D animations: card, control prefix, step list, and the mode switch (segment id, [mode, list] pairs) if any
const ANIMS = [['ic-arcard', 'ic-arctl', 'sx-ar-ring', ['ic-aralg', [['rd', 'sx-ar-rd'], ['rab', 'sx-ar-rab'], ['switch', 'sx-ar-switch'], ['ring', 'sx-ar-ring']]]],
  ['ic-rdcard', 'ic-rdctl', 'sx-rd', null]];
const SPLITS = 16, SIM_SPLITS = 2;
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
      return { bad: (c.innerText.match(/.{0,30}\b(NaN|undefined|Infinity(?! Cache| Fabric))\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } }, tab);
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  // labels drawn in the canvas: boxes from the renderer's own label list, measured with the same font, must not overlap, leave or touch the card
  const overlaps = async (id, where) => {
    if (width !== 1400) return;
    const r = await p.evaluate(id => { const st = (window.ICSTG || {})[id]; if (!st) return null; const cv = st.host.querySelector('canvas'), cx = cv.getContext('2d'), W = cv.clientWidth, H = cv.clientHeight;
      const boxes = [], out = [];
      (st.R.lab || []).forEach(L => { if (L.a < .35) return; const o = L.o, fs = Math.max(12, o.fs || 12.5); cx.font = (o.b ? '600 ' : '') + fs + 'px ' + (o.mono ? 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace' : 'ui-sans-serif,-apple-system,"Segoe UI",Helvetica,Arial,sans-serif');
        const w = cx.measureText(L.text).width, x0 = o.al === 'right' ? L.x - w : o.al === 'left' ? L.x : L.x - w / 2; boxes.push([x0, L.y - fs / 2, x0 + w, L.y + fs / 2, L.text]);
        if (x0 < 3 || x0 + w > W - 3 || L.y - fs / 2 < 2 || L.y + fs / 2 > H - 2) out.push('outside or touching the card: ' + L.text) });
      for (let i = 0; i < boxes.length; i++)for (let j = i + 1; j < boxes.length; j++) { const A = boxes[i], B = boxes[j], ox = Math.min(A[2], B[2]) - Math.max(A[0], B[0]), oy = Math.min(A[3], B[3]) - Math.max(A[1], B[1]);
        if (ox > 2 && oy > 2) out.push(A[4] + ' / ' + B[4]) }
      return out }, id);
    if (r === null) { problems.push(`${tag}: ${id} is not registered in window.ICSTG`); return }
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
      const D = window.IC, H = window.IC_HERO, V = window.IC_SRV, Q = window.IC_PAR, f = x => Math.round(x).toLocaleString('en-US');
      // Fig. 1: the ladder, from IC.ladder
      if (H.hbm !== D.ladder.find(r => /HBM/.test(r.nm)).bw || H.nvl !== 450 || H.pcie !== 63 || H.nic !== 50) out.push('Fig. 1 bandwidths differ from IC.ladder: ' + JSON.stringify(H));
      need('sx-hero', 0, f(H.hbm) + ' GB/s'); need('sx-hero', 0, f(H.stack) + ' GB/s each'); need('sx-hero', 1, H.nvl + ' GB/s each way'); need('sx-hero', 2, H.pcie + ' GB/s each way');
      need('sx-hero', 3, H.nic + ' GB/s each way'); need('sx-hero', 4, '1:' + H.over); need('sx-hero', 4, 'about ' + Math.round(H.spine) + ' GB/s');
      // Fig. 2: one server
      need('sx-srv', 0, V.nvlinks + ' NVLink links'); need('sx-srv', 0, V.nvl + ' GB/s each way'); need('sx-srv', 0, V.pcie + ' GB/s each way'); need('sx-srv', 1, 'full ' + V.nvl + ' GB/s');
      need('sx-srv', 2, '128 GB/s (both directions)'); need('sx-srv', 2, V.mesh + ' GB/s each way'); need('sx-srv', 3, V.meshAll + ' GB/s total');
      if (V.meshAll !== 448) out.push('Fig. 2: 7 links of 64 are not 448');
      // Fig. 5: the parallelism ratios from IC.par
      const P = D.par, r = Q.ratio, pc = x => Math.round(100 * x) + '%';
      need('sx-par', 0, f(P.nvl.I) + ' FLOPs'); need('sx-par', 0, f(P.ib.I)); need('sx-par', 1, pc(r.tpn)); need('sx-par', 2, pc(r.tpi)); need('sx-par', 2, pc(P.tp70.wait_ib));
      need('sx-par', 3, (100 * r.pp).toFixed(2) + '%'); need('sx-par', 4, f(P.ib.dp_tokens) + ' tokens'); need('sx-par', 4, 'about ' + pc(r.dp)); need('sx-par', 4, f(Q.tok));
      need('sx-par', 5, Math.round(100 * D.fab.cross_frac) + '%');
      // the all-reduce lists: the stretch tables cover every frame of the simulator's run, and the bytes in the lists equal IC.ex
      const ST = window.IC_ARSTR, steps = { ring: 14, rd: 3, rab: 6, switch: 2 };
      Object.entries(ST).forEach(([k, v]) => { if (v[0][0] !== 0 || v[v.length - 1][1] !== steps[k] || v.some((x, i) => i && x[0] !== v[i - 1][1] + 1)) out.push('stretches of ' + k + ' do not cover its frames') });
      const G8 = D.ex.grad8 / 1e9; need('sx-ar-ring', 3, (2 * 7 / 8 * G8).toFixed(1) + ' GB'); need('sx-ar-rd', 3, (3 * G8).toFixed(1) + ' GB'); need('sx-ar-rab', 3, (2 * 7 / 8 * G8).toFixed(1) + ' GB');
      need('sx-ar-switch', 2, G8.toFixed(2) + ' GB'); need('sx-ar-switch', 2, Math.round(100 * D.ex.ar8_nvls / D.ex.ar8_nvl) + '%');
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
  // off screen: the end of section 10, far from every stage (the hero sits at the top of the page)
  await p.evaluate(() => window.scrollTo(0, document.getElementById('t-read').getBoundingClientRect().bottom + scrollY - innerHeight)); await wait(800);
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
  { await p.click('#tabs button[data-t="t-sim"]'); await wait(500);
    const sc = await p.$$eval('#t-sim .s3sp', xs => xs.map(x => getComputedStyle(x).display));
    if (width === 1400 && (sc.length !== SIM_SPLITS || sc.some(c => c !== 'grid'))) problems.push(`${tag}: simulator splits are not ${SIM_SPLITS} two-column grids`);
    await p.$eval('#sim-card', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    if ((await p.$eval('#sim-ctl-p', e => e.getAttribute('aria-label'))) !== 'Play' || (await p.$eval('#sim-ctl-s', e => +e.value)) !== 0) problems.push(`${tag}: the simulator played by itself`);
    await p.$eval('#sim-ctl-f', e => e.click()); await audit('t-sim', 't-sim');
    if (shoot) await p.screenshot({ path: `${shots}/x-t-sim-${scheme}-${width}.png` });
    await p.click('#tabs button[data-t="t-more"]'); await wait(300); await audit('t-more', 't-more'); }
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
