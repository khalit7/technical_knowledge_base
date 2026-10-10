// Puppeteer check of the page: every tab, every button, select and range, every stepper run stepped end to end,
// at 390 px dark and 920 px light. Fails on page errors, NaN/undefined/Infinity in visible text, sideways scroll,
// a visible #jsErr box. usage: node check_ui.mjs <screenshot dir>
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const out = process.argv[2] || '/tmp';
const page_url = 'file://' + path.join(here, '..', 'index.html');
const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
let fail = 0;
for (const [w, scheme] of [[390, 'dark'], [920, 'light']]) {
  const p = await browser.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.setViewport({ width: w, height: 900 });
  await p.evaluateOnNewDocument(() => { try { localStorage.clear() } catch (e) {} });
  await p.goto(page_url, { waitUntil: 'load' });
  const tabs = await p.$$eval('#tabs button', bs => bs.map(b => b.dataset.t));
  for (const t of tabs) {
    await p.click(`#tabs button[data-t="${t}"]`);
    await new Promise(r => setTimeout(r, 200));
    // click every button inside the tab (not links), including step controls
    const n = await p.$$eval(`#${t} button`, bs => bs.length);
    for (let k = 0; k < n; k++) {
      await p.evaluate((t, k) => { const b = document.querySelectorAll(`#${t} button`)[k]; if (b && b.offsetParent) b.click(); }, t, k);
    }
    // ranges: min, max, middle
    await p.evaluate(t => { document.querySelectorAll(`#${t} input[type=range]`).forEach(r => { for (const v of [r.min, r.max, (+r.min + +r.max) / 2 | 0]) { r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true })); } }); }, t);
    await p.evaluate(t => { document.querySelectorAll(`#${t} select`).forEach(s => { [...s.options].forEach(o => { s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); }); }); }, t);
    if (t === 't-step') {
      // every run, every step
      const runs = await p.$$eval('#vl-st-seg button', bs => bs.length);
      for (let r = 0; r < runs; r++) {
        await p.evaluate(r => document.querySelectorAll('#vl-st-seg button')[r].click(), r);
        const max = await p.$eval('#vl-st-ctl-s', e => +e.max);
        for (let i = 0; i <= max; i++) {
          await p.evaluate(i => { const s = document.getElementById('vl-st-ctl-s'); s.value = i; s.dispatchEvent(new Event('input', { bubbles: true })); }, i);
          const bad = await p.evaluate(() => /NaN|undefined|Infinity/.test(document.getElementById('t-step').innerText));
          if (bad) { errs.push(`t-step run ${r} step ${i}: NaN/undefined`); break; }
        }
      }
    }
    const txtBad = await p.evaluate(t => { const m = document.getElementById(t).innerText.match(/.{0,40}(NaN|undefined|Infinity).{0,40}/); return m ? m[0] : ''; }, t);
    if (txtBad) errs.push(`${t}: ${txtBad}`);
    const wide = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (wide > 1) errs.push(`${t}: sideways scroll ${wide}px`);
    const wideEls = await p.evaluate(t => { const W = document.documentElement.clientWidth; return [...document.querySelectorAll(`#${t} *`)].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > W + 1 && !e.closest('.tw,.vl-code,.nav,.tabs'); }).slice(0, 3).map(e => e.tagName + '.' + e.className + ' ' + Math.round(e.getBoundingClientRect().right)); }, t);
    if (wideEls.length) errs.push(`${t}: wide elements ${wideEls.join('; ')}`);
    await p.screenshot({ path: path.join(out, `${t}_${w}_${scheme}.png`), fullPage: true });
  }
  const jsErr = await p.$eval('#jsErr', e => e.hidden ? '' : e.textContent);
  if (jsErr) errs.push('jsErr: ' + jsErr);
  console.log(`${w} ${scheme}: ${errs.length ? errs.length + ' problems' : 'ok'}`);
  errs.slice(0, 15).forEach(e => console.log('  ' + e));
  fail += errs.length;
  await p.close();
}
await browser.close();
console.log('fail=' + fail);
process.exit(fail ? 1 : 0);
