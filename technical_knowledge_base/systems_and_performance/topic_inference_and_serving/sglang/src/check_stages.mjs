// The 2026-11-06 rollout checks for the SGLang page (2026-11-12), adapted from Batching, KV cache and scheduling's check_stages.mjs:
// the three 3D stages (Fig. 1 one request through a deployment, Fig. 2 eight requests through a radix tree, Fig. 3 fcfs against lpm
// round by round) and the overlap animation (two modes) play by themselves once scrolled into view, step to their last step with one
// step-list item per step, stop redrawing off screen and never move under reduced motion; the two widgets (tree against blocks, the
// policy widget) never play by themselves and open on their last frame and on round 1; no errors, NaN, undefined or sideways scroll;
// splits are two columns at 1400 px and one below 1100 px; scene labels do not overlap or leave the card at 1400 px; the numbers in the
// step lists equal the page's own radix cache and scheduling model (window.SGTOY, window.SG_SCHED_SCENE) and the overlap counters.
// usage (from the repo root): node technical_knowledge_base/systems_and_performance/topic_inference_and_serving/sglang/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = [['stg-hero', 'sx-hero'], ['stg-tree', 'sx-tree'], ['stg-sched', 'sx-sched']];
const ANIMS = [['sg-ovl-card', 'sg-ovl-ctl', 'sx-ovl-normal', ['sg-ovl-mode', [['overlap', 'sx-ovl-overlap'], ['normal', 'sx-ovl-normal']]]]];
const WIDGETS = [['sg-tree-card', 'sg-tree-ctl', 'last'], ['sgs-anim-card', 'sgs-ctl', 1]];
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
      return { bad: (c.innerText.match(/.{0,30}(?<![-\w])(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } }, tab);
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  const overlaps = async (id, where) => {
    if (width !== 1400) return;
    const r = await p.evaluate(id => { const st = (window.SGSTG || {})[id]; if (!st) return null; const cv = st.host.querySelector('canvas'), cx = cv.getContext('2d'), W = cv.clientWidth, H = cv.clientHeight;
      const boxes = [], out = [];
      (st.R.lab || []).forEach(L => { if (L.a < .35) return; const o = L.o, fs = Math.max(12, o.fs || 12.5); cx.font = (o.b ? '600 ' : '') + fs + 'px ' + (o.mono ? 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace' : 'ui-sans-serif,-apple-system,"Segoe UI",Helvetica,Arial,sans-serif');
        const w = cx.measureText(L.text).width, x0 = o.al === 'right' ? L.x - w : o.al === 'left' ? L.x : L.x - w / 2; boxes.push([x0, L.y - fs / 2, x0 + w, L.y + fs / 2, L.text]);
        if (x0 < 3 || x0 + w > W - 3 || L.y - fs / 2 < 2 || L.y + fs / 2 > H - 2) out.push('outside or touching the card: ' + L.text) });
      for (let i = 0; i < boxes.length; i++)for (let j = i + 1; j < boxes.length; j++) { const A = boxes[i], B = boxes[j], ox = Math.min(A[2], B[2]) - Math.max(A[0], B[0]), oy = Math.min(A[3], B[3]) - Math.max(A[1], B[1]);
        if (ox > 2 && oy > 2) out.push(A[4] + ' / ' + B[4]) }
      return out }, id);
    if (r === null) { problems.push(`${tag}: ${id} is not registered in window.SGSTG`); return }
    r.forEach(x => problems.push(`${tag}: ${id} ${where}: labels overlap or leave the card: ${x}`));
  };
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (cols.length !== SPLITS || cols.some(c => c !== 'grid'))) problems.push(`${tag}: splits are not ${SPLITS} two-column grids (${cols.length}: ${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  if (width === 1400) {
    const over = await p.$$eval('#t-read .s3R', xs => xs.map(x => { const r = x.getBoundingClientRect(), k = x.firstElementChild && x.firstElementChild.getBoundingClientRect(); return k && r.width && (k.right > r.right + 1 || k.left < r.left - 1) ? x.innerHTML.slice(0, 40) : '' }).filter(Boolean));
    over.forEach(o => problems.push(`${tag}: right-column content wider than its column: ${o}`));
    // the step lists against the page's own radix cache and scheduling model, recomputed here
    const r = await p.evaluate(() => { const out = [], txt = el => el.textContent.replace(/\s+/g, ' ').trim(), n = v => Math.round(v).toLocaleString('en-US');
      const need = (lid, k, x) => { const li = document.getElementById(lid).children[k]; if (!li || !txt(li).includes(x)) out.push(`${lid} item ${k + 1} lacks "${x}"`) };
      const T = window.SGTOY, Q = T.reqs, C = T.CAP, held = r => r.after.owner.filter(v => v >= 0).length, of = r => r.hit + ' of ' + r.P;
      // Fig. 1: customer B
      need('sx-hero', 1, Q[1].P + ' for this prompt'); need('sx-hero', 2, Q[1].hit + ' of its ' + Q[1].P + ' are cached');
      need('sx-hero', 3, 'reads the ' + Q[1].hit + ' cached'); need('sx-hero', 3, 'only the ' + (Q[1].P - Q[1].hit) + ' new ones');
      // Fig. 2
      need('sx-tree', 0, Q[0].P + '-token prompt'); need('sx-tree', 0, held(Q[0]) + ' of ' + C); if (Q[0].hit !== 0) out.push('Fig. 2 R1 hit');
      need('sx-tree', 1, Q[1].hit + '-token system prompt'); need('sx-tree', 1, (Q[1].P - Q[1].hit) + ' new tokens'); need('sx-tree', 1, held(Q[1]) + ' of ' + C);
      need('sx-tree', 2, of(Q[2]) + ' prompt tokens'); need('sx-tree', 2, held(Q[2]) + ' of ' + C);
      const need4 = (Q[3].P - Q[3].hit) + (Q[3].O - 1), free4 = C - held(Q[2]);
      need('sx-tree', 3, '(' + Q[3].hit + ' tokens)'); need('sx-tree', 3, 'needs ' + need4 + ' slots and ' + free4 + ' are free');
      const evt = (i, j) => Q[i - 1].after.nodes.concat(Q[i].mid.nodes).find(x => x.id === Q[i].evicted[j].id).text;
      need('sx-tree', 3, '"' + evt(3, 0) + '" (' + Q[3].evicted[0].len + ' tokens)'); if (Q[3].evicted.length !== 1) out.push('Fig. 2 R4 evictions');
      need('sx-tree', 3, held(Q[3]) + ' of ' + C);
      need('sx-tree', 4, 'C matches ' + Q[4].hit + ' tokens'); need('sx-tree', 4, '(' + Q[4].evicted[0].len + ' tokens) and A\'s "' + evt(4, 1) + '" (' + Q[4].evicted[1].len + ')'); need('sx-tree', 4, 'by evicting "' + evt(5, 0) + '"');
      need('sx-tree', 4, 'reuses ' + of(Q[5]) + ' tokens'); need('sx-tree', 4, 'reserved ' + Q[5].ev + ' slots'); need('sx-tree', 4, held(Q[5]) + ' of ' + C);
      need('sx-tree', 5, 'reuses ' + of(Q[6]) + ' tokens'); need('sx-tree', 5, 'E reuses ' + Q[7].hit); need('sx-tree', 5, '"' + evt(7, 0) + '" is evicted'); if (Q[7].evicted.length !== 1) out.push('Fig. 2 R8 evictions');
      const H = Q.reduce((s, r) => s + r.hit, 0), PP = Q.reduce((s, r) => s + r.P, 0);
      need('sx-tree', 6, Q[7].nodes + ' nodes'); need('sx-tree', 6, H + ' of ' + PP + ' prompt tokens (' + Math.round(100 * H / PP) + '%)');
      // Fig. 3
      const S = window.SG_SCHED_SCENE, F = S.RUN.fcfs, L = S.RUN.lpm, pct = r => Math.round(100 * r.hit_tokens / r.prompt_tokens) + '%';
      need('sx-sched', 0, 'same ' + S.NQ + ' questions');
      need('sx-sched', 2, n(L.rounds[1].hit) + ' tokens reused'); if (F.rounds[1].hit !== 0) out.push('Fig. 3 fcfs round 2 reuses');
      need('sx-sched', 3, n(L.rounds[2].hit) + ' tokens reused, ' + n(L.rounds[2].prefill) + ' computed'); need('sx-sched', 3, '(' + n(F.rounds[2].hit) + ' tokens)');
      if (L.rounds.length !== 3 || F.rounds.length !== 4) out.push('Fig. 3 round counts');
      need('sx-sched', 4, '(' + n(F.rounds[3].hit) + ' tokens)');
      need('sx-sched', 5, 'fcfs: ' + F.rounds.length + ' rounds, ' + n(F.hit_tokens) + ' of ' + n(F.prompt_tokens) + ' prompt tokens reused (' + pct(F) + '), ' + n(F.prefill_tokens) + ' computed');
      need('sx-sched', 5, 'lpm: ' + L.rounds.length + ' rounds, ' + n(L.hit_tokens) + ' reused (' + pct(L) + '), ' + n(L.prefill_tokens) + ' computed: ' + n(F.prefill_tokens - L.prefill_tokens) + ' fewer');
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  // every stage and the overlap animation play once scrolled into view; the widgets do not move
  for (const [id] of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
    if (shoot) { await wait(300); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-autoplay-${scheme}-${width}.png` }) }
  }
  for (const [card, ctl] of ANIMS) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const lab = await p.$eval(`#${ctl}-p`, e => e.getAttribute('aria-label')); if (lab !== 'Pause') problems.push(`${tag}: ${card} did not play when scrolled into view`);
  }
  for (const [card, ctl, open] of WIDGETS) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); const v0 = await p.$eval(`#${ctl}-s`, e => e.value); await wait(1500);
    const r = await p.$eval(`#${ctl}-s`, e => [e.value, +e.max]), lab = await p.$eval(`#${ctl}-p`, e => e.getAttribute('aria-label')), want = open === 'last' ? r[1] : open;
    if (lab !== 'Play' || r[0] !== v0 || +r[0] !== want) problems.push(`${tag}: widget ${card} moved by itself or does not open on step ${want} (${lab}, ${v0} -> ${r[0]} of ${r[1]})`);
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
  const step2d = async (card, ctl, lid, label) => {
    await p.$eval(`#${ctl}-b`, e => e.click()); await p.evaluate(ctl => { const e = document.getElementById(ctl + '-s'); e.value = 0; e.dispatchEvent(new Event('input')) }, ctl);
    const n = await p.$eval(`#${ctl}-s`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length), vis = await p.$eval('#' + lid, e => !e.hidden);
    if (lis !== n || !vis) problems.push(`${tag}: ${card}${label} has ${n} steps but list ${lid} shows ${lis}${vis ? '' : ' (hidden)'}`);
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' }));
    for (let k = 1; k < n; k++) { await p.$eval(`#${ctl}-f`, e => e.click()); await wait(60);
      if (shoot && k === Math.floor(n / 2)) await (await p.$('#' + card)).screenshot({ path: `${shots}/x-${card}${label}-mid-${scheme}-${width}.png` }) }
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${card}${label} list does not mark the last step (${cur})`);
    // the last frame's counters carry the numbers the list's last item states
    const cnt = await p.$eval('#sg-ovl-cnt', e => e.textContent.replace(/\s+/g, ' ')), last = await p.$eval('#' + lid, e => e.lastElementChild.textContent);
    const ms = (cnt.match(/Elapsed\s*([\d.]+) ms/) || [])[1], busy = (cnt.match(/GPU busy\s*(\d+)%/) || [])[1];
    if (!ms || !last.includes(ms + ' ms') && !last.includes('take ' + ms) || !busy || !last.includes(busy + '%')) problems.push(`${tag}: ${lid} last item does not match the counters (${ms} ms, ${busy}%)`);
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
