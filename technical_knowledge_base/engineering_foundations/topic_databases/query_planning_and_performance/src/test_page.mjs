// Click every control of the page at 390 dark and 920 light (2026-11-06: the workflow autoplays on view; the plan walk is the Fig. 3 stage); report errors, NaN/undefined, sideways scroll; screenshot key cards.
// Run from html_utils/: node ../technical_knowledge_base/engineering_foundations/topic_databases/query_planning_and_performance/src/test_page.mjs <shots dir>
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(path.resolve('package.json'));
const puppeteer = require('puppeteer');
const page = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'index.html');
const out = process.argv[2] || '/tmp';
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let bad = 0;
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + page); await sleep(400); await p.$eval('button[data-t=t-read]', e => e.click()); await sleep(200);
  const check = async tag => {
    const r = await p.evaluate(() => { const t = [...document.querySelectorAll('.tab')].filter(x => !x.hidden).map(x => x.innerText).join(' ');
      return { nan: /\bNaN\b/.test(t), und: /\bundefined\b/.test(t), side: document.documentElement.scrollWidth > innerWidth, box: !document.getElementById('jsErr').hidden } });
    if (r.nan || r.und || r.side || r.box) { bad++; console.log('PROBLEM', scheme, width, tag, JSON.stringify(r)) } };
  // reading: segments and animation controls
  // autoplay on view (2026-11-06, replaces never-autoplay): the workflow plays once scrolled into view; the 3D stages are checked by check_stages.mjs
  { await p.$eval('#rd-wf-card', e => e.scrollIntoView({ block: 'center' })); await sleep(1500);
    const t = await p.$eval('#rd-wf-ctl-p', e => e.textContent); if (!/Pause/.test(t)) { bad++; console.log('NO AUTOPLAY rd-wf', t) } }
  for (const seg of ['rd-mcv-seg', 'rd-app-seg', 'rd-spill-seg', 'rd-gen-seg', 'rd-wf-mode']) {
    const n = await p.$$eval('#' + seg + ' button', x => x.length);
    for (let i = 0; i < n; i++) { await p.$eval('#' + seg, (e, i) => e.querySelectorAll('button')[i].click(), i); await sleep(80); await check(seg + i) } }
  for (const m of [0, 1]) { await p.$eval('#rd-wf-mode', (e, m) => e.querySelectorAll('button')[m].click(), m);
    for (let i = 0; i < 10; i++) { await p.$eval('#rd-wf-ctl-f', e => e.click()); await sleep(40) } await check('wf' + m);
    for (let i = 0; i < 10; i++) { await p.$eval('#rd-wf-ctl-b', e => e.click()); await sleep(20) } }
  await p.$eval('#rd-wf-mode', e => e.querySelectorAll('button')[0].click());
  for (let i = 0; i < 4; i++) await p.$eval('#rd-wf-ctl-f', e => e.click());
  await p.$eval('#rd-wf-ctl-p', e => e.click()); await sleep(300); await p.$eval('#rd-wf-ctl-p', e => e.click());
  await p.select('#rd-wf-ctl-v', '2');
  for (let i = 0; i < 8; i++) { await p.$eval('#stg-plan-f', e => e.click()); await sleep(30); await check('plan' + i) }
  for (let i = 0; i < 8; i++) await p.$eval('#stg-plan-b', e => e.click());
  // a mode switch replays the other sequence from step 1 (the one exception to stopping for good)
  await p.$eval('#rd-wf-mode', e => e.querySelectorAll('button')[1].click()); await (await p.$('#rd-wf-card')).scrollIntoView(); await sleep(400);
  if (await p.$eval('#sx-wf-hunch', e => e.hidden || e.children.length !== 4)) { bad++; console.log('hunch list not shown') }
  await p.$eval('#rd-wf-mode', e => e.querySelectorAll('button')[0].click());
  for (const id of ['stg-hero', 'rd-err-card', 'rd-join-card', 'stg-plan', 'rd-walk-card', 'rd-page-card', 'rd-wf-card', 'rd-gen-card', 'rd-geqo-card', 'rd-par-card', 'rd-spill-card', 'rd-mcv-card']) { const el = await p.$('#' + id); await el.scrollIntoView(); await el.screenshot({ path: `${out}/${id}-${scheme}-${width}.png` }) }
  // cost model calculator (Reading, section 2; moved from its own tab on 2026-10-24)
  await p.$$eval('#cm-wrap details', ds => ds.forEach(d => d.open = true));
  for (const pre of [0, 1]) {
    await p.$eval('#cm-preset', (e, i) => e.querySelectorAll('button')[i].click(), pre); await sleep(80);
    for (const v of [0, 300, 600, 860, 1000]) { await p.$eval('#cm-n', (e, v) => { e.value = v; e.dispatchEvent(new Event('input')) }, v); await check('cm-n' + v) }
    for (const [id, v] of [['cm-rp', 1.1], ['cm-sp', 0.1], ['cm-cr', 1], ['cm-cr', -1], ['cm-rp', 10]]) { await p.$eval('#' + id, (e, v) => { e.value = v; e.dispatchEvent(new Event('input')) }, v); await check(id + v) }
    for (const [id, v] of [['cm-ct', '0.05'], ['cm-co', '0.0005'], ['cm-ec', '16384'], ['cm-wm', '64']]) { await p.select('#' + id, v); await check(id + v) }
    await p.$eval('#cm-reset', e => e.click()); await check('reset');
    await (await p.$('#cm-wrap')).screenshot({ path: `${out}/cost-${pre}-${scheme}-${width}.png` }) }
  // lab: every exercise, wrong click, right answer, every option
  await p.$eval('button[data-t=t-lab]', e => e.click()); await sleep(200);
  const nx = await p.$$eval('#lb-pick button', x => x.length);
  for (let i = 0; i < nx; i++) {
    await p.$eval('#lb-pick', (e, i) => e.querySelectorAll('button')[i].click(), i); await sleep(60);
    await p.$eval('.lb-plan div', e => e.click()); await check('lab-wrong' + i);
    await p.$eval('#lb-show1', e => e.click()); await sleep(40);
    const no = await p.$$eval('.lb-opts button', x => x.length);
    for (let k = 0; k < no; k++) await p.$eval('.lb-opts', (e, k) => e.querySelectorAll('button')[k].click(), k);
    await check('lab' + i);
    if (i === 0 || i === 2) await (await p.$('#t-lab')).screenshot({ path: `${out}/lab-${i}-${scheme}-${width}.png` });
    const ok = await p.$$eval('.lb-plan div.ans', x => x.length); if (!ok) { bad++; console.log('NO ANSWER LINE in exercise', i) } }
  await p.$eval('button[data-t=t-more]', e => e.click()); await check('more');
  if (errs.length) { bad++; console.log('ERRORS', scheme, width, errs) }
  await p.close() }
console.log(bad ? 'FAILURES ' + bad : 'all controls OK');
await b.close();
