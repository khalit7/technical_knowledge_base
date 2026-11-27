// Check every control of the page, both themes and three widths, and the data it embeds.
// usage (from the repo root): node <page folder>/src/check_page.mjs <page index.html> [shots dir outside the repo]
// Fails (exit 1) on a page error, console error, visible #jsErr, sideways scroll, NaN/undefined/Infinity in a tab's
// text, SVG text under 11 px, a toy rerun that differs from its recorded seed, embedded data that differs from
// inputs/figures.json or toy/out/toy.json, or a prose number that differs from them. With a second argument it saves
// cropped shots of every figure card there.
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const file = path.resolve(process.argv[2]); const src = path.dirname(file) + '/src'; const shots = process.argv[3] ? path.resolve(process.argv[3]) : '';
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
let fail = 0;
for (const [scheme, width] of [['dark', 390], ['light', 920], ['light', 1400]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && !/kb_buddy|kb_index|ERR_FILE_NOT_FOUND/.test(m.text()) && errs.push(m.text()));
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
  // the toy: rerun seed 1 at width 8 in the browser and compare with the recorded values (the Python port checks the same records)
  if (scheme === 'dark') {
    await p.$eval('#tabs button[data-t=t-read]', b => b.click());
    await p.$eval('#du-toy-w button[data-m="8"]', b => b.click());
    await p.$eval('#du-toy-run', b => b.click());
    await p.waitForFunction(() => window.DUT_LAST && window.DUT_LAST.H === '8', { timeout: 60000 });
    const w = await p.evaluate(() => window.DUT_LAST.worst); if (!(w < 2e-6)) errs.push('toy rerun differs from the recorded seed 1 by ' + w);
    else console.log('toy rerun in the browser matches the recorded seed 1 (largest difference ' + w.toExponential(1) + ')');
  }
  // cropped shots of every figure card, for looking at
  if (shots) { fs.mkdirSync(shots, { recursive: true }); await p.$eval('#tabs button[data-t=t-read]', b => b.click());
    for (const id of await p.$$eval('#t-read figure.card', fs => fs.map(f => f.id))) { const el = await p.$('#' + id); await el.scrollIntoView(); await new Promise(r => setTimeout(r, 150)); await el.screenshot({ path: `${shots}/${id}-${scheme}-${width}.png` }) } }
  console.log(scheme, width, errs.length ? errs : 'clean'); if (errs.length) fail = 1; await p.close();
}
// data check outside the browser: the embedded data equal recompute.py's and record.mjs's outputs, and prose numbers match them
const html = fs.readFileSync(file, 'utf8');
const m = html.match(/window\.ARTICLE=(\{.*?\});\n/s); const A = JSON.parse(m[1]);
const F = JSON.parse(fs.readFileSync(src + '/inputs/figures.json', 'utf8')), TY = JSON.parse(fs.readFileSync(src + '/toy/out/toy.json', 'utf8'));
const same = JSON.stringify(A.fig) === JSON.stringify(F) && JSON.stringify(A.toy) === JSON.stringify(TY);
const W32 = TY.widths['32'], ratio = H => TY.widths[H].fit.w.c / TY.widths[H].fit.at.c, f2 = x => x.toFixed(2), sg = x => (x > 0 ? '+' : '&minus;') + Math.abs(x).toFixed(3);
const prose = [
  ['(cosine 0.82 at width 32', '(cosine ' + f2(W32.mean.at[6]) + ' at width 32'], ['weight noise second (0.33)', 'weight noise second (' + f2(W32.mean.w[6]) + ')'],
  ['one batch reward worst (0.19)', 'one batch reward worst (' + f2(W32.mean.a1[6]) + ')'],
  ['about 18 times fewer forward passes than weight noise here', 'about ' + Math.round((ratio('8') + ratio('32') + ratio('128')) / 3) + ' times fewer forward passes than weight noise here'],
  ['about 14,700 forward passes', 'about ' + (Math.round(F.cost.per_update / 100) * 100).toLocaleString('en-US') + ' forward passes'],
  ['about 19 times backprop', 'about ' + F.cost.x_bp['64'] + ' times backprop'], ['4,900 times at 16,384', (Math.round(F.cost.x_bp['16384'] / 100) * 100).toLocaleString('en-US') + ' times at 16,384'],
  ['averages 0.89 of a forward', 'averages ' + F.cost.per_draw + ' of a forward'], ['costs 14,659 forward-equivalents', 'costs ' + F.cost.per_update.toLocaleString('en-US') + ' forward-equivalents'],
  ['Ratio: 4,886', 'Ratio: ' + F.cost.x_bp['16384'].toLocaleString('en-US')],
  ['(filled; &minus;0.046, &minus;0.043, +0.060, +0.169)', '(filled; ' + F.budgets.map(b => sg(F.gap16[b])).join(', ') + ')'],
  ['(open; +0.024, +0.331, +0.408, +0.632)', '(open; ' + F.budgets.map(b => sg(F.gap64[b])).join(', ') + ')'],
  ['(+0.047, +0.749, +1.044, +1.232)', '(' + F.budgets.map(b => sg(F.gapE[b])).join(', ') + ')'],
  ['SGD +0.051, Adam +0.398', 'SGD ' + sg(F.noise_gap.sgd) + ', Adam ' + sg(F.noise_gap.adam)],
  ['2.0M +0.525, 7.3M +0.490, 38M +0.543, 243M +0.671', F.sizes.names.map((n, j) => n + ' ' + sg(F.size_gap[0][j])).join(', ')],
  ['at 16,384: &minus;0.009, &minus;0.001, +0.021, +0.038', 'at 16,384: ' + F.size_gap[4].map(sg).join(', ')],
  ['MLP out 0.51 (ceiling 0.88)', 'MLP out ' + f2(F.cos16[0][1]) + ' (ceiling ' + f2(F.t8[0][1]) + ')'], ['key 0.16 (1.00)', 'key ' + f2(F.cos16[4][1]) + ' (' + f2(F.t8[4][1]) + ')'],
  ['head 0.98 (1.00)', 'head ' + f2(F.cos16[9][1]) + ' (' + f2(F.t8[9][1]) + ')'],
  ['57, 229, 916, 3,665 and 14,659', F.pops.slice(0, 4).map(K => Math.round(F.cost.per_update * K / 16384).toLocaleString('en-US')).join(', ') + ' and ' + F.cost.per_update.toLocaleString('en-US')]];
for (const [onPage, fromData] of prose) if (onPage !== fromData || !html.includes(onPage)) { console.log('prose number', onPage, '| data says', fromData, '| on page:', html.includes(onPage)); fail = 1 }
console.log('embedded data', same ? 'matches inputs/figures.json and toy/out/toy.json' : 'DIFFERS'); if (!same) fail = 1;
// reduced motion: nothing on this page moves by itself (no autoplay animations); confirm no RD.anim controls exist
const p = await b.newPage(); await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto('file://' + file);
console.log('animations', await p.$$eval('.an-ctl', x => x.length), '(none expected: the figures are static and the toy is a widget)');
await b.close(); console.log(fail ? 'FAIL' : 'all checks passed'); process.exit(fail);
