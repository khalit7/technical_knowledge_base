// Clicks every control on every tab at 390 dark and 920 light; reports errors, NaN/undefined text, sideways scroll; screenshots each visual.
// Run from the repo root: node technical_knowledge_base/engineering_foundations/topic_swe_and_system_design/reliability_engineering/src/check_ui.mjs <shots dir>
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
let problems = 0;
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
      const t = document.body.innerText; const m = t.match(/.{0,40}(NaN|undefined|Infinity).{0,40}/);
      const box = document.getElementById('jsErr');
      return { m: m ? m[0] : '', side: document.documentElement.scrollWidth > innerWidth + 1, box: box && !box.hidden ? box.textContent : '' };
    });
    if (r.m || r.side || r.box) { problems++; console.log(scheme, width, label, JSON.stringify(r)) }
  };
  const shot = async (sel, name) => { const el = await p.$(sel); if (el) { await el.scrollIntoView(); await sleep(150); await el.screenshot({ path: path.join(out, `${name}-${scheme}-${width}.png`) }) } };
  // Reading
  for (const sel of ['#rd-ms-seg button', '#rd-ms-seed button']) {
    const n = await p.$$eval(sel, x => x.length);
    for (let i = 0; i < n; i++) { await p.evaluate((s, i) => document.querySelectorAll(s)[i].click(), sel, i); await sleep(30); await bad('meas ' + sel + i) }
  }
  await p.evaluate(() => document.querySelectorAll('#rd-ms-seg button')[1].click());
  await shot('#rd-ms-card', 'meas');
  for (const m of ['before', 'after']) {
    await p.evaluate(m => document.querySelector('#rd-ba-seg button[data-m=' + m + ']').click(), m);
    const n = await p.$eval('#rd-ba-ctl input[type=range]', x => +x.max + 1);
    for (let i = 0; i < n; i++) { await p.evaluate(() => document.getElementById('rd-ba-ctl-f').click()); await bad('ba ' + m + i) }
    await p.evaluate(() => { document.getElementById('rd-ba-ctl-b').click(); document.getElementById('rd-ba-ctl-p').click(); document.getElementById('rd-ba-ctl-p').click(); const s = document.getElementById('rd-ba-ctl-v'); s.value = '2'; s.dispatchEvent(new Event('change')) });
    for (const step of [5, 14]) { await p.evaluate(v => { const s = document.getElementById('rd-ba-ctl-s'); s.value = v; s.dispatchEvent(new Event('input')) }, step); await shot('#rd-ba-card', `ba-${m}-${step}`) }
  }
  await shot('#rd-rl-card', 'rl');
  await shot('#rd-nines', 'nines'); await shot('#rd-burn', 'burn'); await shot('#rd-ms-tab', 'mstab');
  await bad('read');
  // Lab
  await p.click('button[data-t=t-lab]'); await sleep(200);
  const pres = await p.$$eval('#lab-pre button', x => x.length);
  for (let i = 0; i < pres; i++) { await p.evaluate(i => document.querySelectorAll('#lab-pre button')[i].click(), i); await sleep(60); await bad('lab preset ' + i) }
  const ranges = await p.$$eval('#lab-ctl input[type=range]', x => x.map(e => e.id));
  for (const id of ranges) {
    for (const where of ['min', 'max']) {
      await p.evaluate((id, w) => { const e = document.getElementById(id); e.value = e[w]; e.dispatchEvent(new Event('input')) }, id, where);
      await sleep(170); await bad('lab ' + id + ' ' + where);
    }
    await p.evaluate(() => document.querySelectorAll('#lab-pre button')[7].click()); await sleep(60);
  }
  const boxes = await p.$$eval('#lab-ctl input[type=checkbox]', x => x.map(e => e.id));
  for (const id of boxes) { await p.click('#' + id); await sleep(80); await bad('lab ' + id); await p.click('#' + id); await sleep(80) }
  await p.select('#lab-seed', '5'); await sleep(80); await bad('lab seed');
  await p.evaluate(() => document.querySelectorAll('#lab-pre button')[1].click()); await sleep(80);
  await shot('#t-lab', 'lab-naive');
  await p.evaluate(() => document.querySelectorAll('#lab-pre button')[7].click()); await sleep(80);
  await shot('#t-lab .card', 'lab-after');
  // SLO
  await p.click('button[data-t=t-slo]'); await sleep(200);
  const sp = await p.$$eval('#slo-pre button', x => x.length);
  for (let i = 0; i < sp; i++) { await p.evaluate(i => document.querySelectorAll('#slo-pre button')[i].click(), i); await sleep(150); await bad('slo preset ' + i); await shot('#t-slo', 'slo-' + i) }
  for (const v of ['0.99', '0.995', '0.9995', '0.9999', '0.999']) { await p.select('#slo-slo', v); await sleep(150); await bad('slo ' + v) }
  for (const id of ['slo-rpd', 'slo-e0', 'slo-e', 'slo-d']) for (const w of ['min', 'max']) {
    await p.evaluate((id, w) => { const e = document.getElementById(id); e.value = e[w]; e.dispatchEvent(new Event('input')) }, id, w); await sleep(150); await bad('slo ' + id + w)
  }
  await p.click('button[data-t=t-more]'); await sleep(100); await bad('more');
  if (errs.length) { problems++; console.log(scheme, width, 'errors', errs) }
  await p.close();
}
await b.close();
console.log('problems', problems);
