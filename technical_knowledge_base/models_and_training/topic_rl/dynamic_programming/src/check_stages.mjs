// The 3D stages and step animations under the 2026-11-06 motion rules, at 1400 px light, 920 px light and 390 px dark:
// each plays by itself once scrolled into view, steps to its last step, has one step-list item per step; nothing moves under reduced motion;
// the split layout is two columns at 1400 px; no errors, NaN, undefined, Infinity or sideways scroll.
// Run from the repo root: node technical_knowledge_base/models_and_training/topic_rl/dynamic_programming/src/check_stages.mjs [shot folder]
// With a shot folder, each stage and animation is photographed at a middle step (the folder must be outside the repo).
import { createRequire } from 'node:module'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import fs from 'node:fs';
const here = path.dirname(fileURLToPath(import.meta.url));
const R = createRequire(path.resolve(here, '../../../../../html_utils/package.json')); const puppeteer = R('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2];
if (shots) fs.mkdirSync(shots, { recursive: true });
const wait = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const problems = []; let actions = 0;
// the 2D animations (RD.anim) and their step lists, per mode; widget: a long replay the reader drives (no autoplay), opening on that frame
const ANIMS = [{ tab: 't-read', card: 'dp-co', ctl: 'dp-coC', list: 'sx-co', seg: '#dp-coM', modes: ['sync', 'cba', 'abc', 'pe'] }, { tab: 't-lab', card: 'sw-cards', ctl: 'sw-ctl', list: null, widget: 3 }];
const MODES = { 'stg-gw': { seg: '#rd-gwM', modes: ['vi', 'ql'] } };
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await p.$eval('button[data-t=t-read]', e => e.click()); await wait(300);
  if (width === 1400) { // the split: two columns where a section has a visual
    const bad = await p.$$eval('#t-read .s3sp', xs => xs.filter(x => { const l = x.querySelector('.s3L'), r = x.querySelector('.s3R'); return !(l && r && r.getBoundingClientRect().left > l.getBoundingClientRect().right - 2) }).length);
    if (bad) problems.push(`${width}: ${bad} split sections are not two columns`) }
  for (const id of await p.$$eval('#t-read .stg', xs => xs.map(x => x.id))) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2200);
    const fr = await p.$eval('#' + id, e => +e.dataset.frames || 0); if (!fr) problems.push(`${scheme} ${width}: ${id} did not play when scrolled into view`);
    for (const m of (MODES[id] || { modes: [null] }).modes) {
      if (m) { await p.$eval(`${MODES[id].seg} button[data-m="${m}"]`, e => e.click()); await wait(200) }
      const lis = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return l ? l.children.length : 0 });
      const n = +(await p.$eval(`#${id}-r`, e => e.max)) + 1; if (lis !== n) problems.push(`${scheme} ${width}: ${id} ${m || ''} has ${n} steps and ${lis} list items`);
      for (let k = 0; k < n; k++) { await p.$eval(`#${id}-f`, e => e.click()); actions++ } await wait(1500);
      const shown = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (shown !== `step ${n} of ${n}`) problems.push(`${scheme} ${width}: ${id} ${m || ''} ended on "${shown}"`);
      const mid = Math.floor(n / 2); await p.evaluate((id, k) => document.getElementById(id).closest('.s3sp').querySelector('ol.sx:not([hidden])').children[k].click(), id, mid); actions++; await wait(1600);
      const txt = await p.$eval('#' + id, h => h.closest('.s3sp').innerText); if (/\bNaN\b|\bundefined\b|\bInfinity\b/.test(txt)) problems.push(`${scheme} ${width}: ${id} shows NaN/undefined`);
      if (shots) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(300); const el = await p.$('#' + id); await el.screenshot({ path: path.join(shots, `${id}${m ? '-' + m : ''}-mid-${scheme}-${width}.png`) }) }
    }
  }
  for (const a of ANIMS) {
    await p.$eval(`button[data-t=${a.tab}]`, e => e.click()); await wait(300);
    await p.$eval('#' + a.card, e => e.scrollIntoView({ block: 'center' })); await wait(2500);
    const pl = await p.$eval(`#${a.ctl}-p`, e => e.getAttribute('aria-label')), sv = await p.$eval(`#${a.ctl}-s`, e => +e.value);
    if (a.widget != null) { if (pl !== 'Play' || sv !== a.widget) problems.push(`${scheme} ${width}: ${a.card} is a widget but moved by itself (or did not open on frame ${a.widget})`) }
    else if (pl !== 'Pause' && !(sv > 0)) problems.push(`${scheme} ${width}: ${a.card} did not play when scrolled into view`);
    for (const m of a.modes || [null]) {
      if (m) { await p.$eval(`${a.seg} button[data-m="${m}"]`, e => e.click()); await wait(200) }
      const n = +(await p.$eval(`#${a.ctl}-s`, e => e.max)) + 1;
      if (a.list) { const lis = await p.$eval('#' + a.list, e => e.children.length); if (lis !== n) problems.push(`${scheme} ${width}: ${a.card} ${m} has ${n} steps and ${lis} list items`) }
      for (let k = 0; k < n; k++) { await p.$eval(`#${a.ctl}-f`, e => e.click()); actions++ }
      if (+(await p.$eval(`#${a.ctl}-s`, e => e.value)) !== n - 1) problems.push(`${scheme} ${width}: ${a.card} ${m} did not reach its last step`);
      if (a.list) { const on = await p.$eval('#' + a.list, e => [...e.children].findIndex(li => li.classList.contains('on'))); if (on !== n - 1) problems.push(`${scheme} ${width}: ${a.card} ${m} list marks ${on}`) }
      await p.$eval(`#${a.ctl}-s`, (e, k) => { e.value = k; e.dispatchEvent(new Event('input')) }, Math.floor(n / 2));
      const txt = await p.$eval('#' + a.tab, e => e.innerText); if (/\bNaN\b|\bundefined\b|\bInfinity\b/.test(txt)) problems.push(`${scheme} ${width}: ${a.card} ${m} shows NaN/undefined`);
      if (shots) { await p.$eval('#' + a.card, e => e.scrollIntoView({ block: 'center' })); await wait(300); const el = await p.$('#' + a.card); await el.screenshot({ path: path.join(shots, `${a.card}${m ? '-' + m : ''}-mid-${scheme}-${width}.png`) }) }
    }
  }
  if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)) problems.push(`${scheme} ${width}: sideways scroll`);
  const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) errs.push(box);
  if (errs.length) problems.push(`${scheme} ${width}: ${errs.join(' | ')}`);
  await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file);
  await p.$eval('button[data-t=t-read]', e => e.click());
  for (const id of await p.$$eval('#t-read .stg', xs => xs.map(x => x.id))) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    if ((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0 || (await p.$eval(`#${id} .stg-st`, e => e.textContent)) !== `step 1 of ${+(await p.$eval(`#${id}-r`, e => e.max)) + 1}`) problems.push(`reduced motion: ${id} moved by itself`) }
  for (const a of ANIMS) { await p.$eval(`button[data-t=${a.tab}]`, e => e.click()); await p.$eval('#' + a.card, e => e.scrollIntoView({ block: 'center' })); await wait(2500);
    if ((await p.$eval(`#${a.ctl}-s`, e => +e.value)) !== (a.widget || 0)) problems.push(`reduced motion: ${a.card} moved by itself`) }
  await p.close();
}
await b.close();
console.log(`stages check: ${actions} actions, ${problems.length} problems`); problems.forEach(x => console.log('  ' + x));
process.exit(problems.length ? 1 : 0);
