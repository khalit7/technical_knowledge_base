// The 2026-11-06 rollout checks for RAG and retrieval evaluation (2026-11-09): the two 3D stages (Fig. 1 stg-halves, Fig. 2 stg-rank) play by
// themselves once scrolled into view, step to their last step with one step-list item per step, stop redrawing off screen and never move under
// reduced motion; the two 2D animations (an-card in both modes, fs-card) play when in view, have one list item per step and stop for good on a
// list click; the numbers in the step lists equal what the scenes compute (window.RRES); no errors, NaN, undefined or sideways scroll; the
// splits are two columns at 1400 px and one below 1100 px. Adapted from LLM-as-judge's check_stages.mjs.
// usage (from the repo root): node technical_knowledge_base/measurement/topic_evaluation_and_llm_judges/rag_and_retrieval_evaluation/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = { 'stg-halves': 'sx-halves', 'stg-rank': 'sx-rank' };
const ANIMS = [['an-card', 'an-ctl', '#an-mode', [['after', 'sx-an-a'], ['before', 'sx-an-b']]], ['fs-card', 'fs-ctl', '#fs-ans', [['mis', 'sx-fs'], ['l13', 'sx-fs']]]];
const wait = ms => new Promise(r => setTimeout(r, ms));
const problems = [];
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(400);
  const tag = `${scheme} ${width}`, sfx = `${scheme}-${width}`;
  const audit = async (where, tab = 't-read') => {
    const r = await p.evaluate(tab => { const c = document.getElementById(tab).cloneNode(true); c.querySelectorAll('pre,code').forEach(x => x.remove());
      return { bad: (c.innerText.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } }, tab);
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (!cols.length || cols.some(c => c !== 'grid'))) problems.push(`${tag}: a split is not two columns (${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  // the stages play once in view
  for (const id of Object.keys(STAGES)) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
  }
  // flows stop off screen
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  for (const [id, lid] of Object.entries(STAGES)) {
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length);
    if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but list ${lid} shows ${lis}`);
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' }));
    const shoot = width === 1400 || width === 390;
    for (let k = 0; k < n; k++) {
      if (k) await p.$eval(`#${id}-f`, e => e.click());
      if (shoot) {
        await wait(650); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}-midtween-${sfx}.png` });
        await wait(1100); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}-${sfx}.png` })
      } else await wait(250);
    }
    await wait(1700);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
    await audit(`${id} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id} list does not mark the last step`);
  }
  if (width === 1400) { // the step lists' numbers are what the scenes compute
    const r = await p.evaluate(() => { const out = [];
      for (const [grp, obj] of [['halves', RRES.halves], ['rank', RRES.rank]]) document.querySelectorAll('[data-rr]').forEach(el => { const k = el.dataset.rr; if (k in obj && String(obj[k]) !== el.textContent) out.push(`${grp}.${k}: page says ${el.textContent}, scene computes ${obj[k]}`) });
      const keys = [...document.querySelectorAll('[data-rr]')].map(e => e.dataset.rr).filter(k => !(k in RRES.halves) && !(k in RRES.rank)); if (keys.length) out.push('unchecked data-rr keys ' + keys);
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  // the 2D animations
  for (const [card, ctl, seg, modes] of ANIMS) {
    await p.$eval(`${seg} button[data-m="${modes[0][0]}"]`, e => e.click()); await wait(100);
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const playing = await p.$eval(`#${ctl}-p`, e => /Pause/.test(e.textContent));
    if (!playing) problems.push(`${tag}: ${card} did not play when scrolled into view`);
    for (const [md, lid] of modes) {
      await p.$eval(`${seg} button[data-m="${md}"]`, e => e.click()); await wait(150);
      const n = await p.$eval(`#${ctl}-s`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.hidden ? -1 : e.children.length);
      if (n !== lis) problems.push(`${tag}: ${card} mode ${md} has ${n} steps, list ${lid} shows ${lis}`);
      await p.$eval('#' + lid, e => e.children[e.children.length - 1].click()); await wait(200);
      if (await p.$eval(`#${ctl}-p`, e => /Pause/.test(e.textContent))) problems.push(`${tag}: ${card} kept playing after a list click`);
      if ((await p.$eval(`#${ctl}-s`, e => +e.value)) !== n - 1) problems.push(`${tag}: ${card} list click did not jump to the last step`);
      await audit(`${card} ${md} last step`);
      if (width === 1400 || width === 390) await (await p.$('#' + card)).screenshot({ path: `${shots}/x-${card}-${md}-last-${sfx}.png` });
    }
    await wait(4800); if ((await p.$eval(`#${ctl}-s`, e => +e.value)) !== (await p.$eval(`#${ctl}-s`, e => +e.max))) problems.push(`${tag}: ${card} moved after the reader took a control`);
    await p.$eval(`${seg} button[data-m="${modes[0][0]}"]`, e => e.click());
  }
  await audit('end');
  for (const t of ['t-run', 't-spans', 't-more']) { await p.click(`#tabs button[data-t="${t}"]`); await wait(300); await audit(t, t); }
  await p.click('#tabs button[data-t="t-read"]');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file);
  for (const id of Object.keys(STAGES)) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  for (const [card, ctl] of ANIMS) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(5200);
    if ((await p.$eval(`#${ctl}-s`, e => +e.value)) !== 0 || await p.$eval(`#${ctl}-p`, e => /Pause/.test(e.textContent))) problems.push(`reduced motion: ${card} moved by itself`) }
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
