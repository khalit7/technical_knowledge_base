// node <this page>/src/check_controls.mjs <page index.html>   (run from the repository root)
// Clicks every button, moves every slider and select, opens every closed block, in 390 px dark and 920 px light;
// fails on page errors, a visible #jsErr, sideways scroll, or NaN / undefined / Infinity in a tab's text.
// Also checks (2026-11-06) that the stages play when scrolled into view and the lanes widget never moves by itself.
import { createRequire } from 'node:module'; import path from 'node:path';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
let bad = 0;
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + path.resolve(process.argv[2]));
  await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto('file://' + path.resolve(process.argv[2])); // the previous width's tab clicks are remembered
  // autoplay (2026-11-06): stages play once scrolled into view; the lanes replay is a widget the reader drives and must stay still on its last frame
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise(r => setTimeout(r, 300)); } });
  await new Promise(r => setTimeout(r, 1500));
  const lanes = await p.$eval('#fm-lanectl-s', r => [r.value, r.max]); if (lanes[0] !== lanes[1]) errs.push(`lanes widget moved by itself (${lanes})`);
  if (/Pause/.test(await p.$eval('#fm-lanectl-p', x => x.textContent))) errs.push('lanes widget is playing without input');
  const played = await p.$$eval('.stg', xs => xs.filter(x => +x.dataset.frames > 0).length); if (!played) errs.push('no stage played when scrolled into view');
  for (const t of await p.$$eval('button[data-t]', bs => bs.map(b => b.dataset.t))) {
    await p.$eval(`button[data-t=${t}]`, x => x.click()); await new Promise(r => setTimeout(r, 200));
    await p.$$eval(`#${t} details`, ds => ds.forEach(d => d.open = true));
    const n = await p.$$eval(`#${t} button`, bs => bs.length);
    for (let i = 0; i < n; i++) await p.evaluate((t, i) => { const x = document.querySelectorAll(`#${t} button`)[i]; if (x && !/Play|Pause/.test(x.textContent)) x.click(); }, t, i);
    await p.$$eval(`#${t} input[type=range]`, rs => rs.forEach(r => { for (const v of [r.min, r.max, Math.round((+r.min + +r.max) / 2)]) { r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); } }));
    await p.$$eval(`#${t} select`, ss => ss.forEach(s => { for (const o of s.options) { s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); } }));
    await p.$$eval(`#${t} tr[data-i]`, rs => rs.slice(0, 5).forEach(r => r.click()));
    const txt = await p.$eval('#' + t, el => el.innerText);
    if (/\bNaN\b|\bundefined\b|\bInfinity\b/.test(txt)) errs.push(`${t}: NaN/undefined/Infinity`);
    if (/(^|\s)\?(\s|$)/.test(await p.$$eval(`#${t} .fm-miss`, xs => xs.map(x => x.textContent).join(' ')))) errs.push(`${t}: unfilled prose value`);
    if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) errs.push(`${t}: sideways scroll`);
  }
  const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) errs.push(box);
  console.log(scheme, width, errs.length ? errs : 'clean'); bad += errs.length; await p.close();
}
await b.close();
process.exit(bad ? 1 : 0);
