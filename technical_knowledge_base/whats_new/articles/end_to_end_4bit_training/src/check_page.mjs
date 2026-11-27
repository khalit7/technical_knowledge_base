// Check every control of the page, both themes and three widths, and the data it embeds.
// usage (from the repo root): node <page folder>/src/check_page.mjs <page index.html>
// Fails (exit 1) on a page error, console error, visible #jsErr, sideways scroll, NaN/undefined/Infinity in a tab's
// text, SVG text under 11 px, a toy or calculator that disagrees with src/recompute.py, or a prose number that differs from it.
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
    // the toy and the calculator against src/recompute.py (inputs/recompute.json): every statistic, every tile
    const RC = JSON.parse(fs.readFileSync(src + '/inputs/recompute.json', 'utf8'));
    const got = await p.evaluate(() => ({ t: Object.fromEntries(['gauss', 'row', 'outlier', 'channel'].map(k => [k, window.E4TOY.stats(k)])),
      c: { pre: window.E4CALC.share('pre', 3), rl3: window.E4CALC.share('rl', 3), rl183: window.E4CALC.share('rl', 8.25 / 4.5) } }));
    let worst = 0;
    for (const [pk, opts] of Object.entries(RC.tiles)) for (const [o, st] of Object.entries(opts)) for (const [k, v] of Object.entries(st)) {
      const d = Math.abs(got.t[pk][o][k] - v) / Math.max(1e-12, Math.abs(v), 1e-6); worst = Math.max(worst, d);
      if (d > 1e-6) errs.push(`toy ${pk} ${o} ${k}: page ${got.t[pk][o][k]} recompute ${v}`) }
    for (const [k, w] of [['pre', 'pretrain_r3'], ['rl3', 'rl_r3'], ['rl183', 'rl_r183']]) if (Math.abs(got.c[k] - RC.calc[w].share) > 1e-9) errs.push(`calc ${k} ${got.c[k]} != ${RC.calc[w].share}`);
    console.log('toy and calculator against recompute.json: worst relative difference', worst.toExponential(2));
  }
  console.log(scheme, width, errs.length ? errs : 'clean'); if (errs.length) fail = 1; await p.close();
}
// prose numbers against the recomputed data (inputs/recompute.json)
const html = fs.readFileSync(file, 'utf8');
const RC = JSON.parse(fs.readFileSync(src + '/inputs/recompute.json', 'utf8')); const T = RC.tiles, O = T.outlier;
const pc1 = v => (100 * v).toFixed(1) + '%', rng = (k, f) => { const v = Object.values(T).map(x => x[k][f]); return pc1(Math.min(...v)) + ' to ' + pc1(Math.max(...v)) };
const prose = [['leaves a ' + pc1(O.naive.bias) + ' error', 'leaves a 13.0% error'], ['already lost ' + O.tile.fwd_zero + ' of 512', 'already lost 252 of 512'],
  ['against ' + O.mxsr.fwd_zero + ' with row scales', 'against 49 with row scales'], ['unbiased (' + pc1(O.nvsr.bias), 'unbiased (0.5%'],
  ['off by ' + pc1(O.nvsr.noise), 'off by 13.4%'], ['with ' + pc1(O.mxsr.noise) + ' noise', 'with 2.0% noise'], ['about ' + (100 * O.mxsr.avg1000).toFixed(2) + '% after 1,000', 'about 0.06% after 1,000'],
  ['leaves a fixed ' + pc1(O.mxrtn.bias), 'leaves a fixed 1.6%'], [rng('naive', 'bias') + ' for the naive', '13.0% to 14.4% for the naive'], [rng('mxrtn', 'bias') + ' for nearest', '1.6% to 3.6% for nearest'],
  ['s = ' + pc1(RC.calc.pretrain_r3.share), 's = 11.1%'], ['= ' + RC.calc.pretrain_r3.time_same_loss.toFixed(3) + ' of the time', '= 0.945 of the time'],
  ['0.92 / 0.98 = ' + RC.calc.pretrain_r3.time_same_loss_if_less_time.toFixed(3), '0.92 / 0.98 = 0.939'],
  [pc1(RC.calc.rl_r3.share) + ' of the step at 3 times', '25.0% of the step at 3 times'], ['or ' + pc1(RC.calc.rl_r183.share) + ' if sampling', 'or 36.7% if sampling'],
  [Math.round(RC.flop_per_byte).toLocaleString('en-US') + ' floating-point', '16,667 floating-point']];
for (const [fromData, onPage] of prose) if (fromData !== onPage || !html.includes(onPage)) { console.log('prose number', JSON.stringify(onPage), 'data says', JSON.stringify(fromData), html.includes(onPage) ? '' : '(not on page)'); fail = 1 }
console.log('prose numbers checked', prose.length);
// reduced motion: nothing on this page moves by itself (no autoplay animations); confirm no RD.anim controls exist
const p = await b.newPage(); await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto('file://' + file);
console.log('animations', await p.$$eval('.an-ctl', x => x.length), '(none expected: the figures are static, the toy and the calculator are widgets)');
await b.close(); console.log(fail ? 'FAIL' : 'all checks passed'); process.exit(fail);
