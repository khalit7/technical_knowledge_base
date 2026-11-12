// The 2026-11-06 rollout checks for Triton and Gluon (2026-11-12), adapted from GPU memory hierarchy's check_stages.mjs:
// the three 3D stages (Fig. 1 one program, Fig. 2 the autotuner, Fig. 3 the compiler, with its Gluon mode) and the two 2D animations
// (vector add with three modes, grouped ordering with two) play by themselves once scrolled into view, step to their last step with one
// step-list item per step, swap lists on a mode toggle, stop redrawing off screen and never move under reduced motion; no errors, NaN,
// undefined or sideways scroll; splits are two columns at 1400 px and one below 1100 px; scene labels do not overlap or leave the card at
// 1400 px, at the end of each step and mid-tween; every number in the step lists equals the page's data (window.TGD) or what its scenes
// and the grouped-order function compute (TG_HERO, TG_AT, TG_COMP, TG_grouped).
// usage (from the repo root): node technical_knowledge_base/systems_and_performance/topic_cuda_and_gpu_programming/triton_and_gluon/src/check/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../../index.html'), shots = process.argv[2] || path.resolve(here, '../../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = [['stg-hero', 'sx-hero'], ['stg-at', 'sx-at'], ['stg-comp', 'sx-comp']];
const ANIMS = [['rd-va-card', 'rd-va-ctl', 'sx-va-hint'], ['rd-gr-card', 'rd-gr-ctl', 'sx-gr']];
const SPLITS = 10;
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
      return { bad: (c.innerText.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } }, tab);
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  const overlaps = async (id, where) => {
    if (width !== 1400) return;
    const r = await p.evaluate(id => { const st = (window.TGSTG || {})[id]; if (!st) return null; const cv = st.host.querySelector('canvas'), cx = cv.getContext('2d'), W = cv.clientWidth, H = cv.clientHeight;
      const boxes = [], out = [];
      (st.R.lab || []).forEach(L => { if (L.a < .35) return; const o = L.o, fs = Math.max(12, o.fs || 12.5); cx.font = (o.b ? '600 ' : '') + fs + 'px ' + (o.mono ? 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace' : 'ui-sans-serif,-apple-system,"Segoe UI",Helvetica,Arial,sans-serif');
        const w = cx.measureText(L.text).width, x0 = o.al === 'right' ? L.x - w : o.al === 'left' ? L.x : L.x - w / 2; boxes.push([x0, L.y - fs / 2, x0 + w, L.y + fs / 2, L.text]);
        if (x0 < 0 || x0 + w > W + 1 || L.y - fs / 2 < -1 || L.y + fs / 2 > H + 1) out.push('outside the card: ' + L.text) });
      for (let i = 0; i < boxes.length; i++)for (let j = i + 1; j < boxes.length; j++) { const A = boxes[i], B = boxes[j], ox = Math.min(A[2], B[2]) - Math.max(A[0], B[0]), oy = Math.min(A[3], B[3]) - Math.max(A[1], B[1]);
        if (ox > 3 && oy > 3) out.push(A[4] + ' / ' + B[4]) }
      return out }, id);
    if (r === null) { problems.push(`${tag}: ${id} is not registered in window.TGSTG`); return }
    r.forEach(x => problems.push(`${tag}: ${id} ${where}: labels overlap or leave the card: ${x}`));
  };
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (cols.length !== SPLITS) problems.push(`${tag}: ${cols.length} splits in Reading, expected ${SPLITS}`);
  if (width === 1400 && cols.some(c => c !== 'grid')) problems.push(`${tag}: a split is not two columns (${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  if (width === 1400) {
    const over = await p.$$eval('#t-read .s3R', xs => xs.map(x => { const r = x.getBoundingClientRect(), k = x.firstElementChild && x.firstElementChild.getBoundingClientRect(); return k && r.width && (k.right > r.right + 1 || k.left < r.left - 1) ? x.innerHTML.slice(0, 40) : '' }).filter(Boolean));
    over.forEach(o => problems.push(`${tag}: right-column content wider than its column: ${o}`));
    // the step lists against the data and the scenes' own numbers
    const r = await p.evaluate(() => { const out = [], D = window.TGD, txt = el => el.textContent.replace(/\s+/g, ' ').trim(), fm = v => v.toLocaleString('en-US');
      const need = (lid, k, x) => { const li = document.getElementById(lid).children[k]; if (!li || !txt(li).includes(x)) out.push(`${lid} item ${k + 1} lacks "${x}"`) };
      const m = {}; D.main.forEach(r => m[r.key + '.' + r.target] = r);
      // Fig. 1
      const H = window.TG_HERO, mm = m['matmul.sm_90a'];
      need('sx-hero', 0, '9 x 9 = ' + H.programs + ' programs'); need('sx-hero', 2, H.ksteps + ' steps');
      need('sx-hero', 3, 'num_stages=' + mm.num_stages); need('sx-hero', 3, H.smemKB + ' KB in all'); need('sx-hero', 3, mm.regs + ' registers per thread');
      need('sx-hero', 3, D.exp.mma_per_kstep.sm_90a.per_issuer + ' instructions per K step');
      const k = H.per_k; need('sx-hero', 4, `${k.sm_80} on sm_80, ${k.sm_90a} on sm_90a, ${k.sm_100a} on sm_100a, ${k.sm_120} on sm_120, ${k.gfx942} on gfx942 and ${k.gfx950} on gfx950`);
      // Fig. 2
      const A = window.TG_AT, ms = s => s.toFixed(1) + ' s';
      need('sx-at', 1, `from ${A.regs[0]} to ${A.regs[1]} per thread`); need('sx-at', 1, `from ${A.smemKB[0]} KB to ${A.smemKB[1]} KB`);
      need('sx-at', 2, A.over + ' configurations cannot launch'); need('sx-at', 2, A.limKB + ' KB per-block limit');
      need('sx-at', 3, 'The ' + A.fit + ' that fit'); need('sx-at', 3, A.fit + ' x 125 ms is about ' + ms(A.timing_s));
      need('sx-at', 6, `${2 * A.n} compiles, ${2 * A.over} skipped, ${2 * A.fit} timed, about ${ms(2 * A.timing_s)}`);
      if (A.n !== 16 || A.over + A.fit !== 16) out.push('tutorial 03 no longer has 16 configurations');
      // Fig. 3
      const C = window.TG_COMP;
      need('sx-comp', 1, 'TTIR, ' + fm(C.lines[0]) + ' lines'); need('sx-comp', 2, 'TTGIR, ' + fm(C.lines[1]) + ' lines'); need('sx-comp', 3, 'LLVM IR, ' + fm(C.lines[2]) + ' lines');
      need('sx-comp', 4, 'PTX, ' + fm(C.lines[3]) + ' lines'); need('sx-comp', 4, C.wgmma_ptx + ' in the listing, beside ' + C.cp_async + ' cp.async');
      need('sx-comp', 5, 'SASS, ' + fm(C.lines[4]) + ' instructions'); need('sx-comp', 5, C.hgmma + ' HGMMA and ' + C.ldgsts + ' LDGSTS');
      need('sx-comp-gl', 1, C.gluon_stages.slice(0, -1).join(', ') + ' and ' + C.gluon_stages.slice(-1)); need('sx-comp-gl', 2, C.gluon_layout.replace(/^#blocked = /, ''));
      if (!C.gluon_stages.every(s => s !== 'ttir')) out.push('the Gluon kernel now has a TTIR stage');
      // the vector add's three lists
      const h = m['vadd.sm_90a'], n1 = m['vadd_n1000.sm_90a'], nh = m['vadd_nohints.sm_90a'];
      need('sx-va-hint', 4, h.ops['LDG.E.128'] + ' LDG.E.128'); need('sx-va-hint', 4, h.ops['STG.E.128'] + ' STG.E.128'); need('sx-va-hint', 3, h.regs + ' registers per thread');
      need('sx-va-n1000', 4, n1.ops['LDG.E'] + ' LDG.E and ' + n1.ops['STG.E'] + ' STG.E'); need('sx-va-n1000', 3, n1.regs + ' registers per thread');
      need('sx-va-nohint', 4, nh.ops['LDG.E'] + ' LDG.E'); need('sx-va-nohint', 4, nh.ops['STG.E'] + ' STG.E'); need('sx-va-nohint', 3, nh.regs + ' registers per thread');
      // grouped ordering in both orders, recomputed with the page's own function
      const seg = document.getElementById('rd-gr-mode'), G = {};
      for (const md of ['row', 'grouped']) { seg.querySelector(`button[data-m="${md}"]`).click(); G[md] = [1, 3, 9, 18, 27, 81].map(n => TG_grouped(n)) }
      seg.querySelector('button[data-m="row"]').click();
      need('sx-gr', 0, G.row[0] + ' tiles in either order'); if (G.row[0] !== G.grouped[0]) out.push('grouped step 1 differs');
      need('sx-gr', 1, G.row[1] + ' tiles'); need('sx-gr', 1, 'also ' + G.grouped[1]);
      need('sx-gr', 2, G.row[2] + ' tiles'); need('sx-gr', 2, G.grouped[2] + ' tiles'); need('sx-gr', 2, Math.round(100 * (1 - G.grouped[2] / G.row[2])) + '% fewer');
      need('sx-gr', 3, G.row[3] + ' tiles'); need('sx-gr', 3, G.grouped[3] + ' tiles');
      need('sx-gr', 4, G.row[4] + ' tiles'); if (G.row[4] !== G.grouped[4]) out.push('grouped step 5 differs'); need('sx-gr', 5, G.row[5] + ', in both orders'); if (G.row[5] !== G.grouped[5]) out.push('grouped step 6 differs');
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  // every stage and animation plays once scrolled into view
  for (const [id] of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
    if (shoot) { await wait(300); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-autoplay-${scheme}-${width}.png` }) }
  }
  for (const [card, ctl] of ANIMS) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1600);
    const t = await p.$eval(`#${ctl}-p`, e => e.textContent); if (!/Pause/.test(t)) problems.push(`${tag}: ${card} did not play when scrolled into view (${t})`);
  }
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => i > 0 && v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  const stepThrough = async (id, lid, name) => {
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length);
    if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but list ${lid} shows ${lis}`);
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' }));
    for (let k = 0; k < n; k++) {
      if (k) await p.$eval(`#${id}-f`, e => e.click());
      if (shoot) {
        await wait(800); await overlaps(id, `${name} step ${k + 1} mid-tween`); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${name}-s${k + 1}-midtween-${scheme}-${width}.png` });
        await wait(1100); await overlaps(id, `${name} step ${k + 1}`); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${name}-s${k + 1}-${scheme}-${width}.png` })
      } else await wait(200);
    }
    await wait(1800);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
    await audit(`${name} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id} list ${lid} does not mark the last step`);
  };
  for (const [id, lid] of STAGES) await stepThrough(id, lid, id);
  // Fig. 3's Gluon mode: the chip swaps the list (and only that list shows), replays, and steps through
  await p.$eval('#comp-mode button[data-m="gl"]', e => e.click()); await wait(300);
  const vis = await p.evaluate(() => [document.getElementById('sx-comp').hidden, document.getElementById('sx-comp-gl').hidden]);
  if (!vis[0] || vis[1]) problems.push(`${tag}: the Gluon chip did not swap the step lists (${vis})`);
  await stepThrough('stg-comp', 'sx-comp-gl', 'stg-comp-gl');
  await p.$eval('#comp-mode button[data-m="tr"]', e => e.click()); await wait(200);
  if ((await p.$eval('#stg-comp-r', e => +e.max + 1)) !== 6) problems.push(`${tag}: back in Triton mode Fig. 3 does not have 6 steps`);
  // the 2D animations: modes swap their lists, step to the end, list marks the last step
  for (const [card, ctl, lid0] of ANIMS) {
    const modes = card === 'rd-va-card' ? [['hint', 'sx-va-hint'], ['n1000', 'sx-va-n1000'], ['nohint', 'sx-va-nohint']] : [['row', 'sx-gr'], ['grouped', 'sx-gr']];
    const seg = card === 'rd-va-card' ? 'rd-va-mode' : 'rd-gr-mode';
    for (const [md, lid] of modes) {
      await p.$eval(`#${seg} button[data-m="${md}"]`, e => e.click()); await wait(150);
      const shown = await p.evaluate(() => [...document.querySelectorAll('ol.sx[id^="sx-va-"]')].filter(o => !o.hidden).map(o => o.id));
      if (card === 'rd-va-card' && (shown.length !== 1 || shown[0] !== lid)) problems.push(`${tag}: vector add mode ${md} shows lists ${shown}`);
      const n = await p.$eval(`#${ctl}-s`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length);
      if (n !== lis) problems.push(`${tag}: ${card} mode ${md} has ${n} steps but ${lid} shows ${lis}`);
      for (let k = 1; k < n; k++) { await p.$eval(`#${ctl}-f`, e => e.click()); await wait(card === 'rd-gr-card' ? 1700 : 120) }
      const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
      if (cur !== n - 1) problems.push(`${tag}: ${card} mode ${md} list does not mark the last step`);
      if (card === 'rd-gr-card') { await wait(2600); const st = await p.$eval('#rd-gr-cnt', e => e.textContent); if (!/programs launched\s*81/.test(st)) problems.push(`${tag}: grouped mode ${md} did not reach 81 programs (${st.slice(0, 60)})`) }
      if (shoot) await (await p.$('#' + card)).screenshot({ path: `${shots}/x-${card}-${md}-last-${scheme}-${width}.png` });
      await audit(`${card} ${md}`);
    }
    await p.$eval(`#${seg} button[data-m="${modes[0][0]}"]`, e => e.click());
  }
  await audit('end');
  for (const t of ['t-ir', 't-cfg', 't-more']) { await p.click(`#tabs button[data-t="${t}"]`); await wait(300); await audit(t, t) }
  await p.click('#tabs button[data-t="t-read"]');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file);
  for (const [id] of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1400);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  for (const [card, ctl] of ANIMS) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1400);
    const r = await p.$eval(`#${ctl}-s`, e => e.value), t = await p.$eval(`#${ctl}-p`, e => e.textContent); if (r !== '0' || /Pause/.test(t)) problems.push(`reduced motion: ${card} moved by itself (${r}, ${t})`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
