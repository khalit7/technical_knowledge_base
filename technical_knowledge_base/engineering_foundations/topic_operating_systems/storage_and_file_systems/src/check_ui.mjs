// Click every control of the storage page at 390 dark and 920 light; report page errors, NaN/undefined text,
// sideways scroll; screenshot each tab. Run from the repo root:
//   node technical_knowledge_base/engineering_foundations/topic_operating_systems/storage_and_file_systems/src/check_ui.mjs <outdir>
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(path.resolve('html_utils/package.json'));
const puppeteer = require('puppeteer');
const page = path.resolve('technical_knowledge_base/engineering_foundations/topic_operating_systems/storage_and_file_systems/index.html');
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
  await sleep(300);
  const check = async (tab, label) => {
    const t = await p.$eval('#' + tab, e => e.innerText);
    for (const w of ['NaN', 'undefined', 'Infinity', '[object']) if (t.includes(w)) errs.push(label + ': text contains ' + w + ' near "' + t.slice(Math.max(0, t.indexOf(w) - 60), t.indexOf(w) + 20).replace(/\n/g, ' ') + '"');
    if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) errs.push(label + ': sideways scroll');
    const jsErr = await p.$eval('#jsErr', e => e.hidden ? '' : e.textContent);
    if (jsErr) errs.push(label + ': error box: ' + jsErr.slice(0, 200));
  };
  const ctl = async c => {
    for (let k = 0; k < 70; k++) await p.$eval('#' + c + '-f', e => e.click());
    await p.$eval('#' + c + '-b', e => e.click());
    await p.$eval('#' + c + '-s', e => { e.value = 0; e.dispatchEvent(new Event('input')) });
    await p.$eval('#' + c + '-s', e => { e.value = e.max; e.dispatchEvent(new Event('input')) });
    await p.$eval('#' + c + '-v', e => { e.value = '2'; e.dispatchEvent(new Event('change')) });
    await p.$eval('#' + c + '-p', e => e.click()); await sleep(150); await p.$eval('#' + c + '-p', e => e.click());
  };
  const segs = async (tab, segId, ctls, label) => {
    const n = await p.$$eval('#' + segId + ' button', bs => bs.length);
    for (let i = 0; i < n; i++) {
      await p.$$eval('#' + segId + ' button', (bs, i) => bs[i].click(), i);
      await sleep(60);
      for (const c of ctls) await ctl(c);
      await check(tab, label + ' ' + segId + '[' + i + ']');
    }
  };
  // Reading
  await check('t-read', scheme + ' read');
  await segs('t-read', 'rd-ra-mode', ['rd-ra-ctl'], scheme);
  await segs('t-read', 'rd-wb-mode', [], scheme);
  await segs('t-read', 'rd-fs-mode', ['rd-fs-ctl'], scheme);
  await segs('t-read', 'rd-sc-mode', [], scheme);
  const drills = await p.$$eval('#t-read .drill', d => d.length);
  for (let i = 0; i < drills; i++) await p.$$eval('#t-read .drill', (d, i) => d[i].querySelector('.ch button').click(), i);
  await p.$$eval('#t-read details', ds => ds.forEach(d => d.open = true));
  await check('t-read', scheme + ' read after drills');
  await p.screenshot({ path: `${out}/${scheme}_${width}_read.png`, fullPage: true });
  // Crash lab
  await p.click('button[data-t=t-crash]'); await sleep(200);
  await segs('t-crash', 'cr-proto', ['cr-ctl'], scheme);
  if (scheme === 'light') { const n = await p.$$eval('#cr-proto button', bs => bs.length);
    for (let i = 0; i < n; i++) { await p.$$eval('#cr-proto button', (bs, i) => bs[i].click(), i); console.log('  crash lab: ' + await p.$eval('#cr-sum', e => e.textContent)); } }
  await p.$$eval('#t-crash details', ds => ds.forEach(d => d.open = true));
  await p.screenshot({ path: `${out}/${scheme}_${width}_crash.png`, fullPage: true });
  // Further reading
  await p.click('button[data-t=t-more]'); await sleep(200);
  await check('t-more', scheme + ' more');
  await p.screenshot({ path: `${out}/${scheme}_${width}_more.png`, fullPage: true });
  const nlinks = await p.$$eval('a[target=_blank]', as => as.filter(a => !/^https:\/\//.test(a.href)).length);
  if (nlinks) errs.push(nlinks + ' external links without https');
  console.log(scheme, width, errs.length ? 'ERRORS:\n  ' + errs.join('\n  ') : 'ok');
  bad += errs.length;
  await p.close();
}
await b.close();
process.exit(bad ? 1 : 0);
