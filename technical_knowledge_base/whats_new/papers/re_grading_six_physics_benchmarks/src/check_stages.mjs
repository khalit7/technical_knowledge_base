// The 2026-11-06 layout and motion checks for this page, at 1400 px light, 920 px light and 390 px dark:
// the two 3D stages (#stg-hero, the 250 audited rejections as towers of cubes by label beside the accepted answers; #stg-res, Table 1 as a
// bar field of pre-audit scores and their rise) play by themselves once scrolled into view, step to their last step, have exactly one
// step-list item per step, stop drawing off screen and stop for good on a reader control; the pipeline replay of the Follow the audit tab
// (#au) plays once in view, has one list item per step for each of the six benchmarks (at most 8), stops on the forward button and plays a
// list item's step once when it is clicked; at 1400 px every split shows two columns; no errors, NaN, undefined or sideways scroll; under
// prefers-reduced-motion nothing moves by itself; and every number the static step lists state matches the page's data
// (window.RG6HERO, window.RG6RES, window.PAPER.tables, window.PAPER.rc).
// Writes a mid-step screenshot of each stage and animation.
// usage (from the repo root): node technical_knowledge_base/whats_new/papers/re_grading_six_physics_benchmarks/src/check_stages.mjs [shots dir]
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
const ANIMS = { au: ['t-run', null] };
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
          if (n > 8) problems.push(`${tag}: ${id} ${m} has ${n} steps (the long-replay rule allows at most about 8)`);
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
    for (const id of await p.$$eval(`#${t} .stg, #${t} #au`, xs => xs.map(x => x.id))) {
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800); const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0);
      const f = await p.$eval('#' + id, e => +e.dataset.frames || 0), pl = await p.$eval('#' + id, e => e.hasAttribute('data-playing'));
      if (f > 0 || pl || d1 !== d0) problems.push(`reduced motion: ${id} moved by itself (frames ${f}, redraws ${d1 - d0})`) } }
  await p.close() }
{ // the numbers the static step lists state are the ones the page's data holds
  const p = await b.newPage(); await p.goto(file); await wait(800);
  const r = await p.evaluate(() => ({ H: window.RG6HERO, S: window.RG6RES, T: window.PAPER.tables, I: window.PAPER.rc.implied,
    L: Object.fromEntries(['sx-hero', 'sx-res', 'sx-au-hle', 'sx-au-phy', 'sx-au-prism', 'sx-au-ug', 'sx-au-cmt', 'sx-au-crit'].map(id => [id, [...document.getElementById(id).children].map(li => li.textContent)])) }));
  const say = (cond, msg) => { if (!cond) problems.push('step list: ' + msg) }, f2 = v => v.toFixed(2), f1 = v => v.toFixed(1);
  if (!r.H || !r.S || !r.T) problems.push('RG6HERO, RG6RES or PAPER.tables missing'); else {
    const H = r.H.rows, Lh = r.L['sx-hero'], pool = r.H.pooled;
    say(H.reduce((s, d) => s + d.rej, 0) === 250 && pool.rej === 250 && Lh[0].includes('250 answers') && Lh[0].includes(H.map(d => d.rej).join(', ').replace(/, (\d+)$/, ' and $1')), `rejections ${H.map(d => d.rej)}`);
    say(Lh[1].includes(`${pool.Q} benchmark errors (${f1(pool.pct[0])}%`) && Lh[1].includes(`${pool.G} grader errors (${f1(pool.pct[1])}%`) && Lh[1].includes(`${pool.M} model errors (${f1(pool.pct[2])}%)`) && pool.Q + pool.G + pool.M === 250, `pooled ${JSON.stringify(pool)}`);
    const nm = ['HLE-Physics', 'PHYBench', 'PRISM-Physics', 'UGPhysics'], M = Object.fromEntries(H.map(d => [d.b, d.M]));
    say(Lh[2].includes(`${M['HLE-Physics']} on HLE-Physics, ${M['PHYBench']} on PHYBench, none on PRISM-Physics, ${M['UGPhysics']} on UGPhysics`) && M['PRISM-Physics'] === 0 && Lh[2].includes(`${250 - pool.M} of 250`), `model errors ${JSON.stringify(M)}`);
    say(H.map(d => d.b).join() === nm.join() && r.H.acc === 252 && Lh[3].includes('252 accepted') && Lh[3].includes(H.map(d => d.acc).join(', ').replace(/, (\d+)$/, ' and $1')), `accepted ${H.map(d => d.acc)}`);
    say(Lh[4].includes(H.map(d => d.kept).join(', ').replace(/, (\d+)$/, ' and $1') + ' questions are kept') && Lh[4].includes(H.map(d => f2(d.score) + '%').join(', ').replace(/, ([\d.]+%)$/, ' and $1')) && H.every(d => d.kept === d.acc + d.G + d.M), `kept ${H.map(d => d.kept)} scores ${H.map(d => d.score)}`);
    // the results stage
    const S = Object.fromEntries(r.S.rows.map(x => [x.b, x])), Lr = r.L['sx-res'], g = b => S[b].mean.gpt, all0 = r.S.rows.flatMap(x => Object.values(x.mean).map(v => v[0]));
    say(Lr.length === 7 && Lr[0].includes(`from ${f2(Math.min(...all0))}% to ${f2(Math.max(...all0))}%`), `pre-audit range ${Math.min(...all0)} ${Math.max(...all0)}`);
    say(Lr[1].includes(`by ${f1(g('PHYBench')[1] - g('PHYBench')[0])} and ${f1(g('PRISM-Physics')[1] - g('PRISM-Physics')[0])} points`) && r.S.rev['PHYBench'] === 1 && r.S.rev['PRISM-Physics'] === 1, 'rule-based rises');
    say(Lr[2].includes(`${f2(g('UGPhysics')[0])}% to ${f2(g('UGPhysics')[1])}%`) && r.S.rev['UGPhysics'] === 2, 'UGPhysics');
    say(Lr[3].includes(`${f2(g('HLE-Physics')[0])}% to ${f2(g('HLE-Physics')[1])}%, on ${S['HLE-Physics'].n1} of the ${S['HLE-Physics'].n0}`) && r.S.rev['HLE-Physics'] === 3, 'HLE-Physics');
    say(Lr[4].includes(`${f2(g('CMT-Benchmark')[0])}% to ${f2(g('CMT-Benchmark')[1])}% on ${S['CMT-Benchmark'].n1} of ${S['CMT-Benchmark'].n0}`) && r.S.rev['CMT-Benchmark'] === 4, 'CMT-Benchmark');
    const cg = S['CritPt'].mean.gem;
    say(Lr[5].includes(`${f2(g('CritPt')[0])}% (mean@5, ${S['CritPt'].n0} challenges) to ${f2(g('CritPt')[1])}% (mean@4, ${S['CritPt'].n1})`) && Lr[5].includes(`${f2(cg[0])}% to ${f2(cg[1])}%`) && r.S.rev['CritPt'] === 5, 'CritPt');
    const g1 = r.S.rows.map(x => x.mean.gpt[1]);
    say(Lr[6].includes(`from ${f2(Math.min(...g1))}% to ${f2(Math.max(...g1))}%`), `corrected range ${g1}`);
    // the pipeline replay: every count each benchmark's list states
    const F = r.T.funnel, T1 = Object.fromEntries(r.T.t1.map(x => [x.b, x])), im = (b, f) => (Math.round(1000 * (f.acc + f.G) / f.kept) / 10).toFixed(1);
    for (const [b, id] of [['HLE-Physics', 'sx-au-hle'], ['PHYBench', 'sx-au-phy'], ['PRISM-Physics', 'sx-au-prism'], ['UGPhysics', 'sx-au-ug']]) {
      const f = F[b], L = r.L[id], t = T1[b];
      say(L.length === 6, `${b} has ${L.length} steps`);
      say(L[1].includes(f2(t.mean.gpt[0]) + '% mean@4') && L[1].includes(f2(t.pass.gpt[0]) + '% pass@4'), `${b} pre-audit`);
      say(L[2].includes(String(f.acc)) && L[2].includes(String(f.rej)), `${b} audit run ${f.acc}/${f.rej}`);
      say(L[3].includes(`${f.rej} rejections`) && L[3].includes(`${f.Q} benchmark errors`) && L[3].includes(`${f.G} grader error`) && (f.M ? L[3].includes(`${f.M} model error`) : L[3].includes('no model errors')), `${b} labels`);
      say(L[4].includes(String(f.excluded)) && L[4].includes(String(f.kept)) && f.excluded === f.Q && f.kept === (f.sample || f.pool) - f.Q, `${b} exclusion`);
      say(L[5].includes(f2(t.mean.gpt[1]) + '% mean@4') && L[5].includes(f2(t.pass.gpt[1]) + '% pass@4') && L[5].includes(`(${f.acc} + ${f.G}) / ${f.kept} = ${im(b, f)}%`) && Math.abs(+im(b, f) - r.I[b].implied) < 0.06, `${b} corrected and implied`);
    }
    for (const [b, id, n] of [['CMT-Benchmark', 'sx-au-cmt', 4], ['CritPt', 'sx-au-crit', 5]]) {
      const f = F[b], L = r.L[id], t = T1[b], txt = L.join(' ');
      say(L.length === n && txt.includes(`${f.Q}`) && txt.includes(`${f.M} model errors`) && txt.includes(`${f.repaired} of the ${f.Q} are repaired`) && txt.includes(`${f.kept} remain`) && L[n - 1].includes(f2(t.mean.gpt[1]) + '% mean@4') && L[n - 1].includes(f2(t.pass.gpt[1]) + '% pass@4') && txt.includes(f2(t.mean.gpt[0]) + '%'), `${b} list`);
    }
  }
  await p.close() }
await b.close();
console.log('stages and animations checked', checked, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
