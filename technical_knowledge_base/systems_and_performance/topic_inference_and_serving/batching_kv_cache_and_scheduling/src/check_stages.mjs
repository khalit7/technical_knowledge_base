// The 2026-11-06 rollout checks for Batching, KV cache and scheduling in depth (2026-11-12), adapted from Memory technology's check_stages.mjs:
// the five 3D stages (Fig. 1 one engine step, Fig. 2 static against continuous batching, Fig. 3 block tables over a block pool, Fig. 4 chunked
// prefill at three budgets, Fig. 5 admission and preemption) and the three 2D step animations (selective batching, paging, preemption rules)
// play by themselves once scrolled into view, step to their last step with one step-list item per step (in every mode), stop redrawing off
// screen and never move under reduced motion; the two long replays (eviction, two clients) are widgets that never play by themselves; no errors,
// NaN, undefined or sideways scroll; splits are two columns at 1400 px and one below 1100 px; scene labels do not overlap or leave the card at
// 1400 px; the numbers in the step lists equal the page's own simulator data (window.BKD.scn, BK_CB, BK_CK).
// usage (from the repo root): node technical_knowledge_base/systems_and_performance/topic_inference_and_serving/batching_kv_cache_and_scheduling/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = [['stg-hero', 'sx-hero'], ['stg-cb', 'sx-cb'], ['stg-pool', 'sx-pool'], ['stg-ck', 'sx-ck'], ['stg-pre', 'sx-pre']];
const ANIMS = [['bk-sb-card', 'bk-sb-ctl', 'sx-sb-sel', ['bk-sb-mode', [['can', 'sx-sb-can'], ['sel', 'sx-sb-sel']]]],
  ['bk-pg-card', 'bk-pg-ctl', 'sx-pg-con', ['bk-pg-mode', [['pag', 'sx-pg-pag'], ['con', 'sx-pg-con']]]],
  ['bk-pe-card', 'bk-pe-ctl', 'sx-pe-vllm', ['bk-pe-mode', [['sgl', 'sx-pe-sgl'], ['trt', 'sx-pe-trt'], ['vllm', 'sx-pe-vllm']]]]];
