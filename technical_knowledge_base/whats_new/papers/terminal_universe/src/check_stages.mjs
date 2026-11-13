// The 2026-11-06 layout and motion checks for this page, at 1400 px light, 920 px light and 390 px dark:
// the three 3D stages (#stg-fl, one real trace imitated or rebuilt and re-solved; #stg-mr, the Table 18 multi-round session; #stg-rr, Stage 1 replay
// of a real LFM2-Terminal trace, one turn per step) play by themselves once scrolled into view, step to their last step, have exactly one step-list
// item per step (both lists of the fl stage, the generated list of every trace under both replay rules, none longer than 8 steps), stop drawing off
// screen and stop for good on a reader control; a mode toggle or a trace change replays; at 1400 px every split shows two columns; no errors, NaN,
// undefined or sideways scroll; under prefers-reduced-motion nothing moves by itself. Data: the numbers the fl step lists state are the ones the page's
// replay computes for the trace and Table 4 holds; every rr step list covers every command of its trace once, in order, one step per turn; the mr list's
// styles and verdicts are the scene's (window.TUMR). Writes a mid-step screenshot of each stage.
// usage (from the repo root): node technical_knowledge_base/whats_new/papers/terminal_universe/src/check_stages.mjs [shots dir]
import puppeteer from '../../../../../html_utils/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const file = 'file://' + path.resolve(here, '../index.html');
const shots = process.argv[2] || path.resolve(here, '../.shots'); fs.mkdirSync(shots, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined, protocolTimeout: 240000 });
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
    // the split: two columns side by side at 1100 px and wider
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
      // nothing draws off screen
      await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await wait(400);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800);
      const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0); if (d1 !== d0) problems.push(`${tag}: ${id} kept drawing off screen (${d1 - d0})`);
      // a reader control stops autoplay for good; step to the last step with the forward button, a screenshot in the middle
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(200);
      await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
      for (let k = 1; k < n; k++) { await clk(`#${id}-f`); await wait(80); if (k === Math.floor(n / 2)) { await wait(1800); await (await p.$('#' + id)).screenshot({ path: `${shots}/stage-${id}-mid-${scheme}-${width}.png` }) } }
      await wait(1800);
      const shown = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (shown !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on "${shown}"`);
      const on = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return [...l.children].findIndex(x => x.classList.contains('on')) });
      if (on !== n - 1) problems.push(`${tag}: ${id} list marks item ${on + 1} at the last step`);
      if (await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent))) problems.push(`${tag}: ${id} still playing after a reader control`);
    }
    if (t === 't-read') {
      // the fl stage's second list: the toggle swaps the list and replays
      await clk('#flM button[data-m=imit]'); await wait(300);
      const n = await p.$eval('#stg-fl-r', e => +e.max + 1), lis = await listOf(p, 'stg-fl');
      if (lis !== n || n !== 4) problems.push(`${tag}: stg-fl imitate has ${n} steps but ${lis} list items`);
      await p.$eval('#stg-fl', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      if (!(await p.$eval('#stg-fl-p', e => /Pause/.test(e.textContent)))) problems.push(`${tag}: stg-fl did not replay after the toggle`);
      await p.evaluate(() => { const e = document.getElementById('stg-fl-r'); e.value = 2; e.dispatchEvent(new Event('input')) }); await wait(1900);
      await (await p.$('#stg-fl')).screenshot({ path: `${shots}/stage-stg-fl-imit-mid-${scheme}-${width}.png` });
      await p.evaluate(() => { const e = document.getElementById('stg-fl-r'); e.value = 3; e.dispatchEvent(new Event('input')) }); await wait(300);
      if ((await p.$eval('#stg-fl .stg-st', e => e.textContent)) !== 'step 4 of 4') problems.push(`${tag}: stg-fl imitate does not reach step 4`);
      await clk('#flM button[data-m=resolve]'); await wait(300);
      if ((await listOf(p, 'stg-fl')) !== 7) problems.push(`${tag}: stg-fl rebuild list is not back to 7 items`);
    }
    if (t === 't-run') {
      // every trace under both rules: the generated list has one item per step, at most 8, and a change replays
      const picks = await p.$$eval('#rtPick button', bs => bs.map(b => b.dataset.i));
      for (const ep of picks) for (const m of ['early', 'late']) {
        await clk(`#rtPick button[data-i="${ep}"]`); await clk(`#rrM button[data-m=${m}]`);
        await p.$eval('#stg-rr', e => e.scrollIntoView({ block: 'center' })); await wait(700);
        const n = await p.$eval('#stg-rr-r', e => +e.max + 1), lis = await listOf(p, 'stg-rr');
        if (lis !== n) problems.push(`${tag}: stg-rr trace ${ep} ${m} has ${n} steps but ${lis} list items`);
        if (n > 8) problems.push(`${tag}: stg-rr trace ${ep} has ${n} steps (the long-replay limit is 8 stretches)`);
        if (n > 1 && !(await p.$eval('#stg-rr-p', e => /Pause/.test(e.textContent)))) problems.push(`${tag}: stg-rr trace ${ep} ${m} did not replay after the change`);
        if (ep === '2' && m === 'late') { await p.evaluate(n => { const e = document.getElementById('stg-rr-r'); e.value = Math.floor(n / 2); e.dispatchEvent(new Event('input')) }, n); await wait(2900); await (await p.$('#stg-rr')).screenshot({ path: `${shots}/stage-stg-rr-late-mid-${scheme}-${width}.png` }) }
      }
      await clk('#rtPick button[data-i="0"]'); await clk('#rrM button[data-m=early]');
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
    for (const id of await p.$$eval(`#${t} .stg`, xs => xs.map(x => x.id))) {
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      const d0 = await p.$eval('#' + id, e => +e.dataset.draws || 0); await wait(800); const d1 = await p.$eval('#' + id, e => +e.dataset.draws || 0);
      const f = await p.$eval('#' + id, e => +e.dataset.frames || 0), pl = await p.$eval(`#${id}-p`, e => /Pause/.test(e.textContent));
      if (f > 0 || pl || d1 !== d0) problems.push(`reduced motion: ${id} moved by itself (frames ${f}, redraws ${d1 - d0})`) } }
  await p.close() }
{ // the numbers the step lists state are the ones the scenes draw
  const p = await b.newPage(); await p.goto(file); await wait(800);
  const r = await p.evaluate(() => {
    const R = RP.run(TRACES[0]), T4 = PAPER.tables.t4.rows, out = { fl: {}, want: {}, mr: [], TUMR: window.TUMR, rr: [] };
    document.querySelectorAll('[data-fl]').forEach(s => { (out.fl[s.dataset.fl] = out.fl[s.dataset.fl] || []).push(s.textContent.trim()) });
    const agent = Object.keys(R.created).length + R.held.filter(p => !(p in R.created)).length;
    out.want = { n: R.events.length, e0: R.e0_files, e0l: R.e0_lines, known: R.known_only.length, held: agent, base: T4[0][4], imit: T4[1][4], res: T4[2][4] };
    out.e0name = Object.keys(R.E0).map(p => p.slice(p.lastIndexOf('/') + 1)); out.resText = document.getElementById('sx-fl-res').textContent;
    out.mr = [...document.querySelectorAll('#sx-mr li')].map(li => li.textContent);
    // every trace: the generated groups cover all commands once, in order, one turn per group (adjacent turns merged only beyond 8)
    const seg = document.getElementById('rrM'); seg.querySelector('button[data-m=early]').click();
    document.querySelectorAll('#rtPick button').forEach((b, i) => { b.click(); const G = TURR.groups(), Rr = RP.run(TRACES[i]);
      const flat = G.flatMap(g => g.ev), turns = [...new Set(Rr.events.map(e => e.t))];
      out.rr.push({ i, n: Rr.events.length, flat, groups: G.length, turns: turns.length, items: [...document.querySelectorAll('#sx-rr li')].map(li => li.textContent.slice(0, 40)),
        sameTurn: G.every(g => g.ev.every(j => g.t.includes(Rr.events[j].t))), sum: document.getElementById('rrSum').textContent, e0: Rr.e0_files, cmds: Rr.events.length }) });
    document.querySelector('#rtPick button').click();
    return out });
  const say = (cond, msg) => { if (!cond) problems.push('data: ' + msg) };
  for (const [k, v] of Object.entries(r.want)) { const got = r.fl[k] || []; say(got.length > 0 && got.every(x => x === String(v)), `fl step list ${k}: ${got.join(',')} against ${v}`) }
  say(r.e0name.length === 1 && r.resText.includes(r.e0name[0]), `fl step 2 names the replayed file (${r.e0name})`);
  const words = { start: 'Initial request', extension: 'extension', revision: 'revision', conflict: 'conflict' };
  say(r.TUMR && r.TUMR.length === 7 && r.mr.length === 7, 'mr has 7 rounds and 7 list items');
  if (r.TUMR) r.TUMR.forEach((x, i) => { const li = r.mr[i] || '';
    say(li.slice(0, 30).includes(words[x.style]), `mr item ${i + 1} is not a ${x.style}`);
    say((x.verdict === 0) === /\bfails\b/.test(li), `mr item ${i + 1}: verdict ${x.verdict} against the text`);
    say(x.verdict !== 1 || /\bpasses\b/.test(li), `mr item ${i + 1}: a printed pass the text does not state`);
    say(x.verdict !== null || /not print/.test(li), `mr item ${i + 1}: an unprinted verdict the text does not flag`) });
  r.rr.forEach(x => {
    say(x.flat.length === x.n && x.flat.every((j, k) => j === k), `rr trace ${x.i}: the steps do not cover its ${x.n} commands once, in order`);
    say(x.sameTurn && (x.turns <= 8 ? x.groups === x.turns : x.groups === 8), `rr trace ${x.i}: ${x.groups} steps for ${x.turns} turns`);
    say(x.items.length === x.groups && x.items.every(t => /^Turns? \d/.test(t)), `rr trace ${x.i}: list items do not follow the turns`);
    say(x.sum.startsWith(x.cmds + ' commands') && x.sum.includes('recovers ' + x.e0 + ' pre-existing'), `rr trace ${x.i}: summary line ${x.sum.slice(0, 80)}`) });
  await p.close() }
await b.close();
console.log('stages checked', checked, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
