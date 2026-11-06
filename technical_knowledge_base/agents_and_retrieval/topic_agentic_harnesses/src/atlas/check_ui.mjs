// Click every control of the Harness atlas tab at 390 dark, 920 light and 1400 light; report errors, NaN/undefined, sideways scroll.
import { createRequire } from 'module';
const require = createRequire(new URL('../../../../../html_utils/package.json', import.meta.url));
const puppeteer = require('puppeteer');
const FILE = 'file://' + process.argv[2];
const OUT = process.argv[3];
const browser = await puppeteer.launch({ headless: 'shell' });
for (const [scheme, w] of [['dark', 390], ['light', 920], ['light', 1400]]) {
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.setViewport({ width: w, height: 900 });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await page.goto(FILE);
  await page.evaluate(() => { try { localStorage.clear() } catch (e) {} });
  await page.click('#tabs button[data-t="t-atlas"]');
  const clickAll = async sel => { const n = await page.$$eval(sel, els => els.length); for (let i = 0; i < n; i++) { await page.evaluate((s, i) => { const e = document.querySelectorAll(s)[i]; if (e) e.click() }, sel, i); } return n; };
  const counts = {};
  counts.fam = await clickAll('#atl-fam button');
  counts.prop = await clickAll('#atl-prop button');
  await clickAll('#atl-prop button'); // untoggle
  await page.evaluate(() => document.querySelector('#atl-fam button').click());
  counts.cells = await clickAll('#atl-mat td.atl-c');
  // compare: every left option against a fixed right
  counts.cmp = await page.evaluate(() => { const a = document.getElementById('atl-ca'); let n = 0; for (const o of a.options) { a.value = o.value; a.dispatchEvent(new Event('change')); n++ } document.getElementById('atl-cswap').click(); return n });
  counts.need = await clickAll('#atl-need input');
  await clickAll('#atl-need input');
  counts.ef = await clickAll('#atl-efb button');
  counts.sets = await page.evaluate(() => { const s = document.getElementById('atl-sset'), m = document.getElementById('atl-smet'); let n = 0;
    for (const o of s.options) { s.value = o.value; s.dispatchEvent(new Event('change')); for (const mm of ['v', 'c']) { m.value = mm; m.dispatchEvent(new Event('change')); document.querySelectorAll('#atl-schart .atl-hit').forEach(h => { h.dispatchEvent(new MouseEvent('click', { bubbles: true })); n++ }) } }
    s.value = 'htswe'; s.dispatchEvent(new Event('change')); return n });
  // Fig. 1 (the 3D stage stg-tax, 2026-11-06): step through it with its own controls and its step list
  counts.anim = await page.evaluate(() => { const f = document.getElementById('stg-tax-f'); for (let i = 0; i < 6; i++) f.click(); document.getElementById('stg-tax-b').click(); [...document.querySelectorAll('#sx-tax li')].forEach(li => li.click()); return 7 + document.querySelectorAll('#sx-tax li').length });
  counts.iq = await page.evaluate(() => { document.querySelectorAll('#t-atlas details').forEach(d => d.open = true); return document.querySelectorAll('#atl-iq p').length });
  const r = await page.evaluate((w) => {
    const t = document.getElementById('t-atlas'); const txt = t.innerText;
    const bad = (txt.match(/\bNaN\b|\bundefined\b|\bnull\b|Infinity/g) || []);
    const wide = [];
    t.querySelectorAll('*').forEach(e => { const b = e.getBoundingClientRect(); if (b.right > w - 15 && b.width > 0 && !e.closest('.atl-wrap,.tw,pre,.nav')) wide.push(e.tagName + '#' + e.id + '.' + e.className + ' ' + Math.round(b.right)) });
    const na = [...t.querySelectorAll('[data-atl]')].filter(s => s.textContent === 'n/a' || s.textContent === '').map(s => s.dataset.atl);
    return { bad, sideways: document.documentElement.scrollWidth > w, wide: wide.slice(0, 8), sw: document.documentElement.scrollWidth, na, links: t.querySelectorAll('a[href^="http"]').length };
  }, w);
  await page.screenshot({ path: `${OUT}/atlas-${scheme}-${w}.png`, fullPage: true });
  console.log(scheme, w, JSON.stringify({ errs, ...r, counts }));
  await page.close();
}
await browser.close();
