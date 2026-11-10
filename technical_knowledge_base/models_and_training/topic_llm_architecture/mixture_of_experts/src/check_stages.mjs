// The 2026-11-06 rollout checks for Mixture of experts (2026-11-09), adapted from LLM Architecture Gallery's check_stages.mjs: the seven 3D
// stages (Fig. 1 one token, Fig. 2 to scale, Fig. 3 router, Fig. 4 loads over training, Fig. 5 capacity, Fig. 6 fine-grained, Fig. 9 expert
// parallelism) play by themselves once scrolled into view, step to their last step with one step-list item per step (at most about 8), stop
// redrawing off screen and never move under reduced motion; the dense-twin RD.anim has one list item per step; no errors, NaN, undefined or
// sideways scroll; the splits are two columns at 1400 px and one below 1100 px; the numbers the step lists write are recomputed from the
// page's data (window.MXD). Screenshots of every step (mid-tween and settled) at 1400 light, and of the middle step at 390 dark, go to the
// shots dir (outside the repo).
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_llm_architecture/mixture_of_experts/src/check_stages.mjs <shots dir> [--all]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const args = process.argv.slice(2), ALL = args.includes('--all');
const file = 'file://' + path.resolve(here, '../index.html'), shots = args.find(a => !a.startsWith('--'));
if (!shots) { console.log('usage: check_stages.mjs <shots dir outside the repo> [--all]'); process.exit(2); }
fs.mkdirSync(shots, { recursive: true });
const STAGES = ['stg-hero', 'stg-scale', 'stg-rt', 'stg-ld', 'stg-cap', 'stg-fg', 'stg-ep'];
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
    if (shoot) { await wait(300); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-autoplay-${scheme}-${width}.png` }) }
  }
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
        await wait(700); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}-midtween-${scheme}-${width}.png` });
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
    const r = await p.evaluate(() => { const out = [], D = window.MXD, M = window.MX;
      const li = (lid, k) => document.getElementById(lid).children[k].textContent.replace(/\s+/g, ' ');
      const need = (lid, k, x) => { if (!li(lid, k).includes(String(x))) out.push(`${lid} item ${k + 1} lacks "${x}"`) };
      const n = v => v.toLocaleString('en-GB'), f2 = v => v.toFixed(2);
      // Fig. 1: softmax of the recorded logits of "Once", layer 1, moe8top2
      const lg = D.runs.moe8.seq.logits8[0][0], mx = Math.max(...lg), Z = lg.reduce((a, v) => a + Math.exp(v - mx), 0), p = lg.map(v => Math.exp(v - mx) / Z);
      const top = [...p.keys()].sort((a, b) => p[b] - p[a]), g = [p[top[0]], p[top[1]]].map(v => v / (p[top[0]] + p[top[1]]));
      need('sx-hero', 1, 'E' + top[0] + ' gets ' + f2(p[top[0]])); need('sx-hero', 1, 'E' + top[1] + ' ' + f2(p[top[1]]));
      const rest = top.slice(2).map(i => p[i]); need('sx-hero', 1, f2(Math.min(...rest)) + ' to ' + f2(Math.max(...rest)));
      need('sx-hero', 2, f2(g[0]) + ' and ' + f2(g[1])); need('sx-hero', 3, f2(g[0]) + ' · E' + top[0] + '(h) + ' + f2(g[1]) + ' · E' + top[1] + '(h)');
      // Fig. 2: choices for "Once" and the presets' parameter counts
      const pick = run => { const s = D.runs[run].seq; return s.top[0].slice(s.k, 2 * s.k).split('').map(c => parseInt(c, 16)) };
      need('sx-scale', 1, 'E' + pick('moe8')[0] + ' and E' + pick('moe8')[1]); const p16 = pick('moe16s'); need('sx-scale', 2, 'E' + p16[0] + ', E' + p16[1] + ' and E' + p16[2]);
      ['dense', 'moe8', 'moe16s'].forEach(k => { const pr = D.runs[k].log.params; need('sx-scale', 3, (pr.total / 1e6).toFixed(2) + 'M'); need('sx-scale', 3, (pr.active / 1e6).toFixed(2) + 'M') });
      need('sx-fg', 0, 'E' + pick('moe8')[0] + ' and E' + pick('moe8')[1]); need('sx-fg', 2, 'E' + p16[0] + ', E' + p16[1] + ' and E' + p16[2]);
      // Fig. 4: MaxVio as logged, averaged over layers, at the stretch ends, and held out
      const avg = a => a.reduce((x, y) => x + y, 0) / a.length, mv = (k, i) => f2(avg(D.runs[k].log.load.maxvio[i])), hv = k => f2(avg(D.runs[k].heldout.maxvio));
      need('sx-ld', 0, mv('none', 0)); need('sx-ld', 1, mv('none', 10)); need('sx-ld', 1, mv('moe8', 10)); need('sx-ld', 2, mv('moe8', 30)); need('sx-ld', 2, mv('bias', 30));
      need('sx-ld', 3, mv('bias', 80)); need('sx-ld', 3, mv('moe8', 80)); need('sx-ld', 4, mv('none', 150)); need('sx-ld', 5, hv('none')); need('sx-ld', 5, hv('moe8')); need('sx-ld', 5, hv('bias'));
      // Fig. 5: capacity on the 64 recorded assignments
      const C = window.MXCAP, c1 = C.stats(1), c2 = C.stats(2), c3 = C.stats(3), c4 = C.stats(4);
      need('sx-cap', 1, c1.c + ' slots'); need('sx-cap', 1, c1.pad + ' of the ' + 8 * c1.c + ' slots'); need('sx-cap', 2, c2.c + ' slots'); need('sx-cap', 2, c2.drop + ' of 64 assignments dropped, ' + c2.pad + ' slots padded');
      need('sx-cap', 3, c3.c + ' slots'); need('sx-cap', 3, c3.drop + ' dropped (' + Math.round(100 * c3.drop / 64) + '%), and still ' + c3.pad + ' padded'); need('sx-cap', 4, c4.c + ' slots'); need('sx-cap', 4, c4.drop + ' of 64 dropped');
      need('sx-cap', 0, Math.min(...C.load) + ' to ' + Math.max(...C.load));
      // Fig. 9: the recorded send matrix
      const S = D.ep.send_matrix, recv = S[0].map((_, b) => S.reduce((a, r) => a + r[b], 0)), mean = recv.reduce((a, b) => a + b, 0) / 4, loc = D.ep.local_copies.reduce((a, b) => a + b, 0);
      need('sx-ep', 3, Math.round(100 * loc / (4 * 128)) + '%'); need('sx-ep', 4, Math.min(...recv) + ' to ' + Math.max(...recv)); need('sx-ep', 4, 'mean of ' + mean); need('sx-ep', 4, (Math.max(...recv) / mean).toFixed(2) + ' times');
      need('sx-ep', 5, 'maximum difference ' + D.ep.max_abs_diff_vs_one_process.toFixed(1));
      // the dense twin: one list item per step
      if (document.getElementById('sx-twin').children.length !== +document.getElementById('mx-twin-ctl-s').max + 1) out.push('sx-twin item count differs from the twin steps');
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  await audit('end');
  await p.click('#tabs button[data-t="t-calc"]'); await wait(300); await audit('t-calc', 't-calc');
  const ccols = await p.$$eval('#t-calc .s3sp', xs => xs.map(x => getComputedStyle(x).display)); if (width === 1400 && ccols.some(c => c !== 'grid')) problems.push(`${tag}: a calculator split is not two columns`);
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
  await p.close();
}
} finally { await b.close(); }
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
