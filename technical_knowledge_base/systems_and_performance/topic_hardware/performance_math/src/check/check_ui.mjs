// Clicks every control at 390 px dark and 920 px light; fails on page errors, NaN, undefined or sideways scroll.
// Usage (from the repo root): node <page>/src/check/check_ui.mjs <page>/index.html <shots dir>
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
const require = createRequire(path.resolve('html_utils/package.json'));
const puppeteer = require('puppeteer');
const [file, shots] = process.argv.slice(2);
fs.mkdirSync(shots, { recursive: true });
const url = 'file://' + path.resolve(file);
const browser = await puppeteer.launch({ headless: 'shell' });
let fails = 0, checks = 0;
for (const [w, scheme] of [[390, 'dark'], [920, 'light']]) {
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.setViewport({ width: w, height: 900 });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch (e) {} });
  await page.goto(url, { waitUntil: 'load' });
  const bad = async tag => {
    checks++;
    const r = await page.evaluate(() => { const t = document.body.innerText; return { nan: /\bNaN\b/.test(t), und: /\bundefined\b/.test(t), inf: /\bInfinity\b/.test(t), sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, err: document.getElementById('jsErr').hidden ? '' : document.getElementById('jsErr').textContent }; });
    const p = []; if (r.nan) p.push('NaN'); if (r.und) p.push('undefined'); if (r.inf) p.push('Infinity'); if (r.sw > r.cw + 1) p.push('scroll ' + r.sw + '>' + r.cw); if (r.err) p.push('errbox ' + r.err);
    if (p.length) { fails++; console.log('FAIL', w, scheme, tag, p.join(', ')); }
  };
  const setVal = (id, v) => page.evaluate((id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); }, id, v);
  // Reading: the memory animation in each mode, stepped to the loss and to the end
  for (const m of ['eager', 'flash', 'ckpt']) {
    await page.evaluate(m => document.querySelector('#rd-mem-mode button[data-m="' + m + '"]').click(), m);
    for (let i = 0; i < 34; i++) await page.click('#rd-mem-ctl-f');
    await bad('mem ' + m + ' at loss');
    const el = await page.$('#rd-mem-card'); await el.screenshot({ path: `${shots}/rd-mem-${m}-${w}-${scheme}.png` });
    for (let i = 0; i < 20; i++) await page.click('#rd-mem-ctl-f');
    await page.click('#rd-mem-zoom'); await bad('mem zoom ' + m); await page.click('#rd-mem-zoom');
  }
  await page.evaluate(() => { const s = document.getElementById('rd-mem-ctl-s'); s.value = 66; s.dispatchEvent(new Event('input')); });
  await bad('mem end');
  await page.evaluate(() => document.querySelectorAll('#t-read .pr .opts button').forEach(b => b.click()));
  await bad('read drills');
  for (const id of ['rd-led-card']) { const el = await page.$('#' + id); await el.screenshot({ path: `${shots}/${id}-${w}-${scheme}.png` }); }
  { const el = await page.$('#rd-m1'); await el.screenshot({ path: `${shots}/rd-m1-${w}-${scheme}.png` }); }
  // Ledger
  await page.click('#tabs button[data-t="t-ledger"]');
  for (const m of ['l8', 'l70', 'l405']) for (const s of [9, 11, 13, 15, 17]) { await setVal('lg-model', m); await setVal('lg-seq', s); await bad('ledger ' + m + ' ' + s); }
  for (const c of ['causal', 'full']) for (const k of ['eager', 'ckpt', 'flash']) { await setVal('lg-conv', c); await setVal('lg-ck', k); await bad('ledger ' + c + ' ' + k); }
  for (const t of ['8', '1']) await setVal('lg-tp', t);
  for (const c of ['rtx5090', 'b200', 'mi300x', 'h100']) await setVal('lg-chip', c);
  await setVal('lg-mb', 16); await bad('ledger mb16'); await setVal('lg-mb', 1); await setVal('lg-model', 'l8'); await setVal('lg-seq', 13);
  await page.screenshot({ path: `${shots}/t-ledger-${w}-${scheme}.png`, fullPage: true });
  // Planner
  await page.click('#tabs button[data-t="t-plan"]');
  for (const m of ['l8', 'l70', 'l405', 'q32', 'q235', 'dsv3', 'oss120']) for (const c of ['h100', 'b200', 'gb200', 'mi300x', 'v6e', 'v7']) { await setVal('pl-model', m); await setVal('pl-chip', c); await bad('plan ' + m + ' ' + c); }
  for (const [id, v] of [['pl-mfu', 0.1], ['pl-mfu', 0.6], ['pl-good', 0.5], ['pl-days', 1], ['pl-days', 730], ['pl-tok', 1], ['pl-seq', 32768], ['pl-seq', 0]]) { await setVal(id, v); await bad('plan ' + id + ' ' + v); }
  await setVal('pl-model', 'l8'); await setVal('pl-chip', 'h100'); await setVal('pl-days', 30); await setVal('pl-tok', 15000); await setVal('pl-mfu', 0.4); await setVal('pl-good', 0.9); await setVal('pl-seq', 0);
  for (const m of ['l8', 'l70', 'l405', 'q235', 'dsv3', 'oss120']) for (const c of ['h100', 'h200', 'b200', 'gb200', 'mi300x', 'rtx5090']) {
    await setVal('sv-model', m); await setVal('sv-chip', c);
    for (const n of ['1', '8']) { await setVal('sv-n', n); await bad('serve ' + m + ' ' + c + ' ' + n); } }
  for (const [id, v] of [['sv-fmt', 'fp8'], ['sv-fmt', 'nvfp4'], ['sv-kv', '1'], ['sv-ctx', '65536'], ['sv-eff', 0.3], ['sv-price', 0], ['sv-ctx', '1024']]) { await setVal(id, v); await bad('serve ' + id + ' ' + v); }
  await setVal('sv-model', 'l8'); await setVal('sv-chip', 'h100'); await setVal('sv-n', '1'); await setVal('sv-fmt', 'native'); await setVal('sv-kv', '2'); await setVal('sv-ctx', '4096'); await setVal('sv-eff', 0.7);
  await page.screenshot({ path: `${shots}/t-plan-${w}-${scheme}.png`, fullPage: true });
  await page.click('#tabs button[data-t="t-more"]'); await bad('more');
  await page.click('#tabs button[data-t="t-read"]'); await bad('read again');
  if (errs.length) { fails++; console.log('ERRORS', w, scheme, errs.slice(0, 5)); }
  await page.close();
}
await browser.close();
console.log(fails ? 'UI FAIL ' + fails + ' of ' + checks : 'UI OK, ' + checks + ' states checked');
process.exit(fails ? 1 : 0);
