// The 2026-11-06 layout and motion checks for this page, at 1400 px light, 920 px light and 390 px dark:
// the two 3D stages (#stg-hero, checklists once per query against a small judge or GPT-4o per cell and the cost of 1,000 runs;
// #stg-grade, one released grading through RocketEval and, after the mode toggle, through the CoT judge) play by themselves once
// scrolled into view, step to their last step, have exactly one step-list item per step (both modes of #stg-grade), stop drawing off
// screen and stop for good on a reader control; the mode toggle swaps the list and replays; at 1400 px every split shows two columns;
// no errors, NaN, undefined or sideways scroll; under prefers-reduced-motion nothing moves by itself; and every number the static
// step lists state matches the page's data (window.RKHERO, window.RKGRADE, REL, PAPER.rc).
// Writes a mid-step screenshot of each stage and mode.
// usage (from the repo root): node technical_knowledge_base/whats_new/papers/rocketeval/src/check_stages.mjs [shots dir]
import puppeteer from '../../../../../html_utils/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const file = 'file://' + path.resolve(here, '../index.html');
const shots = process.argv[2] || path.resolve(here, '../.shots'); fs.mkdirSync(shots, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell' });
const problems = []; let checked = 0;
const wait = ms => new Promise(r => setTimeout(r, ms));
const listOf = (p, id) => p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return l ? l.children.length : 0 });
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await wait(300);
  const tag = `${scheme} ${width}`;
  const clk = sel => p.$eval(sel, e => e.click());
  for (const t of await p.$$eval('#tabs button', bs => bs.map(b => b.dataset.t))) {
    await clk(`#tabs button[data-t=${t}]`); await wait(300);
    const splits = await p.$$eval(`#${t} .s3sp`, ss => ss.map(s => { const L = s.querySelector(':scope > .s3L'), R = s.querySelector(':scope > .s3R'); if (!L || !R) return 'missing column';
      const a = L.getBoundingClientRect(), r = R.getBoundingClientRect(); return { side: r.left >= a.right - 1 && r.width > 200 && a.width > 200 } }));
    splits.forEach((s, i) => { if (s === 'missing column') problems.push(`${tag} ${t}: split ${i + 1} lacks a column`); else if (width >= 1100 && !s.side) problems.push(`${tag} ${t}: split ${i + 1} is not two columns`) });
    for (const id of await p.$$eval(`#${t} .stg`, xs => xs.map(x => x.id))) {
      const modes0 = id === 'stg-grade' ? await p.$$eval('#gradeM button', bs => bs.map(b => b.dataset.m)) : [null];
      for (const m of modes0) {
        checked++;
        if (m && m !== modes0[0]) {
          // the mode toggle swaps the list, returns to step 1 and replays
          await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(200);
          const f0 = await p.$eval('#' + id, e => +e.dataset.frames || 0);
          await clk(`#gradeM button[data-m=${m}]`); await wait(2200);
          const f1 = await p.$eval('#' + id, e => +e.dataset.frames || 0);
          if (!(f1 > f0) || !(await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent)))) problems.push(`${tag}: ${id} did not replay after switching to ${m}`);
          if (!(await p.$eval(`#sx-${m}`, e => !e.hidden))) problems.push(`${tag}: list sx-${m} still hidden`);
        } else {
          await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2200);
          const f1 = await p.$eval('#' + id, e => +e.dataset.frames || 0);
          if (!(f1 > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
          if (!(await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent)))) problems.push(`${tag}: ${id} is not playing after scrolling into view`);
          // flows and steps stop drawing off screen
          await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await wait(400);
          const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800);
          const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0); if (d1 !== d0) problems.push(`${tag}: ${id} kept drawing off screen (${d1 - d0})`);
        }
        const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await listOf(p, id);
        if (lis !== n) problems.push(`${tag}: ${id} ${m || ''} has ${n} steps but ${lis} list items`);
        if (n > 8) problems.push(`${tag}: ${id} has ${n} steps (at most about 8)`);
        await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(200);
        await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
        for (let k = 1; k < n; k++) { await clk(`#${id}-f`); await wait(80); if (k === Math.floor(n / 2) || k === n - 1) { await wait(2000); await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}${m ? '-' + m : ''}-${k === n - 1 ? 'last' : 'mid'}-${scheme}-${width}.png` }) } }
        await wait(500);
        const shown = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (shown !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ${m || ''} ended on "${shown}"`);
        const on = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return [...l.children].findIndex(x => x.classList.contains('on')) });
        if (on !== n - 1) problems.push(`${tag}: ${id} ${m || ''} list marks item ${on + 1} at the last step`);
        if (await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent))) problems.push(`${tag}: ${id} still playing after a reader control`);
        // a click on a list item jumps to that step
        await p.evaluate(id => document.getElementById(id).closest('.s3sp').querySelector('ol.sx:not([hidden])').children[1].click(), id); await wait(200);
        if ((await p.$eval(`#${id} .stg-st`, e => e.textContent)) !== `step 2 of ${n}`) problems.push(`${tag}: ${id} ${m || ''} list click did not jump`);
      }
      if (id === 'stg-grade') await clk(`#gradeM button[data-m=${modes0[0]}]`);
    }
    const r = await p.evaluate(t => { const el = document.getElementById(t); const txt = el.innerText;
      return { bad: (txt.match(/.{0,30}(?<![-\w])(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth } }, t);
    if (r.bad.length) problems.push(`${tag} ${t}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${t}: sideways scroll`);
  }
  const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) problems.push(`${tag}: error box: ${box}`);
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file);
  await p.$eval('#tabs button[data-t=t-read]', e => e.click()); await wait(300);
  for (const id of await p.$$eval('#t-read .stg', xs => xs.map(x => x.id))) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800); const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0);
    const f = await p.$eval('#' + id, e => +e.dataset.frames || 0), pl = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent));
    if (f > 0 || pl || d1 !== d0) problems.push(`reduced motion: ${id} moved by itself (frames ${f}, redraws ${d1 - d0})`) }
  await p.close() }
{ // the numbers the static step lists state are the ones the page's data holds
  const p = await b.newPage(); await p.goto(file); await wait(800);
  const r = await p.evaluate(() => ({ H: window.RKHERO, G: window.RKGRADE, C: window.PAPER.rc.cost, ck: window.PAPER.rc.ck, J: window.PAPER.rc.judges,
    items: window.REL.samples[1].ck.length,
    L: Object.fromEntries(['sx-hero', 'sx-re', 'sx-cot'].map(id => [id, [...document.getElementById(id).children].map(li => li.textContent)])),
    oc: document.querySelector('.oc').textContent }));
  const say = (cond, msg) => { if (!cond) problems.push('step list: ' + msg) };
  const usd = v => '$' + v.toFixed(v < 0.1 ? 3 : 2), money = v => '$' + v.toLocaleString('en-GB', { maximumFractionDigits: v < 100 ? 1 : 0 });
  if (!r.H || !r.G) problems.push('RKHERO or RKGRADE missing'); else {
    const H = r.L['sx-hero'];
    say(H.length === 4, `hero has ${H.length} steps`);
    say(H[0].includes(`${r.ck.mean.toFixed(1)} items per query`) && H[0].includes(`$${r.H.ck.toFixed(2)}, paid once`) && H[0].includes('8 of WildBench'), `hero 1: checklists ${r.ck.mean} ${r.H.ck}`);
    const gem = r.C.rows.find(x => x.judge === 'Gemma-2-2B');
    say(H[1].includes(`${gem.sec} s`) && H[1].includes(`$${r.H.gem.toFixed(3).slice(0, 5)}`) && Math.abs(gem.sec * gem.hr / 3600 - r.H.gem) < 1e-9, `hero 2: ${gem.sec} s, ${r.H.gem}`);
    say(H[2].includes(`$${r.H.g4o.toFixed(2)} a run`), `hero 3: ${r.H.g4o}`);
    say(H[3].includes(money(r.H.totR)) && H[3].includes(money(r.H.totG)) && H[3].includes(`${(100 * r.H.share).toFixed(1)}%`) && r.oc.includes(`${money(r.H.totR)} against ${money(r.H.totG)}`), `hero 4: ${r.H.totR} ${r.H.totG} ${r.H.share}`);
    const E = r.L['sx-re'], G = r.G;
    say(E.length === 5 && E[0].includes(`here ${G.k} for the poem`) && G.k === r.items, `grade 1: ${G.k} items`);
    say(E[1].includes('3,402 tokens') && G.prompt === 3402, 'grade 2: prompt');
    say(E[2].includes(`${G.k} tokens generated`), 'grade 3');
    const big = G.p[0], small = G.p[1]; // items 1 and 2: a Yes and a No under the hard reading
    say(big > .5 && small < .5, `items 1 and 2 are ${big} and ${small}`);
    say(E[3].includes(`turn ${big.toFixed(3)} into a full Yes`) && E[3].includes(`${small.toFixed(3)} into a full No`), `grade 4: ${big} ${small}`);
    const j3 = r.J.find(x => x.judge === 'Qwen2.5-3B');
    say(E[4].includes(`= ${G.score.toFixed(1)} (mean ${G.mean.toFixed(3)}`) && E[4].includes(`graded the same answer ${G.g}`) && E[4].includes(`${j3.mean_soft.toFixed(1)} against ${j3.mean_g.toFixed(1)}`), `grade 5: ${G.score} ${G.mean} ${G.g} ${j3.mean_soft} ${j3.mean_g}`);
    const C = r.L['sx-cot'], pc = i => Math.round(G.f5[i] * 100) + '%';
    say(C.length === 5 && C[0].includes('3,402 tokens') && C[1].includes(`about ${G.gen} tokens`), 'cot 1-2');
    say(C[2].includes(`${pc(1)} at the 2nd, ${pc(3)} at the 4th, ${pc(6)} at the 7th`), `cot 3: ${G.f5}`);
  }
  await p.close() }
await b.close();
console.log('stages checked', checked, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
