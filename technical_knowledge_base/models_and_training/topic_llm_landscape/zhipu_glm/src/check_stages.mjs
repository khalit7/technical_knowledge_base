// The 2026-11-06 rollout checks for Zhipu: GLM (2026-11-10), adapted from MiniMax's check_stages.mjs: the three 3D stages (Shape towers,
// Attention by release, slime's staleness rules) play by themselves once scrolled into view, step to their last step with one step-list item per
// step, stop redrawing off screen and never move under reduced motion; no errors, NaN, undefined or sideways scroll in any tab; the splits are
// two columns at 1400 px and one below 1100 px; right-column content stays inside its column; the numbers the step lists write are what the
// page's data (window.ZG, from config.json via mk_data.py) gives. Screenshots of every step (mid-tween and settled) at 1400 light, and of the
// middle step at 390 dark, go to the shots dir (outside the repo).
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_llm_landscape/zhipu_glm/src/check_stages.mjs <shots dir>
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2];
if (!shots) { console.log('usage: check_stages.mjs <shots dir outside the repo>'); process.exit(2); }
fs.mkdirSync(shots, { recursive: true });
const STAGES = [['stg-tw', 'sx-tw'], ['stg-at', 'sx-at'], ['stg-sl', 'sx-sl']];
const wait = ms => new Promise(r => setTimeout(r, ms));
const problems = [];
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
try {
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
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (!cols.length || cols.some(c => c !== 'grid'))) problems.push(`${tag}: a split is not two columns (${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  if (width === 1400) { const over = await p.$$eval('#t-read .s3R', xs => xs.map(x => { const r = x.getBoundingClientRect(); let bad = '';
      x.querySelectorAll('*').forEach(k => { const q = k.getBoundingClientRect(); if (!bad && q.width && (q.right > r.right + 1 || q.left < r.left - 1) && !k.closest('.tw')) bad = k.tagName + '.' + k.className });
      return bad ? x.innerHTML.slice(0, 40) + ' :: ' + bad : '' }).filter(Boolean));
    over.forEach(o => problems.push(`${tag}: right-column content wider than its column: ${o}`)) }
  // autoplay: each stage plays once scrolled into view
  for (const [id] of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
  }
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(800);
  const offs = () => p.$$eval('.stg', xs => xs.map(x => { const r = x.getBoundingClientRect(); return r.bottom < 0 || r.top > innerHeight ? (+x.dataset.draws || 0) + (+x.dataset.frames || 0) : -1 }));
  const d0 = await offs(); await wait(1200); const d1 = await offs();
  if (d1.some((v, i) => v >= 0 && v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  const stepAll = async (id, lid) => {
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length);
    if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but list ${lid} shows ${lis}`);
    if (n > 8) problems.push(`${tag}: ${id} has ${n} steps, more than about 8`);
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' }));
    for (let k = 0; k < n; k++) {
      if (k) await p.$eval(`#${id}-f`, e => e.click());
      if (shoot && (width === 1400 || k === Math.floor(n / 2))) {
        await wait(700); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}-midtween-${scheme}-${width}.png` });
        await wait(2400); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}-${scheme}-${width}.png` })
      } else await wait(250);
    }
    await wait(2800);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
    await audit(`${id} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id} list ${lid} does not mark the last step`);
  };
  for (const [id, lid] of STAGES) await stepAll(id, lid);
  if (width === 1400) { // the numbers the step lists write are what the page's data gives
    const r = await p.evaluate(() => { const out = [], n = v => v.toLocaleString('en-GB');
      const sup = t => String(t).replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, c => '⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(c)), fb = v => fmtBytes(v).replace('.0 ', ' ');
      const li = (lid, k) => document.getElementById(lid).children[k].textContent.replace(/\s+/g, ' ');
      const need = (lid, k, x) => { if (!li(lid, k).includes(sup(x))) out.push(`${lid} item ${k + 1} lacks "${sup(x)}"`) };
      const T = {}; ZG.towers.forEach(t => T[t.id] = t);
      need('sx-tw', 0, T.g45.L + ' layers × ' + n(T.g45.d) + ' with ' + T.g45.E + ' experts and ' + T.g45.H + ' heads');
      need('sx-tw', 0, 'DeepSeek-V3 ' + T.ds3.L + ' × ' + n(T.ds3.d) + ', ' + T.ds3.E + ' experts, ' + T.ds3.H + ' heads');
      need('sx-tw', 0, 'Kimi K2 ' + T.k2.L + ' × ' + n(T.k2.d) + ', ' + T.k2.E + ' experts, ' + T.k2.H + ' heads');
      need('sx-tw', 0, T.g45.L + ' / ' + T.ds3.L + ' = ' + (T.g45.L / T.ds3.L).toFixed(2)); need('sx-tw', 0, n(T.g45.d) + ' / ' + n(T.ds3.d) + ' = ' + (T.g45.d / T.ds3.d).toFixed(2));
      const q = T.g45.H * T.g45.hd, kv = 2 * T.g45.kvh * T.g45.hd;
      need('sx-tw', 1, T.g45.H + ' × ' + T.g45.hd + ' = ' + n(q)); need('sx-tw', 1, (T.g45.H / (T.g45.d / T.g45.hd)).toFixed(1) + ' times'); need('sx-tw', 1, '2 × ' + T.g45.kvh + ' × ' + T.g45.hd + ' = ' + n(kv));
      need('sx-tw', 1, n(T.g45.L * kv * 2) + ' bytes'); need('sx-tw', 1, fb(T.g45.L * kv * 2)); need('sx-tw', 1, fb(T.g45.L * kv * 2 * 131072) + ' for one 128K');
      need('sx-tw', 1, 'group of ' + T.g45.H / T.g45.kvh + ' query heads');
      const moe = t => t.L - t.dense; need('sx-tw', 2, T.g5.L + ' layers × ' + n(T.g5.d) + ' (' + T.g5.dense + ' dense and ' + moe(T.g5) + ' MoE)');
      need('sx-tw', 2, moe(T.g45) + ' × 2 = ' + 2 * moe(T.g45)); need('sx-tw', 2, moe(T.g5) + ' × 2 = ' + 2 * moe(T.g5));
      const nk = [...T.fl.types].filter(c => c === 'K').length;
      need('sx-tw', 3, T.fl.L + ' × ' + n(T.fl.d) + ' with ' + T.fl.E + ' experts'); need('sx-tw', 3, nk + ' of its layers'); need('sx-tw', 3, (T.fl.L - nk) + ' sparse'); need('sx-tw', 3, T.fl.hc === 4 ? 'four parallel residual streams' : 'hc');
      const M = ZG.att, N = ZG.nums;
      ['g45', 'g5', 'g53', 'fl'].forEach(id => { need('sx-at', 0, n(M[id].tot)); need('sx-at', 0, fb(M[id].tot * 2)) });
      need('sx-at', 1, '2 × 8 × 128 = 2,048'); need('sx-at', 1, (2048 / (N.mla + N.idx)).toFixed(1) + ' times less'); need('sx-at', 1, (M.g45.tot / M.g5.tot).toFixed(1) + ' times less per token');
      const ixw = N.L1M * N.ih * N.idx, core = 64 * N.topk * (N.mla + 512);
      need('sx-at', 2, sci(ixw, 2)); need('sx-at', 2, sci(core, 2)); need('sx-at', 2, Math.round(ixw / core) + ' times'); need('sx-at', 2, (100 * N.topk / N.L1M).toFixed(1) + '%');
      need('sx-at', 3, N.nIx53 + ' of its 78'); need('sx-at', 3, '78 / ' + N.nIx53 + ' = ' + (78 / N.nIx53).toFixed(1)); need('sx-at', 3, Math.round(100 * (1 - M.g53.tot / M.g5.tot)) + '% less');
      need('sx-at', 4, N.nK + ' KDA layers'); need('sx-at', 4, N.nS + ' sparse layers'); need('sx-at', 4, '512 + 128 / 4 = ' + (N.mlaF + N.idx / N.pool)); need('sx-at', 4, n(N.L1M / N.pool));
      need('sx-at', 5, (M.g53.tot / M.fl.tot).toFixed(1) + ' times less'); need('sx-at', 5, fb(M.g53.tot * 2 * N.L1M)); need('sx-at', 5, fb(M.fl.tot * 2 * N.L1M)); need('sx-at', 5, fb(N.kdaState * 2));
      const g53w = 78 * 64 * N.topk * 1088 + N.nIx53 * N.ih * N.idx * N.L1M, flw = N.nS * 64 * N.topk * 1024 + N.nS * N.ih * N.idx * N.L1M / N.pool + N.nK * 64 * 3 * 128 * 128, full = 78 * 64 * N.L1M * 1088;
      need('sx-at', 5, sci(g53w, 2)); need('sx-at', 5, sci(flw, 2)); need('sx-at', 5, sci(full, 2)); need('sx-at', 5, 'about ' + Math.round(full / g53w) + ' times'); need('sx-at', 5, Math.round(full / flw) + ' times Flash');
      const S = ZG_SL, nm = S.RT.filter(r => r < S.LO || r > S.HI).length;
      need('sx-sl', 3, 'τ = ' + S.TAU); need('sx-sl', 2, 'w = 0, 1, 2, ' + S.PUSH.length);
      if (nm < 1) out.push('slime: no masked token');
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  await audit('end');
  for (const t of ['t-more']) { await p.click(`#tabs button[data-t="${t}"]`); await wait(300); await audit(t, t); }
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
} finally { await b.close(); }
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
