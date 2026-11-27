// Check every control of the page, both themes and three widths, and the data it embeds.
// usage (from the repo root): node <page folder>/src/check_page.mjs <page index.html>
// Fails (exit 1) on a page error, console error, visible #jsErr, sideways scroll, NaN/undefined/Infinity in a tab's
// text, SVG text under 11 px, a hero label past the card's edge, or a recomputed number the prose does not print.
// The next article builder: keep the generic loop; replace the toy and data checks with your page's own.
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
  // the hero is drawn and every label sits inside the card (no SVG text past the right edge)
  const hero = await p.evaluate(() => { const svg = document.querySelector('#rp-hero-svg svg'); if (!svg) return 'no hero svg';
    const r = svg.getBoundingClientRect(); const out = [...svg.querySelectorAll('text')].filter(t => t.getBoundingClientRect().right > r.right + 1).map(t => t.textContent);
    return out.length ? 'hero labels past the edge: ' + out.join(' | ') : '' });
  if (hero) errs.push(hero);
  console.log(scheme, width, errs.length ? errs : 'clean'); if (errs.length) fail = 1; await p.close();
}
// data check outside the browser: the recomputed numbers the prose prints (closed block "The article's numbers, recomputed")
const html = fs.readFileSync(file, 'utf8');
const rot = (a, b, d) => { const t = d * Math.PI / 180; return [a * Math.cos(t) - b * Math.sin(t), a * Math.sin(t) + b * Math.cos(t)] };
const f3 = x => (x < 0 ? '\u2212' : '') + Math.abs(x).toFixed(3);
const k = rot(1, 5, 40), q = rot(1, 5, 100);
const MiB = 1048576 * 32 * 2 * 2 / 2 ** 20, MiB4 = 1048576 * 32 * 2 * (0.5 + 1 / 16) / 2 ** 20;
const want = [`(${f3(k[0])}, ${f3(k[1])})`, `(${f3(q[0])}, ${f3(q[1])})`, (26 * Math.cos(40 * Math.PI / 180)).toFixed(2), MiB + ' MiB', Math.round(MiB4) + ' MiB',
  (1024 * 1024 / 355e6 * 100).toFixed(2) + '%', (102.4e6 / (355e6 - 1024 * 1024 + 102.4e6) * 100).toFixed(1) + '%'];
for (const w of want) if (!html.includes(w)) { console.log('prose number missing:', w); fail = 1 }
console.log('recomputed numbers', want.join(' · '));
// reduced motion: nothing on this page moves by itself (no autoplay animations); confirm no RD.anim controls exist
const p = await b.newPage(); await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto('file://' + file);
console.log('animations', await p.$$eval('.an-ctl', x => x.length), '(none expected: the one figure is static)');
await b.close(); console.log(fail ? 'FAIL' : 'all checks passed'); process.exit(fail);
