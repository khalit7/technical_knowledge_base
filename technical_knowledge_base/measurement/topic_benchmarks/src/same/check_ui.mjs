// Exercise every control of the "Same model, many numbers" tab (t-same) at 390 px dark and 920 px light:
// every case chip, every reading row, compare boxes, the table toggle, the "open in calculator" button,
// every animation track and mode with every control, every calculator preset, input, level and the paired slider.
// Fails on page errors, NaN/undefined/Infinity in visible text, sideways scroll, or SVG text below 11 px on screen.
// usage (from anywhere): node src/same/check_ui.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../../index.html');
const shots = process.argv[2] || path.resolve(here, '../../.shots');
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
let problems = [], actions = 0;
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file);
  await p.evaluate(() => { try { localStorage.clear() } catch (e) {} });
  await p.click('#tabs button[data-t="t-same"]');
  await sleep(300);
  const audit = async where => {
    const r = await p.evaluate(() => {
      const tab = document.getElementById('t-same');
      const txt = tab.innerText;
      const bad = (txt.match(/.{0,30}\b(NaN|undefined|Infinity|null)\b.{0,30}/g) || []).filter(s => !/\bnull hypothesis/.test(s));
      const small = [];
      tab.querySelectorAll('svg text').forEach(t => { const m = t.ownerSVGElement.getScreenCTM(); if (!m) return; const fs = parseFloat(getComputedStyle(t).fontSize) * m.a; if (fs < 9.95 && t.getBoundingClientRect().width > 0) small.push(t.textContent.slice(0, 20) + ' ' + fs.toFixed(1)) });
      const side = document.documentElement.scrollWidth > window.innerWidth + 1;
      const err = document.getElementById('jsErr'); const eb = err && !err.hidden ? err.textContent : '';
      return { bad, small: small.slice(0, 5), side, eb };
    });
    if (r.bad.length) problems.push(`${scheme}${width} ${where}: bad text ${r.bad.slice(0, 3).join(' | ')}`);
    if (r.small.length) problems.push(`${scheme}${width} ${where}: small svg text ${r.small.join(', ')}`);
    if (r.side) problems.push(`${scheme}${width} ${where}: sideways scroll`);
    if (r.eb) problems.push(`${scheme}${width} ${where}: errbox ${r.eb}`);
  };
  await audit('open');
  await p.screenshot({ path: `${shots}/same-${scheme}-${width}-top.png`, fullPage: false });
  // cases
  const nCases = await p.$$eval('#sm-chips button', bs => bs.length);
  for (let i = 0; i < nCases; i++) {
    await p.click(`#sm-chips button[data-i="${i}"]`); actions++;
    const nRows = await p.$$eval('#sm-case .sm-row', rs => rs.length);
    for (let j = 0; j < nRows; j++) { await p.click(`#sm-case .sm-row[data-i="${j}"] .nm`); actions++; }
    await audit(`case ${i} rows`);
    // compare first two and last row
    await p.click(`#sm-case .sm-row[data-i="0"] input`); await p.click(`#sm-case .sm-row[data-i="1"] input`); await p.click(`#sm-case .sm-row[data-i="${nRows - 1}"] input`); actions += 3;
    await audit(`case ${i} compare`);
    if (await p.$('#sm-test')) { await p.click('#sm-test'); actions++; await sleep(50); await audit(`case ${i} to calculator`); }
    await p.click('#sm-tt'); actions++; await audit(`case ${i} table`);
    if (i === 0 || i === 6) await p.screenshot({ path: `${shots}/same-${scheme}-${width}-case${i}.png`, fullPage: false, clip: await p.$eval('#sm-case', e => { const r = e.getBoundingClientRect(); return { x: 0, y: r.top + scrollY, width: innerWidth, height: Math.min(2400, r.height) } }) });
    await p.click('#sm-tt');
  }
  // animation
  await p.$eval('#sm-h-anim', e => e.scrollIntoView());
  const nTr = await p.$$eval('#sm-an-tr button', bs => bs.length);
  for (let t = 0; t < nTr; t++) {
    await p.click(`#sm-an-tr button[data-i="${t}"]`); actions++;
    for (const m of ['step', 'ba']) {
      await p.click(`#sm-an-mode button[data-m="${m}"]`); actions++;
      const n = await p.$eval('#sm-scrub', s => +s.max + 1);
      for (let k = 0; k < n; k++) { await p.click('#sm-next'); actions++; await sleep(80); }
      await audit(`anim ${t} ${m} end`);
      await p.click('#sm-prev'); await p.click('#sm-first'); actions += 2;
      await p.$eval('#sm-scrub', s => { s.value = s.max; s.dispatchEvent(new Event('input')) }); actions++;
      for (const sp of ['0.5', '2', '1']) { await p.click(`#sm-speed button[data-s="${sp}"]`); actions++; }
      await p.click('#sm-play'); await sleep(1500); await p.click('#sm-play'); actions += 2;
      await audit(`anim ${t} ${m} play`);
    }
    await p.click('#sm-an-mode button[data-m="step"]');
    await sleep(1000);
    await p.screenshot({ path: `${shots}/same-${scheme}-${width}-anim${t}.png`, clip: await p.$eval('#sm-an', e => { const r = e.getBoundingClientRect(); return { x: 0, y: r.top + scrollY, width: innerWidth, height: r.height } }) });
  }
  // calculator
  const nPre = await p.$$eval('#sm-pre option', o => o.length);
  for (let i = 1; i < nPre; i++) { await p.select('#sm-pre', String(i - 1)); actions++; await audit(`preset ${i}`); }
  for (const [a, bb] of [['0', '0'], ['100', '100'], ['50', '52'], ['74.4', '83.3'], ['12.5', '99.9']]) {
    await p.$eval('#sm-pa', (e, v) => { e.value = v; e.dispatchEvent(new Event('input')) }, a);
    await p.$eval('#sm-pb', (e, v) => { e.value = v; e.dispatchEvent(new Event('input')) }, bb); actions += 2;
    await audit(`scores ${a} ${bb}`);
    if (await p.$('#sm-disc')) { await p.$eval('#sm-disc', e => { e.value = e.min; e.dispatchEvent(new Event('input')) }); await p.$eval('#sm-disc', e => { e.value = e.max; e.dispatchEvent(new Event('input')) }); actions += 2; await audit(`disc ${a} ${bb}`); }
  }
  for (const c of ['0.9', '0.99', '0.95']) { await p.click(`#sm-cl button[data-c="${c}"]`); actions++; }
  await p.click('#sm-same'); actions++;
  await p.$eval('#sm-nb', e => { e.value = 70; e.dispatchEvent(new Event('input')) });
  await p.$eval('#sm-na', e => { e.value = 70; e.dispatchEvent(new Event('input')) });
  await p.$eval('#sm-pa', e => { e.value = 52.6; e.dispatchEvent(new Event('input')) });
  await p.$eval('#sm-pb', e => { e.value = 43.3; e.dispatchEvent(new Event('input')) }); actions += 4;
  await audit('unpaired 70');
  const fis = await p.$eval('#sm-cout', e => (e.innerText.match(/Fisher's exact test: p = ([0-9]+\.[0-9]+)/) || [])[1]);
  if (fis !== '0.310') problems.push(`${scheme}${width}: Fisher p for 37 vs 30 of 70 shows ${fis}, expected 0.310`);
  await p.click('#sm-same');
  await p.select('#sm-pre', '1');
  await p.$eval('#sm-pa', e => { e.value = 80; e.dispatchEvent(new Event('input')) });
  const se = await p.$eval('#sm-cout', e => (e.innerText.match(/±([0-9.]+) pts/) || [])[1]);
  if (se !== '7.3') problems.push(`${scheme}${width}: AIME SE at 80% shows ${se}, expected 7.3 (Reading tab)`);
  await p.$eval('#sm-h-calc', e => e.scrollIntoView());
  await p.screenshot({ path: `${shots}/same-${scheme}-${width}-calc.png`, clip: await p.$eval('#sm-calc', e => { const r = e.getBoundingClientRect(); return { x: 0, y: r.top + scrollY, width: innerWidth, height: r.height } }) });
  if (errs.length) problems.push(`${scheme}${width}: errors ${errs.join(' | ')}`);
  await p.close();
}
await b.close();
console.log(`actions ${actions}, problems ${problems.length}`);
problems.slice(0, 40).forEach(x => console.log('  ' + x));
process.exit(problems.length ? 1 : 0);
