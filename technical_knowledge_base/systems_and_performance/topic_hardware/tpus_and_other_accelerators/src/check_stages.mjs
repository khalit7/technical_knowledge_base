// The 2026-11-06 rollout checks for TPUs and other accelerators (2026-11-12), adapted from Memory technology's check_stages.mjs:
// the three 3D stages (Fig. 2 the systolic array against scalar lanes, Fig. 3 a TPU cube and its rings, Fig. 4 a wafer as one chip) play by
// themselves once scrolled into view, step to their last step with one step-list item per step, stop redrawing off screen and never move under
// reduced motion; Fig. 2's mode switch swaps the step list and replays; the closed cycle-by-cycle widget never plays by itself; no errors, NaN,
// undefined or sideways scroll in any tab; splits are two columns at 1400 px and one below 1100 px; scene labels do not overlap each other, leave
// or touch the card at 1400 px, at the end of each step and in the middle of its tween; the numbers in the step lists equal the page's own
// simulator and models (window.TPU_SYS from SYS.simulate, TPU_POD from POD.slice, TPU_WAFER).
// usage (from the repo root): node technical_knowledge_base/systems_and_performance/topic_hardware/tpus_and_other_accelerators/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
// stage, its list, and an optional mode switch: [segment id, [[mode, list], ...]] (the last pair restores the default)
const STAGES = [['stg-sys', 'sx-sys', ['rd-sys-mode', [['lanes', 'sx-lanes'], ['sys', 'sx-sys']]]], ['stg-pod', 'sx-pod'], ['stg-wafer', 'sx-wafer']];
const WIDGETS = [['sy-anim-card', 'sy-actl', 'sy-det']];   // RD.anim widgets the reader drives: never play by themselves
const SPLITS = 9;
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
      return { bad: (c.innerText.match(/.{0,30}(?<![-\w])(NaN|undefined|Infinity(?! (?:Fabric|Cache)))\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } }, tab);
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  // labels drawn in the canvas: boxes from the renderer's own label list, measured with the same font, must not overlap, leave or touch the card
  const overlaps = async (id, where) => {
    if (width !== 1400) return;
    const r = await p.evaluate(id => { const st = (window.TPUSTG || {})[id]; if (!st) return null; const cv = st.host.querySelector('canvas'), cx = cv.getContext('2d'), W = cv.clientWidth, H = cv.clientHeight;
      const boxes = [], out = [];
      (st.R.lab || []).forEach(L => { if (L.a < .35) return; const o = L.o, fs = Math.max(12, o.fs || 12.5); cx.font = (o.b ? '600 ' : '') + fs + 'px ' + (o.mono ? 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace' : 'ui-sans-serif,-apple-system,"Segoe UI",Helvetica,Arial,sans-serif');
        const w = cx.measureText(L.text).width, x0 = o.al === 'right' ? L.x - w : o.al === 'left' ? L.x : L.x - w / 2; boxes.push([x0, L.y - fs / 2, x0 + w, L.y + fs / 2, L.text]);
        if (x0 < 3 || x0 + w > W - 3 || L.y - fs / 2 < 2 || L.y + fs / 2 > H - 2) out.push('outside or touching the card: ' + L.text) });
      for (let i = 0; i < boxes.length; i++)for (let j = i + 1; j < boxes.length; j++) { const A = boxes[i], B = boxes[j], ox = Math.min(A[2], B[2]) - Math.max(A[0], B[0]), oy = Math.min(A[3], B[3]) - Math.max(A[1], B[1]);
        if (ox > 2 && oy > 2) out.push(A[4] + ' / ' + B[4]) }
      return out }, id);
    if (r === null) { problems.push(`${tag}: ${id} is not registered in window.TPUSTG`); return }
    r.forEach(x => problems.push(`${tag}: ${id} ${where}: labels overlap or leave the card: ${x}`));
  };
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (cols.length !== SPLITS || cols.some(c => c !== 'grid'))) problems.push(`${tag}: splits are not ${SPLITS} two-column grids (${cols.length}: ${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  if (width === 1400) {
    const over = await p.$$eval('#t-read .s3R', xs => xs.map(x => { const r = x.getBoundingClientRect(), k = x.firstElementChild && x.firstElementChild.getBoundingClientRect(); return k && r.width && (k.right > r.right + 1 || k.left < r.left - 1) ? x.innerHTML.slice(0, 40) : '' }).filter(Boolean));
    over.forEach(o => problems.push(`${tag}: right-column content wider than its column: ${o}`));
    // the step lists against the page's own simulator and models, recomputed here
    const r = await p.evaluate(() => { const out = [], txt = el => el.textContent.replace(/\s+/g, ' ').trim(), n = (x, d = 0) => x.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
      const need = (lid, k, x) => { const li = document.getElementById(lid).children[k]; if (!li || !txt(li).includes(x)) out.push(`${lid} item ${k + 1} lacks "${x}"`) };
      // Fig. 2: the stretches and counts of SYS.simulate on reference case 0
      const S = window.TPU_SYS, a = S.active, T = S.T, F = S.firstOut, L = S.lastIn, c = S.cum, mx = Math.max(...a), ys = S.inputs;
      need('sx-sys', 0, S.load + ' cycles, ' + S.weights + ' reads');
      need('sx-sys', 1, 'cycles 1 to ' + (F - 1)); need('sx-sys', 1, a.slice(0, 3).join(', ').replace(/, (\d+)$/, ', then $1') + ' of 16 cells busy');
      need('sx-sys', 2, 'cycles ' + F + ' to ' + L); need('sx-sys', 2, 'up to ' + mx + ' of 16 cells busy in cycle ' + (a.indexOf(mx) + 1));
      need('sx-sys', 2, (c(L).outs - c(F - 1).outs) + ' of the ' + c(T).outs + ' results'); need('sx-sys', 2, 'enters in cycle ' + L);
      need('sx-sys', 3, 'cycles ' + (L + 1) + ' to ' + T); need('sx-sys', 3, a.slice(L).join(', ').replace(/, (\d+)$/, ', then $1') + ' cell busy');
      need('sx-sys', 3, 'remaining ' + (c(T).outs - c(L).outs) + ' results'); need('sx-sys', 3, '= ' + T + ' cycles');
      need('sx-sys', 4, c(T).macs + ' multiply-adds in ' + (S.load + T) + ' cycles, ' + (S.weights + ys) + ' reads'); need('sx-sys', 4, '(' + c(T).edge + ' reads)');
      need('sx-sys', 4, '(' + S.weights + ' reads)'); need('sx-sys', 4, 'other ' + c(T).pass + ' moves'); need('sx-sys', 4, c(T).macs + ' of ' + 16 * (S.load + T) + ' used');
      need('sx-lanes', 0, '64 multiply-adds, 128 reads'); need('sx-lanes', 1, '12 of the 16 lanes idle'); need('sx-lanes', 1, '16 more multiply-adds and 32 more reads');
      need('sx-lanes', 2, c(T).macs + ' multiply-adds in ' + S.laneCycles + ' cycles, ' + S.lanesReads + ' reads'); need('sx-lanes', 2, S.lanesReads + ' reads against the array\'s ' + (S.weights + ys));
      if (16 * 4 + 4 * 4 !== c(T).macs || 2 * 64 !== 128) out.push('Fig. 2 lanes arithmetic');
      // Fig. 3: POD.slice on v5p
      const D = window.TPU_POD;
      need('sx-pod', 0, 'about ' + D.oneWay / 1e9 + ' GB/s each way, ' + D.bidi / 1e9 + ' GB/s both ways');
      need('sx-pod', 1, D.ocs + ' in all'); need('sx-pod', 2, D.one.toFixed(3) + ' s'); need('sx-pod', 2, '16.06 GB');
      need('sx-pod', 3, D.all3.toFixed(3) + ' s'); need('sx-pod', 4, D.open.toFixed(3) + ' s'); if (D.openWrap.some(Boolean)) out.push('Fig. 3: the 2 x 2 x 4 slice wraps');
      need('sx-pod', 5, n(D.chips) + ' chips: ' + D.cubes + ' cubes of 64');
      // Fig. 4: areas and the 70B split
      const Wf = window.TPU_WAFER;
      need('sx-wafer', 0, n(Wf.wse) + ' mm'); need('sx-wafer', 0, 'about ' + Math.round(Wf.xH) + ' times'); need('sx-wafer', 0, 'about ' + Math.round(Wf.xT) + ' times'); need('sx-wafer', 0, Wf.tsp + ' mm');
      need('sx-wafer', 1, n(Wf.kb, 1) + ' KB'); need('sx-wafer', 1, '(' + Math.round(100 * Wf.used) + '%)');
      need('sx-wafer', 5, Wf.gb70.toFixed(1) + ' GB, so ' + Wf.wafers + ' wafers');
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  // every stage plays once scrolled into view; the widget does not move
  for (const [id] of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
    if (shoot) { await wait(300); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-autoplay-${scheme}-${width}.png` }) }
  }
  for (const [card, ctl, det] of WIDGETS) {
    await p.$eval('#' + det, d => { d.open = true }); await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval(`#${ctl}-p`, e => e.getAttribute('aria-label')), v = await p.$eval(`#${ctl}-s`, e => +e.value);
    if (r !== 'Play' || v !== 0) problems.push(`${tag}: widget ${card} played by itself`);
    await p.$eval('#' + det, d => { d.open = false });
  }
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  const stepAll = async (id, lid, label) => {
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length), vis = await p.$eval('#' + lid, e => !e.hidden);
    if (lis !== n || !vis) problems.push(`${tag}: ${id}${label} has ${n} steps but list ${lid} shows ${lis}${vis ? '' : ' (hidden)'}`);
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' }));
    for (let k = 0; k < n; k++) {
      if (k) await p.$eval(`#${id}-f`, e => e.click());
      if (shoot) {
        await wait(750); await overlaps(id, `${label} step ${k + 1} mid-tween`); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${label}-s${k + 1}-midtween-${scheme}-${width}.png` });
        await wait(2700); await overlaps(id, `${label} step ${k + 1}`); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${label}-s${k + 1}-${scheme}-${width}.png` })
      } else await wait(200);
    }
    await wait(1900);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id}${label} ended on ${sh}`);
    await audit(`${id}${label} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id}${label} list does not mark the last step`);
  };
  for (const [id, lid, modes] of STAGES) {
    await stepAll(id, lid, '');
    if (modes) for (const [m, ml] of modes[1]) {
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' }));
      await p.$eval(`#${modes[0]} button[data-m="${m}"]`, e => e.click()); await wait(1600);
      const st = await p.$eval(`#${id} .stg-st`, e => e.textContent), lab = await p.$eval(`#${id}-p`, e => e.getAttribute('aria-label')), fr = await p.$eval('#' + id, e => +e.dataset.frames || 0);
      if (!/^step 1 of/.test(st) || lab !== 'Pause') problems.push(`${tag}: ${id} mode ${m} did not restart and replay (${st}, ${lab})`);
      await stepAll(id, ml, '-' + m);
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
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
