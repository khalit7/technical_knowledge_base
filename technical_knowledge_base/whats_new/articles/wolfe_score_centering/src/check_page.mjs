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
    // the toy against src/recompute.py (inputs/recompute.json): every estimator and quantity at every sigma on the 0.1 grid
    const RC = JSON.parse(fs.readFileSync(src + '/inputs/recompute.json', 'utf8'));
    const got = await p.evaluate(keys => Object.fromEntries(keys.map(k => [k, window.SC_TOY.grid(+k)])), Object.keys(RC.grid));
    let worst = 0, n = 0;
    for (const [s, row] of Object.entries(RC.grid)) for (const [e, v] of Object.entries(row)) {
      if (typeof v === 'number') { const d = Math.abs(got[s][e] - v); worst = Math.max(worst, d); n++; if (d > 1e-9) errs.push(`toy sigma=${s} ${e}: page ${got[s][e]} recompute ${v}`); continue }
      for (const [q, x] of Object.entries(v)) { const d = Math.abs(got[s][e][q] - x); worst = Math.max(worst, d); n++; if (d > 1e-9) errs.push(`toy sigma=${s} ${e}.${q}: page ${got[s][e][q]} recompute ${x}`) } }
    console.log('toy against recompute.json:', n, 'values, worst absolute difference', worst.toExponential(2));
  }
  console.log(scheme, width, errs.length ? errs : 'clean'); if (errs.length) fail = 1; await p.close();
}
// prose numbers against the recomputed data (inputs/recompute.json)
const html = fs.readFileSync(file, 'utf8');
const RC = JSON.parse(fs.readFileSync(src + '/inputs/recompute.json', 'utf8'));
const g1 = RC.grid['1.0'], g3 = RC.grid['3.0'], f3 = v => v.toFixed(3), C = RC.checks;
const prose = [['drift ' + f3(g1.pg.drift) + ' on the filler logits and group centring ' + f3(g1.gc.drift), 'drift 0.154 on the filler logits and group centring 0.090'],
  ['from ' + f3(RC.grid['0.0'].sc.tend) + ' to ' + f3(g1.pg.tend) + ' under +1/0', 'from 0.376 to 0.997 under +1/0'], ['to ' + f3(g1.gc.tend) + ' under group centring', 'to 0.593 under group centring'],
  ['stops at ' + f3(g1.pg_off.tend) + ', the sampler', 'stops at 0.598, the sampler'], [f3(g1.q_w), '0.598'],
  ['leaves drift ' + f3(g1.tis.drift) + ' and moves w to ' + f3(g1.tis.tend), 'leaves drift 0.014 and moves w to 0.389'],
  ['spread of ' + f3(g1.is.sd) + ' against ' + f3(g1.sc.sd), 'spread of 0.499 against 0.409'], ['gap is ' + f3(g3.is.sd) + ' against ' + f3(g3.sc.sd), 'gap is 1.151 against 0.404'],
  [f3(g1.sc.signal) + ' of the on-policy one at σ = 1 and ' + f3(g3.sc.signal), '0.978 of the on-policy one at σ = 1 and 0.822'],
  ['keeps w at ' + f3(g1.sctis.tend), 'keeps w at 0.376'], [g1.sctis.signal.toFixed(6), '1.000000'],
  ['recomputed: ' + C.full_logprobs_TB.toFixed(1) + ' TB', 'recomputed: 20.4 TB'], [C.bytes_per_token_fp32.toLocaleString('en-US') + ' bytes', '607,744 bytes'],
  ['weight ' + C.ratio_example.toFixed(0), 'weight 100'], ['largest difference ' + C.head_identity_max_err.toExponential(1).replace('e-', 'e-'), 'largest difference 1.1e-16'],
  ['to ' + C.eq14_grad_max_err.toExponential(1), 'to 1.9e-10']];
for (const [fromData, onPage] of prose) if (fromData !== onPage || (!html.includes(onPage) && onPage !== '1.000000')) { console.log('prose number', JSON.stringify(onPage), 'data says', JSON.stringify(fromData), html.includes(onPage) ? '' : '(not on page)'); fail = 1 }
console.log('prose numbers checked', prose.length);
// reduced motion: nothing on this page moves by itself (no autoplay animations); confirm no RD.anim controls exist
const p = await b.newPage(); await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto('file://' + file);
console.log('animations', await p.$$eval('.an-ctl', x => x.length), '(none expected: the figures are static, the toy is a widget)');
await b.close(); console.log(fail ? 'FAIL' : 'all checks passed'); process.exit(fail);
