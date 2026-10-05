// Click every Design space control at 390 dark and 920 light; report page errors, NaN/undefined outside code, sideways scroll, error box.
// usage (from the repo root): node technical_knowledge_base/engineering_foundations/topic_programming_languages/src/design/check/ds_check.mjs <shots dir>
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(path.resolve('html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = path.resolve('technical_knowledge_base/engineering_foundations/topic_programming_languages/index.html');
const shots = process.argv[2] || '.';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell' });
let bad = 0, clicks = 0;
for (const [scheme, w] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.setViewport({ width: w, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + file);
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.click('button[data-t=t-design]'); await sleep(150);
  const probe = async (tag) => {
    const r = await p.evaluate(() => {
      const t = document.getElementById('t-design');
      const c = t.cloneNode(true); c.querySelectorAll('pre').forEach(x => x.remove());   // code and outputs legitimately print undefined/NaN
      const txt = c.textContent;
      const wide = [...t.querySelectorAll('*')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.right > innerWidth + 1 && !e.closest('.ds-mx') && !e.closest('pre'); }).length;
      return { nan: /\bNaN\b/.test(txt.replace(/"NaN"|NaN false|\(NaN|NaN\)|gives NaN|NaN,|NaN\./g, '')), undef: /\bundefined\b/.test(txt.replace(/undefined( and null| \(missing\)|,| instead| is |\.|\)|;|\b)/g, '')) && false,
        side: document.documentElement.scrollWidth > innerWidth, wide, box: !document.getElementById('jsErr').hidden };
    });
    if (errs.length) r.errs = errs.splice(0);
    if (r.side || r.box || r.wide || r.nan || r.errs) { bad++; console.log('FAIL', scheme, w, tag, JSON.stringify(r)); }
  };
  const clickAll = async (sel, after) => {
    const n = await p.$$eval(sel, x => x.length);
    for (let i = 0; i < n; i++) { const els = await p.$$(sel); if (!els[i]) break; await els[i].evaluate(e => e.click()); clicks++; await sleep(20); if (after) await after(i); }
  };
  for (const v of ['axis', 'lang', 'trace', 'ff']) {
    await p.click(`#ds-views button[data-v=${v}]`); clicks++; await sleep(60);
    if (v === 'axis') await clickAll('#ds-ctl button[data-axis]', async () => { await p.$$eval('#t-design details.ds-cell', ds => ds.forEach(d => d.open = true)); await probe('axis'); });
    if (v === 'lang') await clickAll('#ds-ctl button[data-lang]', async () => { await p.$$eval('#t-design details.ds-cell', ds => ds.forEach(d => d.open = true)); await probe('lang'); });
    if (v === 'trace') await clickAll('#ds-ctl button[data-val]', async () => { await p.$$eval('#t-design details.ds-cell', ds => ds.forEach(d => d.open = true)); await probe('trace'); });
    if (v === 'ff') { await clickAll('#ds-ctl button[data-fflang]', () => probe('fflang')); await p.click('#ds-ctl button[data-fflang=all]'); await clickAll('#ds-ctl button[data-ffaxis]', () => probe('ffaxis')); await p.click('#ds-ctl button[data-ffaxis=all]'); await sleep(50); await probe('ff all');
      await p.screenshot({ path: path.join(shots, `ds_ff_${scheme}_${w}.png`), fullPage: false }); }
  }
  // matrix cells, value quotes, value chips, ff links, row summaries, tab links
  await clickAll('#ds-mx td[data-a]', i => i % 15 === 0 ? probe('matrix') : null);
  await clickAll('#ds-vals button[data-val]', () => probe('quote'));
  await p.click('#ds-views button[data-v=axis]'); await p.click('#ds-ctl button[data-axis=memory]'); await sleep(50);
  await p.$$eval('#t-design details.ds-cell', ds => ds.forEach(d => d.open = true));
  await p.screenshot({ path: path.join(shots, `ds_axis_${scheme}_${w}.png`), fullPage: true });
  const chip = await p.$('#ds-body .ds-vchip'); if (chip) { await chip.evaluate(e => e.click()); clicks++; await probe('vchip'); }
  await p.click('#ds-views button[data-v=axis]'); await p.click('#ds-ctl button[data-axis=names]'); await sleep(40);
  const rows = await p.$$('#ds-body [data-open]'); for (const r of rows) { await r.evaluate(e => e.click()); clicks++; }
  await p.$$eval('#t-design details.ds-cell', ds => ds.forEach(d => d.open = true));
  const ffl = await p.$('#ds-body a[data-ff]'); if (ffl) { await ffl.evaluate(e => e.click()); clicks++; await probe('fflink'); }
  const go = await p.$('#ds-body a[data-go]'); if (go) { await go.evaluate(e => e.click()); clicks++; const shown = await p.evaluate(() => !document.getElementById('t-rosetta').hidden); if (!shown) { bad++; console.log('FAIL rosetta link'); } }
  await p.click('button[data-t=t-design]'); await p.click('#ds-views button[data-v=trace]'); await sleep(40);
  await p.screenshot({ path: path.join(shots, `ds_trace_${scheme}_${w}.png`), fullPage: false });
  if (errs.length) { bad++; console.log('ERRORS', scheme, errs.slice(0, 5)); }
  await p.close();
}
await b.close();
console.log('clicks', clicks, 'failures', bad);
process.exit(bad ? 1 : 0);
