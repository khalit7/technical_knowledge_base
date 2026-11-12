// The 2026-11-06 rollout checks for Storage and data movement (2026-11-12), adapted from Fault tolerance at scale's check_stages.mjs:
// the four 3D stages (Fig. 1 parallel file system, Fig. 2 object store, Fig. 3 cache, Fig. 4 checkpoint burst) play by themselves once
// scrolled into view, step to their last step with one step-list item per step, stop redrawing off screen and never move under reduced
// motion; the two stepped 2D animations (one 8 MiB write, resharding reads) play once in view, mark their lists, and their mode buttons swap
// the list and replay; the three long replays (stripe count, metadata storm, async checkpoints) are widgets that never play by themselves and
// open on their last frame; no errors, NaN, undefined or sideways scroll in any tab; splits are two columns at 1400 px and one below 1100 px;
// scene labels do not overlap or leave the card at 1400 px; the numbers in the step lists equal the page's own data (window.SD, window.IO_D).
// usage (from the repo root): node technical_knowledge_base/systems_and_performance/topic_ml_infra_and_orchestration/storage_and_data_movement/src/check/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../../index.html'), shots = process.argv[2] || path.resolve(here, '../../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = [['stg-pfs', 'sx-pfs'], ['stg-obj', 'sx-obj'], ['stg-cache', 'sx-cache'], ['stg-burst', 'sx-burst']];
const ANIMS = [['sd-life-card', 'sd-life-ctl', 'sx-life-lus', 'sd-life-mode', [['nfs', 'sx-life-nfs'], ['lus', 'sx-life-lus']]],
  ['sd-rs-card', 'sd-rs-ctl', 'sx-rs-4', 'sd-rs-mode', [['2', 'sx-rs-2'], ['3', 'sx-rs-3'], ['4', 'sx-rs-4']]]];
