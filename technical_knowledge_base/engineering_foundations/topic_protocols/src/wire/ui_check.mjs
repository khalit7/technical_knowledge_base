// Click every control of the On the wire tab at 390 px dark and 920 px light; report script errors,
// NaN / undefined / ?? in the tab's text, and sideways scroll. Screenshots of each section go to OUTDIR.
// usage: node src/wire/ui_check.mjs <index.html> [OUTDIR]   (run from the repo root; puppeteer comes from html_utils)
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const require = createRequire(path.resolve('html_utils/package.json'));
const puppeteer = require('puppeteer');
const [file, outdir = '/tmp'] = process.argv.slice(2);
fs.mkdirSync(outdir, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
let bad = 0;
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + path.resolve(file));
  await p.click('button[data-t=t-wire]'); await new Promise(r => setTimeout(r, 300));
  const probe = async (what) => {
    const r = await p.evaluate(() => {
      const t = document.getElementById('t-wire'); const txt = t.innerText + ' ' + [...t.querySelectorAll('svg text')].map(x => x.textContent).join(' ');
      const m = txt.match(/.{0,40}(NaN|undefined|\?\?|null ms|Infinity).{0,40}/);
      return { hit: m ? m[0] : '', side: document.documentElement.scrollWidth > innerWidth };
    });
    if (r.hit || r.side) { bad++; console.log(scheme, width, what, 'PROBLEM', r.hit, 'sideways', r.side) }
  };
  await probe('load');
  // open every details, press every segmented button, step every animation to its end and back
  for (const d of await p.$$('#t-wire details')) await p.evaluate(e => e.open = true, d);
  await new Promise(r => setTimeout(r, 200)); await probe('details');
  const segs = await p.$$eval('#t-wire .seg button, #t-wire input[type=checkbox]', els => els.map((e, i) => i));
  for (const i of segs) {
    await p.evaluate(i => document.querySelectorAll('#t-wire .seg button, #t-wire input[type=checkbox]')[i].click(), i);
    await new Promise(r => setTimeout(r, 120)); await probe('control ' + i);
    // tap a bar of the waterfall when present
    await p.evaluate(() => { const r = document.querySelector('#wi-wf rect[data-row]'); if (r) r.dispatchEvent(new MouseEvent('click', { bubbles: true })) });
  }
  for (const ctl of ['wi-an-ctl', 'wi-hol-ctl', 'wi-tls-ctl', 'wi-res-ctl']) {
    const n = await p.$eval('#' + ctl + '-s', e => +e.max);
    for (let k = 0; k <= n; k += (n > 40 ? 7 : 1)) {
      await p.evaluate((c, k) => { const s = document.getElementById(c + '-s'); s.value = k; s.dispatchEvent(new Event('input')) }, ctl, k);
      await probe(ctl + ' step ' + k);
    }
    await p.evaluate(c => { const s = document.getElementById(c + '-s'); s.value = s.max; s.dispatchEvent(new Event('input')) }, ctl);
    await p.click('#' + ctl + '-b'); await p.click('#' + ctl + '-f'); await probe(ctl + ' buttons');
  }
  await p.evaluate(() => { const s = document.getElementById('wi-an-ctl-s'); s.value = 12; s.dispatchEvent(new Event('input')) });
  for (const id of ['wi-s-req', 'wi-s-wf', 'wi-s-an', 'wi-s-hol', 'wi-s-tls', 'wi-s-res', 'wi-s-repro']) {
    const el = await p.$('#' + id); await el.screenshot({ path: path.join(outdir, `${id}-${scheme}-${width}.png`) });
  }
  if (errs.length) { bad++; console.log(scheme, width, 'errors', errs) }
  await p.close();
}
await b.close();
console.log('ui_check', bad ? 'FAIL ' + bad : 'ok');
