// The 3D stages and step animations under the 2026-11-06 motion rules, at 1400 px light, 920 px light and 390 px dark:
// each plays by itself once scrolled into view, steps to its last step, has one step-list item per step; nothing moves under reduced motion;
// the split layout is two columns at 1400 px; no errors, NaN, undefined, Infinity or sideways scroll.
// It also recomputes every number the 3D scenes' step lists quote (window.VB3) and finds it in the static step text.
// Run from the repo root: node technical_knowledge_base/models_and_training/topic_rl/value_based_deep_rl/src/checks/check_stages.mjs [shot folder]
// With a shot folder (outside the repo), each stage and animation is photographed at a middle step.
import { createRequire } from 'node:module'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import fs from 'node:fs';
const here = path.dirname(fileURLToPath(import.meta.url));
const R = createRequire(path.resolve(here, '../../../../../../html_utils/package.json')); const puppeteer = R('puppeteer');
const file = 'file://' + path.resolve(here, '../../index.html'), shots = process.argv[2];
if (shots) fs.mkdirSync(shots, { recursive: true });
const wait = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const problems = []; let actions = 0;
// the 2D animations (RD.anim) and their step lists; a mode switch replays with the same list
const ANIMS = [{ card: 'vb-tn', ctl: 'vb-tnK', list: 'sx-tn', seg: '#vb-tnM button[data-m="X"]', modes: ['on', 'tn'] },
  { card: 'vb-ov', ctl: 'vb-ovC', list: 'sx-ov', seg: '#vb-ovF button[data-f="X"]', modes: ['sin|6', 'bump|9'] },
  { card: 'vb-c5', ctl: 'vb-c5C', list: 'sx-c5' }];
