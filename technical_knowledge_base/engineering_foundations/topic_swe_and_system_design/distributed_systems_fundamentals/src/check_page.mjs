// Click every control of ../index.html at 390 px dark and 920 px light; report errors, NaN/undefined text, sideways scroll.
// Run from this folder: node check_page.mjs  (puppeteer from html_utils/node_modules; Chrome headless 'shell'). Screenshots in ../.shots/check/.
import { createRequire } from 'module'; import path from 'path'; import fs from 'fs'; import { fileURLToPath } from 'url';
const H = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(H, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const out = path.join(H, '../.shots/check'); fs.mkdirSync(out, { recursive: true });
const file = 'file://' + path.join(H, '../index.html');
const only = process.argv[2] || '';
let problems = 0;
const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
for (const [w, scheme] of [[390, 'dark'], [920, 'light']]) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: 900 });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  const errs = []; page.on('pageerror', e => errs.push('pageerror: ' + e.message)); page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()) });
  await page.goto(file, { waitUntil: 'load' });
  await page.evaluate(() => { try { localStorage.clear() } catch (e) {} });
  await page.reload({ waitUntil: 'load' });
  const tabs = await page.$$eval('#tabs button', b => b.map(x => x.dataset.t));
  for (const t of tabs) {
    if (only && t !== only) continue;
    await page.click('#tabs button[data-t="' + t + '"]'); await new Promise(r => setTimeout(r, 300));
    // click every button and change every range/select inside the tab (twice through, ends on varied states)
    const n = await page.evaluate(async (t) => {
      const tab = document.getElementById(t); let c = 0; const sleep = ms => new Promise(r => setTimeout(r, ms));
      for (let pass = 0; pass < 2; pass++) {
        for (const b of [...tab.querySelectorAll('button')]) { if (b.offsetParent === null) continue; b.click(); c++; await sleep(15) }
        for (const r of [...tab.querySelectorAll('input[type=range]')]) { if (r.offsetParent === null) continue; const vals = [r.min, r.max, Math.round((+r.min + +r.max) / 2)]; for (const v of vals) { r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); c++; await sleep(10) } }
        for (const s of [...tab.querySelectorAll('select')]) { if (s.offsetParent === null) continue; for (const o of s.options) { s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); c++; await sleep(10) } }
        for (const s of [...tab.querySelectorAll('input[type=checkbox]')]) { s.click(); c++ }
      }
      return c;
    }, t);
    await new Promise(r => setTimeout(r, 400));
    const res = await page.evaluate((t) => {
      const tab = document.getElementById(t); const txt = tab.innerText;
      const bad = (txt.match(/.{0,40}\b(NaN|undefined|Infinity|null)\b.{0,40}/g) || []);
      return { bad, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, jsErr: !document.getElementById('jsErr').hidden ? document.getElementById('jsErr').textContent : '' };
    }, t);
    const line = `${w} ${scheme} ${t}: ${n} actions; sideways=${res.sw > res.cw ? res.sw + '>' + res.cw : 'no'}; bad=${res.bad.length}; jsErr=${res.jsErr ? 'YES' : 'no'}`;
    console.log(line); if (res.bad.length) console.log('   ', res.bad.slice(0, 5)); if (res.jsErr) console.log('   ', res.jsErr);
    if (res.bad.length || res.sw > res.cw || res.jsErr) problems++;
    await page.screenshot({ path: path.join(out, `${t}_${w}_${scheme}.png`), fullPage: true });
  }
  if (errs.length) { problems++; console.log(w, scheme, 'ERRORS', errs.slice(0, 10)) }
  await page.close();
}
await browser.close();
console.log('problems=' + problems); process.exit(problems ? 1 : 0);
