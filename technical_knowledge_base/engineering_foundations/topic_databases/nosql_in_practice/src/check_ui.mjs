// Clicks every control on every tab at 390 dark and 920 light; reports errors, NaN/undefined/(missing) text, sideways scroll;
// screenshots every Reading section and every visual. Also prints the page's computed numbers for recompute.py to compare.
// Run from the repo root: node technical_knowledge_base/engineering_foundations/topic_databases/nosql_in_practice/src/check_ui.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const require = createRequire(path.resolve('html_utils/package.json'));
const puppeteer = require('puppeteer');
const here = path.dirname(new URL(import.meta.url).pathname);
const file = path.resolve(here, '..', 'index.html');
const out = process.argv[2] || path.resolve(here, '..', '.shots', 'ui');
fs.mkdirSync(out, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell' });
let problems = 0, clicks = 0;
const pageNums = {};
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + file);
  await sleep(300);
  const bad = async label => {
    const r = await p.evaluate(() => {
      const t = document.body.innerText; const m = t.match(/.{0,40}(NaN|undefined|Infinity|\[object|\(missing\)).{0,40}/);
      const box = document.getElementById('jsErr');
      return { m: m ? m[0] : '', side: document.documentElement.scrollWidth > innerWidth + 1, box: box && !box.hidden ? box.textContent : '' };
    });
    if (r.m || r.side || r.box || errs.length) { problems++; console.log('PROBLEM', scheme, width, label, JSON.stringify(r), errs.splice(0)); }
  };
  const shot = async (sel, name) => { const el = await p.$(sel); if (el) await el.screenshot({ path: `${out}/${name}-${scheme}-${width}.png` }); };
  const setRange = async (id, v) => { await p.evaluate((id, v) => { const s = document.getElementById(id); s.value = v; s.dispatchEvent(new Event('input')); s.dispatchEvent(new Event('change')); }, id, v); clicks++; };
  const setSel = async (id, v) => { await p.evaluate((id, v) => { const s = document.getElementById(id); s.value = v; s.dispatchEvent(new Event('change', { bubbles: true })); }, id, v); clicks++; };
  await p.click('button[data-t=t-read]'); await sleep(200);
  const secs = await p.$$eval('#t-read section', es => es.map(e => e.id));
  for (const id of secs) await shot('#' + id, 'sec-' + id);
  // section 2 animation: every mode, every step
  for (const m of ['seq', 'idx', 'clu', 'cas']) {
    await p.evaluate(m => document.querySelector(`#rd-lat-mode button[data-m=${m}]`).click(), m); clicks++;
    const n = await p.$eval('#rd-lat-ctl-s', e => +e.max + 1);
    for (let i = 0; i < n; i++) { await setRange('rd-lat-ctl-s', i); if (i === n - 1 || i === 3) await shot('#rd-lat-card', `lat-${m}-${i}`); }
    await bad('latest50 ' + m);
  }
  for (const id of ['rd-lat-ctl-p', 'rd-lat-ctl-f', 'rd-lat-ctl-b', 'rd-lat-ctl-p']) { await p.click('#' + id); clicks++; await sleep(40); }
  await setSel('rd-lat-ctl-v', '2');
  await p.evaluate(() => document.querySelectorAll('#t-read details').forEach(d => d.open = true));
  await bad('details open');
  // quorum calculator
  for (const rf of [1, 3, 5, 7]) for (const w of ['ONE', 'QUORUM', 'ALL']) for (const r of ['ONE', 'QUORUM', 'ALL']) {
    await setRange('rd-q-rf', rf); await setSel('rd-q-w', w); await setSel('rd-q-r', r);
    for (const d of [0, 1, rf]) await setRange('rd-q-d', d);
  }
  await setRange('rd-q-rf', 3); await setSel('rd-q-w', 'QUORUM'); await setSel('rd-q-r', 'QUORUM'); await setRange('rd-q-d', 1);
  await shot('#rd-q-card', 'quorum'); await bad('quorum');
  // cardinality calculator
  for (const id of ['rd-c-h', 'rd-c-m', 'rd-c-r', 'rd-c-s']) { await setRange(id, 1); await setRange(id, 10); }
  await p.click('#rd-c-u'); clicks++; await shot('#rd-card-card', 'cardinality'); await p.click('#rd-c-u'); clicks++;
  await bad('cardinality');
  for (const id of ['rd-rl-card', 'rd-g-card']) await shot('#' + id, id);
  // the page's numbers for recompute.py
  if (width === 920) {
    Object.assign(pageNums, await p.evaluate(() => {
      const o = {}; document.querySelectorAll('.nv[data-n]').forEach(e => o[e.dataset.n] = e.textContent);
      o['#one-repl'] = document.getElementById('one-repl').textContent; o['#rd-g-4'] = document.getElementById('rd-g-4').textContent;
      o['#rd-ts'] = document.getElementById('rd-ts').innerText; o['#rd-doc-pg'] = document.getElementById('rd-doc-pg').innerText;
      o['#lab-hot-out'] = ''; return o;
    }));
  }
  // lab tab
  await p.click('button[data-t=t-lab]'); await sleep(200); clicks++;
  for (const pr of ['rel', 'bad', 'st']) {
    await p.evaluate(pr => document.querySelector(`#lab-presets button[data-p=${pr}]`).click(), pr); clicks++;
    const n = await p.$$eval('#lab-aps .ap', es => es.length);
    for (let i = 0; i < n; i++) { await p.evaluate(i => document.querySelectorAll('#lab-aps .ap')[i].click(), i); clicks++; }
    await shot('#lab-top', 'lab-' + pr); await bad('lab preset ' + pr);
  }
  const sels = await p.$$eval('#lab-keys select', es => es.map(e => [e.dataset.k, [...e.options].map(o => o.value)]));
  for (const [k, vals] of sels) for (const v of vals) {
    await p.evaluate((k, v) => { const s = document.querySelector(`#lab-keys select[data-k=${k}]`); s.value = v; s.dispatchEvent(new Event('change', { bubbles: true })); }, k, v); clicks++;
    for (let i = 0; i < 7; i++) { await p.evaluate(i => document.querySelectorAll('#lab-aps .ap')[i].click(), i); }
  }
  await bad('lab selects');
  for (const [id, vals] of [['lab-w', [10, 999, 1001, 5000]], ['lab-s', [1, 2, 10]], ['lab-md', [4, 7, 9]], ['lab-rr', [1, 50]]]) for (const v of vals) await setRange(id, v);
  await p.evaluate(() => document.querySelector('#lab-presets button[data-p=st]').click());
  await p.evaluate(() => { const s = document.querySelector('#lab-keys select[data-k=gsi2]'); s.value = 'on'; s.dispatchEvent(new Event('change', { bubbles: true })); });
  await setRange('lab-md', 9); await shot('#lab-top', 'lab-hot'); await bad('lab sliders');
  // further reading
  await p.click('button[data-t=t-more]'); await sleep(150); clicks++;
  await bad('more');
  const links = await p.$$eval('#t-more a[href^=http]', es => es.filter(a => a.target !== '_blank').length);
  if (links) { problems++; console.log('PROBLEM links without target _blank', links); }
  await p.close();
}
await b.close();
fs.writeFileSync(path.resolve(here, 'page_numbers.json'), JSON.stringify(pageNums, null, 1));
console.log('clicks', clicks, 'problems', problems);
