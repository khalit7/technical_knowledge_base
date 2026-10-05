// quick: load the page, report JS errors and the error box
import { createRequire } from 'module';
const require = createRequire(new URL('../../../../../../html_utils/package.json', import.meta.url));
const puppeteer = require('puppeteer');
const url = new URL('../../index.html', import.meta.url).href;
const b = await puppeteer.launch({ headless: 'shell' });
const p = await b.newPage(); const errs = [];
p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
await p.setViewport({ width: 920, height: 900 });
await p.goto(url); await new Promise(r => setTimeout(r, 800));
for (const t of ['t-run', 't-sass', 't-tc', 't-more', 't-read']) { await p.click(`#tabs button[data-t="${t}"]`); await new Promise(r => setTimeout(r, 300)); }
const box = await p.$eval('#jsErr', e => e.hidden ? '' : e.textContent);
const bad = await p.evaluate(() => { const t = document.body.innerText; return (t.match(/NaN|undefined/g) || []).length });
console.log('errors', errs, 'errbox', box, 'NaN/undefined', bad);
await b.close();
