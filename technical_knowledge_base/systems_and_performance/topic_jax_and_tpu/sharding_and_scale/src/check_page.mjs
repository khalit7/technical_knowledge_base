// Click every control of every tab at 390 px dark and 920 px light; report script errors, NaN / undefined in visible
// text, sideways scroll; screenshot each section and card into <out dir>.
// usage: node check_page.mjs ../index.html <out dir> [tab]      (puppeteer from html_utils/node_modules)
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const require = createRequire(path.resolve('../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const [file, outDir, only] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell' });
let bad = 0;
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + path.resolve(file));
  const tabs = await p.$$eval('#tabs button', bs => bs.map(x => x.dataset.t));
  for (const t of tabs) {
    if (only && t !== only) continue;
    await p.click(`#tabs button[data-t=${t}]`);
    await new Promise(r => setTimeout(r, 250));
    // every control inside this tab
    const n = await p.$$eval(`#${t} button, #${t} select, #${t} input[type=range], #${t} summary`, xs => xs.length);
    for (let i = 0; i < n; i++) {
      await p.evaluate((t, i) => {
        const el = document.querySelectorAll(`#${t} button, #${t} select, #${t} input[type=range], #${t} summary`)[i];
        if (!el || el.offsetParent === null) return;
        if (el.tagName === 'SELECT') { for (const o of el.options) { el.value = o.value; el.dispatchEvent(new Event('change', { bubbles: true })) } }
        else if (el.tagName === 'INPUT') { for (const v of [el.min, el.max, (+el.min + +el.max) / 2]) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })) } }
        else el.click();
      }, t, i);
    }
    await new Promise(r => setTimeout(r, 150));
    const txt = await p.$eval(`#${t}`, el => el.innerText);
    const flags = [];
    for (const w of ['NaN', 'undefined', 'Infinity', '[object']) if (txt.includes(w)) flags.push(w + ': ' + txt.slice(Math.max(0, txt.indexOf(w) - 60), txt.indexOf(w) + 30).replace(/\s+/g, ' '));
    const sw = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    const box = await p.evaluate(() => { const d = document.getElementById('jsErr'); return d && !d.hidden ? d.textContent : '' });
    if (errs.length || flags.length || sw || box) { bad++; console.log('FAIL', scheme, width, t, JSON.stringify({ errs, flags, sw, box })) }
    else console.log('ok', scheme, width, t, 'controls', n);
    errs.length = 0;
    // screenshots: every section and every card
    const els = await p.$$(`#${t} section, #${t} .ss-card`);
    let k = 0;
    for (const el of els) {
      const box2 = await el.boundingBox();
      if (!box2 || box2.height < 10) continue;
      await el.screenshot({ path: path.join(outDir, `${t}-${scheme}-${width}-${String(k++).padStart(2, '0')}.png`) }).catch(() => {});
    }
  }
  await p.close();
}
await b.close();
console.log(bad ? 'FAILURES ' + bad : 'all ok');
