// Every control on this page at 390 dark and 920 light, plus reduced motion: clicks every segmented button,
// steps every animation to its end and back, moves every range and select, opens every closed block, guesses every CLI session,
// and fails on page errors, a visible #jsErr, NaN/undefined/Infinity in the text, or sideways scroll.
// Also screenshots each visual into ../.shots/ (el-*.png) for a look.
// Run from anywhere: node <page>/src/check_controls.mjs
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = execSync('git rev-parse --show-toplevel', { cwd: here }).toString().trim();
const R = createRequire(path.join(root, 'html_utils', 'package.json'));
const puppeteer = R('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html');
const shots = path.resolve(here, '../.shots');
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
let bad = 0;
for (const [scheme, width, rm] of [['dark', 390, false], ['light', 920, false], ['light', 920, true]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: rm ? 'reduce' : 'no-preference' }]);
  await p.goto(file, { waitUntil: 'load' });
  // nothing may move before the reader acts: the step sliders must all sit at 0 after a scroll through the page
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); } });
  await new Promise(r => setTimeout(r, 600));
  const moved = await p.$$eval('input[type=range]', rs => rs.filter(r => +r.value !== 0).map(r => r.id));
  if (moved.length) errs.push('moved before the reader acted: ' + moved.join(','));
  if (width === 390 || !rm) for (const id of ['t-read .hero', 'rs-as-card', 'rs-life', 'rs-bm-chart', 'rs-bm-b', 'rs-cli-card']) {
    const sel = id.includes(' ') ? '#' + id : '#' + id; const el = await p.$(sel);
    if (el) { await el.scrollIntoView(); await el.screenshot({ path: path.join(shots, `el-${id.replace(/[ .#]/g, '_')}-${scheme}-${width}.png`) }); }
  }
  const n = await p.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms)); let c = 0; const tab = document.getElementById('t-read');
    for (const seg of tab.querySelectorAll('.seg')) for (const btn of seg.querySelectorAll('button')) {
      btn.click(); c++; await sleep(20);
      for (const f of tab.querySelectorAll('button[id$="-f"]')) for (let i = 0; i < 80; i++) { f.click(); c++; }
      for (const s of tab.querySelectorAll('input[type=range]')) { s.value = s.max; s.dispatchEvent(new Event('input')); s.value = 0; s.dispatchEvent(new Event('input')); }
      for (const bk of tab.querySelectorAll('button[id$="-b"]')) bk.click();
    }
    for (const pl of tab.querySelectorAll('.an-play')) { pl.click(); await sleep(250); pl.click(); c++; }
    for (const sel of tab.querySelectorAll('select')) { sel.value = '2'; sel.dispatchEvent(new Event('change')); c++; }
    for (let i = 0; i < 12; i++) { const g = document.querySelector('#rs-cli-guess button[data-c="0"]'); if (g) g.click(); document.getElementById('rs-cli-next').click(); c += 2; await sleep(15); }
    document.querySelector('#rs-cli-guess button[data-c="skip"]').click();
    for (const d of document.querySelectorAll('details')) { d.open = true; c++; }
    document.querySelector('button[data-t="t-more"]').click(); await sleep(50); document.querySelector('button[data-t="t-read"]').click();
    return c;
  });
  await new Promise(r => setTimeout(r, 200));
  const r = await p.evaluate(() => {
    const t = document.body.innerText.replace(/no NaNs/g, '');
    return { nan: (t.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/) || [''])[0], side: document.documentElement.scrollWidth > innerWidth,
      box: document.getElementById('jsErr').hidden ? '' : document.getElementById('jsErr').textContent };
  });
  if (r.nan) errs.push('text: ' + r.nan); if (r.side) errs.push('sideways scroll'); if (r.box) errs.push('jsErr: ' + r.box);
  console.log(`${errs.length ? 'FAIL' : 'ok  '} ${scheme} ${width}${rm ? ' reduced-motion' : ''}: ${n} actions ${errs.length ? JSON.stringify(errs) : ''}`);
  if (errs.length) bad++;
  await p.close();
}
await b.close();
console.log(bad ? `check_controls: ${bad} failures` : 'check_controls: clean');
process.exit(bad ? 1 : 0);
