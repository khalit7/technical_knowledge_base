// The 2026-11-06 rollout checks (Topic: evaluation-and-llm-judges): the Fig. 1 stage (stg-layers) and the Fig. 2 attribution animation
// (rd-att-card) play by themselves once scrolled into view, step to their last step, have one step-list item per step (the animation for
// every benchmark), stop on a reader control and never move under reduced motion; the stage's flows stop off screen; splits are two columns
// at 1400 px in Reading; no errors, NaN, undefined or sideways scroll in any tab at 1400 light, 920 light and 390 dark.
// Screenshots of every stage step (arrived, and mid-glide) go to the shots dir.
// usage (from the repo root): node technical_knowledge_base/measurement/topic_evaluation_and_llm_judges/src/check_stages.mjs [shots dir]
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
  if (width === 1400) { const c = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display)); if (c.length !== 3 || c.some(d => d !== 'grid')) problems.push(`${tag}: reading splits not two columns (${c})`) }
  // ---- the stage: autoplay on view ----
  const id = 'stg-layers';
  await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2600);
  if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
  // flows stop off screen
  await p.$eval('#rd-choose', e => e.scrollIntoView({ block: 'start' })); await wait(800);
  const d0 = await p.$eval('#' + id, x => +x.dataset.draws || 0); await wait(1200);
  if ((await p.$eval('#' + id, x => +x.dataset.draws || 0)) !== d0) problems.push(`${tag}: ${id} redrew while off screen`);
  // step it to its last step; list length; a screenshot of every step, arrived and mid-glide
  await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(300);
  await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id); await wait(400);
  const n = await p.$eval(`#${id}-r`, e => +e.max + 1);
  const lis = await p.$eval('#sx-layers', l => l.children.length);
  if (lis !== n || n !== 7) problems.push(`${tag}: ${id} has ${n} steps but ${lis} items`);
  const shoot = width !== 920;
  if (shoot) await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-${scheme}-${width}-s1.png` });
  for (let k = 1; k < n; k++) {
    await p.$eval(`#${id}-f`, e => e.click());
    if (shoot) { await wait(650); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-${scheme}-${width}-s${k + 1}-glide.png` }); await wait(1800);
      await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-${scheme}-${width}-s${k + 1}.png` }) }
    else await wait(80);
  }
  await wait(2200);
  const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
  const on = await p.$eval('#sx-layers', l => [...l.children].findIndex(li => li.classList.contains('on'))); if (on !== n - 1) problems.push(`${tag}: ${id} list marks ${on}`);
  // a list click jumps there and the stage stays put
  await p.$eval('#sx-layers>li:nth-child(3)', e => e.click()); await wait(2400);
  if ((await p.$eval(`#${id} .stg-st`, e => e.textContent)) !== `step 3 of ${n}`) problems.push(`${tag}: ${id} list click did not hold step 3`);
  // ---- Fig. 2, the attribution animation: plays on view, list per benchmark, a control stops it ----
  await p.$eval('#rd-att-card', e => e.scrollIntoView({ block: 'center' })); await wait(1800);
  if (!/Pause/.test(await p.$eval('#rd-att-ctl-p', e => e.textContent))) problems.push(`${tag}: rd-att did not play when scrolled into view`);
  for (const bm of ['all', 'HLE-Physics', 'PRISM-Physics', 'PHYBench', 'UGPhysics']) {
    await p.select('#rd-att-b', bm); await wait(150);
    const N = await p.$eval('#rd-att-ctl-s', e => +e.max + 1), L = await p.$eval('#sx-att', e => e.children.length);
    if (N !== L) problems.push(`${tag}: rd-att ${bm}: ${N} steps, ${L} items`);
    const t = await p.$eval('#sx-att', e => e.innerText); const want = await p.evaluate(bm => String(window.RD_CHECK.attr[bm].n), bm);
    if (!t.includes(want + ' answers')) problems.push(`${tag}: rd-att ${bm}: list not rewritten`);
    await p.$eval(`#sx-att>li:nth-child(${N})`, e => e.click()); await wait(100);
    if ((await p.$eval('#rd-att-ctl-s', e => +e.value)) !== N - 1) problems.push(`${tag}: rd-att ${bm}: list click did not jump`);
    if (/Pause/.test(await p.$eval('#rd-att-ctl-p', e => e.textContent))) problems.push(`${tag}: rd-att still playing after a control`);
  }
  await p.select('#rd-att-b', 'all'); await wait(150); await p.$eval('#sx-att>li:nth-child(3)', e => e.click()); await wait(300);
  if (shoot) await (await p.evaluateHandle(() => document.getElementById('rd-att-card').closest('.s3sp'))).screenshot({ path: `${shots}/x-rd-att-${scheme}-${width}.png` });
  await p.$$eval('#t-read details', ds => ds.forEach(d => d.open = true)); await audit('reading', 't-read');
  // the atlas has no animation: nothing to autoplay; audit its text
  await tab(p, 't-judges'); await audit('t-judges', 't-judges');
  await tab(p, 't-more'); await audit('t-more', 't-more');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file);
  await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(300);
  await p.$eval('#stg-layers', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
  const r = await p.$eval('#stg-layers', e => [+e.dataset.frames || 0, +e.dataset.draws || 0, e.querySelector('.stg-st').textContent]);
  await wait(1000); const d = await p.$eval('#stg-layers', e => +e.dataset.draws || 0);
  if (r[0] > 0 || !r[2].startsWith('step 1 of') || d !== r[1]) problems.push(`reduced motion: stg-layers moved by itself (${r}, draws ${d})`);
  await p.$eval('#rd-att-card', e => e.scrollIntoView({ block: 'center' })); await wait(3000);
  if (/Pause/.test(await p.$eval('#rd-att-ctl-p', e => e.textContent)) || (await p.$eval('#rd-att-ctl-s', e => +e.value)) !== 0) problems.push('reduced motion: rd-att moved by itself');
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
