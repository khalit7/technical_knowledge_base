// The 2026-11-06 rollout checks for Power, cooling and reliability (2026-11-12), adapted from Interconnects and scaling's check_stages.mjs:
// the three 3D stages (Fig. 1 one gigawatt grid to GPU, Fig. 2 one second of coolant, Fig. 3 one failure stops every GPU) and the 2D power-swing
// animation play by themselves once scrolled into view, step to their last step with one step-list item per step, stop redrawing off screen and
// never move under reduced motion; the swing's mode switch swaps the step list and replays; the checkpoint day (a widget) never plays by itself;
// no errors, NaN, undefined or sideways scroll in any tab; splits are two columns at 1400 px and one below 1100 px; scene labels do not overlap
// each other, leave or touch the card at 1400 px, at the end of each step and in the middle of its tween; the numbers in the step lists equal
// the page's own data and model (window.PW, PWE, PW_HERO, PW_COOL, PW_FAIL, PW_SWSTR).
// usage (from the repo root): node technical_knowledge_base/systems_and_performance/topic_hardware/power_cooling_and_reliability/src/check/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../../index.html'), shots = process.argv[2] || path.resolve(here, '../../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = [['stg-hero', 'sx-hero'], ['stg-cool', 'sx-cool'], ['stg-fail', 'sx-fail']];
// 2D animations: card, control prefix, step list, and the mode switch (segment id, [mode, list] pairs) if any
const ANIMS = [['pw-swing-card', 'pw-swing-ctl', 'sx-sw-raw', ['pw-swing-seg', [['smooth', 'sx-sw-smooth'], ['raw', 'sx-sw-raw']]]]];
const SPLITS = 15;
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
  // labels drawn in the canvas: boxes from the renderer's own label list, measured with the same font, must not overlap, leave or touch the card
  const overlaps = async (id, where) => {
    if (width !== 1400) return;
    const r = await p.evaluate(id => { const st = (window.PWSTG || {})[id]; if (!st) return null; const cv = st.host.querySelector('canvas'), cx = cv.getContext('2d'), W = cv.clientWidth, H = cv.clientHeight;
      const boxes = [], out = [];
      (st.R.lab || []).forEach(L => { if (L.a < .35) return; const o = L.o, fs = Math.max(12, o.fs || 12.5); cx.font = (o.b ? '600 ' : '') + fs + 'px ' + (o.mono ? 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace' : 'ui-sans-serif,-apple-system,"Segoe UI",Helvetica,Arial,sans-serif');
        const w = cx.measureText(L.text).width, x0 = o.al === 'right' ? L.x - w : o.al === 'left' ? L.x : L.x - w / 2; boxes.push([x0, L.y - fs / 2, x0 + w, L.y + fs / 2, L.text]);
        if (x0 < 3 || x0 + w > W - 3 || L.y - fs / 2 < 2 || L.y + fs / 2 > H - 2) out.push('outside or touching the card: ' + L.text) });
      for (let i = 0; i < boxes.length; i++)for (let j = i + 1; j < boxes.length; j++) { const A = boxes[i], B = boxes[j], ox = Math.min(A[2], B[2]) - Math.max(A[0], B[0]), oy = Math.min(A[3], B[3]) - Math.max(A[1], B[1]);
        if (ox > 2 && oy > 2) out.push(A[4] + ' / ' + B[4]) }
      return out }, id);
    if (r === null) { problems.push(`${tag}: ${id} is not registered in window.PWSTG`); return }
    r.forEach(x => problems.push(`${tag}: ${id} ${where}: labels overlap or leave the card: ${x}`));
  };
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (cols.length !== SPLITS || cols.some(c => c !== 'grid'))) problems.push(`${tag}: splits are not ${SPLITS} two-column grids (${cols.length}: ${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  if (width === 1400) {
    const over = await p.$$eval('#t-read .s3R', xs => xs.map(x => { const r = x.getBoundingClientRect(), k = x.firstElementChild && x.firstElementChild.getBoundingClientRect(); return k && r.width && (k.right > r.right + 1 || k.left < r.left - 1) ? x.innerHTML.slice(0, 40) : '' }).filter(Boolean));
    over.forEach(o => problems.push(`${tag}: right-column content wider than its column: ${o}`));
    // the step lists against the page's own data and models, recomputed here
    const r = await p.evaluate(() => { const out = [], txt = el => el.textContent.replace(/\s+/g, ' ').trim(), n = x => x.toLocaleString('en-US');
      const need = (lid, k, x) => { const li = document.getElementById(lid).children[k]; if (!li || !txt(li).includes(x)) out.push(`${lid} item ${k + 1} lacks "${x}"`) };
      const W = window.PW, H = window.PW_HERO, C = window.PW_COOL, F = window.PW_FAIL, f = x => Math.round(x).toLocaleString('en-US');
      // Fig. 1: one gigawatt
      const sys = W.systems.find(s => s[0] === 'nvl72');
      if (H.rackKW !== sys[2] || H.gpr !== sys[3] || H.pue !== W.pue.root || H.gpuW !== 1200) out.push('Fig. 1 inputs differ from window.PW: ' + JSON.stringify(H));
      need('sx-hero', 0, f(H.site / 1000) + ' GW'); need('sx-hero', 1, 'PUE ' + H.pue); need('sx-hero', 1, 'about ' + f(H.over) + ' MW'); need('sx-hero', 1, 'the ' + f(H.it) + ' MW');
      need('sx-hero', 2, 'approximately ' + f(H.rackKW) + ' kW'); need('sx-hero', 3, f(H.gpuW) + ' W'); need('sx-hero', 3, H.gpuKW.toFixed(1) + ' kW'); need('sx-hero', 3, Math.round(100 * H.gpuShare) + '% of the rack');
      need('sx-hero', 5, f(H.it) + ' MW / ' + f(H.rackKW) + ' kW'); need('sx-hero', 5, 'about ' + f(H.racks)); if (Math.abs(H.gpus - 5e5) > 1) out.push('Fig. 1: GPUs per gigawatt are not half a million: ' + H.gpus);
      // Fig. 2: cooling at the calculator's defaults
      need('sx-cool', 0, f(C.Q / 1000) + ' kW'); need('sx-cool', 1, C.air.toFixed(1) + ' m'); need('sx-cool', 1, f(Math.round(C.cfm / 1000) * 1000) + ' CFM'); need('sx-cool', 1, C.sa.toFixed(2) + ' m on a side');
      need('sx-cool', 1, C.sa.toFixed(1) + ' m cube');
      need('sx-cool', 2, 'about ' + f(C.lpm) + ' litres'); need('sx-cool', 2, C.ls.toFixed(1) + ' L a second'); need('sx-cool', 2, Math.round(C.sw * 100) + ' cm'); need('sx-cool', 2, 'about ' + f(Math.round(C.ratio / 100) * 100) + ' times');
      // Fig. 3: failures, from the engine
      need('sx-fail', 0, f(F.servers) + ' eight-GPU servers'); need('sx-fail', 0, 'once every ' + f(F.serverDays) + ' days'); need('sx-fail', 0, F.mu.toFixed(1) + ' hours');
      need('sx-fail', 1, (F.Ty * 60).toFixed(1) + ' minutes'); need('sx-fail', 1, Math.round(F.C * 60) + ' minutes'); need('sx-fail', 2, F.f1.toFixed(2) + ' h'); need('sx-fail', 2, (F.lost1 * 60).toFixed(1) + ' minutes');
      need('sx-fail', 3, Math.round(F.D * 60) + ' minutes of downtime'); need('sx-fail', 3, Math.round(F.R * 60) + ' minutes of recovery');
      need('sx-fail', 4, F.nf + ' failures'); need('sx-fail', 4, F.young.toFixed(1) + ' h'); need('sx-fail', 4, F.bad.toFixed(1) + ' h'); need('sx-fail', 4, 'every ' + F.badT + ' hours');
      // the swing: stretches cover the 13 phases; the list numbers from PW.swing
      const SW = W.swing, ST = window.PW_SWSTR, full = SW.tdp_w * SW.gpus / 1e6;
      if (ST[0][0] !== 0 || ST[ST.length - 1][1] !== 2 * SW.iters || ST.some((x, i) => i && x[0] !== ST[i - 1][1] + 1)) out.push('swing stretches do not cover the 13 phases');
      need('sx-sw-raw', 0, full.toFixed(1) + ' MW'); need('sx-sw-raw', 1, (SW.idle * full).toFixed(1) + ' MW'); need('sx-sw-raw', 1, ((1 - SW.idle) * full).toFixed(1) + ' MW swing');
      need('sx-sw-raw', 2, (SW.compute_s + SW.comm_s) + ' seconds'); need('sx-sw-raw', 3, SW.ckpt_s + ' s'); need('sx-sw-smooth', 0, Math.round(100 * SW.ramp_per_s) + '%');
      need('sx-sw-smooth', 1, Math.round(100 * SW.floor) + '%'); need('sx-sw-smooth', 1, (SW.floor * full).toFixed(1) + ' MW'); need('sx-sw-smooth', 2, Math.round((1 - SW.floor) * full) + ' MW');
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  // every stage and animation plays once scrolled into view; the two widgets do not move
  for (const [id] of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
    if (shoot) { await wait(300); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-autoplay-${scheme}-${width}.png` }) }
  }
  for (const [card, ctl] of ANIMS) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const lab = await p.$eval(`#${ctl}-p`, e => e.getAttribute('aria-label')); if (lab !== 'Pause') problems.push(`${tag}: ${card} did not play when scrolled into view`);
  }
  // off screen: the end of section 10, far from every stage (the hero sits at the top of the page)
  await p.evaluate(() => window.scrollTo(0, document.getElementById('t-read').getBoundingClientRect().bottom + scrollY - innerHeight)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  const stepAll = async (id, lid, label) => {
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length);
    if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but list ${lid} shows ${lis}`);
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
  for (const [id, lid] of STAGES) await stepAll(id, lid, '');
  // 2D animations: step to the end with the forward button; one list item per step; the mode switch swaps the list and replays
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
    if (modes) for (const [m, ml] of modes[1]) {
      await p.$eval(`#${modes[0]} button[data-m="${m}"]`, e => e.click()); await wait(1600);
      const st = await p.$eval(`#${ctl}-s`, e => +e.value), lab = await p.$eval(`#${ctl}-p`, e => e.getAttribute('aria-label'));
      if (st > 1 || (lab !== 'Pause' && !(st === 0))) problems.push(`${tag}: ${card} mode ${m} did not restart (${st}, ${lab})`);
      await step2d(card, ctl, ml, '-' + m);
    }
  }
  await audit('end');
  { // the checkpoint day is a widget: it opens on the end of the day and never plays by itself
    await p.evaluate(() => window.scrollTo(0, 0)); await wait(300);
    await p.$eval('#ck-card', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const ck = await p.evaluate(() => [document.getElementById('ck-ctl-p').getAttribute('aria-label'), +document.getElementById('ck-ctl-s').value, +document.getElementById('ck-ctl-s').max]);
    if (ck[0] !== 'Play' || ck[1] !== ck[2]) problems.push(`${tag}: the checkpoint day played by itself or did not open on its last frame (${ck})`);
    if (shoot) await (await p.$('#ck-wcard')).screenshot({ path: `${shots}/x-ck-widget-${scheme}-${width}.png` });
    await p.click('#tabs button[data-t="t-more"]'); await wait(300); await audit('t-more', 't-more'); }
  await p.click('#tabs button[data-t="t-read"]');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file);
  for (const [id] of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1400);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  for (const [card, ctl] of ANIMS) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1200);
    const r = await p.$eval(`#${ctl}-p`, e => e.getAttribute('aria-label')); if (r !== 'Play') problems.push(`reduced motion: ${card} played by itself`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
