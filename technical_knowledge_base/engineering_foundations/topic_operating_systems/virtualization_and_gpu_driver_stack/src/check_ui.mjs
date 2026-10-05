// Click every control of the virtualization and GPU driver stack page at 390 dark and 920 light; report page errors,
// NaN/undefined text, sideways scroll; screenshot each tab and each animation card. Run from the repo root:
//   node technical_knowledge_base/engineering_foundations/topic_operating_systems/virtualization_and_gpu_driver_stack/src/check_ui.mjs <outdir>
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(path.resolve('html_utils/package.json'));
const puppeteer = require('puppeteer');
const page = path.resolve('technical_knowledge_base/engineering_foundations/topic_operating_systems/virtualization_and_gpu_driver_stack/index.html');
const out = process.argv[2] || '.';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shoot = async (p, sel, file) => { const el = await p.$(sel); await el.evaluate(e => e.scrollIntoView({ block: 'start' })); await sleep(80); try { await el.screenshot({ path: file }) } catch (e) { const r = await el.evaluate(e => JSON.stringify(e.getBoundingClientRect())); throw new Error('screenshot ' + sel + ' ' + r + ' ' + e.message) } };
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
  await sleep(300);
  const startTab = await p.evaluate(() => [...document.querySelectorAll('.tab')].find(t => !t.hidden).id);
  if (startTab !== 't-read') console.log(scheme, 'opened on', startTab, '(remembered in localStorage)');
  await p.click('button[data-t=t-read]'); await sleep(100);
  const check = async (tab, label) => {
    const t = await p.$eval('#' + tab, e => e.innerText);
    for (const w of ['NaN', 'undefined', 'Infinity', '[object']) if (t.includes(w)) errs.push(label + ': text contains ' + w + ' near "' + t.slice(Math.max(0, t.indexOf(w) - 60), t.indexOf(w) + 20).replace(/\n/g, ' ') + '"');
    if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) errs.push(label + ': sideways scroll');
    const jsErr = await p.$eval('#jsErr', e => e.hidden ? '' : e.textContent);
    if (jsErr) errs.push(label + ': error box: ' + jsErr.slice(0, 200));
  };
  const ctl = async c => {
    for (let k = 0; k < 30; k++) await p.$eval('#' + c + '-f', e => e.click());
    await p.$eval('#' + c + '-b', e => e.click());
    await p.$eval('#' + c + '-s', e => { e.value = 0; e.dispatchEvent(new Event('input')) });
    await p.$eval('#' + c + '-s', e => { e.value = e.max; e.dispatchEvent(new Event('input')) });
    await p.$eval('#' + c + '-v', e => { e.value = '2'; e.dispatchEvent(new Event('change')) });
    await p.$eval('#' + c + '-p', e => e.click()); await sleep(150); await p.$eval('#' + c + '-p', e => e.click());
  };
  const segs = async (tab, segId, ctls, label, shot) => {
    const n = await p.$$eval('#' + segId + ' button', bs => bs.length);
    for (let i = 0; i < n; i++) {
      await p.$$eval('#' + segId + ' button', (bs, i) => bs[i].click(), i);
      await sleep(60);
      for (const c of ctls) await ctl(c);
      await check(tab, label + ' ' + segId + '[' + i + ']');
      if (shot) await shoot(p, '#' + shot, `${out}/${scheme}_${width}_${shot}_${i}.png`);
    }
  };
  // Reading
  await check('t-read', scheme + ' read');
  await segs('t-read', 'pw-mode', ['pw-ctl'], scheme, 'pw-card');
  await segs('t-read', 'wk-mode', ['wk-ctl'], scheme, 'wk-card');
  await segs('t-read', 'vq-mode', ['vq-ctl'], scheme, 'vq-card');
  await segs('t-read', 'fc-mode', ['fc-ctl'], scheme, 'fc-card');
  // version checker: every combination
  const vc = await p.evaluate(() => {
    const ids = ['vc-drv', 'vc-rt', 'vc-gpu', 'vc-code', 'vc-compat'], sel = ids.map(i => document.getElementById(i));
    const opts = sel.map(s => [...s.options].map(o => o.value)); let n = 0, badv = [];
    const rec = (k) => { if (k === sel.length) { n++; const t = document.getElementById('vc-out').innerText; if (!t || /NaN|undefined|null/.test(t)) badv.push(sel.map(s => s.value).join(',') + ': ' + t); return }
      for (const v of opts[k]) { sel[k].value = v; sel[k].dispatchEvent(new Event('change')); rec(k + 1) } };
    rec(0); return [n, badv.slice(0, 5)];
  });
  if (vc[1].length) errs.push('version checker: ' + vc[1].join(' | '));
  await p.evaluate(() => { const set = (i, v) => { const s = document.getElementById(i); s.value = v; s.dispatchEvent(new Event('change')) }; set('vc-drv', '570'); set('vc-rt', '13.4'); set('vc-gpu', 'dc'); set('vc-code', 'sass'); set('vc-compat', 'no') });
  await shoot(p, '#vc-card', `${out}/${scheme}_${width}_vc.png`);
  const drills = await p.$$eval('#t-read .drill', d => d.length);
  for (let i = 0; i < drills; i++) await p.$$eval('#t-read .drill', (d, i) => d[i].querySelector('.ch button').click(), i);
  await p.$$eval('#t-read details', ds => ds.forEach(d => d.open = true));
  await check('t-read', scheme + ' read after drills');
  await p.screenshot({ path: `${out}/${scheme}_${width}_read.png`, fullPage: true });
  // One CUDA call
  await p.click('button[data-t=t-cuda]'); await sleep(200);
  const nc = await p.$$eval('#cu-case button', bs => bs.length);
  for (let i = 0; i < nc; i++) {
    await p.$$eval('#cu-case button', (bs, i) => bs[i].click(), i);
    const ns = await p.$$eval('#cu-steps button', bs => bs.length);
    for (let k = 0; k < ns + 1; k++) await p.$eval('#cu-next', e => e.click());
    await p.$eval('#cu-prev', e => e.click());
    for (let k = 0; k < ns; k++) await p.$$eval('#cu-steps button', (bs, k) => bs[k].click(), k);
    const miss = await p.evaluate(() => document.querySelector('#cu-raw .hl') ? '' : document.querySelector('#cu-case .on').textContent);
    if (miss) errs.push('cuda tab: last step of ' + miss + ' highlights no line');
    await check('t-cuda', scheme + ' cuda case ' + i);
    if (i === 2) await p.$eval('#t-cuda', e => e.scrollIntoView());
  }
  await p.$$eval('#cu-case button', bs => bs[2].click()); await p.$$eval('#cu-steps button', bs => bs[8].click());
  await shoot(p, '#t-cuda', `${out}/${scheme}_${width}_cuda.png`);
  // Sharing a GPU
  await p.click('button[data-t=t-share]'); await sleep(200);
  const np = await p.$$eval('#mg-pre button', bs => bs.length);
  for (let i = 0; i < np; i++) { await p.$$eval('#mg-pre button', (bs, i) => bs[i].click(), i); await check('t-share', scheme + ' preset ' + i) }
  await p.$$eval('#mg-gpu .inst', is => is.forEach(x => x.click()));
  while (await p.$('#mg-gpu .inst')) await p.$eval('#mg-gpu .inst', e => e.click());
  const nprof = await p.$$eval('#mg-prof button', bs => bs.length);
  for (let i = 0; i < nprof; i++) { await p.$$eval('#mg-prof button', (bs, i) => bs[i].click(), i); if (await p.$('#mg-gpu .cand')) await p.$eval('#mg-gpu .cand', e => e.click()); await check('t-share', scheme + ' profile ' + i) }
  await p.$$eval('#mg-pre button', bs => bs[4].click()); await p.$$eval('#mg-prof button', bs => bs[4].click());
  const msg = await p.$eval('#mg-msg', e => e.textContent); if (!/No valid position/.test(msg)) errs.push('share: failing-order example did not block 3g.20gb: ' + msg);
  await shoot(p, '#t-share', `${out}/${scheme}_${width}_share.png`);
  await p.click('button[data-t=t-more]'); await sleep(150); await check('t-more', scheme + ' more');
  console.log(scheme, width, 'version checker combinations', vc[0], 'errors', errs.length ? errs : 'none');
  if (errs.length) bad = 1;
  await p.close();
}
await b.close();
process.exit(bad);
