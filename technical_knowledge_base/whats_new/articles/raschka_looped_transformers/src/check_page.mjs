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
  const hero = await p.evaluate(() => { const svg = document.querySelector('#lt-hero-svg svg'); if (!svg) return 'no hero svg';
    const r = svg.getBoundingClientRect(); const out = [...svg.querySelectorAll('text')].filter(t => t.getBoundingClientRect().right > r.right + 1).map(t => t.textContent);
    return out.length ? 'hero labels past the edge: ' + out.join(' | ') : '' });
  if (hero) errs.push(hero);
  console.log(scheme, width, errs.length ? errs : 'clean'); if (errs.length) fail = 1; await p.close();
}
// the widget against recompute.json: every passes x cache-mode combination, the stat row as printed
const RC = JSON.parse(fs.readFileSync(src + '/inputs/recompute.json', 'utf8'));
{
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 }); await p.goto('file://' + file); await new Promise(r => setTimeout(r, 300));
  const fmt = n => n.toLocaleString('en-GB');
  let bad = 0, n = 0;
  for (const row of RC.rows) {
    await p.$eval(`#lt-r button[data-m="${row.r}"]`, b => b.click()); await p.$eval(`#lt-m button[data-m="${row.mode}"]`, b => b.click());
    const v = await p.$$eval('#lt-toyout .stat .v', xs => xs.map(x => x.textContent));
    const want = [(row.weights_bytes / 1e9).toFixed(2) + ' GB', (row.flops_per_token / 1e9).toFixed(1) + ' GFLOP', fmt(row.kv_bytes_per_token / 1024) + ' KiB', fmt(row.depth_one_token), fmt(row.depth_1000_tokens)];
    n++; if (JSON.stringify(v) !== JSON.stringify(want)) { bad++; console.log('widget mismatch', row.r, row.mode, v, want) }
  }
  console.log('widget', n - bad, 'of', n, 'combinations match recompute.json'); if (bad) fail = 1; await p.close();
}
// prose numbers that come from recompute.json
const html = fs.readFileSync(file, 'utf8');
const r2 = RC.rows.find(x => x.r === 2 && x.mode === 'per'), rr = RC.rows.find(x => x.r === 2 && x.mode === 'rec'), r1 = RC.rows.find(x => x.r === 1 && x.mode === 'per');
const want = [(RC.params.blocks / 1e9).toFixed(2) + 'B', (2 * RC.params.blocks / 1e9).toFixed(2) + 'B', (r2.flops_per_token / 1e9).toFixed(1) + ' GFLOP', (r1.flops_per_token / 1e9).toFixed(1) + ' at one pass',
  r2.kv_bytes_per_token / 1024 + ' KiB', (r2.kv_bytes_128k / 2 ** 30).toFixed(1) + ' GiB', rr.depth_1000_tokens.toLocaleString('en-GB'), RC.shares.emb_and_head_of_total_pct.toFixed(1) + '%', RC.shares.emb_of_total_if_tied_pct.toFixed(1) + '%',
  (r2.weights_bytes / 1e9).toFixed(2) + ' GB', (r2.distinct_weights_bytes / 1e9).toFixed(2) + ' GB', RC.params.total.toLocaleString('en-GB'), RC.params.blocks.toLocaleString('en-GB')];
for (const w of want) if (!html.includes(w)) { console.log('prose number missing:', w); fail = 1 }
console.log('prose numbers', want.join(' · '));
// reduced motion: nothing on this page moves by itself (no autoplay animations); confirm no RD.anim controls exist
{ const p = await b.newPage(); await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto('file://' + file);
console.log('animations', await p.$$eval('.an-ctl', x => x.length), '(none expected: a static hero and a widget without autoplay)'); }
await b.close(); console.log(fail ? 'FAIL' : 'all checks passed'); process.exit(fail);
