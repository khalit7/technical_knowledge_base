// The 2026-11-06 layout and motion checks for this page (rollout of 2026-11-13), at 1400 px light, 920 px light and 390 px dark:
// the 3D stage on The paper tab (#stg-fig1, Figure 1's question run four ways from the page's own transcription) plays by itself
// once scrolled into view, steps to its last step, has exactly one step-list item per step, stops drawing off screen and stops for
// good on a reader control; the Then and now animation (#th, makeAnim) plays once in view, has one list item per step, stops on the
// forward button and plays a list item's step once when it is clicked; the trace replay (#tr) is a widget under the long-replay rule
// (no autoplay, no step list, opens on its last step); at 1400 px every split shows two columns; no errors, NaN, undefined or sideways
// scroll; under prefers-reduced-motion nothing moves by itself; and every number the stage's static step list states matches what
// the scene computes from window.TRACES (window.R1FIG). Writes a mid-step screenshot of the stage and the animation.
// usage (from the repo root): node technical_knowledge_base/whats_new/papers/react/src/check_stages.mjs [shots dir]
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
      checked++;
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2200);
      const f1 = await p.$eval('#' + id, e => +e.dataset.frames || 0);
      if (!(f1 > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
      if (!(await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent)))) problems.push(`${tag}: ${id} is not playing after scrolling into view`);
      const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await listOf(p, id);
      if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but ${lis} list items`);
      await p.$eval('#' + id, e => { const y = e.getBoundingClientRect().top + scrollY; window.scrollTo(0, y > document.body.scrollHeight / 2 ? 0 : document.body.scrollHeight) }); await wait(400);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800);
      const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0); if (d1 !== d0) problems.push(`${tag}: ${id} kept drawing off screen (${d1 - d0})`);
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(200);
      await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
      for (let k = 1; k < n; k++) { await clk(`#${id}-f`); await wait(80); if (k === Math.floor(n / 2)) { await wait(2800); await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-mid-${scheme}-${width}.png` }) } }
      await wait(2800);
      const shown = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (shown !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on "${shown}"`);
      const on = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return [...l.children].findIndex(x => x.classList.contains('on')) });
      if (on !== n - 1) problems.push(`${tag}: ${id} list marks item ${on + 1} at the last step`);
      if (await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent))) problems.push(`${tag}: ${id} still playing after a reader control`);
    }
    // the Then and now animation (makeAnim with a step list)
    if (t === 't-then') {
      const id = 'th'; checked++;
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      const fr = await p.$eval('#' + id, e => +e.dataset.frames || 0), pl = await p.$eval('#' + id, e => e.hasAttribute('data-playing'));
      if (!(fr > 0) || !pl) problems.push(`${tag}: ${id} did not play when scrolled into view (frames ${fr}, playing ${pl})`);
      const n = await p.$eval(`#${id}Scrub`, e => +e.max / 100), lis = await listOf(p, id);
      if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but ${lis} list items`);
      if (n > 12) problems.push(`${tag}: ${id} has ${n} steps (long-replay rule)`);
      for (let k = 0; k < n; k++) { await clk(`#${id}Fwd`); if (k === Math.floor(n / 2) - 1) await (await p.$('#' + id)).screenshot({ path: `${shots}/anim-${id}-mid-${scheme}-${width}.png` }) }
      if (await p.$eval('#' + id, e => e.hasAttribute('data-playing'))) problems.push(`${tag}: ${id} still playing after the forward button`);
      const on = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return [...l.children].findIndex(x => x.classList.contains('on')) });
      if (on !== n - 1) problems.push(`${tag}: ${id} list marks item ${on + 1} at the last step`);
      await p.evaluate(id => document.getElementById(id).closest('.s3sp').querySelector('ol.sx').children[1].click(), id);
      const pl2 = await p.$eval('#' + id, e => e.hasAttribute('data-playing'));
      await p.waitForFunction(id => !document.getElementById(id).hasAttribute('data-playing'), { timeout: 15000 }, id).catch(() => problems.push(`${tag}: ${id} list click did not stop`));
      if (!pl2) problems.push(`${tag}: ${id} list click did not play its step`);
    }
    // the trace replay: a widget (no autoplay, no step list, opens on its last step)
    if (t === 't-run') {
      checked++;
      await p.$eval('#tr', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      const fr = await p.$eval('#tr', e => +e.dataset.frames || 0); if (fr) problems.push(`${tag}: tr (a widget) moved by itself (${fr} frames)`);
      if (await p.$eval('#tr', h => !!h.closest('.s3sp').querySelector('ol.sx'))) problems.push(`${tag}: tr has a step list (it is a widget)`);
      const sc = await p.$eval('#trScrub', e => [+e.value, +e.max]); if (sc[0] !== sc[1]) problems.push(`${tag}: tr does not open on its last step (${sc})`);
      await p.evaluate(() => { const e = document.getElementById('trEp'); e.value = 'pepper'; e.dispatchEvent(new Event('change', { bubbles: true })) }); await wait(200);
      const sc2 = await p.$eval('#trScrub', e => [+e.value, +e.max]); if (sc2[0] !== sc2[1]) problems.push(`${tag}: tr does not reset to the last step on an episode change`);
      await p.evaluate(() => { const e = document.getElementById('trEp'); e.value = 'apple'; e.dispatchEvent(new Event('change', { bubbles: true })) });
    }
    const r = await p.evaluate(t => { const txt = document.getElementById(t).innerText;
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
  for (const [t, sel] of [['t-read', '#stg-fig1'], ['t-run', '#tr'], ['t-then', '#th']]) { await p.$eval(`#tabs button[data-t=${t}]`, e => e.click()); await wait(300);
    await p.$eval(sel, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const d0 = await p.$eval(sel, e => +e.dataset.draws || 0); await wait(800); const d1 = await p.$eval(sel, e => +e.dataset.draws || 0);
    const f = await p.$eval(sel, e => +e.dataset.frames || 0), pl = await p.$eval(sel, e => e.hasAttribute('data-playing'));
    if (f > 0 || pl || d1 !== d0) problems.push(`reduced motion: ${sel} moved by itself (frames ${f}, redraws ${d1 - d0})`) }
  await p.close() }
{ // the numbers the static step list states are the ones the scene computes from the page's transcription of Figure 1
  const p = await b.newPage(); await p.goto(file); await wait(500);
  const r = await p.evaluate(() => ({ F: window.R1FIG, L: document.getElementById('sx-fig1').innerText }));
  const say = (c, m) => { if (!c) problems.push('step list: ' + m) };
  const { F, L } = r;
  if (!F) problems.push('R1FIG missing'); else {
    const W = F.lanes;
    say(F.steps === 8, `steps ${F.steps}`);
    say(W.std.exemplars === 114 && W.cot.exemplars === 308 && W.act.exemplars === 515 && W.react.exemplars === 938 && L.includes('114 words for Standard, 308 for CoT, 515 for Act and 938 for ReAct'), 'exemplar words');
    say(/iPod/.test(W.std.answer) && L.includes('"iPod"') && !W.std.ok, 'Standard answer');
    say(/iPhone, iPad, iPod Touch/.test(W.cot.answer) && !W.cot.ok && L.includes('One 35-word thought'), 'CoT answer and thought length');
    say(W.act.answer === 'Finish[yes]' && !W.act.ok && L.includes('Finish[yes]') && F.tiles.join('|') === 'Apple Remote|similar titles|Front Row (software)' && L.includes('Three searches'), `Act ${W.act.answer} ${F.tiles}`);
    say(W.react.ok && /keyboard function keys/.test(W.react.answer) && L.includes('Finish[keyboard function keys] is correct'), 'ReAct answer');
    say(W.react.entries === 12 && W.act.entries === 8, 'entry counts');
    say([W.std.model, W.std.env, W.cot.model, W.cot.env, W.act.model, W.act.env, W.react.model, W.react.env].join() === '1,0,39,0,8,24,90,53' && L.includes('Standard 1 and 0, CoT 39 and 0, Act 8 and 24, ReAct 90 and 53'), 'model and environment words');
  }
  await p.close() }
await b.close();
console.log('stages and animations checked', checked, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
