// Check every control of the page, both themes and three widths, and the data it embeds.
// usage (from the repo root): node <page folder>/src/check_page.mjs <page index.html>
// Fails (exit 1) on a page error, console error, visible #jsErr, sideways scroll, NaN/undefined/Infinity in a tab's
// text, SVG text under 11 px, a toy that disagrees with the edit formula, or embedded data that differs from inputs/.
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
  if (scheme === 'dark') {
    // the toy follows the formula W <- W - alpha u (m * u^T W): at alpha 1 the chosen neurons stop writing along u
    const r = await p.evaluate(() => { const T = window.WPTOY, s = (uw, a) => uw.reduce((x, c, j) => x + c * a[j], 0);
      const rest = T.UW.map((c, j) => T.CHOSEN.includes(j) ? 0 : c);
      return { a1: T.edit(1, 'few').loop, want1: s(rest, T.ACT.loop), a0: T.edit(0, 'all').prod, want0: s(T.UW, T.ACT.prod),
               a6: T.edit(6, 'all').prod, want6: -5 * s(T.UW, T.ACT.prod) } });
    for (const [k, w] of [['a1', 'want1'], ['a0', 'want0'], ['a6', 'want6']]) if (Math.abs(r[k] - r[w]) > 1e-9) errs.push(`toy ${k} ${r[k]} != ${r[w]}`);
  }
  console.log(scheme, width, errs.length ? errs : 'clean'); if (errs.length) fail = 1; await p.close();
}
// data check outside the browser: the embedded edit equals inputs/real_edit.json, and prose numbers match it
const html = fs.readFileSync(file, 'utf8');
const m = html.match(/window\.ARTICLE=(\{.*?\});\n/s); const A = JSON.parse(m[1]);
const E = JSON.parse(fs.readFileSync(src + '/inputs/real_edit.json', 'utf8'));
const same = JSON.stringify(A.edit) === JSON.stringify(E);
const L = E.layers, pct = x => (100 * x).toFixed(1) + '%';
const prose = [['10.6% and 8.1%', pct(L[0].rel_change_tensor) + ' and ' + pct(L[1].rel_change_tensor)],
  ['only 31 of layer 15', 'only ' + L[0].edited_in_top64_by_abs_u + ' of layer 15'], ['and 18 of layer 19', 'and ' + L[1].edited_in_top64_by_abs_u + ' of layer 19'],
  ['6.00 (5.99 to 6.01)', L[0].removed_share_median.toFixed(2) + ' (' + Math.min(L[0].removed_share_min, L[1].removed_share_min).toFixed(2) + ' to ' + Math.max(L[0].removed_share_max, L[1].removed_share_max).toFixed(2) + ')']];
for (const [onPage, fromData] of prose) if (onPage !== fromData || !html.includes(onPage)) { console.log('prose number', onPage, 'data says', fromData); fail = 1 }
console.log('embedded data', same ? 'matches inputs/real_edit.json' : 'DIFFERS'); if (!same) fail = 1;
// reduced motion: nothing on this page moves by itself (no autoplay animations); confirm no RD.anim controls exist
const p = await b.newPage(); await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto('file://' + file);
console.log('animations', await p.$$eval('.an-ctl', x => x.length), '(none expected: the figures are static and the toy is a widget)');
await b.close(); console.log(fail ? 'FAIL' : 'all checks passed'); process.exit(fail);
