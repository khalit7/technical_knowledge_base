// Click every control of the Kernel lab tab at 390 px dark and 920 px light: no errors, no NaN/undefined,
// no sideways scroll, nothing wider than the tab; screenshots of each section into the directory given.
// Usage: node check_page.mjs <shots dir>
import { createRequire } from 'module'; import path from 'path'; import { fileURLToPath, pathToFileURL } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url)), repo = path.join(here, '..', '..', '..', '..', '..', '..');
const require = createRequire(path.join(repo, 'html_utils', 'package.json'));
const puppeteer = require('puppeteer');
const page_url = pathToFileURL(path.join(here, '..', '..', '..', 'index.html')).href;
const out = process.argv[2];
const browser = await puppeteer.launch({ headless: 'shell' });
let fails = 0;
for (const [w, scheme] of [[390, 'dark'], [920, 'light']]) {
  const p = await browser.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width: w, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(page_url, { waitUntil: 'load' });
  await p.evaluate(() => { try { localStorage.clear() } catch (e) {} });
  await p.click('#tabs button[data-t="t-lab"]');
  await new Promise(r => setTimeout(r, 300));
  const nb = await p.evaluate(() => document.querySelectorAll('#t-lab button, #t-lab select').length);
  let bad = [];
  const btns = await p.$$('#t-lab button');
  for (const b of btns) {
    try { await b.evaluate(x => x.scrollIntoView({ block: 'center' })); await b.click(); } catch (e) { bad.push('click ' + e.message) }
    const t = await p.evaluate(() => { const tx = document.getElementById('t-lab').innerText; const m = tx.match(/.{0,40}(NaN|undefined|Infinity|\[object).{0,40}/); return m ? m[0] : null });
    if (t) { bad.push(t); break }
  }
  const sel = await p.$$('#t-lab select');
  for (const s of sel) { await s.select('2'); }
  const sc = await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  if (sc[0] > sc[1]) bad.push('sideways scroll ' + sc);
  // anything wider than its tab
  const wide = await p.evaluate(() => { const W = document.getElementById('t-lab').getBoundingClientRect().right + 1; return [...document.querySelectorAll('#t-lab *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > W && !e.closest('pre,.tw,.nav') }).slice(0, 5).map(e => e.tagName + '#' + e.id + '.' + e.className + ' ' + Math.round(e.getBoundingClientRect().right)) });
  if (wide.length) bad.push('wide: ' + wide.join(' | '));
  await p.evaluate(() => window.scrollTo(0, 0));
  for (const id of ['lab-s0','lab-s1','lab-s2','lab-s3','lab-s4','lab-s5','lab-s6','lab-s7']) { const e = await p.$('#' + id); await e.screenshot({ path: `${out}/${w}_${id}.png` }); }
  console.log(w, scheme, 'controls', nb, 'errors', errs.length, errs.slice(0, 3), 'bad', bad);
  fails += errs.length + bad.length;
  await p.close();
}
await browser.close();
console.log('fails', fails);
