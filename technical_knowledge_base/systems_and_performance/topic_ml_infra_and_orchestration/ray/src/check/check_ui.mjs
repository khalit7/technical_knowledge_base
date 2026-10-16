// Click every control of every tab at 390 px dark and 920 px light; report errors, NaN/undefined and sideways scroll;
// screenshot each card. usage (repo root): node <this> <index.html> <shots dir>
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const require = createRequire(path.resolve(process.cwd(), 'html_utils/package.json'));
const puppeteer = require('puppeteer');
const [file, shots] = process.argv.slice(2);
fs.mkdirSync(shots, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell' });
let bad = 0;
try {
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
      await p.click(`#tabs button[data-t=${t}]`);
      await new Promise(r => setTimeout(r, 250));
      const n = await p.$$eval(`#${t} button`, bs => bs.length);
      for (let i = 0; i < n; i++) {
        await p.evaluate((t, i) => { const x = document.querySelectorAll(`#${t} button`)[i]; if (x && x.offsetParent) x.click(); }, t, i);
      }
      // drag every range to its end and back, change every select
      await p.evaluate(t => { document.querySelectorAll(`#${t} input[type=range]`).forEach(r => { for (const v of [r.max, Math.floor(r.max / 2), 0, r.max]) { r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); } });
        document.querySelectorAll(`#${t} select`).forEach(s => { s.selectedIndex = s.options.length - 1; s.dispatchEvent(new Event('change', { bubbles: true })); }); }, t);
      await new Promise(r => setTimeout(r, 200));
      const res = await p.evaluate(t => { const el = document.getElementById(t); const txt = el.innerText;
        return { nan: /\bNaN\b/.test(txt), und: /\bundefined\b/.test(txt), side: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 }; }, t);
      const cards = await p.$$(`#${t} .ry-card`);
      for (let k = 0; k < cards.length; k++) await cards[k].screenshot({ path: `${shots}/${t}-${scheme}-${width}-card${k}.png` });
      const ok = !res.nan && !res.und && !res.side;
      if (!ok) bad++;
      console.log(scheme, width, t, 'buttons', n, 'cards', cards.length, JSON.stringify(res));
    }
    if (errs.length) { bad++; console.log('ERRORS', scheme, errs); }
    await p.close();
  }
} finally { await b.close(); }
console.log(bad ? 'FAIL ' + bad : 'ALL OK');
