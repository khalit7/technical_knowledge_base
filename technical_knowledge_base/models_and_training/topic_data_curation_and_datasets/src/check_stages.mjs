// The 2026-11-06 rollout checks (Topic: data-curation-and-datasets): the Fig. 1 stage (stg-pipe) and the Fig. 3 page stepper (rd-page-card)
// play by themselves once scrolled into view, step to their last step, have one step-list item per step and stop on a reader control;
// the stage's flows stop off screen; every lab animation plays once in view and stops on a control, except the Tool map's lineage by
// year (a widget that never plays by itself); nothing moves under reduced motion; the Reading splits are two columns at 1400 px; no errors,
// NaN, undefined or sideways scroll in any tab at 1400 light, 920 light and 390 dark. Screenshots of every stage step (arrived, and
// mid-glide) go to the shots dir.
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_data_curation_and_datasets/src/check_stages.mjs [shots dir]
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
const LABS = [['t-pipe', 'pip-fun-card', 'pip-fun-ctl'], ['t-pipe', 'pip-ex-card', 'pip-ex-ctl'], ['t-pipe', 'pip-pii-view', 'pip-pii-ctl'],
  ['t-dedup', 'dd-show-card', 'dd-show-ctl'], ['t-dedup', 'dd-sa-card', 'dd-sa-ctl'], ['t-qual', 'q-shard-card', 'q-shard-ctl'],
  ['t-mix', 'mx-st-card', 'mx-st-ctl'], ['t-post', 'pt-fcard', 'pt-fctl'], ['t-post', 'pt-rcard', 'pt-rctl'], ['t-map', 'tm-tcard', 'tm-tctl']];
const WIDGETS = [['t-map', 'tm-lcard', 'tm-lctl']];
const TABS = ['t-read', 't-pipe', 't-dedup', 't-qual', 't-mix', 't-post', 't-map', 't-more'];
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
      const txt = (c.innerText || c.textContent).replace(/Encountered NaN/g, ''); // a quoted fastText error message on the Quality lab
      return { bad: txt.match(new RegExp(src, 'g')) || [], side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } }, t, bad.source);
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  if (width === 1400) { const c = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display)); if (c.length !== 5 || c.some(d => d !== 'grid')) problems.push(`${tag}: reading splits not two columns (${c})`) }
  // ---- the stage: autoplay on view ----
  const id = 'stg-pipe';
  await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2600);
  if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
  await p.$eval('#rd-s4', e => e.scrollIntoView({ block: 'start' })); await wait(800);
  const d0 = await p.$eval('#' + id, x => +x.dataset.draws || 0); await wait(1200);
  if ((await p.$eval('#' + id, x => +x.dataset.draws || 0)) !== d0) problems.push(`${tag}: ${id} redrew while off screen`);
  await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(300);
  await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id); await wait(400);
  const n = await p.$eval(`#${id}-r`, e => +e.max + 1);
  const lis = await p.$eval('#sx-pipe', l => l.children.length);
  if (lis !== n || n !== 10) problems.push(`${tag}: ${id} has ${n} steps but ${lis} items`);
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
  const on = await p.$eval('#sx-pipe', l => [...l.children].findIndex(li => li.classList.contains('on'))); if (on !== n - 1) problems.push(`${tag}: ${id} list marks ${on}`);
  await p.$eval('#sx-pipe>li:nth-child(3)', e => e.click()); await wait(2400);
  if ((await p.$eval(`#${id} .stg-st`, e => e.textContent)) !== `step 3 of ${n}`) problems.push(`${tag}: ${id} list click did not hold step 3`);
  // ---- Fig. 3, the page stepper: plays on view, one list item per step, a list click jumps and stops it ----
  await p.$eval('#rd-page-card', e => e.scrollIntoView({ block: 'center' })); await wait(1800);
  if (!(await playing(p, 'rd-page-ctl'))) problems.push(`${tag}: rd-page did not play when scrolled into view`);
  for (const m of ['wet', 'traf', 'res']) {
    await p.click(`#rd-page-mode [data-m="${m}"]`); await wait(100);
    const N = await p.$eval('#rd-page-ctl-s', e => +e.max + 1), L = await p.$eval('#sx-page', e => e.children.length);
    if (N !== L || N !== 9) problems.push(`${tag}: rd-page ${m}: ${N} steps, ${L} items`);
  }
  await p.$eval('#sx-page>li:nth-child(9)', e => e.click()); await wait(150);
  if ((await p.$eval('#rd-page-ctl-s', e => +e.value)) !== 8) problems.push(`${tag}: rd-page list click did not jump`);
  if (await playing(p, 'rd-page-ctl')) problems.push(`${tag}: rd-page still playing after a list click`);
  if (shoot) { await p.$eval('#sx-page>li:nth-child(5)', e => e.click()); await wait(300);
    await (await p.evaluateHandle(() => document.getElementById('rd-page-card').closest('.s3sp'))).screenshot({ path: `${shots}/x-rd-page-${scheme}-${width}.png` }) }
  await p.$$eval('#t-read details', ds => ds.forEach(d => d.open = true)); await audit('reading', 't-read');
  // ---- the lab animations: play once in view, stop on a control; the lineage widget never plays by itself ----
  for (const t of TABS.slice(1)) {
    await tab(p, t);
    for (const [tt, card, ctl] of LABS.filter(x => x[0] === t)) {
      await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      if (!(await playing(p, ctl))) problems.push(`${tag}: ${card} did not play when scrolled into view`);
      await p.$eval(`#${ctl}-f`, e => e.click()); await wait(100);
      if (await playing(p, ctl)) problems.push(`${tag}: ${card} still playing after a control`);
      const v = await p.$eval(`#${ctl}-s`, e => +e.value); await wait(4500);
      if ((await p.$eval(`#${ctl}-s`, e => +e.value)) !== v) problems.push(`${tag}: ${card} moved after a control`);
    }
    for (const [tt, card, ctl] of WIDGETS.filter(x => x[0] === t)) {
      await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); const v = await p.$eval(`#${ctl}-s`, e => +e.value); await wait(2500);
      if ((await playing(p, ctl)) || (await p.$eval(`#${ctl}-s`, e => +e.value)) !== v) problems.push(`${tag}: widget ${card} moved by itself`);
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
  await p.$eval('#stg-pipe', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
  const r = await p.$eval('#stg-pipe', e => [+e.dataset.frames || 0, +e.dataset.draws || 0, e.querySelector('.stg-st').textContent]);
  await wait(1000); const d = await p.$eval('#stg-pipe', e => +e.dataset.draws || 0);
  if (r[0] > 0 || !r[2].startsWith('step 1 of') || d !== r[1]) problems.push(`reduced motion: stg-pipe moved by itself (${r}, draws ${d})`);
  await p.$eval('#rd-page-card', e => e.scrollIntoView({ block: 'center' })); await wait(3000);
  if ((await playing(p, 'rd-page-ctl')) || (await p.$eval('#rd-page-ctl-s', e => +e.value)) !== 0) problems.push('reduced motion: rd-page moved by itself');
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
