// The 2026-11-06 rollout checks for MiniMax (2026-11-10), adapted from DeepSeek's check_stages.mjs: the three 3D stages (Fig. 3 lightning in
// blocks, Fig. 5 one decoded token through one layer in three routes, Fig. 6 stored, read and computed) play by themselves once scrolled into view,
// step to their last step with one step-list item per step (every route of Fig. 5), stop redrawing off screen and never move under reduced motion;
// no errors, NaN, undefined or sideways scroll in any tab; the splits are two columns at 1400 px and one below 1100 px; the numbers the step lists
// write are what the page's model computes (window.MM_LT, MM_AX, MM_ARC and stored/readB/compB). Screenshots of every step (mid-tween and settled)
// at 1400 light, and of the middle step at 390 dark, go to the shots dir (outside the repo).
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_llm_landscape/minimax/src/check_stages.mjs <shots dir>
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
const STAGES = [['stg-lt', 'sx-lt'], ['stg-ax', 'sx-ax-msa'], ['stg-arc', 'sx-arc']];
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
  // autoplay: each stage plays once scrolled into view
  for (const [id] of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
  }
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(800);
  const offs = () => p.$$eval('.stg', xs => xs.map(x => { const r = x.getBoundingClientRect(); return r.bottom < 0 || r.top > innerHeight ? (+x.dataset.draws || 0) + (+x.dataset.frames || 0) : -1 }));
  const d0 = await offs(); await wait(1200); const d1 = await offs();
  if (d1.some((v, i) => v >= 0 && v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  const stepAll = async (id, lid, sfx) => {
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length);
    if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but list ${lid} shows ${lis}`);
    if (n > 8) problems.push(`${tag}: ${id} has ${n} steps, more than about 8`);
    if (await p.$eval('#' + lid, e => e.hidden)) problems.push(`${tag}: ${id} drives the hidden list ${lid}`);
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
    await audit(`${id}${sfx} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id} list ${lid} does not mark the last step`);
  };
  for (const [id, lid] of STAGES) await stepAll(id, lid, '');
  // Fig. 5's other routes: the chooser swaps the list and replays; then a 1M context on MSA
  for (const m of ['full', 'lin']) { await p.click(`#axM button[data-m=${m}]`); await wait(300); await stepAll('stg-ax', 'sx-ax-' + m, '-' + m) }
  await p.click('#axM button[data-m=msa]'); await p.select('#axT', '1048576'); await wait(300); await stepAll('stg-ax', 'sx-ax-msa', '-1m');
  if (width === 1400) { // the numbers the step lists write are what the page's model gives
    const r = await p.evaluate(() => { const out = [], n = v => v.toLocaleString('en-GB');
      const li = (lid, k) => document.getElementById(lid).children[k].textContent.replace(/\s+/g, ' ');
      const need = (lid, k, x) => { if (!li(lid, k).includes(String(x))) out.push(`${lid} item ${k + 1} lacks "${x}"`) };
      const T = MM_LT; need('sx-lt', 0, T.kv.join(', ')); need('sx-lt', 1, T.run[0] + ', then ' + T.kv[0] + ' + ' + T.kv[1] + ' = ' + T.run[1] + ', then ' + T.run[2] + ', then ' + T.run[3]);
      need('sx-lt', 1, T.o.join(', ')); need('sx-lt', 4, '= ' + T.S1); need('sx-lt', 5, T.intra[2] + ' and ' + T.intra[3]); need('sx-lt', 5, T.inter[2] + ' and ' + T.inter[3]);
      need('sx-lt', 5, '= ' + T.o[2]); need('sx-lt', 5, '= ' + T.o[3]);
      // Fig. 5 at 1M now (the context select was set): the spans follow the context
      const A = MM_AX; need('sx-ax-msa', 0, n(A.n)); need('sx-ax-msa', 1, n(A.nb)); need('sx-ax-msa', 2, fmtBytes(A.NUM.idxRead())); need('sx-ax-msa', 4, '64 of ' + n(A.nb));
      need('sx-ax-msa', 5, fmtBytes(A.NUM.idxRead() + A.NUM.selRead())); need('sx-ax-msa', 5, fmtBytes(2 * A.NUM.kM2())); need('sx-ax-full', 2, fmtBytes(A.NUM.kM2()));
      if (A.NUM.selRead() !== 4 * 2 ** 20 || A.NUM.state() !== 2 * 2 ** 20 || A.NUM.kvM3() !== 2048 || A.NUM.kvM2() !== 4096 || A.NUM.ikey() !== 256) out.push('Fig. 5 fixed byte counts');
      if (A.sel().some(s => s.length !== 16 || new Set(s).size !== 16 || !s.includes(A.nb - 1))) out.push('Fig. 5: a group does not select 16 distinct blocks including its own');
      // Fig. 6 against stored/readB/compB
      const M = MM_ARC, K = 131072, G = 1048576, big = v => sci(v, 2), o = { all: true };
      need('sx-arc', 0, fmtBytes(stored('m2', K))); need('sx-arc', 0, fmtBytes(stored('h01', K))); need('sx-arc', 0, fmtBytes(stored('m3', K))); need('sx-arc', 0, fmtBytes(M.idxPart('st', K)));
      need('sx-arc', 1, fmtBytes(readB('m3', K))); need('sx-arc', 1, (readB('m2', K) / readB('m3', K)).toFixed(1) + ' times'); need('sx-arc', 1, Math.round(100 * M.idxPart('rd', K) / readB('m3', K)) + '%');
      need('sx-arc', 2, big(compB('m2', K))); need('sx-arc', 2, big(compB('h01', K))); need('sx-arc', 2, big(compB('m3', K))); need('sx-arc', 2, (compB('m2', K) / compB('m3', K)).toFixed(1) + ' times');
      need('sx-arc', 2, Math.round(100 * M.idxPart('cp', K) / compB('m3', K)) + '%');
      need('sx-arc', 3, fmtBytes(stored('m3', G))); need('sx-arc', 3, fmtBytes(stored('h01', G))); need('sx-arc', 3, fmtBytes(readB('m3', G))); need('sx-arc', 3, big(compB('m3', G))); need('sx-arc', 3, big(compB('h01', G)));
      need('sx-arc', 4, big(compB('m2', G))); need('sx-arc', 4, (compB('m2', G) / compB('m3', G)).toFixed(1)); need('sx-arc', 4, (compB('m2', G) / compB('m3', G, o)).toFixed(1)); need('sx-arc', 4, big(compB('m3', G, o)));
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
