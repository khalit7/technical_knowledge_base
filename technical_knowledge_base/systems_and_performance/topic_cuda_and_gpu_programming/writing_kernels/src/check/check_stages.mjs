// The 2026-11-06 rollout checks for Writing kernels (2026-11-12), adapted from GPU memory hierarchy's check_stages.mjs:
// the five 3D stages (Fig. 1 the matmul ladder, Fig. 2 reductions with four modes, Fig. 3 scans with two, Fig. 5 fusion, Fig. 6
// FlashAttention) and the split-K/split-Q animation play by themselves once scrolled into view, step to their last step with one
// step-list item per step (in every mode), stop redrawing off screen and never move under reduced motion; the FA-3 schedule is a
// widget (it never plays by itself and opens on its finished time line); no errors, NaN, undefined or sideways scroll; splits are
// two columns at 1400 px and one below 1100 px; scene labels do not overlap or leave the card at 1400 px; every number in the step
// lists equals the page's data (window.WKL, WKT, WKD, WKFT), and the toy FlashAttention equals the direct softmax.
// usage (from the repo root): node technical_knowledge_base/systems_and_performance/topic_cuda_and_gpu_programming/writing_kernels/src/check/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../../index.html'), shots = process.argv[2] || path.resolve(here, '../../.shots');
fs.mkdirSync(shots, { recursive: true });
// [stage, chips id or null, [[mode, list id]]]
const STAGES = [['stg-hero', null, [[null, 'sx-hero']]], ['stg-red', 'stg-red-m', [['r1', 'sx-red-r1'], ['r2', 'sx-red-r2'], ['r3', 'sx-red-r3'], ['r5', 'sx-red-r5']]],
  ['stg-scan', 'stg-scan-m', [['hs', 'sx-scan-hs'], ['bl', 'sx-scan-bl']]], ['stg-fuse', null, [[null, 'sx-fuse']]], ['stg-fa', null, [[null, 'sx-fa']]]];
