import { createRequire } from 'module';
const require = createRequire(new URL('../../../../../../html_utils/package.json', import.meta.url));
const puppeteer = require('puppeteer');
const url = new URL('../../index.html', import.meta.url).href;
const b = await puppeteer.launch({ headless: 'shell' });
const p = await b.newPage(); await p.setViewport({ width: 390, height: 800 });
await p.goto(url); await new Promise(r => setTimeout(r, 600));
for (const t of ['t-read','t-run','t-sass','t-tc','t-more']) {
  await p.evaluate(t => document.querySelector(`#tabs button[data-t="${t}"]`).click(), t); await new Promise(r => setTimeout(r, 300));
  const r = await p.evaluate(() => { const W = document.documentElement.clientWidth; const out = [];
    document.querySelectorAll('body *').forEach(e => { const b = e.getBoundingClientRect(); if (b.width && b.right > W + 1) { let x = e, inScroll = false; while (x && x !== document.body) { const cs = getComputedStyle(x); if (x !== e && (cs.overflowX === 'auto' || cs.overflowX === 'hidden' || cs.overflowX === 'scroll')) { inScroll = true; break } x = x.parentElement } if (!inScroll) out.push(e.tagName + '#' + e.id + '.' + e.className + ' ' + Math.round(b.right) + ' ' + (e.textContent || '').slice(0, 40)) } });
    return [document.documentElement.scrollWidth, W, out.slice(0, 12)] });
  console.log(t, r[0], r[1], r[2]);
}
await b.close();
