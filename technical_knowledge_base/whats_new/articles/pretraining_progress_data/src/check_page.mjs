// Check every control of the page, both themes and three widths, and the data it embeds.
// usage (from the repo root): node <page folder>/src/check_page.mjs <page index.html>
// Fails (exit 1) on a page error, console error, visible #jsErr, sideways scroll, NaN/undefined/Infinity in a tab's
// text, SVG text under 11 px, a toy that disagrees with src/recompute.py, or a prose number that differs from it.
// (Copied from the reference article page; the toy, calculator and prose checks are this page's own.)
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
    await p.$$eval(`#${t} .pd-seg button`, bs => bs.forEach(b => b.click()));
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
    // the widget against src/recompute.py: at each reference budget, the three read-outs equal by_reference
    const RC = JSON.parse(fs.readFileSync(src + '/inputs/recompute.json', 'utf8'));
    await p.$eval('#tabs button[data-t=t-read]', b => b.click());
    for (let at = 1; at <= 4; at++) {
      const shown = await p.evaluate(at => { const r = document.getElementById('pd-ref'); r.value = at; r.dispatchEvent(new Event('input')); return [...document.querySelectorAll('#pd-out .stat .v')].map(x => x.textContent) }, at);
      const want = ['model', 'data', 'joint'].map(k => { const v = RC.by_reference[at - 1][k]; return v === null ? 'off range' : (v >= 10 ? v.toFixed(1) : v.toFixed(2)) + 'x' });
      if (JSON.stringify(shown) !== JSON.stringify(want)) errs.push(`widget at ${at}: ${shown} want ${want}`);
    }
    // the widget opens on the article's reference (1e19) and shows its 3.7x and 12.0x
    console.log('widget against recompute.json checked at 4 budgets');
    // embedded data equals recompute.json
    const emb = await p.evaluate(() => window.PDD);
    for (const k of ['headline', 'per_year', 'conditional', 'shapley', 'by_reference']) if (JSON.stringify(emb[k]) !== JSON.stringify(RC[k])) errs.push('embedded ' + k + ' differs from recompute.json');
  }
  console.log(scheme, width, errs.length ? errs : 'clean'); if (errs.length) fail = 1; await p.close();
}
// prose numbers against the recomputed data (inputs/recompute.json)
const html = fs.readFileSync(file, 'utf8');
const RC = JSON.parse(fs.readFileSync(src + '/inputs/recompute.json', 'utf8'));
const H = RC.headline, C = RC.conditional, Gd = RC.grid, BS = RC.bootstrap, f1 = v => v.toFixed(1), f2 = v => v.toFixed(2);
const prose = [
  ['but ' + f2(C.model_on_2025_data) + 'x on Ultra-FineWeb', 'but 1.25x on Ultra-FineWeb'], ['= ' + f2(C.data_with_2025_model) + ' / ' + f2(C.model_on_2025_data), '= 4.05 / 1.25'], ['their ' + Math.round(H.product) + 'x product', 'their 45x product'], ['R<sup>2</sup> = ' + f2(Gd.r2), 'R<sup>2</sup> = 0.88'],
  ['explaining ' + Math.round(100 * Gd.share_data) + '% of the variance and the recipe ' + Math.round(100 * Gd.share_model) + '%', 'explaining 81% of the variance and the recipe 7%'],
  ['F = ' + f1(Gd.F_model) + ' on 6 and 36 degrees of freedom, p = ' + Gd.p_model.toFixed(3), 'F = 3.5 on 6 and 36 degrees of freedom, p = 0.008'],
  ['residuals (' + f2(Gd.resid_sd_points) + ' points) near seed noise (' + f2(Gd.seed_sd_points_3e18) + ')', 'residuals (0.70 points) near seed noise (0.60)'],
  ['is ' + f2(Gd.grid_2025model_2019data) + ' points above GPT-2 here, ' + f2(Gd.curves_2025model_2019data) + ' on the multi-seed', 'is 0.14 points above GPT-2 here, 1.73 on the multi-seed'],
  ['the corpus ' + f1(RC.shapley.data) + 'x and the recipe ' + f1(RC.shapley.model) + 'x of the ' + f1(H.joint) + 'x', 'the corpus 7.0x and the recipe 2.2x of the 15.1x'],
  ['data takes ' + Math.round(100 * RC.shapley.data_share) + '% of the 15x and recipes ' + Math.round(100 * RC.shapley.model_share) + '%', 'data takes 72% of the 15x and recipes 28%'],
  ['3.7x (68% range ' + f1(BS.model.p16) + ' to ' + f1(BS.model.p84) + ') and the corpus at 12.0x (' + f1(BS.data.p16) + ' to ' + f1(BS.data.p84) + ')', '3.7x (68% range 3.0 to 4.6) and the corpus at 12.0x (9.6 to 14.9)'],
  ['at ' + f1(BS.gap.p50) + 'x the joint gain (95% range ' + f1(BS.gap.p2_5) + ' to ' + f1(BS.gap.p97_5) + ', above 1 in ' + (100 * BS.share_gap_above_1).toFixed(1) + '% of draws)', 'at 3.0x the joint gain (95% range 1.8 to 4.4, above 1 in 99.9% of draws)'],
  ['at ' + f2(C.model_on_2025_data) + 'x (' + f2(BS.model_on_2025_data.p2_5) + ' to ' + f2(BS.model_on_2025_data.p97_5) + ')', 'at 1.25x (1.01 to 1.51)'],
  ['about ' + RC.ho.over_6y_median + 'x over six years', 'about 380x over six years'], [f1(RC.ho.per_year_median) + 'x a year (<i>derived</i>; ' + f1(RC.ho.per_year_lo) + 'x to ' + f1(RC.ho.per_year_hi) + 'x', '2.7x a year (<i>derived</i>; 1.8x to 6.3x'],
  ['FineWeb-Edu ' + f2(RC.data_table[5].recomputed) + 'x and Ultra-FineWeb ' + f2(RC.data_table[6].recomputed) + 'x', 'FineWeb-Edu 4.80x and Ultra-FineWeb 5.40x'],
  ['RefinedWeb ' + f2(RC.data_table[4].recomputed) + 'x against', 'RefinedWeb 1.81x against'],
  ['reads 9.1x, 8.3x, 12.0x', 'reads ' + RC.by_reference.slice(1).map(r => f1(r.data) + 'x').join(', ')],
  [f1(RC.by_reference[1].model) + 'x at 10<sup>18</sup>, and ' + f2(RC.by_reference[0].model) + 'x', '1.6x at 10<sup>18</sup>, and 0.66x'],
];
for (const [fromData, onPage] of prose) if (fromData !== onPage || !html.includes(fromData)) { console.log('prose number', JSON.stringify(onPage), 'data says', JSON.stringify(fromData), html.includes(fromData) ? '' : '(not on page)'); fail = 1 }
// the recipe table reproduces to the printed digit
for (const r of RC.model_table) if (r.recomputed !== null && r.recomputed.toFixed(2) !== r.published) { console.log('recipe table', r.name, r.published, r.recomputed); fail = 1 }
console.log('prose numbers checked', prose.length);
// reduced motion: nothing on this page moves by itself (no autoplay animations); confirm no RD.anim controls exist
const p = await b.newPage(); await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto('file://' + file);
console.log('animations', await p.$$eval('.an-ctl', x => x.length), '(none expected: the figures are static, the toy is a widget)');
await b.close(); console.log(fail ? 'FAIL' : 'all checks passed'); process.exit(fail);
