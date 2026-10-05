// Click every control on every tab at 390 px dark and 920 px light; report errors, NaN, undefined and sideways scroll.
// Usage: node check_ui.mjs <html_utils node_modules dir> <screenshot dir>
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
const [HNM, OUT] = process.argv.slice(2);
const puppeteer = createRequire(HNM + '/')('puppeteer');
const page_url = 'file://' + path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../index.html');
const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
let bad = 0;
for (const [w, scheme] of [[390, 'dark'], [920, 'light']]) {
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()) });
  await page.setViewport({ width: w, height: 900 });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await page.goto(page_url, { waitUntil: 'load' });
  await page.evaluate(() => { try { localStorage.clear() } catch (e) {} });
  const tabs = await page.$$eval('#tabs button', bs => bs.map(b => b.dataset.t));
  for (const t of tabs) {
    await page.click(`#tabs button[data-t="${t}"]`);
    await new Promise(r => setTimeout(r, 300));
    const n = await page.evaluate(async t => {
      const root = document.getElementById(t); let c = 0;
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      for (const b of [...root.querySelectorAll('button')]) { if (b.offsetParent === null) continue; b.click(); c++; if (c % 15 === 0) await sleep(20); }
      for (const s of [...root.querySelectorAll('select')]) { for (const o of [...s.options]) { s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); c++ } }
      for (const r of [...root.querySelectorAll('input[type=range]')]) { for (const v of [r.min, r.max, Math.round((+r.min + +r.max) / 2)]) { r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); c++ } }
      for (const d of [...root.querySelectorAll('details')]) { d.open = true }
      return c;
    }, t);
    await new Promise(r => setTimeout(r, 400));
    const res = await page.evaluate(t => {
      const root = document.getElementById(t); const txt = root.innerText;
      const err = document.getElementById('jsErr');
      return { nan: /\bNaN\b/.test(txt), undef: /\bundefined\b/.test(txt), wide: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        sw: document.documentElement.scrollWidth, errbox: err && !err.hidden ? err.textContent : '' };
    }, t);
    const prob = res.nan || res.undef || res.wide || res.errbox;
    if (prob) bad++;
    console.log(`${w} ${scheme} ${t}: ${n} controls${res.nan ? ' NaN' : ''}${res.undef ? ' undefined' : ''}${res.wide ? ' WIDE(' + res.sw + ')' : ''}${res.errbox ? ' ERRBOX ' + res.errbox : ''}`);
    await page.screenshot({ path: `${OUT}/${w}_${scheme}_${t}.png`, fullPage: true });
  }
  if (errs.length) { bad++; console.log('errors:', errs.slice(0, 8).join(' | ')) }
  await page.close();
}
await browser.close();
console.log(bad ? `PROBLEMS ${bad}` : 'ui ok');
