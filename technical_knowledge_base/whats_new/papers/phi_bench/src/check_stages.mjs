// The 2026-11-06 layout and motion checks for this page, at 1400 px light, 920 px light and 390 px dark:
// the two 3D stages (#stg-fmt, the three task formats on one drawn repository and the 85 tasks by format and scoring type;
// #stg-cat, Table 2 as a bar field over Figure 4's task counts) play by themselves once scrolled into view, step to their last step,
// have exactly one step-list item per step, stop drawing off screen and stop for good on a reader control; the replay of the Replay tab
// (#rp) plays once in view, has one list item per stretch for each of the three models, respects the long-replay rule (at most 8 stretches
// for 24 rounds), stops on the forward button and plays a list item's step once when it is clicked; at 1400 px every split shows two
// columns; no errors, NaN, undefined or sideways scroll; under prefers-reduced-motion nothing moves by itself; and every number the
// static step lists state matches the page's data (window.PHIFMT, window.PHICAT, window.PHIRUN).
// Writes a mid-step screenshot of each stage and animation.
// usage (from the repo root): node technical_knowledge_base/whats_new/papers/phi_bench/src/check_stages.mjs [shots dir]
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
const ANIMS = { rp: ['t-run', null] };
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
      const opts = inp ? await p.$$eval(`#${inp} option`, os => os.map(o => o.value)) : [null];
      for (const ov of opts) {
        if (inp) await p.evaluate((inp, ov) => { const e = document.getElementById(inp); e.value = ov; e.dispatchEvent(new Event('change', { bubbles: true })) }, inp, ov);
        const modes0 = await p.$$eval(`#${id}M button`, bs => bs.map(b => b.dataset.m)), modes = modes0.length ? modes0 : [null];
        for (const m of modes) {
          if (m) await clk(`#${id}M button[data-m=${m}]`); await wait(700);
          if (!(await p.$eval('#' + id, e => e.hasAttribute('data-playing')))) problems.push(`${tag}: ${id} ${ov} did not replay after switching to ${m}`);
          const n = await p.$eval(`#${id}Scrub`, e => +e.max / 100), lis = await listOf(p, id);
          if (lis !== n) problems.push(`${tag}: ${id} ${ov} ${m} has ${n} steps but ${lis} list items`);
          if (n > 8) problems.push(`${tag}: ${id} ${m} has ${n} steps (the long-replay rule allows at most about 8 stretches for 24 rounds)`);
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
      if (inp) await p.evaluate(inp => { const e = document.getElementById(inp); e.selectedIndex = 0; e.dispatchEvent(new Event('change', { bubbles: true })) }, inp);
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
    for (const id of await p.$$eval(`#${t} .stg, #${t} #rp`, xs => xs.map(x => x.id))) {
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800); const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0);
      const f = await p.$eval('#' + id, e => +e.dataset.frames || 0), pl = await p.$eval('#' + id, e => e.hasAttribute('data-playing'));
      if (f > 0 || pl || d1 !== d0) problems.push(`reduced motion: ${id} moved by itself (frames ${f}, redraws ${d1 - d0})`) } }
  await p.close() }
{ // the numbers the static step lists state are the ones the page's data holds
  const p = await b.newPage(); await p.goto(file); await wait(800);
  const r = await p.evaluate(() => ({ F: window.PHIFMT, C: window.PHICAT, Q: window.PHIRUN && { STR: window.PHIRUN.STR, D: window.PHIRUN.D, oracle: window.PHIRUN.A3.oracle },
    LF: document.getElementById('sx-fmt').innerText, LC: document.getElementById('sx-cat').innerText,
    LR: Object.fromEntries(['opus', 'q37', 'ds'].map(m => [m, [...document.getElementById('sx-rp-' + m).children].map(li => li.innerText)])),
    rw: [1.2726, 1.272].map(v => window.PHIRUN.reward(v)) }));
  const say = (cond, msg) => { if (!cond) problems.push('step list: ' + msg) }, f1 = v => v.toFixed(1), f4 = v => v.toFixed(4);
  if (!r.F || !r.C || !r.Q) problems.push('PHIFMT, PHICAT or PHIRUN missing'); else {
    const F = r.F.counts, L = r.LF;
    say(r.F.total === 85 && F.map(c => c.all).join() === '55,20,10' && ['KFC', 'LHI', 'E2EO'].every((n, i) => L.includes(`(${n}), ${F[i].all} tasks`)), `format counts ${F.map(c => c.all)}`);
    say(L.includes(`KFC ${F[0].perf} scored on speed or quality ratios and ${F[0].pf} pass or fail, LHI ${F[1].perf} and ${F[1].pf}, E2EO ${F[2].perf} and ${F[2].pf}`) && r.F.perf === 77, `scoring split ${F.map(c => c.perf + '/' + c.pf)}`);
    const C = r.C, M = r.LC, n = Object.fromEntries(C.order.map((c, i) => [c, C.n[i]]));
    say(C.n.reduce((a, b) => a + b, 0) === 85 && M.includes(`Kernel has ${n['Kernel']} tasks and Training ${n['Training']}; Hardware and Edge has ${n['Hardware & Edge']} (2 KFC, 1 LHI) and Data Infrastructure ${n['Data Infrastructure']}`), `task counts ${C.n}`);
    const NM = { 'Training': 'Training', 'Inference & Serving': 'Inference and Serving', 'Compression': 'Compression', 'Kernel': 'Kernel', 'I/O': 'I/O', 'Hardware & Edge': 'Hardware and Edge', 'Data Infrastructure': 'Data Infrastructure', 'System Optimization': 'System Optimization', 'System Assurance': 'System Assurance' };
    say(M.includes('Its row of Table 2: ' + C.opus.map(([c, v]) => NM[c] + ' ' + f1(v)).join(', ') + '.'), `Opus row ${C.opus}`);
    const B = Object.fromEntries(C.best.map(([c, m, v]) => [c, [m, v]]));
    say(C.best.filter(x => x[1] === 'Claude Opus 5').length === 5 && M.includes('Opus leads five of the nine categories')
      && M.includes(`Kimi K3 is best on Inference and Serving (${f1(B['Inference & Serving'][1])}) and System Optimization (${f1(B['System Optimization'][1])}), Qwen3.7 Max on Hardware and Edge (${f1(B['Hardware & Edge'][1])}) and GLM-5.2 on System Assurance (${f1(B['System Assurance'][1])})`)
      && B['Inference & Serving'][0] === 'Kimi K3' && B['System Optimization'][0] === 'Kimi K3' && B['Hardware & Edge'][0] === 'Qwen3.7 Max' && B['System Assurance'][0] === 'GLM-5.2', `best per category ${JSON.stringify(C.best)}`);
    const hw = Object.fromEntries(C.hw.scores);
    say(C.hw.n === 3 && M.includes(`Qwen3.7 Max ${f1(hw['Qwen3.7 Max'])}, Claude Opus 5 ${f1(hw['Claude Opus 5'])}, Kimi K3 ${f1(hw['Kimi K3'])}, GLM-5.2 ${f1(hw['GLM-5.2'])}, DeepSeek-V4-Pro ${f1(hw['DeepSeek-V4-Pro'])}, Qwen3.8 Max ${f1(hw['Qwen3.8 Max'])}`)
      && hw['GPT-5.6 Sol'] === 0 && hw['Claude Sonnet 5'] === 0 && M.includes(`±${f1(C.hw.se)}`) && C.hw.scores.every(([, v]) => v < C.hw.se), `Hardware and Edge ${JSON.stringify(C.hw)}`);
    const all = Object.values(C.full);
    say(all.every(([, p, w]) => Math.abs(p - w) <= 0.03) && M.includes(`from Opus's ${C.full[0][1].toFixed(2)} to DeepSeek-V4-Pro's ${C.full[7][1].toFixed(2)}`), `Full ${JSON.stringify(C.full)}`);
    // the replay: stretch titles match the round ranges; the numbers each stretch states are the decoded submissions
    const Q = r.Q;
    for (const m of ['opus', 'q37', 'ds']) {
      const S = Q.STR[m], items = r.LR[m];
      say(S.length === items.length && S[0][0] === 1 && S[S.length - 1][1] === 24 && S.every((x, i) => i === 0 || x[0] === S[i - 1][1] + 1), `${m} stretches ${JSON.stringify(S)}`);
      S.forEach(([a, z], i) => say(items[i] && (a === z ? items[i].startsWith('Round ' + a + ':') : items[i].startsWith(`Rounds ${a} ${z - a === 1 ? 'and' : 'to'} ${z}:`)), `${m} stretch ${i + 1} title "${(items[i] || '').slice(0, 30)}" against ${a}-${z}`));
      const D = Q.D[m], last = D[D.length - 1], v = rr => D[rr - 1].v, bad = D.filter(x => x.bad).map(x => x.r);
      if (m === 'opus') {
        say(items[0].includes(String(v(1))) && items[1].includes(f4(v(5))) && items[2].includes(f4(v(7))) && items[3].includes(f4(v(8))) && items[4].includes(f4(v(20))) && items[5].includes(f4(v(21))) && items[6].includes(f4(last.best)), 'Opus values');
        say(D.slice(8, 20).every(x => x.v > Q.oracle) && v(21) < Q.oracle && items[5].includes(r.rw[0].toFixed(3)) && items[6].includes(r.rw[1].toFixed(3)) && bad.length === 0, `Opus reference crossing and rewards ${r.rw}`);
      } else if (m === 'q37') {
        say(bad.join() === '2,4' && items[2].includes(f4(D[7].best)) && D[12].best === D[7].best && D[13].best < D[7].best && items[4].includes(f4(Math.min(...D.slice(12, 23).map(x => x.v)))) && items[4].includes(f4(Math.max(...D.slice(12, 23).map(x => x.v)))) && items[5].includes(f4(last.best)), `Qwen3.7 values, failed ${bad}`);
        say([14, 17, 22, 23].every(rr => D[rr - 1].best === D[rr - 1].v && D[rr - 1].v < D[rr - 2].best && items[4].includes(`${rr} (${f4(v(rr))})`)), 'Qwen3.7 new bests');
      } else {
        const ok = D.slice(9, 20).filter(x => !x.bad).map(x => x.v);
        say(bad.join() === '1,2,4,6,16' && items[5].includes('Five of its 24') && items[1].includes(f4(v(3))) && items[3].includes(f4(v(9))) && items[4].includes(f4(Math.min(...ok))) && items[4].includes(f4(Math.max(...ok))) && D[19].best === D[8].best && items[5].includes(f4(last.best)), `DeepSeek values, failed ${bad}`);
      }
    }
  }
  await p.close() }
await b.close();
console.log('stages and animations checked', checked, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
