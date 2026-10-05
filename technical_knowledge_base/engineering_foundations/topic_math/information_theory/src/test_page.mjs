// Click every control on every tab at 390 dark and 920 light; fail on page errors, NaN, undefined or Infinity in visible text
// (except the lab's deliberate infinities), and take screenshots of each card.
// usage (from html_utils, so puppeteer resolves): node ../technical_knowledge_base/engineering_foundations/topic_math/information_theory/src/test_page.mjs <index.html> <outdir>
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const require = createRequire(path.join(process.cwd(), 'package.json'));
const puppeteer = require('puppeteer');
const [file, outdir] = process.argv.slice(2);
fs.mkdirSync(outdir, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let problems = 0, clicks = 0;
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + path.resolve(file)); await sleep(600);
  const bad = async where => {
    const t = await p.evaluate(() => { const v = document.querySelector('.tab:not([hidden])'); return v ? v.innerText : '' });
    const hits = (t.match(/NaN|undefined|Infinity/g) || []);
    if (hits.length) { problems++; console.log('BAD TEXT', scheme, where, hits.slice(0, 3)) }
  };
  // Reading: step every animation forward to the end and back, switch every segmented control
  await p.click('button[data-t=t-read]'); await sleep(300);
  for (const id of ['it-huf', 'it-kl', 'it-fr', 'it-ac']) {
    const n = await p.$eval('#' + id + '-ctl-s', e => +e.max);
    await p.$eval('#' + id + '-card', e => e.scrollIntoView());
    for (let i = 0; i < n; i++) { await p.click('#' + id + '-ctl-f'); clicks++ }
    await sleep(150); await bad(id + ' end');
    const card = await p.$('#' + id + '-card'); await card.screenshot({ path: path.join(outdir, `${id}-${scheme}-${width}.png`) });
    await p.click('#' + id + '-ctl-b'); clicks++;
    await p.$eval('#' + id + '-ctl-s', e => { e.value = 0; e.dispatchEvent(new Event('input')) });
    await p.click('#' + id + '-ctl-p'); clicks++; await sleep(200); await p.click('#' + id + '-ctl-p'); clicks++;
    await p.select('#' + id + '-ctl-v', '2'); clicks++;
  }
  for (const m of ['fwd', 'rev', 'both']) { await p.click(`#it-fr-seg button[data-m=${m}]`); clicks++; await sleep(80) }
  for (const m of ['0', '1', '2', '3', '4']) { await p.click(`#it-nce-seg button[data-m="${m}"]`); clicks++; await sleep(150); await bad('nce ' + m) }
  for (const id of ['it-hb-card', 'it-fn-card', 'it-nce-card', 'it-lad-card', 'it-pb-card']) {
    const c = await p.$('#' + id); await c.screenshot({ path: path.join(outdir, `${id}-${scheme}-${width}.png`) })
  }
  await bad('read');
  // Lab
  await p.click('button[data-t=t-lab]'); await sleep(300);
  for (const k of ['weather', 'stream', 'coin', 'tiny', 'soft', 'unif', 'near0']) {
    await p.click(`#lab-pre button[data-k=${k}]`); clicks++; await sleep(60);
    const t = await p.$eval('#t-lab', e => e.innerText);
    if (/NaN|undefined/.test(t)) { problems++; console.log('BAD LAB', scheme, k) }
    if (k === 'tiny') { const v = await p.$eval('#lab-out', e => e.innerText); console.log('lab tiny:', v.replace(/\s+/g, ' ').slice(0, 220)) }
  }
  await p.select('#lab-u', 'e'); clicks++;
  for (const K of ['2', '5', '6', '3']) { await p.select('#lab-k', K); clicks++; await sleep(60) }
  const sl = await p.$$('#lab-p input, #lab-q input');
  for (const s of sl) { await s.evaluate(e => { e.value = 0; e.dispatchEvent(new Event('input')) }); clicks++ }
  let t = await p.$eval('#t-lab', e => e.innerText); if (/NaN|undefined/.test(t)) { problems++; console.log('BAD LAB zeros', scheme) }
  await p.click('#lab-pre button[data-k=stream]'); await sleep(100);
  await p.screenshot({ path: path.join(outdir, `lab-${scheme}-${width}.png`), fullPage: true });
  // Real
  await p.click('button[data-t=t-real]'); await sleep(300);
  for (const m of ['fr', 'code', 'en']) { await p.click(`#re-txt button[data-m=${m}]`); clicks++; await sleep(80); await bad('real ' + m) }
  for (const m of ['1', '2', '3', '0']) { await p.click(`#re-mod button[data-m="${m}"]`); clicks++; await sleep(60) }
  await p.screenshot({ path: path.join(outdir, `real-${scheme}-${width}.png`), fullPage: true });
  await p.click('button[data-t=t-more]'); await sleep(200); await bad('more');
  // tab links inside Reading
  await p.click('button[data-t=t-read]'); await sleep(200);
  const links = await p.$$eval('#t-read a[data-tab]', as => as.map(a => a.dataset.tab));
  console.log(scheme, width, 'tab links in Reading:', [...new Set(links)].join(', '));
  if (errs.length) { problems++; console.log('ERRORS', scheme, errs) }
  await p.close();
}
await b.close();
console.log('test_page: clicks', clicks, 'problems', problems);
process.exit(problems ? 1 : 0);
