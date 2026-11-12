// The 2026-11-06 rollout checks (Topic: inference-and-serving): the hero stage (Fig. 1) and the three explained step animations
// (Reading: the request lifecycle, Fig. 2; prefill against decode in both modes, Fig. 3; Capacity planner: one setting changed, in
// all three modes) play by themselves once scrolled into view, step to their last step, have one step-list item per step in every
// mode, and never move under reduced motion; the stage's flows stop off screen; the Engine bench replay (five explained stretches of
// a recorded run) plays on view, has one item per stretch, ends on its last stretch, and under reduced motion opens finished and
// still; splits are two columns at 1400 px; no errors, NaN, undefined or sideways scroll.
// usage (from the repo root): node technical_knowledge_base/systems_and_performance/topic_inference_and_serving/src/check_stages.mjs [shots dir]
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
const ANIMS = [['t-read', 'rd-life-card', 'rd-life-ctl', null, [[null, 'sx-life']]],
  ['t-read', 'rd-pd-card', 'rd-pd-ctl', 'rd-pd-mode', [['pre', 'sx-pd-pre'], ['dec', 'sx-pd-dec']]],
  ['t-plan', 'pln-ancard', 'pln-anctl', 'pln-anseg', [['fmt', 'pln-ansx'], ['kv', 'pln-ansx'], ['tp', 'pln-ansx']]]];
// the Engine bench replay: [tab, card, controller, step list]
const REPLAY = ['t-bench', 'bch-str-card', 'bch-str-ctl', 'bch-str-sx'];
const SPLIT_TABS = ['t-read', 't-bench', 't-plan'];
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
    const r = await p.evaluate(t => ({ bad: (document.getElementById(t).innerText.match(/.{0,30}\b(NaN|undefined|Infinity(?! Fabric| Cache))\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) }), t);
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
  await p.$eval('#rd-s12', e => e.scrollIntoView({ block: 'start' })); await wait(800);
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
  // the bench replay: plays on view, one list item per stretch, steps to its last stretch
  { const [t, card, ctl, list] = REPLAY; await tab(p, t); if (width === 1400) await splits(t);
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1600);
    if (!/Pause/.test(await p.$eval(`#${ctl}-p`, e => e.textContent))) problems.push(`${tag}: ${card} did not play when scrolled into view`);
    const n = await p.$eval(`#${ctl}-s`, e => +e.max + 1), lis = await p.$eval('#' + list, e => e.children.length);
    if (lis !== n) problems.push(`${tag}: ${card} has ${n} stretches but ${lis} items`);
    await p.$eval(`#${ctl}-b`, e => e.click());
    for (let k = 1; k < n + 1; k++) { await p.$eval(`#${ctl}-f`, e => e.click()); await wait(40);
      if (k === 2) { await wait(300); await (await p.$('#' + card)).screenshot({ path: `${shots}/x-${card}-${scheme}-${width}.png` }) } }
    const on = await p.$eval('#' + list, e => [...e.children].findIndex(li => li.classList.contains('on'))); if (on !== n - 1) problems.push(`${tag}: ${card} list marks ${on}`);
    if (/Pause/.test(await p.$eval(`#${ctl}-p`, e => e.textContent))) problems.push(`${tag}: ${card} still playing after a reader control`);
    await audit(card, t);
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
  { const [t, card, ctl] = REPLAY; await p.click(`#tabs button[data-t="${t}"]`); await wait(500);
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval(`#${ctl}-s`, e => [+e.value, +e.max]);
    if (/Pause/.test(await p.$eval(`#${ctl}-p`, e => e.textContent)) || r[0] !== r[1]) problems.push(`reduced motion: ${card} moved by itself or did not open finished (${r})`) }
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
