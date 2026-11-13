// The 2026-11-06 layout and motion checks for this page, at 1400 px light, 920 px light and 390 px dark:
// the two 3D stages (#stg-gw, the checked goto on configure-git-webserver, soft plan against StateM, illustrative; #stg-rp, a real StateM run from the
// released DeepSeek trials on the runbook graph) play by themselves once scrolled into view, step to their last step, have exactly one step-list item
// per step (both of the gw stage's lists, the generated list of every one of the six replays, none longer than 12 steps), stop drawing off screen and
// stop for good on a reader control; a run change or a harness toggle replays; at 1400 px every split shows two columns; no errors, NaN, undefined or
// sideways scroll; under prefers-reduced-motion nothing moves by itself; the counters the gw step list states are the scene's data (window.SMGW); and
// every replay's steps agree with the 440-trial audit rows (committed gotos and refusals per trial, window.TRIALS.rows) and with its outcome line.
// Writes a mid-step screenshot of each stage.
// usage (from the repo root): node technical_knowledge_base/whats_new/papers/statem/src/check_stages.mjs [shots dir]
import puppeteer from '../../../../../html_utils/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const file = 'file://' + path.resolve(here, '../index.html');
const shots = process.argv[2] || path.resolve(here, '../.shots'); fs.mkdirSync(shots, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
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
      // flows stop drawing off screen
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
    // the gw stage's second list: the toggle swaps the list and replays
    if (t === 't-read') {
      await clk('#gwM button[data-m=soft]'); await wait(300);
      const n = await p.$eval('#stg-gw-r', e => +e.max + 1), lis = await listOf(p, 'stg-gw');
      if (lis !== n || n !== 6) problems.push(`${tag}: stg-gw soft plan has ${n} steps but ${lis} list items`);
      await p.$eval('#stg-gw', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
      if (!(await p.$eval('#stg-gw-p', e => /Pause/.test(e.textContent)))) problems.push(`${tag}: stg-gw did not replay after the toggle`);
      await p.evaluate(() => { const e = document.getElementById('stg-gw-r'); e.value = 3; e.dispatchEvent(new Event('input')) }); await wait(2000);
      await (await p.$('#stg-gw')).screenshot({ path: `${shots}/stage-stg-gw-soft-mid-${scheme}-${width}.png` });
      await p.evaluate(() => { const e = document.getElementById('stg-gw-r'); e.value = 5; e.dispatchEvent(new Event('input')) }); await wait(1600);
      if ((await p.$eval('#stg-gw .stg-st', e => e.textContent)) !== 'step 6 of 6') problems.push(`${tag}: stg-gw soft plan does not reach step 6`);
      await clk('#gwM button[data-m=sm]'); await wait(300);
      if ((await listOf(p, 'stg-gw')) !== 8) problems.push(`${tag}: stg-gw StateM list is not back to 8 items`);
    }
    // every replay: its generated list has one item per step, at most 12, and a run change replays
    if (t === 't-run') {
      const opts = await p.$$eval('#rpSel option', os => os.map(o => o.value));
      for (const ov of opts) {
        await p.evaluate(ov => { const e = document.getElementById('rpSel'); e.value = ov; e.dispatchEvent(new Event('change', { bubbles: true })) }, ov);
        await p.$eval('#stg-rp', e => e.scrollIntoView({ block: 'center' })); await wait(700);
        const n = await p.$eval('#stg-rp-r', e => +e.max + 1), lis = await listOf(p, 'stg-rp');
        if (lis !== n) problems.push(`${tag}: stg-rp ${ov} has ${n} steps but ${lis} list items`);
        if (n > 12) problems.push(`${tag}: stg-rp ${ov} has ${n} steps (the long-replay limit is about 12)`);
        if (n > 1 && !(await p.$eval('#stg-rp-p', e => /Pause/.test(e.textContent)))) problems.push(`${tag}: stg-rp ${ov} did not replay after the run changed`);
        await p.evaluate(n => { const e = document.getElementById('stg-rp-r'); e.value = n - 1; e.dispatchEvent(new Event('input')) }, n); await wait(1500);
        if (ov === 'r0') await (await p.$('#stg-rp')).screenshot({ path: `${shots}/stage-stg-rp-r0-last-${scheme}-${width}.png` });
        if (ov === 'r1') { await p.evaluate(() => { const e = document.getElementById('stg-rp-r'); e.value = 5; e.dispatchEvent(new Event('input')) }); await wait(1600); await (await p.$('#stg-rp')).screenshot({ path: `${shots}/stage-stg-rp-r1-refused-${scheme}-${width}.png` }) }
      }
      // a replay link in the trial grid loads that run on the stage
      await p.$eval('#grid5 button[data-task="configure-git-webserver"]', e => e.click()); await wait(200);
      await p.$eval('#gridDet a[data-rp]', a => a.click()); await wait(500);
      const v = await p.$eval('#rpSel', e => e.value), first = await p.$eval('#sx-rp li', e => e.textContent);
      if (v !== 'r0' || !/^t = 0 s/.test(first)) problems.push(`${tag}: the grid's replay link did not load the run (${v})`);
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
{ // the numbers the step lists state are the ones the scenes draw, and the replays agree with the audit of all 440 trials
  const p = await b.newPage(); await p.goto(file); await wait(800);
  const r = await p.evaluate(() => {
    const out = { G: window.SMGW, R: window.SMRP, LS: document.getElementById('sx-gw-sm').innerText, LO: document.getElementById('sx-gw-soft').textContent, rows: {}, lists: [] };
    const T = window.TRIALS; T.rows.forEach(x => { out.rows[T.tasks[x[0]] + '__' + x[1]] = { go: x[9], blf: x[10], blm: x[11], pass: x[2] } });
    const sel = document.getElementById('rpSel');
    [...sel.options].forEach(o => { sel.value = o.value; sel.dispatchEvent(new Event('change')); out.lists.push({ items: [...document.querySelectorAll('#sx-rp li')].map(li => li.textContent), outc: document.getElementById('rpOut').textContent }) });
    return out });
  const say = (cond, msg) => { if (!cond) problems.push('data: ' + msg) };
  const G = r.G;
  if (!G) problems.push('SMGW missing'); else {
    say(G.sm.length === 8 && G.soft.length === 6, `gw steps ${G.sm.length} ${G.soft.length}`);
    const w = ['', 'One', 'two', 'three', 'four', 'five'];
    const c2 = G.sm[2], c4 = G.sm[4], c6 = G.sm[6];
    say(c2.go === 1 && c2.bl === 0 && c2.ck === 3 && r.LS.includes('One transition requested, none refused, three checks run'), 'gw step 3 counters');
    say(c4.go === 2 && c4.bl === 1 && c4.ck === 4 && r.LS.includes('two transitions requested, one refused, four host checks run'), 'gw step 5 counters');
    say(c6.go === 3 && c6.bl === 1 && c6.ck === 5 && r.LS.includes('three requested, one refused, five checks run'), 'gw step 7 counters');
    say(G.sm[4].w[3] === 2 && G.sm[5].w[3] === 1 && G.sm[7].res === 1 && G.soft[5].res === 0 && G.soft[5].w[3] === 2, 'gw world: nginx down at the refusal, back after the repair; pass with StateM, fail without');
    void w;
  }
  const R = r.R;
  if (!R || R.length !== 6) problems.push('SMRP missing or not six runs'); else R.forEach((x, i) => {
    const row = r.rows[x.trial], L = x.steps[x.steps.length - 1], items = r.lists[i].items;
    say(!!row, `${x.trial} not in the audit rows`); if (!row) return;
    say(L.go === row.go, `${x.trial}: replay commits ${L.go} gotos, audit row ${row.go}`);
    say(L.bl === row.blf + row.blm, `${x.trial}: replay refuses ${L.bl}, audit row ${row.blf} by a failing check plus ${row.blm} manual only`);
    say(!!x.reward === !!row.pass, `${x.trial}: outcome differs from the audit row`);
    say(items.length === x.steps.length && items.every((t, j) => t.startsWith('t = ' + x.steps[j].t + ' s:')), `${x.trial}: list items do not follow the steps`);
    say(r.lists[i].outc.includes(`${L.go} transitions committed, ${L.bl} refused`), `${x.trial}: outcome line ${r.lists[i].outc.slice(0, 80)}`);
  });
  await p.close() }
await b.close();
console.log('stages checked', checked, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
