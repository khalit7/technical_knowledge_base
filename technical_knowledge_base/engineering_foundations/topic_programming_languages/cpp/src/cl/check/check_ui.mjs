// Part 3 UI check: open each Part 2 tab at 390 px dark and 920 px light, click every control, look for errors,
// NaN / undefined / "missing" / lone "?" values, and sideways scroll. Screenshots go to the scratch folder.
// Usage: node check_ui.mjs [outdir]
import { createRequire } from 'module';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../../../../../..');
const require = createRequire(path.join(repo, 'html_utils/package.json'));
const puppeteer = require('puppeteer');
const page_file = 'file://' + path.resolve(here, '../../../index.html');
const out = process.argv[2] || path.join(process.env.PL || path.join(os.tmpdir(), 'pl'), 'cl/shots');
const fs = require('fs'); fs.mkdirSync(out, { recursive: true });
const TABS = ['t-cl-read', 't-cl-tour', 't-cl-quant', 't-cl-run'];
const browser = await puppeteer.launch({ headless: 'shell' });
let problems = 0;
for (const [w, scheme] of [[390, 'dark'], [920, 'light']]) {
  const p = await browser.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text()); });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.setViewport({ width: w, height: 900 });
  await p.goto(page_file, { waitUntil: 'load' });
  for (const t of TABS) {
    const ok = await p.evaluate(t => { if (!document.getElementById(t)) return false; window.SHOW_TAB(t); return true; }, t);
    if (!ok) { console.log('missing tab', t); problems++; continue; }
    await new Promise(r => setTimeout(r, 300));
    // click every control inside the tab (buttons, selects, ranges), in order
    const n = await p.evaluate(async t => {
      const tab = document.getElementById(t); let k = 0;
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      for (const b of [...tab.querySelectorAll('button')]) { if (b.offsetParent === null && !b.closest('[hidden]')) continue; b.click(); k++; await sleep(15); }
      for (const s of [...tab.querySelectorAll('select')]) { for (const o of s.options) { s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); k++; await sleep(15); } }
      for (const r of [...tab.querySelectorAll('input[type=range]')]) { for (const v of [r.min, r.max, (+r.min + +r.max) / 2]) { r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); k++; await sleep(15); } }
      // open every reveal so its content is checked too
      tab.querySelectorAll('.cl-rv').forEach(b => { const a = document.getElementById(b.dataset.for); if (a && a.hidden) b.click(); });
      tab.querySelectorAll('details').forEach(d => d.open = true);
      return k;
    }, t);
    await new Promise(r => setTimeout(r, 200));
    const bad = await p.evaluate(t => {
      const tab = document.getElementById(t), txt = tab.innerText;
      const found = [];
      for (const re of [/\bNaN\b/, /\bundefined\b(?! behaviour)/, /\bmissing\b/, /Infinity/]) { const m = txt.match(re); if (m) found.push(re + ' near: ' + txt.slice(Math.max(0, m.index - 60), m.index + 40).replace(/\s+/g, ' ')); }
      [...tab.querySelectorAll('.cl-num,[data-clv],td')].forEach(e => { if (/^\s*\?\s*$|\?\s*to|to\s*\?/.test(e.textContent)) found.push('unfilled value near: ' + (e.parentElement.textContent || '').slice(0, 80)); });
      const sx = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
      if (sx) { const wide = [...tab.querySelectorAll('*')].filter(e => e.getBoundingClientRect().right > document.documentElement.clientWidth + 1 && !e.closest('.tw,pre,.hmwrap,.nav,.tabs')).slice(0, 3).map(e => e.tagName + '.' + e.className + '#' + e.id); found.push('sideways scroll: ' + wide.join(', ')); }
      return found;
    }, t);
    bad.forEach(b => { console.log(w, scheme, t, b); problems++; });
    await p.screenshot({ path: `${out}/${t}_${w}_${scheme}.png`, fullPage: true });
    console.log(w, scheme, t, 'controls exercised:', n);
  }
  errs.forEach(e => { console.log(w, scheme, e); problems++; });
  await p.close();
}
await browser.close();
console.log('problems:', problems);
process.exit(problems ? 1 : 0);
