// The 2026-11-06 rollout checks for LLM serving in production (2026-11-12), adapted from the Batching, KV cache and scheduling page's
// check_stages.mjs: the four 3D stages (Fig. 1 the request path, Fig. 2 eight real requests routed, Fig. 3 the replica pool over half an
// hour, Fig. 4 adapters in one layer) and the 2D step animation (Fig. 5 the freeze under two load generators) play by themselves once
// scrolled into view, step to their last step with one step-list item per step (in every mode), stop redrawing off screen and never move
// under reduced motion; the two long replays (the eight-request widget in a closed block, the autoscaling comparison) are widgets that
// never play by themselves and open on their last frame; no errors, NaN, undefined or sideways scroll; splits are two columns at 1400 px
// and one below 1100 px; scene labels do not overlap or leave the card at 1400 px; the numbers in the step lists equal the page's own data
// (window.PRD) and simulator (window.PRSIM through window.PR_AS).
// usage (from the repo root): node technical_knowledge_base/systems_and_performance/topic_inference_and_serving/llm_serving_in_production/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = [['stg-hero', 'sx-hero', null], ['stg-rt', 'sx-rt-rr', ['rt-mode', [['pa', 'sx-rt-pa'], ['bw', 'sx-rt-bw'], ['rr', 'sx-rt-rr']]]],
  ['stg-as', 'sx-as-q', ['as-mode', [['util', 'sx-as-u'], ['queue', 'sx-as-q']]]], ['stg-lora', 'sx-lo-t', ['lo-mode', [['mixed', 'sx-lo-m'], ['turns', 'sx-lo-t']]]]];
