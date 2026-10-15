// Click every control of the Sharding lab (t-shard) at 390 px dark and 920 px light; fail on script errors, on "NaN",
// "undefined" or "null" in the tab's text, on sideways page scroll, and on any network request. Screenshots to the folder given.
// usage: node src/shard/check_tab.mjs <page index.html> <screenshot folder>
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const require = createRequire(path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const [file, outdir] = process.argv.slice(2);
fs.mkdirSync(outdir, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell' });
let bad = 0;
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage();
  const errs = [], net = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  p.on('request', r => { if (!r.url().startsWith('file:') && !r.url().startsWith('data:')) net.push(r.url()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + path.resolve(file));
  await p.click('button[data-t=t-shard]');
  await sleep(600);
  const problems = [];
  const check = async (what) => {
    const r = await p.evaluate(() => {
      const t = document.getElementById('t-shard').innerText;
      const side = document.documentElement.scrollWidth > innerWidth;
      const svgs = [...document.querySelectorAll('#t-shard svg')].filter(s => s.getBoundingClientRect().width > 0 && s.getBoundingClientRect().right > innerWidth + 1).length;
      return { nan: /\bNaN\b/.test(t), und: /\bundefined\b|\bnull\b/.test(t), side, svgs, err: (d => d && !d.hidden ? d.textContent : '')(document.getElementById('jsErr')) };
    });
    if (r.nan || r.und || r.side || r.svgs || r.err) problems.push(what + ' ' + JSON.stringify(r));
  };
  const clickAll = async (sel, what) => {
    const n = await p.$$eval(sel, bs => bs.length);
    for (let i = 0; i < n; i++) { await p.evaluate((s, i) => document.querySelectorAll(s)[i].click(), sel, i); await check(what + ' ' + i); }
    return n;
  };
  const range = async (id, what) => {
    const [mn, mx] = await p.$eval('#' + id, s => [+s.min, +s.max]);
    for (let v = mn; v <= mx; v++) { await p.evaluate((id, v) => { const s = document.getElementById(id); s.value = v; s.dispatchEvent(new Event('input')) }, id, v); await check(what + ' ' + v) }
    return mx - mn + 1;
  };
  await check('initial');
  const counts = {};
  // section 1: every spec, every step
  const nspec = await p.$$eval('#sh-tile-spec button', x => x.length);
  counts.tile = 0;
  for (let i = 0; i < nspec; i++) { await p.evaluate(i => document.querySelectorAll('#sh-tile-spec button')[i].click(), i); counts.tile += await range('sh-tile-ctl-s', 'tile ' + i) }
  counts.tileBtns = await clickAll('#sh-tile-ctl button', 'tile btn');
  // section 2: all 108 combinations
  const nx = await p.$$eval('#sh-pg-x button', x => x.length), nw = await p.$$eval('#sh-pg-w button', x => x.length), no = await p.$$eval('#sh-pg-o button', x => x.length);
  counts.pg = 0;
  for (let i = 0; i < nx; i++) for (let j = 0; j < nw; j++) for (let k = 0; k < no; k++) {
    await p.evaluate((i, j, k) => { document.querySelectorAll('#sh-pg-x button')[i].click(); document.querySelectorAll('#sh-pg-w button')[j].click(); document.querySelectorAll('#sh-pg-o button')[k].click() }, i, j, k);
    const ok = await p.$eval('#sh-pg-cap', c => c.textContent.length > 20); if (!ok) problems.push('pg empty ' + [i, j, k]);
    await check('pg ' + [i, j, k]); counts.pg++;
  }
  // drill: answer every case
  counts.drill = 0;
  for (let c = 0; c < 6; c++) { await p.evaluate(() => document.querySelector('#sh-dr-opts button').click()); await check('drill ' + c); await p.evaluate(() => document.getElementById('sh-dr-next').click()); counts.drill++ }
  // section 3: every kind x n x naive, every step
  const nk = await p.$$eval('#sh-ring-k button', x => x.length); counts.ring = 0;
  for (let k = 0; k < nk; k++) {
    await p.evaluate(k => document.querySelectorAll('#sh-ring-k button')[k].click(), k);
    for (const n of [2, 3, 5, 8]) {
      await p.evaluate(n => { const s = document.getElementById('sh-ring-n'); s.value = n; s.dispatchEvent(new Event('input')) }, n);
      counts.ring += await range('sh-ring-ctl-s', 'ring ' + k + ' n' + n);
      if (k === 0) { await p.evaluate(() => document.getElementById('sh-ring-naive').click()); counts.ring += await range('sh-ring-ctl-s', 'naive n' + n); await p.evaluate(() => document.getElementById('sh-ring-naive').click()) }
    }
  }
  counts.ringBtns = await clickAll('#sh-ring-ctl button', 'ring btn');
  // section 4: rows and chart modes
  counts.rows = await clickAll('#sh-st-t tr[data-id]', 'strategy');
  counts.mode = await clickAll('#sh-st-m button', 'mode');
  counts.mist = await clickAll('#t-shard details.mist summary', 'details');
  await p.evaluate(() => document.querySelector('#sh-ring-k button').click());
  await p.evaluate(() => { const s = document.getElementById('sh-ring-n'); s.value = 8; s.dispatchEvent(new Event('input')) });
  await p.evaluate(() => { document.querySelectorAll('#sh-st-t tr[data-id]')[4].click(); document.querySelectorAll('#sh-pg-x button')[3].click(); document.querySelectorAll('#sh-pg-w button')[2].click(); document.querySelectorAll('#sh-pg-o button')[0].click(); const s = document.getElementById('sh-tile-ctl-s'); s.value = 2; s.dispatchEvent(new Event('input')); const r = document.getElementById('sh-ring-ctl-s'); r.value = 5; r.dispatchEvent(new Event('input')) });
  await sleep(1000);
  console.log('visible tab', await p.evaluate(() => [...document.querySelectorAll('.tab')].filter(t => !t.hidden).map(t => t.id).join(',')));
  await p.evaluate(() => document.querySelector('button[data-t=t-shard]').click());
  for (const id of ['sh-s1', 'sh-s2', 'sh-s3', 'sh-s4', 'sh-s5', 'sh-s8']) {
    const el = await p.$('#' + id); await el.screenshot({ path: path.join(outdir, `${id}_${width}_${scheme}.png`) });
  }
  if (errs.length) problems.push('errors ' + errs.join(' | '));
  if (net.length) problems.push('network ' + net.join(' '));
  console.log(width, scheme, JSON.stringify(counts), problems.length ? 'PROBLEMS' : 'ok');
  problems.slice(0, 15).forEach(x => console.log('  ', x));
  bad += problems.length;
  await p.close();
}
await b.close();
console.log(bad ? 'FAIL ' + bad : 'PASS');
process.exit(bad ? 1 : 0);
