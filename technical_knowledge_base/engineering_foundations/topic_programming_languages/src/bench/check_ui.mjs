// Exercise every control of the Benchmark tab at 390 dark and 920 light; report errors, NaN, undefined, sideways scroll.
import { createRequire } from 'module';
const HERE = new URL('.', import.meta.url).pathname;
const require = createRequire(HERE + '../../../../../html_utils/package.json');
const puppeteer = require('puppeteer');
const PAGE = 'file://' + HERE + '../../index.html';
const OUT = process.env.OUT || '/tmp/bench_shots/';  // screenshots; pass OUT=<scratch dir>
import fs from 'fs'; fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ headless: 'shell' });
let problems = 0;
for (const [w, scheme] of [[390, 'dark'], [920, 'light']]) {
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text()); });
  await page.setViewport({ width: w, height: 900 });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await page.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch (e) {} });
  await page.goto(PAGE, { waitUntil: 'load' });
  await page.click('#tabs button[data-t="t-bench"]');
  await new Promise(r => setTimeout(r, 300));
  const check = async (label) => {
    const r = await page.evaluate(() => {
      const t = document.getElementById('t-bench');
      const txt = t.innerText;
      return { nan: /NaN|undefined|Infinity/.test(txt), q: (txt.match(/(^|\s)\?(\s|$)/g) || []).length,
        sw: document.documentElement.scrollWidth - document.documentElement.clientWidth, err: document.getElementById('jsErr').hidden ? '' : document.getElementById('jsErr').textContent };
    });
    if (r.nan || r.sw > 0 || r.err || r.q) { problems++; console.log(w, scheme, label, JSON.stringify(r)); }
  };
  await check('open');
  for (const v of ['time', 'mem', 'start', 'loc', 'comp']) {
    await page.click(`#bm-view button[data-m="${v}"]`);
    await check('view ' + v);
    for (const log of [true, false]) {
      await page.click('#bm-log'); await check(`view ${v} log toggle`);
    }
    if (['time', 'mem', 'start'].includes(v)) {
      const gs = await page.$$eval('#bm-grp button', bs => bs.map(b => b.dataset.g));
      for (const g of gs) { await page.click(`#bm-grp button[data-g="${g}"]`); await check(`view ${v} group ${g}`); }
      await page.click('#bm-grp button[data-g="all"]');
    }
  }
  await page.click('#bm-view button[data-m="time"]');
  const ids = await page.$$eval('#bm-chart .bm-row', gs => gs.map(g => g.dataset.id));
  for (const id of ids) { await page.$eval(`#bm-chart .bm-row[data-id="${id}"]`, g => g.dispatchEvent(new MouseEvent('click', { bubbles: true }))); }
  await check('rows clicked');
  for (const m of ['py', 'nat', 'both']) { await page.click(`#bm-an-mode button[data-m="${m}"]`); await check('anim ' + m); }
  for (let i = 0; i < 12; i++) { await page.click('#bm-an-ctl-f'); }
  await check('anim stepped');
  await page.click('#bm-an-ctl-b'); await page.click('#bm-an-ctl-p'); await new Promise(r => setTimeout(r, 400)); await page.click('#bm-an-ctl-p');
  await page.select('#bm-an-ctl-v', '2'); await check('anim play');
  await page.$eval('details.mist', d => d.open = true); await check('details');
  await page.screenshot({ path: OUT + `bench_${w}_${scheme}.png`, fullPage: true });
  if (errs.length) { problems++; console.log(w, scheme, errs.join('\n')); }
  await page.close();
}
await browser.close();
console.log('problems', problems);
