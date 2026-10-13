// Browser check of the Reading and Further reading tabs: every segmented control, every animation stepped to its end in every mode,
// every predict button, at 390 dark and 920 light. Fails on script errors, NaN/undefined/MISMATCH in text, sideways scroll.
// usage: node check_page.mjs <index.html> <shots dir>   (puppeteer from html_utils via createRequire)
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs';
const here = path.dirname(new URL(import.meta.url).pathname);
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const [file, shots] = process.argv.slice(2); fs.mkdirSync(shots, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell' });
let bad = 0;
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + path.resolve(file)); await p.click('button[data-t=t-read]');
  const res = await p.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms)); const out = { clicks: 0, steps: 0, issues: [] };
    const scan = where => { const t = document.getElementById('t-read').innerText; for (const w of ['NaN', 'undefined', 'MISMATCH', 'Infinity', '[object']) if (t.includes(w)) out.issues.push(w + ' after ' + where) };
    const cards = [...document.querySelectorAll('#t-read .rd-card')];
    for (const c of cards) {
      c.scrollIntoView(); await sleep(50);
      const segs = [...c.querySelectorAll('.seg button')]; const modes = segs.length ? segs : [null];
      for (const s of modes) {
        if (s) { s.click(); out.clicks++; await sleep(40) }
        const fwd = c.querySelector('[id$="-ctl-f"]'), back = c.querySelector('[id$="-ctl-b"]'), sc = c.querySelector('input[type=range]');
        if (fwd) { for (let i = 0; i < 20; i++) { fwd.click(); out.steps++ } scan(c.id + ' end ' + (s ? s.textContent : '')); back.click(); if (sc) { sc.value = 0; sc.dispatchEvent(new Event('input')) } }
        scan(c.id + ' ' + (s ? s.textContent : ''));
      }
    }
    for (const pr of document.querySelectorAll('#t-read .pr')) { const bs = pr.querySelectorAll('.opts button'); bs[0].click(); bs[bs.length - 1].click(); out.clicks += 2;
      if (pr.querySelector('.ans').hidden) out.issues.push('answer not revealed') }
    for (const d of document.querySelectorAll('#t-read details')) d.open = true;
    window.scrollTo(0, 0); scan('all');
    out.sideways = document.documentElement.scrollWidth > innerWidth; return out });
  await new Promise(r => setTimeout(r, 300));
  await (await p.$('#t-read')).screenshot({ path: `${shots}/rd-${scheme}-${width}.png` });
  await p.click('button[data-t=t-more]'); await new Promise(r => setTimeout(r, 200));
  const more = await p.evaluate(() => ({ links: [...document.querySelectorAll('#t-more a')].map(a => a.href), side: document.documentElement.scrollWidth > innerWidth, tabs: [...document.querySelectorAll('#t-more a[data-tab]')].length }));
  const ext = more.links.filter(h => h.startsWith('http'));
  const box = await p.evaluate(() => { const d = document.getElementById('jsErr'); return d && !d.hidden ? d.textContent : '' });
  console.log(scheme, width, 'clicks', res.clicks, 'steps', res.steps, 'issues', JSON.stringify([...new Set(res.issues)]), 'sideways', res.sideways || more.side, 'errors', JSON.stringify(errs), 'errbox', JSON.stringify(box), 'more links', ext.length, 'tab links', more.tabs);
  if (errs.length || res.issues.length || res.sideways || more.side || box) bad = 1;
  await p.close();
}
await b.close(); process.exit(bad);
