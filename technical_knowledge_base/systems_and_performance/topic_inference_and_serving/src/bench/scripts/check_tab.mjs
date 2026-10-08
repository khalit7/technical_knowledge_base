// usage: node check_tab.mjs <index.html> <outdir>
import { createRequire } from 'module';
const require = createRequire('<repo>/html_utils/package.json');
const puppeteer = require('puppeteer');
const [,, file, out] = process.argv;
const fs = require('fs'); fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
let fails = 0;
for (const [w, scheme] of [[390, 'dark'], [920, 'light']]) {
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text()); });
  await page.setViewport({ width: w, height: 900 });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await page.goto('file://' + file);
  await page.evaluate(() => { try { localStorage.clear() } catch (e) {} });
  await page.click('#tabs button[data-t="t-bench"]');
  await new Promise(r => setTimeout(r, 600));
  // scroll through so observers fire, then exercise every control
  const h = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < h; y += 700) { await page.evaluate(y => scrollTo(0, y), y); await new Promise(r => setTimeout(r, 60)); }
  const n = await page.evaluate(async () => {
    const tab = document.getElementById('t-bench'); let k = 0;
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    for (const b of tab.querySelectorAll('button')) { b.click(); k++; await sleep(5); }
    for (const s of tab.querySelectorAll('select')) { for (const o of s.options) { s.value = o.value; s.dispatchEvent(new Event('change')); k++; await sleep(5); } }
    for (const r of tab.querySelectorAll('input[type=range]')) { for (const v of [r.min, r.max, (+r.min + +r.max) / 2]) { r.value = v; r.dispatchEvent(new Event('input')); k++; await sleep(5); } }
    for (const c of tab.querySelectorAll('input[type=checkbox]')) { c.click(); c.dispatchEvent(new Event('change')); c.click(); c.dispatchEvent(new Event('change')); k++; }
    // put selects back to their first option for the screenshot
    for (const s of tab.querySelectorAll('select')) { s.selectedIndex = 0; s.dispatchEvent(new Event('change')); }
    return k;
  });
  await new Promise(r => setTimeout(r, 400));
  const res = await page.evaluate(() => {
    const tab = document.getElementById('t-bench'); const txt = tab.innerText;
    const bad = []; ['NaN', 'undefined', '??', 'Infinity', 'null'].forEach(s => { if (txt.includes(s)) bad.push(s + ' @ ' + txt.slice(Math.max(0, txt.indexOf(s) - 60), txt.indexOf(s) + 30).replace(/\n/g, ' ')) });
    const jsErr = document.getElementById('jsErr'); const sx = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
    const wide = [...tab.querySelectorAll('*')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > document.documentElement.clientWidth + 1 && !e.closest('.tw,.bch-tblwrap,.nav,.hmwrap') }).slice(0, 5).map(e => e.tagName + '.' + e.className + '#' + e.id + ' ' + Math.round(e.getBoundingClientRect().right));
    const empty = [...tab.querySelectorAll('[data-f]')].filter(e => !e.textContent.trim() || e.textContent === '??').map(e => e.dataset.f);
    return { bad, jsErr: jsErr && !jsErr.hidden ? jsErr.textContent : '', sx, wide, empty };
  });
  await page.evaluate(() => scrollTo(0, 0));
  const secs = await page.$$('#t-bench > section, #t-bench > .grid, #t-bench > .co');
  let si = 0; for (const el of secs) { si++; try { await el.screenshot({ path: `${out}/sec_${w}_${scheme}_${String(si).padStart(2, '0')}.png` }); } catch (e) { } }
  const ok = !errs.length && !res.bad.length && !res.jsErr && !res.sx && !res.wide.length && !res.empty.length;
  if (!ok) fails++;
  console.log(w, scheme, 'controls', n, ok ? 'OK' : 'FAIL', JSON.stringify({ errs: errs.slice(0, 5), ...res }));
  await page.close();
}
await browser.close();
console.log('fails', fails);
