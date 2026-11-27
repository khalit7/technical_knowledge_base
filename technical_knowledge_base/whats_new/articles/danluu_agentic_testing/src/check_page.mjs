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
  // the toy: draw several no-effect worlds, go back to the real results, at both efforts (DOM clicks)
  for (const m of ['medium', 'xhigh']) { await p.$eval(`#dl-eff button[data-m=${m}]`, b => b.click()); for (let i = 0; i < 3; i++) await p.$eval('#dl-draw', b => b.click()); await p.$eval('#dl-real', b => b.click()) }
  const bad2 = await p.$eval('#t-read', el => (el.innerText.match(/\bNaN\b|\bundefined\b|\bInfinity\b/) || [''])[0]); if (bad2) errs.push('after toy clicks: ' + bad2);
  if (scheme === 'dark') {
    // embedded data equals src/inputs/recompute.json; the toy's chi-square on the real rows equals recompute.py's; draws are reproducible
    const RC = JSON.parse(fs.readFileSync(src + '/inputs/recompute.json', 'utf8'));
    const emb = await p.evaluate(() => JSON.stringify(window.ARTICLE.recompute));
    if (emb !== JSON.stringify(RC)) errs.push('embedded recompute differs from inputs/recompute.json');
    for (const e of ['medium', 'xhigh']) {
      const c = await p.evaluate(e => window.DL_TOY.chisq(window.ARTICLE.recompute.effort[e].rows), e);
      if (Math.abs(c - RC.effort[e].chi2) > 0.051) errs.push(`toy chi-square ${e} ${c} recompute ${RC.effort[e].chi2}`);
      const a = await p.evaluate(e => JSON.stringify(window.DL_TOY.draw(e, 7)), e), b = await p.evaluate(e => JSON.stringify(window.DL_TOY.draw(e, 7)), e);
      if (a !== b) errs.push('toy draw not reproducible');
      const d = JSON.parse(a); if (d.length !== 30 || d.some(r => r.k < 0 || r.k > r.n)) errs.push('toy draw out of range');
    }
    // over 400 drawn worlds the mean spread lands near recompute.py's exact expectation (sampling check of the toy)
    const sp = await p.evaluate(() => { let s = 0; for (let i = 1; i <= 400; i++) { const d = window.DL_TOY.draw('xhigh', 1000 + i).filter(r => r.n === 80); const k = d.map(r => r.k); s += (Math.max(...k) - Math.min(...k)) / 80 * 100 } return s / 400 });
    console.log('toy: mean spread of 400 xhigh draws', sp.toFixed(2), 'exact', RC.effort.xhigh.null_range_mean_points);
    if (Math.abs(sp - RC.effort.xhigh.null_range_mean_points) > 0.8) errs.push('toy spread off the exact expectation');
  }
  console.log(scheme, width, errs.length ? errs : 'clean'); if (errs.length) fail = 1; await p.close();
}
// prose numbers against the recomputed data (inputs/recompute.json)
const html = fs.readFileSync(file, 'utf8');
const RC = JSON.parse(fs.readFileSync(src + '/inputs/recompute.json', 'utf8')); const X = RC.effort.xhigh, M = RC.effort.medium, A = RC.astra_imap;
const f1 = v => v.toFixed(1), mde = Math.round(M.mde_points) + ' points at medium and ' + Math.round(X.mde_points) + ' at xhigh';
const prose = [[mde, '21 points at medium and 17 at xhigh'], ['chi-square ' + f1(X.chi2) + ' on 29 degrees of freedom, p = ' + X.chi2_p.toFixed(2), 'chi-square 22.6 on 29 degrees of freedom, p = 0.80'],
  ['spread is what such draws give on average (' + f1(X.null_range_mean_points) + ')', 'spread is what such draws give on average (18.8)'], ['their ' + f1(X.obs_range_points) + '-point spread', 'their 17.5-point spread'],
  ['a little wider than chance (p = ' + M.chi2_p.toFixed(2) + ';', 'a little wider than chance (p = 0.04;'], ['(correlation ' + RC.medium_xhigh_r.toFixed(2).replace('-', '−') + ' across the 30', '(correlation −0.03 across the 30'],
  ['p = ' + RC.medium_xhigh_p.toFixed(2) + ', 28 degrees', 'p = 0.87, 28 degrees'], ['(chi-square ' + Math.round(M.cost_chi2) + ' and ' + Math.round(X.cost_chi2) + ' on 29', '(chi-square 190 and 103 on 29'],
  ['are ' + RC.cost_gaps[0].z.toFixed(1) + ' and ' + RC.cost_gaps[1].z.toFixed(1) + ' standard errors, Kani\'s +' + RC.cost_gaps[3].pct + '% at medium ' + RC.cost_gaps[3].z.toFixed(1), 'are 3.5 and 4.1 standard errors, Kani\'s +28% at medium 3.9'],
  ['(0 of 29 each; about ' + (Math.round(X.expected_p05 * 10 + 1e-9) / 10).toFixed(1) + ' would', '(0 of 29 each; about 1.5 would'], [X.n_p05 + M.n_p05 === 0 ? 'ok' : 'some', 'ok'],
  ['(15th of 30 at medium, 6th at xhigh)'.replace('15', M.default_rank).replace('6th', X.default_rank + 'th'), '(15th of 30 at medium, 6th at xhigh)'],
  [f1(X.null_band[0]) + '% to ' + f1(X.null_band[1]) + '% at xhigh (all ' + X.inside_band + ' conditions', '67.5% to 86.3% at xhigh (all 29 conditions'],
  [f1(M.null_band[0]) + '% to ' + f1(M.null_band[1]) + '% at medium (' + M.inside_band + ' of 29 inside', '52.5% to 73.8% at medium (27 of 29 inside'],
  [f1(M.obs_range_points) + ' points against ' + f1(M.null_range_mean_points) + ' expected', '23.8 points against 21.8 expected'],
  ['chi-square ' + f1(A.chi2) + ' on ' + A.df + ' degrees of freedom, p = ' + A.chi2_p.toFixed(2), 'chi-square 29.2 on 26 degrees of freedom, p = 0.30'],
  ['passes ' + A.default_k + ' of 80 and the four best conditions 77', 'passes 76 of 80 and the four best conditions 77'],
  ['the 256 counts from ' + RC.nbseq.agree_lo.toLocaleString('en-US') + ' to ' + RC.nbseq.agree_hi.toLocaleString('en-US'), 'the 256 counts from 32,512 to 32,767'], ['up to ' + RC.nbseq.hi.toLocaleString('en-US') + ', the most', 'up to 43,690, the most']];
for (const [fromData, onPage] of prose) if (fromData !== onPage || !html.includes(onPage)) { console.log('prose number', JSON.stringify(onPage), 'data says', JSON.stringify(fromData), html.includes(onPage) ? '' : '(not on page)'); fail = 1 }
console.log('prose numbers checked', prose.length);
// reduced motion: nothing on this page moves by itself (no autoplay animations); confirm no RD.anim controls exist
const p = await b.newPage(); await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto('file://' + file);
console.log('animations', await p.$$eval('.an-ctl', x => x.length), '(none expected: the figures are static, the toy is a widget)');
await b.close(); console.log(fail ? 'FAIL' : 'all checks passed'); process.exit(fail);
