// The 2026-11-06 layout and motion checks for this page, at 1400 px light, 920 px light and 390 px dark:
// the 3D stage (#stg-loop, Figure 2 redrawn: the routing harness and one round of the post-training loop, with a curate-once list swapped in
// by the toggle) plays by itself once scrolled into view, steps to its last step, has exactly one step-list item per step in both lists,
// stops drawing off screen and stops for good on a reader control; the curriculum animation of the Schedule tab (#cu) plays once in view,
// has one list item per step for every ordering and traffic mix, stops on the forward button and plays a list item's step once when it is
// clicked; at 1400 px every split shows two columns; no errors, NaN, undefined or sideways scroll; under prefers-reduced-motion nothing
// moves by itself; and every number the stage's static step lists state matches what the scene draws (window.NHLOOP: the evaluation bars
// from recompute.json, the illustrative pool and OPD toy at the Schedule tab's defaults, which are checked to be the tab's own defaults).
// Writes a mid-step screenshot of the stage and the animation.
// usage (from the repo root): node technical_knowledge_base/whats_new/papers/neohorse_1/src/check_stages.mjs [shots dir]
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
const ANIMS = { cu: ['t-run', 'cuMix'] };
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
    // the loop stage's second list (curate once): the toggle swaps the list and replays
    if (t === 't-read' && await p.$('#loopM')) {
      await clk('#loopM button[data-m=once]'); await wait(300);
      const n = await p.$eval('#stg-loop-r', e => +e.max + 1), lis = await listOf(p, 'stg-loop');
      if (lis !== n || n !== 4) problems.push(`${tag}: stg-loop curate-once has ${n} steps but ${lis} list items`);
      await p.$eval('#stg-loop', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      if (!(await p.$eval('#stg-loop-p', e => /Pause/.test(e.textContent)))) problems.push(`${tag}: stg-loop did not replay after the toggle`);
      await p.evaluate(() => { const e = document.getElementById('stg-loop-r'); e.value = 1; e.dispatchEvent(new Event('input')) }); await wait(2200);
      await (await p.$('#stg-loop')).screenshot({ path: `${shots}/stage-stg-loop-once-mid-${scheme}-${width}.png` });
      await clk('#loopM button[data-m=loop]'); await wait(300);
      const n2 = await p.$eval('#stg-loop-r', e => +e.max + 1), l2 = await listOf(p, 'stg-loop');
      if (l2 !== n2 || n2 !== 7) problems.push(`${tag}: stg-loop loop has ${n2} steps but ${l2} list items after toggling back`);
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
    for (const id of await p.$$eval(`#${t} .stg, #${t} #cu`, xs => xs.map(x => x.id))) {
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800); const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0);
      const f = await p.$eval('#' + id, e => +e.dataset.frames || 0), pl = await p.$eval('#' + id, e => e.hasAttribute('data-playing'));
      if (f > 0 || pl || d1 !== d0) problems.push(`reduced motion: ${id} moved by itself (frames ${f}, redraws ${d1 - d0})`) } }
  await p.close() }
{ // the numbers the stage's static step lists state are the ones the scene draws, and the scene's illustrative inputs are the Schedule tab's defaults
  const p = await b.newPage(); await p.goto(file); await wait(800);
  const r = await p.evaluate(() => ({ L: window.NHLOOP, LL: document.getElementById('sx-loop').textContent.replace(/\s+/g, ' '), LO: document.getElementById('sx-once').textContent.replace(/\s+/g, ' '),
    def: { mix: document.getElementById('cuMix').value, conf: +document.getElementById('cuConf').value, res: +document.getElementById('cuRes').value, opT: document.getElementById('opT').value, opK: +document.getElementById('opK').value },
    gain4: PAPER.rc.gain4, gain9: PAPER.rc.gain9, d4: PAPER.rc.d4, d9: PAPER.rc.d9, ben: PAPER.tables.bench.map(b => b.n) }));
  const say = (cond, msg) => { if (!cond) problems.push('step list: ' + msg) };
  const L = r.L, f2 = v => v.toFixed(2), f3 = v => v.toFixed(3);
  if (!L) problems.push('NHLOOP missing'); else {
    say(r.def.mix === 'bal' && r.def.conf === 55 && r.def.res === 20 && r.def.opT === 'tail' && r.def.opK === 4 && L.opd.K === 4, `scene inputs are not the Schedule tab's defaults ${JSON.stringify(r.def)}`);
    say(L.tiers.reduce((a, x) => a + x, 0) === 120 && r.LL.includes('pool of 120 turns: ' + L.tiers.slice(0, 3).join(', ') + ' and ' + L.tiers[3] + ' assigned to C0 to C3'), `tiers ${L.tiers}`);
    const ms = L.means.soft.map(f2);
    say(r.LL.includes(`mean soft score of the three stages is ${ms[0]}, ${ms[1]} and ${ms[2]}`) && r.LL.includes(`with ${L.reserved} easy examples held back`), `soft means ${ms} reserved ${L.reserved}`);
    say(r.LL.includes(`teacher puts ${f3(L.opd.tailQ)} in the tail bin against the student's ${f3(L.opd.tailP)}`) && r.LL.includes(`coarsened KL is ${f3(L.opd.coarse)} of the full ${f3(L.opd.full)} nats`) && r.LL.includes('K = 4'), `opd ${JSON.stringify(L.opd)}`);
    say(L.d4.every(v => v > 0) && r.LL.includes('up on all ten, macro +' + f2(r.gain4)) && r.LL.includes('macro +' + f2(r.gain9)) && L.gain4 === r.gain4 && L.gain9 === r.gain9 && L.d4.join() === r.d4.join() && L.d9.join() === r.d9.join(), 'evaluation gains');
    const z9 = r.ben.filter((n, i) => L.d9[i] === 0), n9 = r.ben.filter((n, i) => L.d9[i] < 0);
    say(z9.join() === 'LiveCodeBench v6,IFBench' && n9.join() === 'IFEval' && r.LL.includes('LiveCodeBench and IFBench 0.00, IFEval \u2212' + f2(-L.d9[9])), `9B zeros ${z9} negatives ${n9}`);
    const mo = L.means.shuf.map(f2);
    say(r.LO.includes(`stage means ${mo[0]}, ${mo[1]} and ${mo[2]}`), `shuffled means ${mo}`);
  }
  await p.close() }
await b.close();
console.log('stages and animations checked', checked, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