const ANIMS = [['pr-co-card', 'pr-co-ctl', 'sx-co-c', ['pr-co-mode', [['poisson', 'sx-co-o'], ['closed', 'sx-co-c']]]]];
const WIDGETS = [['pr-rt-card', 'pr-rt-ctl'], ['sc-card', 'sc-ctl']];
const SPLITS = 11;
const wait = ms => new Promise(r => setTimeout(r, ms));
const problems = [];
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(400);
  const tag = `${scheme} ${width}`, shoot = width === 1400 || width === 390;
  const audit = async (where, tab = 't-read') => {
    const r = await p.evaluate(tab => { const c = document.getElementById(tab).cloneNode(true); c.querySelectorAll('pre,code').forEach(x => x.remove());
      return { bad: (c.innerText.match(/.{0,30}(?<![-\w])(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } }, tab);
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  const overlaps = async (id, where) => {
    if (width !== 1400) return;
    const r = await p.evaluate(id => { const st = (window.PRSTG || {})[id]; if (!st) return null; const cv = st.host.querySelector('canvas'), cx = cv.getContext('2d'), W = cv.clientWidth, H = cv.clientHeight;
      const boxes = [], out = [];
      (st.R.lab || []).forEach(L => { if (L.a < .35) return; const o = L.o, fs = Math.max(12, o.fs || 12.5); cx.font = (o.b ? '600 ' : '') + fs + 'px ' + (o.mono ? 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace' : 'ui-sans-serif,-apple-system,"Segoe UI",Helvetica,Arial,sans-serif');
        const w = cx.measureText(L.text).width, x0 = o.al === 'right' ? L.x - w : o.al === 'left' ? L.x : L.x - w / 2; boxes.push([x0, L.y - fs / 2, x0 + w, L.y + fs / 2, L.text]);
        if (x0 < 3 || x0 + w > W - 3 || L.y - fs / 2 < 2 || L.y + fs / 2 > H - 2) out.push('outside or touching the card: ' + L.text) });
      for (let i = 0; i < boxes.length; i++)for (let j = i + 1; j < boxes.length; j++) { const A = boxes[i], B = boxes[j], ox = Math.min(A[2], B[2]) - Math.max(A[0], B[0]), oy = Math.min(A[3], B[3]) - Math.max(A[1], B[1]);
        if (ox > 2 && oy > 2) out.push(A[4] + ' / ' + B[4]) }
      return out }, id);
    if (r === null) { problems.push(`${tag}: ${id} is not registered in window.PRSTG`); return }
    r.forEach(x => problems.push(`${tag}: ${id} ${where}: labels overlap or leave the card: ${x}`));
  };
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (cols.length !== SPLITS || cols.some(c => c !== 'grid'))) problems.push(`${tag}: splits are not ${SPLITS} two-column grids (${cols.length}: ${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  if (width === 1400) {
    const over = await p.$$eval('#t-read .s3R', xs => xs.map(x => { const r = x.getBoundingClientRect(), k = x.firstElementChild && x.firstElementChild.getBoundingClientRect(); return k && r.width && (k.right > r.right + 1 || k.left < r.left - 1) ? x.innerHTML.slice(0, 40) : '' }).filter(Boolean));
    over.forEach(o => problems.push(`${tag}: right-column content wider than its column: ${o}`));
    // the step lists against the page's data and simulator, recomputed here
    const r = await p.evaluate(() => { const out = [], txt = el => el.textContent.replace(/\s+/g, ' ').trim(), nf = x => Math.round(x).toLocaleString('en-US'), f = (x, d) => x.toFixed(d);
      const need = (lid, k, x) => { const li = document.getElementById(lid).children[k]; if (!li || !txt(li).includes(x)) out.push(`${lid} item ${k + 1} lacks "${x}"`) };
      // Fig. 2: every request's replica and computed tokens, and the totals
      const D = PRD.route_detail, sum = R => R.reduce((s, r) => s + r[3], 0), per = R => [0, 1, 2].map(i => sum(R.filter(r => r[1] === i)));
      const RR = D.root8big.rr, PA = D.root8big.ca, BW = D.root8burst.wt;
      RR.forEach((r, j) => { need('sx-rt-rr', j + 1, r[0] + ' to replica ' + (r[1] + 1)); need('sx-rt-rr', j + 1, nf(r[3]) + (j === 4 ? ' of ' + nf(r[2] + r[3]) : '')) });
      need('sx-rt-rr', 8, nf(sum(RR)) + ' prompt tokens computed'); need('sx-rt-rr', 8, per(RR).map(nf).join(', ').replace(/, (\S+)$/, ' and $1') + ' per replica');
      if (sum(RR) !== PRD.route.root8big.rr[0].computed) out.push('Fig. 2 round robin total');
      PA.forEach((r, j) => { need('sx-rt-pa', j + 1, r[0] + ' to replica ' + (r[1] + 1)); need('sx-rt-pa', j + 1, nf(r[3]) + ' computed') });
      need('sx-rt-pa', 5, nf(PA[4][2]) + ' tokens found'); need('sx-rt-pa', 8, nf(sum(PA)) + ' in all'); if (per(PA)[1] || per(PA)[2]) out.push('Fig. 2 cache-aware: not all on replica 1');
      need('sx-rt-bw', 1, BW.slice(0, 4).map((r, j) => r[0] + ' to ' + (j ? '' : 'replica ') + (r[1] + 1)).join(', ').replace(/, (\S+ to \d)$/, ', $1'));
      if (BW.slice(0, 4).some(r => r[3] !== 2000)) out.push('Fig. 2 bursts: a first turn found a cache hit');
      BW.slice(5).forEach(r => { if (r[3] !== 201) out.push('Fig. 2 bursts: ' + r[0] + ' computed ' + r[3]) }); if (BW[4][3] !== 1500 || BW[4][1] !== 2) out.push('Fig. 2 bursts: A2');
      need('sx-rt-bw', 3, BW.reduce((c, r) => { c[r[1]]++; return c }, [0, 0, 0]).join(', ').replace(/, (\d)$/, ', $1'));
      // Fig. 3: the simulator's own runs
      const Q = PR_AS.run('queue'), U = PR_AS.run('util'), S = Q.series, at = t => S.find(s => s.t === t);
      need('sx-as-q', 0, Math.max(...S.filter(s => s.t <= 600).map(s => s.waiting)) + ' requests'); need('sx-as-q', 0, Q.starts.filter(s => s[0] < 600).length + ' more replicas');
      need('sx-as-q', 1, Q.starts.filter(s => s[0] >= 600).length + ' new ones'); need('sx-as-q', 1, at(645).waiting + ' requests pile up'); need('sx-as-q', 1, at(645).ready === 4 ? 'Four replicas serve' : '#');
      need('sx-as-q', 2, at(660).ready + ' serve at minute 11'); need('sx-as-q', 2, at(675).ready + ' at 11.25'); need('sx-as-q', 2, 'peaks at ' + Math.max(...S.map(s => s.waiting)) + ' waiting');
      need('sx-as-q', 2, f(Math.max(...S.map(s => s.ttft_p90)), 1) + ' s'); if (at(690).waiting !== 0) out.push('Fig. 3: queue not empty at 11.5');
      need('sx-as-q', 3, 'until minute ' + (S.find(s => s.t > 690 && s.ready < 16).t / 60).toFixed(2)); need('sx-as-q', 3, 'shrinks to ' + at(1200).ready);
      need('sx-as-q', 5, 'p99 TTFT ' + f(Q.ttft_p99, 1) + ' s'); need('sx-as-q', 5, f(Q.slo_ok * 100, 1) + '%'); need('sx-as-q', 5, f(Q.replica_hours, 2) + ' replica-hours'); if (at(1800).ready !== 4) out.push('Fig. 3: not back to 4');
      const grow = [3].concat(U.series.filter((s, i) => i && s.ready !== U.series[i - 1].ready).map(s => s.ready)); need('sx-as-u', 0, grow.join(', '));
      need('sx-as-u', 0, 'to ' + (U.series.find(s => s.ready === 16).t / 60).toFixed(2)); need('sx-as-u', 2, 'p99 TTFT ' + f(U.ttft_p99, 2) + ' s'); if (U.slo_ok !== 1) out.push('Fig. 3 util: not every request within the target');
      need('sx-as-u', 3, f(U.replica_hours, 2) + ' replica-hours against ' + f(Q.replica_hours, 2)); if (U.series.some(s => s.t > 195 && s.ready !== 16)) out.push('Fig. 3 util: the pool moved after minute 3.25');
      // Fig. 5: the first repeats
      const CO = PRD.co, run = m => CO.runs[m + '_yes'].find(r => r.rep === 1), req = m => CO.req[m + '_yes'];
      const C = run('closed'), O = run('poisson'), Rc = req('closed'), Ro = req('poisson');
      need('sx-co-c', 1, Rc.filter(r => r[0] < C.stall_s[0]).length + ' requests sent'); need('sx-co-c', 1, 'about ' + f(C.req_s, 1) + ' requests a second');
      if (Rc.filter(r => r[0] >= C.stall_s[0] && r[0] <= C.stall_s[1]).length) out.push('Fig. 5: closed loop sent during the freeze');
      need('sx-co-c', 3, f(Math.max(...Rc.map(r => r[1])), 1) + ' s each'); need('sx-co-c', 4, C.over1s + ' of ' + C.n + ' requests'); need('sx-co-c', 4, 'median ' + f(C.e2e_p50, 2) + ' s');
      need('sx-co-c', 4, Math.round(Math.max(...Rc.map(r => r[0] + r[1]))) + ' s');
      need('sx-co-o', 1, Ro.filter(r => r[0] < O.stall_s[0]).length + ' sent'); need('sx-co-o', 2, Ro.filter(r => r[0] >= O.stall_s[0] && r[0] <= O.stall_s[1]).length + ' arrive');
      need('sx-co-o', 4, O.over1s + ' of ' + O.n); need('sx-co-o', 4, 'median ' + f(O.e2e_p50, 2) + ' s'); need('sx-co-o', 4, Math.round(Math.max(...Ro.map(r => r[0] + r[1]))) + ' s');
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  // every stage and step animation plays once scrolled into view; the widgets do not move
  for (const [id] of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
    if (shoot) { await wait(300); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-autoplay-${scheme}-${width}.png` }) }
  }
  for (const [card, ctl] of ANIMS) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const lab = await p.$eval(`#${ctl}-p`, e => e.getAttribute('aria-label')); if (lab !== 'Pause') problems.push(`${tag}: ${card} did not play when scrolled into view`);
  }
  for (const [card, ctl] of WIDGETS) {
    await p.$eval('#' + card, e => { const d = e.closest('details'); if (d) d.open = true; e.scrollIntoView({ block: 'center' }) }); await wait(300); const v0 = await p.$eval(`#${ctl}-s`, e => e.value); await wait(1500);
    const r = await p.$eval(`#${ctl}-s`, e => [e.value, +e.max]), lab = await p.$eval(`#${ctl}-p`, e => e.getAttribute('aria-label'));
    if (lab !== 'Play' || r[0] !== v0 || +r[0] !== r[1]) problems.push(`${tag}: widget ${card} moved by itself or does not open on its last frame (${lab}, ${v0} -> ${r[0]} of ${r[1]})`);
  }
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  const stepAll = async (id, lid, label) => {
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length), vis = await p.$eval('#' + lid, e => !e.hidden);
    if (lis !== n || !vis) problems.push(`${tag}: ${id}${label} has ${n} steps but list ${lid} shows ${lis}${vis ? '' : ' (hidden)'}`);
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' }));
    for (let k = 0; k < n; k++) {
      if (k) await p.$eval(`#${id}-f`, e => e.click());
      if (shoot) {
        await wait(700); await overlaps(id, `${label} step ${k + 1} mid-tween`); if (k === Math.floor(n / 2)) await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${label}-s${k + 1}-midtween-${scheme}-${width}.png` });
        await wait(id === 'stg-as' ? 3300 : 1300); await overlaps(id, `${label} step ${k + 1}`); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${label}-s${k + 1}-${scheme}-${width}.png` })
      } else await wait(150);
    }
    await wait(id === 'stg-as' ? 3800 : 1600);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id}${label} ended on ${sh}`);
    await audit(`${id}${label} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id}${label} list does not mark the last step`);
  };
  for (const [id, lid, modes] of STAGES) {
    await stepAll(id, lid, '');
    if (!modes) continue;
    for (const [m, ml] of modes[1]) {
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' }));
      await p.$eval(`#${modes[0]} button[data-m="${m}"]`, e => e.click()); await wait(2000);
      const r = await p.$eval('#' + id, e => [e.querySelector('.stg-st').textContent, e.querySelector('.stg-p').getAttribute('aria-label')]);
      if (!/^step [12] of/.test(r[0]) || r[1] !== 'Pause') problems.push(`${tag}: ${id} mode ${m} did not restart and replay (${r})`);
      const hid = await p.$eval('#' + id, (c, ml) => [...c.closest('.s3sp').querySelectorAll('ol.sx')].filter(o => !o.hidden).map(o => o.id), ml);
      if (hid.length !== 1 || hid[0] !== ml) problems.push(`${tag}: ${id} mode ${m} shows lists ${hid}`);
      await stepAll(id, ml, '-' + m);
    }
  }
  const step2d = async (card, ctl, lid, label) => {
    await p.$eval(`#${ctl}-b`, e => e.click()); await p.evaluate(ctl => { const e = document.getElementById(ctl + '-s'); e.value = 0; e.dispatchEvent(new Event('input')) }, ctl);
    const n = await p.$eval(`#${ctl}-s`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length), vis = await p.$eval('#' + lid, e => !e.hidden);
    if (lis !== n || !vis) problems.push(`${tag}: ${card}${label} has ${n} steps but list ${lid} shows ${lis}${vis ? '' : ' (hidden)'}`);
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' }));
    for (let k = 1; k < n; k++) { await p.$eval(`#${ctl}-f`, e => e.click()); await wait(shoot && k === Math.floor(n / 2) ? 1200 : 60);
      if (shoot && k === Math.floor(n / 2)) await (await p.$('#' + card)).screenshot({ path: `${shots}/x-${card}${label}-mid-${scheme}-${width}.png` }) }
    await wait(3200);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${card}${label} list does not mark the last step (${cur})`);
    await audit(`${card}${label} last step`);
  };
  for (const [card, ctl, lid, modes] of ANIMS) {
    await step2d(card, ctl, lid, '');
    for (const [m, ml] of modes[1]) {
      await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' }));
      await p.$eval(`#${modes[0]} button[data-m="${m}"]`, e => e.click()); await wait(1600);
      const st = await p.$eval(`#${ctl}-s`, e => +e.value), lab = await p.$eval(`#${ctl}-p`, e => e.getAttribute('aria-label'));
      if (st > 1 || (lab !== 'Pause' && !(st === 0))) problems.push(`${tag}: ${card} mode ${m} did not restart (${st}, ${lab})`);
      const hid = await p.$eval('#' + card, (c, ml) => [...c.closest('.s3sp').querySelectorAll('ol.sx')].filter(o => !o.hidden).map(o => o.id), ml);
      if (hid.length !== 1 || hid[0] !== ml) problems.push(`${tag}: ${card} mode ${m} shows lists ${hid}`);
      await step2d(card, ctl, ml, '-' + m);
    }
  }
  // the widgets: every button and select
  for (const [card, ctl] of WIDGETS) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' }));
    await p.evaluate(async card => { const c = document.getElementById(card), sl = ms => new Promise(r => setTimeout(r, ms));
      for (const btn of c.querySelectorAll('.seg button, .presets button')) { btn.click(); await sl(30) }
      for (const sel of c.querySelectorAll('select:not([id$="-v"])')) for (const o of sel.options) { sel.value = o.value; sel.dispatchEvent(new Event('change')); await sl(10) } }, card);
    for (let k = 0; k < 20; k++) await p.$eval(`#${ctl}-b`, e => e.click());
    await audit(`${card} controls`);
  }
  await audit('end');
  { await p.click('#tabs button[data-t="t-more"]'); await wait(300); await audit('t-more', 't-more'); }
  await p.click('#tabs button[data-t="t-read"]');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file);
  for (const [id] of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1400);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  for (const [card, ctl] of ANIMS.concat(WIDGETS)) { await p.$eval('#' + card, e => { const d = e.closest('details'); if (d) d.open = true; e.scrollIntoView({ block: 'center' }) }); await wait(1200);
    const r = await p.$eval(`#${ctl}-p`, e => e.getAttribute('aria-label')); if (r !== 'Play') problems.push(`reduced motion: ${card} played by itself`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
