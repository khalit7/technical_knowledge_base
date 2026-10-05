// element screenshots for looking at: node shots.mjs <width> <scheme>
import { createRequire } from 'module';
const require = createRequire(new URL('../../../../../../html_utils/package.json', import.meta.url));
const puppeteer = require('puppeteer');
const url = new URL('../../index.html', import.meta.url).href;
const shots = new URL('../../.shots/', import.meta.url).pathname;
const [w, scheme] = [+(process.argv[2] || 390), process.argv[3] || 'dark'];
const b = await puppeteer.launch({ headless: 'shell' });
const p = await b.newPage();
await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
await p.setViewport({ width: w, height: 900, deviceScaleFactor: 1 });
await p.goto(url); await new Promise(r => setTimeout(r, 500));
const els = [['t-read', '#rd-one'], ['t-read', '#cs-nvccCard'], ['t-read', '#cs-ptx'], ['t-read', '#cs-anatCard'], ['t-read', '#cs-fam'], ['t-read', '#cs-liveChart'], ['t-read', '#cs-featT'], ['t-read', '#cs-fatT'], ['t-read', '#cs-expCard'], ['t-read', '#cs-dynCard'], ['t-read', '#cs-recBars'], ['t-read', '#cs-cost'], ['t-read', '#cs-tileT'], ['t-run', '#t-run'], ['t-sass', '#sx-card'], ['t-tc', '#t-tc'], ['t-more', '#t-more']];
for (const [t, sel] of els) {
  await p.evaluate(t => document.querySelector(`#tabs button[data-t="${t}"]`).click(), t); await new Promise(r => setTimeout(r, 150));
  if (sel === '#cs-nvccCard' || sel === '#cs-dynCard' || sel === '#cs-expCard') await p.evaluate(s => { const f = document.querySelector(s + ' button[aria-label="Next step"]'); f.click(); f.click(); f.click() }, sel);
  const e = await p.$(sel); if (!e) { console.log('missing', sel); continue }
  await e.scrollIntoView();
  await e.screenshot({ path: `${shots}el-${w}-${sel.replace('#', '')}.png` });
}
await b.close(); console.log('ok');
