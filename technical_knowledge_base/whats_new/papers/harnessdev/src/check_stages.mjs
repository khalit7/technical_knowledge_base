// The 2026-11-06 layout and motion checks for this page, at 1400 px light, 920 px light and 390 px dark:
// the two 3D stages (#stg-proto, the protocol: seed, creator, the 18 code harnesses' modules, frozen, Self-Eval, Unified-Eval, human reference;
// #stg-evo, Evolution: one lineage's visible and held-out scores, then all nine lineages' gains) play by themselves once scrolled into view,
// step to their last step, have exactly one step-list item per step, stop drawing off screen and stop for good on a reader control; the
// replay of the Replay tab (#ev) plays once in view, has one list item per version for every lineage and both views, respects the
// long-replay rule (at most 12 steps, one per official version plus the declaration), stops on the forward button and plays a list item's step
// once when it is clicked; at 1400 px every split shows two columns; no errors, NaN, undefined or sideways scroll; under prefers-reduced-motion
// nothing moves by itself; and every number the two stages' static step lists state matches the page's data (window.HDPROTO, window.HDEVO).
// Writes a mid-step screenshot of each stage and animation.
// usage (from the repo root): node technical_knowledge_base/whats_new/papers/harnessdev/src/check_stages.mjs [shots dir]
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
const ANIMS = { ev: ['t-run', 'evEp'] };
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
      // flows stop drawing off screen (the stage is the first thing on the tab, so scroll to the bottom to leave it)
      await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await wait(400);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800);
      const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0); if (d1 !== d0) problems.push(`${tag}: ${id} kept drawing off screen (${d1 - d0})`);
      // a reader control stops autoplay for good; step to the last step with the forward button, a screenshot in the middle
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(200);
      await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
      for (let k = 1; k < n; k++) { await clk(`#${id}-f`); await wait(80); if (k === Math.floor(n / 2)) { await wait(2000); await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-mid-${scheme}-${width}.png` }) } }
      await wait(2000);
      const shown = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (shown !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on "${shown}"`);
      const on = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return [...l.children].findIndex(x => x.classList.contains('on')) });
      if (on !== n - 1) problems.push(`${tag}: ${id} list marks item ${on + 1} at the last step`);
      if (await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent))) problems.push(`${tag}: ${id} still playing after a reader control`);
    }
    // 2D step animations (makeAnim): each input (task or world) and each mode
    for (const [id, [tab, inp]] of Object.entries(ANIMS)) {
      if (tab !== t || !(await p.$('#' + id))) continue;
      checked++;
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      const fr = await p.$eval('#' + id, e => +e.dataset.frames || 0), pl = await p.$eval('#' + id, e => e.hasAttribute('data-playing'));
      if (!(fr > 0) || !pl) problems.push(`${tag}: ${id} did not play when scrolled into view (frames ${fr}, playing ${pl})`);
      const opts = await p.$$eval(`#${inp} option`, os => os.map(o => o.value));
      for (const ov of opts) {
        await p.evaluate((inp, ov) => { const e = document.getElementById(inp); e.value = ov; e.dispatchEvent(new Event('change', { bubbles: true })) }, inp, ov);
        const modes0 = await p.$$eval(`#${id}M button`, bs => bs.map(b => b.dataset.m)), modes = modes0.length ? modes0 : [null];
        for (const m of modes) {
          if (m) await clk(`#${id}M button[data-m=${m}]`); await wait(700);
          if (!(await p.$eval('#' + id, e => e.hasAttribute('data-playing')))) problems.push(`${tag}: ${id} ${ov} did not replay after switching to ${m}`);
          const n = await p.$eval(`#${id}Scrub`, e => +e.max / 100), lis = await listOf(p, id);
          if (lis !== n) problems.push(`${tag}: ${id} ${ov} ${m} has ${n} steps but ${lis} list items`);
          if (n > 12) problems.push(`${tag}: ${id} ${ov} ${m} has ${n} steps (the long-replay rule allows about 12 one per frame)`);
          for (let k = 0; k < n; k++) { await clk(`#${id}Fwd`); if (k === Math.floor(n / 2) - 1 && ov === opts[0]) await (await p.$('#' + id)).screenshot({ path: `${shots}/anim-${id}-${m}-mid-${scheme}-${width}.png` }) }
          if (await p.$eval('#' + id, e => e.hasAttribute('data-playing'))) problems.push(`${tag}: ${id} still playing after the forward button`);
          const on = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return [...l.children].findIndex(x => x.classList.contains('on')) });
          if (on !== n - 1) problems.push(`${tag}: ${id} ${ov} ${m} list marks item ${on + 1} at the last step`);
          if (ov !== opts[0] || n < 2) continue;
          // a click on a list item plays that step once and stops on it
          await p.evaluate(id => document.getElementById(id).closest('.s3sp').querySelector('ol.sx:not([hidden])').children[1].click(), id);
          const pl2 = await p.$eval('#' + id, e => e.hasAttribute('data-playing'));
          await p.waitForFunction(id => !document.getElementById(id).hasAttribute('data-playing'), { timeout: 15000 }, id).catch(() => problems.push(`${tag}: ${id} ${m} list click did not stop`));
          if (!pl2) problems.push(`${tag}: ${id} ${m} list click did not play its step`);
        }
      }
      await p.evaluate(inp => { const e = document.getElementById(inp); e.selectedIndex = 0; e.dispatchEvent(new Event('change', { bubbles: true })) }, inp);
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
    for (const id of await p.$$eval(`#${t} .stg, #${t} #ev`, xs => xs.map(x => x.id))) {
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800); const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0);
      const f = await p.$eval('#' + id, e => +e.dataset.frames || 0), pl = await p.$eval('#' + id, e => e.hasAttribute('data-playing'));
      if (f > 0 || pl || d1 !== d0) problems.push(`reduced motion: ${id} moved by itself (frames ${f}, redraws ${d1 - d0})`) } }
  await p.close() }
{ // the numbers the two stages' static step lists state are the ones the page's data holds
  const p = await b.newPage(); await p.goto(file); await wait(800);
  const r = await p.evaluate(() => ({ A: window.HDPROTO, E: window.HDEVO, L1: document.getElementById('sx-proto').innerText, L2: document.getElementById('sx-evo').innerText }));
  const A = r.A, E = r.E, say = (cond, msg) => { if (!cond) problems.push('step list: ' + msg) };
  const f1 = v => v.toFixed(1);
  if (!A || !E) problems.push('HDPROTO or HDEVO missing'); else {
    const L = r.L1;
    say(A.tasks.join() === '731,89,75,46,1266' && A.total === 2207 && L.includes('731 SWE-Pro, 89 Terminal-Bench, 75 MLE-bench, 46 EQ-Bench3 and 1,266 BrowseComp, 2,207 in all'), `tasks ${A.tasks} ${A.total}`);
    say(A.mods.join() === '18,13,,1,13,15' && L.includes('execution loop 18, verification 15, tools 13, lifecycle 13, state 1'), `modules ${A.mods}`);
    say(L.includes(A.self.map(f1).slice(0, 4).join(', ') + ' and ' + f1(A.self[4])), `Self-Eval ${A.self}`);
    const fall = A.self.filter((v, j) => A.uni[j] < v).length;
    say(fall === 4 && L.includes('falls on four of the five') && L.includes(`SWE-Pro ${f1(A.self[0])} to ${f1(A.uni[0])}`) && L.includes(`EQ-Bench3 ${f1(A.self[3])} to ${f1(A.uni[3])}`) && L.includes(`gains ${f1(A.uni[4] - A.self[4])} on BrowseComp`), `Unified-Eval ${A.uni}`);
    say(A.refModel.join() === 'Claude Fable 5,GPT-5.6 Sol,Gemini 3.1,Opus 4.8,GPT-5.6 Sol' && L.includes('behind on the first three and ahead on the last two') && A.self.every((v, j) => [0, 1, 4].includes(j) ? v < A.ref[j] : v > A.ref[j]), `references ${A.ref} ${A.refModel}`);
    const M = r.L2, Q = E.lineage, q = E.qwen, d = Q.declared;
    say(Q.n === 9 && M.includes('nine official versions'), `lineage of ${Q.n}`);
    say(d === 4 && M.includes(`a pair of ${f1(q.fbd)} against ${f1(q.fb0)}`) && M.includes(q.fbgain + ', the largest visible gain') && Math.max(...E.gains.map(g => g.fb)) === parseFloat(q.fbgain), `declared H${d} ${q.fbgain}`);
    say(M.includes(`gains only ${q.hogain} there (${Q.ho630[d]} of 630 tasks against ${Q.ho630[0]})`), `held-out ${q.hogain} ${Q.ho630[d]} ${Q.ho630[0]}`);
    say(M.includes(`up ${(Q.pair[3] - Q.pair[0]).toFixed(1)} visible points, collapsed to ${Q.ho630[3]} of 630 (${f1(Q.ho[3])}%)`) && Q.best_ho === 5 && M.includes(`H5 (${f1(Q.ho[5])}%)`), `H3 ${Q.ho630[3]} best H${Q.best_ho}`);
    const fb = E.gains.map(g => g.fb), ins = E.gains.filter(g => Math.abs(g.fb) <= 4.75).map(g => g.fbp);
    say(fb.every(v => v > 0) && M.includes(`All nine are positive, +${f1(Math.min(...fb))} to +${f1(Math.max(...fb))}`) && E.inside === 3 && M.includes('Opus self ' + ins[0]) && M.includes('Qwen fixed ' + ins[1]) && M.includes('GPT-5.5 fixed ' + ins[2]), `visible gains ${fb}`);
    const hs = E.gains.filter(g => g.self).map(g => g.ho), hf = E.gains.filter(g => !g.self);
    say(M.includes(`shrink to +${Math.min(...hs).toFixed(2)} to +${Math.max(...hs).toFixed(2)}`) && hf.filter(g => g.ho > 0).map(g => g.name).join() === 'Opus' && M.includes(`falls ${(-hf[3].ho).toFixed(2)} points`), `held-out gains ${E.gains.map(g => g.ho)}`);
    say(E.bestIsDeclared === 2 && M.includes('only 2 of 9 lineages') && M.includes(`a version ${hf[3].gap.toFixed(2)} points better`), `best held-out ${E.bestIsDeclared} ${hf[3].gap}`);
  }
  await p.close() }
await b.close();
console.log('stages and animations checked', checked, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
