// The 2026-11-06 rollout checks for Sampling and Decoding: every 3D stage and every 2D animation plays by itself once scrolled into view,
// steps to its last step, has one step-list item per step, never moves under reduced motion; the widget never plays by itself;
// the numbers in the stages' step lists match the numbers the scenes compute from the page's data (window.SD_STG);
// no errors, NaN, undefined or sideways scroll; the split layout is two columns at 1400 px.
// usage (from the repo root or src/): node <page>/src/check_stages.mjs [shots dir]   (needs html_utils' node_modules)
// Adapted from Probability for ML (engineering_foundations/topic_math/probability/src/check_stages.mjs).
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = ['stg-hero', 'stg-beam', 'stg-mask'];
// a stage with modes: [segmented control id, data attribute, modes, list id per mode]
const MODES = { 'stg-beam': ['rd-bmM', 'm', ['greedy', 'beam'], { greedy: 'sx-bm-g', beam: 'sx-bm-b' }] };
// [card, controls, {mode: step list}, mode buttons, data attribute]
const ANIMS = [['rd-pp', 'rd-ppC', { p: 'sx-pp', m: 'sx-pp' }, 'rd-ppM', 'm']];
// widgets (the long-replay rule, case b): [card, controls, tab]
const WIDGETS = [['rd-js', 'rd-jsC', 't-read']];
const wait = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const problems = [];
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(400);
  const tag = `${scheme} ${width}`;
  const audit = async where => {
    const r = await p.evaluate(() => ({ bad: (document.getElementById('t-read').innerText.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) }));
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  if (width === 1400) { // the step lists quote the numbers the scenes draw
    const miss = await p.evaluate(() => {
      const G = window.SD_STG, out = [], pc = v => (v * 100).toFixed(1) + '%', n = v => Math.round(v).toLocaleString('en-GB'), m = v => v.toFixed(2).replace('-', '−');
      const has = (id, xs) => { const t = document.getElementById(id).textContent; xs.forEach(x => { if (!t.includes(x)) out.push(id + ': ' + x) }) };
      const h = G.hero;
      has('sx-hero', [n(h.V), h.l0.toFixed(2), h.l12.toFixed(2), pc(h.p1), pc(h.pT), pc(h.tail1), pc(h.tailT), (h.thr * 100).toFixed(2) + '%', h.kept + ' of ' + n(h.V), n(h.topp), pc(h.mass), pc(h.fin0), pc(h.finTail), n(h.V - 12), '"' + h.pick + '"']);
      if (!h.keptTop || h.kept !== 22) out.push('hero: min-p does not keep the 12 shown plus 10');
      const be = G.beam; has('sx-bm-b', [m(be.best), m(be.greedy), be.ratio.toFixed(1) + ' times']); has('sx-bm-g', [m(be.greedy)]);
      const k = G.mask; has('sx-mask', [n(k.V), String(k.n), pc(k.mass), pc(k.top[0][1]), pc(k.top[1][1]), pc(k.top[1][3]), (k.top[7][1] * 100).toFixed(2) + '%', (k.top[7][3] * 100).toFixed(2) + '%', pc(k.rest), n(k.V - 8)]);
      if (k.pick !== k.top[1][0]) out.push('mask: the pick is not the second token');
      return out;
    });
    miss.forEach(x => problems.push('step list number missing: ' + x));
    const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
    if (cols.some(c => c !== 'grid')) problems.push(`${tag}: a split is not two columns`);
    await p.click('#tabs button[data-t="t-lab"]'); await wait(300);
    const c2 = await p.$$eval('#t-lab .s3sp', xs => xs.map(x => getComputedStyle(x).display)); if (!c2.length || c2.some(d => d !== 'grid')) problems.push(`${tag}: lab split not two columns`);
    await p.screenshot({ path: `${shots}/x-tab-t-lab-${scheme}-${width}.png` });
    await p.click('#tabs button[data-t="t-read"]'); await wait(300);
  }
  // autoplay on view
  for (const id of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2200);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
  }
  for (const [card, ctl] of ANIMS) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const t = await p.$eval(`#${ctl}-p`, e => e.textContent); if (!/Pause/.test(t)) problems.push(`${tag}: ${card} did not play when scrolled into view (${t})`);
  }
  for (const [card, ctl] of WIDGETS) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(2000);
    const t = await p.$eval(`#${ctl}-p`, e => e.textContent); if (/Pause/.test(t)) problems.push(`${tag}: widget ${card} played by itself`);
    const v = await p.$eval(`#${ctl}-s`, e => e.value); if (v !== '0') problems.push(`${tag}: widget ${card} moved by itself (${v})`);
  }
  // flows stop off screen: draws do not rise while every stage is out of view
  await p.evaluate(() => window.scrollTo(0, document.getElementById('s6').getBoundingClientRect().top + scrollY)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  // step every stage to its last step, in every mode; list length; screenshot mid-way
  for (const id of STAGES) {
    const md = MODES[id], modes = md ? md[2] : [null];
    for (const m of modes) {
      if (m) { await p.$eval(`#${md[0]} button[data-${md[1]}="${m}"]`, e => e.click()); await wait(100); }
      await p.$eval(`#${id}-b`, e => e.click());
      await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
      const n = await p.$eval(`#${id}-r`, e => +e.max + 1);
      const lis = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return l ? [l.id, l.children.length] : ['', 0] });
      if (lis[1] !== n) problems.push(`${tag}: ${id} has ${n} steps but ${lis[1]} items`);
      if (m && lis[0] !== md[3][m]) problems.push(`${tag}: ${id} mode ${m} shows list ${lis[0]}`);
      for (let k = 1; k < n; k++) {
        await p.$eval(`#${id}-f`, e => e.click()); await wait(80);
        if (k === Math.floor(n / 2)) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2600); const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}${m ? '-' + m : ''}-${scheme}-${width}.png` }) }
      }
      await wait(2000);
      const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ${m || ''} ended on ${sh}`);
      if (width === 1400) { const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}${m ? '-' + m : ''}-last-${scheme}-${width}.png` }) }
      await audit(`${id} ${m || ''} last step`);
      for (let k = 0; k < n; k++) await p.evaluate((id, k) => document.getElementById(id).closest('.s3sp').querySelector('ol.sx:not([hidden])').children[k].click(), id, k);
    }
  }
  for (const [card, ctl, lists, seg, at] of ANIMS) {
    for (const [m, lid] of Object.entries(lists)) {
      if (seg) { await p.$eval(`#${seg} button[data-${at}="${m}"]`, e => e.click()); await wait(100); }
      await p.$eval(`#${ctl}-b`, e => e.click());
      await p.evaluate(ctl => { const e = document.getElementById(ctl + '-s'); e.value = 0; e.dispatchEvent(new Event('input')) }, ctl);
      const n = await p.$eval(`#${ctl}-s`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.hidden ? -1 : e.children.length);
      if (lis !== n) problems.push(`${tag}: ${card} ${m} has ${n} steps but list ${lid} shows ${lis}`);
      for (let k = 1; k < n; k++) { await p.$eval(`#${ctl}-f`, e => e.click()); await wait(60);
        if (k === Math.floor(n / 2)) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); const el = await p.$('#' + card); await el.screenshot({ path: `${shots}/x-${card}-${m}-${scheme}-${width}.png` }) } }
      const on = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on'))); if (on !== n - 1) problems.push(`${tag}: ${card} ${m} list marks ${on}, not the last step`);
      await audit(`${card} ${m}`);
    }
  }
  // the widget steps to its end in both modes
  for (const [card, ctl] of WIDGETS) {
    for (const m of ['free', 'con']) {
      await p.$eval(`#rd-jsM button[data-m="${m}"]`, e => e.click()); await wait(100);
      const n = await p.$eval(`#${ctl}-s`, e => +e.max + 1);
      for (let k = 1; k < n; k++) await p.$eval(`#${ctl}-f`, e => e.click());
      const v = await p.$eval(`#${ctl}-s`, e => +e.value); if (v !== n - 1) problems.push(`${tag}: widget ${card} ${m} ended on ${v} of ${n - 1}`);
      await audit(`${card} ${m}`);
    }
  }
  await audit('end');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file);
  for (const id of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of /.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  for (const [card, ctl] of [...ANIMS, ...WIDGETS]) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval(`#${ctl}-p`, e => e.textContent); if (/Pause/.test(r)) problems.push(`reduced motion: ${card} moved by itself`) }
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
