// Clicks every control of every tab at 390 px (dark) and 920 px (light); reports page errors, NaN, undefined and
// sideways scroll; saves screenshots of every .card to the folder given as the first argument (default ./shots).
// Run from the repo root: node technical_knowledge_base/.../triton_and_gluon/src/check/check_ui.mjs <outdir> [quick]
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
const require = createRequire(path.resolve('html_utils/package.json'));
const puppeteer = require('puppeteer');
const here = path.dirname(new URL(import.meta.url).pathname);
const url = 'file://' + path.resolve(here, '../../index.html');
const out = process.argv[2] || 'shots';
const quick = process.argv[3] === 'quick';
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fail = 0;
for (const [w, scheme] of (quick ? [[390, 'dark']] : [[390, 'dark'], [920, 'light']])) {
  const p = await browser.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.setViewport({ width: w, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto(url, { waitUntil: 'load' });
  const check = async tag => {
    const r = await p.evaluate(() => {
      const vis = [...document.querySelectorAll('.tab')].find(t => !t.hidden);
      const txt = vis ? vis.innerText : '';
      return { tab: vis && vis.id, nan: /\bNaN\b/.test(txt), undef: /\bundefined\b/.test(txt), side: document.documentElement.scrollWidth > innerWidth + 1,
        err: !document.getElementById('jsErr').hidden ? document.getElementById('jsErr').textContent.slice(0, 300) : '' };
    });
    if (r.nan || r.undef || r.side || r.err) { fail++; console.log('FAIL', scheme, w, tag, JSON.stringify(r)); }
  };
  const tabs = await p.$$eval('#tabs button', b => b.map(x => x.dataset.t));
  for (const t of tabs) {
    await p.click(`#tabs button[data-t="${t}"]`); await sleep(250); await check(t + ' open');
    // selects: try every option
    const sels = await p.$$(`#${t} select`);
    for (const s of sels) {
      const vals = await s.evaluate(e => [...e.options].map(o => o.value));
      for (const v of vals.slice(0, quick ? 2 : 12)) { await s.evaluate((e, v) => { e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })); }, v); await sleep(30); }
      await check(t + ' select');
    }
    // range inputs: min, middle, max
    for (const r of await p.$$(`#${t} input[type=range]`)) {
      await r.evaluate(e => { for (const v of [e.min, (+e.min + +e.max) / 2 | 0, e.max]) { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); } });
    }
    await check(t + ' ranges');
    // buttons (not the tab bar), each clicked once; step-forward buttons a few times
    const btns = await p.$$(`#${t} button`);
    for (const b of btns) {
      const vis = await b.evaluate(e => e.offsetParent !== null);
      if (!vis) continue;
      await b.evaluate(e => e.scrollIntoView({ block: 'center' }));
      try { await b.click(); } catch (e) { }
      await sleep(25);
    }
    await check(t + ' buttons');
    if (!quick) {
      const cards = await p.$$(`#${t} .card`);
      let i = 0;
      for (const c of cards) { await c.evaluate(e => e.scrollIntoView({ block: 'start' })); await sleep(200); try { await c.screenshot({ path: `${out}/${t}-${i}-${scheme}-${w}.png` }); } catch (e) { } i++; }
    }
  }
  if (errs.length) { fail++; console.log('ERRORS', scheme, w, errs.slice(0, 6)); }
  await p.close();
}
await browser.close();
console.log('ui check', fail ? 'FAILED ' + fail : 'ok');
