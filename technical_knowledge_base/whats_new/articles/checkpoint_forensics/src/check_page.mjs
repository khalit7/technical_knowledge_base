// Check every control of the page, both themes and three widths, and the data it embeds.
// usage (from the repo root): node <page folder>/src/check_page.mjs <page index.html>
// Fails (exit 1) on a page error, console error, visible #jsErr, sideways scroll, NaN/undefined/Infinity in a tab's
// text, SVG text under 11 px, a generator that disagrees with src/replay/replay_rows.py, a replay that peaks elsewhere, or embedded data that differs from its sources.
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
    // the page's generator against the Python replay (src/replay/replay_rows.py): the first 8 values of each shipped row at 132, 148 and 152 SMs
    const r = await p.evaluate(() => { const out = []; for (const m of ARTICLE.replay.rows) for (const sm of ['132', '148', '152'])
      for (let j = 0; j < 8; j++) out.push([m.name, sm, j, CF.normalAt(m.row * m.d + j, +sm * 2048, m.seed, m.offset), m.ref8[sm][j]]); return out });
    let worst = 0; for (const [, , , js, py] of r) worst = Math.max(worst, Math.abs(js - py));
    if (worst > 1e-6) errs.push('generator differs from replay_rows.py by ' + worst); else console.log('generator agrees with replay_rows.py on', r.length, 'values, max diff', worst.toExponential(1));
    // the live scan peaks where the CPU replay did; the toy matches 40 of 384 at 5 SMs, 48 at 7, 0 with the wrong seed
    const pk = await p.evaluate(() => ARTICLE.replay.rows.map(m => { const y = []; const bin = atob(m.b64), dv = new DataView(new ArrayBuffer(4));
      for (let j = 0; j < m.n; j++) { dv.setUint32(0, ((bin.charCodeAt(2 * j) | (bin.charCodeAt(2 * j + 1) << 8)) << 16) >>> 0); y.push(dv.getFloat32(0)) }
      let best = 0, br = -1; for (let sm = 100; sm <= 160; sm++) { const g = y.map((_, j) => CF.normalAt(m.row * m.d + j, sm * 2048, m.seed, m.offset)); const c = CF.corr(y, g); if (c > br) { br = c; best = sm } } return [m.name, best, br] }));
    const want = { 'DeepSeek-V3': 132, 'DeepSeek-V4-Flash': 148, 'Kimi K3': 152 };
    for (const [n, sm, r] of pk) if (want[n] !== sm || r < 0.999) errs.push(`replay ${n} peaks at ${sm} (r ${r})`);
    const toy = await p.evaluate(() => { const c = (G, seed) => { let k = 0; for (let i = 0; i < 384; i++) if (CF.normalAt(i, G, seed, 0) === CF.normalAt(i, 48, 7, 0)) k++; return k }; return [c(40, 7), c(56, 7), c(48, 8), c(48, 7)] });
    if (toy.join() !== '40,48,0,384') errs.push('toy matches ' + toy.join());
  }
  console.log(scheme, width, errs.length ? errs : 'clean'); if (errs.length) fail = 1; await p.close();
}
// data check outside the browser: the embedded replay equals src/replay/out/*.json, the figures equal inputs/figures.json, prose numbers match the replay
const html = fs.readFileSync(file, 'utf8');
const m = html.match(/window\.ARTICLE=(\{.*?\});\n/s); const A = JSON.parse(m[1]);
const RP = JSON.parse(fs.readFileSync(src + '/replay/out/replay.json', 'utf8')), F = JSON.parse(fs.readFileSync(src + '/inputs/figures.json', 'utf8'));
const SL = JSON.parse(fs.readFileSync(src + '/replay/out/rows_slice.json', 'utf8'));
let same = JSON.stringify(A.replay.scan) === JSON.stringify(RP) && JSON.stringify(A.fig.table1) === JSON.stringify(F.table1) && JSON.stringify(A.fig.table2) === JSON.stringify(F.table2);
for (const [i, r] of A.replay.rows.entries()) { const bits = [...Buffer.from(r.b64, 'base64')].reduce((a, x, j, B) => (j % 2 ? a : a.concat(B[j] | (B[j + 1] << 8))), []); if (JSON.stringify(bits) !== JSON.stringify(SL.models[i].bits)) same = false }
const M = Object.fromEntries(RP.models.map(x => [x.name, x]));
const prose = [['8 of 8 rows above r 0.99 for DeepSeek-V3 at 132', `${M['DeepSeek-V3'].rows_over_099} of ${M['DeepSeek-V3'].rows_total} rows above r 0.99 for DeepSeek-V3 at ${M['DeepSeek-V3'].best}`],
  ['461 of 469 for V4-Flash at 148', `${M['DeepSeek-V4-Flash'].rows_over_099} of ${M['DeepSeek-V4-Flash'].rows_total} for V4-Flash at ${M['DeepSeek-V4-Flash'].best}`],
  ['13 of 13 for Kimi K3 at 152', `${M['Kimi K3'].rows_over_099} of ${M['Kimi K3'].rows_total} for Kimi K3 at ${M['Kimi K3'].best}`],
  ['(13 of 13, median 0.999996)', `(${M['Kimi K3'].rows_over_099} of ${M['Kimi K3'].rows_total}, median ${M['Kimi K3'].median_r_best})`],
  ['(461 of 469, median 0.999999)', `(${M['DeepSeek-V4-Flash'].rows_over_099} of ${M['DeepSeek-V4-Flash'].rows_total}, median ${M['DeepSeek-V4-Flash'].median_r_best})`],
  ['r 0.015 or less', 'r ' + Math.max(...RP.models.map(x => Math.max(...x.r.filter((v, i) => RP.sms[i] !== x.best).map(Math.abs)))).toFixed(3) + ' or less']];
for (const [onPage, fromData] of prose) if (onPage !== fromData || !html.includes(onPage)) { console.log('prose number', onPage, 'data says', fromData); fail = 1 }
console.log('embedded data', same ? 'matches src/replay/out and inputs/figures.json' : 'DIFFERS'); if (!same) fail = 1;
// reduced motion: nothing on this page moves by itself (no autoplay animations); confirm no RD.anim controls exist
const p = await b.newPage(); await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto('file://' + file);
console.log('animations', await p.$$eval('.an-ctl', x => x.length), '(none expected: the figures are widgets the reader drives)');
await b.close(); console.log(fail ? 'FAIL' : 'all checks passed'); process.exit(fail);
