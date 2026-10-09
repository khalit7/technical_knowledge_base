// usage: node check_ui.mjs <outdir for screenshots>
// Every tab at 390 px dark and 920 px light: every animation stepped forward and back in every mode, every select option,
// every range value, every predict button; fails on page errors, NaN/undefined/Infinity in visible text, sideways scroll
// or elements wider than the viewport. Screenshots each card and each lab section.
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const fs = require('fs');
const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
const file = path.join(here, '../index.html');
const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
for (const [w, scheme] of [[390, 'dark'], [920, 'light']]) {
  const page = await browser.newPage(); const errs = [];
  page.on('pageerror', e => errs.push('pageerror ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text()); });
  await page.setViewport({ width: w, height: 900 });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await page.goto('file://' + file); await page.evaluate(() => { try { localStorage.clear() } catch (e) {} });
  await page.reload(); await sleep(400);
  let total = 0, badAll = [], wideAll = [], sideAll = false;
  for (const tab of ['t-read', 't-ev', 't-sch', 't-kvc', 't-more']) {
    await page.evaluate(t => document.querySelector('#tabs button[data-t="' + t + '"]').click(), tab); await sleep(300);
    const h = await page.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < h; y += 700) { await page.evaluate(y => scrollTo(0, y), y); await sleep(30); }
    const res = await page.evaluate(async tabId => {
      const tab = document.getElementById(tabId), sleep = ms => new Promise(r => setTimeout(r, ms)), bad = [];
      const scan = where => { const t = tab.innerText; ['NaN', 'undefined', 'Infinity'].forEach(s => { if (t.includes(s)) bad.push(where + ': ' + s + ' @ ' + t.slice(Math.max(0, t.indexOf(s) - 50), t.indexOf(s) + 20).replace(/\n/g, ' ')) }) };
      let k = 0;
      for (const card of tab.querySelectorAll('.bk-card')) {
        const groups = [...card.querySelectorAll('.seg')];
        const combos = groups.length ? [...groups[0].querySelectorAll('button')] : [null];
        for (const m of combos) {
          if (m) { m.click(); await sleep(15) }
          const inner = groups[1] ? [...groups[1].querySelectorAll('button')] : [null];
          for (const m2 of inner) {
            if (m2) { m2.click(); await sleep(15) }
            const f = card.querySelector('[id$="-f"]'), b = card.querySelector('[id$="-b"]'), p = card.querySelector('.an-play');
            if (p) { p.click(); await sleep(20); p.click() }
            if (f) { for (let i = 0; i < 40; i++) { f.click(); k++; if (i % 4 === 0) { await sleep(2); scan(card.id + ' fwd ' + i) } } for (let i = 0; i < 40; i++) { b.click(); k++ } }
            for (const sel of card.querySelectorAll('select')) for (const o of sel.options) { sel.value = o.value; sel.dispatchEvent(new Event('change')); k++; scan(card.id + ' select ' + o.value) }
          }
          if (inner[0]) inner[0].click();
        }
        if (combos[0]) combos[0].click();
      }
      // lab controls outside cards
      for (const sel of tab.querySelectorAll(':scope select')) { if (sel.closest('.bk-card')) continue; const orig = sel.value; for (const o of sel.options) { sel.value = o.value; sel.dispatchEvent(new Event('change')); k++; scan(tabId + ' ' + sel.id + ' ' + o.value) } sel.value = orig; sel.dispatchEvent(new Event('change')) }
      for (const r of tab.querySelectorAll('input[type=range]')) { const orig = r.value; for (let v = +r.min; v <= +r.max; v++) { r.value = v; r.dispatchEvent(new Event('input')); k++; scan(tabId + ' range ' + v) } r.value = orig; r.dispatchEvent(new Event('input')) }
      for (const pr of tab.querySelectorAll('.pr')) for (const b of pr.querySelectorAll('.opts button')) { b.click(); k++ }
      for (const d of tab.querySelectorAll('details')) d.open = true;
      scan(tabId + ' final'); return { bad, k };
    }, tab);
    total += res.k; badAll = badAll.concat(res.bad);
    const side = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    sideAll = sideAll || side;
    const wide = await page.evaluate(t => [...document.querySelectorAll('#' + t + ' *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > document.documentElement.clientWidth + 1 && !e.closest('.tw,.nav') }).slice(0, 5).map(e => e.tagName + '.' + e.className + '#' + e.id + ' ' + Math.round(e.getBoundingClientRect().right)), tab);
    wideAll = wideAll.concat(wide);
    if (tab === 't-read') {
      await page.evaluate(() => document.querySelectorAll('#t-read .bk-card').forEach(c => { const f = c.querySelector('[id$="-f"]'); if (f) for (let i = 0; i < 5; i++) f.click() }));
      for (const id of await page.evaluate(() => [...document.querySelectorAll('#t-read .bk-card')].map(c => c.id))) { const el = await page.$('#' + id); if (el) await el.screenshot({ path: path.join(out, id + '_' + w + '.png') }) }
    } else {
      const hh = await page.evaluate(() => document.body.scrollHeight);
      for (let y = 0, k = 0; y < hh && k < 8; y += 1100, k++) await page.screenshot({ path: path.join(out, tab + '_' + w + '_' + k + '.png'), clip: { x: 0, y, width: w, height: Math.min(1100, hh - y) }, captureBeyondViewport: true });
    }
  }
  const jsErr = await page.evaluate(() => { const e = document.getElementById('jsErr'); return e && !e.hidden ? e.textContent : '' });
  const f = errs.length + badAll.length + (sideAll ? 1 : 0) + wideAll.length + (jsErr ? 1 : 0);
  console.log(w, scheme, 'controls', total, 'errors', errs.length, 'bad', badAll.length, 'sideways', sideAll, 'wide', wideAll.length, 'jsErr', jsErr ? 1 : 0);
  if (f) { console.log(errs.slice(0, 5), badAll.slice(0, 5), wideAll.slice(0, 5), jsErr); fails++ }
  await page.close();
}
await browser.close();
console.log(fails ? 'FAIL' : 'OK');
process.exit(fails ? 1 : 0);
