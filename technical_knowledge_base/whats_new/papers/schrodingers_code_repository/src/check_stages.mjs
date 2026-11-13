// The 2026-11-06 layout and motion checks for this page, at 1400 px light, 920 px light and 390 px dark:
// the two 3D stages (#stg-idea, how a view is drawn per run, on the Idea section; #stg-cs, the case study in the familiar and the renamed view,
// a mode toggle #csM swapping its step list) play by themselves once scrolled into view, step to their last step, have exactly one step-list
// item per step, stop drawing off screen and stop for good on a reader control; the mode toggle replays the case stage with the other list;
// the 2D Level 2 / Level 3 animation (#tp, makeAnim) plays when scrolled into view, has one list item per step in both modes and stops on a
// control; at 1400 px every split shows two columns; no errors, NaN, undefined or sideways scroll; under prefers-reduced-motion nothing moves
// by itself; and every number the static step lists state matches the page's data (window.SCHRO_IDEA, window.SCHRO_CS).
// Writes a mid-step screenshot of each stage (and of each mode of the case stage) and of the 2D animation.
// usage (from the repo root): node technical_knowledge_base/whats_new/papers/schrodingers_code_repository/src/check_stages.mjs [shots dir]
import puppeteer from '../../../../../html_utils/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const file = 'file://' + path.resolve(here, '../index.html');
const shots = process.argv[2] || path.resolve(here, '../.shots'); fs.mkdirSync(shots, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const problems = []; let checked = 0;
const wait = ms => new Promise(r => setTimeout(r, ms));
const listOf = (p, id) => p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return l ? l.children.length : 0 });
const MODES = { 'stg-cs': ['csM', ['orig', 'map']] };
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
    // the split: two columns side by side at 1100 px and wider
    const splits = await p.$$eval(`#${t} .s3sp`, ss => ss.map(s => { const L = s.querySelector(':scope > .s3L'), R = s.querySelector(':scope > .s3R'); if (!L || !R) return 'missing column';
      const a = L.getBoundingClientRect(), r = R.getBoundingClientRect(); return { side: r.left >= a.right - 1 && r.width > 200 && a.width > 200 } }));
    splits.forEach((s, i) => { if (s === 'missing column') problems.push(`${tag} ${t}: split ${i + 1} lacks a column`); else if (width >= 1100 && !s.side) problems.push(`${tag} ${t}: split ${i + 1} is not two columns`) });
    for (const id of await p.$$eval(`#${t} .stg`, xs => xs.map(x => x.id))) {
      checked++;
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2200);
      const f1 = await p.$eval('#' + id, e => +e.dataset.frames || 0);
      if (!(f1 > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
      if (!(await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent)))) problems.push(`${tag}: ${id} is not playing after scrolling into view`);
      // flows stop drawing off screen
      await p.evaluate(id => { const e = document.getElementById(id), y = e.getBoundingClientRect().top + scrollY; window.scrollTo(0, y > 3000 ? 0 : document.body.scrollHeight) }, id); await wait(500);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800);
      const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0); if (d1 !== d0) problems.push(`${tag}: ${id} kept drawing off screen (${d1 - d0})`);
      const [seg, modes] = MODES[id] || [null, [null]];
      for (const m of modes) {
        await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(200);
        if (m && m !== modes[0]) { await clk(`#${seg} button[data-m=${m}]`); await wait(600);
          if (!(await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent)))) problems.push(`${tag}: ${id} did not replay after switching to ${m}`) }
        const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await listOf(p, id);
        if (lis !== n) problems.push(`${tag}: ${id} ${m || ''} has ${n} steps but ${lis} list items`);
        // a reader control stops autoplay for good; step to the last step with the forward button, a screenshot in the middle
        await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
        for (let k = 1; k < n; k++) { await clk(`#${id}-f`); await wait(80); if (k === Math.floor(n / 2)) { await wait(2000); await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}${m ? '-' + m : ''}-mid-${scheme}-${width}.png` }) } }
        await wait(2000);
        const shown = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (shown !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ${m || ''} ended on "${shown}"`);
        const on = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return [...l.children].findIndex(x => x.classList.contains('on')) });
        if (on !== n - 1) problems.push(`${tag}: ${id} ${m || ''} list marks item ${on + 1} at the last step`);
        if (width === 1400) await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}${m ? '-' + m : ''}-last-${scheme}-${width}.png` });
        if (await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent))) problems.push(`${tag}: ${id} still playing after a reader control`);
        // a list item click jumps to its step and does not start playing
        await p.evaluate(id => document.getElementById(id).closest('.s3sp').querySelector('ol.sx:not([hidden])').children[1].click(), id); await wait(300);
        if ((await p.$eval(`#${id} .stg-st`, e => e.textContent)) !== `step 2 of ${n}`) problems.push(`${tag}: ${id} ${m || ''} list click did not go to step 2`);
        if (id === 'stg-idea') { // the close view of step 5
          await p.evaluate(id => document.getElementById(id).closest('.s3sp').querySelector('ol.sx').children[4].click(), id); await wait(1800);
          await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-step5-${scheme}-${width}.png` }) }
      }
      if (seg) await clk(`#${seg} button[data-m=${modes[0]}]`);
    }
    // the 2D animation (makeAnim): plays when scrolled into view, one list item per step in both modes, stops on a control
    if (await p.$(`#${t} #tp`)) {
      checked++;
      await p.$eval('#tp', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      const pl = await p.$eval('#tpPlay', e => e.textContent), fr = await p.$eval('#tp', e => +e.dataset.frames || 0);
      if (!/Pause/.test(pl) || !fr) problems.push(`${tag}: tp did not play when scrolled into view (${pl.trim()}, ${fr} frames)`);
      for (const m of ['l2', 'l3']) {
        await clk(`#tpM button[data-m=${m}]`); await wait(400);
        if (!(await p.$eval('#tpPlay', e => /Pause/.test(e.textContent)))) problems.push(`${tag}: tp did not replay after switching to ${m}`);
        const n = await p.$eval('#tpScrub', e => e.max / 100), lis = await p.$eval(`#sx-tp-${m}`, l => l.hidden ? -1 : l.children.length);
        if (lis !== n) problems.push(`${tag}: tp ${m} has ${n} steps but ${lis} list items`);
        await clk('#tpBack'); await wait(100);
        if (await p.$eval('#tpPlay', e => /Pause/.test(e.textContent))) problems.push(`${tag}: tp ${m} still playing after a control`);
        for (let k = 0; k < n; k++) { await clk('#tpFwd'); if (k === Math.floor(n / 2)) { await wait(200); await (await p.$('#tp')).screenshot({ path: `${shots}/anim-tp-${m}-mid-${scheme}-${width}.png` }) } }
        const on = await p.$eval(`#sx-tp-${m}`, l => [...l.children].findIndex(x => x.classList.contains('on')));
        if (on !== n - 1) problems.push(`${tag}: tp ${m} list marks item ${on + 1} at the last step`);
        const f0 = await p.$eval('#tp', e => +e.dataset.frames || 0); await wait(900);
        if ((await p.$eval('#tp', e => +e.dataset.frames || 0)) !== f0) problems.push(`${tag}: tp ${m} moved after a control`);
      }
      await clk('#tpM button[data-m=l2]'); await clk('#tpPlay');
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
    for (const id of await p.$$eval(`#${t} .stg`, xs => xs.map(x => x.id))) {
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800); const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0);
      const f = await p.$eval('#' + id, e => +e.dataset.frames || 0), pl = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent));
      if (f > 0 || pl || d1 !== d0) problems.push(`reduced motion: ${id} moved by itself (frames ${f}, redraws ${d1 - d0})`) }
    if (await p.$(`#${t} #tp`)) { await p.$eval('#tp', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      const f = await p.$eval('#tp', e => +e.dataset.frames || 0), pl = await p.$eval('#tpPlay', e => /Pause/.test(e.textContent));
      if (f > 0 || pl) problems.push(`reduced motion: tp moved by itself (frames ${f})`) } }
  await p.close() }
{ // the numbers the static step lists state are the ones the page's data holds
  const p = await b.newPage(); await p.goto(file); await wait(800);
  const r = await p.evaluate(() => ({ I: window.SCHRO_IDEA, C: window.SCHRO_CS,
    LI: [...document.getElementById('sx-idea').children].map(li => li.innerText), LO: [...document.getElementById('sx-cs-orig').children].map(li => li.innerText),
    LM: [...document.getElementById('sx-cs-map').children].map(li => li.innerText), cap: document.getElementById('sx-cs-map').nextElementSibling.innerText }));
  const say = (cond, msg) => { if (!cond) problems.push('step list: ' + msg) }, g = v => v.toLocaleString('en-GB');
  const ord = n => n + (n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th');
  if (!r.I || !r.C) problems.push('SCHRO_IDEA or SCHRO_CS missing'); else {
    const I = r.I, L = r.LI;
    say(L.length === 6, `idea list ${L.length} items`);
    say(L[1].includes(`becomes ${I.proj}`) && I.files.every(([a, v]) => a === v || L[1].includes(`${a} becomes ${v}`) || !/^(base|query|fields)/.test(a)), `idea renamings ${JSON.stringify(I.files)}`);
    say(L[4].includes(`its ${I.n} top-level definitions`) && L[4].includes(`${g(I.lines)} in all`) && L[4].includes(`moves ${I.moved} of the ${I.n}`), `Level 3 counts n ${I.n} lines ${I.lines} moved ${I.moved}`);
    say(L[4].includes(`Field (${I.fieldLines} lines) goes from ${ord(I.fieldFrom)} to ${ord(I.fieldTo)}`), `Field ${I.fieldLines} lines, ${I.fieldFrom} to ${I.fieldTo}`);
    say(L[4].includes(`${I.hunk[1]} lines of contribute_to_class from file line ${I.hunk[0]}`), `gold hunk ${I.hunk}`);
    say(L[5].includes(`${I.f2p} Fail-to-Pass test (${I.f2pName})`) && L[5].includes(`${I.p2p} Pass-to-Pass tests`), `tests ${I.f2p} ${I.p2p} ${I.f2pName}`);
    const C = r.C;
    say(r.LO.length === C.steps.orig && r.LM.length === C.steps.map, `case lists ${r.LO.length}, ${r.LM.length} against ${JSON.stringify(C.steps)}`);
    say(r.LO[r.LO.length - 1].includes(`${C.tot.orig} actions in all`) && r.LO[r.LO.length - 1].includes(`renamed run's ${C.tot.map}`), `familiar total ${C.tot.orig}`);
    say(r.LM[r.LM.length - 1].includes(`${C.tot.map} actions in all, ${(C.tot.map / C.tot.orig).toFixed(1)} times as many as the familiar run's ${C.tot.orig}`), `renamed total ${C.tot.map}`);
    say(r.LM[3].includes(C.names.map[8]) && r.LM[3].includes(C.names.map[3]), `renamed files ${C.names.map[8]}, ${C.names.map[3]}`);
  }
  await p.close() }
await b.close();
console.log('stages and animations checked', checked, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
