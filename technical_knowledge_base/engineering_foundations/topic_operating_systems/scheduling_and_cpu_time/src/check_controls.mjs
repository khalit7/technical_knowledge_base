// Click every control of ../index.html at 390 dark and 920 light; report errors, NaN/undefined text and sideways scroll.
// Usage (from this folder): node check_controls.mjs   (puppeteer from html_utils/node_modules)
import { createRequire } from 'module'; import path from 'path';
const require = createRequire(path.resolve('../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve('../index.html'); let bad = 0;
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const b = await puppeteer.launch({ headless: 'shell' }); const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); const wait = ms => new Promise(r => setTimeout(r, ms)); let n = 0;
  const clickAll = async sel => { const els = await p.$$(sel); for (const e of els) { if (await e.evaluate(x => x.offsetParent !== null && !x.disabled)) { await e.evaluate(x => x.click()); n++; await wait(15) } } };
  const sweep = async () => { const t = await p.evaluate(() => document.body.innerText); if (/\bNaN\b|\bundefined\b|Infinity/.test(t)) errs.push('NaN/undefined/Infinity in text'); if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)) errs.push('sideways scroll') };
  for (const tab of ['t-read', 't-fair', 't-budget', 't-more']) {
    await p.click(`button[data-t=${tab}]`); await wait(200);
    await clickAll(`#${tab} .seg button`); await clickAll(`#${tab} .drill .ch button`); await clickAll(`#${tab} details summary`);
    await clickAll(`#${tab} .an-ctl button`); await clickAll(`#${tab} td.v`);
    for (const r of await p.$$(`#${tab} .an-ctl input[type=range]`)) if (await r.evaluate(x => x.offsetParent !== null)) { for (const v of [0, 5, 999]) { await r.evaluate((x, v) => { x.value = Math.min(v, +x.max); x.dispatchEvent(new Event('input')) }, v); n++ } }
    await sweep();
  }
  // stepper edits: every preset, policy, CPU count, horizon; add, edit and remove a thread
  await p.click('button[data-t=t-fair]'); await wait(100);
  for (const m of ['loader', 'nice5', 'three', 'nine', 'burst', 'loader']) { await p.click(`#sc-f-preset button[data-m=${m}]`); for (const q of ['cfs', 'eevdf']) { await p.click(`#sc-f-pol button[data-m=${q}]`); await p.click('#sc-f-ctl button:last-of-type'); n += 2 } }
  for (const c of ['1', '2', '4', '8', '5']) { await p.select('#sc-f-cpus', c); n++ } for (const h of ['20000', '200000', '40000']) { await p.select('#sc-f-hz', h); n++ }
  await p.click('#sc-f-add'); await p.click('#sc-f-add');
  await p.evaluate(() => { const s = document.querySelector('#sc-f-tasks tr[data-i="0"] select[data-k=nice]'); s.value = '-5'; s.dispatchEvent(new Event('change', { bubbles: true }));
    const k = document.querySelector('#sc-f-tasks tr[data-i="2"] input[data-k=slice]'); k.value = '100'; k.dispatchEvent(new Event('change', { bubbles: true }));
    const d = document.querySelector('#sc-f-tasks tr[data-i="3"] select[data-k=kind]'); d.value = 'busy'; d.dispatchEvent(new Event('change', { bubbles: true })) });
  await p.click('#sc-f-tasks button[data-del="1"]'); n += 6; await p.click('#sc-f-pol button[data-m=eevdf]'); await wait(300); await sweep();
  const box = await p.evaluate(() => { const d = document.getElementById('jsErr'); return d && !d.hidden ? d.textContent : '' }); if (box) errs.push('error box: ' + box);
  console.log(scheme, width, 'controls exercised', n, 'errors', JSON.stringify(errs)); if (errs.length) bad++;
  await p.screenshot({ path: `../.shots/controls-${scheme}-${width}.png` }); await b.close();
}
process.exit(bad ? 1 : 0);