const ANIMS = [['fa-card1', 'fa-ctl1', 'fa-split', [['k', 'sx-fak'], ['q', 'sx-faq']]]];
const WIDGETS = [['fa-card2', 'fa-ctl2', 'fa-sched', ['seq', 'pp', 'ip', 'both']]];
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
      const ok = ['with NaN before', ') = NaN', 'or NaN to flag'];
      return { bad: (c.innerText.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []).filter(x => !ok.some(o => x.includes(o))), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } }, tab);
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  const overlaps = async (id, where) => {
    if (width !== 1400) return;
    const r = await p.evaluate(id => { const st = (window.WKSTG || {})[id]; if (!st) return null; const cv = st.host.querySelector('canvas'), cx = cv.getContext('2d'), W = cv.clientWidth, H = cv.clientHeight;
      const boxes = [], out = [];
      (st.R.lab || []).forEach(L => { if (L.a < .35) return; const o = L.o, fs = Math.max(12, o.fs || 12.5); cx.font = (o.b ? '600 ' : '') + fs + 'px ' + (o.mono ? 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace' : o.serif ? '"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif' : 'ui-sans-serif,-apple-system,"Segoe UI",Helvetica,Arial,sans-serif');
        const w = cx.measureText(L.text).width, x0 = o.al === 'right' ? L.x - w : o.al === 'left' ? L.x : L.x - w / 2; boxes.push([x0, L.y - fs / 2, x0 + w, L.y + fs / 2, L.text]);
        if (x0 < -1 || x0 + w > W + 1 || L.y - fs / 2 < -1 || L.y + fs / 2 > H + 1) out.push('outside the card: ' + L.text) });
      for (let i = 0; i < boxes.length; i++)for (let j = i + 1; j < boxes.length; j++) { const A = boxes[i], B = boxes[j], ox = Math.min(A[2], B[2]) - Math.max(A[0], B[0]), oy = Math.min(A[3], B[3]) - Math.max(A[1], B[1]);
        if (ox > 3 && oy > 3) out.push(A[4] + ' / ' + B[4]) }
      return out }, id);
    if (r === null) { problems.push(`${tag}: ${id} is not registered in window.WKSTG`); return }
    r.forEach(x => problems.push(`${tag}: ${id} ${where}: labels overlap or leave the card: ${x}`));
  };
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (cols.length < 15 || cols.some(c => c !== 'grid'))) problems.push(`${tag}: a split is not two columns (${cols.length}: ${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  if (width === 1400) {
    const over = await p.$$eval('#t-read .s3R', xs => xs.map(x => { const r = x.getBoundingClientRect(), k = x.firstElementChild && x.firstElementChild.getBoundingClientRect(); return k && r.width && (k.right > r.right + 1 || k.left < r.left - 1) ? x.innerHTML.slice(0, 40) : '' }).filter(Boolean));
    over.forEach(o => problems.push(`${tag}: right-column content wider than its column: ${o}`));
    // the step lists against the page's data and models, recomputed here
    const r = await p.evaluate(() => { const out = [], txt = el => el.textContent.replace(/\s+/g, ' ').trim();
      const need = (lid, k, x) => { const li = document.getElementById(lid).children[k]; if (!li || !txt(li).includes(x)) out.push(`${lid} item ${k + 1} lacks "${x}"`) };
      const f1 = v => v.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
      // Fig. 1: every rung's numbers from window.WKL
      window.WKL.rungs.forEach((r, k) => { need('sx-hero', k, 'A6000 ' + f1(r.boehm.gflops) + ' GFLOP/s (' + f1(r.boehm.pct) + '%');
        if (r.regs != null) need('sx-hero', k, r.regs + ' registers'); if (r.m1) need('sx-hero', k, 'M1 Pro ' + r.m1.ms.toFixed(2) + ' ms');
        if (r.moved != null) need('sx-hero', k, 'global ' + r.moved); if (r.shared) need('sx-hero', k, 'shared ' + r.shared) });
      // Figs. 2 and 3: totals and per-step counts from window.WKT
      const T = window.WKT, run = m => T.run(m), last = (m, l) => document.getElementById(l).children.length - 1;
      const r1 = run('r1').tot; need('sx-red-r1', 4, r1.adds + ' additions, ' + r1.idle + ' idle lanes, ' + r1.barrier + ' barriers');
      const r2 = run('r2'); need('sx-red-r2', 4, r2.tot.adds + ' additions and only ' + r2.tot.idle + ' idle lanes, but ' + r2.tot.tx + ' shared-memory transactions'); need('sx-red-r2', 2, r2.cs[1].worst + '-way');
      if (r2.tot.tx !== r1.tx) out.push('R1 and R2 no longer have the same transaction count');
      const r3 = run('r3').tot; need('sx-red-r3', 4, r3.adds + ' additions, ' + r3.idle + ' idle lanes, ' + r3.tx + ' transactions');
      const r5 = run('r5'); need('sx-red-r5', 5, r5.tot.barrier + ' barrier instead of ' + r3.barrier); need('sx-red-r5', 5, r5.tot.tx + ' shared-memory transactions instead of ' + r3.tx); need('sx-red-r5', 5, r5.tot.adds + ' additions instead of ' + r3.adds);
      { const s = r5.states[2]; need('sx-red-r5', 2, [0, 4, 8].map(i => s[i]).join(', ') + ' and ' + s[12]) }
      const hs = run('hs'); hs.cs.forEach((c, i) => need('sx-scan-hs', i + 1, c.adds + (i === 3 ? ' more additions' : ' additions')));
      need('sx-scan-hs', 4, hs.tot.adds + ' additions'); const bl = run('bl'); need('sx-scan-bl', 9, bl.tot.adds + ' additions against Hillis-Steele\'s ' + hs.tot.adds + ', in ' + bl.tot.steps + ' steps instead of ' + hs.tot.steps);
      need('sx-scan-bl', 2, bl.cs[1].worst + '-way'); need('sx-scan-bl', 4, 'holds the total, ' + bl.states[4][15]);
      // Fig. 5: the recorded timings
      const F = window.WKD.m1.fuse, ms = k => F[k + '@1024'].ms.toFixed(2);
      need('sx-fuse', 1, ms('U') + ' ms'); need('sx-fuse', 2, ms('F0') + ' ms'); need('sx-fuse', 3, ms('Fp') + ' ms'); need('sx-fuse', 4, ms('F') + ' ms against'); need('sx-fuse', 4, ms('MM') + ' ms');
      // Fig. 6: the toy, the rows whose maximum rises, and the result against the direct softmax
      const M = window.WKFT, rows = j => { const r = M.states[j].rise.map(i => i + 1); return r.length === 1 ? 'row ' + r[0] : 'Rows ' + r.join(' and ') };
      need('sx-fa', 3, rows(2)); need('sx-fa', 4, rows(3)); need('sx-fa', 5, rows(4)); need('sx-fa', 0, M.N + ' keys in ' + M.T + ' tiles of ' + M.Bc);
      const d = Math.max(...M.out.flatMap((r, i) => r.map((v, c) => Math.abs(v - M.ref[i][c])))); if (!(d < 1e-12)) out.push('the toy FlashAttention differs from the direct softmax by ' + d);
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  // every stage and the 2D animation play once scrolled into view; the widget does not
  for (const [id] of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
    if (shoot) { await wait(300); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-autoplay-${scheme}-${width}.png` }) }
  }
  for (const [card, ctl] of ANIMS) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const lab = await p.$eval(`#${ctl}-p`, e => e.textContent); if (!/Pause/.test(lab)) problems.push(`${tag}: ${card} did not start playing when scrolled into view (${lab})`);
  }
  for (const [card, ctl, seg, modes] of WIDGETS) {
    const v0 = await p.$eval(`#${ctl}-s`, e => e.value); await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(2000);
    const v1 = await p.$eval(`#${ctl}-s`, e => [e.value, e.max]);
    if (v1[0] !== v0 || v1[0] !== v1[1]) problems.push(`${tag}: the widget ${card} moved by itself or does not open on its last step (${v0} -> ${v1})`);
    for (const m of modes) { await p.$eval(`#${seg} button[data-m="${m}"]`, e => e.click()); await wait(150);
      const r = await p.$eval(`#${ctl}-s`, e => [e.value, e.max]); if (r[0] !== r[1]) problems.push(`${tag}: ${card} mode ${m} did not open on its finished schedule`) }
  }
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  for (const [id, chips, modes] of STAGES) for (const [m, lid] of modes) {
    if (chips) { await p.$eval(`#${chips} button[data-m="${m}"]`, e => e.click()); await wait(200);
      const hid = await p.$$eval(modes.map(x => '#' + x[1]).join(','), xs => xs.map(x => x.id + ':' + x.hidden)); if (hid.filter(h => h.endsWith(':false')).length !== 1 || !hid.includes(lid + ':false')) problems.push(`${tag}: ${id} mode ${m} shows lists ${hid}`) }
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length);
    if (lis !== n) problems.push(`${tag}: ${id} ${m || ''} has ${n} steps but list ${lid} shows ${lis}`);
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' }));
    const mid = Math.floor((n - 1) / 2);
    for (let k = 0; k < n; k++) {
      if (k) await p.$eval(`#${id}-f`, e => e.click());
      if (shoot && (width === 1400 || k === mid)) {
        await wait(700); await overlaps(id, `${m || ''} step ${k + 1} mid-tween`);
        await wait(1000); await overlaps(id, `${m || ''} step ${k + 1}`); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${m ? '-' + m : ''}-s${k + 1}-${scheme}-${width}.png` })
      } else await wait(200);
    }
    await wait(1600);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ${m || ''} ended on ${sh}`);
    await audit(`${id} ${m || ''} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id} ${m || ''} list does not mark the last step`);
  }
  for (const [card, ctl, seg, modes] of ANIMS) for (const [m, lid] of modes) {
    await p.$eval(`#${seg} button[data-m="${m}"]`, e => e.click()); await wait(200);
    const n = await p.$eval(`#${ctl}-s`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.hidden ? -1 : e.children.length);
    if (lis !== n) problems.push(`${tag}: ${card} mode ${m} has ${n} steps but list ${lid} shows ${lis}`);
    await p.$eval(`#${ctl}-b`, e => e.click()); for (let k = 0; k < n; k++) await p.$eval(`#${ctl}-f`, e => e.click());
    const v = await p.$eval(`#${ctl}-s`, e => +e.value); if (v !== n - 1) problems.push(`${tag}: ${card} mode ${m} did not reach its last step`);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on'))); if (cur !== n - 1) problems.push(`${tag}: ${card} list ${lid} does not mark the last step`);
    if (shoot) await (await p.$('#' + card)).screenshot({ path: `${shots}/x-${card}-${m}-${scheme}-${width}.png` });
  }
  await audit('end');
  for (const t of ['t-bench', 't-sass', 't-more']) { await p.click(`#tabs button[data-t="${t}"]`); await wait(300); await audit(t, t) }
  await p.click('#tabs button[data-t="t-read"]');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file);
  for (const [id] of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1400);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  for (const [card, ctl] of ANIMS) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval(`#${ctl}-s`, e => +e.value); if (r !== 0) problems.push(`reduced motion: ${card} moved by itself`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
