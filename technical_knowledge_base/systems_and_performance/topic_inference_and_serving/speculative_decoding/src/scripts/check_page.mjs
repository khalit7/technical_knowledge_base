// usage: node check_page.mjs <shots dir> [full]
// Loads ../../index.html at 390 dark and 920 light, opens every tab, clicks every button, select and slider
// (when "full"), and reports JS errors, NaN/undefined in visible text, and sideways scroll.
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, '../../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const fs = require('fs');
const file = path.join(here, '../../index.html');
const [,, shots, full] = process.argv;
fs.mkdirSync(shots, { recursive: true });
const browser = await puppeteer.launch({ headless: 'shell' });
let bad = 0;
for (const [w, scheme] of [[390, 'dark'], [920, 'light']]) {
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text()); });
  await page.setViewport({ width: w, height: 900 });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.goto('file://' + file, { waitUntil: 'load' });
  const tabs = await page.$$eval('#tabs button', bs => bs.map(b => b.dataset.t));
  for (const t of tabs) {
    await page.click('#tabs button[data-t="' + t + '"]');
    await new Promise(r => setTimeout(r, 300));
    if (full) {
      await page.evaluate(t => document.querySelectorAll('#' + t + ' details').forEach(d => d.open = true), t);
      const n = await page.$$eval('#' + t + ' button', b => b.length);
      for (let i = 0; i < n; i++) await page.evaluate((t, i) => { const b = document.querySelectorAll('#' + t + ' button')[i]; if (b && b.offsetParent) b.click(); }, t, i);
      await page.evaluate(t => {
        document.querySelectorAll('#' + t + ' input[type=range]').forEach(r => { for (const v of [r.min, r.max, (+r.min + +r.max) / 2]) { r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); } });
        document.querySelectorAll('#' + t + ' select').forEach(s => { for (const o of s.options) { s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); } });
        document.querySelectorAll('#' + t + ' .sd-strip span[data-i]').forEach((s, i) => { if (i % 17 === 0) s.click(); });
      }, t);
      await new Promise(r => setTimeout(r, 200));
    }
    const res = await page.evaluate(t => {
      const txt = document.getElementById(t).innerText;
      return { nan: (txt.match(/NaN|undefined|Infinity|\[object/g) || []).length, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth };
    }, t);
    if (res.nan || res.sw > res.cw + 1) { bad++; console.log('PROBLEM', w, t, JSON.stringify(res)); }
    await page.screenshot({ path: `${shots}/${t}_${w}.png`, fullPage: true });
  }
  const je = await page.$eval('#jsErr', e => e.hidden ? '' : e.textContent);
  if (je) { bad++; console.log('jsErr', w, je.slice(0, 500)); }
  if (errs.length) { bad++; console.log('errors', w, errs.slice(0, 10).join('\n')); }
  await page.close();
}
// normal motion: nothing may play before the reader acts (2026-10-23)
{ const page = await browser.newPage(); await page.setViewport({ width: 920, height: 900 });
  await page.goto('file://' + file, { waitUntil: 'load' });
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } });
  await new Promise(r => setTimeout(r, 2500));
  const playing = await page.$$eval('.an-play', bs => bs.filter(b => /Pause/.test(b.textContent)).length);
  if (playing) { bad++; console.log('autoplay', playing); } else console.log('no autoplay');
  await page.close(); }
await browser.close();
console.log('bad=' + bad);
