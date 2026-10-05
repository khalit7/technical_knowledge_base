// Click every control of the containers page at 390 dark and 920 light; report page errors, NaN/undefined text,
// sideways scroll; screenshot each tab and each animated card. Run from the repo root:
//   node technical_knowledge_base/engineering_foundations/topic_operating_systems/containers_and_isolation/src/check_ui.mjs <outdir>
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(path.resolve('html_utils/package.json'));
const puppeteer = require('puppeteer');
const page = path.resolve('technical_knowledge_base/engineering_foundations/topic_operating_systems/containers_and_isolation/index.html');
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
    for (let k = 0; k < 40; k++) await p.$eval('#' + c + '-f', e => e.click());
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
      if (shot && (i === 0 || i === n - 1 || i === 1)) { const el = await p.$('#' + shot); await el.screenshot({ path: `${out}/${scheme}_${width}_${shot}_${i}.png` }); }
    }
  };
  // Reading (the tab choice is remembered across loads)
  await p.click('button[data-t=t-read]'); await sleep(200);
  await check('t-read', scheme + ' read');
  await segs('t-read', 'rd-stop-mode', ['rd-stop-ctl'], scheme, 'rd-stop-card');
  await segs('t-read', 'rd-mem-mode', ['rd-mem-ctl'], scheme, 'rd-mem-card');
  for (const [seg, c, card] of [['rd-mem-mode', 'rd-mem-ctl', 'rd-mem-card'], ['rd-stop-mode', 'rd-stop-ctl', 'rd-stop-card']]) {
    const n = await p.$$eval('#' + seg + ' button', bs => bs.length);
    for (let i = 0; i < n; i++) { await p.$$eval('#' + seg + ' button', (bs, i) => bs[i].click(), i);
      await p.$eval('#' + c + '-s', e => { e.value = e.max; e.dispatchEvent(new Event('input')) }); await sleep(50);
      if (i < 3) await (await p.$('#' + card)).screenshot({ path: `${out}/${scheme}_${width}_${card}_end${i}.png` }); }
  }
  const drills = await p.$$eval('#t-read .drill', d => d.length);
  for (let i = 0; i < drills; i++) await p.$$eval('#t-read .drill', (d, i) => d[i].querySelector('.ch button').click(), i);
  await p.$$eval('#t-read details', ds => ds.forEach(d => d.open = true));
  await check('t-read', scheme + ' read after drills');
  for (const id of ['rd-nscost', 'rd-fz', 'rd-caps', 'rd-scprobe', 'rd-uring', 'rd-rt']) { const el = await p.$('#' + id); await el.screenshot({ path: `${out}/${scheme}_${width}_${id}.png` }); }
  await p.screenshot({ path: `${out}/${scheme}_${width}_read.png`, fullPage: true });
  // Build a container
  await p.click('button[data-t=t-build]'); await sleep(200);
  for (const m of [0, 1]) {
    await p.$$eval('#bl-cmp button', (bs, m) => bs[m].click(), m);
    const n = await p.$$eval('#bl-steps button', bs => bs.length);
    for (let i = 0; i < n; i++) { await p.$$eval('#bl-steps button', (bs, i) => bs[i].click(), i); await check('t-build', scheme + ' build step ' + i + ' cmp ' + m); }
    await ctl('bl-ctl');
  }
  for (const i of [4, 9]) { await p.$$eval('#bl-steps button', (bs, i) => bs[i].click(), i); await (await p.$('#bl-card')).screenshot({ path: `${out}/${scheme}_${width}_build_${i}.png` }); }
  // Pod to cgroup
  await p.click('button[data-t=t-pod]'); await sleep(200);
  const np = await p.$$eval('#pd-pre button', bs => bs.length);
  for (let i = 0; i < np; i++) {
    await p.$$eval('#pd-pre button', (bs, i) => bs[i].click(), i); await check('t-pod', scheme + ' pod preset ' + i);
    if (scheme === 'light') console.log('  preset ' + i + ': ' + (await p.$eval('#pd-q', e => e.textContent)) + ' | ' + (await p.$eval('#pd-out', e => e.innerText.replace(/\s+/g, ' ').slice(0, 260))));
  }
  await p.$eval('#pd-in input', e => { e.value = ''; e.dispatchEvent(new Event('input', { bubbles: true })) });
  await p.$eval('#pd-node', e => { e.value = ''; e.dispatchEvent(new Event('input')) });
  await check('t-pod', scheme + ' pod blanks');
  await p.screenshot({ path: `${out}/${scheme}_${width}_pod.png`, fullPage: true });
  // Further reading
  await p.click('button[data-t=t-more]'); await sleep(200);
  await check('t-more', scheme + ' more');
  const nlinks = await p.$$eval('a[target=_blank]', as => as.filter(a => !/^https:\/\//.test(a.href)).length);
  if (nlinks) errs.push(nlinks + ' external links without https');
  console.log(scheme, width, errs.length ? 'ERRORS:\n  ' + errs.join('\n  ') : 'ok');
  bad += errs.length;
  await p.close();
}
await b.close();
process.exit(bad ? 1 : 0);
