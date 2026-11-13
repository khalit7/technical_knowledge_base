// The 2026-11-06 layout and motion checks for this page, at 1400 px light, 920 px light and 390 px dark:
// the two 3D stages (#stg-turn, one turn of the four-module protocol for ReAct and for Turnstile, illustrative; #stg-evo, one Evo-GDPO group on
// Table 3's DeepSearchQA numbers with the bank rule) play by themselves once scrolled into view, step to their last step, have exactly one
// step-list item per step (both of the turn stage's lists), stop drawing off screen and stop for good on a reader control; the Evo-GDPO
// animation of the Score tab (#gd) plays once in view, has one list item per step in both methods, stops on the forward button and plays a
// list item's step once when it is clicked; at 1400 px every split shows two columns; no errors, NaN, undefined or sideways scroll; under
// prefers-reduced-motion nothing moves by itself; and every number the two stages' static step lists state matches what the scenes draw
// (window.JITTURN, window.JITEVO) and, for the Evo-GDPO group, what the Score tab's own calculator gives at its defaults (gdCompute).
// Writes a mid-step screenshot of each stage and animation.
// usage (from the repo root): node technical_knowledge_base/whats_new/papers/jit_agent/src/check_stages.mjs [shots dir]
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
const ANIMS = { gd: ['t-run', 'gdPre'] };
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
    // the turn stage's second list (Turnstile): the toggle swaps the list and replays
    if (t === 't-read' && await p.$('#turnM')) {
      await clk('#turnM button[data-m=turn]'); await wait(300);
      const n = await p.$eval('#stg-turn-r', e => +e.max + 1), lis = await listOf(p, 'stg-turn');
      if (lis !== n || n !== 6) problems.push(`${tag}: stg-turn Turnstile has ${n} steps but ${lis} list items`);
      await p.$eval('#stg-turn', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      if (!(await p.$eval('#stg-turn-p', e => /Pause/.test(e.textContent)))) problems.push(`${tag}: stg-turn did not replay after the toggle`);
      await p.evaluate(() => { const e = document.getElementById('stg-turn-r'); e.value = 3; e.dispatchEvent(new Event('input')) }); await wait(2200);
      await (await p.$('#stg-turn')).screenshot({ path: `${shots}/stage-stg-turn-turnstile-mid-${scheme}-${width}.png` });
      await clk('#turnM button[data-m=react]'); await wait(300);
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
    for (const id of await p.$$eval(`#${t} .stg, #${t} #gd`, xs => xs.map(x => x.id))) {
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800); const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0);
      const f = await p.$eval('#' + id, e => +e.dataset.frames || 0), pl = await p.$eval('#' + id, e => e.hasAttribute('data-playing'));
      if (f > 0 || pl || d1 !== d0) problems.push(`reduced motion: ${id} moved by itself (frames ${f}, redraws ${d1 - d0})`) } }
  await p.close() }
{ // the numbers the two stages' static step lists state are the ones the scenes draw
  const p = await b.newPage(); await p.goto(file); await wait(800);
  const r = await p.evaluate(() => ({ T: window.JITTURN, E: window.JITEVO, G: (typeof gdCompute === 'function' && typeof GD === 'object') ? gdCompute() : null,
    LR: document.getElementById('sx-turn-react').innerText, LT: document.getElementById('sx-turn-turn').textContent, LE: document.getElementById('sx-evo').innerText }));
  const say = (cond, msg) => { if (!cond) problems.push('step list: ' + msg) };
  const T = r.T, E = r.E, f2 = v => (v < 0 ? '\u2212' : '+') + Math.abs(v).toFixed(2);
  if (!T || !E) problems.push('JITTURN or JITEVO missing'); else {
    say(T.tools === 10 && T.react.offered === 10 && r.LR.includes('All ten tools are offered') && r.LR.includes('one call among ten'), `ReAct tools ${T.react.offered} of ${T.tools}`);
    say(T.react.view.join() === '13,15' && r.LR.includes('13 entries') && r.LR.includes('15 entries now'), `ReAct view ${T.react.view}`);
    say(T.turn.offered === 3 && T.turn.hidden === 6 && !T.turn.final && r.LT.includes('offers the three restaurant and location tools') && r.LT.includes('Six tools are hidden') && r.LT.includes('among three tools, not ten'), `Turnstile tools ${T.turn.offered} ${T.turn.hidden}`);
    say(T.turn.buckets.join() === '3,4' && r.LT.includes('Three of five are full') && r.LT.includes('four of five'), `Turnstile buckets ${T.turn.buckets}`);
    const c = E.c, by = n => c.find(x => x.n === n), J = by('JIT-Agent'), L = r.LE;
    say(E.b.n === 'NanoBot' && E.b.r === 80.4 && E.b.l === 924 && E.b.k === 0.131 && L.includes('NanoBot at 80.4') && L.includes('(80.4, 924K tokens, $0.131)'), `incumbent ${JSON.stringify(E.b)}`);
    say(c.length === 6 && L.includes('six harnesses') && L.includes('1 of 6') && c.filter(x => x.kept).map(x => x.n).join() === 'JIT-Agent', `group ${c.length} kept ${c.filter(x => x.kept).map(x => x.n)}`);
    say(c.filter(x => x.r > E.b.r).map(x => x.n).join() === 'JIT-Agent' && L.includes('clears the score sheet (85.1)') && Math.min(...c.map(x => x.k)) === J.k && L.includes('cheapest ($0.066)'), 'only JIT above the sheet and cheapest');
    say(J.Rr.toFixed(2) === '87.45' && L.includes('85.1 becomes 87.45') && E.lam === 0.5, `bonus ${J.Rr}`);
    say(Math.round(J.Rl) === 524 && J.Rc.toFixed(3) === '0.065' && L.includes('524K tokens and $0.065') && c.filter(x => !x.g).length === 4 && L.includes('four of the other five are gated') && by('NanoBot').g && by('NanoBot').Rl === 0 && by('NanoBot').Rc === 0, `efficiency ${J.Rl} ${J.Rc}`);
    const zmin = c.reduce((a, x) => x.zr < a.zr ? x : a), zmax = c.reduce((a, x) => x.zr > a.zr ? x : a);
    say(zmin.n === 'Hermes' && zmax.n === 'JIT-Agent' && L.includes(`from ${f2(zmin.zr)} (Hermes) to ${f2(zmax.zr)} (JIT-Agent)`), `z score ${zmin.zr} ${zmax.zr}`);
    say(L.includes(`JIT-Agent gets ${f2(J.zl)} and every gated candidate ${f2(by('Hermes').zl)}`) && J.zl.toFixed(2) === J.zc.toFixed(2) && c.filter(x => x !== J).every(x => x.zl.toFixed(2) === by('Hermes').zl.toFixed(2) && x.zc.toFixed(2) === by('Hermes').zc.toFixed(2)), `efficiency z ${J.zl} ${J.zc}`);
    say(E.w.join() === '0.6,0.2,0.2' && L.includes(`JIT-Agent ${f2(J.A)}, NanoBot ${f2(by('NanoBot').A)}, Claude Code ${f2(by('Claude Code').A)}, Hermes ${f2(by('Hermes').A)}`), `advantages ${c.map(x => x.A.toFixed(2))}`);
    const o = c.filter(x => x !== J).map(x => x.Ao);
    say(L.includes(`into ${f2(Math.min(...o))} to ${f2(Math.max(...o))}`), `GRPO-style ${o.map(v => v.toFixed(2))}`);
    // the Score tab's own calculator, at its defaults (Table 3 DeepSearchQA on V4-Flash), gives the same group
    const G = r.G;
    if (!G) problems.push('gdCompute missing'); else {
      say(G.b.r === E.b.r && G.c.length === c.length && G.c.every((x, i) => x.n === c[i].n && Math.abs(x.Ag - c[i].A) < 1e-9 && Math.abs(x.Ao - c[i].Ao) < 1e-9 && x.bank === c[i].kept), 'scene and Score tab disagree at the defaults');
    }
  }
  await p.close() }
await b.close();
console.log('stages and animations checked', checked, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
