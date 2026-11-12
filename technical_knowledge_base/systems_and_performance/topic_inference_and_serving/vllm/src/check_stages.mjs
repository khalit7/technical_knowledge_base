// The 2026-11-06 rollout checks for the vLLM page (2026-11-12), adapted from the SGLang page's check_stages.mjs:
// the three 3D stages (Fig. 1 one request through vLLM, Fig. 2 one recorded engine step, Fig. 3 the free queue in test_evict) and the two
// 2D animations (the request path; sync against async scheduling, two modes) play by themselves once scrolled into view, step to their
// last step with one step-list item per step, stop redrawing off screen and never move under reduced motion; the recorded stepper (a widget)
// never plays by itself and opens on its informative step; no errors, NaN, undefined or sideways scroll; the splits are two columns at
// 1400 px and one below 1100 px; scene labels do not overlap or leave the card at 1400 px; the numbers in the step lists equal the recording
// (window.VL_STEP, through window.VLS), the free-queue model (window.VLFQ, whose steps 4 and 5 must equal test_evict's assertions) and the
// async animation's counters.
// usage (from the repo root): node technical_knowledge_base/systems_and_performance/topic_inference_and_serving/vllm/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = [['stg-hero', 'sx-hero'], ['stg-step', 'sx-step'], ['stg-fq', 'sx-fq']];
const ANIMS = [['vl-path-card', 'vl-path-ctl', 'sx-path', null, null],
  ['vl-async-card', 'vl-async-ctl', 'sx-async-sync', ['vl-async-seg', [['async', 'sx-async-async'], ['sync', 'sx-async-sync']]], 'async']];
