// Exercise every control of ../index.html and fail on page errors or NaN / undefined / Infinity in visible text.
// Run from the repo root: node technical_knowledge_base/models_and_training/topic_llm_training_and_post_training/reward_hacking/src/check_page.mjs
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.join(here, '..', 'index.html');
const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
let bad = 0, actions = 0;
for (const [w, scheme] of [[920, 'light'], [390, 'dark']]) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: 900 });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(file, { waitUntil: 'load' });
  const scan = async (label) => {
    const r = await page.evaluate(() => {
      const t = document.body.innerText;
      const m = t.match(/.{0,40}(NaN|undefined|Infinity).{0,40}/);
      const err = document.getElementById('jsErr');
      return { m: m && m[0], err: err && !err.hidden ? err.textContent : '' };
    });
    if (r.m || r.err) { bad++; console.log('BAD', w, label, r.m || '', r.err); }
  };
  const clickAll = async (sel) => {
    const n = await page.$$eval(sel, els => els.length);
    for (let i = 0; i < n; i++) {
      await page.evaluate((s, i) => { const e = document.querySelectorAll(s)[i]; e && e.click(); }, sel, i);
      actions++; await scan(sel + '#' + i);
    }
    return n;
  };
  const tab = async (t) => { await page.evaluate(t => document.querySelector('#tabs button[data-t="' + t + '"]').click(), t); await scan('tab ' + t); };
  // Reading
  await tab('t-read');
  for (const id of ['bxC', 'trC', 'cmC']) {
    const modes = { trC: '#trM button', cmC: '#cmM button' }[id];
    const nm = modes ? await page.$$eval(modes, e => e.length) : 1;
    for (let m = 0; m < nm; m++) {
      if (modes) await page.evaluate((s, m) => document.querySelectorAll(s)[m].click(), modes, m);
      const n = await page.$eval('#' + id + '-s', e => +e.max + 1);
      for (let i = 0; i < n; i++) { await page.evaluate((id, i) => { const s = document.getElementById(id + '-s'); s.value = i; s.dispatchEvent(new Event('input')); }, id, i); actions++; await scan(id + ' mode ' + m + ' step ' + i); }
      await page.click('#' + id + '-b'); await page.click('#' + id + '-f'); await page.click('#' + id + '-p'); await page.click('#' + id + '-p'); actions += 4;
    }
  }
  for (const s of ['#lnS button', '#fmS button', '#paS button', '#mg .seg button', '#hkS button']) await clickAll(s);
  await clickAll('details.mist summary');
  // Gao tab
  await tab('t-gao');
  for (let m = 0; m < 3; m++) {
    await page.evaluate(m => document.querySelectorAll('#gxM button')[m].click(), m);
    for (const sz of [0, 4, 8]) for (const k of [0, 1, 300, 1000]) for (const src of ['fig1', 'fig3']) for (const a of [30, 40]) {
      await page.evaluate((sz, k, src, a) => {
        const set = (id, v, ev) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event(ev)); };
        set('gxS', sz, 'input'); set('gxK', k, 'input'); set('gxB', src, 'change'); set('gxA', a, 'input');
      }, sz, k, src, a);
      actions++; await scan(`gao m${m} s${sz} k${k} ${src} a${a}`);
    }
    await page.click('#gxAll'); actions++; await scan('gao all toggle');
  }
  await clickAll('#gxT tr[data-i]');
  // Cases tab
  await tab('t-cases');
  await clickAll('#csK button');
  await page.evaluate(() => { document.querySelector('#csK button[data-k="all"]').click(); });
  await page.click('#csD'); actions++; await scan('measured only');
  const nMeasured = await page.$$eval('#csG .cs', e => e.length);
  await page.click('#csD');
  await page.select('#csO', 'r'); actions++; await scan('order');
  await page.type('#csQ', 'sycophancy'); actions++; await scan('search');
  const nSearch = await page.$$eval('#csG .cs', e => e.length);
  await page.evaluate(() => { const q = document.getElementById('csQ'); q.value = 'zzzz'; q.dispatchEvent(new Event('input')); }); await scan('search none');
  console.log(w, 'cases: measured-defence', nMeasured, 'search "sycophancy"', nSearch);
  await tab('t-more');
  // every link opens in a new tab safely
  const links = await page.$$eval('a[href^="http"]', as => as.filter(a => a.target !== '_blank' || !/noopener/.test(a.rel)).map(a => a.href));
  if (links.length) { bad++; console.log('BAD links', links.slice(0, 5)); }
  if (errs.length) { bad++; console.log('ERRORS', w, errs); }
  await page.close();
}
await browser.close();
console.log('actions', actions, 'bad', bad);
process.exit(bad ? 1 : 0);