const WIDGETS = [['sds-anim-card', 'sds-ctl'], ['sdm-anim-card', 'sdm-ctl'], ['io-as-card', 'io-as-ctl']];
const SPLITS = 19;
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
    const r = await p.evaluate(id => { const st = (window.SDSTG || {})[id]; if (!st) return null; const cv = st.host.querySelector('canvas'), cx = cv.getContext('2d'), W = cv.clientWidth, H = cv.clientHeight;
      const boxes = [], out = [];
      (st.R.lab || []).forEach(L => { if (L.a < .35) return; const o = L.o, fs = Math.max(12, o.fs || 12.5); cx.font = (o.b ? '600 ' : '') + fs + 'px ' + (o.mono ? 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace' : 'ui-sans-serif,-apple-system,"Segoe UI",Helvetica,Arial,sans-serif');
        const w = cx.measureText(L.text).width, x0 = o.al === 'right' ? L.x - w : o.al === 'left' ? L.x : L.x - w / 2; boxes.push([x0, L.y - fs / 2, x0 + w, L.y + fs / 2, L.text]);
        if (x0 < 3 || x0 + w > W - 3 || L.y - fs / 2 < 2 || L.y + fs / 2 > H - 2) out.push('outside or touching the card: ' + L.text) });
      for (let i = 0; i < boxes.length; i++)for (let j = i + 1; j < boxes.length; j++) { const A = boxes[i], B = boxes[j], ox = Math.min(A[2], B[2]) - Math.max(A[0], B[0]), oy = Math.min(A[3], B[3]) - Math.max(A[1], B[1]);
        if (ox > 2 && oy > 2) out.push(A[4] + ' / ' + B[4]) }
      return out }, id);
    if (r === null) { problems.push(`${tag}: ${id} is not registered in window.SDSTG`); return }
    r.forEach(x => problems.push(`${tag}: ${id} ${where}: labels overlap or leave the card: ${x}`));
  };
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (cols.length !== SPLITS || cols.some(c => c !== 'grid'))) problems.push(`${tag}: splits are not ${SPLITS} two-column grids (${cols.length}: ${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  if (width === 1400) {
    const over = await p.$$eval('#t-read .s3R', xs => xs.map(x => { const r = x.getBoundingClientRect(); return [...x.children].some(k => { const q = k.getBoundingClientRect(); return r.width && (q.right > r.right + 1 || q.left < r.left - 1) }) ? x.innerHTML.slice(0, 40) : '' }).filter(Boolean));
    over.forEach(o => problems.push(`${tag}: right-column content wider than its column: ${o}`));
    // the step lists against the page's own data
    const r = await p.evaluate(() => { const out = [], txt = el => el.textContent.replace(/\s+/g, ' ').trim(), loc = x => x.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
      const need = (lid, k, x) => { const li = document.getElementById(lid).children[k]; if (!li || !txt(li).includes(x)) out.push(`${lid} item ${k + 1} lacks "${x}"`) };
      const F = window.SD_PFS, O = window.SD_OBJ, C = window.SD_CACHE, B = window.SD_BURST;
      if (!F || !O || !C || !B) { out.push('a scene did not export its numbers'); return out }
      need('sx-pfs', 2, 'OST ' + F.lay[1].join(', ')); need('sx-pfs', 3, F.lay[2].join(' and ')); need('sx-pfs', 4, F.lay[4].join(', ')); need('sx-pfs', 4, 'here on OST ' + F.lay[4][1]);
      need('sx-pfs', 2, F.rate[1].toFixed(1) + ' MB/s'); need('sx-pfs', 3, F.rate[2].toFixed(1) + ' MB/s'); need('sx-pfs', 4, F.rate[4].toFixed(1) + ' MB/s');
      need('sx-pfs', 5, F.spread.toFixed(1) + ' MB/s'); need('sx-pfs', 6, F.ost0.toFixed(1) + ' MB/s');
      need('sx-obj', 0, O.listKeys.toLocaleString('en-US') + ' keys took ' + O.listReq + ' requests'); need('sx-obj', 1, O.ren.toFixed(2) + ' s'); need('sx-obj', 1, O.put.toFixed(2) + ' s');
      need('sx-obj', 2, O.up1 + ' MB/s'); need('sx-obj', 2, O.up8 + ' MB/s'); need('sx-obj', 3, O.dn1 + ' MB/s'); need('sx-obj', 4, O.dn8 + ' MB/s');
      need('sx-cache', 1, loc(C.s3_1) + ' MB/s'); need('sx-cache', 1, loc(C.s3_16) + ' MB/s'); need('sx-cache', 2, loc(C.loc_1) + ' MB/s'); need('sx-cache', 2, loc(C.loc_16) + ' MB/s'); need('sx-cache', 0, C.files + ' shards');
      need('sx-burst', 0, (B.state / 1e6).toFixed(1) + ' MB'); need('sx-burst', 1, B.r0.toFixed(2) + ' s'); need('sx-burst', 1, Math.round(B.r0vol * 1000) + ' ms');
      need('sx-burst', 2, Math.round(B.everyB / 1e6) + ' MB in ' + B.every.toFixed(2) + ' s'); need('sx-burst', 3, B.full.toFixed(2) + ' s'); need('sx-burst', 3, B.gather.toFixed(2) + ' s'); need('sx-burst', 3, B.gatherVol.toFixed(2) + ' s');
      need('sx-burst', 4, B.dcp.toFixed(2) + ' s');
      if (Math.abs(B.every / B.r0 - 3) > .1) out.push('Fig. 4: "three times as long" no longer holds');
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  // every stage plays once scrolled into view
  for (const [id] of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
    if (shoot) { await wait(300); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-autoplay-${scheme}-${width}.png` }) }
  }
  // the stepped 2D animations play once in view, step to the end with one list item per step, and their mode buttons swap the list and replay
  for (const [card, ctl, list, seg, modes] of ANIMS) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1800);
    if (await p.$eval('#' + ctl + '-p', e => e.getAttribute('aria-label')) !== 'Pause') problems.push(`${tag}: ${card} did not play when scrolled into view`);
    if (!(await p.$eval('#' + card, e => e.hasAttribute('data-playing')))) problems.push(`${tag}: ${card} has no data-playing while it plays`);
    const stepAll = async (lid, label) => {
      const n = await p.$eval('#' + ctl + '-s', e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.hidden ? -1 : e.children.length); if (n !== lis) problems.push(`${tag}: ${card}${label} has ${n} steps, list ${lid} ${lis}`);
      await p.$eval('#' + ctl + '-b', e => e.click()); await p.evaluate(c => { const s = document.getElementById(c + '-s'); s.value = 0; s.dispatchEvent(new Event('input')) }, ctl);
      for (let k = 1; k < n; k++) await p.$eval('#' + ctl + '-f', e => e.click());
      if ((await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')))) !== n - 1) problems.push(`${tag}: ${card}${label} list does not mark the last step`);
      if (shoot) await (await p.$('#' + card)).screenshot({ path: `${shots}/x-${card}${label}-last-${scheme}-${width}.png` });
      await audit(card + label);
    };
    await stepAll(list, '');
    for (const [m, ml] of modes) {
      await p.$eval(`#${seg} button[data-m="${m}"]`, e => e.click()); await wait(800);
      const r = await p.evaluate((ctl, ml) => [document.getElementById(ctl + '-p').getAttribute('aria-label'), document.getElementById(ml).hidden], ctl, ml);
      if (r[0] !== 'Pause' || r[1]) problems.push(`${tag}: ${card} mode ${m} did not swap its list and replay (${r})`);
      await stepAll(ml, '-' + m);
    }
  }
  // the long replays are widgets: they never play by themselves and open on their last frame
  for (const [card, ctl] of WIDGETS) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const w = await p.evaluate(c => [document.getElementById(c + '-p').getAttribute('aria-label'), +document.getElementById(c + '-s').value, +document.getElementById(c + '-s').max], ctl);
    if (w[0] !== 'Play' || w[1] !== w[2]) problems.push(`${tag}: ${card} played by itself or did not open on its last frame (${w})`);
    if (shoot) await (await p.$('#' + card)).screenshot({ path: `${shots}/x-${card}-${scheme}-${width}.png` });
  }
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
  for (const t of ['t-sdsize', 't-more']) { await p.click(`#tabs button[data-t="${t}"]`); await wait(300); await audit(t, t); if (shoot) await p.screenshot({ path: `${shots}/x-${t}-${scheme}-${width}.png`, fullPage: true }) }
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
