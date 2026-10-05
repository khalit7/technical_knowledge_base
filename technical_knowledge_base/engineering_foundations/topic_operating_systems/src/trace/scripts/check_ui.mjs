// Exercise every control of the Syscall tracer tab at 390 dark and 920 light; report errors, NaN/undefined text,
// sideways scroll; screenshot each section. Run from the repo root:
//   node technical_knowledge_base/engineering_foundations/topic_operating_systems/src/trace/scripts/check_ui.mjs <outdir>
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(path.resolve('html_utils/package.json'));
const puppeteer = require('puppeteer');
const page = path.resolve('technical_knowledge_base/engineering_foundations/topic_operating_systems/index.html');
const out = process.argv[2] || '.';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell' });
let bad = 0;
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + page);
  await p.click('button[data-t=t-trace]');
  await sleep(300);
  const checkText = async label => {
    const t = await p.$eval('#t-trace', e => e.innerText);
    for (const w of ['NaN', 'undefined', 'Infinity', '[object']) if (t.includes(w)) { errs.push(label + ': text contains ' + w + ' near "' + t.slice(Math.max(0, t.indexOf(w) - 60), t.indexOf(w) + 20).replace(/\n/g, ' ') + '"'); }
    const sw = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    if (sw) errs.push(label + ': sideways scroll');
  };
  // every segmented button and every animation control
  const segs = ['tr-ph-run', 'tr-x-run', 'tr-sm-mode', 'tr-wr-mode', 'tr-ck-mode'];
  for (const s of segs) {
    const n = await p.$$eval('#' + s + ' button', bs => bs.length);
    for (let i = 0; i < n; i++) {
      await p.$$eval('#' + s + ' button', (bs, i) => bs[i].click(), i);
      await sleep(80);
      for (const c of ['tr-sm-ctl', 'tr-wr-ctl', 'tr-ck-ctl']) {
        for (let k = 0; k < 25; k++) await p.click('#' + c + '-f').catch(() => {});
        await p.click('#' + c + '-b').catch(() => {});
        await p.$eval('#' + c + '-s', e => { e.value = e.max; e.dispatchEvent(new Event('input')) });
        await p.$eval('#' + c + '-v', e => { e.value = '2'; e.dispatchEvent(new Event('change')) });
        await p.click('#' + c + '-p'); await sleep(30); await p.click('#' + c + '-p');
      }
      await checkText(s + ' #' + i);
    }
  }
  // explorer: every zoom option, filters, kinds, clicks
  for (const run of ['fork', 'spawn', 'forkserver']) {
    await p.$$eval('#tr-x-run button', (bs, run) => bs.find(b => b.dataset.m === run).click(), run);
    const opts = await p.$$eval('#tr-x-phase option', os => os.map(o => o.value));
    for (const v of opts) {
      await p.select('#tr-x-phase', v); await sleep(30);
      const cv = await p.$('#tr-x-cv canvas'); const bb = await cv.boundingBox();
      for (const [fx, fy] of [[.3, .2], [.5, .5], [.8, .8], [.1, .9]]) await p.mouse.click(bb.x + bb.width * fx, bb.y + bb.height * fy);
      await p.$$eval('#tr-x-list .r', rs => { if (rs.length) rs[0].click() }); await p.$$eval('#tr-x-list .r', rs => { if (rs.length) rs[rs.length - 1].click() });
      await checkText('explorer ' + run + ' ' + v);
    }
    await p.click('#tr-x-more').catch(() => {});
    for (const q of ['futex', '/dev/shm', 'ckpt', 'zzzz', '']) { await p.$eval('#tr-x-q', (e, q) => { e.value = q; e.dispatchEvent(new Event('input')) }, q); await sleep(200); await checkText('filter ' + q); }
    await p.$$eval('#tr-x-kinds input', is => is.forEach(i => i.click())); await sleep(50);
    await p.$$eval('#tr-x-kinds input', is => is.forEach(i => i.click())); await sleep(50);
  }
  for (const run of ['fork','spawn','forkserver']) { await p.$$eval('#tr-x-run button', (bs, run) => bs.find(b => b.dataset.m === run).click(), run); for (let j = 0; j < 5; j++) { await p.$$eval('#tr-x-jump button', (bs, j) => bs[j].click(), j); await sleep(80); await checkText('jump ' + run + ' ' + j); } }
  // predict question, details
  for (const a of ['0', '1', '2']) await p.click('#tr-q1 button[data-a="' + a + '"]');
  await p.$$eval('#t-trace details', ds => ds.forEach(d => d.open = true));
  await checkText('final');
  // screenshots per section
  await p.select('#tr-x-phase', await p.$$eval('#tr-x-phase option', os => os[7] ? os[7].value : os[0].value));
  for (const id of ['tr-s-phase', 'tr-s-x', 'tr-s-imp', 'tr-s-sm', 'tr-s-wr', 'tr-s-ck', 'tr-s-sig', 'tr-s-lang', 'tr-s-how']) {
    const el = await p.$('#' + id); if (el) await el.screenshot({ path: path.join(out, `${id}-${scheme}-${width}.png`) });
  }
  const box = await p.evaluate(() => { const d = document.getElementById('jsErr'); return d && !d.hidden ? d.textContent : '' });
  if (box) errs.push('error box: ' + box);
  console.log(scheme, width, errs.length ? errs.slice(0, 12) : 'ok');
  if (errs.length) bad = 1;
  await p.close();
}
await b.close();
process.exit(bad);
