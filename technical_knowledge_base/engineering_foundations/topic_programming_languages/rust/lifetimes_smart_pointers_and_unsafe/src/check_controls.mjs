// Every control of the page at 390 px dark (reduced motion) and 920 px light: each 3D stage's forward, back, play, pause, scrubber and speed,
// and every closed block opened. Fails on page errors, a visible #jsErr, NaN/undefined/Infinity in the text, or sideways scroll.
// (2026-11-07: the lifetime toggle and the Rc stepper became stages; autoplay on view and reduced motion are checked by check_stages.mjs.)
// usage (from the repo root): node <page>/src/check_controls.mjs [shots dir]
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs'; import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = execSync('git rev-parse --show-toplevel', { cwd: here }).toString().trim();
const R = createRequire(path.join(repo, 'html_utils/package.json')); const puppeteer = R('puppeteer');
const page = path.resolve(here, '../index.html'); const shots = process.argv[2];
if (shots) fs.mkdirSync(shots, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
let bad = 0;
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: scheme === 'dark' ? 'reduce' : 'no-preference' }]);
  await p.goto('file://' + page);
  await p.evaluate(() => { try { localStorage.removeItem('lsp-tab') } catch (e) {} }); await p.reload();
  for (const id of await p.$$eval('.stg', xs => xs.map(x => x.id))) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' }));
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1);
    for (let i = 1; i < n; i++) await p.$eval(`#${id}-f`, e => e.click());
    await new Promise(r => setTimeout(r, 300));
    if (await p.$eval(`#${id} .stg-st`, e => e.textContent) !== `step ${n} of ${n}`) errs.push(id + ' did not reach its last step');
    for (let i = 1; i < n; i++) await p.$eval(`#${id}-b`, e => e.click());
    if (await p.$eval(`#${id} .stg-st`, e => e.textContent) !== `step 1 of ${n}`) errs.push(id + ' did not return to step 1');
    await p.evaluate(id => { const e = document.getElementById(id + '-s'); e.value = '2'; e.dispatchEvent(new Event('change')); const r = document.getElementById(id + '-r'); r.value = r.max; r.dispatchEvent(new Event('input')) }, id);
    await p.$eval(`#${id}-p`, e => e.click()); await new Promise(r => setTimeout(r, 200)); await p.$eval(`#${id}-p`, e => e.click());
    if (shots) { const el = await p.$('#' + id); await el.screenshot({ path: path.join(shots, `${id}-${scheme}.png`) }); }
  }
  await p.$$eval('#t-read details', ds => ds.forEach(d => d.open = true));
  for (const t of await p.$$eval('button[data-t]', bs => bs.map(x => x.dataset.t))) {
    await p.click(`button[data-t=${t}]`);
    if (await p.$eval('#' + t, el => /\bNaN\b|\bundefined\b(?! behaviou?r|\.html)|\bInfinity\b/i.test(el.innerText.replace(/considered-undefined/g, "")))) errs.push(t + ' NaN/undefined');
    if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)) errs.push(t + ' sideways');
  }
  const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) errs.push(box);
  if (shots) { await p.click('button[data-t=t-read]'); let k = 0; for (const el of await p.$$('#t-read .hero, #t-read .s3side .lsp-vis')) await el.screenshot({ path: path.join(shots, `vis${k++}-${scheme}.png`) }); }
  console.log(scheme, width, errs.length ? errs : 'clean'); bad += errs.length; await p.close();
}
await b.close(); process.exit(bad ? 1 : 0);