const WIDGETS = [['vl-st-card', 'vl-st-ctl']];
const SPLITS = 13;
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
    const r = await p.evaluate(id => { const st = (window.VLSTG || {})[id]; if (!st) return null; const cv = st.host.querySelector('canvas'), cx = cv.getContext('2d'), W = cv.clientWidth, H = cv.clientHeight;
      const boxes = [], out = [];
      (st.R.lab || []).forEach(L => { if (L.a < .35) return; const o = L.o, fs = Math.max(12, o.fs || 12.5); cx.font = (o.b ? '600 ' : '') + fs + 'px ' + (o.mono ? 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace' : 'ui-sans-serif,-apple-system,"Segoe UI",Helvetica,Arial,sans-serif');
        const w = cx.measureText(L.text).width, x0 = o.al === 'right' ? L.x - w : o.al === 'left' ? L.x : L.x - w / 2; boxes.push([x0, L.y - fs / 2, x0 + w, L.y + fs / 2, L.text]);
        if (x0 < 3 || x0 + w > W - 3 || L.y - fs / 2 < 2 || L.y + fs / 2 > H - 2) out.push('outside or touching the card: ' + L.text) });
      for (let i = 0; i < boxes.length; i++)for (let j = i + 1; j < boxes.length; j++) { const A = boxes[i], B = boxes[j], ox = Math.min(A[2], B[2]) - Math.max(A[0], B[0]), oy = Math.min(A[3], B[3]) - Math.max(A[1], B[1]);
        if (ox > 2 && oy > 2) out.push(A[4] + ' / ' + B[4]) }
      return out }, id);
    if (r === null) { problems.push(`${tag}: ${id} is not registered in window.VLSTG`); return }
    r.forEach(x => problems.push(`${tag}: ${id} ${where}: labels overlap or leave the card: ${x}`));
  };
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (cols.length !== SPLITS || cols.some(c => c !== 'grid'))) problems.push(`${tag}: splits are not ${SPLITS} two-column grids (${cols.length}: ${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  if (width === 1400) {
    const over = await p.$$eval('#t-read .s3R', xs => xs.map(x => { const r = x.getBoundingClientRect(), k = x.firstElementChild && x.firstElementChild.getBoundingClientRect(); return k && r.width && (k.right > r.right + 1 || k.left < r.left - 1) ? x.innerHTML.slice(0, 40) : '' }).filter(Boolean));
    over.forEach(o => problems.push(`${tag}: right-column content wider than its column: ${o}`));
    // the step lists against the recording and the free-queue model, recomputed here
    const r = await p.evaluate(() => { const out = [], txt = el => el.textContent.replace(/\s+/g, ' ').trim();
      const need = (lid, k, x) => { const li = document.getElementById(lid).children[k]; if (!li || !txt(li).includes(x)) out.push(`${lid} item ${k + 1} lacks "${x}"`) };
      const D = window.VL_STEP, run = key => D.runs.find(r => r.key === key), H = VLS.hero, T = VLS.step, and = a => a.length > 1 ? a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1] : String(a[0]);
      // Fig. 1: customer C, prefix caching on
      need('sx-hero', 0, H.np + ' token ids');
      need('sx-hero', 2, 'C ' + H.tok.C); need('sx-hero', 2, H.used + ' of the ' + H.budget + '-token budget'); need('sx-hero', 2, 'step ' + (H.step + 1));
      if (H.others.join() !== 'A,B' || H.others.some(q => H.tok[q] !== 1 || H.kind[q] !== 'decode')) out.push('Fig. 1: A and B are not the two decodes of 1 token');
      need('sx-hero', 3, H.hitBlocks.length + ' blocks (' + H.hit + ' tokens)'); need('sx-hero', 3, 'blocks ' + and(H.newBlocks));
      if (H.shared.some(c => c !== 3)) out.push('Fig. 1: the cached blocks are not shared by three requests');
      need('sx-hero', 4, H.used + ' tokens'); if (!H.firstToken) out.push('Fig. 1: C does not get its first token in its admission step');
      need('sx-hero', 5, 'step ' + (H.finish + 1)); need('sx-hero', 5, H.answer);
      const unh = H.freed.filter(x => !H.freedHashed.includes(x));
      if (unh.length !== 1 || H.freedHashed.length !== 1) out.push('Fig. 1: freed blocks are not one hashed and one unhashed');
      need('sx-hero', 5, 'block ' + unh[0] + ', partial and unhashed, to the front'); need('sx-hero', 5, 'block ' + H.freedHashed[0] + ', full and hashed, to the back');
      if (H.freeFin[0] !== unh[0] || H.freeFin[H.freeFin.length - 1] !== H.freedHashed[0]) out.push('Fig. 1: the free queue at the finish does not have the freed blocks at its ends');
      // Fig. 2: the step that admits C, prefix caching off
      const B = T.before, off = run('pc_off');
      need('sx-step', 0, B.A.done + ' of its ' + B.A.len + ' tokens'); need('sx-step', 0, B.B.done + ' of its ' + B.B.len + '-token prompt'); need('sx-step', 0, '(it needs ' + (B.B.len - B.B.done) + ')');
      need('sx-step', 0, B.C.len + ' tokens and none computed'); if (B.C.done !== 0 || B.A.len - B.A.done !== 1) out.push('Fig. 2: A does not need 1 or C has computed tokens');
      if (T.step !== off.steps.findIndex(s => s.ev.some(e => e[0] === 'admit' && e[1] === 'C')) || T.step !== 3) out.push('Fig. 2: not step 4');
      const bNew = T.alloc.filter(id => T.blocks.B.includes(id)), cNew = T.alloc.filter(id => T.blocks.C.includes(id));
      need('sx-step', 1, 'A gets ' + T.tok.A + ' token, B ' + T.tok.B + ' and block ' + bNew.join(', ')); need('sx-step', 1, (T.tok.A + T.tok.B) + ' of ' + T.budget);
      need('sx-step', 2, (T.freeBefore - bNew.length) + ' free blocks'); need('sx-step', 2, T.tok.C + ' tokens'); need('sx-step', 2, 'blocks ' + and(cNew)); need('sx-step', 2, T.maxSeqs + ' here');
      need('sx-step', 2, '(' + Math.ceil(B.C.len / T.bs) + ' blocks)');
      if (T.tok.A + T.tok.B + T.tok.C !== T.budget) out.push('Fig. 2: the step does not fill the budget');
      need('sx-step', 3, T.budget + ' tokens'); need('sx-step', 3, "A's " + T.tok.A + ", B's " + T.tok.B + " and C's " + T.tok.C);
      const kv = q => { const s = new Set(); for (let x = B[q].done; x < B[q].done + T.tok[q]; x++)s.add(T.blocks[q][Math.floor(x / T.bs)]); return [...s] }, nm = a => (a.length > 1 ? 'blocks ' : 'block ') + and(a);
      need('sx-step', 4, "A's " + nm(kv('A')) + ", B's " + nm(kv('B')) + ", C's " + nm(kv('C')));
      if (T.out.A !== 1 || T.out.B !== 1 || T.out.C !== 0) out.push('Fig. 2: outputs are not A 1, B 1, C 0');
      const n1 = off.steps[T.step + 1].tok.C, n2 = off.steps[T.step + 2].tok.C;
      need('sx-step', 5, n1 + ', then ' + n2 + ' tokens'); if (T.tok.C + n1 + n2 !== B.C.len) out.push('Fig. 2: C does not finish its prompt in the next two steps');
      // Fig. 3: the free-queue model against test_evict's assertions
      const F = window.VLFQ, j = a => a.join(', ');
      if (j(F[3]) !== '6, 10, 5, 4, 3, 2, 1' || j(F[4]) !== '6, 10, 5, 4, 3, 2, 1, 9, 8, 7') out.push('Fig. 3: the model does not reproduce test_evict (' + j(F[3]) + ' / ' + j(F[4]) + ')');
      need('sx-fq', 1, 'leaving ' + j(F[1]) + ' alone'); [3, 4, 5, 6].forEach(k => need('sx-fq', k, j(F[k])));
      if (document.getElementById('sx-fq').children.length !== F.length) out.push('Fig. 3: list and model step counts differ');
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  // every stage and 2D animation plays once scrolled into view; the widget does not move
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
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); const v0 = await p.$eval(`#${ctl}-s`, e => e.value); await wait(1500);
    const r = await p.$eval(`#${ctl}-s`, e => e.value), lab = await p.$eval(`#${ctl}-p`, e => e.getAttribute('aria-label'));
    const want = await p.evaluate(() => { const r = window.VL_STEP.runs.find(x => x.key === 'pc_on'); return r.steps.findIndex(s => s.ev.some(e => e[0] === 'admit' && e[1] === 'A2')) });
    if (lab !== 'Play' || r !== v0 || +r !== want) problems.push(`${tag}: widget ${card} moved by itself or does not open on step ${want + 1} (${lab}, ${v0} -> ${r})`);
  }
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  const stepAll = async (id, lid) => {
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length);
    if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but list ${lid} shows ${lis}`);
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' }));
    for (let k = 0; k < n; k++) {
      if (k) await p.$eval(`#${id}-f`, e => e.click());
      if (shoot) {
        await wait(750); await overlaps(id, `step ${k + 1} mid-tween`); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}-midtween-${scheme}-${width}.png` });
        await wait(1500); await overlaps(id, `step ${k + 1}`); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}-${scheme}-${width}.png` })
      } else await wait(200);
    }
    await wait(2300);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
    await audit(`${id} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id} list does not mark the last step`);
  };
  for (const [id, lid] of STAGES) await stepAll(id, lid);
  const step2d = async (card, ctl, lid, label, counters) => {
    await p.$eval(`#${ctl}-b`, e => e.click()); await p.evaluate(ctl => { const e = document.getElementById(ctl + '-s'); e.value = 0; e.dispatchEvent(new Event('input')) }, ctl);
    const n = await p.$eval(`#${ctl}-s`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length), vis = await p.$eval('#' + lid, e => !e.hidden);
    if (lis !== n || !vis) problems.push(`${tag}: ${card}${label} has ${n} steps but list ${lid} shows ${lis}${vis ? '' : ' (hidden)'}`);
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' }));
    for (let k = 1; k < n; k++) { await p.$eval(`#${ctl}-f`, e => e.click()); await wait(60);
      if (shoot && k === Math.floor(n / 2)) await (await p.$('#' + card)).screenshot({ path: `${shots}/x-${card}${label}-mid-${scheme}-${width}.png` }) }
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${card}${label} list does not mark the last step (${cur})`);
    if (counters) { // the last frame's counters carry the numbers the list's last item states
      const cnt = await p.$eval('#vl-async-cnt', e => e.textContent.replace(/\s+/g, ' ')), last = await p.$eval('#' + lid, e => e.lastElementChild.textContent);
      const ms = (cnt.match(/Time\s*(\d+) ms/) || [])[1], busy = (cnt.match(/GPU busy\s*(\d+)%/) || [])[1];
      if (!ms || !last.includes(ms + ' ms') || !busy || !last.includes(busy + '%')) problems.push(`${tag}: ${lid} last item does not match the counters (${ms} ms, ${busy}%)`);
    }
    await audit(`${card}${label} last step`);
  };
  for (const [card, ctl, lid, modes, counters] of ANIMS) {
    await step2d(card, ctl, lid, '', counters);
    if (!modes) continue;
    for (const [m, ml] of modes[1]) {
      await p.$eval(`#${modes[0]} button[data-m="${m}"]`, e => e.click()); await wait(1600);
      const st = await p.$eval(`#${ctl}-s`, e => +e.value), lab = await p.$eval(`#${ctl}-p`, e => e.getAttribute('aria-label'));
      if (st > 1 || (lab !== 'Pause' && !(st === 0))) problems.push(`${tag}: ${card} mode ${m} did not restart (${st}, ${lab})`);
      const hid = await p.$eval('#' + card, c => [...c.closest('.s3sp').querySelectorAll('ol.sx')].filter(o => !o.hidden).map(o => o.id));
      if (hid.length !== 1 || hid[0] !== ml) problems.push(`${tag}: ${card} mode ${m} shows lists ${hid}`);
      await step2d(card, ctl, ml, '-' + m, counters);
    }
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
  for (const [card, ctl] of ANIMS.concat(WIDGETS)) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); const v0 = await p.$eval(`#${ctl}-s`, e => e.value); await wait(1200);
    const r = await p.$eval(`#${ctl}-p`, e => e.getAttribute('aria-label')), v1 = await p.$eval(`#${ctl}-s`, e => e.value); if (r !== 'Play' || v1 !== v0) problems.push(`reduced motion: ${card} played by itself`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
