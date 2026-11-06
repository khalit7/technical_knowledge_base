// The 3D stages, step animations and the replay widget under the 2026-11-06 motion rules, at 1400 px light, 920 px light and 390 px dark:
// each stage and animation plays by itself once scrolled into view, steps to its last step and has one step-list item per step; the replay widget
// stays still in view (a widget the reader drives) and opens on its last frame; nothing moves under reduced motion; every split is two columns at 1400 px;
// no errors, NaN, undefined, Infinity or sideways scroll in any tab. (Adapted from the agentic-frameworks root's check_stages.mjs.)
// Stages: Reading stg-hero, stg-ctx, stg-safe; Harness atlas stg-tax. Animations: Reading #ahread-c1 (RD.anim, both modes), Trace and context lab #trc-ccard (LABANIM).
// Widget: Loop lab #loop-acard.
// Run from the repo root: node technical_knowledge_base/agents_and_retrieval/topic_agentic_harnesses/src/check_stages.mjs [shot folder outside the repo]
import { createRequire } from 'node:module'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import fs from 'node:fs';
const here = path.dirname(fileURLToPath(import.meta.url));
const R = createRequire(path.resolve(here, '../../../../html_utils/package.json')); const puppeteer = R('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2];
if (shots) fs.mkdirSync(shots, { recursive: true });
const wait = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const problems = []; let actions = 0;
const TABS = ['t-read', 't-loop', 't-trace', 't-atlas', 't-more'];
// modes: null is the default; 's0' clicks the replay's "Step 0, one call" button, which swaps the step list to sx-c1b
const ANIM = [{ tab: 't-read', card: 'ahread-c1', ctl: 'ahread-c1-ctl', list: 'sx-c1', modes: [null, 's0'], lists: { s0: 'sx-c1b' } },
  { tab: 't-trace', card: 'trc-ccard', ctl: 'trc-cctl', list: 'sx-cache', modes: [null] }];
// [tab, card, controls, the frame it opens on: 'last' (the whole run drawn)]
const WIDGETS = [['t-loop', 'loop-acard', 'loop-actl', 'last']];
const bad = async (p, label, sel) => { const t = (await p.$eval(sel, e => e.innerText)).replace('their order was undefined', ''); /* the recorded model reply in the step 0 replay says this */ const m = t.match(/.{0,50}\b(NaN|undefined|Infinity)\b.{0,30}/); if (m) problems.push(label + ' shows NaN/undefined: ' + m[0].replace(/\s+/g, ' ')) };
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
      for (let k = 0; k < n; k++) { await p.$eval(`#${id}-f`, e => e.click()); actions++ } await wait(1600);
      const shown = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (shown !== `step ${n} of ${n}`) problems.push(`${scheme} ${width}: ${id} ended on "${shown}"`);
      if (shots && width !== 920) { const el = await p.$('#' + id); await el.screenshot({ path: path.join(shots, `${id}-last-${scheme}-${width}.png`) }) }
      const mid = Math.floor(n / 2); await p.evaluate((id, k) => document.getElementById(id).closest('.s3sp').querySelector('ol.sx').children[k].click(), id, mid); actions++; await wait(1700);
      await bad(p, `${scheme} ${width} ${id}`, `#${tab}`);
      if (shots && width !== 920) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(300); const el = await p.$('#' + id); await el.screenshot({ path: path.join(shots, `${id}-mid-${scheme}-${width}.png`) }) }
    }
    for (const a of ANIM.filter(o => o.tab === tab)) {
      for (const m of a.modes) {
        if (m) { await p.$eval(`#${a.card} .seg button[data-m=${m}]`, e => e.click()); actions++ }
        const list = (m && a.lists && a.lists[m]) || a.list;
        await p.$eval('#' + a.card, e => e.scrollIntoView({ block: 'center' })); await wait(900);
        const pl = await p.$eval(`#${a.ctl}-p`, e => e.textContent);
        if (!/Pause/.test(pl)) problems.push(`${scheme} ${width}: ${a.card} ${m || ''} did not play when scrolled into view`);
        const n = +(await p.$eval(`#${a.ctl}-s`, e => e.max)) + 1, lis = await p.$eval('#' + list, e => e.children.length);
        if (lis !== n) problems.push(`${scheme} ${width}: ${a.card} has ${n} steps and ${lis} list items`);
        for (let k = 0; k < n; k++) { await p.$eval(`#${a.ctl}-f`, e => e.click()); actions++ } await wait(300);
        if (+(await p.$eval(`#${a.ctl}-s`, e => e.value)) !== n - 1) problems.push(`${scheme} ${width}: ${a.card} did not reach its last step`);
        const onI = await p.$eval('#' + list, e => [...e.children].findIndex(li => li.classList.contains('on'))); if (onI !== n - 1) problems.push(`${scheme} ${width}: ${a.card} list marks ${onI}`);
        await p.evaluate((l, k) => document.getElementById(l).children[k].click(), list, Math.floor(n / 2)); await wait(700);
        if (await p.$eval(`#${a.ctl}-p`, e => /Pause/.test(e.textContent))) problems.push(`${scheme} ${width}: ${a.card} kept playing after a reader click`);
        await bad(p, `${scheme} ${width} ${a.card}`, `#${tab}`);
        if (shots && width !== 920 && (m === 's0' || (!m && a.modes.length === 1))) { const el = await p.$('#' + a.card); await el.screenshot({ path: path.join(shots, `${a.card}-mid-${scheme}-${width}.png`) }) }
      }
    }
    for (const [t, card, ctl, open] of WIDGETS.filter(w => w[0] === tab)) {
      await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); const v0 = await p.$eval(`#${ctl}-s`, e => +e.value); await wait(2500);
      const v1 = await p.$eval(`#${ctl}-s`, e => +e.value), mx = await p.$eval(`#${ctl}-s`, e => +e.max);
      if (v1 !== v0 || await p.$eval(`#${ctl}-p`, e => /Pause/.test(e.textContent))) problems.push(`${scheme} ${width}: widget ${card} moved by itself`);
      if (v0 !== (open === 'last' ? mx : 0)) problems.push(`${scheme} ${width}: widget ${card} opens on step ${v0 + 1} of ${mx + 1}, not its ${open} frame`);
      if (await p.$eval('#' + card, c => !!c.closest('.s3sp')?.querySelector('ol.sx'))) problems.push(`${width}: widget ${card} has a step list`);
      await p.$eval(`#${ctl}-p`, e => e.click()); await wait(1500); await p.$eval(`#${ctl}-p`, e => e.click()); actions += 2;
      await bad(p, `${scheme} ${width} ${card}`, `#${tab}`);
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
    for (const a of ANIM.filter(o => o.tab === tab)) { await p.$eval('#' + a.card, e => e.scrollIntoView({ block: 'center' })); await wait(5000);
      if ((await p.$eval(`#${a.ctl}-s`, e => +e.value)) !== 0 || await p.$eval(`#${a.ctl}-p`, e => /Pause/.test(e.textContent))) problems.push(`reduced motion: ${a.card} moved by itself`) }
  }
  await p.close();
}
await b.close();
console.log(`stages check: ${actions} actions, ${problems.length} problems`); problems.forEach(x => console.log('  ' + x));
process.exit(problems.length ? 1 : 0);
