// The 2026-11-06 rollout checks for Quantization and Precision (2026-11-10), adapted from PEFT's and Distributed training's check_stages.mjs:
// the four 3D stages (Fig. 2 sharing a scale, Fig. 4 GPTQ, Fig. 6 outliers, Fig. 10 training formats) play by themselves once scrolled into view,
// step to their last step with one step-list item per step, stop redrawing off screen and never move under reduced motion; the recipe buttons of Fig. 10
// stop the stage, redraw it and show their own caption; no errors, NaN, undefined or sideways scroll; splits are two columns at 1400 px and one below 1100 px;
// scene labels do not overlap each other or leave the card at 1400 px, on every step and mid-tween; the numbers written in the step lists as static text
// equal what the scenes compute from the page's data, and a few are recomputed here independently.
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_llm_training_and_post_training/quantization_and_precision/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const html = path.resolve(here, '../index.html'), file = 'file://' + html, shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = [['stg-sc', 'sx-sc'], ['stg-gq', 'sx-gq'], ['stg-out', 'sx-out'], ['stg-tr', 'sx-tr']];
const SPANS = ['sc', 'gq', 'out'];
const wait = ms => new Promise(r => setTimeout(r, ms));
const problems = [];
// the static numbers in the step lists, as written in index.html before any script runs
const raw = fs.readFileSync(html, 'utf8'), staticSpans = {};
for (const m of raw.matchAll(/<span data-(sc|gq|out)="(\w+)">(.*?)<\/span>/g)) (staticSpans[m[1] + ':' + m[2]] = staticSpans[m[1] + ':' + m[2]] || new Set()).add(m[3].replace(/<[^>]+>/g, ''));
if (Object.keys(staticSpans).length < 60) problems.push(`only ${Object.keys(staticSpans).length} data spans found in the step lists`);
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(400);
  const tag = `${scheme} ${width}`, shoot = width === 1400 || width === 390;
  const audit = async (where, tab = 't-read') => {
    const r = await p.evaluate(tab => { const c = document.getElementById(tab).cloneNode(true); c.querySelectorAll('pre,code').forEach(x => x.remove());
      return { bad: (c.innerText.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []).filter(s => !/overflow to infinity|to infinity once|for NaN|or NaN|infinity or|NaN, which/i.test(s)), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } }, tab);
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  // labels drawn in the canvas: boxes from the renderer's own label list, measured with the same font, must not overlap each other or leave the card
  const overlaps = async (id, where) => {
    if (width !== 1400) return;
    const r = await p.evaluate(id => { const host = document.getElementById(id), cv = host.querySelector('canvas'), cx = cv.getContext('2d'), W = cv.clientWidth, H = cv.clientHeight;
      const st = (window.QSTG || {})[id]; if (!st) return null; const labs = st.R.lab || [], boxes = [], out = [];
      labs.forEach(L => { if (L.a < .35) return; const o = L.o, fs = Math.max(12, o.fs || 12.5); cx.font = (o.b ? '600 ' : '') + fs + 'px ' + (o.mono ? 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace' : o.serif ? '"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif' : 'ui-sans-serif,-apple-system,"Segoe UI",Helvetica,Arial,sans-serif');
        const w = cx.measureText(L.text).width, x0 = o.al === 'right' ? L.x - w : o.al === 'left' ? L.x : L.x - w / 2; boxes.push([x0, L.y - fs / 2, x0 + w, L.y + fs / 2, L.text]);
        if (x0 < 6 || x0 + w > W - 6 || L.y - fs / 2 < 0 || L.y + fs / 2 > H) out.push('at the card edge: ' + L.text);
        if (L.ax < -2 || L.ax > W + 2 || L.ay < -2 || L.ay > H + 2) out.push('points outside the card: ' + L.text) });
      for (let i = 0; i < boxes.length; i++)for (let j = i + 1; j < boxes.length; j++) { const A = boxes[i], B = boxes[j], ox = Math.min(A[2], B[2]) - Math.max(A[0], B[0]), oy = Math.min(A[3], B[3]) - Math.max(A[1], B[1]);
        if (ox > 2 && oy > 2) out.push(A[4] + ' / ' + B[4]) }
      return out }, id);
    if (r === null) { problems.push(`${tag}: ${id} is not registered in window.QSTG`); return }
    r.forEach(x => problems.push(`${tag}: ${id} ${where}: ${x}`));
  };
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (!cols.length || cols.some(c => c !== 'grid'))) problems.push(`${tag}: a split is not two columns (${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  if (width === 1400) {
    const over = await p.$$eval('#t-read .s3R', xs => xs.map(x => { const r = x.getBoundingClientRect(), k = x.firstElementChild && x.firstElementChild.getBoundingClientRect(); return k && (k.right > r.right + 1 || k.left < r.left - 1) ? x.innerHTML.slice(0, 40) : '' }).filter(Boolean));
    over.forEach(o => problems.push(`${tag}: right-column content wider than its column: ${o}`));
    // the static step-list numbers are what the scenes write from the data
    const live = await p.evaluate(sp => [...document.querySelectorAll(sp.map(s => '[data-' + s + ']').join(','))].map(e => { const k = sp.find(x => e.getAttribute('data-' + x) != null); return [k + ':' + e.getAttribute('data-' + k), e.textContent] }), SPANS);
    for (const [k, v] of live) if (!staticSpans[k]) problems.push(`span ${k} missing from the static page`); else if (![...staticSpans[k]].some(s => s.replace(/&amp;/g, '&') === v)) problems.push(`span ${k}: static "${[...staticSpans[k]]}" but the data gives "${v}"`);
    // independent recomputes from the shipped data
    const r = await p.evaluate(() => { const out = [], D = QD, R = QF.bf16(D.rows_bf16), K = D.K, row = r => R.slice(D.rows.indexOf(r) * K, (D.rows.indexOf(r) + 1) * K);
      // per-tensor INT4: every one of row 0's first 64 weights is under half a step, so all round to 0
      const st = D.w_absmax / 7; if (row(0).slice(0, 64).some(w => Math.abs(w) >= st / 2)) out.push('row 0 has a weight that survives the per-tensor step');
      if (Math.abs(row(223)[5] + 1.6640625) > 1e-9) out.push('row 223 column 5 is ' + row(223)[5]);
      // MXFP4 on row 223 block 0: scale 2^(floor(log2 1.664) - 2) = 0.25, so -1.664 / 0.25 = -6.66 clips to -6, stored as -1.5
      const X = Math.pow(2, Math.floor(Math.log2(1.6640625)) - 2); if (X !== .25 || QF.rf(-1.6640625 / X, 'e2m1') * X !== -1.5) out.push('MXFP4 outlier ' + X);
      // GPTQ: the first move into w2 is -(error / U11) * U12
      const g = QV.gptq(), e = (g.G.w[0] - g.Q[0]) / g.U[0][0], m = -e * g.U[0][1]; if (Math.abs(m - g.states[1].moved[1]) > 1e-12) out.push('GPTQ move ' + m);
      // SmoothQuant leaves the product unchanged before rounding
      const s = QV.mig('sq', .75); if (s.prodDiff > 1e-12) out.push('smoothing changed the product ' + s.prodDiff);
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
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
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(300); await overlaps(id, `${label} step 1`);
    if (shoot) await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${label}-s1-${scheme}-${width}.png` });
    for (let k = 1; k < n; k++) {
      await p.$eval(`#${id}-f`, e => e.click());
      if (shoot) {
        await wait(650); await overlaps(id, `${label} step ${k + 1} mid-tween`); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${label}-s${k + 1}-midtween-${scheme}-${width}.png` });
        await wait(1300); await overlaps(id, `${label} step ${k + 1}`); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${label}-s${k + 1}-${scheme}-${width}.png` })
      } else await wait(250);
    }
    await wait(shoot ? 300 : 1800);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id}${label} ended on ${sh}`);
    await audit(`${id}${label} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id}${label} list does not mark the last step`);
  };
  for (const [id, lid] of STAGES) await stepAll(id, lid, '');
  // Fig. 10: every recipe stops the stage, redraws it and shows its own caption
  for (const k of ['fp16', 'te', 'ds', 'nv', 'bf16']) {
    await p.evaluate(k => document.querySelector(`#rd-trM button[data-m="${k}"]`).click(), k); await wait(150);
    const vis = await p.$$eval('#rd-trC .rd-trx', ds => ds.filter(d => !d.hidden).map(d => d.dataset.k)); if (vis.join() !== k) problems.push(`${tag}: recipe ${k} shows captions ${vis}`);
    const play = await p.$eval('#stg-tr-p', e => e.getAttribute('aria-label')); if (play !== 'Play') problems.push(`${tag}: recipe ${k} left the stage playing`);
    if (k === 'nv' || k === 'ds') for (const s of [0, 2]) { await p.evaluate(s => document.getElementById('sx-tr').children[s].click(), s); await p.$eval('#stg-tr', e => e.scrollIntoView({ block: 'center' })); await wait(1900);
      await overlaps('stg-tr', `${k} step ${s + 1}`); if (shoot) await (await p.$('#stg-tr')).screenshot({ path: `${shots}/x-stg-tr-${k}-s${s + 1}-${scheme}-${width}.png` }) }
    await audit('recipe ' + k);
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
  for (const [id] of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  // how long one redraw of the heaviest scene takes (flows redraw it about 30 times a second)
  const ms = await p.evaluate(() => { const s = QSTG['stg-out'], t0 = performance.now(); for (let i = 0; i < 10; i++)s.draw(); return (performance.now() - t0) / 10 });
  if (ms > 25) problems.push(`stg-out takes ${ms.toFixed(1)} ms a frame`); console.log('stg-out frame', ms.toFixed(1), 'ms');
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
