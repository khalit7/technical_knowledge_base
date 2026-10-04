// Exercise every control of the Benchmark atlas tab at 390 px dark and 920 px light: no errors, no NaN/undefined/null text, no sideways scroll.
// usage: node src/atlas/check_atlas.mjs   (screenshots in ../.shots/atlas-*.png)
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const page = path.resolve(here, '../../index.html');
const shots = path.resolve(here, '../../.shots');
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
let bad = 0;
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + page);
  await p.evaluate(() => { try { localStorage.clear() } catch (e) {} });
  await p.click('button[data-t=t-atlas]');
  await new Promise(r => setTimeout(r, 300));
  const probe = async (label) => {
    const r = await p.evaluate(() => {
      const t = document.getElementById('t-atlas').innerText;
      const m = t.match(/\bNaN\b|\bundefined\b|\bnull\b(?!\s+(model|response))|\[object/g);
      return { bad: m ? m.slice(0, 5) : [], sideways: document.documentElement.scrollWidth > innerWidth, box: (d => d && !d.hidden ? d.textContent : '')(document.getElementById('jsErr')) };
    });
    if (r.bad.length || r.sideways || r.box) { bad++; console.log('FAIL', scheme, width, label, JSON.stringify(r)) }
  };
  await probe('open');
  const clickAll = async (sel, label, limit = 99) => {
    const n = await p.$$eval(sel, els => els.length);
    for (let i = 0; i < Math.min(n, limit); i++) {
      await p.evaluate((s, i) => { const e = document.querySelectorAll(s)[i]; e && e.click() }, sel, i);
      await new Promise(r => setTimeout(r, 30));
      await probe(label + ' ' + i);
    }
    return n;
  };
  const counts = {};
  counts.chips = await clickAll('#at-ctl .chips button', 'chip on');
  counts.chipsOff = await clickAll('#at-ctl .chips button', 'chip off');
  await p.type('#at-q', 'swe'); await probe('search'); await p.click('#at-reset'); await probe('reset');
  await p.click('#at-fix'); await probe('fix filter'); await p.click('#at-fix');
  await p.select('#at-own', 'mc'); await probe('owner'); await p.select('#at-own', '');
  counts.sort = await clickAll('#at-wrap thead button', 'sort');
  counts.sort2 = await clickAll('#at-wrap thead button', 'sort again');
  counts.rows = await clickAll('#at-wrap tbody tr .nm', 'row');
  counts.tick = await clickAll('#at-wrap tbody tr input[type=checkbox]', 'tick', 5);
  counts.presets = await clickAll('#at-cmp-pre button', 'preset');
  counts.corr = await clickAll('#at-corr-b button.jump', 'corr jump');
  counts.map = await clickAll('#at-map button[data-id]', 'map', 200);
  counts.dots = await p.$$eval('#at-def circle[data-id]', els => { els.forEach(e => e.dispatchEvent(new MouseEvent('click', { bubbles: true }))); return els.length });
  await probe('dots');
  counts.mode = await clickAll('#at-an-mode button', 'mode');
  for (let k = 0; k < 22; k++) { await p.click('#at-next'); }
  await probe('anim end');
  for (let k = 0; k < 22; k++) { await p.click('#at-prev'); }
  await probe('anim start');
  await p.click('#at-play'); await new Promise(r => setTimeout(r, 400)); await p.click('#at-play'); await probe('play pause');
  await p.$eval('#at-scrub', e => { e.value = 7; e.dispatchEvent(new Event('input')) }); await probe('scrub');
  await p.evaluate(() => document.getElementById('at-corr').open = true);
  await p.click('#at-cmp-pre button');
  await p.evaluate(() => window.AT.show('osworld_2', false));
  if (errs.length) { bad++; console.log('ERRORS', scheme, width, errs.slice(0, 5)) }
  const el = await p.$('#t-atlas');
  await el.screenshot({ path: `${shots}/atlas-${scheme}-${width}.png` });
  for (const s of ['at-s', 'at-map-s', 'at-def-s', 'at-anim-s']) { const e = await p.$('#' + s); await e.screenshot({ path: `${shots}/atlas-${s}-${scheme}-${width}.png` }) }
  console.log(scheme, width, JSON.stringify(counts), 'errors', errs.length);
  await p.close();
}
await b.close();
console.log(bad ? 'atlas check: FAIL ' + bad : 'atlas check: ok');
