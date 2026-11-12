// The 2026-11-06 rollout checks for Ray (2026-11-12), adapted from Launching distributed training's check_stages.mjs:
// the four 3D stages (Fig. 1 one call through the cluster, Fig. 2 the actor, Fig. 3 the node loss, Fig. 4 Ray Train) play by themselves once
// scrolled into view, step to their last step with one step-list item per step, stop redrawing off screen and never move under reduced motion;
// the three 2D animations (the eight naps and the Ray Data timeline in stretches of their runs, the object stepper) play once in view, have one
// list item per step in every mode, swap their list on a mode switch and replay; the Ray Train replay is a widget that never plays by itself;
// no errors, NaN, undefined or sideways scroll in any tab; splits are two columns at 1400 px and one below 1100 px; scene labels do not overlap
// or leave the card at 1400 px; the numbers in the step lists equal the page's own data (window.RY and what the scenes and charts derive from it).
// usage (from the repo root): node technical_knowledge_base/systems_and_performance/topic_ml_infra_and_orchestration/ray/src/check/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../../index.html'), shots = process.argv[2] || path.resolve(here, '../../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = [['stg-hero', 'sx-hero'], ['stg-actor', 'sx-actor'], ['stg-loss', 'sx-loss'], ['stg-train', 'sx-train']];
const SPLITS = 12;
// 2D animations: card, controller prefix, mode bar, [mode, list id]
const ANIMS = [['ry-nap-card', 'ry-nap-ctl', 'ry-nap-mode', [['together', 'sx-nap-together'], ['get_in_loop', 'sx-nap-get_in_loop']]],
  ['ry-obj-card', 'ry-obj-ctl', null, [[null, 'sx-obj']]],
  ['ry-dp-card', 'ry-dp-ctl', 'ry-dp-mode', [['streaming', 'sx-dp-streaming'], ['pipelined', 'sx-dp-pipelined'], ['staged', 'sx-dp-staged']]]];
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
    const r = await p.evaluate(tab => { const c = document.getElementById(tab).cloneNode(true); c.querySelectorAll('pre,code').forEach(x => x.remove()); const T0 = c.innerText;
      return { bad: (T0.match(/.{0,30}(\bNaN\b|\bundefined\b|\bInfinity\b).{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } }, tab);
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  const overlaps = async (id, where) => {
    if (width !== 1400) return;
    const r = await p.evaluate(id => { const st = (window.RYSTG || {})[id]; if (!st) return null; const cv = st.host.querySelector('canvas'), cx = cv.getContext('2d'), W = cv.clientWidth, H = cv.clientHeight;
      const boxes = [], out = [];
      (st.R.lab || []).forEach(L => { if (L.a < .35) return; const o = L.o, fs = Math.max(12, o.fs || 12.5); cx.font = (o.b ? '600 ' : '') + fs + 'px ' + (o.mono ? 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace' : 'ui-sans-serif,-apple-system,"Segoe UI",Helvetica,Arial,sans-serif');
        const w = cx.measureText(L.text).width, x0 = o.al === 'right' ? L.x - w : o.al === 'left' ? L.x : L.x - w / 2; boxes.push([x0, L.y - fs / 2, x0 + w, L.y + fs / 2, L.text]);
        if (x0 < 3 || x0 + w > W - 3 || L.y - fs / 2 < 2 || L.y + fs / 2 > H - 2) out.push('outside or touching the card: ' + L.text) });
      for (let i = 0; i < boxes.length; i++)for (let j = i + 1; j < boxes.length; j++) { const A = boxes[i], B = boxes[j], ox = Math.min(A[2], B[2]) - Math.max(A[0], B[0]), oy = Math.min(A[3], B[3]) - Math.max(A[1], B[1]);
        if (ox > 2 && oy > 2) out.push(A[4] + ' / ' + B[4]) }
      return out }, id);
    if (r === null) { problems.push(`${tag}: ${id} is not registered in window.RYSTG`); return }
    r.forEach(x => problems.push(`${tag}: ${id} ${where}: labels overlap or leave the card: ${x}`));
  };
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (cols.length !== SPLITS || cols.some(c => c !== 'grid'))) problems.push(`${tag}: splits are not ${SPLITS} two-column grids (${cols.length}: ${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  if (width === 1400) {
    const over = await p.$$eval('#t-read .s3R', xs => xs.map(x => { const r = x.getBoundingClientRect(), k = x.firstElementChild && x.firstElementChild.getBoundingClientRect(); return k && r.width && (k.right > r.right + 1 || k.left < r.left - 1) ? x.innerHTML.slice(0, 40) : '' }).filter(Boolean));
    over.forEach(o => problems.push(`${tag}: right-column content wider than its column: ${o}`));
    // the step lists against the page's own data, recomputed here
    const r = await p.evaluate(() => { const out = [], txt = el => el.textContent.replace(/\s+/g, ' ').trim();
      const need = (lid, k, x) => { const li = document.getElementById(lid).children[k]; if (!li || !txt(li).includes(x)) out.push(`${lid} item ${k + 1} lacks "${x}"`) };
      const Y = window.RY, f1 = x => x.toFixed(1), f2 = x => x.toFixed(2), f3 = x => x.toFixed(3), ms = x => Math.round(x * 1000) + ' ms';
      // Fig. 1: the cluster's idle memory, the two 16 MB reads on w2
      const M = Y.mem_idle_mb, H = window.RY_HERO; need('sx-hero', 0, 'head ' + M.head + ' MB'); need('sx-hero', 0, M.w1 + ' and ' + M.w2 + ' MB'); need('sx-hero', 0, Y.spill.store_mb + ' MB object store');
      need('sx-hero', 5, f2(H.r0) + ' s'); need('sx-hero', 5, ms(H.r1));
      // the naps: stretch boundaries from the run's tasks
      const nt = window.RY_NAPB('together'), nl = window.RY_NAPB('get_in_loop'), N = Y.tasks.naps;
      need('sx-nap-together', 0, ms(nt[0])); need('sx-nap-together', 2, f2(nt[2]) + ' s'); need('sx-nap-together', 2, f2(Math.max(...N.together.tasks.map(t => t.s))) + ' s');
      need('sx-nap-get_in_loop', 1, f2(nl[1]) + ' s'); need('sx-nap-get_in_loop', 2, f2(nl[2]) + ' s');
      // Fig. 2: the actor
      const A = window.RY_ACT; need('sx-actor', 0, f2(A.create) + ' s'); need('sx-actor', 1, f2(A.rtt) + ' ms'); need('sx-actor', 1, f2(A.trtt) + ' ms');
      need('sx-actor', 2, f2(A.batch) + ' s'); need('sx-actor', 2, A.first + ' to ' + A.last); need('sx-actor', 3, 'at ' + A.before); need('sx-actor', 3, 'returns ' + A.after);
      need('sx-actor', 3, A.die); need('sx-actor', 4, A.dead);
      // the object stepper
      const O = Y.objects; need('sx-obj', 0, O.before.small[0].size.toLocaleString('en-US') + ' bytes'); need('sx-obj', 3, f3(O.read16[0].secs) + ' s'); need('sx-obj', 4, f3(O.read16[1].secs) + ' s'); need('sx-obj', 5, f3(O.read16[2].secs) + ' s');
      // Fig. 3: the node loss
      const L = window.RY_LOSS; need('sx-loss', 1, f2(L.D.done_t) + ' s'); need('sx-loss', 2, f1(L.HC[0]) + ' s'); need('sx-loss', 2, L.HC.slice(1, -1).map(f1).join(', ') + ' and ' + f1(L.HC[L.HC.length - 1]) + ' s');
      need('sx-loss', 3, f1(L.DEAD) + ' s'); need('sx-loss', 4, f1(L.REC) + ' s'); need('sx-loss', 4, f1(L.A.secs) + ' s'); need('sx-loss', 5, L.B.type); need('sx-loss', 5, L.C.type); need('sx-loss', 5, f1(L.C.done_t) + ' s');
      need('sx-loss', 6, 'returned ' + L.a1.value); need('sx-loss', 6, L.a0.type);
      // Ray Data: stretch boundaries from the runs' blocks
      for (const m of ['streaming', 'pipelined', 'staged']) { const B = window.RY_DPB(m); B.forEach((v, k) => need('sx-dp-' + m, k, f2(v) + ' s')); need('sx-dp-' + m, 3, Y.data[m].batches + ' batches') }
      // Fig. 4: Ray Train, run 1
      const T = window.RY_TRAIN; need('sx-train', 2, f1(T.up) + ' s'); need('sx-train', 4, f2(T.reg50) + ' s'); need('sx-train', 5, f2(T.rep100) + ' s'); need('sx-train', 5, 'step ' + T.crash.step + ' (' + f2(T.crash.t) + ' s)');
      need('sx-train', 6, f2(T.exc) + ' s'); need('sx-train', 6, f2(T.re) + ' s'); need('sx-train', 6, 'step ' + T.from); need('sx-train', 6, (T.crash.step - T.from) + ' steps');
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  // every stage plays once scrolled into view
  for (const [id] of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
    if (shoot) { await wait(300); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-autoplay-${scheme}-${width}.png` }) }
  }
  // the 2D animations play once in view, have one list item per step in every mode, and a mode switch swaps the list and replays
  for (const [card, ctl, bar, modes] of ANIMS) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1800);
    if (await p.$eval('#' + ctl + '-p', e => e.getAttribute('aria-label')) !== 'Pause') problems.push(`${tag}: ${card} did not play when scrolled into view`);
    for (const [m, lid] of modes) {
      if (bar && m !== modes[0][0]) { await p.$eval(`#${bar} button[data-m="${m}"]`, e => e.click()); await wait(900);
        const r = await p.evaluate((ctl, lid) => [document.getElementById(ctl + '-p').getAttribute('aria-label'), document.getElementById(lid).hidden], ctl, lid);
        if (r[0] !== 'Pause' || r[1]) problems.push(`${tag}: ${card} mode ${m} did not swap its list and replay (${r})`) }
      const n = await p.$eval('#' + ctl + '-s', e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length);
      if (n !== lis) problems.push(`${tag}: ${card} ${m} has ${n} steps, list ${lis}`);
      const others = await p.evaluate((lid, ids) => ids.filter(x => x !== lid && !document.getElementById(x).hidden), lid, modes.map(x => x[1])); if (others.length) problems.push(`${tag}: ${card} ${m} shows other lists ${others}`);
      await p.$eval('#' + ctl + '-b', e => e.click()); for (let k = 1; k < n; k++) await p.$eval('#' + ctl + '-f', e => e.click());
      if ((await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')))) !== n - 1) problems.push(`${tag}: ${card} ${m} list does not mark the last step`);
      if (shoot) { await wait(1900); await (await p.$('#' + card)).screenshot({ path: `${shots}/x-${card}-${m}-last-${scheme}-${width}.png` }) }
    }
    if (bar) { await p.$eval(`#${bar} button[data-m="${modes[0][0]}"]`, e => e.click()); await wait(200) }
  }
  { await p.$eval('#ry-tr-card', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.evaluate(() => [document.getElementById('ry-tr-ctl-p').getAttribute('aria-label'), +document.getElementById('ry-tr-ctl-s').value, +document.getElementById('ry-tr-ctl-s').max]);
    if (r[0] !== 'Play' || r[1] !== r[2]) problems.push(`${tag}: the Ray Train replay should be a still widget on its last event (${r})`) }
  // off screen: the end of the Reading tab, far from every stage
  await p.evaluate(() => window.scrollTo(0, document.getElementById('t-read').getBoundingClientRect().bottom + scrollY - innerHeight)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  for (const [id, lid] of STAGES) {
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length);
    if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but list ${lid} shows ${lis}`);
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' }));
    for (let k = 0; k < n; k++) {
      if (k) await p.$eval(`#${id}-f`, e => e.click());
      if (shoot) {
        await wait(750); await overlaps(id, `step ${k + 1} mid-tween`); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}-midtween-${scheme}-${width}.png` });
        await wait(1300); await overlaps(id, `step ${k + 1}`); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}-${scheme}-${width}.png` })
      } else await wait(200);
    }
    await wait(1900);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
    await audit(`${id} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id} list does not mark the last step`);
  }
  await audit('end');
  if (shoot) await p.screenshot({ path: `${shots}/x-read-full-${scheme}-${width}.png`, fullPage: true });
  for (const t of ['t-more']) { await p.click(`#tabs button[data-t="${t}"]`); await wait(300); await audit(t, t); if (shoot) await p.screenshot({ path: `${shots}/x-${t}-${scheme}-${width}.png`, fullPage: true }) }
  await p.click('#tabs button[data-t="t-read"]');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file);
  for (const [id] of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1400);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  for (const [card, ctl] of ANIMS) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.evaluate(c => [document.getElementById(c + '-p').getAttribute('aria-label'), +document.getElementById(c + '-s').value], ctl); if (r[0] !== 'Play' || r[1] !== 0) problems.push(`reduced motion: ${card} moved by itself (${r})`) }
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
