// Click every control at 390 px dark and 920 px light; report errors, NaN/undefined text, sideways scroll; screenshots to ../.shots/own_*.png
import { createRequire } from 'module';
import path from 'path';import { fileURLToPath } from 'url';
const require = createRequire(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const here = path.dirname(fileURLToPath(import.meta.url));
const file = 'file://' + path.resolve(here, '../index.html');
const shots = path.resolve(here, '../.shots');
const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
let bad = 0;
for (const [w, scheme] of [[390, 'dark'], [920, 'light']]) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: 900 });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  const errs = [];
  page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await page.goto(file, { waitUntil: 'load' });
  await page.evaluate(() => { try { localStorage.clear() } catch (e) {} });
  const tabs = await page.$$eval('#tabs button', bs => bs.map(b => b.dataset.t));
  for (const t of tabs) {
    await page.click(`#tabs button[data-t="${t}"]`); await new Promise(r => setTimeout(r, 150));
    const n = await page.evaluate(async (t) => {
      const tab = document.getElementById(t); let k = 0; if (!tab) return -1;
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      for (const b of [...tab.querySelectorAll('button')]) { if (b.id === 'ga-play') continue; b.click(); k++; await sleep(10) }
      for (const s of [...tab.querySelectorAll('select')]) { for (const o of [...s.options]) { s.value = o.value; s.dispatchEvent(new Event('change')); s.dispatchEvent(new Event('input')); k++; await sleep(5) } }
      for (const r of [...tab.querySelectorAll('input[type=range]')]) { for (const v of [r.min, r.max, (+r.min + +r.max) / 2]) { r.value = v; r.dispatchEvent(new Event('input')); r.dispatchEvent(new Event('change')); k++; await sleep(5) } }
      for (const c of [...tab.querySelectorAll('input[type=checkbox]')]) { c.click(); k++; await sleep(5); c.click() }
      return k;
    }, t);
    const txt = await page.evaluate(t => (document.getElementById(t)||{innerText:''}).innerText, t);
    const m = txt.match(/.{0,40}(NaN|undefined|Infinity).{0,40}/);
    const sw = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    if (m || sw[0] > sw[1]) { bad++; console.log(w, t, 'PROBLEM', m && m[0], sw) }
    console.log(w, scheme, t, 'controls', n);
    await page.screenshot({ path: `${shots}/own_${w}_${t}.png`, fullPage: true });
  }
  // animation: every step in both modes
  await page.click('#tabs button[data-t="t-read"]');
  for (const md of ['ga-m0', 'ga-m1']) {
    await page.click('#' + md);
    for (let s = 0; s < 7; s++) {
      await page.evaluate(s => { const r = document.getElementById('ga-scrub'); r.value = s; r.dispatchEvent(new Event('input')) }, s);
      const t = await page.$eval('#ga', e => e.innerText);
      if (/NaN|undefined/.test(t)) { bad++; console.log('anim NaN', md, s) }
      if (s >= 3) { const el = await page.$('#ga'); await el.screenshot({ path: `${shots}/own_${w}_anim_${md}_${s}.png` }) }
    }
  }
  { const el = await page.$('#fr'); await el.screenshot({ path: `${shots}/own_${w}_frontier.png` }) }
  if (errs.length) { bad++; console.log(w, 'ERRORS', errs) }
  await page.close();
}
await browser.close();
console.log('own check problems:', bad);
