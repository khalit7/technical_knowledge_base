// The 2026-11-06 rollout checks for Cluster anatomy (2026-11-12), adapted from Power, cooling and reliability's check_stages.mjs:
// the four 3D stages (Fig. 1 the staircase, Fig. 2 one job and four networks, Fig. 3 one ring placed two ways, Fig. 4 the storage tiers) play by themselves
// once scrolled into view, step to their last step with one step-list item per step, stop redrawing off screen and never move under reduced motion;
// Fig. 3's mode chips swap the step list and replay; the message path (a widget) never plays by itself and opens on its last hop; no errors, NaN,
// undefined or sideways scroll in any tab; splits are two columns at 1400 px and one below 1100 px; scene labels do not overlap each other or leave
// the card at 1400 px; the numbers in the step lists equal the page's own data (window.CA and the scenes' CA_HERO, CA_PLACE, CA_STO).
// usage (from the repo root): node technical_knowledge_base/systems_and_performance/topic_ml_infra_and_orchestration/cluster_anatomy/src/check/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../../index.html'), shots = process.argv[2] || path.resolve(here, '../../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = [['stg-hero', 'sx-hero'], ['stg-job', 'sx-job'], ['stg-place', 'sx-place-packed', ['ca-place-mode', [['spread', 'sx-place-spread'], ['packed', 'sx-place-packed']]]], ['stg-sto', 'sx-sto']];
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
      return { bad: (c.innerText.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } }, tab);
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  // labels drawn in the canvas: boxes from the renderer's own label list, measured with the same font, must not overlap or leave the card
  const overlaps = async (id, where) => {
    if (width !== 1400) return;
    const r = await p.evaluate(id => { const st = (window.CASTG || {})[id]; if (!st) return null; const cv = st.host.querySelector('canvas'), cx = cv.getContext('2d'), W = cv.clientWidth, H = cv.clientHeight;
      const boxes = [], out = [];
      (st.R.lab || []).forEach(L => { if (L.a < .35) return; const o = L.o, fs = Math.max(12, o.fs || 12.5); cx.font = (o.b ? '600 ' : '') + fs + 'px ' + (o.mono ? 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace' : 'ui-sans-serif,-apple-system,"Segoe UI",Helvetica,Arial,sans-serif');
        const w = cx.measureText(L.text).width, x0 = o.al === 'right' ? L.x - w : o.al === 'left' ? L.x : L.x - w / 2; boxes.push([x0, L.y - fs / 2, x0 + w, L.y + fs / 2, L.text]);
        if (x0 < 3 || x0 + w > W - 3 || L.y - fs / 2 < 2 || L.y + fs / 2 > H - 2) out.push('outside or touching the card: ' + L.text) });
      for (let i = 0; i < boxes.length; i++)for (let j = i + 1; j < boxes.length; j++) { const A = boxes[i], B = boxes[j], ox = Math.min(A[2], B[2]) - Math.max(A[0], B[0]), oy = Math.min(A[3], B[3]) - Math.max(A[1], B[1]);
        if (ox > 2 && oy > 2) out.push(A[4] + ' / ' + B[4]) }
      return out }, id);
    if (r === null) { problems.push(`${tag}: ${id} is not registered in window.CASTG`); return }
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
      const CA = window.CA, H = window.CA_HERO, PL = window.CA_PLACE, S = window.CA_STO, L = CA.levels.llama3.lv;
      // Fig. 1: the Llama 3 levels
      if (H.hbm !== L[0].bw || H.nvl !== L[1].bw || H.cl !== L[4].bw) out.push('Fig. 1 inputs differ from CA.levels.llama3');
      need('sx-hero', 0, n(H.hbm) + ' GB/s'); need('sx-hero', 1, H.nNode + ' GPUs on NVLink, ' + H.nvl + ' GB/s');
      need('sx-hero', 2, H.nRack + ' GPUs, ' + H.nic + ' GB/s through ' + H.swRack + ' switch'); need('sx-hero', 3, n(H.nPod) + ' GPUs, still ' + H.pod + ' GB/s, ' + H.swPod + ' switches');
      need('sx-hero', 3, H.racks + ' racks'); need('sx-hero', 4, n(H.nCl) + ' GPUs'); need('sx-hero', 4, H.pods + ' pods'); need('sx-hero', 4, '1:' + CA.place.o);
      need('sx-hero', 4, 'crosses ' + H.swCl + ' switches'); need('sx-hero', 4, '50 / ' + CA.place.o + ' = ' + H.cl.toFixed(2) + ' GB/s');
      if (Math.abs(50 / CA.place.o - H.cl) > .005) out.push('Fig. 1: 50 / 7 is not ' + H.cl);
      // Fig. 2: the step list drives the drawing; every item says which machines and networks it lights
      [...document.getElementById('sx-job').children].forEach((li, i) => { if (li.dataset.on == null || li.dataset.net == null) out.push('sx-job item ' + (i + 1) + ' lacks data-on or data-net') });
      // Fig. 3: placement counts and times
      const P = PL.packed, Q = PL.spread;
      need('sx-place-packed', 1, P.servers + ' servers, ' + P.racks + ' rack, ' + P.pods + ' pod'); need('sx-place-packed', 2, P.lv[0] + ' of its 16 edges are NVLink'); need('sx-place-packed', 2, 'only ' + P.lv[1] + ' edges cross the rack switch');
      need('sx-place-packed', 2, P.sw + ' switches'); need('sx-place-packed', 3, PL.packed_ms.toFixed(1) + ' ms'); need('sx-place-packed', 4, PL.packed_ms.toFixed(1) + ' ms');
      need('sx-place-spread', 1, Q.servers + ' servers, ' + Q.racks + ' racks, ' + Q.pods + ' pods');
      need('sx-place-spread', 2, Q.lv[1] + ' edges stay in a rack, ' + Q.lv[2] + ' cross racks inside a pod, ' + Q.lv[3] + ' cross between pods: ' + Q.sw + ' switches per trip round the ring against ' + P.sw);
      need('sx-place-spread', 3, PL.packed_ms.toFixed(1) + ' ms'); need('sx-place-spread', 4, PL.spread_busy_ms.toFixed(1) + ' ms'); need('sx-place-spread', 4, '1:' + PL.o); need('sx-place-spread', 4, PL.busy_bw.toFixed(2) + ' GB/s');
      if (Math.abs(2 * 15 / 16 / 50 * 1000 - PL.packed_ms) > 1e-9 || Math.abs(2 * 15 / 16 / (50 / PL.o) * 1000 - PL.spread_busy_ms) > 1e-9) out.push('Fig. 3 times do not follow 2(N-1)/N x 1 GB / slowest edge');
      // Fig. 4: storage numbers from CA.tiers
      need('sx-sto', 0, S.hbm); need('sx-sto', 0, S.hbmBw + ' per GPU'); need('sx-sto', 0, S.dram); need('sx-sto', 0, 'about ' + S.pcie + ' GB/s'); need('sx-sto', 0, S.nvme + ' in RAID 0');
      need('sx-sto', 1, S.pfsStd + ' / ' + S.nodes + ' = ' + S.perNode.toFixed(2) + ' GB/s'); need('sx-sto', 4, S.write + ' GB/s per 32 nodes');
      if (!CA.tiers[3].bw.includes(S.pfsStd + ' to ' + S.pfsEnh + ' GB/s read per ' + S.nodes + ' nodes')) out.push('Fig. 4: the file system tier differs from CA.tiers');
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  // every stage plays once scrolled into view
  for (const [id] of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
    if (shoot) { await wait(300); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-autoplay-${scheme}-${width}.png` }) }
  }
  // the message path is a widget: it never plays by itself and opens on its last hop
  { await p.$eval('#ca-mp-card', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const mp = await p.evaluate(() => [document.getElementById('mp-ctl-p').getAttribute('aria-label'), +document.getElementById('mp-ctl-s').value, +document.getElementById('mp-ctl-s').max]);
    if (mp[0] !== 'Play' || mp[1] !== mp[2]) problems.push(`${tag}: the message path played by itself or did not open on its last hop (${mp})`);
    if (shoot) await (await p.$('#ca-mp-card')).screenshot({ path: `${shots}/x-mp-widget-${scheme}-${width}.png` }) }
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
  for (const t of ['t-camap', 't-casize', 't-more']) { await p.click(`#tabs button[data-t="${t}"]`); await wait(300); await audit(t, t) }
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
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
