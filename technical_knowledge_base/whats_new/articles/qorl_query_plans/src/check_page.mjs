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
    // the toy against src/recompute.py (inputs/recompute.json): every timing count, every tie zone on its 0.005 grid
    const RC = JSON.parse(fs.readFileSync(src + '/inputs/recompute.json', 'utf8'));
    const got = await p.evaluate(fool => Object.fromEntries(Object.entries(fool).map(([k, zs]) => [k, Object.fromEntries(Object.keys(zs).map(z => [z, window.QP_TOY.fooled(+k, +z)]))])), RC.fool);
    let worst = 0;
    for (const [k, zs] of Object.entries(RC.fool)) for (const [z, v] of Object.entries(zs)) for (const i of [0, 1]) {
      const d = Math.abs(got[k][z][i] - v[i]); worst = Math.max(worst, d); if (d > 2e-6) errs.push(`toy k=${k} z=${z}: page ${got[k][z][i]} recompute ${v[i]}`) }
    console.log('toy against recompute.json: worst absolute difference', worst.toExponential(2));
  }
  console.log(scheme, width, errs.length ? errs : 'clean'); if (errs.length) fail = 1; await p.close();
}
// prose numbers against the recomputed data (inputs/recompute.json)
const html = fs.readFileSync(file, 'utf8');
const RC = JSON.parse(fs.readFileSync(src + '/inputs/recompute.json', 'utf8'));
const pc1 = v => (100 * v).toFixed(1) + '%', F = (k) => RC.fool[k]['0.050'][0] + RC.fool[k]['0.050'][1], G = RC.grpo;
const prose = [['fools the reward ' + Math.round(100 * F('1')) + '% of', 'fools the reward 61% of'], [pc1(F('3')) + ' with three', '39.7% with three'],
  [pc1(F('5')) + ' with five', '25.9% with five'], [pc1(F('7')) + ' with seven', '15.5% with seven'], ['(' + RC.slow_triples + ' of 1,140', '(230 of 1,140'],
  ['gives ' + RC.sliding[0] + ' of ' + RC.sliding[1] + ' = ' + (100 * RC.sliding[0] / RC.sliding[1]).toFixed(1) + '%', 'gives 68 of 120 = 56.7%'],
  ['variation is ' + RC.cv.toFixed(2) + '%', 'variation is 10.34%'], ['8 × 3² × 4³ = ' + RC.search_space_3.toLocaleString('en-US'), '8 × 3² × 4³ = 4,608'],
  ['the mean is ' + G.old_mean.toFixed(2).replace('-', '−'), 'the mean is −1.57'], ['GRPO advantages ' + G.old_adv.map(v => (v > 0 ? '+' : '') + v.toFixed(2)).join(', ').replace(/-/g, '−'), 'GRPO advantages −1.43, −1.43, +1.34, +1.52'],
  ['anchored advantages ' + G.new_adv.map(v => v.toFixed(2)).join(', ').replace(/-/g, '−'), 'anchored advantages −0.10, −0.10, −0.18, −0.02'],
  ['= ' + RC.workload.ratio.toFixed(2) + ' times the speed', '= 1.81 times the speed'], ['= ' + RC.workload.cut_pct.toFixed(1) + '% less time', '= 44.7% less time'],
  ['= ' + RC.metric_example.workload.toFixed(2) + 'x', '= 1.62x']];
for (const [fromData, onPage] of prose) if (fromData !== onPage || !html.includes(onPage)) { console.log('prose number', JSON.stringify(onPage), 'data says', JSON.stringify(fromData), html.includes(onPage) ? '' : '(not on page)'); fail = 1 }
console.log('prose numbers checked', prose.length);
// reduced motion: nothing on this page moves by itself (no autoplay animations); confirm no RD.anim controls exist
const p = await b.newPage(); await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto('file://' + file);
console.log('animations', await p.$$eval('.an-ctl', x => x.length), '(none expected: the figures are static, the toy is a widget)');
await b.close(); console.log(fail ? 'FAIL' : 'all checks passed'); process.exit(fail);
