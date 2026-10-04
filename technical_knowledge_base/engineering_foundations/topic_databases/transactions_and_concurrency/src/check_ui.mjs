// Clicks every control on every tab at 390 dark and 920 light; reports errors, NaN/undefined text, sideways scroll; screenshots each section and visual.
// Run from the repo root: node technical_knowledge_base/engineering_foundations/topic_databases/transactions_and_concurrency/src/check_ui.mjs [shots dir]
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
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + file);
  await sleep(300);
  const bad = async label => {
    const r = await p.evaluate(() => {
      const t = document.body.innerText; const m = t.match(/.{0,40}(NaN|undefined|Infinity|\[object).{0,40}/);
      const box = document.getElementById('jsErr');
      return { m: m ? m[0] : '', side: document.documentElement.scrollWidth > innerWidth + 1, box: box && !box.hidden ? box.textContent : '' };
    });
    if (r.m || r.side || r.box || errs.length) { problems++; console.log('PROBLEM', scheme, width, label, JSON.stringify(r), errs.splice(0)); }
  };
  const clickAll = async (sel, after) => {
    const n = await p.$$eval(sel, es => es.length);
    for (let i = 0; i < n; i++) {
      await p.evaluate((s, i) => document.querySelectorAll(s)[i].click(), sel, i); clicks++;
      await sleep(30); if (after) await after(i);
    }
    return n;
  };
  await p.click('button[data-t=t-read]'); await sleep(200);
  // sections as screenshots
  const secs = await p.$$eval('#t-read section', es => es.map(e => e.id));
  for (const id of secs) { const el = await p.$('#' + id); await el.screenshot({ path: `${out}/${id}-${scheme}-${width}.png` }); }
  // anomaly cards: every chip
  const nchips = await clickAll('#t-read .anx button.ch');
  await bad('anomaly chips ' + nchips);
  // mvcc animation: every mode, every step
  for (const m of ['naive', 'for_update', 'serializable']) {
    await p.evaluate(m => document.querySelector(`#rd-mv-mode button[data-m=${m}]`).click(), m); clicks++;
    const n = await p.$eval('#rd-mv-ctl-s', e => +e.max + 1);
    for (let i = 0; i < n; i++) {
      await p.evaluate(i => { const s = document.getElementById('rd-mv-ctl-s'); s.value = i; s.dispatchEvent(new Event('input')); }, i); clicks++;
      if (i === n - 1) { const el = await p.$('#rd-mv-card'); await el.screenshot({ path: `${out}/mvcc-${m}-end-${scheme}-${width}.png` }); }
      if (i === 3 && m === 'for_update') { const el = await p.$('#rd-mv-card'); await el.screenshot({ path: `${out}/mvcc-${m}-3-${scheme}-${width}.png` }); }
    }
    await bad('mvcc ' + m);
  }
  await clickAll('#rd-mv-ctl button'); await clickAll('#rd-mv-ctl button');
  // segmented controls of the measured visuals
  for (const seg of ['#rd-jobs-mode', '#rd-lq-mode', '#rd-dl-mode', '#rd-bench-pool', '#rd-bench-met']) {
    await clickAll(seg + ' button', async i => { if (seg === '#rd-bench-met') { const el = await p.$('#rd-bench'); await el.screenshot({ path: `${out}/bench-${i}-${scheme}-${width}.png` }); } });
    await bad('seg ' + seg);
  }
  await clickAll('#rd-bench-pool button[data-m=hot]');
  // matrix cell opens the lab
  await p.evaluate(() => document.querySelector('#rd-mx a[data-open]').click()); await sleep(100);
  const onLab = await p.evaluate(() => !document.getElementById('t-lab').hidden);
  if (!onLab) { problems++; console.log('PROBLEM matrix click did not open the lab'); }
  // lab: every scenario, both engines, every level chip, stepped to the end
  const opts = await p.$$eval('#lab-sc option', os => os.map(o => o.value));
  let runs = 0;
  for (const v of opts) {
    for (const eng of ['pg', 'my']) {
      await p.evaluate((v, eng) => { const s = document.getElementById('lab-sc'); s.value = v; s.dispatchEvent(new Event('change'));
        document.querySelector(`#lab-eng button[data-m=${eng}]`).click(); }, v, eng);
      const nl = await p.$$eval('#lab-lev button.ch', es => es.length);
      for (let i = 0; i < Math.max(1, nl); i++) {
        if (nl) await p.evaluate(i => document.querySelectorAll('#lab-lev button.ch')[i].click(), i);
        const n = await p.$eval('#lab-scrub', e => +e.max + 1);
        for (let k = 0; k < n; k++) await p.click('#lab-next');
        const vt = await p.$eval('#lab-verdict', e => e.textContent);
        if (/Step to the end/.test(vt)) { problems++; console.log('PROBLEM lab did not reach the end', v, eng, i); }
        runs++; clicks += n + 1;
      }
      if (v.startsWith('x:')) break;
    }
  }
  await p.click('#lab-first'); await p.click('#lab-play'); await sleep(400); await p.click('#lab-play'); await p.click('#lab-prev');
  const labEl = await p.$('#t-lab'); await labEl.screenshot({ path: `${out}/lab-${scheme}-${width}.png` });
  await bad('lab, ' + runs + ' runs');
  await p.click('button[data-t=t-more]'); await sleep(100); await bad('more');
  await p.close();
}
await b.close();
console.log('clicks', clicks, 'problems', problems);
