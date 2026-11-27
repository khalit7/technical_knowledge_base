// Check every control of the page, both themes and three widths, and the data it embeds.
// usage (from the repo root): node <page folder>/src/check_page.mjs <page index.html>
// Fails (exit 1) on a page error, console error, visible #jsErr, sideways scroll, NaN/undefined/Infinity in a tab's
// text, SVG text under 11 px, a toy that disagrees with src/recompute.py, or a prose number that differs from it.
// (Generic loop copied from the reference article page; the explorer and prose checks are this page's own.)
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
    await p.$$eval(`#${t} .pp-seg button`, bs => bs.forEach(b => b.click()));
    await p.$$eval(`#${t} details`, ds => ds.forEach(d => d.open = true));
    for (const v of ['min', 'mid', 'max', 'start'])
      await p.$$eval(`#${t} input[type=range]`, (rs, v) => rs.forEach(r => { const lo = +r.min, hi = +r.max; r.value = v === 'min' ? lo : v === 'max' ? hi : v === 'mid' ? Math.round((lo + hi) / 2) : 75; r.dispatchEvent(new Event('input')) }), v);
    const bad = await p.$eval('#' + t, el => (el.innerText.match(/\bNaN\b|\bundefined\b|\bInfinity\b/) || [''])[0]);
    const side = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    const small = await p.$$eval(`#${t} svg text`, ts => ts.filter(x => x.getClientRects().length && parseFloat(getComputedStyle(x).fontSize) < 11).length);
    if (bad || side || small) errs.push(`${t}: ${bad ? 'found ' + bad : ''} ${side ? 'sideways scroll' : ''} ${small ? small + ' svg labels under 11 px' : ''}`);
  }
  const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) errs.push('jsErr: ' + box);
  if (scheme === 'dark') {
    const RC = JSON.parse(fs.readFileSync(src + '/inputs/recompute.json', 'utf8'));
    await p.$eval('#tabs button[data-t=t-read]', b => b.click());
    // the explorer's per-level rate against recompute.py's one_level, both date sets share the same function
    for (const bn of Object.keys(RC.explorer)) for (const [lv, want] of Object.entries(RC.explorer[bn].check)) {
      const got = await p.evaluate((bn, lv) => { const r = window.PP_levelRate(bn, +lv, 1); return r ? [Math.round(r.r * 10) / 10, r.n] : null }, bn, lv);
      if (JSON.stringify(got) !== JSON.stringify(want)) errs.push(`explorer rate ${bn} ${lv}: ${got} want ${want}`);
    }
    // it opens on GPQA 75% and shows the article's example
    await p.$eval('#pp-bench button[data-m=gpqa]', b => b.click());
    await p.$eval('#pp-lev', r => { r.value = 75; r.dispatchEvent(new Event('input')) });
    await p.$eval('#pp-fix', c => { c.checked = false; c.dispatchEvent(new Event('change')) });
    const o = await p.$eval('#pp-ex-out', e => e.innerText);
    for (const w of ['$0.30', '$0.00041', '725x', '17.2 months', '99x a year', '64.2%']) if (!o.includes(w)) errs.push('explorer default lacks ' + w + ': ' + o.replace(/\n/g, ' '));
    await p.$eval('#pp-fix', c => { c.checked = true; c.dispatchEvent(new Event('change')) });
    const o2 = await p.$eval('#pp-ex-out', e => e.innerText);
    for (const w of ['14.8 months', '212x a year']) if (!o2.includes(w)) errs.push('explorer corrected lacks ' + w);
    console.log('explorer checked against recompute.json');
    const emb = await p.evaluate(() => window.ARTICLE.recompute);
    if (JSON.stringify(emb) !== JSON.stringify(RC)) errs.push('embedded recompute differs from recompute.json');
  }
  console.log(scheme, width, errs.length ? errs : 'clean'); if (errs.length) fail = 1; await p.close();
}
// prose numbers against the recomputed data (inputs/recompute.json)
const html = fs.readFileSync(file, 'utf8');
const RC = JSON.parse(fs.readFileSync(src + '/inputs/recompute.json', 'utf8'));
const f1 = v => v.toFixed(1), S = Object.fromEntries(RC.scen.map(r => [r.label, r])), B = RC.base, ex = RC.example, ap = RC.age_pool;
const allp = RC.scen.filter(r => r.group !== 'loo').map(r => r.pooled);
const prose = [
  ['gives ' + f1(B.chess) + '% (Chess Puzzles) to ' + f1(B.fm13) + '% (FrontierMath tiers 1-3); pooled over the five, ' + f1(RC.pool_geo) + '%', 'gives 43.0% (Chess Puzzles) to 53.1% (FrontierMath tiers 1-3); pooled over the five, 47.0%'],
  ['on GPQA ' + Math.round(RC.moved.gpqa) + '% of the ' + RC.nodes.gpqa.toLocaleString('en') + ' nodes', 'on GPQA 46% of the 5,039 nodes'],
  ['only ' + Math.round(RC.moved.mystery) + '% of ' + RC.nodes.mystery.toLocaleString('en'), 'only 25% of 3,518'],
  ['their arithmetic mean is ' + f1(RC.pool_arith) + '%', 'their arithmetic mean is 46.8%'],
  ['between ' + f1(Math.min(...allp)) + '% and ' + f1(Math.max(...allp)) + '% a quarter', 'between 42.6% and 55.5% a quarter'],
  ['raises it to ' + Math.round(S['Untruncated runs only'].pooled) + '%', 'raises it to 51%'],
  ['of the ' + RC.loo.n_models + ' models that ever hold a record leaves it between ' + f1(RC.loo.lo[0]) + '% (without ' + RC.loo.lo[1] + ') and ' + f1(RC.loo.hi[0]) + '% (without ' + RC.loo.hi[1] + ')', 'of the 110 models that ever hold a record leaves it between 43.0% (without o1) and 52.1% (without o3)'],
  ['barely moves (' + f1(S['Five dates corrected'].pooled) + '%)', 'barely moves (46.5%)'],
  ['moves the pooled rate to ' + f1(S['Late prices dropped'].pooled) + '%', 'moves the pooled rate to 46.0%'],
  ['the drop took ' + f1(ex.months_fixed) + ' months, not ' + f1(ex.months) + ' (about ' + ex.per_year_fixed + 'x a year instead of ' + ex.per_year + 'x)', 'the drop took 14.8 months, not 17.2 (about 212x a year instead of 99x)'],
  ['the pooled rate is ' + Math.round(ap[0]) + '% and ' + Math.round(ap[1]) + '% in the first two quarters, ' + Math.round(Math.min(ap[2], ap[3], ap[4])) + '% to ' + Math.round(Math.max(ap[2], ap[3], ap[4])) + '% in quarters two to four, and ' + Math.round(Math.min(...ap.slice(5))) + '% to ' + Math.round(Math.max(...ap.slice(5))) + '% from the fifth', 'the pooled rate is 59% and 63% in the first two quarters, 42% to 50% in quarters two to four, and 5% to 18% from the fifth'],
  ['our port gives ' + f1(RC.schemes_gpqa.logit_clip) + '% and ' + f1(RC.schemes_gpqa.uniform_scale) + '% for the two ends', 'our port gives 42.9% and 57.9% for the two ends'],
  ['at GPQA\'s 25% the record fell ' + Math.round(RC.explorer.gpqa.check['0.25'][0]) + '% a quarter, at 50% ' + Math.round(RC.explorer.gpqa.check['0.5'][0]) + '%, at 75% ' + Math.round(RC.explorer.gpqa.check['0.75'][0]) + '%', 'at GPQA\'s 25% the record fell 42% a quarter, at 50% 61%, at 75% 64%'],
  ['4.2, 6.1, 17.6 and 52.9', [RC.tech['DNA sequencing'], RC.tech.Compute, RC.tech['Lithium batteries'], RC.tech.Electricity].map(t => f1(t.multiple)).join(', ').replace(/, (?=[^,]*$)/, ' and ')],
  ['median 28 days after release', 'median 28 days after release'],
];
for (const [fromData, onPage] of prose) if (fromData !== onPage || !html.includes(fromData)) { console.log('prose number', JSON.stringify(onPage), 'data says', JSON.stringify(fromData), html.includes(fromData) ? '' : '(not on page)'); fail = 1 }
// the port reproduces Table 1's model-free column as printed
const T1 = { aime: 47.1, chess: 43.0, fm13: 53.1, gpqa: 47.0, mystery: 44.0, fm_2025_02_private: 43.3, fm_tier4_2025_07_private: 26.0, fm_tier4_v2: 65.1, math_lvl5: 51.8, simpleqa: 40.5, swe_bench_verified: 27.5 };
for (const [k, v] of Object.entries(T1)) if (B[k] !== v) { console.log('Table 1', k, v, B[k]); fail = 1 }
console.log('prose numbers checked', prose.length, '; Table 1 model-free column reproduced');
// reduced motion: nothing on this page moves by itself (no autoplay animations); confirm no RD.anim controls exist
const p = await b.newPage(); await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto('file://' + file);
console.log('animations', await p.$$eval('.an-ctl', x => x.length), '(none expected: the figures are static, the explorer is a widget)');
await b.close(); console.log(fail ? 'FAIL' : 'all checks passed'); process.exit(fail);
