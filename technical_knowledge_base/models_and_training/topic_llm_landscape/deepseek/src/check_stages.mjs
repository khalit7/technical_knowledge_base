// The 2026-11-06 rollout checks for DeepSeek (2026-11-10), adapted from Anthropic: Claude family's check_stages.mjs: the three 3D stages
// (Fig. 2 what a decoded token reads, Fig. 3 V4.1-Flash's layers, Fig. 4 the serving pools; all driven by window.DS) play by themselves once
// scrolled into view, step to their last step with one step-list item per step, stop redrawing off screen and never move under reduced motion;
// no errors, NaN, undefined or sideways scroll in any tab; the splits are two columns at 1400 px and one below 1100 px; the numbers the step
// lists write are what window.DS computes. Screenshots of every step (mid-tween and settled) at 1400 light, and of the middle step at 390 dark,
// go to the shots dir (outside the repo).
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_llm_landscape/deepseek/src/check_stages.mjs <shots dir>
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
const STAGES = ['stg-cut', 'stg-v41', 'stg-srv'];
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
  if (width === 1400) { // the numbers the step lists write are what window.DS gives
    const r = await p.evaluate(() => { const out = [], n = v => v.toLocaleString('en-GB'), C = DS.C, big = DS.big;
      const li = (lid, k) => document.getElementById(lid).children[k].textContent.replace(/\s+/g, ' ');
      const need = (lid, k, x) => { if (!li(lid, k).includes(String(x))) out.push(`${lid} item ${k + 1} lacks "${x}"`) };
      const per = (c, j) => big(c.layers[j || 0].read);
      need('sx-cut', 0, n(DS.L) + ' entries'); need('sx-cut', 0, n(DS.MHA) + ' numbers'); need('sx-cut', 0, per(C.mha)); need('sx-cut', 0, big(C.mha.read).replace(' billion', ''));
      need('sx-cut', 1, DS.MLA + '-number entry'); need('sx-cut', 1, Math.round(C.mha.read / C.mla.read) + '×'); need('sx-cut', 1, per(C.mla)); need('sx-cut', 1, big(C.mla.read));
      need('sx-cut', 2, 'top ' + n(DS.TOPK)); need('sx-cut', 2, big(DS.TOPK * DS.MLA).replace(' million', '')); need('sx-cut', 2, big(DS.L * DS.IDX).replace(' million', ''));
      need('sx-cut', 2, per(C.dsa)); need('sx-cut', 2, big(C.dsa.read)); need('sx-cut', 2, Math.round(100 * C.dsa.read / C.mla.read) + '%'); need('sx-cut', 2, big(C.dsa.stored));
      need('sx-cut', 2, Math.round(100 * (C.dsa.stored / C.mla.stored - 1)) + '% more');
      need('sx-cut', 3, n(DS.L / 4)); need('sx-cut', 3, n(DS.L / 128)); need('sx-cut', 3, 'top ' + n(DS.CK)); need('sx-cut', 3, big(C.v4.read)); need('sx-cut', 3, (C.dsa.read / C.v4.read).toFixed(1) + '×');
      need('sx-cut', 3, n(Math.round(C.mha.read / C.v4.read / 100) * 100) + '×'); need('sx-cut', 3, big(C.v4.stored));
      need('sx-cut', 4, n(C.v4.layers[0].read)); need('sx-cut', 4, n(C.v4.layers[1].read));
      if (C.v4.layers[0].n !== 30 || C.v4.layers[1].n !== 31) out.push('V4-Pro layer counts');
      const V = DS.v41; need('sx-v41', 1, V.pre); need('sx-v41', 3, V.dec); need('sx-v41', 4, V.full.length + ' cache copies for ' + V.layers);
      need('sx-v41', 4, 'layer ' + V.full[3] + ' is full'); need('sx-v41', 4, 'layers ' + V.rein.slice(0, 3).join(', ') + ' and ' + V.rein[3] + ' reindex'); need('sx-v41', 4, (V.full.length + V.rein.length) + ' layers run an indexer');
      need('sx-v41', 4, 'layers ' + V.eng.join(' and '));
      const S = DS.srv; need('sx-srv', 1, S.pre.nodes + ' nodes (' + S.pre.gpus + ' GPUs, EP' + S.pre.gpus + ')'); need('sx-srv', 1, S.routed + ' + ' + S.red + ' = ' + S.copies); need('sx-srv', 1, S.pre.per + ' routed experts per GPU');
      need('sx-srv', 2, S.dec.nodes + ' nodes (' + S.dec.gpus + ' GPUs, EP' + S.dec.gpus + ')'); need('sx-srv', 2, S.dec.per + ' routed experts per GPU');
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  await audit('end');
  for (const t of ['t-cfg', 't-more']) { await p.click(`#tabs button[data-t="${t}"]`); await wait(300); await audit(t, t); }
  await p.click('#tabs button[data-t="t-read"]');
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
  await p.close();
}
} finally { await b.close(); }
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
