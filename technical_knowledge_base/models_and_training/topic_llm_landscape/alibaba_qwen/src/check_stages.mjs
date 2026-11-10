// The 2026-11-06 rollout checks for Alibaba: Qwen (2026-11-10), adapted from LLM Architecture Gallery's check_stages.mjs: the two 3D stages
// (Fig. 1 the loop as layer towers, Fig. 3 one MoE layer per release) and the hybrid-attention animation (#hx, its own controller, three modes)
// play by themselves once scrolled into view, step to their last step with one step-list item per step, stop redrawing off screen and never
// move under reduced motion; no errors, NaN, undefined or sideways scroll in any tab; the splits are two columns at 1400 px and one below
// 1100 px; the numbers the step lists write are what the page's config data (window.QW) gives. Screenshots of every step (mid-tween and settled)
// at 1400 light, and of the middle step at 390 dark, go to the shots dir (outside the repo).
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_llm_landscape/alibaba_qwen/src/check_stages.mjs <shots dir>
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
const STAGES = ['stg-hero', 'stg-moe'];
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
  if (width === 1400) { const over = await p.$$eval('#t-read .s3R', xs => xs.map(x => { const r = x.getBoundingClientRect(), k = x.firstElementChild && x.firstElementChild.getBoundingClientRect(); return k && (k.right > r.right + 1 || k.left < r.left - 1) ? x.innerHTML.slice(0, 40) : '' }).filter(Boolean));
    over.forEach(o => problems.push(`${tag}: right-column content wider than its column: ${o}`)) }
  for (const id of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
  }
  // the hybrid animation: plays in view (data-frames rises, the button reads Pause), stops off screen
  await p.$eval('#hx', e => e.scrollIntoView({ block: 'center' })); await wait(2000);
  { const r = await p.$eval('#hx', e => [+e.dataset.frames || 0, document.getElementById('hxPlay').getAttribute('aria-label'), e.dataset.playing]);
    if (!(r[0] > 0) || r[1] !== 'Pause' || r[2] !== '1') problems.push(`${tag}: #hx did not play when scrolled into view (${r})`) }
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(800);
  const offs = () => p.$$eval('.stg, #hx', xs => xs.map(x => { const r = x.getBoundingClientRect(); return r.bottom < 0 || r.top > innerHeight ? (+x.dataset.draws || 0) + (+x.dataset.frames || 0) : -1 }));
  const d0 = await offs(); await wait(1200); const d1 = await offs();
  if (d1.some((v, i) => v >= 0 && v !== d0[i])) problems.push(`${tag}: a stage or the hybrid animation redrew while off screen (${d0} -> ${d1})`);
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
        await wait(2000); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}-${scheme}-${width}.png` })
      } else await wait(250);
    }
    await wait(2000);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
    await audit(`${id} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id} list ${lid} does not mark the last step`);
  };
  for (const id of STAGES) await stepAll(id, 'sx-' + id.slice(4));
  // the hybrid animation in its three modes: the list has one item per step, forward reaches the last step, the list marks it; a mode toggle replays
  for (const m of ['full', 'hyb', 'qsa']) {
    await p.$eval('#hx', e => e.scrollIntoView({ block: 'center' }));
    await p.$eval(`#hxM button[data-m=${m}]`, e => e.click()); await wait(1200);
    if (await p.$eval('#hxPlay', e => e.getAttribute('aria-label')) !== 'Pause') problems.push(`${tag}: #hx mode ${m} did not replay after the toggle`);
    const lid = 'sx-hx-' + m, n = await p.$eval('#' + lid, e => e.children.length), shown = await p.$eval('#' + lid, e => !e.hidden);
    if (!shown) problems.push(`${tag}: ${lid} hidden in its own mode`);
    if (await p.$$eval('ol[id^=sx-hx-]', xs => xs.filter(x => !x.hidden).length) !== 1) problems.push(`${tag}: more than one hx list shown`);
    const scmax = await p.$eval('#hxScrub', e => +e.max); if (scmax !== n * 100) problems.push(`${tag}: #hx ${m} scrubber covers ${scmax / 100} steps, list has ${n}`);
    for (let k = 0; k < n; k++) { await p.$eval('#hxFwd', e => e.click()); if (shoot && width === 1400 && k === Math.floor(n / 2)) { await wait(200); await (await p.$('#hx')).screenshot({ path: `${shots}/x-hx-${m}-mid-${scheme}-${width}.png` }) } }
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${lid} does not mark the last step (${cur})`);
    if (await p.$eval('#hxPlay', e => e.getAttribute('aria-label')) === 'Pause') problems.push(`${tag}: #hx kept playing after a reader control`);
    for (const v of ['0', '3', '1']) await p.$eval('#hxT', (s, v) => { s.value = v; s.dispatchEvent(new Event('change')) }, v);
    if (m === 'qsa' && shoot) { await (await p.$('#hx')).screenshot({ path: `${shots}/x-hx-qsa-last-${scheme}-${width}.png` }) }
  }
  { // the live numbers in the hx lists follow the context selector (1,000,000 tokens)
    await p.$eval('#hxT', s => { s.value = '3'; s.dispatchEvent(new Event('change')) });
    const t = await p.$eval('#sx-hx-qsa', e => e.textContent.replace(/\s+/g, ' '));
    if (!t.includes('250,000 compressed blocks') || !t.includes('0.20% of the context')) problems.push(`${tag}: hx QSA list did not follow the context (1M): ${t.slice(0, 120)}`);
    await p.$eval('#hxT', s => { s.value = '1'; s.dispatchEvent(new Event('change')) });
  }
  if (width === 1400) { // the numbers the step lists write are what the page's data gives
    const r = await p.evaluate(() => { const out = [], Q = window.QW.by, n = v => v.toLocaleString('en-GB'), M = v => (v / 1e6).toFixed(1) + 'M';
      const li = (lid, k) => document.getElementById(lid).children[k].textContent.replace(/\s+/g, ' ');
      const need = (lid, k, x) => { if (!li(lid, k).includes(String(x))) out.push(`${lid} item ${k + 1} lacks "${x}"`) };
      const nf = r => QW.nf(r), A = Q['Qwen3-235B-A22B'], S = Q['Qwen3-30B-A3B'], N = Q['Qwen3-Next-80B-A3B'], F5 = Q['Qwen3.5-397B-A17B'], D = Q['Qwen3.8-27B'], T = Q['Qwen3.8-2.4T-A95B'], F = Q['Qwen3.8-Flash-Next'];
      need('sx-hero', 0, A.L + ' layers'); need('sx-hero', 0, A.E + ' experts, top-' + A.k); if (nf(A) !== A.L) out.push('235B is not all full attention');
      need('sx-hero', 0, S.L + ' layers'); need('sx-hero', 1, N.L + ' layers as ' + nf(N)); need('sx-hero', 1, (N.L - nf(N)) + ' linear and ' + nf(N) + ' full'); need('sx-hero', 1, N.E + ' small experts');
      need('sx-hero', 2, F5.L + ' layers, ' + nf(F5)); need('sx-hero', 3, D.L + ' layers, ' + nf(D) + ' full'); need('sx-hero', 3, T.L + ' layers, ' + nf(T) + ' full');
      [[N, 12], [F, 12], [F5, 15], [D, 16], [T, 23]].forEach(([r, b]) => { if (nf(r) !== b) out.push(r.n + ' has ' + nf(r) + ' blocks, list says ' + b) });
      need('sx-hero', 4, 'head dimension ' + T.dh); need('sx-hero', 4, T.E + ' experts, ' + T.k + ' routed plus ' + T.sh + ' shared');
      need('sx-hero', 5, 'its ' + nf(F) + ' attention layers'); need('sx-hero', 5, n(F.ib) + ' selected tokens'); if (!F.qsa) out.push('Flash-Next config has no indexer');
      need('sx-moe', 0, '3 × ' + n(A.d) + ' × ' + n(A.dff) + ' = ' + n(QW.pe(A))); need('sx-moe', 0, A.k + ' of ' + A.E + ', ' + (100 * A.k / A.E).toFixed(2) + '%');
      need('sx-moe', 1, N.k + ' of ' + N.E + ' routed plus ' + N.sh); need('sx-moe', 1, '3 × ' + n(N.d) + ' × ' + N.dff + ' = ' + M(QW.pe(N))); need('sx-moe', 1, (100 * (N.k + N.sh) / (N.E + N.sh)).toFixed(1) + '%');
      need('sx-moe', 2, '3 × ' + n(F5.d) + ' × ' + n(F5.dff) + ' = ' + M(QW.pe(F5))); need('sx-moe', 2, F5.L + ' layers × ' + (F5.E + F5.sh) + ' experts = ' + (QW.stored(F5) / 1e9).toFixed(1) + 'B');
      need('sx-moe', 3, '3 × ' + n(T.d) + ' × ' + n(T.dff) + ' = ' + M(QW.pe(T))); need('sx-moe', 3, T.L + ' × ' + (T.E + T.sh) + ' × ' + M(QW.pe(T)) + ' = ' + (QW.stored(T) / 1e12).toFixed(3) + 'T');
      need('sx-moe', 4, '3 × ' + n(F.d) + ' × ' + F.dff + ' = ' + M(QW.pe(F))); need('sx-moe', 4, (QW.stored(F) / 1e9).toFixed(1) + 'B stored');
      // the hx lists at the default context (32,768), against the animation's own formulas
      const KVT = 2 * F.kvh * F.dh, ST = F.hv * F.dk * F.dv, t = 32768; if (KVT !== 1024 || ST !== 786432) out.push('hx dimensions differ from the Flash-Next config');
      need('sx-hx-hyb', 5, n(3 * ST + t * KVT)); need('sx-hx-qsa', 6, n(3 * ST + t / 4 * 128 + 2048 * KVT)); need('sx-hx-full', 3, n(4 * t * KVT));
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  await audit('end');
  for (const t of ['t-cfg', 't-lic', 't-more']) { await p.click(`#tabs button[data-t="${t}"]`); await wait(300); await audit(t, t); }
  await p.click('#tabs button[data-t="t-read"]');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file);
  for (const id of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  await p.$eval('#hx', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
  { const r = await p.$eval('#hx', e => [+e.dataset.frames || 0, document.getElementById('hxPlay').getAttribute('aria-label')]); if (r[0] > 0 || r[1] === 'Pause') problems.push(`reduced motion: #hx moved by itself (${r})`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
} finally { await b.close(); }
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
