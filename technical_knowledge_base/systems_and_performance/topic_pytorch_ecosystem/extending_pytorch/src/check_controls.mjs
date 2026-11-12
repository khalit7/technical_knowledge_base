// Click every control in every tab at 390 px dark, 920 px light and 1400 px light; fail on page errors, a visible #jsErr,
// sideways scroll, or NaN/undefined/Infinity in the tab text. Motion (2026-11-12): animations and stages play by themselves once in view
// (check_stages.mjs checks that); here the subclass tracer, a widget, must never move by itself, and under reduced motion nothing may.
// Run from the repo root: node technical_knowledge_base/systems_and_performance/topic_pytorch_ecosystem/extending_pytorch/src/check_controls.mjs <page index.html>
import { createRequire } from 'node:module'; import path from 'node:path';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const file = path.resolve(process.argv[2]);
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
for (const [scheme, width] of [['dark', 390], ['light', 920], ['light', 1400]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + file); await sleep(400);
  // the subclass tracer is a widget: it stays on its opening frame while scrolled into view
  const w0 = await p.$eval('#es-ctl-s', r => r.value);
  await p.$eval('#es-card', e => e.scrollIntoView({ block: 'center' })); await sleep(2500);
  const w1 = await p.$eval('#es-ctl-s', r => r.value);
  if (w0 !== w1) errs.push(`widget es-card moved by itself (${w0} -> ${w1})`);
  for (const t of await p.$$eval('button[data-t]', bs => bs.map(x => x.dataset.t))) {
    await p.$eval(`button[data-t="${t}"]`, x => x.click()); await sleep(200);
    // every non-tab button, several passes so mode switches and steppers reach later states
    const n = await p.$$eval(`#${t} button`, bs => bs.length);
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < n; i++) {
      await p.evaluate((t, i) => { const x = document.querySelectorAll(`#${t} button`)[i]; if (x && x.offsetParent && !x.classList.contains('an-play')) x.click(); }, t, i);
    }
    // every slider to its last value, every select through its options
    await p.$$eval(`#${t} input[type=range]`, rs => rs.forEach(r => { r.value = r.max; r.dispatchEvent(new Event('input', { bubbles: true })); }));
    await p.$$eval(`#${t} select`, ss => ss.forEach(s => [...s.options].forEach(o => { s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); })));
    // open closed blocks so script-filled text inside them is checked too
    await p.$$eval(`#${t} details`, ds => ds.forEach(d => d.open = true)); await sleep(150);
    const bad = await p.$eval('#' + t, el => (el.innerText.match(/\bNaN\b|\bundefined\b|\bInfinity\b/g) || []).join(','));
    const side = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    if (bad || side) errs.push(`${t}: ${bad ? 'text ' + bad : ''} ${side ? 'sideways' : ''}`);
  }
  const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) errs.push(box);
  console.log(scheme, width, errs.length ? errs : 'clean'); fails += errs.length; await p.close();
}
// reduced motion: the play button steps without tweening and nothing starts on its own
{ const p = await b.newPage(); await p.setViewport({ width: 920, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + file); await sleep(300);
  const before = await p.$$eval('#t-read input[type=range]', rs => rs.map(r => r.value));
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } });
  await sleep(1500);
  const after = await p.$$eval('#t-read input[type=range]', rs => rs.map(r => r.value));
  const moved = after.filter((v, i) => v !== before[i]).length;
  console.log('reduced motion', moved ? `moved ${moved}` : 'clean'); fails += moved; await p.close(); }
await b.close();
process.exit(fails ? 1 : 0);
