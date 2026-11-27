// Check every control of the page, both themes and three widths, and the data it embeds.
// usage (from the repo root): node <page folder>/src/check_page.mjs <page index.html>
// Fails (exit 1) on a page error, console error, visible #jsErr, sideways scroll, NaN/undefined/Infinity in a tab's
// text, SVG text under 11 px, a hero wider than its card, the toy disagreeing with src/recompute.py, embedded chart data
// differing from inputs/recompute.json, a derived number the prose does not print, or an animation that does not autoplay
// in view (or moves under reduced motion).
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
  // the hero grid is drawn and fits its card; the toy and chart are drawn
  const hero = await p.evaluate(() => { const g = document.querySelector('#qp-hero-svg .g'); if (!g) return 'no hero grid';
    const c = document.getElementById('qp-hero'); return c.scrollWidth > c.clientWidth + 1 ? 'hero wider than its card' : '' });
  if (hero) errs.push(hero);
  for (const id of ['qp-toy-svg', 'qp-bench-svg']) if (!await p.$(`#${id} svg`)) errs.push('no svg in #' + id);
  console.log(scheme, width, errs.length ? errs : 'clean'); if (errs.length) fail = 1; await p.close();
}
// data checks: the toy's JavaScript against src/recompute.py, the embedded chart data against inputs/recompute.json,
// and the derived numbers the prose prints
const html = fs.readFileSync(file, 'utf8');
const RC = JSON.parse(fs.readFileSync(src + '/inputs/recompute.json', 'utf8'));
{
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 }); await p.goto('file://' + file);
  const got = await p.evaluate(keys => Object.fromEntries(keys.map(k => { const [a, be, m] = k.split('|'); return [k, QP_TOY.run(+a, +be, m)] })), Object.keys(RC.toy));
  let worst = 0, flags = 0;
  for (const k of Object.keys(RC.toy)) for (const r of ['3', '4']) {
    const A = RC.toy[k][r], B = got[k][r];
    A.raw.forEach((x, j) => { worst = Math.max(worst, Math.abs(x - B.raw[j])) });
    if (A.decoded !== B.decoded || A.exact !== B.exact) flags++;
  }
  console.log('toy against recompute.py:', Object.keys(RC.toy).length, 'settings, max difference', worst.toExponential(1), ', decode or exact flags differing', flags);
  if (worst > 1e-9 || flags) fail = 1;
  const emb = await p.evaluate(() => JSON.stringify({ bench: ARTICLE.bench, nupa: ARTICLE.nupa }));
  if (emb !== JSON.stringify({ bench: RC.bench, nupa: RC.nupa_chip8 })) { console.log('embedded chart data differs from inputs/recompute.json'); fail = 1 } else console.log('embedded chart data equals inputs/recompute.json');
  // the step animation: plays by itself once in view, its list has one item per step
  await p.$eval('#tabs button[data-t=t-read]', x => x.click()); await p.$eval('#qp-toy', e => e.scrollIntoView({ block: 'center' })); await new Promise(r => setTimeout(r, 2500));
  const playing = await p.$eval('#qp-toy-ctl-p', x => /Pause/.test(x.textContent) || +document.getElementById('qp-toy-ctl-s').value > 0);
  const items = await p.$$eval('#sx-toy li', x => x.length), steps = await p.$eval('#qp-toy-ctl-s', x => +x.max + 1);
  console.log('toy autoplay in view:', playing, '; step list', items, 'items for', steps, 'steps'); if (!playing || items !== steps) fail = 1;
  await p.close();
}
const want = [String(RC.decay_40['0.98'].toFixed(3)), '1,040,595', '42,012', '230,000', '27 of 30', '121,932,631,112,635,269'];
for (const w of want) if (!html.includes(w)) { console.log('prose number missing:', w); fail = 1 }
console.log('prose numbers', want.join(' · '));
for (const r of RC.bench) for (const [i, k] of ['base', 'qp', 'py'].entries()) if (r.pct[i] !== +(r[k] / 40 * 100).toFixed(1)) { console.log('pct mismatch', r.set); fail = 1 }
// reduced motion: the toy does not move by itself
const p = await b.newPage(); await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.setViewport({ width: 1400, height: 900 }); await p.goto('file://' + file);
await p.$eval('#tabs button[data-t=t-read]', x => x.click()); await p.$eval('#qp-toy', e => e.scrollIntoView({ block: 'center' })); await new Promise(r => setTimeout(r, 2500));
const moved = await p.$eval('#qp-toy-ctl-s', x => +x.value); console.log('reduced motion: toy step after 2.5 s =', moved); if (moved) fail = 1;
await b.close(); console.log(fail ? 'FAIL' : 'all checks passed'); process.exit(fail);
