// Click every control of the Price list tab at 390 px dark and 920 px light.
// Fails on console or page errors, "NaN" or "undefined" in the tab's text, sideways page scroll, or an empty chart.
// usage: node src/price/check_price.mjs [out dir for screenshots]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const page = path.resolve(here, '../../index.html');
const out = process.argv[2] || path.resolve(here, '../../.shots');
fs.mkdirSync(out, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let bad = 0, clicks = 0;

const b = await puppeteer.launch({ headless: 'shell', args: process.platform === 'linux' ? ['--no-sandbox'] : [] });
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + page);
  await p.click('button[data-t=t-price]');
  await sleep(300);
  const tag = scheme + '-' + width;
  async function check(what) {
    const r = await p.evaluate(() => {
      const t = document.getElementById('t-price');
      const txt = t.innerText;
      return { nan: /\bNaN\b/.test(txt), undef: /\bundefined\b/.test(txt), side: document.documentElement.scrollWidth > innerWidth,
        rows: t.querySelectorAll('.pl-row').length, trows: t.querySelectorAll('.pl-tbl tr.r').length, err: (document.getElementById('jsErr') || {}).hidden === false };
    });
    const fails = [];
    if (r.nan) fails.push('NaN'); if (r.undef) fails.push('undefined'); if (r.side) fails.push('sideways scroll'); if (r.err) fails.push('error box');
    if (errs.length) fails.push('errors ' + JSON.stringify(errs.splice(0)));
    if (fails.length) { bad++; console.log('FAIL', tag, what, fails.join('; ')) }
    return r;
  }
  async function clickAll(sel, what, wait = 60) {
    const n = (await p.$$(sel)).length;
    for (let i = 0; i < n; i++) {
      const els = await p.$$(sel); if (!els[i]) continue;
      await els[i].evaluate(e => e.scrollIntoView({ block: 'center' }));
      await els[i].click(); clicks++; await sleep(wait); await check(what + ' #' + i);
    }
    return n;
  }
  const shot = async (sel, name) => { const el = await p.$(sel); if (el) await el.screenshot({ path: path.join(out, 'price-' + name + '-' + tag + '.png') }) };
  await check('load');
  await shot('#t-price', 'tab');
  // units and views, rows and marks in every unit
  for (const u of ['usd', 'gpuh', 'flop']) {
    await p.click('#pl-unit button[data-u=' + u + ']'); clicks++; await sleep(80);
    const r = await check('unit ' + u);
    if (!r.rows) { bad++; console.log('FAIL', tag, 'no rows for', u) }
    await clickAll('#pl-chart .pl-row', 'row ' + u, 30);
    await clickAll('#pl-chart .pl-mk', 'mark ' + u, 30);
    if (u === 'usd') { await p.click('#pl-chart .pl-row[data-id=thomson]'); await sleep(80); await shot('#pl-chart', 'card-thomson') }
    await p.click('#pl-split'); clicks++; await sleep(60); await check('split ' + u);
    await clickAll('#pl-chart .pl-row', 'split row ' + u, 30);
    await p.click('#pl-split'); await sleep(60);
    await p.click('#pl-est'); clicks++; await sleep(60); await check('no estimates ' + u);
    await p.click('#pl-est'); await sleep(60);
    await clickAll('#pl-stages button', 'stage chip off ' + u);
    await check('all stages off ' + u);
    await clickAll('#pl-stages button', 'stage chip on ' + u);
    for (const v of ['any', 'runonly', 'prior', 'exp', 'data', 'staff', 'unclear']) { await p.select('#pl-inc', v); clicks++; await sleep(60); await check('includes ' + v + ' ' + u) }
    await p.select('#pl-inc', 'any');
    await p.click('#pl-view button[data-v=table]'); clicks++; await sleep(80);
    const t = await check('table ' + u);
    if (!t.trows) { bad++; console.log('FAIL', tag, 'empty table', u) }
    await clickAll('#pl-table th button', 'sort ' + u);
    await clickAll('#pl-table th button', 'sort again ' + u);
    await clickAll('#pl-table tr.r', 'table row ' + u, 30);
    if (u === 'usd') await shot('#pl-table', 'table');
    await p.click('#pl-view button[data-v=chart]'); await sleep(60);
  }
  await p.click('#pl-unit button[data-u=usd]'); await sleep(60);
  // same stage, different budgets
  const nst = (await p.$$('#pl-cstage button')).length;
  for (let i = 0; i < nst; i++) {
    const bs = await p.$$('#pl-cstage button'); await bs[i].click(); clicks++; await sleep(80); await check('compare stage ' + i);
    for (const s of ['#pl-ca', '#pl-cb']) {
      const vals = await p.$$eval(s + ' option', o => o.map(x => x.value));
      for (const v of vals) { await p.select(s, v); clicks++; await sleep(30); await check('pick ' + s + ' ' + v) }
    }
  }
  const rl = await p.$$('#pl-cstage button'); await rl[2].click(); await sleep(80);
  await p.$eval('#pl-zoom', e => e.scrollIntoView({ block: 'start' }));
  await p.click('#pl-zplay'); clicks++; await sleep(2300); await check('zoom mid');
  await shot('#pl-zoom', 'zoom-mid'); await shot('#pl-cmp', 'cmp');
  await sleep(3500); await check('zoom end'); await shot('#pl-zoom', 'zoom-end');
  await p.$eval('#pl-zs', e => { e.value = 500; e.dispatchEvent(new Event('input')) }); clicks++; await check('zoom slider');
  // what a headline leaves out
  const ng = (await p.$$('#pl-gsub button')).length;
  for (let i = 0; i < ng; i++) {
    const bs = await p.$$('#pl-gsub button'); await bs[i].click(); clicks++; await sleep(80); await check('grow subject ' + i);
    for (let k = 0; k < 6; k++) { await p.click('#pl-gnext').catch(() => {}); clicks++; await sleep(40); await check('grow next') }
    for (let k = 0; k < 6; k++) { await p.click('#pl-gprev').catch(() => {}); clicks++; await sleep(40); await check('grow prev') }
  }
  const g0 = await p.$$('#pl-gsub button'); await g0[0].click(); await sleep(80);
  await p.$eval('#pl-gsub', e => e.scrollIntoView({ block: 'start' }));
  await p.click('#pl-gplay'); clicks++; await sleep(2300); await check('grow mid');
  await shot('#pl-grow', 'grow-mid');
  await sleep(6000); await check('grow end'); await shot('#pl-grow', 'grow-end'); await shot('#pl-gsteps', 'grow-steps');
  await p.click('#t-price details.mist summary'); clicks++; await sleep(60); await check('checks open');
  await shot('#t-price', 'tab-end');
  await p.close();
}
await b.close();
console.log('clicks', clicks, 'failures', bad);
process.exit(bad ? 1 : 0);
