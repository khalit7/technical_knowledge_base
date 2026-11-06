// The 2026-11-06 rollout checks (Topic: databases): the two 3D stages and the JOIN animation play by themselves once scrolled into view,
// step to their last step, have one step-list item per step, never move under reduced motion; flows stop off screen; the Query plans
// race is a widget and never plays by itself; splits are two columns at 1400 px; no errors, NaN, undefined or sideways scroll.
// usage (from the repo root): node technical_knowledge_base/engineering_foundations/topic_databases/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = ['stg-one', 'stg-write'];
const wait = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const problems = [];
const openJoin = async p => { await p.click('#tabs button[data-t="t-sql"]'); await wait(300); await p.evaluate(() => document.querySelector('#sq-chips button[data-i="2"]').click()); await wait(200) };
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(400);
  const tag = `${scheme} ${width}`;
  const audit = async (where, tab = 't-read') => {
    const r = await p.evaluate(t => ({ bad: (document.getElementById(t).innerText.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) }), tab);
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  const splits = async t => { const c = await p.$$eval(`#${t} .s3sp`, xs => xs.filter(x => x.offsetParent !== null).map(x => getComputedStyle(x).display)); if (!c.length || c.some(d => d !== 'grid')) problems.push(`${tag}: ${t} splits not two columns (${c})`) };
  if (width === 1400) await splits('t-read');
  // autoplay on view
  for (const id of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
  }
  // flows stop off screen: draws do not rise while every stage is out of view
  await p.$eval('#rd-kids', e => e.scrollIntoView({ block: 'start' })); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  // step every stage to its last step; list length; screenshot mid-way
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
    await audit(`${id} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((id, k) => document.getElementById(id).closest('.s3sp').querySelector('ol.sx').children[k].click(), id, k);
  }
  // the SQL playground's JOIN animation: autoplay, both modes, list length, last step
  await openJoin(p);
  if (width === 1400) await splits('t-sql');
  await p.$eval('#sq-joincard', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
  if (!/Pause/.test(await p.$eval('#sq-jctl-p', e => e.textContent))) problems.push(`${tag}: JOIN animation did not play when scrolled into view`);
  for (const m of ['inner', 'left']) {
    await p.$eval(`#sq-jmode button[data-m="${m}"]`, e => e.click()); await wait(100);
    await p.$eval('#sq-jctl-b', e => e.click());
    const n = await p.$eval('#sq-jctl-s', e => +e.max + 1), lis = await p.$eval('#sq-jsx', e => e.children.length);
    if (lis !== n) problems.push(`${tag}: JOIN ${m} has ${n} steps but ${lis} items`);
    for (let k = 1; k < n; k++) { await p.$eval('#sq-jctl-f', e => e.click()); await wait(50);
      if (k === Math.floor(n / 2) && m === 'left') await (await p.$('#sq-joincard')).screenshot({ path: `${shots}/x-join-${scheme}-${width}.png` }) }
    const on = await p.$eval('#sq-jsx', e => [...e.children].findIndex(li => li.classList.contains('on'))); if (on !== n - 1) problems.push(`${tag}: JOIN ${m} list marks ${on}`);
    const last = await p.$eval('#sq-jsx li.on', e => e.innerText); if (!last.includes(m === 'inner' ? 'Done: 5 rows' : 'Done: 6 rows')) problems.push(`${tag}: JOIN ${m} last step says ${last}`);
  }
  await audit('JOIN', 't-sql');
  // Query plans: the race is a widget (opens on the whole run, never plays by itself)
  await p.click('#tabs button[data-t="t-plan"]'); await wait(400);
  if (width === 1400) await splits('t-plan');
  await p.$eval('#qp-anim', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
  if (/Pause/.test(await p.$eval('#qp-actl button[data-a=p]', e => e.textContent))) problems.push(`${tag}: Query plans race played by itself`);
  await audit('plans', 't-plan');
  await p.click('#tabs button[data-t="t-atlas"]'); await wait(400);
  if (width === 1400) await splits('t-atlas');
  await audit('atlas', 't-atlas');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file);
  await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(300);
  for (const id of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !r[1].startsWith('step 1 of')) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  await openJoin(p); await p.$eval('#sq-joincard', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
  if (/Pause/.test(await p.$eval('#sq-jctl-p', e => e.textContent))) problems.push('reduced motion: JOIN animation moved by itself');
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
