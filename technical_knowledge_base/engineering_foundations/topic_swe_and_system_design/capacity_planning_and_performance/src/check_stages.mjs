// The 2026-11-06 rollout checks for Capacity planning and performance: every 3D stage plays by itself once scrolled into view, steps to its last
// step in every mode with one step-list item per step, stops redrawing off screen and never moves under reduced motion; no errors, NaN, undefined
// or sideways scroll; the splits are two columns at 1400 px and one below 1100 px. Every number written into the step lists is checked against the
// page's own data (window.CPD), its model (window.CP) and the scenes' exported values; the balancing replay is checked to be CP.lbSim's run.
// usage (from the repo root): node technical_knowledge_base/engineering_foundations/topic_swe_and_system_design/capacity_planning_and_performance/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
// stage id, its mode chips (selector), modes, the step-list id for each mode
const STAGES = [['stg-hero', null, [null], () => 'sx-hero'], ['stg-lb', '#lb-mode', ['random', 'rr', 'p2c', 'lor'], m => 'sx-lb-' + m],
  ['stg-cache', null, [null], () => 'sx-cache'], ['stg-pool', null, [null], () => 'sx-pool']];
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
  // autoplay on view: a stage's data-frames rises
  for (const [id] of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
  }
  // flows stop off screen: draws do not rise while every stage is out of view
  await p.evaluate(() => { const d = document.getElementById('s-prod'); window.scrollTo(0, d.getBoundingClientRect().top + scrollY) }); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  // every mode of every stage to its last step; list length; screenshots mid-way and at the end
  for (const [id, sel, modes, lidOf] of STAGES) for (const m of modes) {
    if (sel) { await p.$eval(`${sel} [data-m="${m}"]`, e => e.click()); await wait(100); }
    const lid = lidOf(m), sfx = m == null ? '' : '-' + m;
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.hidden ? -1 : e.children.length);
    if (lis !== n) problems.push(`${tag}: ${id}${sfx} has ${n} steps but list ${lid} shows ${lis}`);
    for (let k = 1; k < n; k++) {
      await p.$eval(`#${id}-f`, e => e.click()); await wait(80);
      if (k === Math.floor(n / 2) || (id === 'stg-lb' && k === 2)) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(id === 'stg-lb' ? 3000 : 1400); const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}${sfx}-mid${k}-${scheme}-${width}.png` }) }
    }
    await wait(id === 'stg-lb' ? 5800 : 2800);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id}${sfx} ended on ${sh}`);
    if (width === 1400 || width === 390) { const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}${sfx}-last-${scheme}-${width}.png` }) }
    await audit(`${id}${sfx} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
  }
  if (width === 1400) { // the step lists' numbers are the page's data
    const r = await p.evaluate(() => { const out = [], li = (id, k) => document.getElementById(id).children[k].textContent.replace(/\s+/g, ' ');
      const need = (id, xs) => xs.forEach(([k, x]) => { if (!li(id, k).includes(String(x))) out.push(`${id} item ${k + 1} lacks "${x}"`) });
      const f1 = v => v.toFixed(1), fmt = v => Math.round(v).toLocaleString('en-US');
      const H = CAP_HERO, M = H.meas;
      need('sx-hero', [[0, H.lq[0].toFixed(1) + ' requests wait'], [0, 'spends ' + Math.round(H.ws[0]) + 'S'], [1, H.lq[1].toFixed(1) + ' requests wait'], [1, Math.round(H.ws[1]) + 'S'],
        [2, H.lq[2].toFixed(1) + ' waiting'], [2, Math.round(H.ws[2]) + 'S'], [2, 'p99 is ' + f1(Math.log(100))], [2, Math.round(10 * H.ws[2] * +f1(Math.log(100))) + ' ms'], [3, Math.round(H.lq[3]) + ' waiting'], [3, Math.round(H.ws[3]) + 'S'],
        [4, f1(M.util * 100) + '% busy'], [4, f1(CPD.hockey[6].achieved_rate) + ' requests a second'], [4, Math.round(M.mean) + ' ms'], [4, f1(M.inside) + ' requests inside'], [4, 'about ' + Math.round(M.lq) + ' of them'],
        [4, f1(M.S) + ' ms of work (' + f1(M.ws) + 'S)'], [4, Math.round(CPD.hockey[0].p50) + ' ms at ' + Math.round(CPD.hockey[0].util * 100) + '% busy'], [4, Math.round(M.p50) + ' ms at ' + Math.round(M.util * 100) + '% busy']]);
      const LB = CAP_LB;
      ['random', 'rr', 'p2c', 'lor'].forEach(pol => { const tr = LB.trace(pol), ref = CP.lbSim({ n: 8, rho: .9, policy: pol, N: 420, warm: 0, seed: 11, dist: 'exp' }).soj;
        if (ref.length !== tr.soj.length || ref.some((v, i) => Math.abs(v - tr.soj[i]) > 1e-9)) out.push(`the ${pol} replay is not CP.lbSim's run`);
        const S = LB.stats(pol), F = LB.finished(pol), id = 'sx-lb-' + pol;
        S.forEach((s, k) => { const t = li(id, k);
          if (!new RegExp('\\b' + s.longest + '\\b').test(t)) out.push(`${id} item ${k + 1} lacks the longest queue ${s.longest}`);
          const hasIdle = new RegExp('\\b' + s.idleq + ' (of|in) (the )?20\\b').test(t), hasWait = new RegExp('\\b' + s.waiting + ' (requests )?wait').test(t);
          if (/requests? wait/.test(t) && /up to \d+ requests? wait/.test(t) && !hasWait) out.push(`${id} item ${k + 1} quotes the wrong number waiting (${s.waiting})`);
          if (/ of 20 snapshots| of the 20 snapshots/.test(t) && !hasIdle) out.push(`${id} item ${k + 1} quotes the wrong snapshot count (${s.idleq})`); });
        need(id, [[3, 'The ' + F.n + ' requests'], [3, 'mean ' + (pol === 'random' ? 'of ' : '') + f1(F.mean) + ' S'], [3, f1(F.p99) + ' S']]);
        const m = LB.M96; need(id, [[4, (m[0].p99 / 1000).toFixed(2) + ' s random'], [4, (m[1].p99 / 1000).toFixed(2) + ' s round robin'], [4, Math.round(m[2].p99) + ' ms two choices'], [4, Math.round(m[3].p99) + ' ms least outstanding']]);
        const slow = p => CPD.lb.find(x => x.policy === p && x.slow_server), s1 = v => (v / 1000).toFixed(1) + ' s';
        if (pol === 'random') need(id, [[4, s1(slow('random').p99)], [4, s1(slow('rr').p99)]]);
        if (pol === 'rr') need(id, [[4, s1(slow('rr').p99)], [4, s1(slow('random').p99)]]);
        if (pol === 'p2c') need(id, [[4, (slow('p2c').share_slowest * 100).toFixed(1) + '%'], [4, Math.round(slow('p2c').p99 / 10) * 10 + ' ms']]);
        if (pol === 'lor') need(id, [[4, (slow('lor').share_slowest * 100).toFixed(1) + '%'], [4, Math.round(slow('lor').p99) + ' ms']]); });
      const C = CAP_CACHE; need('sx-cache', [[0, fmt(C.db[0]) + ' a second'], [0, Math.round(C.db[0] / C.CAP * 100) + '% busy'], [0, 'serve ' + C.CAP], [1, 'then ' + fmt(C.db[1])], [1, Math.round(C.db[1] / C.CAP * 100) + '% busy'],
        [2, Math.round(C.db[2] / C.CAP * 100) + '%'], [2, fmt(C.db[2]) + ' a second'], [3, '17K'], [4, '1.3K']]);
      const Q = CAP_POOL; need('sx-pool', [[0, Q.A.toFixed(2) + ' connections'], [1, (Q.wait[1] * 100).toFixed(1) + '%'], [1, Math.round(Q.A / 6 * 100) + '% busy'], [2, (Q.wait[2] * 100).toFixed(1) + '%'], [2, 'factor of ' + ['', '', '', '', '', '', 'six'][Math.round(Q.wait[1] / Q.wait[2])]], [3, (Q.wait[3] * 100).toFixed(1) + '%']]);
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
