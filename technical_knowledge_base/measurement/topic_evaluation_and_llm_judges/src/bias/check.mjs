// Click every control of the Judge bias lab at 390 px dark and 920 px light; report errors, NaN/undefined, sideways scroll.
// usage (from the repo root): node technical_knowledge_base/measurement/topic_evaluation_and_llm_judges/src/bias/check.mjs [shot dir]
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(path.resolve('html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = path.resolve('technical_knowledge_base/measurement/topic_evaluation_and_llm_judges/index.html');
const out = process.argv[2] || '.';
const b = await puppeteer.launch({ headless: 'shell' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let bad = 0;
for (const [w, scheme] of [[390, 'dark'], [920, 'light']]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width: w, height: 1000 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + file); await p.click('button[data-t=t-bias]'); await sleep(300);
  const txt = async () => p.evaluate(() => document.getElementById('t-bias').innerText);
  const chk = async (label) => {
    const t = await txt(); const sw = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    const hits = (t.match(/NaN|undefined|null%|Infinity/g) || []);
    if (hits.length || sw) { bad++; console.log(w, label, 'BAD', hits, 'sideways', sw) }
  };
  const n = await p.evaluate(() => +document.getElementById('jb-s').max + 1);
  for (let i = 0; i < n; i++) {
    if (i) await p.click('#jb-f'); await sleep(900); await chk('step ' + i);
    if (i === 2 || i === 7 || i === 0) { const e = await p.$('#jb-anim'); await e.screenshot({ path: `${out}/anim_${w}_${i}.png` }) }
  }
  await p.click('#jb-b'); await p.click('#jb-p'); await sleep(200); await p.click('#jb-p');
  await p.select('#jb-v', '2'); await p.evaluate(() => { const s = document.getElementById('jb-s'); s.value = 3; s.dispatchEvent(new Event('input')) }); await chk('scrub');
  for (const id of ['#jb-pv', '#jb-pc', '#jb-pv']) { await p.click(id); await sleep(300); await chk(id) }
  { const e = await p.$('#jb-pad'); await e.screenshot({ path: `${out}/pad_${w}.png` }) }
  for (const k of ['pos', 'len', 'self']) {
    await p.click(`#jb-seg button[data-k=${k}]`); await sleep(200); await chk(k);
    const e = await p.$('#jb-rates'); await e.screenshot({ path: `${out}/rates_${k}_${w}.png` });
  }
  { const e = await p.$('#jb-mit'); await e.screenshot({ path: `${out}/mit_${w}.png` }) }
  const box = await p.evaluate(() => { const d = document.getElementById('jsErr'); return d && !d.hidden ? d.textContent : '' });
  if (box) errs.push('error box: ' + box);
  if (errs.length) { bad++; console.log(w, 'errors', errs) }
  await p.close();
}
console.log('done, bad =', bad);
await b.close();
