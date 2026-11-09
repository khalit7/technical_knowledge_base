// The 2026-11-06 rollout checks for Knowledge and reasoning benchmarks (2026-11-09): every 3D stage (Fig. 1 four graders, Fig. 2 fix the key in its
// MMLU-Redux and HLE-Verified modes, Fig. 3 ARC-AGI-1 exact match under Rule A and Rule B) plays by itself once scrolled into view, steps to its last
// step in every mode with one step-list item per step, stops redrawing off screen and never moves under reduced motion; no errors, NaN, undefined or
// sideways scroll; the splits are two columns at 1400 px and one below 1100 px. The numbers written in the step lists are recomputed here from the
// page's data (window.KR) and compared, for every MMLU subject chip and every ARC pair. Adapted from the Coding benchmarks page's check_stages.mjs.
// usage (from the repo root): node technical_knowledge_base/measurement/topic_benchmarks/knowledge_and_reasoning/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = [['stg-gr', [['', 'sx-gr']], null], ['stg-key', [['mmlu', 'sx-key-mmlu'], ['hle', 'sx-key-hle']], '#ky-mode'], ['stg-arc', [['a', 'sx-arc-a'], ['b', 'sx-arc-b']], '#ar-rule']];
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
  if (width === 1400) { // the step lists' numbers are the page's data, recomputed here from window.KR
    // MMLU-Redux: every subject chip rewrites the list; check it against counts taken straight from the per-item labels and Table 2
    await p.$eval('#ky-mode [data-m="mmlu"]', e => e.click()); await wait(150);
    for (let si = 0; si < 5; si++) {
      await p.$eval(`#ky-subj [data-m="${si}"]`, e => e.click()); await wait(120);
      const r = await p.evaluate(si => { const out = [], RX = KR.redux, codes = RX.seq[RX.seqSubj[si]].split(''), fl = codes.filter(c => c !== 'o').length, wk = codes.filter(c => c === 'w').length;
        const li = k => document.getElementById('sx-key-mmlu').children[k].textContent.replace(/\s+/g, ' ');
        const need = (k, x) => { if (!li(k).includes(String(x))) out.push(`sx-key-mmlu (${RX.t2subj[si]}) item ${k + 1} lacks "${x}"`) };
        need(0, '100 ' + RX.t2subj[si].toLowerCase()); need(1, fl + ' of 100'); need(1, wk + ' of them'); need(2, (100 - fl) + ' items');
        const M = Object.keys(RX.t2); let mv = null; M.forEach(m => { const [a, r0, c, r1] = RX.t2[m][si]; if (!mv || Math.abs(r0 - r1) > mv.d) mv = { d: Math.abs(r0 - r1), r0, r1, a, c } });
        need(3, '#' + mv.r0 + ' to #' + mv.r1); need(3, mv.a.toFixed(2) + ' to ' + mv.c.toFixed(2)); need(3, M.filter(m => RX.t2[m][si][1] !== RX.t2[m][si][3]).length + ' of 10');
        const best = j => Math.max(...M.map(m => RX.t2[m][si][j])); need(4, '(' + best(0).toFixed(2) + ')'); need(4, '(' + best(2).toFixed(2) + ')');
        return out }, si);
      r.forEach(x => problems.push(`${tag}: ${x}`));
    }
    await p.$eval('#ky-subj [data-m="0"]', e => e.click()); await wait(120);
    const r = await p.evaluate(() => { const out = [], li = (id, k) => document.getElementById(id).children[k].textContent.replace(/\s+/g, ' ');
      const need = (id, k, x) => { if (!li(id, k).includes(String(x))) out.push(`${id} item ${k + 1} lacks "${x}"`) };
      // HLE-Verified Table 2 ranges
      const T = KR.hlev.t2, M = Object.keys(T), col = j => M.map(m => T[m][j]), rg = (xs, d, u) => Math.min(...xs).toFixed(d) + u + ' to ' + Math.max(...xs).toFixed(d) + u;
      need('sx-key-hle', 0, rg(col(0), 1, '%')); need('sx-key-hle', 2, rg(col(4), 1, '%')); need('sx-key-hle', 3, rg(col(6), 1, '%'));
      need('sx-key-hle', 3, rg(M.map(m => T[m][6] - T[m][4]), 1, '')); need('sx-key-hle', 4, rg(M.map(m => T[m][2] - T[m][0]), 1, ''));
      const sp = KR.hlev.split; need('sx-key-hle', 1, sp.verified + ' verified'); need('sx-key-hle', 1, sp.revised.toLocaleString('en-GB')); need('sx-key-hle', 1, sp.uncertain + ' left');
      need('sx-key-hle', 4, T['Grok 4.1 fast reasoning'][1] + ' to ' + T['Grok 4.1 fast reasoning'][3]);
      // ARC task 007bbfb7: Rule A matches every pair, Rule B's counts
      const A = KRS.arc.a, B = KRS.arc.b; if (A.some(x => x !== 81)) out.push('Rule A does not match every pair: ' + A);
      need('sx-arc-b', 5, B[0] + ' of 81'); need('sx-arc-b', 5, Math.min(...B.slice(1)) + ' to ' + Math.max(...B.slice(1))); need('sx-arc-b', 5, Math.round(100 * B[0] / 81) + '%');
      need('sx-gr', 4, KRS.gr.right + ' of 81'); if (KRS.gr.right !== B[0]) out.push('Fig. 1 and Fig. 3 disagree on Rule B demo 1');
      need('sx-gr', 1, KR.items.arc_c.id); need('sx-gr', 1, 'key ' + KRS.gr.key);
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
