// Exercise every control of the Database atlas tab (t-atlas) at 390 px dark and 920 px light.
// Reports page errors, NaN/undefined in visible text, sideways page scroll; writes chooser results for a set of answer
// combinations to test_out.json (recompute.py re-derives them in Python from atlas.json and compares).
// Run from anywhere: node <this file> [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../../..');
const require = createRequire(path.join(root, 'html_utils', 'package.json'));
const puppeteer = require('puppeteer');
const page = path.resolve(here, '../../index.html');
const shots = process.argv[2] || path.resolve(here, '../../.shots');
fs.mkdirSync(shots, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const out = { runs: [], chooser: [] };
const COMBOS = [{ access: 'rel', inv: 'yes' }, { access: 'vec', ops: 'managed' }, { access: 'kv', writes: 'high', known: 'yes' }, { access: 'agg', ops: 'lib' },
  { access: 'text' }, { access: 'ts', writes: 'high' }, { access: 'graph', inv: 'yes', ops: 'server' }, { access: 'rel', inv: 'yes', writes: 'high', ops: 'cluster' },
  { access: 'doc', known: 'no', ops: 'managed' }, { inv: 'yes', writes: 'high' }];
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + page);
  await p.click('button[data-t=t-atlas]');
  await sleep(300);
  const bad = async tag => { const t = await p.$eval('#t-atlas', e => e.innerText); const m = t.match(/\bNaN\b|\bundefined\b|\[object|Infinity/g); if (m) errs.push(tag + ': ' + m.join(','));
    const sw = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1); if (sw) errs.push(tag + ': sideways scroll') };
  const clickAll = async sel => { const n = await p.$$eval(sel, e => e.length); for (let i = 0; i < n; i++) { await p.evaluate((s, i) => document.querySelectorAll(s)[i].click(), sel, i); await sleep(15) } return n };
  const c = {};
  // column views
  c.views = await clickAll('#da-view button'); await bad('views');
  await p.click('#da-view button[data-v=overview]');
  // sort every header twice
  const nh = await p.$$eval('#da-table thead th', e => e.length);
  for (let i = 0; i < nh; i++) { for (let k = 0; k < 2; k++) { await p.evaluate(i => document.querySelectorAll('#da-table thead th')[i].click(), i); await sleep(20) } }
  c.headers = nh; await bad('sort');
  // every filter chip on then off
  c.chips = await clickAll('#da-filters button'); await bad('filters on'); await clickAll('#da-filters button');
  // search
  await p.type('#da-search', 'raft'); await sleep(100); c.search_raft = await p.$$eval('#da-table tbody tr[data-id]', e => e.length);
  await p.click('#da-clear'); await sleep(50);
  // open every row's detail
  const ids = await p.$$eval('#da-table tbody tr[data-id]', e => e.map(x => x.dataset.id)); c.rows = ids.length;
  for (const id of ids) { await p.evaluate(id => window.DA_openRow(id, false), id); }
  await bad('details');
  await p.evaluate(id => window.DA_openRow(id, false), 'postgresql');
  // compare: add four (the first drops out), then remove
  for (const id of ['postgresql', 'cockroachdb', 'spanner', 'mongodb'].filter(x => ids.includes(x))) await p.click(`button[data-cmp="${id}"]`);
  c.cmp = await p.$$eval("#da-cmpwrap thead th", e => e.length); await bad('compare');
  if (width === 390) await p.screenshot({ path: path.join(shots, 'atlas-cmp-' + scheme + '-' + width + '.png'), fullPage: false, clip: await p.$eval('#da-cmpwrap', e => { const r = e.getBoundingClientRect(); return { x: 0, y: r.top + scrollY, width: innerWidth, height: Math.min(900, r.height) } }) });
  // chooser: every option, then the combinations
  c.qopts = await clickAll('#da-qs button'); await bad('chooser all'); await p.click('#da-clear');
  for (const combo of COMBOS) {
    await p.click('#da-clear'); await sleep(20);
    for (const [q, o] of Object.entries(combo)) await p.click(`#da-qs .chips[data-q=${q}] button[data-o=${o}]`);
    await sleep(30);
    const res = await p.evaluate(() => ({ cand: [...document.querySelectorAll('#da-table tbody tr.cand')].map(r => r.dataset.id), text: document.getElementById('da-res').innerText.slice(0, 400) }));
    if (width === 920) out.chooser.push({ combo, cand: res.cand.sort() });
    await bad('combo ' + JSON.stringify(combo));
  }
  await p.click('#da-clear');
  // licence timeline dots and claims filters
  c.ltdots = await p.$$eval('#da-lt circle.ev', e => e.length);
  if (c.ltdots) await p.evaluate(() => document.querySelector('#da-lt circle.ev').dispatchEvent(new MouseEvent('click', { bubbles: true })));
  c.claimf = await clickAll('#da-cl-f button'); await bad('claims');
  await p.click('#da-cl-f button[data-k=all]');
  await p.evaluate(() => document.getElementById('da-glo-d').open = true);
  await p.evaluate(id => window.DA_openRow(id, false), 'redis');
  await p.screenshot({ path: path.join(shots, 'atlas-full-' + scheme + '-' + width + '.png'), fullPage: true });
  out.runs.push({ scheme, width, counts: c, errors: errs });
  console.log(scheme, width, JSON.stringify(c), 'errors', JSON.stringify(errs));
  await p.close();
}
await b.close();
fs.writeFileSync(path.join(here, 'test_out.json'), JSON.stringify(out, null, 1));
