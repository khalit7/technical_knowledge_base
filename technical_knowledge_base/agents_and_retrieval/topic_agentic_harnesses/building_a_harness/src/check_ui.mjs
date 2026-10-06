// Click every control on every tab at 390 px dark and 920 px light; fail on page errors, NaN or
// undefined in visible text, or sideways scroll. Usage (from html_utils/): node <this file> <index.html>
import { createRequire } from 'module';
import path from 'path';
const require = createRequire(path.resolve('package.json'));
const puppeteer = require('puppeteer');
const file = path.resolve(process.argv[2]);
const tabs = ['t-read', 't-tok', 't-edit', 't-stop', 't-more'];
let problems = 0;
const b = await puppeteer.launch({ headless: 'shell' });
for (const [w, scheme] of [[390, 'dark'], [920, 'light']]) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + file); await new Promise(r => setTimeout(r, 700));
  for (const t of tabs) {
    await p.evaluate(id => document.querySelector('#tabs button[data-t="' + id + '"]').click(), t);
    await new Promise(r => setTimeout(r, 300));
    const n = await p.evaluate(async (id) => {
      const tab = document.getElementById(id); let count = 0;
      const wait = ms => new Promise(r => setTimeout(r, ms));
      for (const d of tab.querySelectorAll('details')) { d.open = true; count++ }
      for (const s of tab.querySelectorAll('select')) { for (const o of s.options) { s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); count++; await wait(30) } }
      for (const r of tab.querySelectorAll('input[type=range]')) { for (const v of [r.min, Math.round((+r.min + +r.max) / 2), r.max]) { r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); count++; await wait(20) } }
      for (const c of tab.querySelectorAll('input[type=checkbox]')) { c.click(); count++; await wait(20); c.click() }
      for (const btn of tab.querySelectorAll('button')) { btn.click(); count++; await wait(15) }
      const cells = [...tab.querySelectorAll('td.c, tbody tr[data-id], #hbt-grid span[data-i]')];
      for (const c of cells.filter((_, i) => i % 7 === 0).slice(0, 40)) { c.click(); count++; await wait(10) }
      return count;
    }, t);
    await new Promise(r => setTimeout(r, 300));
    const res = await p.evaluate(id => {
      const tab = document.getElementById(id), txt = tab.innerText;
      return { nan: /\bNaN\b/.test(txt), undef: /\bundefined\b/.test(txt), sw: document.documentElement.scrollWidth, jsErr: document.getElementById('jsErr').textContent };
    }, t);
    const bad = res.nan || res.undef || res.sw > w || res.jsErr || errs.length;
    if (bad) problems++;
    console.log((bad ? 'FAIL ' : 'ok   ') + w + ' ' + scheme + ' ' + t + ': ' + n + ' controls' + (res.nan ? ' NaN' : '') + (res.undef ? ' undefined' : '') + (res.sw > w ? ' scrollWidth ' + res.sw : '') + (res.jsErr ? ' jsErr ' + res.jsErr : '') + (errs.length ? ' errors ' + errs.join(' | ') : ''));
  }
  await p.close();
}
await b.close();
process.exit(problems ? 1 : 0);