const fmt = v => (v < 0 ? '−' : '') + Math.abs(v);
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await p.$eval('button[data-t=t-read]', e => e.click()); await wait(300);
  if (width === 1400) {
    const bad = await p.$$eval('#t-read .s3sp', xs => xs.filter(x => { const l = x.querySelector('.s3L'), r = x.querySelector('.s3R'); return !(l && r && r.getBoundingClientRect().left > l.getBoundingClientRect().right - 2) }).length);
    if (bad) problems.push(`${width}: ${bad} split sections are not two columns`);
    // the numbers the scenes quote, recomputed from the scenes' own data and found in the static step lists
    const V = await p.evaluate(() => window.VB3); const txt = async id => p.$eval('#' + id, e => e.textContent);
    const H = V.hero, y = 1 + 0.99 * 3.5;
    if (Math.abs(H.y - y) > 1e-12 || Math.abs(H.y - 4.465) > 1e-9 || Math.abs(H.td - 0.465) > 1e-9) problems.push('hero numbers ' + JSON.stringify(H));
    const th = await txt('sx-hero'); ['(2.0, 3.5, 3.0)', '1 + 0.99 × 3.5 = 4.465', '4.0', '0.465', '1M', '32', '10,000'].forEach(s => { if (!th.includes(s)) problems.push('hero list lacks ' + s) });
    const D = V.du, tu = await txt('sx-du'), tup = s => { if (!tu.includes(s)) problems.push('dueling list lacks ' + s) };
    const want = { cMean: [0, -2, 2], qMean: [5, 3, 7], cMax: [-2, -4, 0], qMax: [3, 1, 5] };
    for (const k in want) { if (JSON.stringify(D[k]) !== JSON.stringify(want[k])) problems.push(`dueling ${k} ${D[k]}`); tup('(' + D[k].map(fmt).join(', ') + ')') }
    if (D.mean !== 1 || D.max !== 3) problems.push('dueling mean/max'); tup('mean of A is 1'); tup('max of A is 3');
    const N = V.nz, tn = await txt('sx-nz');
    if (N.fac !== 10 || N.ind !== 28 || N.dqnFac !== 3648 || N.dqnInd !== 1606144) problems.push('noisy counts ' + JSON.stringify(N));
    ['10 random numbers', '28 random numbers', '3,648', '1,606,144'].forEach(s => { if (!tn.includes(s)) problems.push('noisy list lacks ' + s) });
  }
  for (const id of await p.$$eval('#t-read .stg', xs => xs.map(x => x.id))) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2200);
    const fr = await p.$eval('#' + id, e => +e.dataset.frames || 0); if (!fr) problems.push(`${scheme} ${width}: ${id} did not play when scrolled into view`);
    const lis = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx'); return l ? l.children.length : 0 });
    const n = +(await p.$eval(`#${id}-r`, e => e.max)) + 1; if (lis !== n) problems.push(`${scheme} ${width}: ${id} has ${n} steps and ${lis} list items`);
    for (let k = 0; k < n; k++) { await p.$eval(`#${id}-f`, e => e.click()); actions++ } await wait(1500);
    const shown = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (shown !== `step ${n} of ${n}`) problems.push(`${scheme} ${width}: ${id} ended on "${shown}"`);
    const mid = Math.floor(n / 2); await p.evaluate((id, k) => document.getElementById(id).closest('.s3sp').querySelector('ol.sx').children[k].click(), id, mid); actions++; await wait(1600);
    const t = await p.$eval('#' + id, h => h.closest('.s3sp').innerText); if (/\bNaN\b|\bundefined\b|\bInfinity\b/.test(t)) problems.push(`${scheme} ${width}: ${id} shows NaN/undefined`);
    if (shots) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(400); const el = await p.$('#' + id); await el.screenshot({ path: path.join(shots, `${id}-mid-${scheme}-${width}.png`) }) }
  }
  if (await p.$('#vb-nzR')) { await p.$eval('#vb-nzR', e => e.click()); actions++; await wait(300) }
  for (const a of ANIMS) {
    await p.$eval('#' + a.card, e => e.scrollIntoView({ block: 'center' })); await wait(2500);
    const pl = await p.$eval(`#${a.ctl}-p`, e => e.getAttribute('aria-label')); if (pl !== 'Pause' && !(await p.$eval(`#${a.ctl}-s`, e => +e.value > 0))) problems.push(`${scheme} ${width}: ${a.card} did not play when scrolled into view`);
    for (const m of a.modes || [null]) {
      if (m) { await p.$eval(a.seg.replace('X', m), e => e.click()); await wait(300);
        const pl2 = await p.$eval(`#${a.ctl}-p`, e => e.getAttribute('aria-label')); if (pl2 !== 'Pause') problems.push(`${scheme} ${width}: ${a.card} ${m} did not replay after the mode switch`) }
      const n = +(await p.$eval(`#${a.ctl}-s`, e => e.max)) + 1;
      const lis = await p.$eval('#' + a.list, e => e.children.length); if (lis !== n) problems.push(`${scheme} ${width}: ${a.card} ${m} has ${n} steps and ${lis} list items`);
      for (let k = 0; k < n; k++) { await p.$eval(`#${a.ctl}-f`, e => e.click()); actions++ }
      if (+(await p.$eval(`#${a.ctl}-s`, e => e.value)) !== n - 1) problems.push(`${scheme} ${width}: ${a.card} ${m} did not reach its last step`);
      const on = await p.$eval('#' + a.list, e => [...e.children].findIndex(li => li.classList.contains('on'))); if (on !== n - 1) problems.push(`${scheme} ${width}: ${a.card} ${m} list marks ${on}`);
      await p.$eval(`#${a.ctl}-s`, (e, k) => { e.value = k; e.dispatchEvent(new Event('input')) }, Math.floor(n / 2)); await wait(400);
      const t = await p.$eval('#' + a.card, e => e.closest('.s3sp').innerText); if (/\bNaN\b|\bundefined\b|\bInfinity\b/.test(t)) problems.push(`${scheme} ${width}: ${a.card} ${m} shows NaN/undefined`);
      if (shots) { await p.$eval('#' + a.card, e => e.scrollIntoView({ block: 'center' })); await wait(300); const el = await p.$('#' + a.card); await el.screenshot({ path: path.join(shots, `${a.card}${m ? '-' + m.replace('|', '') : ''}-mid-${scheme}-${width}.png`) }) }
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
  for (const a of ANIMS) { await p.$eval('#' + a.card, e => e.scrollIntoView({ block: 'center' })); await wait(2500);
    if ((await p.$eval(`#${a.ctl}-s`, e => +e.value)) !== 0 || (await p.$eval(`#${a.ctl}-p`, e => e.getAttribute('aria-label'))) === 'Pause') problems.push(`reduced motion: ${a.card} moved by itself`) }
  await p.close();
}
await b.close();
console.log(`stages check: ${actions} actions, ${problems.length} problems`); problems.forEach(x => console.log('  ' + x));
process.exit(problems.length ? 1 : 0);
