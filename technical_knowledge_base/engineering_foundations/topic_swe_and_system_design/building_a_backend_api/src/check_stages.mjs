// The 2026-11-06 rollout checks for Building a backend API: every 3D stage and 2D animation plays by itself once scrolled into view, steps to its
// last step in every mode with one step-list item per step (and, for the replayed runs, one stretch per item), stops redrawing off screen and never
// moves under reduced motion; no errors, NaN, undefined or sideways scroll; the splits are two columns at 1400 px and one below 1100 px. Every
// recorded value written into the step lists is checked against window.API_DATA (the recordings) and the scenes' own constants.
// usage (from the repo root): node technical_knowledge_base/engineering_foundations/topic_swe_and_system_design/building_a_backend_api/src/check_stages.mjs [shots dir]
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
const STAGES = [['stg-hero', null, [null], () => 'sx-hero'], ['stg-life', null, [null], () => 'sx-life'], ['stg-pool', null, [null], () => 'sx-pool'],
  ['stg-conc', '#conc-mode', ['blocking', 'await', 'def', 'w4'], m => 'sx-conc-' + m], ['stg-shut', '#shut-mode', ['0', '1'], m => 'sx-shut-' + m]];
// 2D animations (RD.anim): card, control prefix, list
const ANIMS = [['rd-llm-card', 'rd-llm-ctl', 'sx-llm'], ['rd-sse-card', 'rd-sse-ctl', 'sx-sse']];
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
    const r = await p.evaluate(() => { const c = document.getElementById('t-read').cloneNode(true); c.querySelectorAll('pre,code,.code,.raw').forEach(x => x.remove());
      return { bad: (c.innerText.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } });
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (!cols.length || cols.some(c => c !== 'grid'))) problems.push(`${tag}: a split is not two columns (${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  // autoplay on view: a stage's data-frames rises; an RD.anim's play button reads Pause
  for (const [id] of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
  }
  for (const [card, ctl] of ANIMS) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    if (!/Pause/.test(await p.$eval(`#${ctl}-p`, e => e.textContent))) problems.push(`${tag}: ${card} did not play when scrolled into view`);
  }
  // flows stop off screen: draws do not rise while every stage is out of view
  await p.evaluate(() => window.scrollTo(0, document.getElementById('s-prod').getBoundingClientRect().top + scrollY)); await wait(800);
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
    if (id === 'stg-conc' && (await p.evaluate(m => BA_CONC.stretches(m).length, m)) !== n) problems.push(`${tag}: ${id}${sfx} has a different number of stretches than steps`);
    if (id === 'stg-shut' && (await p.evaluate(m => BA_SHUT.stretches(+m).length, m)) !== n) problems.push(`${tag}: ${id}${sfx} has a different number of stretches than steps`);
    for (let k = 1; k < n; k++) {
      await p.$eval(`#${id}-f`, e => e.click()); await wait(80);
      if (k === Math.floor(n / 2)) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1400); const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}${sfx}-mid-${scheme}-${width}.png` }) }
    }
    await wait(2800);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id}${sfx} ended on ${sh}`);
    if (width === 1400 || width === 390) { const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}${sfx}-last-${scheme}-${width}.png` }) }
    await audit(`${id}${sfx} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
  }
  for (const [card, ctl, lid] of ANIMS) {
    const n = await p.$eval(`#${ctl}-s`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length);
    if (lis !== n) problems.push(`${tag}: ${card} has ${n} steps but list ${lid} shows ${lis}`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    if (await p.$eval(`#${ctl}-s`, e => +e.value) !== n - 1) problems.push(`${tag}: ${card} did not reach its last step from the list`);
    if (width === 1400 || width === 390) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(300); const el = await p.$('#' + card); await el.screenshot({ path: `${shots}/x-${card}-last-${scheme}-${width}.png` }) }
    await audit(`${card} last step`);
  }
  if (width === 1400) { // the step lists' recorded values are the page's data
    const r = await p.evaluate(() => { const out = [], li = (id, k) => document.getElementById(id).children[k].textContent.replace(/\s+/g, ' ');
      const need = (id, xs) => xs.forEach(([k, x]) => { if (!li(id, k).includes(String(x))) out.push(`${id} item ${k + 1} lacks "${x}"`) });
      const f = v => Math.round(v).toLocaleString('en-US'), ord = n => ['1st', '2nd', '3rd', '4th', '5th', '6th'][n - 1];
      const L = BA_LIFE; need('sx-life', [[3, ord(L.dep)], [5, ord(L.h)], [6, 'added first leaves ' + ord(L.mw1out)], [6, 'added second ' + ord(L.mw2out)]]);
      if (L.mw2in !== 1 || L.mw1in !== 2) out.push('the recorded middleware order is not the one described');
      const PO = BA_POOL; need('sx-pool', [[0, PO.POOL + ' connections plus up to ' + PO.OVER], [1, PO.PODS + ' x ' + (PO.POOL + PO.OVER) + ' = ' + PO.one], [1, 'defaults to ' + PO.MAXC], [2, '(' + PO.deploy + ')']]);
      const S = API_DATA.runs.styles, K = BA_CONC.KEY, last = BA_CONC.last;
      need('sx-conc-blocking', [[2, f(last('blocking', 0))], [2, f(S[K.blocking].wall_ms) + ' ms in all'], [2, f(S[K.blocking].p50_ms) + ' ms']]);
      need('sx-conc-await', [[2, f(last('await', 0)) + ' to ' + f(S[K.await].wall_ms) + ' ms']]);
      need('sx-conc-def', [[2, f(last('def', 0)) + ' to ' + f(last('def', 39)) + ' ms'], [3, f(last('def', 40)) + ' to ' + f(last('def', 49)) + ' ms']]);
      const W4 = S[K.w4].req, per = [1, 2, 3, 4].map(w => { const rs = W4.filter(r => r[2] === w).map(r => r[1]); return [rs.length, Math.min(...rs), Math.max(...rs)] }).sort((a, b) => a[0] - b[0]);
      const cnt = per.map(x => x[0]).sort((a, b) => b - a);
      need('sx-conc-w4', [[0, cnt.slice(0, 3).join(', ') + ' and ' + cnt[3]], [1, per[0][0] + ' requests answers all of them at ' + f(per[0][1]) + ' to ' + f(per[0][2]) + ' ms'],
        [2, f(per[1][1]) + ' to ' + f(per[1][2]) + ' ms (' + per[1][0] + ' requests)'], [2, f(per[2][1]) + ' to ' + f(per[2][2]) + ' ms (' + per[2][0] + ')'], [2, 'the ' + per[3][0] + ' on the busiest finish at ' + f(S[K.w4].wall_ms) + ' ms']]);
      const sd = API_DATA.runs.shutdown, lg = (s, n) => s.uvicorn_log.find(e => e.log.includes(n)).ms;
      const A = BA_SHUT.T(0); need('sx-shut-0', [[0, '200 at ' + A.keep1 + ' ms'], [0, 'sent at ' + A.slow0 + ' ms'], [0, 'started at ' + A.slowH + ' ms'], [0, 'answer at ' + A.bgResp + ' ms'],
        [1, 'SIGTERM at ' + f(A.term) + ' ms'], [1, '"Shutting down" at ' + f(A.down) + ' ms'], [1, f(A.wait) + ' ms'], [2, 'connection at ' + f(A.newc) + ' ms'], [2, f(A.keep2) + ' ms fails with ' + sd[0].clients.keepalive_after_sigterm.result],
        [3, '200 OK at ' + f(A.slow1) + ' ms'], [4, f(lg(sd[0], 'Waiting for background')) + ' ms'], [4, 'done at ' + f(A.bg1) + ' ms'], [5, 'runs at ' + f(A.life) + ' ms'], [5, 'exits at ' + f(A.exit) + ' ms, ' + f(A.exit - A.term) + ' ms after SIGTERM']]);
      if (!A.slowOk || !A.bgOk || sd[0].clients.new_connection_after_sigterm.result !== 'ConnectionRefusedError') out.push('the default shutdown run is not the one described');
      const B = BA_SHUT.T(1); need('sx-shut-1', [[0, 'answered at ' + B.keep1 + ' ms'], [0, 'sent at ' + B.slow0 + ' ms'], [0, 'answered at ' + B.bgResp + ' ms'], [1, 'SIGTERM at ' + f(B.term) + ' ms'], [1, f(B.down) + ' ms'], [1, f(B.wait) + ' ms'],
        [2, 'connection at ' + f(B.newc) + ' ms'], [2, f(B.keep2) + ' ms fails'], [3, sd[1].uvicorn_log.find(e => e.log.includes('Cancel')).log.split('ERROR:')[1].trim() + '" at ' + f(B.cancel) + ' ms'], [3, sd[1].clients.slow_request.result + ' at ' + f(B.slow1) + ' ms'],
        [3, 'shutdown runs at ' + f(B.life) + ' ms'], [4, 'Exit at ' + f(B.exit) + ' ms'], [4, f(B.exit - B.term) + ' ms after SIGTERM']]);
      if (B.slowOk || B.bgOk) out.push('the timeout shutdown run is not the one described');
      const T = API_DATA.stream_ms; need('sx-sse', [[1, T[0].toFixed(1) + ' ms'], [2, T[1].toFixed(1) + ' ms'], [3, T[2].toFixed(1) + ' ms'], [4, T[3].toFixed(1) + ' ms'], [5, T[4].toFixed(1) + ' ms'], [6, T[5].toFixed(1) + ' ms'], [7, T[6].toFixed(1) + ' ms']]);
      if (T[7] !== T[6]) out.push('the end of the stream is not in the same arrival as the stop event');
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
  for (const [card, ctl] of ANIMS) { const v0 = await p.$eval(`#${ctl}-s`, e => e.value);
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const v1 = await p.$eval(`#${ctl}-s`, e => e.value); if (v1 !== v0 || /Pause/.test(await p.$eval(`#${ctl}-p`, e => e.textContent))) problems.push(`reduced motion: ${card} moved by itself`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
