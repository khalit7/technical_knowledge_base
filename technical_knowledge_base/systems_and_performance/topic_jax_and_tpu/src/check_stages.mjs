// The 2026-11-06 rollout checks (Topic: jax-and-tpu): the hero stage (Fig. 1, the map) and the seven explained step animations
// (Reading: four calls, eager against jit; Compiler lab: five forms, fusion, the caches; Training lab: nnx.split, a checkpoint resume;
// Tool map: 2023 to 2026) play by themselves once scrolled into view, step to their last step, have one step-list item per step and
// never move under reduced motion; the stage's flows stop off screen; the five long replays the reader drives (Transforms lab: the
// trace and vmap; Training lab: the twins' curves; Sharding lab: the ring; TPU and Pallas lab: the grid) never play by themselves and
// open on their informative frame; splits are two columns at 1400 px; no errors, NaN, undefined or sideways scroll.
// Prose mentions are whitelisted: the TPU and Pallas lab's "output full of NaN (uninitialised buffer shows)" and "NaN on CPU".
// usage (from the repo root): node technical_knowledge_base/systems_and_performance/topic_jax_and_tpu/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = ['stg-hero'];
// [tab, card id, controller id, mode buttons (or null), [[mode, list id], ...]]
const ANIMS = [['t-read', 'rd-tr-card', 'rd-tr-ctl', null, [[null, 'sx-tr']]],
  ['t-xla', 'xc-pipe-card', 'xc-pipe-ctl', null, [[null, 'sx-xc-pipe']]],
  ['t-xla', 'xc-fz-card', 'xc-fz-ctl', null, [[null, 'sx-xc-fz']]],
  ['t-xla', 'xc-cc-card', 'xc-cc-ctl', null, [[null, 'sx-xc-cc']]],
  ['t-train', 'tr-split-card', 'tr-split-ctl', null, [[null, 'sx-tr-split']]],
  ['t-train', 'tr-ck-card', 'tr-ck-ctl', null, [[null, 'sx-tr-ck']]],
  ['t-map', 'tm-anim', 'tm-actl', null, [[null, 'sx-tm']]]];
// the long replays (rollout rule 3b): [tab, [[card, controller, the step it opens on: 'last' or a number], ...]]
const WIDGETS = [['t-xf', [['xf-tr-card', 'xf-tr-ctl', 'last'], ['xf-vm-card', 'xf-vm-ctl', 'last']]], ['t-train', [['tr-twin-card', 'tr-twin-ctl', 'last']]],
  ['t-shard', [['sh-ring-card', 'sh-ring-ctl', 0]]], ['t-tpu', [['tp-gr-card', 'tp-gr-ctl', 0]]]];
