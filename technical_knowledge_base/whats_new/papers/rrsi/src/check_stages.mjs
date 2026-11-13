// The 2026-11-06 layout and motion checks for this page, at 1400 px light, 920 px light and 390 px dark:
// the 3D stage (#stg-loop, RRSI's selection rules on the released coding run) plays by itself once scrolled into view, steps to its last
// step, has exactly one step-list item per step, stops drawing off screen and stops for good on a reader control; the two step animations
// (#sm, the noise-chasing toy in Problem, opened through its predict question; #rp, a released run replayed in stretches) play once in
// view, have one list item per step in every mode (and after a change of seed or run), respect the long-replay rule (at most 12 steps),
// stop on the forward button, and play a list item's step once when it is clicked; at 1400 px every split shows two columns; no errors,
// NaN, undefined or sideways scroll; under prefers-reduced-motion nothing moves by itself; and every number the hero's static step list
// states matches what the scene reads from the released record (window.LOOPDATA). Writes a mid-step screenshot of each stage and animation.
// usage (from the repo root): node technical_knowledge_base/whats_new/papers/rrsi/src/check_stages.mjs [shots dir]
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
const ANIMS = { sm: ['t-read', 'smSeed'], rp: ['t-run', 'rpEp'] };
const reveal = p => p.evaluate(() => document.querySelectorAll('.pred .skip').forEach(s => s.click()));
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
    await clk(`#tabs button[data-t=${t}]`); await wait(300); await reveal(p); await wait(200);
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
        const modes = await p.$$eval(`#${id}M button`, bs => bs.map(b => b.dataset.m));
        for (const m of modes) {
          await clk(`#${id}M button[data-m=${m}]`); await wait(700);
          if (!(await p.$eval('#' + id, e => e.hasAttribute('data-playing')))) problems.push(`${tag}: ${id} ${ov} did not replay after switching to ${m}`);
          const n = await p.$eval(`#${id}Scrub`, e => +e.max / 100), lis = await listOf(p, id);
          if (lis !== n) problems.push(`${tag}: ${id} ${ov} ${m} has ${n} steps but ${lis} list items`);
          if (n > 12) problems.push(`${tag}: ${id} ${ov} ${m} has ${n} steps (the long-replay rule allows about 12 frames)`);
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
    await reveal(p); await wait(200);
    for (const id of await p.$$eval(`#${t} .stg, #${t} #sm, #${t} #rp`, xs => xs.map(x => x.id))) {
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800); const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0);
      const f = await p.$eval('#' + id, e => +e.dataset.frames || 0), pl = await p.$eval('#' + id, e => e.hasAttribute('data-playing'));
      if (f > 0 || pl || d1 !== d0) problems.push(`reduced motion: ${id} moved by itself (frames ${f}, redraws ${d1 - d0})`) } }
  await p.close() }
{ // the numbers the hero's static step list states are the ones the scene reads from the released record
  const p = await b.newPage(); await p.goto(file); await wait(800);
  const r = await p.evaluate(() => ({ D: window.LOOPDATA, L: document.getElementById('sx-loop').innerText }));
  const D = r.D, L = r.L, say = (cond, msg) => { if (!cond) problems.push('step list: ' + msg) };
  if (!D) problems.push('LOOPDATA missing'); else {
    say(D.traj[0].join() === '132,417' && L.includes('passes 132 of 178 trials at 417k'), `base ${D.traj[0]}`);
    say(D.traj[1].join() === '139,700' && L.includes('r0A passes 139') && L.includes('68% more tokens'), `round 1 ${D.traj[1]}`);
    say(D.delta === 6.1 && L.includes('6.1 passes'), `delta ${D.delta}`);
    say(D.evaluated === 37 && D.below === 24 && D.belowRec === 24 && L.includes('24 of the 37 scored candidates'), `below ${D.below} (recorded ${D.belowRec}) of ${D.evaluated}`);
    say(D.offScale.join() === 'r1B' && L.includes('r1B, at 46 passes'), `off scale ${D.offScale}`);
    say(D.cost === 8 && L.includes('The 8 in-band candidates'), `token-rule rejections ${D.cost}`);
    say(D.kept.join() === 'r0A,r1A,r7A,r11B,r19B', `kept ${D.kept}`);
    say(D.traj[8].join() === '138,550' && D.traj[12].join() === '136,470' && L.includes('from 570k to 470k'), `drift ${D.traj[8]} ${D.traj[12]}`);
    say(D.traj[20].join() === '144,442' && L.includes('144 of 178 on 442k'), `final ${D.traj[20]}`);
    say(D.dis.join() === '3,7,11,16,18' && L.includes('5 of 20 rounds'), `disagreements ${D.dis}`);
    say(D.trade.map(x => x.join('/')).join() === '3.4/1.1,0.6/3.9,143.6/55.1' && L.includes('gains 3.4 points') && L.includes('0.6 out of distribution on 144%') && L.includes('RRSI gains 1.1 and 3.9 on 55%'), `trade ${JSON.stringify(D.trade)}`);
  }
  await p.close() }
await b.close();
console.log('stages and animations checked', checked, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
