// Clicks every control on every tab at 390 dark and 920 light; reports errors, NaN/undefined text, sideways scroll; screenshots each visual.
// Run from the repo root: node technical_knowledge_base/engineering_foundations/topic_swe_and_system_design/queues_streams_and_async_work/src/check_ui.mjs [shots dir]
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
  // Reading: outbox animation, every mode, every step
  for (const m of ['naive', 'first', 'outbox']) {
    await p.evaluate(m => document.querySelector('#rd-ob-seg button[data-m=' + m + ']').click(), m);
    const n = await p.$eval('#rd-ob-ctl input[type=range]', x => +x.max + 1);
    await p.evaluate(() => { const s = document.getElementById('rd-ob-ctl-s'); s.value = 0; s.dispatchEvent(new Event('input')) });
    for (let i = 0; i < n; i++) { await bad('ob ' + m + i); if (i === 2 || i === n - 1) await shot('#rd-ob-card', `ob-${m}-${i}`); await p.evaluate(() => document.getElementById('rd-ob-ctl-f').click()) }
    await p.evaluate(() => { document.getElementById('rd-ob-ctl-b').click(); document.getElementById('rd-ob-ctl-p').click(); document.getElementById('rd-ob-ctl-p').click(); const s = document.getElementById('rd-ob-ctl-v'); s.value = '2'; s.dispatchEvent(new Event('change')) });
  }
  // partitions widget
  for (const [pp, cc] of [[1, 1], [3, 2], [2, 5], [8, 8], [8, 3]]) {
    await p.evaluate((pp, cc) => { const a = document.getElementById('rd-pt-p'), c = document.getElementById('rd-pt-c'); a.value = pp; a.dispatchEvent(new Event('input')); c.value = cc; c.dispatchEvent(new Event('input')) }, pp, cc);
    await sleep(40); await bad('pt ' + pp + 'x' + cc); if (pp === 3 || pp === 8 && cc === 8 || pp === 1) await shot('#rd-pt-card', `pt-${pp}-${cc}`);
  }
  // saga toggle
  for (const m of ['ok', 'fail', 'tpc']) { await p.evaluate(m => document.querySelector('#rd-sg-seg button[data-m=' + m + ']').click(), m); await sleep(30); await bad('saga ' + m); await shot('#rd-sg-card', 'saga-' + m) }
  await shot('#rd-ms-card', 'meas'); await shot('#rd-sk-svg', 'skip'); await shot('#rd-ob-tbl', 'obtbl');
  // mistakes open
  await p.evaluate(() => document.querySelectorAll('details.mist').forEach(d => d.open = true)); await bad('mistakes');
  await bad('read');
  // Lab
  await p.click('button[data-t=t-lab]'); await sleep(200);
  const pres = await p.$$eval('#lab-pre button', x => x.length);
  for (let i = 0; i < pres; i++) { await p.evaluate(i => document.querySelectorAll('#lab-pre button')[i].click(), i); await sleep(60); await bad('lab preset ' + i); if ([0, 1, 4, 7, 9].includes(i)) await shot('#t-lab', 'lab-' + i) }
  const ranges = await p.$$eval('#lab-ctl input[type=range]', x => x.map(e => e.id));
  for (const id of ranges) {
    for (const where of ['min', 'max']) {
      await p.evaluate((id, w) => { const e = document.getElementById(id); e.value = e[w]; e.dispatchEvent(new Event('input')) }, id, where);
      await sleep(40); await bad('lab ' + id + ' ' + where);
    }
    await p.evaluate(() => document.querySelectorAll('#lab-pre button')[0].click()); await sleep(30);
  }
  for (const v of ['backlog', 'rate']) { await p.select('#lab-mode', v); await sleep(40); await bad('lab mode ' + v) }
  for (const v of ['fixed', 'exp']) { await p.select('#lab-dist', v); await sleep(40); await bad('lab dist ' + v) }
  for (const id of ['lab-burst', 'lab-idem']) { await p.click('#' + id); await sleep(60); await bad('lab ' + id); await p.click('#' + id); await sleep(60) }
  // a heavy setting: max rate, long run
  await p.evaluate(() => { for (const [k, v] of [['lab-lam', 100], ['lab-T', 300], ['lab-C', 1]]) { const e = document.getElementById(k); e.value = v; e.dispatchEvent(new Event('input')) } }); await sleep(200); await bad('lab heavy');
  await p.click('button[data-t=t-more]'); await sleep(100); await bad('more'); await shot('#t-more', 'more');
  if (errs.length) { problems++; console.log(scheme, width, 'errors', errs) }
  await p.close();
}
await b.close();
console.log('problems', problems);
