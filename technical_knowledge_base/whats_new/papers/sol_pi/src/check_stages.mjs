// The 2026-11-06 layout and motion checks for this page, at 1400 px light, 920 px light and 390 px dark:
// the two 3D stages (#stg-loop, the search and what the kept stack does against Pi; #stg-cache, the page's simulator on session B, request by request)
// play by themselves once scrolled into view, step to their last step, have exactly one step-list item per step, stop drawing off screen and stop
// for good on a reader control; the replay (#ss, one session replayed plan step by plan step) plays once in view, has one generated list item per
// plan step in every mode and session, respects the long-replay rule (at most 12 steps, each playing its requests), stops on the forward button, and
// plays a list item's step once when it is clicked; at 1400 px every split shows two columns; no errors, NaN, undefined or sideways scroll; under
// prefers-reduced-motion nothing moves by itself; and every number the two static step lists state matches what the scenes compute
// (window.LOOPDATA from the paper's tables, window.CACHEDATA from the simulator). Writes a mid-step screenshot of each stage and of the replay.
// usage (from the repo root): node technical_knowledge_base/whats_new/papers/sol_pi/src/check_stages.mjs [shots dir]
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
const ANIMS = { ss: ['t-run', 'ssSeed'] };
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
    for (const id of await p.$$eval(`#${t} .stg, #${t} #ss`, xs => xs.map(x => x.id))) {
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800); const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0);
      const f = await p.$eval('#' + id, e => +e.dataset.frames || 0), pl = await p.$eval('#' + id, e => e.hasAttribute('data-playing'));
      if (f > 0 || pl || d1 !== d0) problems.push(`reduced motion: ${id} moved by itself (frames ${f}, redraws ${d1 - d0})`) } }
  await p.close() }
{ // the numbers the two static step lists state are the ones the scenes compute
  const p = await b.newPage(); await p.goto(file); await wait(800);
  const r = await p.evaluate(() => ({ D: window.LOOPDATA, C: window.CACHEDATA, L: document.getElementById('sx-loop').innerText, M: document.getElementById('sx-cache').innerText }));
  const D = r.D, C = r.C, L = r.L, M = r.M, say = (cond, msg) => { if (!cond) problems.push('step list: ' + msg) };
  const f = (v, d) => v.toLocaleString('en-GB', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }), sg = (v, d) => (v < 0 ? '\u2212' : '+') + Math.abs(v).toFixed(d) + '%';
  if (!D || !C) problems.push('LOOPDATA or CACHEDATA missing'); else {
    say(D.fam.join() === '24,26,26,15,15,46' && D.dirs === 152 && L.includes('context 24, progress 26, tools 26, delegation 15, prompt and policy 15, improvement and evaluation 46'), `families ${D.fam}`);
    say(D.env.join() === '495,40' && L.includes('495 repository tasks') && L.includes('40 synthetic tasks'), `environments ${D.env}`);
    say(D.kept === 4 && L.includes('4 of 152, about 1 in 38') && Math.round(D.dirs / D.kept) === 38, 'survivors');
    const [st, sc, ss] = D.sol.map(x => x[1]), [ot, oc, os] = D.opus.map(x => x[1]);
    say(L.includes('tokens ' + sg(st, 1) + ', cost ' + sg(sc, 1) + ', score ' + sg(ss, 1) + ' (93.7%'), `GPT-5.6 Sol ${D.sol}`);
    say(L.includes('tokens ' + sg(ot, 1) + ', cost ' + sg(oc, 1) + ', score ' + sg(os, 1) + ' (94.3%'), `Opus 5 ${D.opus}`);
    const o = C.op, df = o.before.tot - o.after.tot;
    say(M.includes('Requests ' + (C.dOp - 1) + ' to ' + (C.dOp + 2) + ' of session B') && C.seed === 21, `Pi window ${C.dOp}`);
    say(M.includes(f(o.stubbed[0]) + '-token build log') && M.includes('requests ' + (C.dOp - 1) + ' and ' + C.dOp) && M.includes('in request ' + (C.dOp + 1)), `stub ${o.stubbed}`);
    say(df === o.stubbed[0] - 350 && M.includes(f(df) + ' tokens shorter (' + f(o.after.tot) + ' against ' + f(o.before.tot) + ')') && M.includes(f(o.after.write) + ' tokens written against Pi\'s ' + f(o.before.write)) && M.includes('re-reads ' + f(df) + ' fewer'), `stub sizes ${o.after.tot} ${o.before.tot}`);
    say(M.includes(f(C.af.saved.tot) + '-token prompt') && M.includes((C.af.req[0] - C.af.req[1]) + ' fewer requests (' + C.af.req[1] + ' against ' + C.af.req[0] + ')'), `fusion ${C.af.saved.tot} ${C.af.req}`);
    const e = C.epr, cut = e.pi.write - e.ep.write;
    say(M.includes(f(cut + 450) + '-token test log') && M.includes('request ' + (C.dEp + 1) + ' writes ' + f(e.ep.write) + ' tokens instead of ' + f(e.pi.write)) && M.includes(f(cut) + ' fewer'), `reducer ${e.ep.write} ${e.pi.write}`);
    const g = C.occ.gate.dec;
    say(g.compact && C.occ.gate.step === 1 && M.includes('end of plan step 2') && M.includes('after ' + Math.round(g.breakevenRequests) + ' requests') && M.includes('within the ' + g.effectiveHorizonRequests + ' it allows (' + g.expectedRemainingRequests + ' expected'), `gate ${JSON.stringify(g)}`);
    say(M.includes('request ' + C.dOc + ', reads the whole ' + f(C.occ.call.tot) + '-token context') && C.occ.after.read === 9000 && M.includes('request ' + (C.dOc + 1) + ' can re-read only the 9,000-token') && M.includes('(' + f(C.occ.after.write) + ' tokens)'), `compaction ${C.occ.call.tot} ${C.occ.after.write}`);
    say(Math.abs(C.occ.next.read - 30500) < 250 && Math.abs(C.occ.pi.read - 40000) < 600 && M.includes('from request ' + (C.dOc + 2)), `after compaction ${C.occ.next.read} ${C.occ.pi.read}`);
    say(M.includes(C.pi.share.toFixed(1) + '% of Pi\'s recorded traffic'), `Pi share ${C.pi.share}`);
    say(M.includes('cache reads ' + sg(C.sim[0][1], 0) + ', cache writes ' + sg(C.sim[1][1], 0) + ', cost ' + sg(C.sim[2][1], 0)), `session bill ${JSON.stringify(C.sim)}`);
    say(M.includes('reads ' + sg(C.paper[0][1], 1) + ', writes ' + sg(C.paper[1][1], 0) + ', cost ' + sg(C.paper[2][1], 1)), `paper bill ${JSON.stringify(C.paper)}`);
  }
  await p.close() }
await b.close();
console.log('stages and animations checked', checked, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
