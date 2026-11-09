// The 2026-11-06 rollout checks (Topic: generative-and-multimodal): the Fig. 1 stage (stg-fam) plays by itself once scrolled into view,
// has one step-list item per step, steps to its last step and stops on a reader control; its flows stop off screen; the numbers its step
// list quotes match the scene's own arithmetic (window.GMF); the VLM lab pipeline and the Model map stack play once in view and stop on a
// control; the Model map timeline is a widget that never plays by itself; nothing moves under reduced motion; the three Reading splits are
// two columns at 1400 px; no errors, NaN, undefined or sideways scroll in any tab at 1400 light, 920 light and 390 dark.
// Screenshots of every stage step (arrived, and mid-glide) at 1400 light and 390 dark go to the shots dir.
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_generative_and_multimodal/src/check_stages.mjs [shots dir]
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
const LABS = [['t-vlm', 'vl-pipe', 'vl-pipe-ctl'], ['t-map', 'mm-stack-card', 'mm-st-ctl']];
const WIDGETS = [['t-map', 'mm-time-card', 'mm-tl-ctl']];
const TABS = ['t-read', 't-vision', 't-vlm', 't-map', 't-more'];
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const problems = [];
const tab = async (p, t) => { await p.click(`#tabs button[data-t="${t}"]`); await wait(500) };
const bad = /.{0,30}\b(NaN|Infinity)\b.{0,30}|.{0,30}\bundefined\b.{0,30}/g;
const playing = (p, ctl) => p.$eval(`#${ctl}-p`, e => /Pause/.test(e.textContent));
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(400);
  const tag = `${scheme} ${width}`;
  const audit = async (where, t) => {
    const r = await p.evaluate((t, src) => { const c = document.getElementById(t).cloneNode(true); c.querySelectorAll('pre,code').forEach(x => x.remove());
      const txt = c.innerText || c.textContent;
      return { bad: txt.match(new RegExp(src, 'g')) || [], side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } }, t, bad.source);
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  if (width === 1400) { const c = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display)); if (c.length !== 3 || c.some(d => d !== 'grid')) problems.push(`${tag}: reading splits not two columns (${c})`) }
  // ---- the numbers the step list quotes, against the scene's arithmetic ----
  if (width === 1400) {
    const r = await p.evaluate(() => { const G = window.GMF, t = [...document.querySelectorAll('#sx-fam>li')].map(li => li.textContent.replace(/\s+/g, ' '));
      return { t, calls: G.calls, img25: Math.round(100 * G.imgVar(25)), fl4: Math.round(100 * G.flowVar(4)) } });
    const need = [[3, '49 tokens, one call each'], [3, '1,024 calls'], [4, '50 steps'], [4, `after 25 of the 50 calls it is still only ${r.img25}% image by variance`], [5, '8 Euler steps'],
      [5, `after 4 of the 8 calls the frame is already half image (${r.fl4}% by variance)`], [6, r.calls.join(', ').replace(/, (\d+)$/, ' and $1')], [6, r.calls.slice(2).map(x => 2 * x).join(', ').replace(/, (\d+)$/, ' and $1')], [1, '1 call'], [2, '1 call']];
    for (const [i, s] of need) if (!r.t[i - 1] || !r.t[i - 1].includes(s)) problems.push(`sx-fam item ${i} lacks "${s}"`);
    if (r.img25 !== 8 || r.fl4 !== 50) problems.push(`GMF shares changed: ${r.img25}, ${r.fl4}`);
  }
  // ---- the stage: autoplay on view ----
  const id = 'stg-fam';
  await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2600);
  if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
  await p.$eval('#rd-s5', e => e.scrollIntoView({ block: 'start' })); await wait(800);
  const d0 = await p.$eval('#' + id, x => +x.dataset.draws || 0); await wait(1200);
  if ((await p.$eval('#' + id, x => +x.dataset.draws || 0)) !== d0) problems.push(`${tag}: ${id} redrew while off screen`);
  await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(300);
  await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id); await wait(400);
  const n = await p.$eval(`#${id}-r`, e => +e.max + 1);
  const lis = await p.$eval('#sx-fam', l => l.children.length);
  if (lis !== n || n !== 10) problems.push(`${tag}: ${id} has ${n} steps but ${lis} items`);
  const shoot = width !== 920;
  if (shoot) await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-${scheme}-${width}-s1.png` });
  for (let k = 1; k < n; k++) {
    await p.$eval(`#${id}-f`, e => e.click());
    if (shoot) { await wait(900); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-${scheme}-${width}-s${k + 1}-glide.png` }); await wait(2300);
      await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-${scheme}-${width}-s${k + 1}.png` }) }
    else await wait(80);
  }
  await wait(2800);
  const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
  const on = await p.$eval('#sx-fam', l => [...l.children].findIndex(li => li.classList.contains('on'))); if (on !== n - 1) problems.push(`${tag}: ${id} list marks ${on}`);
  await p.$eval('#sx-fam>li:nth-child(3)', e => e.click()); await wait(3200);
  if ((await p.$eval(`#${id} .stg-st`, e => e.textContent)) !== `step 3 of ${n}`) problems.push(`${tag}: ${id} list click did not hold step 3`);
  // ---- the cost calculator: every control changes the readout without NaN ----
  for (const [sel, v] of [['#rd-c-res', '1024'], ['#rd-c-ch', '16'], ['#rd-c-steps', '4'], ['#rd-c-cfg', '0']]) { await p.select(sel, v); await wait(50) }
  const cost = await p.$eval('#rd-c-out', e => e.textContent); if (!/4,096/.test(cost) || !/25/.test(cost)) problems.push(`${tag}: calculator readout unexpected: ${cost.slice(0, 120)}`);
  await p.$$eval('#t-read details', ds => ds.forEach(d => d.open = true)); await audit('reading', 't-read');
  // ---- the lab animations: play once in view, stop on a control; the timeline widget never plays by itself ----
  for (const t of TABS.slice(1)) {
    await tab(p, t);
    for (const [tt, card, ctl] of LABS.filter(x => x[0] === t)) {
      await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      if (!(await playing(p, ctl))) problems.push(`${tag}: ${card} did not play when scrolled into view`);
      await p.$eval(`#${ctl}-f`, e => e.click()); await wait(100);
      if (await playing(p, ctl)) problems.push(`${tag}: ${card} still playing after a control`);
      const v = await p.$eval(`#${ctl}-s`, e => +e.value); await wait(4800);
      if ((await p.$eval(`#${ctl}-s`, e => +e.value)) !== v) problems.push(`${tag}: ${card} moved after a control`);
    }
    for (const [tt, card, ctl] of WIDGETS.filter(x => x[0] === t)) {
      await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); const v = await p.$eval(`#${ctl}-s`, e => +e.value); await wait(2500);
      if ((await playing(p, ctl)) || (await p.$eval(`#${ctl}-s`, e => +e.value)) !== v) problems.push(`${tag}: widget ${card} moved by itself`);
      if (v !== (await p.$eval(`#${ctl}-s`, e => +e.max))) problems.push(`${tag}: widget ${card} does not open on its last frame`);
    }
    await p.$$eval(`#${t} details`, ds => ds.forEach(d => d.open = true)); await audit(t, t);
  }
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file);
  await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(300);
  await p.$eval('#stg-fam', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
  const r = await p.$eval('#stg-fam', e => [+e.dataset.frames || 0, +e.dataset.draws || 0, e.querySelector('.stg-st').textContent]);
  await wait(1000); const d = await p.$eval('#stg-fam', e => +e.dataset.draws || 0);
  if (r[0] > 0 || !r[2].startsWith('step 1 of') || d !== r[1]) problems.push(`reduced motion: stg-fam moved by itself (${r}, draws ${d})`);
  for (const t of TABS.slice(1)) {
    await tab(p, t);
    for (const [tt, card, ctl] of [...LABS, ...WIDGETS].filter(x => x[0] === t)) {
      await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); const v = await p.$eval(`#${ctl}-s`, e => +e.value); await wait(2000);
      if ((await playing(p, ctl)) || (await p.$eval(`#${ctl}-s`, e => +e.value)) !== v) problems.push(`reduced motion: ${card} moved by itself`);
    }
  }
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
