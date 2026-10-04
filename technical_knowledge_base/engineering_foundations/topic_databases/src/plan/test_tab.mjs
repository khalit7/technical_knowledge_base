// Click every control of the Query plans tab at 390 dark and 920 light; report errors, NaN/undefined text, sideways scroll; screenshot each case.
// Run from html_utils (so puppeteer resolves): node ../technical_knowledge_base/engineering_foundations/topic_databases/src/plan/test_tab.mjs <index.html> <shots dir>
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(path.resolve('package.json'));
const puppeteer = require('puppeteer');
const [file, outDir = '.'] = process.argv.slice(2);
const b = await puppeteer.launch({ headless: 'shell' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let bad = 0;
for (const [scheme, w] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width: w, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + path.resolve(file));
  await p.click('button[data-t=t-plan]'); await sleep(300);
  const check = async tag => {
    const r = await p.evaluate(() => {
      const t = document.getElementById('t-plan').innerText;
      const ui=t.search(/\bundefined\b|\bNaN\b/);return { snip: ui>=0?t.slice(Math.max(0,ui-160),ui+20):'', nan: /\bNaN\b/.test(t), und: /\bundefined\b/.test(t), q: /\?\s*(rows|pages)/.test(t), sw: document.documentElement.scrollWidth > innerWidth,
        err: (d => d && !d.hidden ? d.textContent : '')(document.getElementById('jsErr')) };
    });
    if (r.nan || r.und || r.sw || r.err || r.q) { bad++; console.log('BAD', scheme, w, tag, JSON.stringify(r)) }
  };
  const nc = await p.$$eval('#qp-cases button', bs => bs.length);
  for (let c = 0; c < nc; c++) {
    await p.click(`#qp-cases button:nth-child(${c + 1})`); await sleep(150);
    const nv = await p.$$eval('#qp-vars button', bs => bs.map(b => b.dataset.k));
    for (const k of nv) {
      await p.click(`#qp-vars button[data-k="${k}"]`); await sleep(120);
      const nn = await p.$$eval('#qp-tree .qp-n', bs => bs.length);
      for (let i = 0; i < nn; i++) { await p.$$eval('#qp-tree .qp-n', (bs, i) => bs[i].click(), i) }
      await p.$$eval('#qp-read li', ls => ls.forEach(l => l.click()));
      await check(`case ${c + 1} ${k}`);
    }
    // animation controls
    for (const a of ['b', 'f', 'p', 'p']) { await p.click(`#qp-actl button[data-a=${a}]`); await sleep(60) }
    await p.$eval('#qp-actl input', el => { el.value = 30; el.dispatchEvent(new Event('input')) });
    await p.$eval('#qp-actl select', el => { el.value = '2'; el.dispatchEvent(new Event('change')) });
    await p.$$eval('#t-plan details', ds => ds.forEach(d => d.open = true));
    await sleep(100); await check(`case ${c + 1} controls`);
    const el = await p.$('#qp-case'); await el.screenshot({ path: path.join(outDir, `qp-c${c + 1}-${scheme}-${w}.png`) });
  }
  const el = await p.$('#t-plan'); await p.click('#qp-cases button:nth-child(1)'); await sleep(100);
  await p.$eval('#qp-env details', d => d.open = true);
  await (await p.$('#qp-env')).screenshot({ path: path.join(outDir, `qp-env-${scheme}-${w}.png`) });
  await (await p.$('#qp-claims')).screenshot({ path: path.join(outDir, `qp-claims-${scheme}-${w}.png`) });
  if (errs.length) { bad++; console.log('ERRORS', scheme, w, errs) }
  await p.close();
}
console.log('done bad=' + bad);
await b.close();
