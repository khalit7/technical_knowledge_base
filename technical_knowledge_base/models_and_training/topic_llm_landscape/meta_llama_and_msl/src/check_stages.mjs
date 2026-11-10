// The 2026-11-06 rollout checks for Meta: Llama and MSL (2026-11-10), adapted from Alibaba: Qwen's check_stages.mjs: the three 3D stages
// (Fig. 2 tokens per parameter, Fig. 3 the Llama 4 tower, Fig. 4 the agent in two designs) and the 2D overtraining animation (#ot, its own
// controller, two modes) play by themselves once scrolled into view, step to their last step with one step-list item per step, stop redrawing
// off screen and never move under reduced motion; no errors, NaN, undefined or sideways scroll in any tab; the splits are two columns at 1400 px
// and one below 1100 px; the numbers the step lists write are what the page's data (OT, MODELS, params, kvBytes) gives. Screenshots of every
// step (mid-tween and settled) at 1400 light, and of the middle step at 390 dark, go to the shots dir (outside the repo).
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_llm_landscape/meta_llama_and_msl/src/check_stages.mjs <shots dir>
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
const STAGES = ['stg-ot', 'stg-l4', 'stg-ag'], LISTS = { 'stg-ot': 'sx-ot3', 'stg-l4': 'sx-l4', 'stg-ag': 'sx-ag-muse' };
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
  // the 2D overtraining animation: plays in view (data-frames rises, the button reads Pause, data-playing set)
  await p.$eval('#ot', e => e.scrollIntoView({ block: 'center' })); await wait(2000);
  { const r = await p.$eval('#ot', e => [+e.dataset.frames || 0, document.getElementById('otPlay').getAttribute('aria-label'), e.dataset.playing]);
    if (!(r[0] > 0) || r[1] !== 'Pause' || r[2] !== '1') problems.push(`${tag}: #ot did not play when scrolled into view (${r})`) }
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(800);
  const offs = () => p.$$eval('.stg, #ot', xs => xs.map(x => { const r = x.getBoundingClientRect(); return r.bottom < 0 || r.top > innerHeight ? (+x.dataset.draws || 0) + (+x.dataset.frames || 0) : -1 }));
  const d0 = await offs(); await wait(1200); const d1 = await offs();
  if (d1.some((v, i) => v >= 0 && v !== d0[i])) problems.push(`${tag}: a stage or the 2D animation redrew while off screen (${d0} -> ${d1})`);
  const stepAll = async (id, lid, sfx = '') => {
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length);
    if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but list ${lid} shows ${lis}`);
    if (n > 8) problems.push(`${tag}: ${id} has ${n} steps, more than about 8`);
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' }));
    for (let k = 0; k < n; k++) {
      if (k) await p.$eval(`#${id}-f`, e => e.click());
      if (shoot && (width === 1400 || k === Math.floor(n / 2))) {
        await wait(700); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${sfx}-s${k + 1}-midtween-${scheme}-${width}.png` });
        await wait(2000); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${sfx}-s${k + 1}-${scheme}-${width}.png` })
      } else await wait(250);
    }
    await wait(2000);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
    await audit(`${id} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id} list ${lid} does not mark the last step`);
  };
  for (const id of STAGES) await stepAll(id, LISTS[id]);
  { // the agent stage in its second design: the toggle swaps the list and replays
    await p.$eval('#stg-ag', e => e.scrollIntoView({ block: 'center' }));
    await p.$eval('#agM button[data-m=naive]', e => e.click()); await wait(1500);
    if (await p.$eval('#stg-ag-p', e => e.getAttribute('aria-label')) !== 'Pause') problems.push(`${tag}: stg-ag did not replay after the design toggle`);
    if (!(await p.$eval('#sx-ag-muse', e => e.hidden)) || await p.$eval('#sx-ag-naive', e => e.hidden)) problems.push(`${tag}: agent lists not swapped`);
    await stepAll('stg-ag', 'sx-ag-naive', '-naive');
    await p.$eval('#agM button[data-m=muse]', e => e.click()); await wait(300);
  }
  // the 2D overtraining animation in both modes
  for (const m of ['meta', 'chin']) {
    await p.$eval('#ot', e => e.scrollIntoView({ block: 'center' }));
    await p.$eval(`#otM button[data-m=${m}]`, e => e.click()); await wait(1200);
    if (await p.$eval('#otPlay', e => e.getAttribute('aria-label')) !== 'Pause') problems.push(`${tag}: #ot mode ${m} did not replay after the toggle`);
    const lid = 'sx-ot-' + m, n = await p.$eval('#' + lid, e => e.children.length);
    if (await p.$eval('#' + lid, e => e.hidden)) problems.push(`${tag}: ${lid} hidden in its own mode`);
    if (await p.$$eval('ol[id^=sx-ot-]', xs => xs.filter(x => !x.hidden && x.id !== 'sx-ot3').length) !== 1) problems.push(`${tag}: more than one ot list shown`);
    if (await p.$eval('#otScrub', e => +e.max) !== n * 100) problems.push(`${tag}: #ot ${m} scrubber covers a different number of steps than its list (${n})`);
    for (let k = 0; k < n; k++) { await p.$eval('#otFwd', e => e.click()); if (shoot && k === 2) { await wait(200); await (await p.$('#ot')).screenshot({ path: `${shots}/x-ot-${m}-s3-${scheme}-${width}.png` }) } }
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${lid} does not mark the last step (${cur})`);
    if (await p.$eval('#otPlay', e => e.getAttribute('aria-label')) === 'Pause') problems.push(`${tag}: #ot kept playing after a reader control`);
  }
  if (width === 1400) { // the numbers the step lists write are what the page's data gives
    const r = await p.evaluate(() => { const out = [], n = v => Math.round(v).toLocaleString('en-GB'), f1 = v => v.toFixed(1);
      const li = (lid, k) => document.getElementById(lid).children[k].textContent.replace(/\s+/g, ' ');
      const need = (lid, k, x) => { if (!li(lid, k).includes(String(x))) out.push(`${lid} item ${k + 1} lacks "${x}"`) };
      const r = (g, m) => OT[g][4][m][2] / OT[g][4][m][1], rt = (g, m) => OT[g][4][m][2] / OT[g][4][m][3];
      need('sx-ot3', 0, n(r(0, 0)) + ', ' + n(r(0, 1)) + ', ' + n(r(0, 2)) + ' and ' + f1(r(0, 3))); need('sx-ot3', 0, 'compute-optimal ' + CHIN);
      need('sx-ot3', 1, 'to ' + n(r(1, 0))); need('sx-ot3', 1, 'to ' + n(r(1, 1))); need('sx-ot3', 1, f1(r(1, 2)));
      need('sx-ot3', 2, n(r(2, 0)) + ' tokens per parameter'); need('sx-ot3', 2, Math.round(r(2, 0) / CHIN) + ' times'); need('sx-ot3', 2, 'at ' + n(r(2, 1)));
      need('sx-ot3', 3, f1(r(2, 2))); need('sx-ot3', 3, 'about ' + Math.round(16.55e12 / 402e9));
      need('sx-ot3', 4, n(r(3, 0)) + ' per parameter'); need('sx-ot3', 4, 'is ' + n(r(3, 1))); need('sx-ot3', 4, n(rt(3, 0)) + ' and ' + n(rt(3, 1)));
      const MV = MODELS.mav, SC = MODELS.sco, PM = params(MV), PS = params(SC), M = v => (v / 1e6).toFixed(1) + 'M', B = v => (v / 1e9).toFixed(1) + 'B', G = v => (v / 2 ** 30).toFixed(1) + ' GiB';
      need('sx-l4', 0, MV.L + ' layers of hidden width ' + MV.h.toLocaleString('en-GB')); need('sx-l4', 0, MV.nh + ' query heads share ' + MV.kv + ' key-value heads of ' + MV.hd);
      need('sx-l4', 1, MV.moe.E + ' routed experts'); need('sx-l4', 1, '3 × 5,120 × 8,192 = ' + M(PM.exp)); need('sx-l4', 1, '3 × 5,120 × 16,384 = ' + M(3 * MV.h * MV.ff));
      if (Math.abs(3 * MV.h * MV.ff - 2 * PM.exp) > 1) out.push('the dense block is not two experts wide');
      need('sx-l4', 2, 'all ' + PS.nMoE + ' layers'); need('sx-l4', 2, SC.moe.E + ' experts'); need('sx-l4', 2, B(PS.text) + ' for Scout'); need('sx-l4', 2, B(PM.text) + ' for Maverick');
      if (B(PS.active) !== B(PM.active)) out.push('Scout and Maverick active counts differ'); need('sx-l4', 2, B(PM.active) + ' for both');
      need('sx-l4', 3, MV.glob + ' of ' + MV.L); need('sx-l4', 3, (MV.L - MV.glob) + ' (teal)'); need('sx-l4', 3, MV.win.toLocaleString('en-GB') + '-token chunks');
      need('sx-l4', 4, G(kvBytes(MV, 65536))); need('sx-l4', 4, G(MV.L * kvTok(MV) * 65536)); need('sx-l4', 4, G(kvBytes(MV, 1048576))); need('sx-l4', 4, Math.round(MV.L * kvTok(MV) * 1048576 / 2 ** 30) + ' GiB');
      need('sx-l4', 4, 'ln 9 = ' + (1 + 0.1 * Math.log1p(Math.floor(65537 / 8192))).toFixed(2));
      // the 2D animation's lists against its formulas
      const sup = s => String(s).replace(/[-0-9]/g, c => '⁻⁰¹²³⁴⁵⁶⁷⁸⁹'['-0123456789'.indexOf(c)]), sci = v => { const e = Math.floor(Math.log10(v) + 1e-9); return (v / 10 ** e).toFixed(2) + ' × 10' + sup(e) };
      const C = 6 * 8e9 * 15e12, T = 15e12, Ns = Math.sqrt(C / 120), tot8 = C + 2 * 8e9 * T, totS = C + 2 * Ns * T;
      need('sx-ot-meta', 0, sci(C)); need('sx-ot-meta', 3, sci(2 * 8e9 * T)); need('sx-ot-meta', 4, sci(tot8)); need('sx-ot-meta', 4, sci(totS)); need('sx-ot-meta', 4, (totS / tot8).toFixed(1) + ' times');
      need('sx-ot-chin', 1, (Ns / 1e9).toFixed(1) + 'B'); need('sx-ot-chin', 3, sci(2 * Ns * T)); need('sx-ot-chin', 3, (2 * Ns * T / C).toFixed(1) + ' times'); need('sx-ot-chin', 4, sci(totS));
      const FIT = [1.69, 406.4, 410.7, 0.336, 0.283], L = (N, D) => FIT[0] + FIT[1] / N ** FIT[3] + FIT[2] / D ** FIT[4];
      need('sx-ot-meta', 4, L(Ns, 20 * Ns).toFixed(3) + ' against ' + L(8e9, 15e12).toFixed(3));
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  await audit('end');
  for (const t of ['t-fit', 't-more']) { await p.click(`#tabs button[data-t="${t}"]`); await wait(300); await audit(t, t); }
  await p.click('#tabs button[data-t="t-read"]');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file);
  for (const id of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  await p.$eval('#ot', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
  { const r = await p.$eval('#ot', e => [+e.dataset.frames || 0, document.getElementById('otPlay').getAttribute('aria-label')]); if (r[0] > 0 || r[1] === 'Pause') problems.push(`reduced motion: #ot moved by itself (${r})`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
} finally { await b.close(); }
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
