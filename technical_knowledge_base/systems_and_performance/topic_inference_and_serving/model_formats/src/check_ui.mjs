// usage: node check_ui.mjs <outdir for screenshots>
// Every tab at 390 px dark and 920 px light: every animation stepped forward and back in every mode, every button,
// the bits input, the explorer filter; fails on page errors, NaN/undefined/Infinity/[missing in visible text,
// sideways scroll or elements wider than the viewport. Screenshots each card.
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
  for (const tab of ['t-read', 't-bytes', 't-conv', 't-more']) {
    await page.evaluate(t => document.querySelector('#tabs button[data-t="' + t + '"]').click(), tab); await sleep(300);
    const h = await page.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < h; y += 700) { await page.evaluate(y => scrollTo(0, y), y); await sleep(30); }
    const res = await page.evaluate(async tabId => {
      const tab = document.getElementById(tabId), sleep = ms => new Promise(r => setTimeout(r, ms)), bad = [];
      const scan = where => { const t = tab.innerText; ['NaN', 'undefined', 'Infinity', '[missing '].forEach(s => { if (t.includes(s)) bad.push(where + ': ' + s + ' @ ' + t.slice(Math.max(0, t.indexOf(s) - 60), t.indexOf(s) + 20).replace(/\n/g, ' ')) }) };
      let k = 0;
      // every animation, in every mode of its segmented control
      for (const card of tab.querySelectorAll('.card')) {
        const seg = card.querySelector('.seg') || (card.previousElementSibling && card.previousElementSibling.classList.contains('seg') ? card.previousElementSibling : null) || (tabId === 't-bytes' ? document.getElementById('mf-bx-file') : null);
        const modes = seg ? [...seg.querySelectorAll('button')] : [null];
        for (const m of modes) {
          if (m) { m.click(); await sleep(20) }
          const f = card.querySelector('[id$="-f"]'), b = card.querySelector('[id$="-b"]'), p = card.querySelector('.an-play');
          if (p) { p.click(); await sleep(20); p.click() }
          if (f) { for (let i = 0; i < 45; i++) { f.click(); k++; if (i % 3 === 0) { await sleep(2); scan(card.id + ' ' + (m ? m.dataset.m : '') + ' fwd ' + i) } } for (let i = 0; i < 45; i++) { b.click(); k++ } }
          for (const sel of card.querySelectorAll('select')) for (const o of sel.options) { sel.value = o.value; sel.dispatchEvent(new Event('change')); k++ }
        }
        if (modes[0]) modes[0].click();
      }
      // every other button (segments in charts, explorer nodes, predict buttons, bit picks)
      for (const b of [...tab.querySelectorAll('button')]) { if (b.closest('.an-ctl')) continue; b.click(); k++; await sleep(3); scan('button ' + (b.textContent || '').slice(0, 30)) }
      for (const b of [...tab.querySelectorAll('.mf-map span[data-i],.mf-map span[data-h],.mf-map span[data-d],.mf-map span[data-w]')].filter((x, i) => i % 7 === 0)) { b.click(); k++; scan('map ' + (b.title || '')) }
      for (const d of tab.querySelectorAll('details')) { d.open = true }
      const inp = document.getElementById('mf-bits-in');
      if (tabId === 't-read' && inp) for (const v of ['1', '-0.5', '1e-9', '70000', 'abc', '6.1e-5', '0']) { inp.value = v; inp.dispatchEvent(new Event('input')); k++; scan('bits ' + v) }
      const q = document.getElementById('mf-bx-q');
      if (tabId === 't-bytes' && q) for (const v of ['layers.0.', 'Q6_K', 'zzz', '']) { q.value = v; q.dispatchEvent(new Event('input')); k++; scan('filter ' + v) }
      scan('end');
      const vw = document.documentElement.clientWidth, wide = [];
      tab.querySelectorAll('*').forEach(el => { const r = el.getBoundingClientRect(); if (r.width && r.right > vw + 1 && !el.closest('.tw,.mf-hex,.mf-ops,.hmwrap,.nav,.tabs')) wide.push(el.tagName + '.' + el.className + '#' + el.id + ' ' + Math.round(r.right)) });
      return { k, bad: bad.slice(0, 8), wide: wide.slice(0, 6), side: document.documentElement.scrollWidth > vw };
    }, tab);
    console.log(scheme, w, tab, 'controls', res.k, 'bad', res.bad.length, 'wide', res.wide.length, 'sideways', res.side);
    if (res.bad.length || res.wide.length || res.side) { fails++; console.log(res.bad, res.wide) }
    const cards = await page.$$('#' + tab + ' .card');
    let i = 0; for (const c of cards) { try { await c.screenshot({ path: path.join(out, scheme + w + '-' + tab + '-' + (i++) + '.png') }) } catch (e) {} }
  }
  if (errs.length) { fails++; console.log('ERRORS', errs) }
  await page.close();
}
await browser.close();
console.log(fails ? 'FAIL ' + fails : 'OK');
process.exit(fails ? 1 : 0);
