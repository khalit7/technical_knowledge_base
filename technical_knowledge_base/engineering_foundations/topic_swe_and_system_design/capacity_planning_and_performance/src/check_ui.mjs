// Clicks every control on every tab at 390 dark and 920 light; reports errors, NaN/undefined text, sideways scroll; screenshots each visual.
// Run from the repo root: node technical_knowledge_base/engineering_foundations/topic_swe_and_system_design/capacity_planning_and_performance/src/check_ui.mjs [shots dir]
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
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + file);
  await sleep(300);
  await p.click('button[data-t=t-read]'); await sleep(200);
  const bad = async label => {
    const r = await p.evaluate(() => {
      const t = document.body.innerText; const m = t.match(/.{0,40}(NaN|undefined|Infinity|null).{0,40}/);
      const box = document.getElementById('jsErr');
      return { m: m ? m[0] : '', side: document.documentElement.scrollWidth > innerWidth + 1, box: box && !box.hidden ? box.textContent : '' };
    });
    if (r.m || r.side || r.box) { problems++; console.log(scheme, width, label, JSON.stringify(r)) }
  };
  const shot = async (sel, name) => { const el = await p.$(sel); if (el) { await el.scrollIntoView(); await sleep(200); await el.screenshot({ path: path.join(out, `${name}-${scheme}-${width}.png`) }) } };
  const clickAll = async (sel, label, wait = 40) => {
    const n = await p.$$eval(sel, x => x.length);
    for (let i = 0; i < n; i++) { await p.evaluate((s, i) => document.querySelectorAll(s)[i].click(), sel, i); clicks++; await sleep(wait); await bad(label + ' ' + i) }
  };
  const slide = async (id, vals) => {
    for (const v of vals) { await p.evaluate((id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })) }, id, v); clicks++; await sleep(30); await bad(id + '=' + v) }
  };
  // Reading widgets
  await slide('fo-p', [0, 1, 2, 3, 4, 5, 3]); await slide('fo-n', [0, 300, 606, 1000, 606]); await shot('#fo-card', 'fanout');
  await shot('#q-mult', 'qmult');
  await clickAll('#mh-seg button', 'mh'); await p.evaluate(() => document.querySelector('#mh-seg button').click()); await shot('#mh-card', 'hockey');
  await slide('hx-c', [0, 1, 2, 3, 4, 5, 0]); await slide('hx-s', [0, 1, 2, 3, 4, 5, 6, 2]); await slide('hx-ms', [1, 50, 200, 11]); await shot('#hx-card', 'explorer');
  await shot('#sm-table', 'supermarket');
  // LB animation: each policy, step through
  for (let i = 0; i < 4; i++) {
    await p.evaluate(i => document.querySelectorAll('#la-seg button')[i].click(), i); clicks++;
    await p.evaluate(() => { const s = document.getElementById('la-ctl-s'); s.value = 40; s.dispatchEvent(new Event('input')) }); await sleep(60); await bad('la ' + i);
    await p.evaluate(() => { const s = document.getElementById('la-ctl-s'); s.value = 80; s.dispatchEvent(new Event('input')) }); await sleep(60); await bad('la end ' + i);
    if (i === 0 || i === 2) await shot('#la-card', 'lbanim' + i);
  }
  await clickAll('#la-ctl button', 'la ctl', 80); await p.evaluate(() => { const b = document.getElementById('la-ctl-p'); if (b.textContent.includes('Pause')) b.click() });
  await shot('#lbm-table', 'lbmeas');
  await slide('hr-l', [100, 20000, 1000]); await slide('hr-h', [0, 990, 1000, 900]); await slide('hr-c', [100, 20000, 600]); await shot('#hr-card', 'hitrate');
  for (let i = 0; i < 3; i++) {
    await p.evaluate(i => document.querySelectorAll('#sa-seg button')[i].click(), i); clicks++;
    for (const v of [5, 20, 26, 40]) { await p.evaluate(v => { const s = document.getElementById('sa-ctl-s'); s.value = v; s.dispatchEvent(new Event('input')) }, v); await sleep(50); await bad('sa ' + i + ' ' + v) }
    await p.evaluate(() => { const s = document.getElementById('sa-ctl-s'); s.value = 26; s.dispatchEvent(new Event('input')) }); await shot('#sa-card', 'stampede' + i);
  }
  await p.evaluate(() => { const b = document.getElementById('sa-ctl-p'); if (b.textContent.includes('Pause')) b.click() });
  await shot('#pool-table', 'pool'); await shot('#gil-table', 'gil');
  await clickAll('#co-seg button', 'co'); await p.evaluate(() => document.querySelector('#co-seg button').click()); await shot('#co-card', 'co');
  await shot('#pk-card', 'peaks');
  await clickAll('#pl-pre button', 'plan'); await slide('pl-a', [50, 20000, 579]); await slide('pl-g', [0, 50, 0]); await slide('pl-m', [0, 24, 0]); await slide('pl-p', [10, 50, 20]); await slide('pl-u', [30, 100, 60]); await slide('pl-k', [0, 3, 1]); await shot('#pl-card', 'planner');
  await clickAll('.mist summary', 'mist', 10);
  // Lab
  await p.click('button[data-t=t-lab]'); await sleep(200);
  const waitLab = async () => { for (let k = 0; k < 200; k++) { const t = await p.$eval('#lab-busy', e => e.textContent); if (!t) break; await sleep(100) } await sleep(100) };
  await waitLab(); await bad('lab default'); await shot('#lab-top', 'lab');
  const pres = await p.$$eval('#lab-pre button', x => x.length);
  for (let i = 0; i < pres; i++) { await p.evaluate(i => document.querySelectorAll('#lab-pre button')[i].click(), i); clicks++; await waitLab(); await bad('lab preset ' + i); if (i === 1 || i === 4) await shot('#lab-chart', 'labpre' + i) }
  await clickAll('#lab-q button', 'lab q', 60);
  await clickAll('#lab-pol input', 'lab pol', 60); await clickAll('#lab-pol input', 'lab pol back', 60);
  for (const v of ['const', 'ln2', 'ln4', 'exp']) { await p.select('#lab-d', v); clicks++; await waitLab(); await bad('lab d ' + v) }
  await p.select('#lab-N', '5000'); await waitLab(); await bad('lab N'); await p.select('#lab-seed', '4'); await waitLab(); await bad('lab seed');
  await slide('lab-u', [10, 98, 55, 90]); await slide('lab-s', [1, 200, 22]); await slide('lab-n', [1, 32, 8]); await waitLab(); await bad('lab n');
  await p.click('#lab-slow'); await waitLab(); await bad('lab slow'); await p.click('#lab-th'); await sleep(50); await bad('lab th');
  // Further reading
  await p.click('button[data-t=t-more]'); await sleep(150); await bad('more');
  if (errs.length) { problems += errs.length; console.log(scheme, width, 'ERRORS', errs) }
  await p.close();
}
await b.close();
console.log(`clicks ${clicks}, problems ${problems}`);
process.exit(problems ? 1 : 0);
