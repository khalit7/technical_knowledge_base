// The 2026-11-06 layout and motion checks for this page, at 1400 px light, 920 px light and 390 px dark:
// the 3D stage at the top (#stg-run, one released run with the memory agent beside it, driven by the page's own trace data) plays by itself
// once scrolled into view, steps to its last step, has exactly one step-list item per step, stops drawing off screen and stops for good on a reader
// control; the Idea animation (#tl, one real memory step through the full design and each Table 2 variant) plays once in view, has one list item
// per step in every mode, stops on the forward button and plays a list item's step once when it is clicked; the Replay tab's card (#rp) is a
// widget (the long-replay rule: up to 32 turns) that never plays by itself and opens on turn 4 of sqlite-with-gcov; at 1400 px every split shows
// two columns; no errors, NaN, undefined or sideways scroll; under prefers-reduced-motion nothing moves by itself; and every number the stage's
// static step list states matches what the scene draws (window.PMRUN), which in turn matches recompute.py's totals (PAPER.rc).
// Writes mid-step screenshots of the stage and the animation.
// usage (from the repo root): node technical_knowledge_base/whats_new/papers/proactive_memory_agent/src/check_stages.mjs [shots dir]
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
const ANIMS = { tl: 't-read' }, WIDGETS = { rp: 't-run' };
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
    // the split: two columns side by side at 1100 px and wider, stacked below
    const splits = await p.$$eval(`#${t} .s3sp`, ss => ss.map(s => { const L = s.querySelector(':scope > .s3L'), R = s.querySelector(':scope > .s3R'); if (!L || !R) return 'missing column';
      const a = L.getBoundingClientRect(), r = R.getBoundingClientRect(); return { side: r.left >= a.right - 1 && r.width > 200 && a.width > 200 } }));
    splits.forEach((s, i) => { if (s === 'missing column') problems.push(`${tag} ${t}: split ${i + 1} lacks a column`); else if (width >= 1100 && !s.side) problems.push(`${tag} ${t}: split ${i + 1} is not two columns`) });
    // 3D stages
    for (const id of await p.$$eval(`#${t} .stg`, xs => xs.map(x => x.id))) {
      checked++;
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2200);
      const f1 = await p.$eval('#' + id, e => +e.dataset.frames || 0);
      if (!(f1 > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
      if (!(await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent)))) problems.push(`${tag}: ${id} is not playing after scrolling into view`);
      const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await listOf(p, id);
      if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but ${lis} list items`);
      // flows stop drawing off screen
      await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await wait(400);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800);
      const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0); if (d1 !== d0) problems.push(`${tag}: ${id} kept drawing off screen (${d1 - d0})`);
      // a reader control stops autoplay for good; step to the last step with the forward button, screenshots on the way
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(200);
      await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
      for (let k = 1; k < n; k++) { await clk(`#${id}-f`); await wait(80);
        if (k === Math.floor(n / 2) || ((width === 1400 || width === 390) && [1, 2, 3, 4, 5, 6].includes(k))) { await wait(3000); await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-step${k + 1}-${scheme}-${width}.png` }) } }
      await wait(3000);
      const shown = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (shown !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on "${shown}"`);
      const on = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return [...l.children].findIndex(x => x.classList.contains('on')) });
      if (on !== n - 1) problems.push(`${tag}: ${id} list marks item ${on + 1} at the last step`);
      if (await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent))) problems.push(`${tag}: ${id} still playing after a reader control`);
    }
    // 2D step animations (makeAnim): each mode
    for (const [id, tab] of Object.entries(ANIMS)) {
      if (tab !== t || !(await p.$('#' + id))) continue;
      checked++;
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      const fr = await p.$eval('#' + id, e => +e.dataset.frames || 0), pl = await p.$eval('#' + id, e => e.hasAttribute('data-playing'));
      if (!(fr > 0) || !pl) problems.push(`${tag}: ${id} did not play when scrolled into view (frames ${fr}, playing ${pl})`);
      for (const m of await p.$$eval(`#${id}M button`, bs => bs.map(b => b.dataset.m))) {
        await clk(`#${id}M button[data-m=${m}]`); await wait(700);
        if (!(await p.$eval('#' + id, e => e.hasAttribute('data-playing')))) problems.push(`${tag}: ${id} did not replay after switching to ${m}`);
        const n = await p.$eval(`#${id}Scrub`, e => +e.max / 100), lis = await listOf(p, id);
        if (lis !== n) problems.push(`${tag}: ${id} ${m} has ${n} steps but ${lis} list items`);
        if (n > 12) problems.push(`${tag}: ${id} ${m} has ${n} steps (the long-replay rule allows about 12 one per frame)`);
        for (let k = 0; k < n; k++) { await clk(`#${id}Fwd`); if (k === Math.floor(n / 2) - 1) await (await p.$('#' + id)).screenshot({ path: `${shots}/anim-${id}-${m}-mid-${scheme}-${width}.png` }) }
        if (await p.$eval('#' + id, e => e.hasAttribute('data-playing'))) problems.push(`${tag}: ${id} still playing after the forward button`);
        const on = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return [...l.children].findIndex(x => x.classList.contains('on')) });
        if (on !== n - 1) problems.push(`${tag}: ${id} ${m} list marks item ${on + 1} at the last step`);
        // a click on a list item plays that step once and stops on it
        await p.evaluate(id => document.getElementById(id).closest('.s3sp').querySelector('ol.sx:not([hidden])').children[1].click(), id);
        const pl2 = await p.$eval('#' + id, e => e.hasAttribute('data-playing'));
        await p.waitForFunction(id => !document.getElementById(id).hasAttribute('data-playing'), { timeout: 15000 }, id).catch(() => problems.push(`${tag}: ${id} ${m} list click did not stop`));
        if (!pl2) problems.push(`${tag}: ${id} ${m} list click did not play its step`);
      }
      await clk(`#${id}M button[data-m=full]`);
    }
    // widgets: never play by themselves, open on an informative step, and step with the forward button
    for (const [id, tab] of Object.entries(WIDGETS)) {
      if (tab !== t || !(await p.$('#' + id))) continue;
      checked++;
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1800);
      const fr = await p.$eval('#' + id, e => +e.dataset.frames || 0), pl = await p.$eval('#' + id, e => e.hasAttribute('data-playing'));
      if (fr > 0 || pl) problems.push(`${tag}: widget ${id} played by itself (frames ${fr})`);
      const s0 = await p.$eval(`#${id}Step`, e => e.textContent); if (!/^Step 4 of 11: Turn 4 of 11/.test(s0)) problems.push(`${tag}: widget ${id} opens on "${s0}"`);
      await clk(`#${id}Fwd`); const s1 = await p.$eval(`#${id}Step`, e => e.textContent); if (!/^Step 5 of 11/.test(s1)) problems.push(`${tag}: widget ${id} forward gave "${s1}"`);
      if (width === 1400) await (await p.$('#' + id)).screenshot({ path: `${shots}/widget-${id}-${scheme}-${width}.png` });
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
  for (const t of ['t-read', 't-run']) { await p.$eval(`#tabs button[data-t=${t}]`, e => e.click()); await wait(300);
    for (const id of await p.$$eval(`#${t} .stg, #${t} #tl, #${t} #rp`, xs => xs.map(x => x.id))) {
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800); const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0);
      const f = await p.$eval('#' + id, e => +e.dataset.frames || 0), pl = await p.$eval('#' + id, e => e.hasAttribute('data-playing'));
      if (f > 0 || pl || d1 !== d0) problems.push(`reduced motion: ${id} moved by itself (frames ${f}, redraws ${d1 - d0})`) } }
  await p.close() }
{ // the numbers the stage's static step list states are the ones the scene draws, and the scene's are recompute.py's
  const p = await b.newPage(); await p.goto(file); await wait(800);
  const r = await p.evaluate(() => ({ J: window.PMRUN, L: document.getElementById('sx-run').innerText.replace(/\s+/g, ' '), T: document.getElementById('sx-tl').innerText.replace(/\s+/g, ' ') }));
  const say = (cond, msg) => { if (!cond) problems.push('step list: ' + msg) };
  const J = r.J, L = r.L, f = J && J.focus, o = J && J.other, t = J && J.total, n = v => v.toLocaleString('en-GB');
  if (!J) problems.push('PMRUN missing'); else {
    say(J.steps === 7 && J.task === 'sqlite-with-gcov', `steps ${J.steps} task ${J.task}`);
    say(L.includes(`acts for ${J.turns} turns`) && L.includes(`growing from ${n(J.first)} to ${n(J.max)} tokens`), `turns ${J.turns}, prompts ${J.first} to ${J.max}`);
    say(f.turn === 4 && L.includes(`Before turn ${f.turn}, the watcher reads`) && L.includes(`here turns 1 to ${f.window}`), `focus turn ${f.turn}, window ${f.window}`);
    say(L.includes(`its own bank: ${f.before[0]} knowledge entries (teal) and ${f.before[1]} procedural`) && L.includes(`The bank now holds ${f.after[0]} and ${f.after[1]}`), `bank ${f.before} to ${f.after}`);
    say(f.ops.join() === 'SAVE_PROCEDURAL,UPDATE_STATUS', `Phase 1 ops ${f.ops}`);
    say(L.includes(`${f.chars} characters, about ${f.tokens} tokens, appended to turn ${f.turn}'s ${n(f.prompt)}-token call`) && f.label === 'diagnose' && L.includes('"diagnose" label'), `reminder ${f.chars} ${f.tokens} ${f.prompt} ${f.label}`);
    say(L.includes(`silent at ${J.triggers - J.inject} of ${J.triggers} steps`) && L.includes(`All ten memory steps`) && J.triggers === 10, `run ${J.inject} of ${J.triggers}`);
    say(J.remindTurns.join() === '3,4,9' && L.includes('into turns 3, 4 and 9') && J.labels.diagnose === 2 && J.labels.recall === 1 && J.labels.check === 0 && L.includes('two diagnoses and one recall'), `reminders ${J.remindTurns} ${JSON.stringify(J.labels)}`);
    say(L.includes(`never holds more than ${J.bankMax} entries`), `bank max ${J.bankMax}`);
    say(Math.abs(J.memIn - J.memInRc) <= 1 && L.includes(`about ${Math.round(J.memIn / 1000)}k tokens over the run against ${Math.round(J.actorIn / 1000)}k for the actor`), `memory input ${J.memIn} (${J.memInRc}) against ${J.actorIn}`);
    say(L.includes(`${J.cpt.toFixed(2)} characters per token`) && L.includes(`about ${t.ratio.toFixed(1)} times the actor's input`) && L.includes(`an estimated ${t.cost.toFixed(1)} times the baselines`), `ratios ${t.ratio} ${t.cost} ${J.cpt}`);
    say(L.includes(`(${o.turns} turns)`) && L.includes(`grows to ${o.pMax} entries and is deleted at memory step ${o.cleared}`) && L.includes(`${o.inject} of ${o.triggers} steps`) && L.includes(`speaks at ${o.inject} of ${o.triggers}`), `other run ${JSON.stringify(o)}`);
    say(L.includes(`speaks at ${t.inject} of ${t.triggers} steps (${Math.round(100 * t.inject / t.triggers)}%): ${t.diagnose} diagnoses, ${t.recall} recalls and ${t.check} checks`), `five runs ${JSON.stringify(t)}`);
    say(r.T.includes(`${n(f.prompt)}-token prompt`) && r.T.includes('2 knowledge and 3 procedural entries') && r.T.includes(`silent at ${J.triggers - J.inject} of its ${J.triggers} memory steps`), 'the Idea step list disagrees with the stage');
  }
  await p.close() }
await b.close();
console.log('stages and animations checked', checked, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
