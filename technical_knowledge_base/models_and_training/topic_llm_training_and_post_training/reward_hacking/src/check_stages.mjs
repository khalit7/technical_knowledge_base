// The 2026-11-06 rollout checks for Reward Hacking (2026-11-10), adapted from PEFT's check_stages.mjs:
// the three 3D stages (Fig. 1 one riddle under best-of-n, Fig. 2 where each coding hack cuts into the reward, Fig. 3 what the policy can reach)
// and the two 2D transcript animations (the buggy test, the chain-of-thought monitor; RD.anim) play by themselves once scrolled into view,
// step to their last step with one step-list item per step, stop redrawing off screen and never move under reduced motion; a mode toggle replays;
// no errors, NaN, undefined or sideways scroll; splits are two columns at 1400 px and one below 1100 px; the best-of-n numbers written in the
// step list as static text equal the page's data, and the data equals recompute.py's output (inputs/derived.json).
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_llm_training_and_post_training/reward_hacking/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const html = path.resolve(here, '../index.html'), file = 'file://' + html, shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = [['stg-bon', 'sx-bon'], ['stg-tests', 'sx-tests'], ['stg-reach', 'sx-reach']];
const ANIMS = [['tr', 'trC', 'sx-tr', '#trM button'], ['cm', 'cmC', 'sx-cm', '#cmM button']];
const wait = ms => new Promise(r => setTimeout(r, ms));
const problems = [];
// the static numbers in the best-of-n step list, as written in index.html before any script runs, against recompute.py's output
const raw = fs.readFileSync(html, 'utf8'), derived = JSON.parse(fs.readFileSync(path.resolve(here, 'inputs/derived.json'), 'utf8'));
const fmt = v => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2);
const spans = [...raw.matchAll(/<span data-bx="([pg])(\d)">(.*?)<\/span>/g)];
if (spans.length !== 14) problems.push(`expected 14 best-of-n spans in the step list, found ${spans.length}`);
for (const [, k, i, v] of spans) { const want = fmt(derived.BON_EX[+i][k === 'p' ? 'proxy' : 'gold']); if (v !== want) problems.push(`step list ${k}${i}: static "${v}", recompute.py gives "${want}"`) }
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
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (cols.length < 12 || cols.some(c => c !== 'grid'))) problems.push(`${tag}: a split is not two columns (${cols.length}: ${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  if (width === 1400) {
    const over = await p.$$eval('#t-read .s3R', xs => xs.map(x => { const r = x.getBoundingClientRect(), k = x.firstElementChild && x.firstElementChild.getBoundingClientRect(); return k && (k.right > r.right + 1 || k.left < r.left - 1) ? x.innerHTML.slice(0, 40) : '' }).filter(Boolean));
    over.forEach(o => problems.push(`${tag}: right-column content wider than its column: ${o}`));
    // the page's embedded data is recompute.py's
    const live = await p.evaluate(() => [JSON.stringify(RHD.BON_EX), [...document.querySelectorAll('[data-bx]')].map(e => e.textContent).join()]);
    if (live[0] !== JSON.stringify(derived.BON_EX)) problems.push('RHD.BON_EX differs from inputs/derived.json');
    if (live[1] !== spans.map(s => s[3]).join()) problems.push(`the scene rewrote the step-list numbers differently: ${live[1]}`);
  }
  for (const [id] of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
    if (shoot) { await wait(300); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-autoplay-${scheme}-${width}.png` }) }
  }
  for (const [card, ctl] of ANIMS) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const lab = await p.$eval(`#${ctl}-p`, e => e.getAttribute('aria-label')); if (lab !== 'Pause') problems.push(`${tag}: ${card} did not play when scrolled into view (${lab})`);
  }
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  const stepAll = async (id, lid) => {
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length);
    if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but list ${lid} shows ${lis}`);
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' }));
    for (let k = 0; k < n; k++) {
      if (k) await p.$eval(`#${id}-f`, e => e.click());
      if (shoot) {
        await wait(650); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}-midtween-${scheme}-${width}.png` });
        await wait(1100); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}-${scheme}-${width}.png` })
      } else await wait(200);
    }
    await wait(1700);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
    await audit(`${id} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id} list does not mark the last step`);
  };
  for (const [id, lid] of STAGES) await stepAll(id, lid);
  // the 2D transcript animations: every mode, every step; a mode toggle restarts at step 1 and replays
  for (const [card, ctl, lid, modes] of ANIMS) {
    const nm = await p.$$eval(modes, e => e.length);
    for (let m = nm - 1; m >= 0; m--) {
      await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' }));
      await p.evaluate((s, m) => document.querySelectorAll(s)[m].click(), modes, m); await wait(300);
      const r = await p.evaluate(c => [document.getElementById(c + '-s').value, document.getElementById(c + '-p').getAttribute('aria-label')], ctl);
      if (r[0] !== '0' || r[1] !== 'Pause') problems.push(`${tag}: ${card} mode ${m} did not restart and replay (${r})`);
      await p.$eval(`#${ctl}-b`, e => e.click());
      const n = await p.$eval(`#${ctl}-s`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length); if (lis !== n) problems.push(`${tag}: ${card} has ${n} steps but list ${lid} shows ${lis}`);
      for (let k = 0; k < n; k++) { if (k) await p.$eval(`#${ctl}-f`, e => e.click()); await wait(120); if (shoot && m === 0 && (k === 2 || k === n - 1)) await (await p.$('#' + card)).screenshot({ path: `${shots}/x-${card}-m${m}-s${k + 1}-${scheme}-${width}.png` }) }
      const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on'))); if (cur !== n - 1) problems.push(`${tag}: ${card} list does not mark the last step`);
      await audit(`${card} mode ${m} last step`);
    }
  }
  await audit('end');
  for (const t of ['t-cases', 't-more']) { await p.click(`#tabs button[data-t="${t}"]`); await wait(300); await audit(t, t) }
  await p.click('#tabs button[data-t="t-read"]');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file);
  for (const [id] of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  for (const [card, ctl] of ANIMS) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval(`#${ctl}-s`, e => e.value); if (r !== '0') problems.push(`reduced motion: ${card} moved by itself (step ${r})`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
