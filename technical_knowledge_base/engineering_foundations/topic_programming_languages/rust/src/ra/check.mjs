// Checks for "Rust: the essentials": click every control of the Reading tab (the hero, the borrow timeline, the
// Borrow-checker lab, the prediction prompts) at 390 dark and
// 920 light (reduced motion); report script errors, NaN/undefined and sideways scroll; confirm the page embeds exactly
// the recorded outputs and that the JS data equals the files; confirm each prediction prompt has exactly one candidate
// whose recorded output equals Python's, and that it is the marked answer.
// usage: node src/ra/check.mjs [shots dir]   (puppeteer from html_utils/node_modules)
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = execSync('git rev-parse --show-toplevel', { cwd: here }).toString().trim();
const require = createRequire(path.join(repo, 'html_utils/package.json'));
const puppeteer = require('puppeteer');
const page = path.resolve(here, '../../index.html');
const shots = process.argv[2] || path.join(process.env.PL || path.join(os.tmpdir(), 'pl'), 'ra_es/shots');
fs.mkdirSync(shots, { recursive: true });
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
  await sleep(300);
  const before = await p.evaluate(() => document.getElementById('t-read').innerHTML.length);
  await sleep(1500);
  const after = await p.evaluate(() => document.getElementById('t-read').innerHTML.length);
  if (before !== after) { problems++; console.log('PROBLEM: the Reading tab changed with no input (autoplay?)') }
  const n = await p.evaluate(async () => {
    const tab = document.getElementById('t-read'), wait = ms => new Promise(r => setTimeout(r, ms));
    let clicks = 0;
    for (const g of tab.querySelectorAll('.seg')) for (const bt of g.querySelectorAll('button')) {
      bt.click(); clicks++; await wait(10);
      const pre = g.id.replace('-seg', '-ctl');
      for (let i = 0; i < 10; i++) { document.getElementById(pre + '-f').click(); clicks++ }
      for (let i = 0; i < 10; i++) { document.getElementById(pre + '-b').click(); clicks++ }
      const sc = document.getElementById(pre + '-s'); sc.value = Math.floor(sc.max / 2); sc.dispatchEvent(new Event('input')); clicks++;
    }
    const nChips = tab.querySelectorAll('#ra-bc-pick button').length;
    for (let i = 0; i < nChips; i++) { tab.querySelectorAll('#ra-bc-pick button')[i].click(); clicks++; tab.querySelector('#ra-bc-guess button').click(); clicks++ }
    for (const q of tab.querySelectorAll('.ra-dq')) { q.querySelector('button[data-pick="a"]').click(); clicks++ }
    for (const d of tab.querySelectorAll('details')) { d.open = true; clicks++ }
    return clicks;
  });
  const bad = await p.evaluate(() => { const s = document.getElementById('t-read').innerText; return (s.match(/\bNaN\b|(?<!considered-)\bundefined\b(?![ -](behaviou?r|here|symbol))/g) || []).length });
  const sw = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  const picked = await p.evaluate(() => [...document.querySelectorAll('.ra-dq')].every(q => q.querySelector('details.ra-drv').open && q.querySelectorAll('button[data-pick]:disabled').length === 3));
  await (await p.$('#t-read')).screenshot({ path: `${shots}/t-read-${scheme}-${width}.png` });
  if (bad || sw || !picked) { problems++; console.log(`PROBLEM ${scheme} ${width}: NaN/undefined ${bad}, sideways ${sw}, prompts revealed ${picked}`) }
  console.log(`t-read ${scheme} ${width}: ${n} interactions, NaN/undefined ${bad}, sideways ${sw}, prompts revealed ${picked}`);
  if (width === 920) {
    const emb = await p.evaluate(() => { const r = {}; document.querySelectorAll('pre[data-ra-out]').forEach(e => { const n = e.dataset.raOut; const rest = e.nextElementSibling && e.nextElementSibling.querySelector('[data-ra-rest]'); (r[n] = r[n] || []).push(e.textContent + (rest ? '\n' + rest.textContent : '')) }); return r });
    let ok = 0, nb = 0;
    for (const [nm, list] of Object.entries(emb)) {
      const want = file(nm).replace(/\n+$/, '');
      for (const got of list) { if (got === want) ok++; else { nb++; console.log('MISMATCH', nm) } }
    }
    console.log(`embedded outputs: ${ok} match, ${nb} differ (${Object.keys(emb).length} distinct recordings)`);
    if (nb) problems++;
    const D = await p.evaluate(() => window.RA_DATA);
    let dbad = 0;
    const eq = (a, nm) => { if (a !== file(nm)) { dbad++; console.log('DATA MISMATCH', nm) } };
    eq(D.own.rs_log, 'l_own_anim'); eq(D.own.py_log, 'l_own_anim_py');
    eq(D.gate.err.out, 'l_gate_err'); eq(D.gate.fix.out, 'l_gate_fix'); eq(D.gate.reorder.out, 'l_gate_reorder');
    const verdict0 = t => /^error(\[E\d+\])?:/m.test(t) ? 'compile' : /panicked at/.test(t) ? 'panic' : 'ok';
    for (const sc of D.bc) { eq(sc.err_out, `bc_${sc.id}_err`); eq(sc.fix_out, `bc_${sc.id}_fix`); if (verdict0(sc.err_out) !== sc.kind) { dbad++; console.log('KIND', sc.id) } if (verdict0(sc.fix_out) !== 'ok') { dbad++; console.log('FIX FAILS', sc.id) } }
    if (D.bc.length !== 15) { dbad++; console.log('LAB has', D.bc.length, 'scenarios') }
    // prediction prompts: exactly one candidate prints what Python prints (quotes normalised), and it is the answer
    const verdict = t => /^error(\[E\d+\])?:/m.test(t) ? 'compile' : /panicked at/.test(t) ? 'panic' : 'ok';
    const norm = t => t.replace(/\n$/, '').split('\n').filter(l => !l.startsWith('$ ')).join('\n').replace(/'/g, '"');
    const items = await p.evaluate(() => [...document.querySelectorAll('.ra-dq')].map(q => ({ id: q.id.replace('ra-dq-', ''), ans: q.dataset.ans })));
    let drBad = 0;
    for (const d of items) {
      const py = norm(file(`dr_${d.id}_py`));
      const same = ['a', 'b', 'c'].filter(c => { const o = file(`dr_${d.id}_${c}`); return verdict(o) === 'ok' && norm(o).split('\n').filter(l => !/^(warning|  |\d+ \||  =|$)/.test(l)).join('\n').endsWith(py) });
      if (same.length !== 1 || same[0] !== d.ans) { drBad++; console.log('PROMPT', d.id, 'matching candidates', same, 'answer', d.ans) }
    }
    console.log(`JS data and lab mismatches ${dbad}; prompts without exactly one right answer ${drBad} of ${items.length}`);
    if (dbad || drBad) problems++;
  }
  if (errs.length) { problems++; console.log('ERRORS', scheme, width, errs) }
  await p.close();
}
await b.close();
console.log(problems ? `FAILED (${problems})` : 'all checks passed');
