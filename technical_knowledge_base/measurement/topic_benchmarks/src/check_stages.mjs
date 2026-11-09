// The 2026-11-06 rollout checks (Topic: benchmarks): the Fig. 1 stage (stg-life) and the "Add one condition at a time" animation (Same model,
// many numbers) play by themselves once scrolled into view, step to their last step, have one step-list item per step (the animation in every
// model and view), and never move under reduced motion; the stage's flows stop off screen; the atlas cutoff sweep and the saturation replay are
// widgets that never play by themselves; splits are two columns at 1400 px in Reading and Same model; no errors, NaN, undefined or sideways
// scroll in any tab at 1400 light, 920 light and 390 dark. Screenshots of the stage mid-step go to the shots dir.
// usage (from the repo root): node technical_knowledge_base/measurement/topic_benchmarks/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const wait = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const problems = [];
const tab = async (p, t) => { await p.click(`#tabs button[data-t="${t}"]`); await wait(500) };
const bad = /.{0,30}\b(NaN|Infinity)\b.{0,30}|.{0,30}\bundefined\b.{0,30}/g;
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(400);
  const tag = `${scheme} ${width}`;
  const audit = async (where, t) => {
    const r = await p.evaluate((t, src) => { const c = document.getElementById(t).cloneNode(true); c.querySelectorAll('pre,code').forEach(x => x.remove());
      return { bad: (c.innerText || c.textContent).match(new RegExp(src, 'g')) || [], side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } }, t, bad.source);
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  const splits = async t => { const c = await p.$$eval(`#${t} .s3sp`, xs => xs.filter(x => x.offsetParent !== null).map(x => getComputedStyle(x).display)); if (!c.length || c.some(d => d !== 'grid')) problems.push(`${tag}: ${t} splits not two columns (${c})`) };
  if (width === 1400) await splits('t-read');
  // the stage: autoplay on view
  const id = 'stg-life';
  await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2600);
  if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
  // flows stop off screen
  await p.$eval('#rd-how', e => e.scrollIntoView({ block: 'start' })); await wait(800);
  const d0 = await p.$eval('#' + id, x => +x.dataset.draws || 0); await wait(1200);
  if ((await p.$eval('#' + id, x => +x.dataset.draws || 0)) !== d0) problems.push(`${tag}: ${id} redrew while off screen`);
  // step it to its last step; list length; a screenshot mid-way and one mid-transition
  await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(300);
  await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
  const n = await p.$eval(`#${id}-r`, e => +e.max + 1);
  const lis = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx'); return l ? l.children.length : 0 });
  if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but ${lis} items`);
  for (let k = 1; k < n; k++) {
    await p.$eval(`#${id}-f`, e => e.click());
    if (k === Math.floor(n / 2)) { await wait(700); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-${scheme}-${width}-glide.png` }); await wait(2400); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-${scheme}-${width}.png` }) }
    else await wait(60);
  }
  await wait(2600);
  const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
  const on = await p.$eval('#' + id, h => [...h.closest('.s3sp').querySelector('ol.sx').children].findIndex(li => li.classList.contains('on'))); if (on !== n - 1) problems.push(`${tag}: ${id} list marks ${on}`);
  await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-${scheme}-${width}-last.png` });
  await p.$$eval('#t-read details', ds => ds.forEach(d => d.open = true)); await audit('reading', 't-read');
  // Same model, many numbers: the animation plays once in view; its list has one item per step in every model and view; a click jumps
  await tab(p, 't-same'); if (width === 1400) await splits('t-same');
  await p.$eval('#sm-an', e => e.scrollIntoView({ block: 'center' })); await wait(4400);
  if (!/Pause/.test(await p.$eval('#sm-play', e => e.textContent)) || (await p.$eval('#sm-scrub', e => +e.value)) < 1) problems.push(`${tag}: sm-an did not play when scrolled into view`);
  if (!(await p.$eval('#sm-an', e => e.dataset.playing === '1'))) problems.push(`${tag}: sm-an has no data-playing while it plays`);
  const tracks = await p.$$eval('#sm-an-tr button', bs => bs.length);
  for (const m of ['step', 'ba']) { await p.$eval(`#sm-an-mode button[data-m="${m}"]`, e => e.click()); await wait(100);
    for (let t = 0; t < tracks; t++) { await p.$eval(`#sm-an-tr button:nth-child(${t + 1})`, e => e.click()); await wait(80);
      const N = await p.$eval('#sm-scrub', e => +e.max + 1), L = await p.$eval('#sm-sx', e => e.children.length);
      if (N !== L) problems.push(`${tag}: sm-an ${m} track ${t}: ${N} steps, ${L} items`);
      await p.$eval(`#sm-sx>li:nth-child(${N})`, e => e.click()); await wait(80);
      if ((await p.$eval('#sm-scrub', e => +e.value)) !== N - 1) problems.push(`${tag}: sm-an ${m} track ${t}: list click did not jump`);
      if (/Pause/.test(await p.$eval('#sm-play', e => e.textContent))) problems.push(`${tag}: sm-an still playing after a control`);
      if (m === 'step' && t === 0) { await p.$eval('#sm-sx>li:nth-child(3)', e => e.click()); await wait(1000); await (await p.evaluateHandle(() => document.getElementById('sm-an').closest('.s3sp'))).screenshot({ path: `${shots}/x-sm-an-${scheme}-${width}.png` }) }
    } }
  await audit('t-same', 't-same');
  // the atlas sweep and the saturation replay are widgets: they never play by themselves
  await tab(p, 't-atlas'); const a0 = await p.$eval('#at-scrub', e => +e.value); await p.$eval('#at-lanes', e => e.scrollIntoView({ block: 'center' })); await wait(2500);
  if ((await p.$eval('#at-scrub', e => +e.value)) !== a0 || /Pause/.test(await p.$eval('#at-play', e => e.textContent))) problems.push(`${tag}: the atlas sweep moved by itself`);
  await audit('t-atlas', 't-atlas');
  await tab(p, 't-sat'); await wait(600); const s0 = await p.$eval('#sa-scrub', e => +e.value); await p.$eval('#sa-anim', e => e.scrollIntoView({ block: 'center' })); await wait(2000);
  if ((await p.$eval('#sa-scrub', e => +e.value)) !== s0) problems.push(`${tag}: the saturation replay moved by itself`);
  await audit('t-sat', 't-sat');
  await tab(p, 't-more'); await audit('t-more', 't-more');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file);
  await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(300);
  await p.$eval('#stg-life', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
  const r = await p.$eval('#stg-life', e => [+e.dataset.frames || 0, +e.dataset.draws || 0, e.querySelector('.stg-st').textContent]);
  await wait(1000); const d = await p.$eval('#stg-life', e => +e.dataset.draws || 0);
  if (r[0] > 0 || !r[2].startsWith('step 1 of') || d !== r[1]) problems.push(`reduced motion: stg-life moved by itself (${r}, draws ${d})`);
  await tab(p, 't-same'); await p.$eval('#sm-an', e => e.scrollIntoView({ block: 'center' })); await wait(4400);
  if (/Pause/.test(await p.$eval('#sm-play', e => e.textContent)) || (await p.$eval('#sm-scrub', e => +e.value)) !== 0) problems.push('reduced motion: sm-an moved by itself');
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
