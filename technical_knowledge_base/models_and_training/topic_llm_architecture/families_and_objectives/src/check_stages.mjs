// The 2026-11-06 rollout checks for Families and objectives (2026-11-09), adapted from Attention variants' check_stages.mjs: the five 3D stages
// (Fig. 2 masks, Fig. 4 the leak, Fig. 5 encoder-decoder, Fig. 6 MTP, Fig. 7 diffusion against causal) play by themselves once scrolled into view,
// step to their last step with one step-list item per step, stop redrawing off screen and never move under reduced motion; the objectives
// stepper (2D, RD.anim) plays in view with one list item per step; the two replays the reader drives (the MTP draft, the diffusion words) never
// play by themselves; no errors, NaN, undefined or sideways scroll; the splits are two columns at 1400 px and one below 1100 px; the numbers the
// step lists write are what the page's data gives. Screenshots of every step (mid-tween and settled) at 1400 light, and of the middle step at
// 390 dark, go to the shots dir.
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_llm_architecture/families_and_objectives/src/check_stages.mjs [shots dir] [--all]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const args = process.argv.slice(2), ALL = args.includes('--all');
const file = 'file://' + path.resolve(here, '../index.html'), shots = args.find(a => !a.startsWith('--')) || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = ['stg-mask', 'stg-leak', 'stg-encdec', 'stg-mtp', 'stg-diff'];
const WIDGETS = [['mt-card', 'mt-ctl-p'], ['df-card', 'df-ctl-p']];
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
      return { bad: (c.innerText.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}|\(pending\)/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } }, tab);
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
  // the objectives stepper plays by itself in view; the two replays the reader drives never do
  { await p.evaluate(() => window.scrollTo(0, 0)); await wait(300); await p.$eval('#ob-card', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    if ((await p.$eval('#ob-ctl-p', e => e.getAttribute('aria-label'))) !== 'Pause') problems.push(`${tag}: the objectives stepper did not play in view`);
    const r = await p.evaluate(() => [document.getElementById('sx-ob').children.length, +document.getElementById('ob-ctl-s').max + 1]); if (r[0] !== r[1]) problems.push(`${tag}: objectives has ${r[1]} steps but ${r[0]} list items`);
    if (shoot) { await wait(5200); await (await p.$('#ob-card')).screenshot({ path: `${shots}/x-ob-card-${scheme}-${width}.png` }) } }
  for (const [card, play] of WIDGETS) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    if ((await p.$eval('#' + play, e => e.getAttribute('aria-label'))) === 'Pause') problems.push(`${tag}: ${card} (a widget) played by itself`);
    const at = await p.evaluate(c => { const s = document.getElementById(c.replace('card', 'ctl') + '-s'); return [+s.value, +s.max] }, card); if (at[0] !== at[1]) problems.push(`${tag}: ${card} does not open on its last frame (${at})`);
    if (shoot) await (await p.$('#' + card)).screenshot({ path: `${shots}/x-${card}-${scheme}-${width}.png` }) }
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(800);
  const offs = () => p.$$eval('.stg', xs => xs.map(x => { const r = x.getBoundingClientRect(); return r.bottom < 0 || r.top > innerHeight ? +x.dataset.draws || 0 : -1 }));
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
      if (shoot && (ALL || width === 1400 || k === Math.floor(n / 2))) {
        await wait(650); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}-midtween-${scheme}-${width}.png` });
        await wait(2700); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}-${scheme}-${width}.png` })
      } else await wait(250);
    }
    await wait(2800);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
    await audit(`${id} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id} list ${lid} does not mark the last step`);
  };
  for (const id of STAGES) await stepAll(id, 'sx-' + id.slice(4));
  if (width === 1400) { // the numbers the step lists write are what the page's data gives
    const r = await p.evaluate(() => { const out = [], li = (lid, k) => document.getElementById(lid).children[k].textContent.replace(/\s+/g, ' ');
      const need = (lid, k, x) => { if (!li(lid, k).includes(String(x))) out.push(`${lid} item ${k + 1} lacks "${x}"`) };
      const cell = (m, q, k) => m === 'causal' ? k <= q : m === 'bidir' ? true : (k <= q || k < 5); let c = 0, pr = 0;
      for (let q = 0; q < 12; q++) for (let k = 0; k < 12; k++) { c += cell('causal', q, k) ? 1 : 0; pr += cell('prefix', q, k) ? 1 : 0 }
      need('sx-mask', 0, c + ' of the 144'); need('sx-mask', 2, pr + ' of 144');
      const S = FOD.masks.swap; need('sx-mask', 4, S.causal.held_out.toFixed(3)); need('sx-mask', 4, S.bidir.held_out.toFixed(3)); need('sx-mask', 4, S.prefix128.held_out_last128.toFixed(3));
      const O = FOD.obj, n = O.n, nn = O.spans.reduce((a, z) => a + z[1] - z[0], 0), kd = O.mlm.reduce((a, x) => (a[x.kind] = (a[x.kind] || 0) + 1, a), {});
      need('sx-ob', 0, (n - 1) + ' loss terms from ' + n); need('sx-ob', 1, O.mlm.length + ' positions'); need('sx-ob', 1, (kd.mask || 0) + ' became'); need('sx-ob', 1, (kd.keep || 0) + ' stayed');
      need('sx-ob', 2, nn + ' corrupted tokens in ' + O.spans.length + ' spans'); need('sx-ob', 2, 'input ' + (n - nn + O.spans.length + 1) + ' tokens, target ' + (nn + O.spans.length + 1));
      need('sx-ob', 3, 'first ' + O.prefix + ' tokens'); need('sx-ob', 3, (n - O.prefix) + ' continuation'); need('sx-ob', 4, (n - 1) + ' + ' + (n - 2) + ' = ' + (2 * n - 3));
      need('sx-ob', 5, O.diff_mask.length + ' of ' + n); need('sx-ob', 5, '1/t = ' + (1 / O.diff_t));
      const L = FOD.masks.leak; need('sx-leak', 2, L.attn_next[0].toFixed(3)); need('sx-leak', 3, L.held_out_bidir.toFixed(3)); need('sx-leak', 4, L.held_out_causal.toFixed(2));
      const T = FOD.diff.trace['12'].steps, cum = s => T.slice(0, s).reduce((a, x) => a + x.commit.length, 0);
      need('sx-diff', 1, cum(3) + ' tokens'); need('sx-diff', 2, 'against ' + cum(6)); need('sx-diff', 3, 'All ' + cum(12) + ' slots in ' + T.length + ' forwards'); need('sx-diff', 0, FOD.diff.prompt_tokens + '-token prompt');
      need('sx-diff', 4, FOD.d.ar_positions.toLocaleString('en-US')); need('sx-diff', 4, FOD.d.diff_positions12.toLocaleString('en-US'));
      const H = FOD.mtpf.held_out, pc = v => (100 * v).toFixed(1) + '%'; need('sx-mtp', 0, pc(H.main_next.top1)); need('sx-mtp', 1, pc(H.parallel.top1)); need('sx-mtp', 2, pc(H.sequential.top1)); need('sx-mtp', 3, pc(H.sequential_accept.top1));
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  await audit('end');
  await p.click('#tabs button[data-t="t-more"]'); await wait(300); await audit('t-more', 't-more'); await p.click('#tabs button[data-t="t-read"]');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file);
  for (const id of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  for (const c of ['ob-card', 'mt-card', 'df-card']) { await p.$eval('#' + c, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    if ((await p.$eval('#' + c.replace('card', 'ctl') + '-p', e => e.getAttribute('aria-label'))) === 'Pause') problems.push('reduced motion: ' + c + ' plays by itself') }
  await p.close();
}
} finally { await b.close(); }
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
