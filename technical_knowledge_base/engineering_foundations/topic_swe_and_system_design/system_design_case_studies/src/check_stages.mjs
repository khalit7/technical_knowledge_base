// The 2026-11-06 rollout checks for System design case studies: the seven 3D build-ups play by themselves once scrolled into view, step to their
// last step with one step-list item per step, stop redrawing off screen and never move under reduced motion; no errors, NaN, undefined or
// sideways scroll; the splits are two columns at 1400 px and one below 1100 px; at 1400 px no two stage labels overlap, settled or mid-transition.
// Every number written into the step lists and drawn on the stages is checked against EST_EXPECT (recompute.py) and MEAS (inputs/pg_measured.json).
// usage (from the repo root): node technical_knowledge_base/engineering_foundations/topic_swe_and_system_design/system_design_case_studies/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const D = ['url', 'rl', 'chat', 'feed', 'gw', 'rag', 'job'];
const wait = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const problems = [];
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(400);
  const tag = `${scheme} ${width}`;
  const audit = async where => {
    const r = await p.evaluate(() => { const c = document.getElementById('t-read').cloneNode(true); c.querySelectorAll('pre,code,.code').forEach(x => x.remove());
      return { bad: (c.innerText.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } });
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (!cols.length || cols.some(c => c !== 'grid'))) problems.push(`${tag}: a split is not two columns (${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  // autoplay on view: data-frames rises
  for (const d of D) {
    await p.$eval('#stg-' + d, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#stg-' + d, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: stg-${d} did not play when scrolled into view`);
  }
  // flows stop off screen
  await p.evaluate(() => { const d = document.getElementById('s-prac'); window.scrollTo(0, d.getBoundingClientRect().top + scrollY) }); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  // every stage to its last step; list length; label overlaps settled and mid-transition (1400 px); screenshots mid-way and at the end
  for (const d of D) {
    const id = 'stg-' + d;
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#sx-' + d, e => e.children.length);
    const nspec = await p.evaluate(d => DESIGN_SPECS[d].steps.length, d);
    if (lis !== n || nspec !== n) problems.push(`${tag}: ${id} has ${n} steps, list ${lis}, spec ${nspec}`);
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(300);
    for (let k = 0; k < n; k++) {
      if (k > 0) { await p.$eval(`#${id}-f`, e => e.click()); }
      const mid = k === Math.floor(n / 2);
      if (width === 1400) { await wait(700); const o = await p.evaluate(d => ARCH.overlaps(d), d); if (o.length) problems.push(`${tag}: ${id} step ${k + 1} mid-transition labels overlap: ${o.join('; ')}`) }
      if (mid) { if (width !== 1400) await wait(700); let el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}-tween${k + 1}-${scheme}-${width}.png` }) }
      await wait(width === 1400 ? 1000 : 300);
      if (width === 1400) { const o = await p.evaluate(d => ARCH.overlaps(d), d); if (o.length) problems.push(`${tag}: ${id} step ${k + 1} labels overlap: ${o.join('; ')}`) }
      if (mid) { await wait(600); const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}-mid${k + 1}-${scheme}-${width}.png` }) }
    }
    await wait(1200);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
    const on = await p.$eval('#sx-' + d, e => [...e.children].findIndex(li => li.classList.contains('on'))); if (on !== n - 1) problems.push(`${tag}: sx-${d} marks item ${on + 1}`);
    if (width === 1400 || width === 390) { const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}-last-${scheme}-${width}.png` }) }
    await audit(`${id} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((d, k) => document.getElementById('sx-' + d).children[k].click(), d, k);
  }
  if (width === 1400) { // the numbers in the step lists and on the stages are the page's estimates and measurements
    const r = await p.evaluate(() => { const out = [], li = (d, k) => document.getElementById('sx-' + d).children[k].textContent.replace(/\s+/g, ' ');
      const need = (d, xs) => xs.forEach(([k, x]) => { if (!li(d, k).includes(String(x))) out.push(`sx-${d} item ${k + 1} lacks "${x}"`) });
      const E = EST_EXPECT, F = RD.fmt, M = MEAS, near = (a, b, tol, what) => { if (Math.abs(a - b) > tol) out.push(`${what}: text ${a}, data ${b}`) };
      const pc = x => Math.round(x * 100) + '%';
      need('url', [[1, pc(E.url.fill6)], [1, '36 billion'], [2, pc(E.url.fill7)], [3, F(E.url.r_pk, 0)], [6, String(E.url.srv)], [7, F(E.url.tb, 0) + ' TB']]);
      near(36e9, E.url.links, 0, 'url links'); near(5093, E.url.r_pk * 1.1, 1, 'url requests at peak ((clicks + links) a month x peak)');
      const iv = EST.defaults('rl');
      need('rl', [[1, iv.gw + ' &times; '.replace('&times;', '×') + iv.limit], [1, F(E.rl.local)], [3, Math.min(...M.race.naive.map(x => x.admitted)) + ' to ' + Math.max(...M.race.naive.map(x => x.admitted))], [4, 'exactly ' + M.race.limit], [7, F(E.rl.node)]]);
      near(500000, E.rl.ops * 10, 0, 'rl 10x checks');
      need('chat', [[1, F(E.chat.poll)], [1, '43 times'], [2, 'About ' + E.chat.gws], [5, F(E.chat.tbyr) + ' TB']]);
      near(46000, E.chat.send, 500, 'chat writes'); near(333000, E.chat.pres, 500, 'chat heartbeats'); near(43, E.chat.poll / E.chat.send, .5, 'chat poll ratio');
      const f = M.feed;
      need('feed', [[1, F(f.read_on_read.median_ms, 1) + ' ms'], [1, F(f.read_precomputed.median_ms, 3) + ' ms'], [1, Math.round(f.read_on_read.median_ms / f.read_precomputed.median_ms) + ' times'], [2, '800 ids, 3 copies'], [3, '93 million']]);
      near(22.5e6, E.feed.onread, 0, 'feed lookups'); near(31e6, EST.defaults('feed').celeb, 0, 'feed celebrity'); near(2.9, E.feed.ram, .05, 'feed RAM');
      need('gw', [[1, '$4,200']]); near(4200, E.gw.cday, 50, 'gateway spend a day');
      need('rag', [[2, '8 nearest chunks'], [6, 'About 8 chunks a second']]); near(8, E.rag.reemb, .5, 'rag chunks a second'); near(8, EST.defaults('rag').k, 0, 'rag k');
      need('job', [[7, F(E.job.burst)], [7, '2,500 machines'], [8, '2,100']]); near(2100, E.job.spr, 20, 'job spread'); near(2500, E.job.workpk, 0, 'job machines');
      // the stages drew their numbers from the same data
      const S = SC_NUM; if (!S.url || S.url.fill6 !== pc(E.url.fill6) || S.feed.ins !== F(E.feed.celeb_ins) || S.job.burst !== F(E.job.burst) || JSON.stringify(S.rl.naive) !== JSON.stringify(M.race.naive.map(x => x.admitted))) out.push('stage numbers differ from the data');
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
  for (const d of D) { const id = 'stg-' + d; await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