const WIDGETS = [['bk-ev-card', 'bk-ev-ctl'], ['bk-fa-card', 'bk-fa-ctl']];
const SPLITS = 20;
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
    const r = await p.evaluate(id => { const st = (window.BKSTG || {})[id]; if (!st) return null; const cv = st.host.querySelector('canvas'), cx = cv.getContext('2d'), W = cv.clientWidth, H = cv.clientHeight;
      const boxes = [], out = [];
      (st.R.lab || []).forEach(L => { if (L.a < .35) return; const o = L.o, fs = Math.max(12, o.fs || 12.5); cx.font = (o.b ? '600 ' : '') + fs + 'px ' + (o.mono ? 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace' : 'ui-sans-serif,-apple-system,"Segoe UI",Helvetica,Arial,sans-serif');
        const w = cx.measureText(L.text).width, x0 = o.al === 'right' ? L.x - w : o.al === 'left' ? L.x : L.x - w / 2; boxes.push([x0, L.y - fs / 2, x0 + w, L.y + fs / 2, L.text]);
        if (x0 < 3 || x0 + w > W - 3 || L.y - fs / 2 < 2 || L.y + fs / 2 > H - 2) out.push('outside or touching the card: ' + L.text) });
      for (let i = 0; i < boxes.length; i++)for (let j = i + 1; j < boxes.length; j++) { const A = boxes[i], B = boxes[j], ox = Math.min(A[2], B[2]) - Math.max(A[0], B[0]), oy = Math.min(A[3], B[3]) - Math.max(A[1], B[1]);
        if (ox > 2 && oy > 2) out.push(A[4] + ' / ' + B[4]) }
      return out }, id);
    if (r === null) { problems.push(`${tag}: ${id} is not registered in window.BKSTG`); return }
    r.forEach(x => problems.push(`${tag}: ${id} ${where}: labels overlap or leave the card: ${x}`));
  };
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (cols.length !== SPLITS || cols.some(c => c !== 'grid'))) problems.push(`${tag}: splits are not ${SPLITS} two-column grids (${cols.length}: ${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  if (width === 1400) {
    const over = await p.$$eval('#t-read .s3R', xs => xs.map(x => { const r = x.getBoundingClientRect(), k = x.firstElementChild && x.firstElementChild.getBoundingClientRect(); return k && r.width && (k.right > r.right + 1 || k.left < r.left - 1) ? x.innerHTML.slice(0, 40) : '' }).filter(Boolean));
    over.forEach(o => problems.push(`${tag}: right-column content wider than its column: ${o}`));
    // the step lists against the simulator's own numbers, recomputed here
    const r = await p.evaluate(() => { const out = [], txt = el => el.textContent.replace(/\s+/g, ' ').trim(), n = (x, d = 0) => x.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
      const need = (lid, k, x) => { const li = document.getElementById(lid).children[k]; if (!li || !txt(li).includes(x)) out.push(`${lid} item ${k + 1} lacks "${x}"`) };
      const D = window.BKD.scn, C = window.BK_CB, ST = D.cb.modes.static, CO = D.cb.modes.cont, sr = i => ST.reqs[i], pct = v => Math.round(v * 100) + '%';
      // Fig. 2
      need('sx-cb', 0, 'answers of ' + Math.min(...D.cb.O) + ' to ' + Math.max(...D.cb.O) + ' tokens');
      need('sx-cb', 1, 'longest (' + Math.max(...D.cb.P.slice(0, 4)) + ' tokens)'); need('sx-cb', 1, n(C.step0, 1) + ' ms'); need('sx-cb', 1, n(C.dstep, 2) + ' ms'); need('sx-cb', 1, n(sr(1).last, 2) + ' s');
      need('sx-cb', 2, 'R3 is done at ' + n(sr(2).last, 2) + ' s, R1 at ' + n(sr(0).last, 2) + ' s, R4 at ' + n(sr(3).last, 2) + ' s'); need('sx-cb', 2, pct(C.idle));
      need('sx-cb', 3, 'only at ' + n(sr(4).start, 2) + ' s'); need('sx-cb', 3, 'done at ' + n(C.static_span, 2) + ' s, ' + n(C.static_tps) + ' tokens per second'); need('sx-cb', 3, pct(C.static_use));
      need('sx-cb', 4, 'R3 leaves at ' + n(CO.reqs[2].last, 2) + ' s, R5'); if (CO.reqs[4].start !== CO.reqs[2].last || CO.reqs[4].seat !== CO.reqs[2].seat) out.push('Fig. 2: R5 does not take R3\'s seat');
      need('sx-cb', 5, 'done at ' + n(C.cont_span, 2) + ' s, ' + n(C.static_span - C.cont_span, 2) + ' s sooner'); need('sx-cb', 5, n(C.cont_tps) + ' tokens per second against ' + n(C.static_tps));
      need('sx-cb', 5, n(C.cont_mean, 2) + ' s against ' + n(C.static_mean, 2) + ' s'); need('sx-cb', 5, pct(C.cont_use) + ' of the time against ' + pct(C.static_use));
      // Fig. 3
      const P = D.pool, S = P.snaps, T = (k, q) => S[k].tab[q] || [];
      need('sx-pool', 0, P.reqs[0].P + '-token prompt'); need('sx-pool', 0, T(0, 0).length + ' blocks'); need('sx-pool', 0, '(' + (P.reqs[0].P - 16 * (T(0, 0).length - 1)) + ' of 16 slots)');
      need('sx-pool', 1, 'blocks ' + T(1, 1)[0] + ' and ' + T(1, 1)[1]); need('sx-pool', 1, T(1, 1)[2] + ' to ' + T(1, 1)[T(1, 1).length - 1]); need('sx-pool', 1, 'taken block ' + T(1, 0)[T(1, 0).length - 1]);
      if (S[1].ref[0] !== 2 || S[2].ref[0] !== 3) out.push('Fig. 3 holders ' + S[1].ref[0] + ' ' + S[2].ref[0]);
      need('sx-pool', 2, 'blocks ' + T(2, 2).slice(2).join(' and ')); need('sx-pool', 2, (P.reqs.length - 1) * P.sys + ' system-prompt tokens');
      need('sx-pool', 3, T(3, 0).join(', ')); need('sx-pool', 3, 'ends in ' + T(3, 1)[T(3, 1).length - 1]); need('sx-pool', 3, 'in ' + T(3, 2)[T(3, 2).length - 1]);
      const cf = S[4].ref.map((r, i) => r === 0 && S[4].key[i] ? i : -1).filter(i => i >= 0); need('sx-pool', 4, cf.slice(0, -1).join(', ') + ' and ' + cf[cf.length - 1]); if (S[4].ref[0] !== 2) out.push('Fig. 3 step 5 holders');
      need('sx-pool', 5, P.reqs[3].P + ' in all'); need('sx-pool', 5, P.hit[3] + ' tokens not recomputed'); need('sx-pool', 5, (P.reqs[3].P - P.hit[3]) + ' tokens are computed'); need('sx-pool', 5, 'blocks ' + T(5, 3).slice(-2).join(' and '));
      // Fig. 4
      const K = D.chunk.rows, ms = v => n(v * 1e3, 0) + ' ms';
      need('sx-ck', 0, n(K[0].steps[0][1] * 1e3, 1) + ' ms'); need('sx-ck', 2, ms(K[0].max_gap)); need('sx-ck', 2, ms(K[0].ttft));
      need('sx-ck', 3, n(K[1].chunks === 6 ? 2040 : 0) + ' tokens a step'); need('sx-ck', 3, 'sixth chunk ' + n(K[1].steps.filter(s => s[2] > 1).slice(-1)[0][2])); need('sx-ck', 3, ms(K[1].max_gap)); need('sx-ck', 3, ms(K[1].ttft));
      need('sx-ck', 4, K[2].chunks + ' chunks'); need('sx-ck', 4, n(K[2].steps.filter(s => s[2] > 1)[0][2]) + ' prompt tokens'); need('sx-ck', 4, ms(K[2].max_gap)); need('sx-ck', 4, ms(K[2].ttft));
      need('sx-ck', 5, n(K[0].max_gap / K[2].max_gap, 1) + ' times'); need('sx-ck', 5, n(K[2].ttft / K[0].ttft, 2) + ' times');
      if (K[1].steps.filter(s => s[2] > 1)[0][2] !== 2048 - 8) out.push('Fig. 4 chunk size');
      // Fig. 5
      const Q = D.pre, U = Q.snaps;
      need('sx-pre', 0, U[0].used + ' of the ' + Q.n + ' blocks'); need('sx-pre', 0, Q.reqs.slice(0, 3).map(r => r.P).join(', ').replace(/, (\d+)$/, ' and $1'));
      need('sx-pre', 1, U[1].used + ' of ' + Q.n); need('sx-pre', 2, U[2].used + ' of ' + Q.n); if (U[2].pre[0] !== 3) out.push('Fig. 5 first victim');
      need('sx-pre', 3, 'recomputes ' + U[3].rows[0][2] + ' tokens'); need('sx-pre', 3, U[3].used + ' of ' + Q.n); need('sx-pre', 3, n(Q.done[1], 2) + ' s');
      if (U[4].pre[0] !== 4 || U[5].pre[0] !== 3) out.push('Fig. 5 later victims'); need('sx-pre', 5, U[5].used + ' of ' + Q.n);
      need('sx-pre', 6, U[6].rows[0][1] + ' of its tokens'); need('sx-pre', 6, 'recomputes ' + U[6].rows[0][2]); need('sx-pre', 6, 'its ' + U[6].rows[1][2]); need('sx-pre', 6, Q.npre + ' preemptions'); need('sx-pre', 6, n(Q.done[2], 2) + ' s');
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
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); const v0 = await p.$eval(`#${ctl}-s`, e => e.value); await wait(1500);
    const r = await p.$eval(`#${ctl}-s`, e => [e.value, +e.max]), lab = await p.$eval(`#${ctl}-p`, e => e.getAttribute('aria-label'));
    if (lab !== 'Play' || r[0] !== v0 || +r[0] !== r[1]) problems.push(`${tag}: widget ${card} moved by itself or does not open on its last frame (${lab}, ${v0} -> ${r[0]} of ${r[1]})`);
  }
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  // the hero sits at the top: only it may keep redrawing (its flows) while the page is scrolled to the top
  if (d1.some((v, i) => i > 0 && v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
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
  const step2d = async (card, ctl, lid, label) => {
    await p.$eval(`#${ctl}-b`, e => e.click()); await p.evaluate(ctl => { const e = document.getElementById(ctl + '-s'); e.value = 0; e.dispatchEvent(new Event('input')) }, ctl);
    const n = await p.$eval(`#${ctl}-s`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length), vis = await p.$eval('#' + lid, e => !e.hidden);
    if (lis !== n || !vis) problems.push(`${tag}: ${card}${label} has ${n} steps but list ${lid} shows ${lis}${vis ? '' : ' (hidden)'}`);
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' }));
    for (let k = 1; k < n; k++) { await p.$eval(`#${ctl}-f`, e => e.click()); await wait(60);
      if (shoot && k === Math.floor(n / 2)) await (await p.$('#' + card)).screenshot({ path: `${shots}/x-${card}${label}-mid-${scheme}-${width}.png` }) }
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${card}${label} list does not mark the last step (${cur})`);
    await audit(`${card}${label} last step`);
  };
  for (const [card, ctl, lid, modes] of ANIMS) {
    await step2d(card, ctl, lid, '');
    for (const [m, ml] of modes[1]) {
      await p.$eval(`#${modes[0]} button[data-m="${m}"]`, e => e.click()); await wait(1600);
      const st = await p.$eval(`#${ctl}-s`, e => +e.value), lab = await p.$eval(`#${ctl}-p`, e => e.getAttribute('aria-label'));
      if (st > 1 || (lab !== 'Pause' && !(st === 0))) problems.push(`${tag}: ${card} mode ${m} did not restart (${st}, ${lab})`);
      const hid = await p.$eval('#' + card, (c, ml) => [...c.closest('.s3sp').querySelectorAll('ol.sx')].filter(o => !o.hidden).map(o => o.id), ml);
      if (hid.length !== 1 || hid[0] !== ml) problems.push(`${tag}: ${card} mode ${m} shows lists ${hid}`);
      await step2d(card, ctl, ml, '-' + m);
    }
  }
  // the widgets: every control, every option
  for (const [card, ctl] of WIDGETS) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' }));
    await p.evaluate(async card => { const c = document.getElementById(card), sl = ms => new Promise(r => setTimeout(r, ms));
      for (const btn of c.querySelectorAll('.seg button')) { btn.click(); await sl(20) }
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
  for (const [card, ctl] of ANIMS.concat(WIDGETS)) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1200);
    const r = await p.$eval(`#${ctl}-p`, e => e.getAttribute('aria-label')); if (r !== 'Play') problems.push(`reduced motion: ${card} played by itself`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
