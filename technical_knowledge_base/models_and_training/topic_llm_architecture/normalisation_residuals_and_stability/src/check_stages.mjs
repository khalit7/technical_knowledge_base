// The 2026-11-06 rollout checks for Normalisation, residuals and stability (2026-11-09), adapted from Long context's check_stages.mjs: the five 3D
// stages (Fig. 1 the block, Fig. 2 placements, Fig. 3 the stream's size, Fig. 4 attention logits with its four comparisons, Fig. 5 massive
// activations) play by themselves once scrolled into view, step to their last step with one step-list item per step, stop redrawing off screen
// and never move under reduced motion; no errors, NaN, undefined or sideways scroll; the splits are two columns at 1400 px and one below 1100 px;
// the numbers the step lists write are what the page's data gives (NSD, NSS).
// Screenshots of every step (mid-tween and settled) at 1400 light, and of the middle step at 390 dark, go to the shots dir.
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_llm_architecture/normalisation_residuals_and_stability/src/check_stages.mjs [shots dir] [--all] [--only=stg-x] [--fast]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const args = process.argv.slice(2), ALL = args.includes('--all'), FAST = args.includes('--fast');
const only = (args.find(a => a.startsWith('--only=')) || '').slice(7);
const file = 'file://' + path.resolve(here, '../index.html'), shots = args.find(a => !a.startsWith('--')) || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = ['stg-hero', 'stg-place', 'stg-rs', 'stg-qk', 'stg-ma'].filter(s => !only || s === only);
const wait = ms => new Promise(r => setTimeout(r, ms));
const problems = [];
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
try {
for (const [scheme, width] of (FAST ? [['light', 1400]] : [['light', 1400], ['light', 920], ['dark', 390]])) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(400);
  const tag = `${scheme} ${width}`, shoot = width === 1400 || width === 390;
  const audit = async (where, tab = 't-read') => {
    const r = await p.evaluate(tab => { const c = document.getElementById(tab).cloneNode(true); c.querySelectorAll('pre,code').forEach(x => x.remove());
      return { bad: (c.innerText.match(/.{0,30}\b(NaN|undefined|Infinity|pending)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } }, tab);
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  const outside = await p.$$eval('section', xs => xs.filter(x => !x.closest('.tab')).map(x => x.id)); if (outside.length) problems.push(`${tag}: sections outside a tab ${outside}`);
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (!cols.length || cols.some(c => c !== 'grid'))) problems.push(`${tag}: a split is not two columns (${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  if (width === 1400) { const over = await p.$$eval('#t-read .s3R', xs => xs.map(x => { const r = x.getBoundingClientRect(), k = x.firstElementChild && x.firstElementChild.getBoundingClientRect(); return k && (k.right > r.right + 1 || k.left < r.left - 1) ? x.innerHTML.slice(0, 40) : '' }).filter(Boolean));
    over.forEach(o => problems.push(`${tag}: right-column content wider than its column: ${o}`)) }
  for (const id of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
    if (shoot) { await wait(300); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-autoplay-${scheme}-${width}.png` }) }
  }
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await wait(800);
  const offs = () => p.$$eval('.stg', xs => xs.map(x => { const r = x.getBoundingClientRect(); return r.bottom < 0 || r.top > innerHeight ? +x.dataset.draws || 0 : -1 }));
  const d0 = await offs(); await wait(1200); const d1 = await offs();
  if (d1.some((v, i) => v >= 0 && v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  const stepAll = async (id, lid, sfx) => {
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length);
    if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but list ${lid} shows ${lis}`);
    if (n > 8) problems.push(`${tag}: ${id} has ${n} steps, more than about 8`);
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' }));
    for (let k = 0; k < n; k++) {
      if (k) await p.$eval(`#${id}-f`, e => e.click());
      if (shoot && (ALL || width === 1400 || k === Math.floor(n / 2))) {
        await wait(id === 'stg-qk' ? 1100 : 650); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${sfx}-s${k + 1}-midtween-${scheme}-${width}.png` });
        await wait(2700); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${sfx}-s${k + 1}-${scheme}-${width}.png` })
      } else await wait(250);
    }
    await wait(id === 'stg-qk' ? 2800 : 1800);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
    await audit(`${id}${sfx} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id} list ${lid} does not mark the last step`);
  };
  for (const id of STAGES) await stepAll(id, 'sx-' + id.slice(4), '');
  if (STAGES.includes('stg-qk')) { // Fig. 4's other comparisons: each swaps the step list and replays from step 1
    for (const m of ['z', 'cap', 'ok']) {
      await p.$eval(`#qk-cmp button[data-m="${m}"]`, e => e.click()); await wait(300);
      const vis = await p.$$eval('ol[id^="sx-qk"]', xs => xs.filter(x => !x.hidden).map(x => x.id));
      if (vis.length !== 1 || vis[0] !== 'sx-qk-' + m) problems.push(`${tag}: qk chip ${m} shows lists ${vis}`);
      if (width === 1400 || m === 'z') await stepAll('stg-qk', 'sx-qk-' + m, '-' + m);
    }
    await p.$eval('#qk-cmp button[data-m="qk"]', e => e.click()); await wait(300);
  }
  if (width === 1400 && !only) { // the numbers the step lists write are what the page's data gives
    const r = await p.evaluate(() => { const out = [], li = (lid, k) => document.getElementById(lid).children[k].textContent.replace(/\s+/g, ' ');
      const need = (lid, k, x) => { if (!li(lid, k).toLowerCase().includes(String(x).toLowerCase())) out.push(`${lid} item ${k + 1} lacks "${x}"`) };
      const g = v => (v >= 10000 ? Math.floor(v) : Math.round(v)).toLocaleString('en-GB');
      // Fig. 4: every number in the recorded captions appears in the matching static item (items 2 to 6; item 1's 4.42 and 4.58 too)
      NSD.spike.caps.qk.forEach((c, k) => (c[1].match(/\d[\d,]*\.?\d*/g) || []).filter(x => !/^(0|1|10|100|1,000|10,000|1e4)$/.test(x) && !(k === 4 && x === '600')).forEach(x => { const y = x.replace(/[.,]$/, ''); if (!li('sx-qk', k).includes(y)) out.push(`sx-qk item ${k + 1} lacks "${y}" from the recorded caption`) }));
      // Fig. 3: the step list's numbers are the trace's (rounded as page_numbers.json rounds them)
      const M = NSD.resid.models, f3 = v => v >= 10 ? v.toFixed(1) : v >= 1 ? v.toFixed(2) : v.toFixed(3);
      need('sx-rs', 0, f3(M.pre.init.median_norm[0])); need('sx-rs', 0, f3(M.post.init.median_norm[12]));
      need('sx-rs', 1, f3(M.pre.init.median_norm[12])); need('sx-rs', 1, f3(M.pre_flat.init.median_norm[12]));
      need('sx-rs', 2, f3(M.sandwich.init.median_norm[12])); need('sx-rs', 2, f3(M.output.init.median_norm[12])); need('sx-rs', 2, (16 * Math.sqrt(12)).toFixed(1));
      need('sx-rs', 3, f3(M.pre.trained.median_norm[0])); need('sx-rs', 3, f3(M.pre.trained.median_norm[12]));
      need('sx-rs', 4, f3(M.post.trained.median_norm[12])); need('sx-rs', 4, f3(M.sandwich.trained.median_norm[12])); need('sx-rs', 4, f3(M.output.trained.median_norm[12])); need('sx-rs', 4, f3(M.pre_flat.trained.median_norm[12]));
      // Fig. 5: SmolLM2's stream and the tiny GPT, from NSS
      const S = NSS.smol, T = NSS.tiny, BL = S.big_layer;
      need('sx-ma', 0, S.median_abs[0]); need('sx-ma', 0, S.median_abs[BL].toFixed(2)); need('sx-ma', 0, S.median_abs[S.median_abs.length - 1].toFixed(1));
      if (!(S.max_tok.slice(3, 11).every(t => t === 4) && S.max_dim.slice(3, 12).every(d => d === 507))) out.push('sx-ma item 2: layers 3 to 10 are not all channel 507 of token 4');
      need('sx-ma', 1, 'channel ' + S.max_dim[3]); need('sx-ma', 1, 'about ' + Math.round(S.max_abs[3] / 10) * 10);
      need('sx-ma', 2, g(S.max_abs[BL])); need('sx-ma', 2, S.median_abs[BL].toFixed(2)); need('sx-ma', 2, 'layer ' + BL); need('sx-ma', 2, 'about ' + (Math.round(S.max_abs[BL] / S.median_abs[BL] / 100) * 100).toLocaleString('en-GB'));
      need('sx-ma', 3, g(S.max_abs[29])); need('sx-ma', 3, g(S.max_abs[30])); if (Math.min(...S.max_abs.slice(BL, 29)) < 19000) out.push('sx-ma item 4: not near 20,000 to layer 28');
      need('sx-ma', 4, Math.max(...S.sink.slice(0, BL)).toFixed(3)); need('sx-ma', 4, Math.min(...S.sink.slice(BL)).toFixed(2)); need('sx-ma', 4, Math.max(...S.sink.slice(BL)).toFixed(2));
      const tm = Math.max(...T.max_abs), ti = T.max_abs.indexOf(tm); need('sx-ma', 5, tm.toFixed(1)); need('sx-ma', 5, T.median_abs[ti].toFixed(2)); need('sx-ma', 5, Math.round(tm / T.median_abs[ti]) + ' times');
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  if (!only) { await audit('end'); for (const t of ['t-stab', 't-more']) { await p.click(`#tabs button[data-t="${t}"]`); await wait(300); await audit(t, t) } await p.click('#tabs button[data-t="t-read"]'); }
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
if (!FAST) { // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file);
  for (const id of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
} finally { await b.close(); }
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
