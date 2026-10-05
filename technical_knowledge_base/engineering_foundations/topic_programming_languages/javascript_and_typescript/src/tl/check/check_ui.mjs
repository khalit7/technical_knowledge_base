// Part 3 (tl) UI check: open each Part 3 tab at 390 px dark and 920 px light; for every mode of every animation, step
// through every frame and look for errors, NaN, undefined, Infinity and sideways scroll; then click every other control.
// Screenshots go to the scratch folder. Usage: node check_ui.mjs [outdir]
import { createRequire } from 'module';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../../../../../..');
const require = createRequire(path.join(repo, 'html_utils/package.json'));
const puppeteer = require('puppeteer');
const page_file = 'file://' + path.resolve(here, '../../../index.html');
const out = process.argv[2] || path.join(process.env.PL || path.join(os.tmpdir(), 'pl'), 'tl/shots');
const fs = require('fs'); fs.mkdirSync(out, { recursive: true });
const TABS = ['t-tl-read', 't-tl-loop', 't-tl-mcp'];
const browser = await puppeteer.launch({ headless: 'shell' });
let problems = 0;
for (const [w, scheme] of [[390, 'dark'], [920, 'light']]) {
  const p = await browser.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text()); });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.setViewport({ width: w, height: 900 });
  await p.goto(page_file, { waitUntil: 'load' });
  for (const t of TABS) {
    const ok = await p.evaluate(t => { if (!document.getElementById(t)) return false; window.SHOW_TAB(t); return true; }, t);
    if (!ok) { console.log('missing tab', t); problems++; continue; }
    await new Promise(r => setTimeout(r, 300));
    const res = await p.evaluate(async t => {
      const tab = document.getElementById(t), sleep = ms => new Promise(r => setTimeout(r, ms)), found = [];
      const scan = where => {
        for (const card of tab.querySelectorAll('.tl-anim')) { const txt = card.innerText;
          for (const re of [/\bNaN\b/, /\bundefined\b/, /Infinity/, /\[object Object\]/]) { const m = txt.match(re); if (m) found.push(where + ' ' + re + ' near: ' + txt.slice(Math.max(0, m.index - 60), m.index + 40).replace(/\s+/g, ' ')); } }
        if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 1) found.push(where + ' sideways scroll');
      };
      let frames = 0, k = 0;
      for (const card of tab.querySelectorAll('.tl-anim')) {
        const segs = [...card.querySelectorAll('.seg button')];
        for (const b of (segs.length ? segs : [null])) {
          if (b) { b.click(); k++; await sleep(20); }
          const prev = card.querySelector('.an-ctl button[aria-label="Previous step"]'), next = card.querySelector('.an-ctl button[aria-label="Next step"]'), rng = card.querySelector('.an-ctl input[type=range]');
          rng.value = 0; rng.dispatchEvent(new Event('input', { bubbles: true }));
          for (let i = 0; i <= +rng.max; i++) { scan(card.id + ' ' + (b ? b.dataset.m : '') + ' frame ' + i); frames++; next.click(); await sleep(5); }
          prev.click(); k += 2;
          const play = card.querySelector('.an-play'); play.click(); await sleep(30); play.click(); k += 2;
          const sel = card.querySelector('.an-ctl select'); for (const o of sel.options) { sel.value = o.value; sel.dispatchEvent(new Event('change', { bubbles: true })); k++; }
        }
      }
      tab.querySelectorAll('details').forEach(d => { d.open = true; k++; });
      for (const a of tab.querySelectorAll('nav a')) { a.click(); k++; }
      scan('after all controls');
      return { found, frames, k };
    }, t);
    res.found.slice(0, 12).forEach(b => { console.log(w, scheme, t, b); problems++; });
    if (res.found.length > 12) { console.log('... and', res.found.length - 12, 'more'); problems += res.found.length - 12; }
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.screenshot({ path: `${out}/${t}_${w}_${scheme}.png`, fullPage: true });
    console.log(w, scheme, t, 'frames checked:', res.frames, 'controls exercised:', res.k);
  }
  errs.forEach(e => { console.log(w, scheme, e); problems++; });
  await p.close();
}
await browser.close();
console.log('problems:', problems);
process.exit(problems ? 1 : 0);
