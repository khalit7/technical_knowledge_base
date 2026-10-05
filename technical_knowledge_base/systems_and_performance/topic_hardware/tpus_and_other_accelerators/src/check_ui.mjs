// Clicks every control at 390 px dark and 920 px light; fails on page errors, NaN, undefined or sideways scroll.
// Usage (from the repo root): node <page>/src/check_ui.mjs <page>/index.html <shots dir>
import { createRequire } from 'module';
import path from 'path';
const require = createRequire(path.resolve('html_utils/package.json'));
const puppeteer = require('puppeteer');
const [file, shots] = process.argv.slice(2);
const url = 'file://' + path.resolve(file);
const browser = await puppeteer.launch({ headless: 'shell' });
let fails = 0;
for (const [w, scheme] of [[390, 'dark'], [920, 'light']]) {
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.setViewport({ width: w, height: 900 });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch (e) {} });
  await page.goto(url, { waitUntil: 'load' });
  const clickAll = async sel => { const n = await page.$$eval(sel, a => a.length); for (let i = 0; i < n; i++) { await page.evaluate((s, i) => { const b = document.querySelectorAll(s)[i]; if (b && b.offsetParent) b.click(); }, sel, i); } };
  const bad = async tag => {
    const r = await page.evaluate(() => { const t = document.body.innerText; return { nan: /\bNaN\b/.test(t), und: /\bundefined\b/.test(t), sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, err: document.getElementById('jsErr').hidden ? '' : document.getElementById('jsErr').textContent }; });
    const p = []; if (r.nan) p.push('NaN'); if (r.und) p.push('undefined'); if (r.sw > r.cw + 1) p.push('scroll ' + r.sw + '>' + r.cw); if (r.err) p.push('errbox ' + r.err);
    if (p.length) { fails++; console.log('FAIL', w, scheme, tag, p.join(', ')); }
  };
  // Reading
  for (const sel of ['#rd-sys-mode button', '#rd-tor-mode button', '#rd-fit-mod button', '#rd-fit-prec button', '#t-read .pr .opts button']) await clickAll(sel);
  await page.evaluate(() => { document.querySelector('#rd-sys-mode button[data-m="sys"]').click(); });
  for (let i = 0; i < 16; i++) await page.click('#rd-sys-ctl-f');
  await page.evaluate(() => { document.querySelectorAll('#rd-tor-svg g[data-c]')[27].dispatchEvent(new MouseEvent('click', { bubbles: true })); });
  await bad('read');
  for (const id of ['rd-sys-card', 'rd-tor-card', 'rd-fit-card']) { const el = await page.$('#' + id); await el.screenshot({ path: `${shots}/${id}-${w}-${scheme}.png` }); }
  await page.evaluate(() => { document.querySelector('#rd-sys-mode button[data-m="lanes"]').click(); });
  for (let i = 0; i < 9; i++) await page.click('#rd-sys-ctl-f');
  { const el = await page.$('#rd-sys-card'); await el.screenshot({ path: `${shots}/rd-sys-lanes-${w}-${scheme}.png` }); }
  await bad('read lanes');
  // Systolic lab
  await page.click('#tabs button[data-t="t-sys"]');
  const pres = await page.$$eval('#sy-pre button', a => a.length);
  for (let i = 0; i < pres; i++) { await page.evaluate(i => document.querySelectorAll('#sy-pre button')[i].click(), i); await bad('sys preset ' + i); }
  for (const r of ['8', '32', '256', '320', '128']) { await page.select('#sy-r', r); }
  await page.evaluate(() => { const m = document.getElementById('sy-m'); for (const v of [0, 7, 14]) { m.value = v; m.dispatchEvent(new Event('input')); } const k = document.getElementById('sy-k'); k.value = 130; k.dispatchEvent(new Event('change')); });
  await clickAll('#sy-sweep button');
  await page.evaluate(() => { for (const [id, v] of [['sy-am', 12], ['sy-ak', 10], ['sy-an', 10], ['sy-am', 1]]) { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input')); } });
  for (let i = 0; i < 5; i++) await page.click('#sy-actl-f');
  await bad('sys');
  await page.screenshot({ path: `${shots}/t-sys-${w}-${scheme}.png`, fullPage: true });
  // Pod builder
  await page.click('#tabs button[data-t="t-pod"]');
  const pp = await page.$$eval('#pd-pre button', a => a.length);
  for (const g of ['v4', '7x', 'v5p']) { await page.select('#pd-gen', g); for (let i = 0; i < pp; i++) { await page.evaluate(i => document.querySelectorAll('#pd-pre button')[i].click(), i); for (const a of ['pd-ax1', 'pd-ax2']) await page.click('#' + a); await bad('pod ' + g + ' ' + i); } }
  await page.evaluate(() => { const v = document.getElementById('pd-v'); for (const x of [0, 12, 9]) { v.value = x; v.dispatchEvent(new Event('input')); } });
  await page.select('#pd-x', '32'); await page.select('#pd-y', '32'); await page.select('#pd-z', '32');
  await bad('pod big');
  await page.select('#pd-x', '4'); await page.select('#pd-y', '4'); await page.select('#pd-z', '4');
  await page.screenshot({ path: `${shots}/t-pod-${w}-${scheme}.png`, fullPage: true });
  await page.click('#tabs button[data-t="t-more"]'); await bad('more');
  await page.click('#tabs button[data-t="t-read"]'); await bad('read again');
  if (errs.length) { fails++; console.log('ERRORS', w, scheme, errs.slice(0, 5)); }
  // JS checks against the Python reference
  const res = await page.evaluate(() => ({ rd: window.__tpuRdSys, fit: [0, 1, 2].map(m => window.__tpuFit(m, 2)) }));
  console.log(w, scheme, 'rd cycles', res.rd.cycles, 'passes', res.rd.passes, 'fit', JSON.stringify(res.fit));
  await page.close();
}
await browser.close();
console.log(fails ? 'UI FAIL ' + fails : 'UI OK');
process.exit(fails ? 1 : 0);
