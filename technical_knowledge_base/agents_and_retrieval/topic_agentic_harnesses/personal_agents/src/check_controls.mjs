// Click every control on every tab at 390 px dark and 920 px light, step every animation to its end, and fail on page errors,
// a visible #jsErr, sideways scroll, or NaN/undefined/Infinity in the tab text. Then confirm nothing moves on its own under
// reduced motion. usage, from the repo root: node <page>/src/check_controls.mjs <page>/index.html
import { createRequire } from 'node:module'; import path from 'node:path';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
let bad = 0;
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + path.resolve(process.argv[2]));
  for (const t of await p.$$eval('button[data-t]', bs => bs.map(b => b.dataset.t))) {
    await p.click(`button[data-t=${t}]`); await new Promise(r => setTimeout(r, 200));
    await p.evaluate(async (t) => {
      const root = document.getElementById(t); const sleep = ms => new Promise(r => setTimeout(r, ms));
      for (const d of root.querySelectorAll('details')) d.open = true;
      for (const s of root.querySelectorAll('select')) for (const o of s.options) { s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); }
      for (const r of root.querySelectorAll('input[type=range]')) for (const v of [r.min, r.max, r.defaultValue || r.min]) { r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); }
      for (const btn of root.querySelectorAll('.seg button, .gd-pre button')) btn.click();
      for (const f of root.querySelectorAll('button[id$="-f"]')) for (let i = 0; i < 80; i++) f.click();
      for (const bb of root.querySelectorAll('button[id$="-b"]')) bb.click();
      await sleep(50);
    }, t);
    const txt = await p.$eval('#' + t, el => el.innerText);
    const m = txt.match(/.{0,40}\b(NaN|undefined|Infinity)\b.{0,40}/);
    const side = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    if (m || side) errs.push(`${t}: ${m ? m[0] : ''} ${side ? 'sideways scroll' : ''}`);
  }
  const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) errs.push(box);
  console.log(scheme, width, errs.length ? errs : 'clean'); bad += errs.length; await p.close();
}
// reduced motion and normal: every stepper stays on step 0 after load and scroll
for (const rm of ['reduce', 'no-preference']) {
  const p = await b.newPage(); await p.setViewport({ width: 920, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: rm }]);
  await p.goto('file://' + path.resolve(process.argv[2]));
  await p.evaluate(async () => { for (const c of document.querySelectorAll('[id$="-card"]')) { c.scrollIntoView(); await new Promise(r => setTimeout(r, 300)); } });
  await new Promise(r => setTimeout(r, 3000));
  const moved = await p.$$eval('input[type=range][id$="-s"]', rs => rs.filter(r => +r.value !== 0).map(r => r.id));
  console.log('motion', rm, moved.length ? 'MOVED ' + moved : 'nothing autoplays'); bad += moved.length; await p.close();
}
await b.close();
process.exit(bad ? 1 : 0);
