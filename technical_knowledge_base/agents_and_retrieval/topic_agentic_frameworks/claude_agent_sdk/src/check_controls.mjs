// node <this file>   (from the repo root) Click every control of every tab at 390 px dark and 920 px light; fail on page errors,
// a visible #jsErr, sideways scroll or NaN/undefined/Infinity in a tab's text; first check that every 3D stage plays when scrolled into view and the wire replay (a widget) does not.
import { createRequire } from 'node:module'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const page = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'index.html');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
let bad = 0;
try {
  for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
    const p = await b.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
    await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
    await p.goto('file://' + page); await sleep(300);
    // autoplay (2026-11-06): every 3D stage plays by itself once scrolled into view; the wire replay (a reader-driven widget) does not
    await p.click('button[data-t=t-read]'); await sleep(300); // the last run left another tab open in localStorage
    for (const id of await p.$$eval('#t-read .stg', xs => xs.map(x => x.id))) {
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await sleep(2200);
      if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) errs.push(`${id} did not play when scrolled into view`);
    }
    await p.$eval('#fw-card', e => e.scrollIntoView({ block: 'center' })); await sleep(1500);
    if (/Pause/.test(await p.$eval('#fw-ctl-p', e => e.textContent))) errs.push('the wire replay played by itself');
    for (const t of await p.$$eval('button[data-t]', bs => bs.map(x => x.dataset.t))) {
      await p.click(`button[data-t=${t}]`); await sleep(200);
      const n = await p.evaluate(async (t) => {
        const root = document.getElementById(t); let k = 0;
        const vis = el => el.offsetParent !== null;
        for (const s of root.querySelectorAll('select')) for (const o of s.options) { s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); k++; }
        for (const r of root.querySelectorAll('input[type=range]')) { for (const v of [r.min, r.max]) { r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); k++; } }
        for (const c of root.querySelectorAll('input[type=checkbox]')) { c.click(); c.click(); k++; }
        for (const bt of [...root.querySelectorAll('button')]) { if (!vis(bt) || /Play|Pause/.test(bt.textContent)) continue; bt.click(); k++; }
        // step every animation to its end in each mode
        for (const seg of root.querySelectorAll('.seg')) for (const m of seg.querySelectorAll('button')) { m.click();
          const card = seg.closest('.fig,.card'); const fwd = card && card.querySelector('button[aria-label="Next step"]');
          if (fwd) for (let i = 0; i < 120; i++) fwd.click(); k++; }
        return k;
      }, t);
      const txt = await p.$eval('#' + t, el => el.innerText);
      const m = txt.match(/.{0,40}\b(NaN|undefined|Infinity)\b.{0,40}/);
      const side = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      if (m || side) errs.push(`${t}: ${m ? m[0] : ''} ${side ? 'sideways scroll' : ''}`);
      console.log(scheme, width, t, n, 'controls');
    }
    const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) errs.push(box);
    console.log(scheme, width, errs.length ? errs : 'clean'); bad += errs.length; await p.close();
  }
} finally { await b.close(); }
process.exit(bad ? 1 : 0);
