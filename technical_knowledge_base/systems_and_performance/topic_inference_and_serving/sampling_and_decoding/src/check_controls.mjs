// Click every control in every tab at 390 px dark and 920 px light; fail on page errors, a visible #jsErr,
// sideways scroll or NaN/undefined/Infinity in the tab text. Then check that no animation moves before the reader acts,
// with normal and with reduced motion. usage: node <page>/src/check_controls.mjs <page>/index.html
import { createRequire } from 'node:module'; import path from 'node:path';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const file = 'file://' + path.resolve(process.argv[2]);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
let bad = 0;
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await sleep(300);
  for (const t of await p.$$eval('button[data-t]', bs => bs.map(b => b.dataset.t))) {
    await p.$eval(`button[data-t=${t}]`, x => x.click()); await sleep(200);
    await p.evaluate(async (t) => {
      const root = document.getElementById(t), w = ms => new Promise(r => setTimeout(r, ms));
      for (const s of root.querySelectorAll('select')) for (const o of [...s.options].slice(0, 12)) { s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); await w(5); }
      for (const r of root.querySelectorAll('input[type=range]')) for (const v of [r.min, r.max, (+r.min + +r.max) / 2]) { r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); await w(5); }
      for (const x of root.querySelectorAll('button:not([data-t])')) { if (x.classList.contains('an-play')) continue; x.click(); await w(5); }
      // step every animation to its end, in every mode
      for (const card of root.querySelectorAll('.card')) {
        const f = card.querySelector('button[aria-label="Next step"]'); if (!f) continue;
        for (const m of [...card.querySelectorAll('.seg button')]) { m.click(); for (let i = 0; i < 30; i++) f.click(); await w(5); }
      }
    }, t);
    await sleep(150);
    const txt = await p.$eval('#' + t, el => el.innerText);
    const hit = txt.match(/\bNaN\b|\bundefined\b|\bInfinity\b/);
    const side = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    if (hit || side) errs.push(`${t}: ${hit ? 'text has ' + hit[0] : ''} ${side ? 'sideways scroll' : ''}`);
  }
  const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) errs.push('jsErr: ' + box);
  console.log(scheme, width, errs.length ? errs : 'clean'); bad += errs.length; await p.close();
}
for (const motion of ['no-preference', 'reduce']) {
  const p = await b.newPage(); await p.setViewport({ width: 920, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: motion }]);
  await p.goto(file); await p.$eval('button[data-t=t-read]', x => x.click());
  const ids = await p.$$eval('#t-read .an-ctl input[type=range]', rs => rs.map(r => r.id));
  for (const id of ids) { await p.$eval('#' + id, el => el.scrollIntoView({ block: 'center' })); await sleep(1500); }
  await sleep(2500);
  const moved = await p.$$eval('#t-read .an-ctl input[type=range]', rs => rs.filter(r => r.value !== '0').map(r => r.id));
  console.log('motion', motion, ids.length, 'animations,', moved.length ? 'MOVED: ' + moved : 'none moved before the reader acted'); bad += moved.length; await p.close();
}
await b.close();
process.exit(bad ? 1 : 0);
