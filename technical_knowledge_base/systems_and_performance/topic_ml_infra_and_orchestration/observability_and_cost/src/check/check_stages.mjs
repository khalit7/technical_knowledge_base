// The 2026-11-06 rollout checks for Observability and cost (2026-11-12), adapted from Fault tolerance at scale's check_stages.mjs:
// the three 3D stages (Fig. 1 SM grid and meters, Fig. 2 goodput slabs, Fig. 3 chargeback flows) play by themselves once scrolled into view,
// step to their last step with one step-list item per step, stop redrawing off screen and never move under reduced motion; the 2D hung-job
// animation (RD.anim in explained stretches, list sx-hb) plays once in view and its mode toggle swaps the list (sx-hb-base) and replays;
// the two long replays (seven situations, Cluster dashboard) are widgets that never play by themselves and open on their last frame;
// no errors, NaN, undefined or sideways scroll in any tab; splits are two columns at 1400 px and one below 1100 px; scene labels do not
// overlap or leave the card at 1400 px; the numbers in the step lists equal the page's own data (window.OC, OCM, OCP and the scenes' exports).
// usage (from the repo root): node technical_knowledge_base/systems_and_performance/topic_ml_infra_and_orchestration/observability_and_cost/src/check/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../../index.html'), shots = process.argv[2] || path.resolve(here, '../../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = [['stg-sm', 'sx-sm'], ['stg-gp', 'sx-gp'], ['stg-cb', 'sx-cb']];
const SPLITS = 10;
const WIDGETS = [['t-read', 'oc-me-card', 'oc-me-ctl'], ['t-dash', 'oc-db-card', 'oc-db-ctl']];
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
  // labels drawn in the canvas: boxes from the renderer's own label list, measured with the same font, must not overlap or leave the card
  const overlaps = async (id, where) => {
    if (width !== 1400) return;
    const r = await p.evaluate(id => { const st = (window.OCSTG || {})[id]; if (!st) return null; const cv = st.host.querySelector('canvas'), cx = cv.getContext('2d'), W = cv.clientWidth, H = cv.clientHeight;
      const boxes = [], out = [];
      (st.R.lab || []).forEach(L => { if (L.a < .35) return; const o = L.o, fs = Math.max(12, o.fs || 12.5); cx.font = (o.b ? '600 ' : '') + fs + 'px ' + (o.mono ? 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace' : 'ui-sans-serif,-apple-system,"Segoe UI",Helvetica,Arial,sans-serif');
        const w = cx.measureText(L.text).width, x0 = o.al === 'right' ? L.x - w : o.al === 'left' ? L.x : L.x - w / 2; boxes.push([x0, L.y - fs / 2, x0 + w, L.y + fs / 2, L.text]);
        if (x0 < 3 || x0 + w > W - 3 || L.y - fs / 2 < 2 || L.y + fs / 2 > H - 2) out.push('outside or touching the card: ' + L.text) });
      for (let i = 0; i < boxes.length; i++)for (let j = i + 1; j < boxes.length; j++) { const A = boxes[i], B = boxes[j], ox = Math.min(A[2], B[2]) - Math.max(A[0], B[0]), oy = Math.min(A[3], B[3]) - Math.max(A[1], B[1]);
        if (ox > 2 && oy > 2) out.push(A[4] + ' / ' + B[4]) }
      return out }, id);
    if (r === null) { problems.push(`${tag}: ${id} is not registered in window.OCSTG`); return }
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
      const D = window.OC, M = window.OCM, S = {}; D.scen.forEach(x => S[x.id] = x);
      // Fig. 1: readings from the definitions engine
      const rd = k => M.readings(M.CASES[k].bef), d2 = v => v.toFixed(2);
      need('sx-sm', 0, '132'); need('sx-sm', 0, '64');
      const g = rd('gemm'); need('sx-sm', 1, 'GPU util ' + Math.round(g.util * 100) + '%'); need('sx-sm', 1, 'SM activity ' + d2(g.act)); need('sx-sm', 1, 'tensor activity ' + d2(g.ten)); need('sx-sm', 1, '(' + d2(g.occ) + ')'); need('sx-sm', 1, Math.round(M.CASES.gemm.bef[0].dram * 100) + '% DRAM');
      const q = rd('grid'); need('sx-sm', 2, d2(q.act)); need('sx-sm', 2, 'tensor activity ' + d2(q.ten)); need('sx-sm', 2, M.CASES.grid.bef[0].g[0].n + ' thread blocks');
      const h = rd('hang'); need('sx-sm', 3, 'SM activity ' + d2(h.act)); need('sx-sm', 3, 'tensor activity ' + d2(h.ten)); need('sx-sm', 3, '(' + M.CASES.hang.bef[0].g[0].n + ' here)');
      const m = rd('mem'); need('sx-sm', 4, '(occupancy ' + d2(m.occ) + ')'); need('sx-sm', 4, 'SM activity ' + d2(m.act)); need('sx-sm', 4, 'tensor activity ' + d2(m.ten)); need('sx-sm', 4, Math.round(m.dram * 100) + '% of the time');
      if (![g, q, h, m].every(x => Math.abs(x.util - 1) < 1e-9)) out.push('Fig. 1: GPU util is not 100% in all four');
      // Fig. 2: the recorded runs and the planner's split
      const H = D.gp.find(x => x.run === 'oc-base'), U = D.gp.find(x => x.run === 'oc-hang'), G = window.OC_GP, f1 = v => v.toFixed(1) + ' s';
      need('sx-gp', 0, Math.round(H.alloc_s) + ' seconds'); need('sx-gp', 1, 'Start-up ' + f1(H.startup_s)); need('sx-gp', 1, 'kept ' + f1(H.saved_s)); need('sx-gp', 1, 'last step ' + f1(H.after_s));
      H.ckpt_s.forEach(([s, t]) => need('sx-gp', 1, t.toFixed(1))); need('sx-gp', 1, H.ckpt_s.length === 4 ? 'four checkpoints' : 'MISMATCH'); need('sx-gp', 1, Math.round(H.rg * 100) + '%');
      need('sx-gp', 2, Math.round(U.alloc_s) + ' s'); need('sx-gp', 2, 'Start-up ' + f1(U.startup_s)); need('sx-gp', 2, 'kept ' + f1(U.saved_s)); need('sx-gp', 2, f1(U.ckpt_s[0][1]) + ' in'); need('sx-gp', 2, 'lost ' + f1(U.wasted_s)); need('sx-gp', 2, f1(U.after_s));
      need('sx-gp', 3, Math.round(H.rg * 100) + '%'); need('sx-gp', 3, Math.round(U.rg * 100) + '%');
      const pc = v => (v * 100).toFixed(1) + '%'; need('sx-gp', 4, G.gpus.toLocaleString('en-US') + ' H100s'); need('sx-gp', 4, pc(G.goodput)); need('sx-gp', 4, pc(G.ck)); need('sx-gp', 4, pc(G.rw)); need('sx-gp', 4, pc(G.rs));
      need('sx-gp', 4, 'every ' + G.tau + ' minutes'); need('sx-gp', 4, 'every ' + G.mtbf_h.toFixed(1) + ' hours');
      if (Math.abs(G.goodput + G.ck + G.rw + G.rs - 1) > 1e-9) out.push('Fig. 2: the planner split does not sum to 1');
      // Fig. 3: the Slurm accounting
      const C = window.OC_CB; need('sx-cb', 1, '= ' + C.a + ' for 131'); need('sx-cb', 1, '= ' + C.b + ' for 132'); need('sx-cb', 2, Math.round(C.wait) + ' s'); need('sx-cb', 3, '= ' + C.c + ' GPU-seconds');
      need('sx-cb', 4, 'teama ' + C.teama); need('sx-cb', 4, 'teamb ' + C.teamb); need('sx-cb', 5, '$' + C.price.toFixed(2)); need('sx-cb', 5, '$' + C.usd_a.toFixed(2)); need('sx-cb', 5, '$' + C.usd_b.toFixed(2));
      const bs = D.sacct.map(j => j.billing * j.el).join(', '); need('sx-cb', 5, bs.replace(/, (\d+)$/, ' and $1'));
      // the hung-job stretches: alert and timeout times from the recording
      const fire = (x, n) => x.alerts.find(a => a[0] === n && a[2] === 'firing')[3], mk = (x, re) => x.marks.find(m => re.test(m[2]))[0], hz = mk(S.hang, /sigstop/);
      need('sx-hb', 2, Math.round(fire(S.hang, 'TrainingStalled') - hz) + ' s after a rank froze'); need('sx-hb', 3, Math.round(fire(S.hang, 'GpusHeldNoProgress') - hz) + ' s after the freeze');
      need('sx-hb', 4, Math.round(mk(S.hang, /terminal/) - hz) + ' s after the freeze'); need('sx-hb-base', 2, Math.round(S.base.marks[1][0] - S.base.marks[0][0]) + ' s after submission');
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  // every stage plays once scrolled into view
  for (const [id] of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
    if (shoot) { await wait(300); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-autoplay-${scheme}-${width}.png` }) }
  }
  // the 2D hung-job animation plays once in view, its list has one item per stretch, and the mode toggle swaps the list and replays
  { await p.$eval('#oc-rd-hb', e => e.scrollIntoView({ block: 'center' })); await wait(1800);
    if (await p.$eval('#oc-rd-hb-ctl-p', e => e.getAttribute('aria-label')) !== 'Pause') problems.push(`${tag}: the hung-job animation did not play when scrolled into view`);
    for (const [m, lid] of [['hang', 'sx-hb'], ['base', 'sx-hb-base'], ['hang', 'sx-hb']]) {
      if (m !== 'hang' || lid !== 'sx-hb' || (await p.$eval('#sx-hb', e => e.hidden))) { await p.$eval(`#oc-rd-hb-m button[data-m="${m}"]`, e => e.click()); await wait(1500);
        const rr = await p.evaluate(lid => [document.getElementById('oc-rd-hb-ctl-p').getAttribute('aria-label'), document.getElementById(lid).hidden], lid);
        if (rr[0] !== 'Pause' || rr[1]) problems.push(`${tag}: hb mode ${m} did not swap its list and replay (${rr})`) }
      const n = await p.$eval('#oc-rd-hb-ctl-s', e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length); if (n !== lis) problems.push(`${tag}: hb ${m} has ${n} steps, list ${lis}`);
      await p.$eval('#oc-rd-hb-ctl-b', e => e.click()); for (let k = 1; k < n; k++) { await p.$eval('#oc-rd-hb-ctl-f', e => e.click()); if (shoot && k === 2) { await wait(900); await (await p.$('#oc-rd-hb')).screenshot({ path: `${shots}/x-hb-${m}-midstretch-${scheme}-${width}.png` }) } }
      await wait(2600);
      if ((await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')))) !== n - 1) problems.push(`${tag}: hb ${m} list does not mark the last step`);
      if (shoot) await (await p.$('#oc-rd-hb')).screenshot({ path: `${shots}/x-hb-${m}-last-${scheme}-${width}.png` });
    }
  }
  // the long replays are widgets: they never play by themselves and open on their last frame
  for (const [tab, card, ctl] of WIDGETS) {
    await p.click(`#tabs button[data-t="${tab}"]`); await wait(300);
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const w = await p.evaluate(c => [document.getElementById(c + '-p').getAttribute('aria-label'), +document.getElementById(c + '-s').value, +document.getElementById(c + '-s').max], ctl);
    if (w[0] !== 'Play' || w[1] !== w[2]) problems.push(`${tag}: ${card} played by itself or did not open on its last frame (${w})`);
    if (shoot) await (await p.$('#' + card)).screenshot({ path: `${shots}/x-${card}-${scheme}-${width}.png` });
    if (tab !== 't-read') { await audit(tab, tab); await p.click('#tabs button[data-t="t-read"]'); await wait(300) }
  }
  // off screen: the end of the Reading tab, far from every stage
  await p.evaluate(() => window.scrollTo(0, document.getElementById('t-read').getBoundingClientRect().bottom + scrollY - innerHeight)); await wait(800);
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
        await wait(1300); await overlaps(id, `step ${k + 1}`); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}-${scheme}-${width}.png` })
      } else await wait(200);
    }
    await wait(1900);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
    await audit(`${id} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id} list does not mark the last step`);
  };
  for (const [id, lid] of STAGES) await stepAll(id, lid);
  await audit('end');
  for (const t of ['t-cap', 't-more']) { await p.click(`#tabs button[data-t="${t}"]`); await wait(300); await audit(t, t) }
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
  await p.$eval('#oc-rd-hb', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
  const hb = await p.evaluate(() => [document.getElementById('oc-rd-hb-ctl-p').getAttribute('aria-label'), +document.getElementById('oc-rd-hb-ctl-s').value]); if (hb[0] !== 'Play' || hb[1] !== 0) problems.push(`reduced motion: the hung-job animation moved by itself (${hb})`);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
