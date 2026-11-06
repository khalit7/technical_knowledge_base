// The 3D stages and step animations under the 2026-11-06 motion rules, at 1400 px light, 920 px light and 390 px dark:
// each plays by itself once scrolled into view, steps to its last step, has one step-list item per step; nothing moves under reduced motion;
// every split is two columns at 1400 px; no errors, NaN, undefined, Infinity or sideways scroll in any tab.
// Stages: Reading stg-map, stg-loop, stg-one; Method atlas stg-axes. Own controllers: the Method atlas chains (#at-anim-card, two chains)
// and the Milestones climb (#ms-an-card, two views).
// Run from the repo root: node technical_knowledge_base/models_and_training/topic_rl/src/check_stages.mjs [shot folder outside the repo]
import { createRequire } from 'node:module'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import fs from 'node:fs';
const here = path.dirname(fileURLToPath(import.meta.url));
const R = createRequire(path.resolve(here, '../../../../html_utils/package.json')); const puppeteer = R('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2];
if (shots) fs.mkdirSync(shots, { recursive: true });
const wait = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const problems = []; let actions = 0;
const TABS = ['t-read', 't-tax', 't-atlas', 't-miles', 't-more'];
// own controllers: card, list, the step buttons, the mode buttons
const OWN = [{ tab: 't-atlas', card: 'at-anim-card', list: 'at-steps', f: '#at-next', p: '#at-play', s: '#at-scrub', modes: ['#at-chain button[data-c=value]', '#at-chain button[data-c=llm]'] },
  { tab: 't-miles', card: 'ms-an-card', list: 'ms-sx', f: '#ms-fwd', p: '#ms-play', s: '#ms-scrub', modes: ['#ms-mode button[data-v=climb]', '#ms-mode button[data-v=games]'] }];
const bad = async (p, label, sel) => { const t = await p.$eval(sel, e => e.innerText); if (/\bNaN\b|\bundefined\b|\bInfinity\b/.test(t)) problems.push(label + ' shows NaN/undefined') };
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file);
  for (const tab of TABS) {
    await p.$eval(`button[data-t=${tab}]`, e => e.click()); await wait(300);
    if (width === 1400) { const n = await p.$$eval(`#${tab} .s3sp`, xs => xs.filter(x => { const l = x.querySelector('.s3L'), r = x.querySelector('.s3R'); return !(l && r && r.getBoundingClientRect().left > l.getBoundingClientRect().right - 2) }).length);
      if (n) problems.push(`${width}: ${tab} has ${n} split sections that are not two columns`) }
    for (const id of await p.$$eval(`#${tab} .stg`, xs => xs.map(x => x.id))) {
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2200);
      const fr = await p.$eval('#' + id, e => +e.dataset.frames || 0); if (!fr) problems.push(`${scheme} ${width}: ${id} did not play when scrolled into view`);
      const lis = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx'); return l ? l.children.length : 0 });
      const n = +(await p.$eval(`#${id}-r`, e => e.max)) + 1; if (lis !== n) problems.push(`${scheme} ${width}: ${id} has ${n} steps and ${lis} list items`);
      for (let k = 0; k < n; k++) { await p.$eval(`#${id}-f`, e => e.click()); actions++ } await wait(1500);
      const shown = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (shown !== `step ${n} of ${n}`) problems.push(`${scheme} ${width}: ${id} ended on "${shown}"`);
      const mid = Math.floor(n / 2); await p.evaluate((id, k) => document.getElementById(id).closest('.s3sp').querySelector('ol.sx').children[k].click(), id, mid); actions++; await wait(1700);
      await bad(p, `${scheme} ${width} ${id}`, `#${tab}`);
      if (shots && width !== 920) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(300); const el = await p.$('#' + id); await el.screenshot({ path: path.join(shots, `${id}-mid-${scheme}-${width}.png`) }) }
    }
    for (const a of OWN.filter(o => o.tab === tab)) {
      await p.$eval('#' + a.card, e => e.scrollIntoView({ block: 'center' })); await wait(800);
      const pl = await p.$eval(a.p, e => e.textContent), on = await p.$eval('#' + a.card, e => e.hasAttribute('data-playing'));
      if (!/Pause/.test(pl) || !on) problems.push(`${scheme} ${width}: ${a.card} did not play when scrolled into view`);
      for (const m of a.modes) {
        await p.$eval(m, e => e.click()); await wait(200); actions++;
        const n = +(await p.$eval(a.s, e => e.max)) + 1, lis = await p.$eval('#' + a.list, e => e.children.length);
        if (lis !== n) problems.push(`${scheme} ${width}: ${a.card} ${m} has ${n} steps and ${lis} list items`);
        for (let k = 0; k < n; k++) { await p.$eval(a.f, e => e.click()); actions++ } await wait(300);
        if (+(await p.$eval(a.s, e => e.value)) !== n - 1) problems.push(`${scheme} ${width}: ${a.card} ${m} did not reach its last step`);
        const onI = await p.$eval('#' + a.list, e => [...e.children].findIndex(li => li.classList.contains('on'))); if (onI !== n - 1) problems.push(`${scheme} ${width}: ${a.card} ${m} list marks ${onI}`);
        await p.evaluate((l, k) => document.getElementById(l).children[k].click(), a.list, Math.floor(n / 2)); await wait(900);
        if (await p.$eval(a.p, e => /Pause/.test(e.textContent))) problems.push(`${scheme} ${width}: ${a.card} kept playing after a reader click`);
        await bad(p, `${scheme} ${width} ${a.card}`, `#${tab}`);
        if (shots && width !== 920) { const el = await p.$('#' + a.card); await el.screenshot({ path: path.join(shots, `${a.card}-${m.match(/=(\w+)\]/)[1]}-mid-${scheme}-${width}.png`) }) }
      }
    }
    if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)) problems.push(`${scheme} ${width}: ${tab} sideways scroll`);
    await bad(p, `${scheme} ${width} ${tab}`, `#${tab}`);
  }
  const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) errs.push(box);
  if (errs.length) problems.push(`${scheme} ${width}: ${errs.join(' | ')}`);
  await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file);
  for (const tab of TABS) {
    await p.$eval(`button[data-t=${tab}]`, e => e.click()); await wait(300);
    for (const id of await p.$$eval(`#${tab} .stg`, xs => xs.map(x => x.id))) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      if ((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0 || (await p.$eval(`#${id} .stg-st`, e => e.textContent)) !== `step 1 of ${+(await p.$eval(`#${id}-r`, e => e.max)) + 1}`) problems.push(`reduced motion: ${id} moved by itself`) }
    for (const a of OWN.filter(o => o.tab === tab)) { await p.$eval('#' + a.card, e => e.scrollIntoView({ block: 'center' })); await wait(5000);
      if ((await p.$eval(a.s, e => +e.value)) !== 0 || await p.$eval('#' + a.card, e => e.hasAttribute('data-playing'))) problems.push(`reduced motion: ${a.card} moved by itself`) }
  }
  await p.close();
}
await b.close();
console.log(`stages check: ${actions} actions, ${problems.length} problems`); problems.forEach(x => console.log('  ' + x));
process.exit(problems.length ? 1 : 0);
