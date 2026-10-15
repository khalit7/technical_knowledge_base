// Exercise every control of the page at 390 px dark and 920 px light: click every button, move every range,
// change every select, in every tab; report script errors, NaN / undefined / [missing in visible text, sideways scroll.
// Optionally screenshot elements: SHOTS=<dir> node check_page.mjs <index.html> [selector ...]
// puppeteer is loaded from html_utils' node_modules.
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const [file, ...sels] = process.argv.slice(2);
const shots = process.env.SHOTS;
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
let bad = 0;
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + path.resolve(file));
  const tabs = await p.$$eval('#tabs button', bs => bs.map(b => b.dataset.t));
  let clicks = 0;
  for (const t of tabs) {
    await p.click(`#tabs button[data-t="${t}"]`);
    await new Promise(r => setTimeout(r, 150));
    // every control inside the tab, excluding links that switch tabs
    const n = await p.evaluate(t => {
      const root = document.getElementById(t); let c = 0;
      root.querySelectorAll('button').forEach(b => { if (b.offsetParent !== null) { b.click(); c++ } });
      root.querySelectorAll('input[type=range]').forEach(r => { for (const v of [r.min, r.max, Math.round((+r.min + +r.max) / 2)]) { r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true })); c++ } });
      root.querySelectorAll('select').forEach(s => { [...s.options].forEach(o => { s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); c++ }) });
      root.querySelectorAll('details').forEach(d => d.open = true);
      root.querySelectorAll('[data-xpclick]').forEach(e => { e.dispatchEvent(new MouseEvent('click', { bubbles: true })); c++ });
      return c;
    }, t);
    clicks += n;
    await new Promise(r => setTimeout(r, 150));
    const txt = await p.evaluate(t => document.getElementById(t).innerText, t);
    for (const w of [/\bNaN\b/, /\bundefined\b/, /\[missing/, /\bInfinity\b/]) { const m = txt.match(w); if (m) errs.push(`${t}: text contains ${m[0]}: ...${txt.slice(Math.max(0, m.index - 60), m.index + 30).replace(/\n/g, ' ')}...`) }
    const sw = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    if (sw) errs.push(`${t}: sideways scroll at ${width}`);
    if (shots) {
      for (const s of sels) {
        const el = await p.$(`#${t} ${s}`);
        if (el) { await el.screenshot({ path: `${shots}/${t}-${s.replace(/[^\w-]/g, '')}-${scheme}${width}.png` }).catch(() => {}) }
      }
    }
  }
  const box = await p.evaluate(() => { const d = document.getElementById('jsErr'); return d && !d.hidden ? d.textContent : '' });
  if (box) errs.push('error box: ' + box);
  console.log(scheme, width, 'tabs', tabs.length, 'controls exercised', clicks, 'errors', errs.length ? errs : '[]');
  if (errs.length) bad = 1;
  await p.close();
}
await b.close();
process.exit(bad);
