// Exercise every control of the page in headless Chrome: 390 px dark and 920 px light, then reduced motion.
// Run from the repository root: node <page>/src/check/check_controls.mjs <page>/index.html
// Fails on page errors, console errors, a visible #jsErr, sideways scroll, NaN / undefined / Infinity in tab text,
// or any animation that moves before the reader acts.
import { createRequire } from 'node:module'; import path from 'node:path';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const page = path.resolve(process.argv[2]);
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let bad = 0;
async function open(scheme, width, reduced) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' }]);
  await p.goto('file://' + page); await sleep(400); return { p, errs };
}
const scan = async (p, t) => p.$eval('#' + t, el => /\bNaN\b|\bundefined\b|\bInfinity\b/.test(el.innerText));
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const { p, errs } = await open(scheme, width, false);
  // nothing moves before the reader acts: scroll every animation into view, wait, check its scrubber is still at 0
  for (const id of await p.$$eval('#t-read .an-ctl', a => a.map(x => x.id))) {
    await p.$eval('#' + id, el => el.scrollIntoView()); await sleep(2600);
    const v = await p.$eval('#' + id + '-s', s => +s.value); if (v !== 0) errs.push(`autoplay: ${id} at step ${v}`);
  }
  // every segmented button, select option, range extreme and checkbox in Reading, stepping each animation to its end
  const steps = async () => { for (const id of await p.$$eval('#t-read .an-ctl', a => a.map(x => x.id))) {
    const n = await p.$eval('#' + id + '-s', s => +s.max); for (let i = 0; i < n; i++) await p.$eval('#' + id + '-f', x => x.click());
    await p.$eval('#' + id + '-b', x => x.click()); } };
  await steps();
  for (const sel of await p.$$eval('#t-read select', a => a.filter(s => !s.id.endsWith('-v')).map(s => s.id))) {
    for (const v of await p.$eval('#' + sel, s => [...s.options].map(o => o.value))) { await p.select('#' + sel, v); await sleep(120); }
  }
  for (const id of await p.$$eval('#t-read .seg button, #t-read #rd-clNew, #t-read #rd-hpNew', a => a.map((x, i) => { x.dataset.ck = 'b' + i; return x.dataset.ck; }))) {
    await p.$eval(`[data-ck="${id}"]`, x => x.click()); await sleep(80);
  }
  await steps();
  for (const id of await p.$$eval('#t-read input[type=range]:not([id$="-s"])', a => a.map(x => x.id))) {
    for (const end of ['min', 'max']) await p.$eval('#' + id, (s, e) => { s.value = s[e]; s.dispatchEvent(new Event('input', { bubbles: true })); }, end);
    await sleep(150);
  }
  await p.$$eval('#t-read input[type=checkbox]', a => a.forEach(c => c.click()));
  if (await scan(p, 't-read')) errs.push('t-read: NaN/undefined/Infinity');
  // the lab: every dataset, every model in both panes, every slider at both ends
  await p.click('button[data-t="t-lab"]'); await sleep(300);
  for (const ds of await p.$eval('#lb-ds', s => [...s.options].map(o => o.value))) {
    await p.select('#lb-ds', ds); await sleep(150);
    for (const pane of ['A', 'B']) for (const m of await p.$eval('#lb-m' + pane, s => [...s.options].map(o => o.value))) {
      await p.select('#lb-m' + pane, m); await sleep(150);
      for (const id of await p.$$eval('#lb-c' + pane + ' input[type=range]', a => a.map(x => x.id)))
        for (const end of ['min', 'max']) { await p.$eval('#' + id, (s, e) => { s.value = s[e]; s.dispatchEvent(new Event('input', { bubbles: true })); }, end); await sleep(140); }
    }
    if (await scan(p, 't-lab')) errs.push(`t-lab ${ds}: NaN/undefined/Infinity`);
  }
  for (const t of ['t-read', 't-lab', 't-more']) { await p.click(`button[data-t="${t}"]`); await sleep(200);
    if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)) errs.push(`${t}: sideways scroll`); }
  const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) errs.push(box);
  console.log(scheme, width, errs.length ? errs : 'clean'); bad += errs.length; await p.close();
}
{ const { p, errs } = await open('light', 920, true);
  for (const id of await p.$$eval('#t-read .an-ctl', a => a.map(x => x.id))) {
    await p.$eval('#' + id, el => el.scrollIntoView()); await sleep(1500);
    const v = await p.$eval('#' + id + '-s', s => +s.value); if (v !== 0) errs.push(`reduced motion autoplay: ${id}`);
  }
  console.log('reduced motion', errs.length ? errs : 'clean'); bad += errs.length; await p.close(); }
await b.close(); process.exit(bad ? 1 : 0);
