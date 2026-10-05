// Part 1 (ra) checks: click every control of Part 1's tabs at 390 dark and 920 light; report script errors, NaN/undefined,
// sideways scroll; confirm each drill item has exactly one candidate whose output equals Python's (and that it is the
// marked answer); confirm each lab scenario's stated kind matches its recorded output; confirm the page embeds exactly
// the recorded outputs (static blocks and those the labs render).
// usage: node src/ra/check.mjs [shots dir]   (puppeteer from html_utils/node_modules)
import { createRequire } from 'node:module';
import path from 'node:path';
import os from 'os';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../../../../..');
const require = createRequire(path.join(repo, 'html_utils/package.json'));
const puppeteer = require('puppeteer');
const page = path.resolve(here, '../../index.html');
const shots = process.argv[2] || path.join(process.env.PL || path.join(os.tmpdir(), 'pl'), 'ra/shots');
fs.mkdirSync(shots, { recursive: true });
const TABS = ['t-ra-read', 't-ra-own', 't-ra-bc', 't-ra-drill'];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const file = n => fs.readFileSync(path.join(here, 'out', n + '.txt'), 'utf8');
const b = await puppeteer.launch({ headless: 'shell' });
let problems = 0;
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + page);
  for (const t of TABS) {
    await p.evaluate(t => window.SHOW_TAB(t), t);
    await sleep(200);
    const n = await p.evaluate(async t => {
      const tab = document.getElementById(t), wait = ms => new Promise(r => setTimeout(r, ms));
      let clicks = 0;
      const stepAll = async () => {
        for (const f of tab.querySelectorAll('button[id$="-f"]')) { const s = document.getElementById(f.id.replace(/-f$/, '-s')); for (let i = 0; i < +s.max + 1; i++) { f.click(); clicks++ } }
        for (const bk of tab.querySelectorAll('button[id$="-b"]')) { bk.click(); clicks++ }
        for (const s of tab.querySelectorAll('input[type=range]')) { s.value = Math.floor(s.max / 2); s.dispatchEvent(new Event('input')); clicks++ }
        for (const v of tab.querySelectorAll('select')) { v.value = '2'; v.dispatchEvent(new Event('change')); clicks++ }
        for (const pl of tab.querySelectorAll('button.an-play')) { pl.click(); await wait(30); pl.click(); clicks += 2 }
      };
      await stepAll();
      for (const g of tab.querySelectorAll('.seg')) for (const bt of g.querySelectorAll('button')) { bt.click(); clicks++; await wait(20); await stepAll() }
      if (t === 't-ra-bc') {
        const nChips = tab.querySelectorAll('#ra-bc-pick button').length;
        for (let i = 0; i < nChips; i++) { tab.querySelectorAll('#ra-bc-pick button')[i].click(); clicks++; const g = tab.querySelector('#ra-bc-guess button'); g.click(); clicks++ }
      }
      if (t === 't-ra-drill') {
        const nDots = tab.querySelectorAll('#ra-dr-dots button').length;
        for (let i = 0; i < nDots; i++) { tab.querySelectorAll('#ra-dr-dots button')[i].click(); clicks++; tab.querySelector('button[data-pick="0"]').click(); clicks++ }
        document.getElementById('ra-dr-next').click(); document.getElementById('ra-dr-prev').click(); clicks += 2;
      }
      for (const d of tab.querySelectorAll('details')) { d.open = true; clicks++ }
      return clicks;
    }, t);
    const bad = await p.evaluate(t => { const s = document.getElementById(t).innerText; return (s.match(/\bNaN\b|(?<!=|considered-)\bundefined\b(?![ -](behaviou?r|here|symbol))/g) || []).length }, t);
    const sw = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    await (await p.$('#' + t)).screenshot({ path: `${shots}/${t}-${scheme}-${width}.png` });
    if (bad || sw) { problems++; console.log(`PROBLEM ${t} ${scheme} ${width}: NaN/undefined ${bad}, sideways ${sw}`) }
    console.log(`${t} ${scheme} ${width}: ${n} interactions, NaN/undefined ${bad}, sideways ${sw}`);
  }
  if (width === 920) {
    // embedded outputs (static and lab-rendered) equal the recorded files
    const emb = await p.evaluate(() => { const r = {}; document.querySelectorAll('pre[data-ra-out]').forEach(e => { const n = e.dataset.raOut; const rest = e.nextElementSibling && e.nextElementSibling.querySelector('[data-ra-rest]'); (r[n] = r[n] || []).push(e.textContent + (rest ? '\n' + rest.textContent : '')) }); return r });
    let ok = 0, bad = 0;
    for (const [n, list] of Object.entries(emb)) {
      const want = file(n).replace(/\n+$/, '');
      for (const got of list) { if (got === want) ok++; else { bad++; console.log('MISMATCH', n) } }
    }
    console.log(`embedded outputs: ${ok} match, ${bad} differ (${Object.keys(emb).length} distinct recordings)`);
    if (bad) problems++;
    // JS data equals the files
    const D = await p.evaluate(() => window.RA_DATA);
    let dbad = 0;
    const eq = (a, n) => { if (a !== file(n)) { dbad++; console.log('DATA MISMATCH', n) } };
    eq(D.own.rs_log, 'l_own_anim'); eq(D.own.py_log, 'l_own_anim_py'); eq(D.bench.rs, 't_iterbench'); eq(D.bench.py, 't_iterbench_py');
    eq(D.gate.err.out, 'l_gate_err'); eq(D.gate.fix.out, 'l_gate_fix'); eq(D.gate.reorder.out, 'l_gate_reorder');
    const verdict = t => /^error(\[E\d+\])?:/m.test(t) ? 'compile' : /panicked at/.test(t) ? 'panic' : 'ok';
    let kindBad = 0;
    for (const s of D.bc) { eq(s.err_out, `bc_${s.id}_err`); eq(s.fix_out, `bc_${s.id}_fix`); if (verdict(s.err_out) !== s.kind) { kindBad++; console.log('KIND', s.id) } if (verdict(s.fix_out) !== 'ok') { kindBad++; console.log('FIX FAILS', s.id) } }
    // drill: exactly one candidate prints what Python prints (quotes normalised), and it is the marked answer
    const norm = t => t.replace(/\n$/, '').split('\n').filter(l => !l.startsWith('$ ')).join('\n').replace(/'/g, '"');
    let drBad = 0;
    for (const d of D.drill) {
      eq(d.py_out, `dr_${d.id}_py`);
      d.cands.forEach((c, j) => eq(c.out, `dr_${d.id}_${'abc'[j]}`));
      const py = norm(d.py_out);
      const same = d.cands.map((c, j) => verdict(c.out) === 'ok' && norm(c.out).split('\n').filter(l => !/^(warning|  |\d+ \||  =|$)/.test(l)).join('\n').endsWith(py) ? 'abc'[j] : null).filter(Boolean);
      if (same.length !== 1 || same[0] !== d.answer) { drBad++; console.log('DRILL', d.id, 'matching candidates', same, 'answer', d.answer) }
    }
    console.log(`JS data mismatches ${dbad}; lab kinds wrong ${kindBad}; drill items without exactly one right answer ${drBad} of ${D.drill.length}`);
    if (dbad || kindBad || drBad) problems++;
  }
  if (errs.length) { problems++; console.log('ERRORS', scheme, width, errs) }
  await p.close();
}
await b.close();
console.log(problems ? `FAILED (${problems})` : 'all Part 1 checks passed');
