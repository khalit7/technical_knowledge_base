// Checks for "C++: ownership, moves and object lifetimes".
// usage: node src/check_controls.mjs [shots dir]   (run from the page folder or anywhere; puppeteer from html_utils)
// 1. At 390 px dark and 920 px light (reduced motion on): nothing moves before the reader acts; every chip and
//    segment button, every step button and slider of the four replays; no script error, NaN, undefined or sideways scroll.
// 2. Every embedded output equals its recorded file in src/ca/out, and the replay data equals the logs.
// 3. Numbers the prose states about the traces (copies without noexcept, objects made, leaked objects) recomputed from the logs.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = execSync('git rev-parse --show-toplevel', { cwd: here }).toString().trim();
const require = createRequire(path.join(repo, 'html_utils/package.json'));
const puppeteer = require('puppeteer');
const page = path.resolve(here, '../index.html');
const shots = process.argv[2];
if (shots) fs.mkdirSync(shots, { recursive: true });
const out = n => fs.readFileSync(path.join(here, 'ca/out', n + '.txt'), 'utf8');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let problems = 0;
const fail = m => { problems++; console.log('PROBLEM', m) };

// 3. trace facts
const log = n => out(n).split('\n').slice(1).filter(Boolean);
const count = (n, re) => log(n).filter(l => re.test(l)).length;
const made = n => count(n, /^(ctor|copy|move) #/);
if (count('lt_growth_nx', /^copy #/) !== 3) fail('growth_nx copies != 3');
if (count('lt_growth', /^copy #/) !== 0) fail('growth copies != 0');
if (made('lt_growth') !== 9 || made('lt_growth_nx') !== 9) fail('growth objects != 9');
if (made('lt_calls') !== 4) fail('calls objects != 4');
if (count('lt_reserve', /^(copy|move) #/) !== 0 || made('lt_reserve') !== 3) fail('reserve not 3 objects, no moves');
const dt = new Set(log('lt_cycle').filter(l => l.startsWith('dtor')).map(l => l.split(' ')[1]));
if (dt.has('#1') || dt.has('#2') || !dt.has('#3') || !dt.has('#4')) fail('cycle: expected #1 #2 leaked, #3 #4 destroyed');
if (log('lt_cycle').indexOf('dtor #4') > log('lt_cycle').indexOf('dtor #3')) fail('cycle: #4 should die before #3');
const tm = log('lt_temps'); if (!(tm.indexOf('dtor #2') < tm.findIndex(l => l.startsWith('@137')) && tm.indexOf('dtor #1') > tm.findIndex(l => l.startsWith('@137')))) fail('temps order');
console.log('trace facts checked');

const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + page);
  await p.evaluate(() => document.querySelector('button[data-t="t-read"]').click());
  // nothing has moved: every replay on step 1 after a scroll past it
  await p.evaluate(async () => { for (const c of document.querySelectorAll('[id$="-card"]')) { c.scrollIntoView(); await new Promise(r => setTimeout(r, 150)) } });
  await sleep(1600);
  const moved = await p.evaluate(() => [...document.querySelectorAll('input[type=range]')].filter(s => +s.value !== 0).map(s => s.id));
  if (moved.length) fail(`${scheme} ${width}: autoplay in ${moved}`);
  const n = await p.evaluate(async () => {
    const tab = document.getElementById('t-read'), wait = ms => new Promise(r => setTimeout(r, ms));
    let clicks = 0;
    const stepAll = async () => {
      for (const f of tab.querySelectorAll('button[id$="-f"]')) { const s = document.getElementById(f.id.replace(/-f$/, '-s')); for (let i = 0; i < +s.max + 1; i++) { f.click(); clicks++ } }
      for (const bk of tab.querySelectorAll('button[id$="-b"]')) { bk.click(); clicks++ }
      for (const s of tab.querySelectorAll('input[type=range]')) { s.value = Math.floor(s.max / 2); s.dispatchEvent(new Event('input')); clicks++ }
      for (const v of tab.querySelectorAll('select')) { v.value = '2'; v.dispatchEvent(new Event('change')); clicks++ }
    };
    await stepAll();
    for (const g of tab.querySelectorAll('.seg,.chips')) for (const bt of g.querySelectorAll('button')) { bt.click(); clicks++; await wait(20); await stepAll() }
    for (const d of tab.querySelectorAll('details')) { d.open = true; clicks++ }
    return clicks;
  });
  for (const t of ['t-read', 't-more']) {
    await p.evaluate(t => document.querySelector(`button[data-t="${t}"]`).click(), t);
    await sleep(150);
    const bad = await p.evaluate(t => (document.getElementById(t).innerText.match(/\bNaN\b|\bundefined\b(?! behaviou?r)|\bInfinity\b/g) || []).length, t);
    const sw = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    if (bad || sw) fail(`${t} ${scheme} ${width}: NaN/undefined ${bad}, sideways ${sw}`);
  }
  console.log(`${scheme} ${width}: ${n} interactions`);
  if (shots) {
    await p.evaluate(() => document.querySelector('button[data-t="t-read"]').click());
    for (const id of ['ow-hero', 'ow-s0', 'ow-addr', 'ow-cost', 'ow-a1-card', 'ow-a2-card', 'ow-a4-card']) {
      const el = await p.$('#' + id); if (!el) { fail('missing #' + id); continue }
      const target = id === 'ow-addr' || id === 'ow-cost' ? await el.evaluateHandle(e => e.closest('.fig')) : el;
      await target.screenshot({ path: `${shots}/${id}-${scheme}-${width}.png` });
    }
  }
  if (width === 920) {
    const emb = await p.evaluate(() => { const r = {}; document.querySelectorAll('pre[data-ca-out]').forEach(e => { const n = e.dataset.caOut; const rest = e.nextElementSibling && e.nextElementSibling.querySelector('[data-ca-rest]'); (r[n] = r[n] || []).push(e.textContent + (rest ? '\n' + rest.textContent : '')) }); return r });
    let ok = 0;
    for (const [nm, list] of Object.entries(emb)) for (const got of list) { if (got === out(nm).replace(/\n+$/, '')) ok++; else fail('embedded output differs: ' + nm) }
    const data = await p.evaluate(() => Object.fromEntries(Object.entries(window.CA_DATA.lifetime).map(([k, v]) => [k, v.log.join('\n')])));
    for (const [k, v] of Object.entries(data)) if (v !== log('lt_' + k).join('\n')) fail('replay data differs: ' + k);
    console.log(`embedded outputs matching their files: ${ok}; replay scenarios checked: ${Object.keys(data).length}`);
  }
  if (errs.length) fail(`${scheme} ${width} errors: ${errs}`);
  await p.close();
}
await b.close();
console.log(problems ? `FAILED (${problems})` : 'all checks passed');
process.exit(problems ? 1 : 0);
