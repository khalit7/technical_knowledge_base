// usage: node check_ui.mjs <outdir for screenshots>
// Clicks every control of the Reading and Further reading tabs at 390 px dark and 920 px light; steps every animation
// through every step in every mode; fails on page errors, NaN/undefined/Infinity in the text, or sideways scroll.
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const fs = require('fs');
const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
const file = path.join(here, '../../index.html');
const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
let fails = 0;
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (const [w, scheme] of [[390, 'dark'], [920, 'light']]) {
  const page = await browser.newPage(); const errs = [];
  page.on('pageerror', e => errs.push('pageerror ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text()); });
  await page.setViewport({ width: w, height: 900 });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await page.goto('file://' + file); await page.evaluate(() => { try { localStorage.clear() } catch (e) {} });
  await page.reload(); await sleep(400);
  const h = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < h; y += 600) { await page.evaluate(y => scrollTo(0, y), y); await sleep(40); }
  const bad = await page.evaluate(async () => {
    const tab = document.getElementById('t-read'), sleep = ms => new Promise(r => setTimeout(r, ms)), bad = [];
    const scan = where => { const t = tab.innerText; ['NaN', 'undefined', 'Infinity', 'null'].forEach(s => { if (t.includes(s)) bad.push(where + ': ' + s + ' @ ' + t.slice(Math.max(0, t.indexOf(s) - 50), t.indexOf(s) + 20).replace(/\n/g, ' ')) }) };
    let k = 0;
    // every animation: every mode, every step forward and back
    for (const card of tab.querySelectorAll('.rd-card')) {
      const segs = [...card.querySelectorAll('.seg button')]; const modes = segs.length ? segs : [null];
      for (const m of modes) { if (m) { m.click(); await sleep(20) }
        const f = card.querySelector('[id$="-f"]'), b = card.querySelector('[id$="-b"]'), p = card.querySelector('.an-play');
        if (p) { p.click(); await sleep(30); p.click() }
        if (f) { for (let i = 0; i < 16; i++) { f.click(); k++; await sleep(4); scan(card.id + ' fwd ' + i) } for (let i = 0; i < 16; i++) { b.click(); k++; await sleep(2) } }
        const sel = card.querySelector('select'); if (sel) for (const o of sel.options) { sel.value = o.value; sel.dispatchEvent(new Event('change')); k++ }
        for (const r of card.querySelectorAll('input[type=range]')) for (let v = +r.min; v <= +r.max; v++) { r.value = v; r.dispatchEvent(new Event('input')); k++; scan(card.id + ' range ' + v) }
      }
      if (segs.length) segs[0].click();
    }
    for (const pr of tab.querySelectorAll('.pr')) for (const b of pr.querySelectorAll('.opts button')) { b.click(); k++ }
    for (const d of tab.querySelectorAll('details')) d.open = true;
    scan('final'); return { bad, k };
  });
  // reset the animations to a mid step for the screenshots
  await page.evaluate(() => document.querySelectorAll('#t-read .rd-card').forEach(c => { const f = c.querySelector('[id$="-f"]'); if (f) for (let i = 0; i < 4; i++) f.click() }));
  const sx = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  const wide = await page.evaluate(() => [...document.querySelectorAll('#t-read *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > document.documentElement.clientWidth + 1 && !e.closest('.tw,.nav') }).slice(0, 5).map(e => e.tagName + '.' + e.className + '#' + e.id + ' ' + Math.round(e.getBoundingClientRect().right)));
  for (const id of ['rd-life-card', 'rd-pd-card', 'rd-kv-card', 'rd-pc-card', 'rd-bt-card', 'rd-sd-card', 'rd-par-card', 'rd-rt-card']) {
    const el = await page.$('#' + id); if (el) await el.screenshot({ path: path.join(out, id + '_' + w + '.png') });
  }
  // further reading tab
  await page.click('#tabs button[data-t="t-more"]'); await sleep(200);
  const moreBad = await page.evaluate(() => { const t = document.getElementById('t-more').innerText; return ['NaN', 'undefined'].filter(s => t.includes(s)) });
  await page.screenshot({ path: path.join(out, 'more_' + w + '.png'), fullPage: false });
  const jsErr = await page.evaluate(() => { const e = document.getElementById('jsErr'); return e && !e.hidden ? e.textContent : '' });
  const f = errs.length + bad.bad.length + (sx ? 1 : 0) + wide.length + moreBad.length + (jsErr ? 1 : 0);
  console.log(w, scheme, 'controls', bad.k, 'errors', errs.length, 'bad', bad.bad.length, 'sideways', sx, 'wide', wide.length, 'jsErr', jsErr ? 1 : 0);
  if (f) { console.log(errs.slice(0, 5), bad.bad.slice(0, 5), wide, moreBad, jsErr); fails++ }
  await page.close();
}
await browser.close();
console.log(fails ? 'FAIL' : 'OK');
process.exit(fails ? 1 : 0);
