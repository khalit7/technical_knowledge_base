// The 2026-11-06 layout and motion checks for this page, at 1400 px light, 920 px light and 390 px dark:
// the 3D stage at the top (#stg-stream, the paper's test stream on the 140 ALFWorld goals, seed 7, run by the page's own replay engine) plays by itself
// once scrolled into view, steps to its last step, has exactly one step-list item per step, stops drawing off screen and stops for good on a reader
// control; the Idea animation (#tl, read time against write time) plays once in view, has one list item per step in both modes, stops on the forward
// button and plays a list item's step once when it is clicked; the replay tab's batch card (#cap) is a widget (the long-replay rule: 14 batches) and
// never plays by itself; at 1400 px every split shows two columns; no errors, NaN, undefined or sideways scroll; under prefers-reduced-motion nothing
// moves by itself; and every number the stage's static step list states matches what the scene draws (window.JITSTREAM), which in turn matches the
// replay engine's own statistics for the same ordering and the decomposition the page computes from Tables 1 and 9.
// Writes a mid-step screenshot of the stage and the animation.
// usage (from the repo root): node technical_knowledge_base/whats_new/papers/just_in_time_memory/src/check_stages.mjs [shots dir]
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
const ANIMS = { tl: 't-read' }, WIDGETS = { cap: 't-run' };
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
        if (k === Math.floor(n / 2) || (width === 1400 && [2, 3, 5, 6, 7].includes(k))) { await wait(3000); await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-step${k + 1}-${scheme}-${width}.png` }) } }
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
      await clk(`#${id}M button[data-m=read]`);
    }
    // widgets: never play by themselves, open on an informative step, and step with the forward button
    for (const [id, tab] of Object.entries(WIDGETS)) {
      if (tab !== t || !(await p.$('#' + id))) continue;
      checked++;
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1800);
      const fr = await p.$eval('#' + id, e => +e.dataset.frames || 0), pl = await p.$eval('#' + id, e => e.hasAttribute('data-playing'));
      if (fr > 0 || pl) problems.push(`${tag}: widget ${id} played by itself (frames ${fr})`);
      const s0 = await p.$eval(`#${id}Step`, e => e.textContent); if (!/^Step 5 of 14/.test(s0)) problems.push(`${tag}: widget ${id} opens on "${s0}"`);
      await clk(`#${id}Fwd`); const s1 = await p.$eval(`#${id}Step`, e => e.textContent); if (!/^Step 6 of 14/.test(s1)) problems.push(`${tag}: widget ${id} forward gave "${s1}"`);
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
    for (const id of await p.$$eval(`#${t} .stg, #${t} #tl, #${t} #cap`, xs => xs.map(x => x.id))) {
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800); const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0);
      const f = await p.$eval('#' + id, e => +e.dataset.frames || 0), pl = await p.$eval('#' + id, e => e.hasAttribute('data-playing'));
      if (f > 0 || pl || d1 !== d0) problems.push(`reduced motion: ${id} moved by itself (frames ${f}, redraws ${d1 - d0})`) } }
  await p.close() }
{ // the numbers the stage's static step list states are the ones the scene draws, and the scene's are the engine's
  const p = await b.newPage(); await p.goto(file); await wait(800);
  const r = await p.evaluate(() => { const goals = PAPER.alf.map(x => x[1]), types = PAPER.alf.map(x => x[0]), R = JS_STREAM.run(goals, 7, 0.774, 10, 3), S = JS_STREAM.stats(types, R, 10);
    return { J: window.JITSTREAM, E: { stored: S.stored, never: Math.round(S.never_used * S.stored), first: S.first_delay_mean, med: S.first_delay_median }, Q: PAPER.stream['0.774'],
      L: document.getElementById('sx-stream').innerText } });
  const say = (cond, msg) => { if (!cond) problems.push('step list: ' + msg) };
  const J = r.J, L = r.L, E = r.E;
  if (!J) problems.push('JITSTREAM missing'); else {
    say(J.steps === 8 && J.batches === 14 && L.includes('14 batches of 10'), `batches ${J.batches}`);
    say(J.batch1 === 8 && L.includes('its 8 successes are stored raw'), `batch 1 stored ${J.batch1}`);
    say(J.bank4 === 28 && L.includes('the bank holds 28 after batch 4'), `bank after batch 4 ${J.bank4}`);
    say(J.hl.task === 32 && J.hl.batch === 4 && J.hl.stored && J.hl.goal === 'heat some egg and put it in countertop.' && L.includes('Task 32, "heat some egg and put it in countertop", is stored after batch 4'), `followed task ${JSON.stringify(J.hl)}`);
    say(J.hl.first === 50 && J.hl.firstGoal === 'put a cool egg in microwave.' && J.hl.delays[0] === 18 && L.includes('task 50, "put a cool egg in microwave"') && L.includes('18 tasks later'), `first use ${J.hl.first} ${J.hl.delays[0]}`);
    say(J.hl.uses.length === 4 && J.hl.types.length === 3 && J.hl.delays.join() === '18,59,87,94' && L.includes('retrieved by 4 tasks (cool, heat twice, place), 18, 59, 87 and 94 tasks after'), `uses ${J.hl.uses} ${J.hl.delays} ${J.hl.types}`);
    say(J.stored === 92 && J.never === 19 && Math.round(100 * J.neverShare) === 21 && J.firstMean.toFixed(1) === '20.2' && L.includes('92 trajectories are stored before the last batch; 19 of them (21%)') && L.includes('20.2 tasks after storage'), `whole stream ${J.stored} ${J.never} ${J.firstMean}`);
    say(J.stored === E.stored && J.never === E.never && J.firstMean === E.first, 'scene and engine disagree on the whole-stream statistics');
    say(L.includes(`Over 200 orderings: ${r.Q.first_delay_mean.toFixed(1)} tasks, and ${Math.round(100 * r.Q.never_used)}% never used`), 'the 200-ordering figures');
    const a = J.alf, w = J.ws;
    say(L.includes(`on ALFWorld ${a.no_memory.toFixed(1)}, then +${a.read_time_untrained.toFixed(1)} from the untrained read-time curator and +${a.rl.toFixed(1)} from RL training (${Math.round(100 * a.share_rl)}% of the gain)`), `ALFWorld decomposition ${JSON.stringify(a)}`);
    say(L.includes(`on WebShop SR ${w.no_memory.toFixed(1)}, +${w.read_time_untrained.toFixed(1)} and +${w.rl.toFixed(1)} (${Math.round(100 * w.share_rl)}%)`), `WebShop decomposition ${JSON.stringify(w)}`);
    say(L.includes(`RL-trained SkillOS, ${a.skillos.toFixed(1)} and ${w.skillos.toFixed(1)}`), 'SkillOS sheets');
    say(Math.abs(a.no_memory + a.read_time_untrained + a.rl - a.full) < .051 && Math.abs(w.no_memory + w.read_time_untrained + w.rl - w.full) < .051, 'the stacked bars do not add up to the full JitMem cell');
  }
  await p.close() }
await b.close();
console.log('stages and animations checked', checked, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
