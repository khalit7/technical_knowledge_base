// The 2026-11-06 layout and motion checks for this page, at 1400 px light, 920 px light and 390 px dark:
// the 3D stage (#stg-orc, Figure 2 in 3D: the state hierarchy L0 to L3 and one orchestration task run through it, Prime Agent's rlm()
// against a subagent as a blocking tool call, swapped by the toggle) plays by itself once scrolled into view, steps to its last step,
// has exactly one step-list item per step in both lists, stops drawing off screen and stops for good on a reader control; the Factorio
// replay (#fac, Figure 9 decoded, nine stretches) plays once in view, has one list item per step, stops on the forward button and plays
// a list item's step once when it is clicked; the scorecard replay of the Rescore tab (#rp, 25 games) is a widget under the long-replay
// rule and never moves by itself; at 1400 px every split shows two columns; no errors, NaN, undefined or sideways scroll; under
// prefers-reduced-motion nothing moves by itself; and the totals the stage's step lists state match the scene's own steps (window.PAORC).
// Writes a mid-step screenshot of the stage in both modes and of the Factorio replay.
// usage (from the repo root): node technical_knowledge_base/whats_new/papers/prime_agent/src/check_stages.mjs [shots dir]
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
    // the split: two columns side by side at 1100 px and wider, stacked below
    const splits = await p.$$eval(`#${t} .s3sp`, ss => ss.map(s => { const L = s.querySelector(':scope > .s3L'), R = s.querySelector(':scope > .s3R'); if (!L || !R) return 'missing column';
      const a = L.getBoundingClientRect(), r = R.getBoundingClientRect(); return { side: r.left >= a.right - 1 && r.width > 200 && a.width > 200 } }));
    splits.forEach((s, i) => { if (s === 'missing column') problems.push(`${tag} ${t}: split ${i + 1} lacks a column`); else if (width >= 1100 && !s.side) problems.push(`${tag} ${t}: split ${i + 1} is not two columns`) });
    // the 3D stage, in both modes
    for (const id of await p.$$eval(`#${t} .stg`, xs => xs.map(x => x.id))) {
      checked++;
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2200);
      const f1 = await p.$eval('#' + id, e => +e.dataset.frames || 0);
      if (!(f1 > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
      if (!(await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent)))) problems.push(`${tag}: ${id} is not playing after scrolling into view`);
      // flows stop drawing off screen
      await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await wait(400);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800);
      const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0); if (d1 !== d0) problems.push(`${tag}: ${id} kept drawing off screen (${d1 - d0})`);
      for (const m of ['new', 'old']) {
        await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(200);
        if (!(await p.$eval(`#orcM button[data-m=${m}]`, e => e.classList.contains('on')))) {
          await clk(`#orcM button[data-m=${m}]`); await wait(1500);
          if (!(await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent)))) problems.push(`${tag}: ${id} did not replay after the toggle to ${m}`);
        }
        const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await listOf(p, id), want = await p.evaluate(m => window.PAORC.steps[m], m);
        if (lis !== n || n !== want) problems.push(`${tag}: ${id} ${m} has ${n} steps, ${lis} list items, the scene ${want}`);
        if (await p.$eval(`#sx-orc-${m}`, e => e.hidden)) problems.push(`${tag}: ${id} ${m} list is hidden in its own mode`);
        // a reader control stops autoplay for good; step to the last step with the forward button, a screenshot in the middle
        await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
        for (let k = 1; k < n; k++) { await clk(`#${id}-f`); await wait(80); if (k === Math.floor(n / 2)) { await wait(2000); await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-${m}-mid-${scheme}-${width}.png` }) } }
        await wait(2000);
        const shown = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (shown !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ${m} ended on "${shown}"`);
        const on = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return [...l.children].findIndex(x => x.classList.contains('on')) });
        if (on !== n - 1) problems.push(`${tag}: ${id} ${m} list marks item ${on + 1} at the last step`);
        if (await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent))) problems.push(`${tag}: ${id} ${m} still playing after a reader control`);
      }
      await clk('#orcM button[data-m=new]'); await wait(200);
    }
    // the Factorio replay (makeAnim): plays in view, one list item per step, stops on a control, a list click plays one step
    if (t === 't-read') {
      const id = 'fac'; checked++;
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      const fr = await p.$eval('#' + id, e => +e.dataset.frames || 0), pl = await p.$eval('#' + id, e => e.hasAttribute('data-playing'));
      if (!(fr > 0) || !pl) problems.push(`${tag}: ${id} did not play when scrolled into view (frames ${fr}, playing ${pl})`);
      const n = await p.$eval(`#${id}Scrub`, e => +e.max / 100), lis = await listOf(p, id);
      if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but ${lis} list items`);
      if (n > 12) problems.push(`${tag}: ${id} has ${n} steps (the long-replay rule allows about 12 one per frame)`);
      await p.evaluate(id => { const e = document.getElementById(id + 'Scrub'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
      for (let k = 0; k < n; k++) { await clk(`#${id}Fwd`); if (k === Math.floor(n / 2) - 1) await (await p.$('#' + id)).screenshot({ path: `${shots}/anim-${id}-mid-${scheme}-${width}.png` }) }
      if (await p.$eval('#' + id, e => e.hasAttribute('data-playing'))) problems.push(`${tag}: ${id} still playing after the forward button`);
      const on = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return [...l.children].findIndex(x => x.classList.contains('on')) });
      if (on !== n - 1) problems.push(`${tag}: ${id} list marks item ${on + 1} at the last step`);
      await p.evaluate(id => document.getElementById(id).closest('.s3sp').querySelector('ol.sx:not([hidden])').children[1].click(), id);
      const pl2 = await p.$eval('#' + id, e => e.hasAttribute('data-playing'));
      await p.waitForFunction(id => !document.getElementById(id).hasAttribute('data-playing'), { timeout: 15000 }, id).catch(() => problems.push(`${tag}: ${id} list click did not stop`));
      if (!pl2) problems.push(`${tag}: ${id} list click did not play its step`);
    }
    // the scorecard replay is a widget: no play button, never moves by itself, opens on lf52
    if (t === 't-run') {
      const id = 'rp'; checked++;
      const before = await p.$eval('#rpStep', e => e.textContent);
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2000);
      const after = await p.$eval('#rpStep', e => e.textContent);
      if (await p.$('#rpPlay')) problems.push(`${tag}: rp has a play button (it is a widget)`);
      if (before !== after || !/lf52/.test(after)) problems.push(`${tag}: rp moved by itself or did not open on lf52 ("${before}" then "${after}")`);
      if (await p.$eval('#' + id, e => e.hasAttribute('data-playing') || +e.dataset.frames > 0)) problems.push(`${tag}: rp played`);
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
    for (const id of await p.$$eval(`#${t} .stg, #${t} #fac, #${t} #rp`, xs => xs.map(x => x.id))) {
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800); const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0);
      const f = await p.$eval('#' + id, e => +e.dataset.frames || 0), pl = await p.$eval('#' + id, e => e.hasAttribute('data-playing'));
      if (f > 0 || pl || d1 !== d0) problems.push(`reduced motion: ${id} moved by itself (frames ${f}, redraws ${d1 - d0})`) } }
  await p.close() }
{ // the totals the stage's step lists state are the scene's own
  const p = await b.newPage(); await p.goto(file); await wait(800);
  const r = await p.evaluate(() => ({ O: window.PAORC, N: document.getElementById('sx-orc-new').textContent.replace(/\s+/g, ' '), D: document.getElementById('sx-orc-old').textContent.replace(/\s+/g, ' ') }));
  const say = (cond, msg) => { if (!cond) problems.push('step list: ' + msg) };
  if (!r.O) problems.push('PAORC missing'); else {
    const n = r.O.end.new, o = r.O.end.old, alive = s => Object.values(s.K).filter(v => v !== 'gone').length;
    say(r.N.includes(`Totals: ${n.tm} time units, the parent blocked for ${n.b}, two children still addressable, ${n.rs} contexts re-sent`) && alive(n) === 2, `new totals ${JSON.stringify(n)}`);
    say(r.N.includes(`(against ${o.tm}, ${o.b}, none and ${o.rs} with the blocking tool call)`) && alive(o) === 0, `old totals quoted in the new list ${JSON.stringify(o)}`);
    say(r.D.includes(`${o.tm} time units, ${o.b} of them waiting`) && r.O.blocked.old === o.b, `old totals ${JSON.stringify(o)} blocked cells ${r.O.blocked.old}`);
    say(r.D.includes('runs for 3 time units') && r.D.includes('6 blocked units so far') && r.D.includes('9 blocked units, one context re-sent'), 'old per-step counts');
  }
  await p.close() }
await b.close();
console.log('stages and animations checked', checked, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
