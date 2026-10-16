// Launch lab UI check: open the page, show the Launch tab, click every control at 390 px dark and 920 px light,
// report JS errors, NaN/undefined in the tab's text, sideways scroll and clipped SVGs; save screenshots.
// usage: node check_launch.mjs <index.html> <screenshot dir>
import { createRequire } from 'module';
import path from 'path';
const require = createRequire(path.resolve(process.cwd(), 'html_utils/package.json'));
const puppeteer = require('puppeteer');
const [file, shots] = process.argv.slice(2);
const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
let fails = 0;
try {
  for (const [w, scheme] of [[390, 'dark'], [920, 'light']]) {
    const page = await browser.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push('pageerror ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text()); });
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
    await page.setViewport({ width: w, height: 900 });
    await page.goto('file://' + path.resolve(file));
    await page.evaluate(() => { try { localStorage.clear() } catch (e) {} });
    await page.click('button[data-t="t-launch"]');
    await new Promise(r => setTimeout(r, 400));
    const n = await page.evaluate(() => document.querySelectorAll('#t-launch button, #t-launch select, #t-launch input[type=range], #t-launch details').length);
    // click every button (segments, animation controls, drills) and open every details
    await page.evaluate(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const T = document.getElementById('t-launch');
      for (const d of T.querySelectorAll('details')) d.open = true;
      let bs = [...T.querySelectorAll('button')];
      for (const b of bs) { b.scrollIntoView({ block: 'center' }); b.click(); await sleep(15); }
      bs = [...T.querySelectorAll('button')]; // rank buttons rebuilt per system
      for (const b of bs) { b.click(); await sleep(5); }
      for (const s of T.querySelectorAll('select')) { for (const o of s.options) { s.value = o.value; s.dispatchEvent(new Event('change')); await sleep(10); } }
      for (const r of T.querySelectorAll('input[type=range]')) { for (const v of [0, r.max / 2 | 0, r.max]) { r.value = v; r.dispatchEvent(new Event('input')); await sleep(10); } }
      // walk the env explorer over every system and rank
      for (const sb of T.querySelectorAll('#la-env-sys button')) { sb.click(); await sleep(10); for (const rb of T.querySelectorAll('#la-env-rank button')) { rb.click(); await sleep(5); } }
      for (const sb of T.querySelectorAll('#la-tl-mode button')) { sb.click(); await sleep(20); }
      document.querySelector('#la-tl-mode button').click();
    });
    await new Promise(r => setTimeout(r, 300));
    const res = await page.evaluate(() => {
      const T = document.getElementById('t-launch');
      const txt = T.innerText;
      const bad = (txt.match(/\bNaN\b|\bundefined\b|\[object Object\]/g) || []).length;
      const sideways = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
      const wide = [...T.querySelectorAll('svg')].filter(s => s.getBoundingClientRect().right > document.documentElement.clientWidth + 1).length;
      const em = (document.documentElement.outerHTML.match(/\u2014/g) || []).length;
      const jsErr = !document.getElementById('jsErr').hidden;
      return { bad, sideways, wide, em, jsErr, sw: document.documentElement.scrollWidth };
    });
    const ok = !errs.length && !res.bad && !res.sideways && !res.wide && !res.em && !res.jsErr;
    if (!ok) fails++;
    console.log(`${w} ${scheme}: controls=${n} errors=${errs.length} NaN/undefined=${res.bad} sideways=${res.sideways} (scrollWidth ${res.sw}) wideSVG=${res.wide} emdash=${res.em} jsErr=${res.jsErr} ${ok ? 'OK' : 'FAIL'}`);
    errs.slice(0, 5).forEach(e => console.log('  ' + e));
    // screenshots: each section
    for (const id of ['la-s1', 'la-s3', 'la-s4', 'la-s5', 'la-s7', 'la-hang-sum', 'la-tools', 'la-s8']) {
      const el = await page.$('#' + id); if (!el) continue;
      await el.scrollIntoView();
      await el.screenshot({ path: path.join(shots, `la_${w}_${scheme}_${id}.png`) }).catch(() => {});
    }
    await page.close();
  }
} finally { await browser.close(); }
console.log(fails ? `FAIL (${fails})` : 'ALL OK');