const SPLIT_TABS = ['t-read', 't-xf', 't-xla', 't-train', 't-shard', 't-tpu', 't-map'];
const wait = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const problems = [];
const tab = async (p, t) => { await p.click(`#tabs button[data-t="${t}"]`); await wait(500) };
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(400);
  const tag = `${scheme} ${width}`;
  const audit = async (where, t) => {
    const r = await p.evaluate(t => ({ bad: (document.getElementById(t).innerText.match(/.{0,30}\b((?<!full of )NaN(?! \(uninit| on CPU)|undefined|Infinity(?! Fabric| Cache))\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) }), t);
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  const splits = async t => { const c = await p.$$eval(`#${t} .s3sp`, xs => xs.filter(x => x.offsetParent !== null).map(x => getComputedStyle(x).display)); if (!c.length || c.some(d => d !== 'grid')) problems.push(`${tag}: ${t} splits not two columns (${c})`) };
  if (width === 1400) await splits('t-read');
  // the hero stage: autoplay on view
  for (const id of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
  }
  // flows stop off screen
  await p.$eval('#rd-kids', e => e.scrollIntoView({ block: 'start' })); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  // step the stage to its last step; list length; screenshot mid-way
  for (const id of STAGES) {
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1);
    const lis = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx'); return l ? l.children.length : 0 });
    if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but ${lis} items`);
    for (let k = 1; k < n; k++) {
      await p.$eval(`#${id}-f`, e => e.click()); await wait(60);
      if (k === Math.floor(n / 2)) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2600); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-${scheme}-${width}.png` }) }
    }
    await wait(2000);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
    const on = await p.$eval('#' + id, h => [...h.closest('.s3sp').querySelector('ol.sx').children].findIndex(li => li.classList.contains('on'))); if (on !== n - 1) problems.push(`${tag}: ${id} list marks ${on}`);
    await audit(`${id} last step`, 't-read');
  }
  // the explained step animations: autoplay on view, every mode stepped to its end, one list item per step
  let cur = 't-read';
  for (const [t, card, ctl, seg, modes] of ANIMS) {
    if (t !== cur) { await tab(p, t); cur = t; if (width === 1400 && SPLIT_TABS.includes(t)) await splits(t) }
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1600);
    if (!/Pause/.test(await p.$eval(`#${ctl}-p`, e => e.textContent))) problems.push(`${tag}: ${card} did not play when scrolled into view`);
    for (const [m, list] of modes) {
      if (seg) { await p.$eval(`#${seg} button[data-m="${m}"]`, e => e.click()); await wait(100) }
      await p.$eval(`#${ctl}-b`, e => e.click());
      const n = await p.$eval(`#${ctl}-s`, e => +e.max + 1), lis = await p.$eval('#' + list, e => e.children.length);
      const vis = await p.$eval('#' + list, e => !e.hidden && e.offsetParent !== null);
      if (lis !== n) problems.push(`${tag}: ${card} ${m} has ${n} steps but ${lis} items`);
      if (!vis) problems.push(`${tag}: ${card} ${m} list hidden`);
      for (let k = 1; k < n; k++) { await p.$eval(`#${ctl}-f`, e => e.click()); await wait(40);
        if (k === Math.floor(n / 2) && m === modes[modes.length - 1][0]) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(700); await (await p.$('#' + card)).screenshot({ path: `${shots}/x-${card}-${scheme}-${width}.png` }) } }
      const on = await p.$eval('#' + list, e => [...e.children].findIndex(li => li.classList.contains('on'))); if (on !== n - 1) problems.push(`${tag}: ${card} ${m} list marks ${on}`);
    }
    await audit(card, t);
  }
  // the replays the reader drives never play by themselves, and open on their finished frame
  for (const [t, ws] of WIDGETS) {
    await tab(p, t); if (width === 1400 && SPLIT_TABS.includes(t)) await splits(t);
    for (const [card, ctl, open] of ws) {
      await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      if (/Pause/.test(await p.$eval(`#${ctl}-p`, e => e.textContent))) problems.push(`${tag}: ${card} played by itself`);
      const [v, mx] = await p.$eval(`#${ctl}-s`, e => [+e.value, +e.max]); const want = open === 'last' ? mx : open;
      if (v !== want) problems.push(`${tag}: ${card} opens at ${v}, not ${want}`);
      for (let k = 0; k < Math.min(mx, 12); k++) { await p.$eval(`#${ctl}-f`, e => e.click()); await wait(30) }
      await p.$eval(`#${ctl}-p`, e => e.click()); await wait(300); await p.$eval(`#${ctl}-p`, e => e.click());
    }
    await audit(t, t);
  }
  await tab(p, 't-more'); await audit('more', 't-more');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file);
  await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(300);
  for (const id of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, +e.dataset.draws || 0, e.querySelector('.stg-st').textContent]);
    await wait(1000); const d = await p.$eval('#' + id, e => +e.dataset.draws || 0);
    if (r[0] > 0 || !r[2].startsWith('step 1 of') || d !== r[1]) problems.push(`reduced motion: ${id} moved by itself (${r}, draws ${d})`) }
  let cur = 't-read';
  for (const [t, card, ctl] of ANIMS) { if (t !== cur) { await p.click(`#tabs button[data-t="${t}"]`); await wait(500); cur = t }
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    if (/Pause/.test(await p.$eval(`#${ctl}-p`, e => e.textContent)) || (await p.$eval(`#${ctl}-s`, e => +e.value)) !== 0) problems.push(`reduced motion: ${card} moved by itself`) }
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
