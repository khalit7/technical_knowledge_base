// The 2026-11-06 rollout checks for Fault tolerance at scale (2026-11-12), adapted from Cluster anatomy's check_stages.mjs:
// the three 3D stages (Fig. 1 checkpoint strategies, Fig. 2 elastic torchrun, Fig. 3 one flipped bit) play by themselves once scrolled into view,
// step to their last step with one step-list item per step, stop redrawing off screen and never move under reduced motion; Fig. 3's chips swap
// the step list and replay; the 2D recovery animation (RD.anim, list sx-rc) plays once in view; the three long replays (checkpoint run, elastic
// run, straggler replay) are widgets that never play by themselves and open on their informative frame; no errors, NaN, undefined or sideways
// scroll in any tab; splits are two columns at 1400 px and one below 1100 px; scene labels do not overlap or leave the card at 1400 px; the
// numbers in the step lists equal the page's own data (window.FT and the scenes' FT_CK, FT_EL).
// usage (from the repo root): node technical_knowledge_base/systems_and_performance/topic_ml_infra_and_orchestration/fault_tolerance_at_scale/src/check/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../../index.html'), shots = process.argv[2] || path.resolve(here, '../../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = [['stg-ck', 'sx-ck'], ['stg-el', 'sx-el'], ['stg-sdc', 'sx-sdc-grad', ['sd-kind', [['w', 'sx-sdc-w'], ['grad', 'sx-sdc-grad']]]]];
const SPLITS = 17, TAX_SPLITS = 1;
const WIDGETS = [['fl-ck-card', 'fl-ck-ctl', 'last'], ['fl-el-card', 'fl-el-ctl', 'last'], ['st-anim-card', 'st-anim-ctl', 76]];
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
    // prose discusses NaN losses, so only a NaN in a number's place counts
    const r = await p.evaluate(tab => { const c = document.getElementById(tab).cloneNode(true); c.querySelectorAll('pre,code').forEach(x => x.remove()); const T0 = c.innerText.replace(/\d+ NaN incidents/g, '');
      return { bad: (T0.match(/.{0,30}(\d\s?NaN|NaN\s?(%|ms\b|s\b|min\b)|\bundefined\b|\bInfinity\b).{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } }, tab);
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  // labels drawn in the canvas: boxes from the renderer's own label list, measured with the same font, must not overlap or leave the card
  const overlaps = async (id, where) => {
    if (width !== 1400) return;
    const r = await p.evaluate(id => { const st = (window.FTSTG || {})[id]; if (!st) return null; const cv = st.host.querySelector('canvas'), cx = cv.getContext('2d'), W = cv.clientWidth, H = cv.clientHeight;
      const boxes = [], out = [];
      (st.R.lab || []).forEach(L => { if (L.a < .35) return; const o = L.o, fs = Math.max(12, o.fs || 12.5); cx.font = (o.b ? '600 ' : '') + fs + 'px ' + (o.mono ? 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace' : 'ui-sans-serif,-apple-system,"Segoe UI",Helvetica,Arial,sans-serif');
        const w = cx.measureText(L.text).width, x0 = o.al === 'right' ? L.x - w : o.al === 'left' ? L.x : L.x - w / 2; boxes.push([x0, L.y - fs / 2, x0 + w, L.y + fs / 2, L.text]);
        if (x0 < 3 || x0 + w > W - 3 || L.y - fs / 2 < 2 || L.y + fs / 2 > H - 2) out.push('outside or touching the card: ' + L.text) });
      for (let i = 0; i < boxes.length; i++)for (let j = i + 1; j < boxes.length; j++) { const A = boxes[i], B = boxes[j], ox = Math.min(A[2], B[2]) - Math.max(A[0], B[0]), oy = Math.min(A[3], B[3]) - Math.max(A[1], B[1]);
        if (ox > 2 && oy > 2) out.push(A[4] + ' / ' + B[4]) }
      return out }, id);
    if (r === null) { problems.push(`${tag}: ${id} is not registered in window.FTSTG`); return }
    r.forEach(x => problems.push(`${tag}: ${id} ${where}: labels overlap or leave the card: ${x}`));
  };
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (cols.length !== SPLITS || cols.some(c => c !== 'grid'))) problems.push(`${tag}: splits are not ${SPLITS} two-column grids (${cols.length}: ${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  if (width === 1400) {
    const over = await p.$$eval('#t-read .s3R', xs => xs.map(x => { const r = x.getBoundingClientRect(), k = x.firstElementChild && x.firstElementChild.getBoundingClientRect(); return k && r.width && (k.right > r.right + 1 || k.left < r.left - 1) ? x.innerHTML.slice(0, 40) : '' }).filter(Boolean));
    over.forEach(o => problems.push(`${tag}: right-column content wider than its column: ${o}`));
    // the step lists against the page's own data, recomputed here
    const r = await p.evaluate(() => { const out = [], txt = el => el.textContent.replace(/\s+/g, ' ').trim(), n = x => x.toLocaleString('en-US');
      const need = (lid, k, x) => { const li = document.getElementById(lid).children[k]; if (!li || !txt(li).includes(x)) out.push(`${lid} item ${k + 1} lacks "${x}"`) };
      const D = window.FT, K = window.FT_CK, T = window.FT_EL, des = id => D.rec.designs.find(d => d.id === id), fs = x => x < 200 ? Math.round(x) + ' s' : Math.round(x / 60) + ' min';
      // Fig. 1: pauses and load times from the model's inputs, measured pauses as quoted in section 4's table
      if (K.C_base !== fs(des('base').C_s) || K.L_base !== fs(des('base').R.load) || K.L_mem !== fs(des('mem').R.load)) out.push('Fig. 1 inputs differ from FT.rec');
      need('sx-ck', 1, '1.81 s'); need('sx-ck', 1, '148.8 s'); need('sx-ck', 1, K.C_base); need('sx-ck', 2, '78 ms'); need('sx-ck', 2, '0.78 s'); need('sx-ck', 3, '0.01 to 0.04 s');
      need('sx-ck', 5, K.L_mem); need('sx-ck', 5, K.L_base); need('sx-ck', 6, '6.7%');
      // Fig. 2: the measured elastic runs
      const E = D.fl.elastic, S = D.fl.spare;
      if (Math.abs(T.shrink - (E.starts[1][0] - E.marks.kill_B)) > 1e-9 || Math.abs(T.spare - (S.starts[1][0] - S.marks.kill_B)) > 1e-9) out.push('Fig. 2 times differ from FT.fl');
      need('sx-el', 0, '32 sequences'); need('sx-el', 0, (32 / E.starts[0][1]) + ' per rank'); need('sx-el', 3, 'step_' + String(T.from1).padStart(6, '0') + '.pt'); need('sx-el', 3, T.shrink.toFixed(1) + ' s');
      need('sx-el', 3, (32 / T.w1) + ' rows'); need('sx-el', 4, 'step_' + String(T.from2).padStart(6, '0') + '.pt'); need('sx-el', 4, T.grow.toFixed(1) + ' s');
      need('sx-el', 5, 'step_' + String(T.fromS).padStart(6, '0') + '.pt'); need('sx-el', 5, T.spare.toFixed(1) + ' s');
      // the recovery animation's list against the model inputs
      need('sx-rc', 2, Math.round(des('base').R.wait) + ' s'); need('sx-rc', 5, des('base').R.load + ' s'); need('sx-rc', 5, 'under ' + des('mem').R.load + ' s');
      // Fig. 3: the measured runs behind the step lists
      const R = D.sdc.runs; if (!['grad_lo', 'grad_mid', 'grad_hi'].every(k => R[k].cks_first === null && R[k].replay.first[0] === 120 && R[k].replay.first[1] === 2)) out.push('Fig. 3: gradient runs differ from the list');
      if (!['w_lo', 'w_mid', 'w_hi'].every(k => R[k].cks_first === 120)) out.push('Fig. 3: weight runs differ from the list');
      need('sx-sdc-grad', 5, 'replica 2 at step 120'); need('sx-sdc-w', 3, 'step 120');
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  // every stage plays once scrolled into view
  for (const [id] of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
    if (shoot) { await wait(300); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-autoplay-${scheme}-${width}.png` }) }
  }
  // the 2D recovery animation plays once in view
  { await p.$eval('#rc-card', e => e.scrollIntoView({ block: 'center' })); await wait(1800);
    if (await p.$eval('#rc-ctl-p', e => e.getAttribute('aria-label')) !== 'Pause') problems.push(`${tag}: the recovery animation did not play when scrolled into view`);
    const n = await p.$eval('#rc-ctl-s', e => +e.max + 1), lis = await p.$eval('#sx-rc', e => e.children.length); if (n !== lis) problems.push(`${tag}: rc has ${n} steps, list ${lis}`);
    await p.$eval('#rc-ctl-b', e => e.click()); for (let k = 1; k < n; k++) await p.$eval('#rc-ctl-f', e => e.click());
    if ((await p.$eval('#sx-rc', e => [...e.children].findIndex(li => li.classList.contains('on')))) !== n - 1) problems.push(`${tag}: rc list does not mark the last step`);
    if (shoot) await (await p.$('#rc-card')).screenshot({ path: `${shots}/x-rc-last-${scheme}-${width}.png` }) }
  // the long replays are widgets: they never play by themselves and open on their informative frame
  for (const [card, ctl, at] of WIDGETS) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const w = await p.evaluate(c => [document.getElementById(c + '-p').getAttribute('aria-label'), +document.getElementById(c + '-s').value, +document.getElementById(c + '-s').max], ctl);
    if (w[0] !== 'Play' || w[1] !== (at === 'last' ? w[2] : at)) problems.push(`${tag}: ${card} played by itself or did not open on its frame (${w})`);
    if (shoot) await (await p.$('#' + card)).screenshot({ path: `${shots}/x-${card}-${scheme}-${width}.png` });
  }
  // off screen: the end of the Reading tab, far from every stage
  await p.evaluate(() => window.scrollTo(0, document.getElementById('t-read').getBoundingClientRect().bottom + scrollY - innerHeight)); await wait(800);
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
        await wait(750); await overlaps(id, `${label} step ${k + 1} mid-tween`); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${label}-s${k + 1}-midtween-${scheme}-${width}.png` });
        await wait(1300); await overlaps(id, `${label} step ${k + 1}`); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${label}-s${k + 1}-${scheme}-${width}.png` })
      } else await wait(200);
    }
    await wait(1900);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id}${label} ended on ${sh}`);
    await audit(`${id}${label} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id}${label} list does not mark the last step`);
  };
  for (const [id, lid, modes] of STAGES) {
    await stepAll(id, lid, '');
    if (modes) for (const [m, ml] of modes[1]) {
      await p.$eval(`#${modes[0]} button[data-m="${m}"]`, e => e.click()); await wait(1600);
      const r = await p.evaluate((id, ml) => [document.querySelector('#' + id + ' .stg-st').textContent, document.getElementById(id + '-p').getAttribute('aria-label'), document.getElementById(ml).hidden], id, ml);
      if (r[1] !== 'Pause' || r[2]) problems.push(`${tag}: ${id} mode ${m} did not swap its list and replay (${r})`);
      await stepAll(id, ml, '-' + m);
    }
  }
  await audit('end');
  for (const t of ['t-tax', 't-more']) { await p.click(`#tabs button[data-t="${t}"]`); await wait(300); await audit(t, t);
    if (t === 't-tax') { const c = await p.$$eval('#t-tax .s3sp', xs => xs.map(x => getComputedStyle(x).display)); if (c.length !== TAX_SPLITS || (width === 1400) !== c.every(x => x === 'grid')) problems.push(`${tag}: tax splits ${c}`); if (shoot) await p.screenshot({ path: `${shots}/x-tax-${scheme}-${width}.png` }) } }
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
  await p.$eval('#rc-card', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
  const rc = await p.evaluate(() => [document.getElementById('rc-ctl-p').getAttribute('aria-label'), +document.getElementById('rc-ctl-s').value]); if (rc[0] !== 'Play' || rc[1] !== 0) problems.push(`reduced motion: the recovery animation moved by itself (${rc})`);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
