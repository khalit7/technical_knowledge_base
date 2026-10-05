// Click every control of the Harness atlas tab at 390 dark and 920 light; report errors, NaN/undefined, sideways scroll.
import { createRequire } from 'module';
const require = createRequire(new URL('../../../../../html_utils/package.json', import.meta.url));
const puppeteer = require('puppeteer');
const FILE = 'file://' + process.argv[2];
const OUT = process.argv[3];
const browser = await puppeteer.launch({ headless: 'shell' });
for (const [scheme, w] of [['dark', 390], ['light', 920]]) {
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
    s.value = 'tb20'; s.dispatchEvent(new Event('change')); return n });
  counts.anim = await page.evaluate(() => { const f = document.getElementById('atl-afwd'); for (let i = 0; i < 14; i++) f.click(); document.getElementById('atl-aback').click(); const r = document.getElementById('atl-ascrub'); r.value = 5; r.dispatchEvent(new Event('input')); return 16 });
  await page.click('#atl-aplay'); await new Promise(r => setTimeout(r, 1200)); await page.click('#atl-aplay');
  counts.rl = await page.evaluate(() => { let n = 0; for (const m of document.querySelectorAll('#atl-rmode button')) { m.click(); for (let i = 0; i < 6; i++) { document.getElementById('atl-rfwd').click(); n++ } document.getElementById('atl-rback').click() } return n });
  counts.rth = await clickAll('#atl-rtab th');
  counts.drill = await page.evaluate(() => { let n = 0; document.querySelectorAll('#atl-drills .atl-drill').forEach(d => { const b = d.querySelectorAll('button'); b[0].click(); b[b.length - 1].click(); n++ }); document.querySelectorAll('#atl-iq details').forEach(d => d.open = true); return n });
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
