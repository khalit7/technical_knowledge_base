// The 2026-11-06 rollout checks for Coding benchmarks (2026-11-09): every 3D stage (Fig. 1 hero, Fig. 2 weak tests, Fig. 3 one SWE-bench task in four
// candidate modes) plays by itself once scrolled into view, steps to its last step in every mode with one step-list item per step, stops redrawing off
// screen and never moves under reduced motion; no errors, NaN, undefined or sideways scroll; the splits are two columns at 1400 px and one below 1100 px.
// The numbers written in the step lists are checked against what the scenes compute from the page's data (window.CBN, from window.CD), and the pass@k
// list (Fig. 4, 2D) against window.CM. Adapted from the Agentic benchmarks page's check_stages.mjs.
// usage (from the repo root): node technical_knowledge_base/measurement/topic_benchmarks/coding/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = [['stg-hero', [['', 'sx-hero']], null], ['stg-he', [['', 'sx-he']], null], ['stg-swe', [['gold', 'sx-swe-gold'], ['issue', 'sx-swe-issue'], ['half', 'sx-swe-half'], ['none', 'sx-swe-none']], '#swe-mode']];
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
  await p.evaluate(() => window.scrollTo(0, document.getElementById('rd-read').getBoundingClientRect().top + scrollY)); await wait(800);
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
      const H = CBN.hero, f1 = v => v.toFixed(1);
      H.forEach(([m, a, b, d], i) => need('sx-hero', [[i + 1, m], [i + 1, f1(a) + '%'], [i + 1, f1(b) + '%'], [i + 1, f1(Math.abs(d)) + ' points']]));
      const ds = H.map(x => Math.abs(x[3])), lo = Math.min(...ds), hi = Math.max(...ds);
      if (!document.getElementById('rd-top').textContent.includes(f1(lo) + ' to ' + f1(hi) + ' points')) out.push('hero intro lacks the range ' + lo + ' to ' + hi);
      const E = CBN.he, c6 = E.c.c6, c4 = E.c.c4, c1 = E.c.c1;
      need('sx-he', [[0, "HumanEval's " + E.nb], [0, "HumanEval+'s " + E.np], [1, 'all ' + E.nb], [2, E.np + ' inputs'], [3, c6.p[1] + ' wrong answers'], [3, c6.p[2] + ' large inputs'], [3, c6.p[0] + ' of ' + E.np],
        [4, 'passes all ' + (E.nb + E.np)], [4, c1.p[1] + ' wrong answers'], [5, E.heval + ' of the 3'], [5, E.plus + ' of the 3']]);
      if (c1.b[0] !== E.nb - 1 || c6.b[0] !== E.nb || c4.b[0] !== E.nb || c4.p[0] !== E.np || c1.p[2] !== 1 || !E.wrong6 || c6.p[1] !== E.neg) out.push('weak-tests counts ' + JSON.stringify(E));
      const W = CBN.swe;
      for (const m of ['gold', 'issue', 'half', 'none']) { const x = W.m[m], id = 'sx-swe-' + m;
        need(id, [[0, W.commit], [0, 'Django ' + W.version], [3, x.chk === W.nchk ? 'all ' + W.nchk : x.chk + ' of ' + W.nchk], [3, 'fail-to-pass'], [4, W.np + ' pass-to-pass'], [5, x.a && x.u ? 'Resolved.' : 'Not resolved.']]) }
      if (W.nf !== 3) out.push('fail-to-pass count ' + W.nf);
      // Fig. 4 (2D): the pass@k values written in its list, from the page's own estimators
      const OUT = [3, 10, 16], pc = v => (v * 100).toFixed(1) + '%';
      [4, 8, 12, 16, 20].forEach((n, i) => { const c = OUT.filter(j => j < n).length; need('sx-pk', [[i + 1, 'c = ' + c]]); need('sx-pk', [[i + 1, pc(CM.plug(n, c, 5))]]); if (n >= 5) need('sx-pk', [[i + 1, pc(CM.passk(n, c, 5))]]) });
      const eu = CM.expect(20, .15, 5, CM.passk), ep = CM.expect(20, .15, 5, CM.plug); need('sx-pk', [[6, pc(eu)], [6, pc(ep)], [6, ((eu - ep) * 100).toFixed(1) + ' points low']]);
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
