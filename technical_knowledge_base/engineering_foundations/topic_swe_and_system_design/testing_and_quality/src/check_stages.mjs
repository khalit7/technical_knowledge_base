// The 2026-11-06 rollout checks for Testing and quality: every 3D stage plays by itself once scrolled into view, steps to its last step (in every mode)
// with one step-list item per step, stops redrawing off screen and never moves under reduced motion; no errors, NaN, undefined or sideways scroll;
// the splits are two columns at 1400 px and one below 1100 px. Every measured value written into the step lists is checked against window.TQ
// (the recordings, built by gen_data.py), TQ.calc (checked against recompute.py by check_page.mjs) and the numbers the scenes compute (window.TQN);
// the doubles scene's rows and verdict and the CI scene's jobs are checked against the recorded files in experiments/ and inputs/.
// usage (from the repo root): node technical_knowledge_base/engineering_foundations/topic_swe_and_system_design/testing_and_quality/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
// stage, its step list per mode, and the mode chips (selector or null)
const STAGES = [['stg-hero', [['', 'sx-hero']], null], ['stg-dbl', [['', 'sx-dbl']], null], ['stg-prop', [['bug', 'sx-prop'], ['fix', 'sx-prop-fix']], '#prop-mode'], ['stg-ci', [['', 'sx-ci']], null]];
const wait = ms => new Promise(r => setTimeout(r, ms));
const problems = [];
// the recorded files the scenes draw from
{ const rd = p => fs.readFileSync(path.resolve(here, p), 'utf8');
  const bug = rd('inputs/out_bug.txt'), tst = rd('experiments/integ/test_search.py'), ci = rd('experiments/ci/ci.yml');
  if (!bug.includes('assert [2] == [1, 2]') || !bug.includes('test_search_ignores_case[pg_conn]') || bug.includes('[sqlite_conn] FAILED')) problems.push('out_bug.txt no longer records [2] on PostgreSQL only');
  [['1, "ada", "Trip planning for Lisbon"'], ['2, "ada", "trip budget spreadsheet"'], ['3, "bob", "Trip ideas"']].forEach(([r]) => { if (!tst.includes(r)) problems.push('test_search.py lacks the row ' + r) });
  ['needs: static', 'needs: unit', 'postgres:17', 'pg_isready', 'gpu-t4', '"0 3 * * *"', '["3.12", "3.13"]', 'fail-fast: false', 'cancel-in-progress: true', '-m "not slow and not gpu" -n auto -p randomly']
    .forEach(x => { if (!ci.includes(x)) problems.push('ci.yml lacks ' + x) }); }
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(400);
  const tag = `${scheme} ${width}`;
  const audit = async where => {
    const r = await p.evaluate(() => { const c = document.getElementById('t-read').cloneNode(true); c.querySelectorAll('pre,code,.code,.cv,.raw,.term').forEach(x => x.remove());
      const txt = c.innerText.replace(/no NaN introduced|produces no NaN|generates NaN and infinity|0\/0 is NaN/g, ''); // prose about NaN, not a broken value
      return { bad: (txt.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } });
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (!cols.length || cols.some(c => c !== 'grid'))) problems.push(`${tag}: a split is not two columns (${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  // autoplay on view: a stage's data-frames rises
  for (const [id] of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
  }
  // flows stop off screen: draws do not rise while every stage is out of view
  await p.evaluate(() => window.scrollTo(0, document.getElementById('s-depth').getBoundingClientRect().top + scrollY)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  // every stage, in every mode, to its last step; list length; screenshots at every step at 1400 and 390 (mid step named -mid-)
  for (const [id, modes, sel] of STAGES) for (const [m, lid] of modes) {
    if (sel) { await p.$eval(`${sel} [data-m="${m}"]`, e => e.click()); await wait(150); }
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.hidden ? -1 : e.children.length);
    if (lis !== n) problems.push(`${tag}: ${id} ${m} has ${n} steps but list ${lid} shows ${lis}`);
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' }));
    for (let k = 0; k < n; k++) {
      if (k) await p.$eval(`#${id}-f`, e => e.click());
      if (width === 1400 || width === 390) { await wait(id === 'stg-prop' ? 3300 : 1900); const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}${m ? '-' + m : ''}-s${k + 1}${k === Math.floor(n / 2) ? '-mid' : ''}-${scheme}-${width}.png` }) }
    }
    await wait(id === 'stg-prop' ? 3300 : 1800);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ${m} ended on ${sh}`);
    await audit(`${id} ${m} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id} ${m} list does not mark the last step`);
  }
  if (width === 1400) { // the step lists' measured values are the page's data
    const r = await p.evaluate(() => { const out = [], li = (id, k) => document.getElementById(id).children[k].textContent.replace(/\s+/g, ' ');
      const need = (id, xs) => xs.forEach(([k, x]) => { if (!li(id, k).includes(String(x))) out.push(`${id} item ${k + 1} lacks "${x}"`) });
      const C = TQ.calc, Hn = TQN.hero, D = TQN.dbl, Pp = TQN.prop;
      if (Hn.killed !== C.mutWeak || Hn.mutN !== C.mutN || Hn.survived !== C.mutN - C.mutWeak) out.push('hero mutant counts differ from TQ.calc');
      need('sx-hero', [[1, 'within ' + C.hypMaxTries + ' generated inputs'], [3, TQ.integ.pg_ms + ' ms a test, ' + C.pgRatio + 'x SQLite'], [3, '[2] instead of [1, 2]'],
        [5, 'killed only ' + Hn.killed + ' of ' + Hn.mutN], [5, Hn.survived + ' wrong values'], [5, C.flakyPct + '% of ' + C.flakyRuns.toLocaleString('en-GB') + ' runs']]);
      if (D.sqlite !== '[1, 2]' || D.pg !== '[2]') out.push('doubles scene results ' + D.sqlite + ' / ' + D.pg);
      need('sx-dbl', [[2, 'returns ' + D.sqlite], [3, 'assert ' + D.pg + ' == ' + D.want], [3, TQ.integ.pg_ms + ' ms a test plus ' + C.pgWarmMin + ' s startup'], [3, 'PostgreSQL ' + TQ.env.postgres]]);
      const rng = s => { const [a, b] = s.split('-').map(Number); return a === b ? '(call ' + a + ')' : b === a + 1 ? '(calls ' + a + ' and ' + b + ')' : '(calls ' + a + ' to ' + b + ')' };
      Pp.stretches.forEach((s, k) => need('sx-prop', [[k, rng(s)]]));
      if (Pp.first !== 3 || Pp.calls !== C.hypCalls || Pp.min !== '0|2|0') out.push('property run first/calls/min ' + Pp.first + ' ' + Pp.calls + ' ' + Pp.min);
      const fc = Pp.firstCall; need('sx-prop', [[1, fc.n + ' characters, size ' + fc.s + ', overlap ' + fc.o], [6, "text='0', args=(2, 0)"], [6, 'Of the ' + Pp.calls + ' calls, ' + Pp.fails + ' failed']]);
      if (Pp.fixedFails !== 0 || Pp.floorBad[1] !== 0 || !(Pp.floorBad[0] > 0)) out.push('fixed run or floor not as described');
      need('sx-prop-fix', [[1, 'Calls 1 to ' + Pp.fixed / 2], [2, 'Calls ' + (Pp.fixed / 2 + 1) + ' to ' + Pp.fixed], [2, 'All ' + Pp.fixed + ' pass']]);
      const CI = TQN.ci; need('sx-ci', [[2, CI.matrix.join(' and ')], [3, CI.service], [5, CI.cron], [5, CI.runner]]);
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  await audit('end');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file);
  for (const [id] of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
