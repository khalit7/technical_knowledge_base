// The 2026-11-06 rollout checks for Long-context and multimodal benchmarks (2026-11-09): every 3D stage (Fig. 1 lost in the middle, Fig. 2 NoLiMa,
// Fig. 3 MMMU in its two modes) plays by itself once scrolled into view, steps to its last step in every mode with one step-list item per step, stops
// redrawing off screen and never moves under reduced motion; no errors, NaN, undefined or sideways scroll; the splits are two columns at 1400 px and one
// below 1100 px. The numbers written in the step lists are checked against what the scenes read from the page's data (window.LCS, from window.LD).
// Adapted from the Coding benchmarks page's check_stages.mjs.
// usage (from the repo root): node technical_knowledge_base/measurement/topic_benchmarks/long_context_and_multimodal/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = [['stg-mid', [['', 'sx-mid']], null], ['stg-nl', [['', 'sx-nl']], null], ['stg-mm', [['blind', 'sx-mm-blind'], ['pro', 'sx-mm-pro']], '#mm-mode']];
const wait = ms => new Promise(r => setTimeout(r, ms));
const problems = [];
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(400);
  const tag = `${scheme} ${width}`;
  const audit = async where => {
    const r = await p.evaluate(() => { const c = document.getElementById('t-read').cloneNode(true); c.querySelectorAll('pre,code').forEach(x => x.remove());
      return { bad: (c.innerText.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } });
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (!cols.length || cols.some(c => c !== 'grid'))) problems.push(`${tag}: a split is not two columns (${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  for (const [id] of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
    if (width === 1400 || width === 390) { await wait(300); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-autoplay-tween-${scheme}-${width}.png` }) }
  }
  // flows stop off screen
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  for (const [id, modes, sel] of STAGES) for (const [m, lid] of modes) {
    if (sel) { await p.$eval(`${sel} [data-m="${m}"]`, e => e.click()); await wait(150); }
    const hid = await p.evaluate(lid => [...document.querySelectorAll('ol.sx')].filter(o => o.id.startsWith(lid.replace(/-[^-]+$/, '-')) && o.id !== lid && !o.hidden).length, lid);
    if (sel && hid) problems.push(`${tag}: ${id} ${m}: another mode's list is still shown`);
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.hidden ? -1 : e.children.length);
    if (lis !== n) problems.push(`${tag}: ${id} ${m} has ${n} steps but list ${lid} shows ${lis}`);
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' }));
    for (let k = 0; k < n; k++) {
      if (k) await p.$eval(`#${id}-f`, e => e.click());
      if (width === 1400 || width === 390) {
        if (k === Math.floor(n / 2)) { await wait(650); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${m ? '-' + m : ''}-s${k + 1}-midtween-${scheme}-${width}.png` }) }
        await wait(1700); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${m ? '-' + m : ''}-s${k + 1}${k === Math.floor(n / 2) ? '-mid' : ''}-${scheme}-${width}.png` })
      }
    }
    await wait(1700);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ${m} ended on ${sh}`);
    await audit(`${id} ${m} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id} ${m} list does not mark the last step`);
  }
  if (width === 1400) { // the step lists' numbers are the page's data
    const r = await p.evaluate(() => { const out = [], li = (id, k) => document.getElementById(id).children[k].textContent.replace(/\s+/g, ' ');
      const need = (id, xs) => xs.forEach(([k, x]) => { if (!li(id, k).includes(String(x))) out.push(`${id} item ${k + 1} lacks "${x}"`) });
      const f1 = v => v.toFixed(1), pc = v => f1(v) + '%';
      // Fig. 1: GPT-3.5-Turbo's five positions, its closed-book and oracle scores, the positions below closed-book, and the other rows' spreads
      const M = LCS.mid, g = M.rows[0], sp = m => f1(M.rows.find(r => r.m === m).spread);
      need('sx-mid', [[0, pc(g.v[0])], [1, pc(g.v[1])], [1, pc(g.v[2])], [1, f1(g.v[0] - g.v[2]) + ' points'], [2, pc(g.v[3])], [2, pc(g.v[4])], [3, pc(g.cb)], [3, pc(g.or)],
        [3, 'positions ' + g.below.join(' and ')], [4, 'MPT-30B-Instruct by ' + sp('MPT-30B-Instruct')], [4, 'LongChat-13B (16K) by ' + sp('LongChat-13B (16K)')]]);
      if (Math.round(M.rows.find(r => r.m === 'Claude-1.3').spread) !== 4 || Math.round(g.spread) !== 22 || Math.round(M.rows[1].spread) !== 22) out.push('mid spreads ' + M.rows.map(r => r.spread));
      if (M.rows.slice(2).some(r => r.below.length) || M.rows[1].below.join() !== g.below.join()) out.push('mid: orange columns other than the GPT-3.5 rows');
      // Fig. 2: shared content words and Table 6
      const N = LCS.nl, T = N.t6, o = N.ov, row = k => T[k].map(pc);
      need('sx-nl', [[1, o.direct[0] + ' of its ' + o.direct[1] + ' content words'], [1, pc(T.Direct[0])], [1, pc(T.Direct[1])], [2, 'shares ' + o.one[0] + ' of ' + o.one[1]], [2, pc(T['One-hop'][0])],
        [3, pc(T['One-hop'][1])], [3, pc(T['One-hop'][2])], [3, f1(T.Direct[2] - T['One-hop'][2]) + ' points'], [4, row('Two-hop').join(', ').replace(/, ([^,]*)$/, ' and $1')], [4, f1(T.Direct[2] - T['Two-hop'][2]) + ' points'],
        [5, 'one-hop ' + row('One-hop, with literal match (MC)').join(', ')], [5, 'two-hop ' + row('Two-hop, with literal match (MC)').join(', ')],
        [5, f1(T.Direct[2] - T['One-hop, with literal match (MC)'][2]) + ' and ' + f1(T.Direct[2] - T['Two-hop, with literal match (MC)'][2])]]);
      if (T.Direct[1] !== T.Direct[2]) out.push('Direct is not flat from 16K to 32K');
      if (o.two[0] !== 0) out.push('two-hop shares words with the needle');
      // Fig. 3: MMStar Table 3 and MMMU-Pro Table 1
      const B = LCS.mm, G = B.g4, Q = B.gp, R0 = B.rows[0], ds = B.rows.map(r => r.drop), lv = B.rows.find(r => r.m.startsWith('LLaVA'));
      need('sx-mm-blind', [[0, pc(B.random)], [1, pc(G.llm[1])], [2, pc(G.blind)], [3, pc(G.full)], [3, f1(G.full - G.blind) + ' points'], [3, Math.round((G.blind - B.random) / (G.full - B.random) * 100) + '%'],
        [3, pc(Q.blind)], [3, pc(Q.full)], [3, pc(Q.llm[1])], [3, f1(Q.full - Q.blind) + ' points']]);
      need('sx-mm-pro', [[0, pc(R0.val)], [1, pc(R0.f4)], [2, pc(R0.o10)], [2, pc(B.rnd4)], [2, pc(B.rnd10)], [3, pc(R0.vis)], [4, R0.pro.toFixed(2) + '%'], [4, R0.drop.toFixed(2) + ' points'],
        [4, 'between ' + f1(Math.min(...ds)) + ' and ' + f1(Math.max(...ds))], [4, pc(lv.o10) + ' with ten options to ' + pc(lv.vis)], [4, B.rows.length === 11 ? 'all eleven models' : 'all ' + B.rows.length]]);
      if (Math.round(lv.o10 - lv.vis) !== 14) out.push('LLaVA-OneVision screenshot loss ' + (lv.o10 - lv.vis));
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  await audit('end');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file);
  for (const [id] of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
