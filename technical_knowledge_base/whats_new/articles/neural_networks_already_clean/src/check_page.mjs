// Check every control of the page, both themes and three widths, and the data it embeds.
// usage (from the repo root): node <page folder>/src/check_page.mjs <page index.html>
// Fails (exit 1) on a page error, console error, visible #jsErr, sideways scroll, NaN/undefined/Infinity in a tab's
// text, SVG text under 11 px, a figure not drawn, the hero listing the wrong members, or a figure number missing from the text.
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const file = path.resolve(process.argv[2]); const src = path.dirname(file) + '/src';
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
let fail = 0;
for (const [scheme, width] of [['dark', 390], ['light', 920], ['light', 1400]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && !/kb_buddy|ERR_FILE_NOT_FOUND/.test(m.text()) && errs.push(m.text()));
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + file); await new Promise(r => setTimeout(r, 300));
  for (const t of await p.$$eval('#tabs button[data-t]', bs => bs.map(b => b.dataset.t))) {
    await p.$eval(`#tabs button[data-t=${t}]`, b => b.click()); await new Promise(r => setTimeout(r, 200));
    // every segmented button, every details block, every range at min, mid and max (DOM events, not coordinates)
    await p.$$eval(`#${t} .seg button`, bs => bs.forEach(b => b.click()));
    await p.$$eval(`#${t} details`, ds => ds.forEach(d => d.open = true));
    for (const v of ['min', 'mid', 'max', 'start'])
      await p.$$eval(`#${t} input[type=range]`, (rs, v) => rs.forEach(r => { const lo = +r.min, hi = +r.max; r.value = v === 'min' ? lo : v === 'max' ? hi : v === 'mid' ? (lo + hi) / 2 : 6; r.dispatchEvent(new Event('input')) }), v);
    const bad = await p.$eval('#' + t, el => (el.innerText.match(/\bNaN\b|\bundefined\b|\bInfinity\b/) || [''])[0]);
    const side = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    const small = await p.$$eval(`#${t} svg text`, ts => ts.filter(x => x.getClientRects().length && parseFloat(getComputedStyle(x).fontSize) < 11).length);
    if (bad || side || small) errs.push(`${t}: ${bad ? 'found ' + bad : ''} ${side ? 'sideways scroll' : ''} ${small ? small + ' svg labels under 11 px' : ''}`);
  }
  const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) errs.push('jsErr: ' + box);
  // every figure drew an svg; the hero lists 24/N members for each mode, contiguous for generalization, N apart for superposition
  const figs = await p.$$eval('[id^=nc-][id$=-svg]', es => es.map(e => [e.id, !!e.querySelector('svg')]));
  for (const [id, ok] of figs) if (!ok) errs.push('figure not drawn: ' + id);
  for (const n of ['12', '8', '4']) {
    await p.$eval(`#nc-hero-n button[data-m="${n}"]`, b => b.click());
    const out = await p.$eval('#nc-hero-out', e => e.textContent);
    const parts = out.split(/Generalization: |Superposition: /).slice(1).map(x => x.replace(/ \(.*$/, '').split(', '));
    if (parts.length !== 2 || parts[0].length !== 24 / +n || parts[1].length !== 24 / +n) errs.push(`hero members wrong at N=${n}: ${out}`);
  }
  console.log(scheme, width, errs.length ? errs : 'clean'); if (errs.length) fail = 1; await p.close();
}
// numbers check outside the browser: each figure's numbers appear in its caption or the prose (the buddy and readers can cite them)
const html = fs.readFileSync(file, 'utf8');
for (const n of ['about 0%', 'about 5%', 'about 50%', 'about 70%', 'about 99%', '76%', '11%', '164', '15', '4', '0.3%', '1.7%', '8%', '47%', '69%', '90%', '97%', '0.278'])
  if (!html.includes(n)) { console.log('figure number missing from text:', n); fail = 1 }
// reduced motion: nothing on this page moves by itself (no autoplay animations); confirm no RD.anim controls exist
const p = await b.newPage(); await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto('file://' + file);
console.log('animations', await p.$$eval('.an-ctl', x => x.length), '(none expected: every figure is static or a widget)');
await b.close(); console.log(fail ? 'FAIL' : 'all checks passed'); process.exit(fail);
