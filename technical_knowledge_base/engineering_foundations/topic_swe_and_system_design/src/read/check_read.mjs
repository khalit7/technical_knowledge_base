// Exercise every control of the Reading tab and Further reading at 390 px dark and 920 px light,
// check that the estimate never moves before the reader acts, and compare it (window.RDSIM) with recompute.py's output.
// Since the 2026-10-24 rebuild the Reading tab has one animation (the Step 6 estimate); the five retired ones are in retired/parts.
// Run from the repo root: node technical_knowledge_base/engineering_foundations/topic_swe_and_system_design/src/read/check_read.mjs
import { createRequire } from 'module'; import path from 'path'; import fs from 'fs'; import { execSync } from 'child_process';
const require = createRequire(path.resolve('html_utils/package.json'));
const puppeteer = require('puppeteer');
const base = path.resolve('technical_knowledge_base/engineering_foundations/topic_swe_and_system_design');
const shots = path.join(base, '.shots'); fs.mkdirSync(shots, { recursive: true });
const ref = JSON.parse(execSync('python3 recompute.py', { cwd: path.join(base, 'src/read') }).toString());
const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
let problems = [], actions = 0;
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (const [w, scheme] of [[390, 'dark'], [920, 'light']]) {
  const p = await browser.newPage();
  await p.setViewport({ width: w, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  p.on('pageerror', e => problems.push(w + ' pageerror ' + e.message));
  p.on('console', m => { if (m.type() === 'error') problems.push(w + ' console ' + m.text()) });
  await p.goto('file://' + path.join(base, 'index.html'));
  await p.evaluate(() => { try { localStorage.clear() } catch (e) {} });
  await p.click('#tabs button[data-t="t-read"]'); await sleep(200);
  const check = async (label) => {
    actions++;
    const r = await p.evaluate(() => {
      const t = document.getElementById('t-read').innerText + document.getElementById('t-more').innerText;
      const svgs = [...document.querySelectorAll('#t-read svg')].map(s => s.outerHTML).join('');
      return { bad: /NaN|undefined|Infinity/.test(t) || /NaN|undefined/.test(svgs), side: document.documentElement.scrollWidth > innerWidth,
        err: (document.getElementById('jsErr') || {}).hidden === false };
    });
    if (r.bad) problems.push(w + ' ' + label + ': NaN/undefined in text');
    if (r.side) problems.push(w + ' ' + label + ': sideways scroll');
    if (r.err) problems.push(w + ' ' + label + ': error box shown');
  };
  await check('load');
  // compare simulations with recompute.py
  const js = await p.evaluate(() => {
    const S = window.RDSIM, a6 = S.a6(); delete a6._ta;
    const d = g => { const x = S.a6day(g); return { hours_over: x.hours_over, idle_gpu_hours: x.idle_gpu_hours } };
    return { a6, a6_day_avg: d(a6.gpu_avg), a6_day_peak: d(a6.gpu_peak) };
  });
  if (w === 390) {
    const norm = o => JSON.stringify(o, (k, v) => typeof v === 'number' ? Math.round(v * 100) / 100 : v);
    const r2 = JSON.parse(JSON.stringify(ref)); delete r2.a6_day_avg.shape_mean; delete r2.a6_day_peak.shape_mean;
    for (const k of ['a6', 'a6_day_avg', 'a6_day_peak']) { if (norm(r2[k]) !== norm(js[k])) problems.push('recompute mismatch ' + k + ': py ' + norm(r2[k]).slice(0, 200) + ' js ' + norm(js[k]).slice(0, 200)); else actions++ }
  }
  // no autoplay: after scrolling the estimate into view and waiting, it is still on step 0
  await p.$eval('#rd-est-card', e => e.scrollIntoView()); await sleep(2500);
  const st0 = await p.$eval('#rd-est-ctl-s', e => +e.value); if (st0 !== 0) problems.push(w + ' estimate moved by itself to step ' + st0); actions++;
  await p.$$eval('#rd-est-seg button', bs => bs[1].click()); await sleep(2500);
  const st1 = await p.$eval('#rd-est-ctl-s', e => +e.value); if (st1 !== 0) problems.push(w + ' estimate moved by itself after a mode switch, step ' + st1); actions++;
  await p.$$eval('#rd-est-seg button', bs => bs[0].click());
  // closed blocks open without errors
  await p.$$eval('#t-read details', ds => ds.forEach(d => d.open = true)); await check('details open');
  // every animation: both modes, step through every step, scrub, speed, play/pause
  const cards = [['rd-est', ['rd-est-seg']]];
  for (const [id, segs] of cards) {
    await p.$eval('#' + id + '-card', e => e.scrollIntoView()); await sleep(150);
    const combos = segs.length === 1 ? [[0], [1]] : [[0, 0], [0, 1], [1, 0], [1, 1]];
    for (const c of combos) {
      for (let s = 0; s < segs.length; s++) await p.$$eval('#' + segs[s] + ' button', (bs, i) => bs[i].click(), c[s]);
      const n = await p.$eval('#' + id + '-ctl-s', e => +e.max + 1);
      await p.click('#' + id + '-ctl-p'); await sleep(100); await p.click('#' + id + '-ctl-p');
      for (let i = 0; i < n; i++) { await p.click('#' + id + '-ctl-f'); }
      await check(id + ' ' + c.join('') + ' end');
      await p.$eval('#' + id + '-ctl-s', e => { e.value = Math.floor(+e.max / 2); e.dispatchEvent(new Event('input')) });
      await check(id + ' ' + c.join('') + ' mid');
      await p.click('#' + id + '-ctl-b');
      await p.select('#' + id + '-ctl-v', '2');
      if (w === 390 || c.join('') === '1' || c.join('') === '11') await (await p.$('#' + id + '-card')).screenshot({ path: path.join(shots, 'rd-' + id + '-' + c.join('') + '-' + w + '.png') });
    }
  }
  for (const id of ['rd-one-a', 'rd-one-b']) await (await p.$('#' + id)).screenshot({ path: path.join(shots, id + '-' + w + '.png') });
  // every child card links to its page
  const kids = await p.$$eval('#rd-kids .kids > div', ds => ds.map(d => d.querySelectorAll('a[href*="notion.com/p/"]').length));
  if (kids.length !== 10 || kids.some(n => n !== 1)) problems.push('child cards: ' + JSON.stringify(kids)); actions++;
  // tab links from the Reading tab open their tabs
  for (const t of ['t-sim', 't-num', 't-cases']) {
    await p.click('#tabs button[data-t="t-read"]'); await sleep(100);
    await p.$eval('#t-read a[data-tab="' + t + '"]', a => a.click()); await sleep(150);
    const vis = await p.$eval('#' + t, e => !e.hidden); if (!vis) problems.push(w + ' tab link ' + t + ' did not open'); actions++;
  }
  await p.click('#tabs button[data-t="t-more"]'); await sleep(150); await check('more');
  await p.close();
}
await browser.close();
console.log('actions', actions, 'problems', problems.length); problems.slice(0, 40).forEach(x => console.log(' ', x));
