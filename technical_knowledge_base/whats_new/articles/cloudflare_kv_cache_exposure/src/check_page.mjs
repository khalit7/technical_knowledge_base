// Check every control of the page, both themes and three widths, and the data it embeds.
// usage (from the repo root): node <page folder>/src/check_page.mjs <page index.html>
// Fails (exit 1) on a page error, console error, visible #jsErr, sideways scroll, NaN/undefined/Infinity in a tab's
// text, SVG text under 11 px, a pool widget that disagrees with recompute.py, an animation that does not autoplay or moves under
// reduced motion, a step list of the wrong length, or embedded data and prose numbers that differ from inputs/recompute.json.
// The next article builder: keep the generic loop; replace the toy and data checks with your page's own.
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const file = path.resolve(process.argv[2]); const src = path.dirname(file) + '/src';
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
  if (scheme === 'dark') {
    // the pool widget's rule equals src/recompute.py on every recorded case
    const bad = await p.evaluate(() => { const R = window.ARTICLE.recompute, T = window.CK_POOL, e = [];
      if (T.limit(R.ctx, R.pool_launch) !== R.limit_launch || T.limit(R.ctx, R.pool_fixed) !== R.limit_fixed) e.push('limit');
      for (const c of R.cases) { const r = T.path(c.L, c.pool === 'launch' ? R.pool_launch : R.pool_fixed, c.fixed_engine);
        for (const k of ['route', 'http', 'reserved', 'written_tokens', 'written_pages', 'stale_tokens']) if (r[k] !== c[k]) e.push(c.L + ' ' + c.pool + ' ' + k);
        if ((r.own_share === null) !== (c.own_share === null) || (r.own_share !== null && Math.abs(r.own_share - c.own_share) > 1e-15)) e.push(c.L + ' share') }
      return e });
    if (bad.length) errs.push('pool widget vs recompute: ' + bad.join(', '));
    // each animation plays by itself once scrolled into view, and has one step-list item per step in every mode
    for (const id of ['ck-hand', 'ck-race']) {
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await new Promise(r => setTimeout(r, 1500));
      const lab = await p.$eval('#' + id + '-ctl .an-play', b => b.textContent);
      if (!/Pause/.test(lab) && !/Play/.test(lab)) errs.push(id + ' no controls');
      if (!/Pause/.test(lab)) { const sc = await p.$eval('#' + id + '-ctl input', r => +r.value); if (sc === 0) errs.push(id + ' did not autoplay') }
    }
    const lists = await p.$$eval('ol.sx', ls => ls.map(l => l.id + ':' + l.children.length));
    for (const l of lists) { const [id, n] = l.split(':'); if (+n !== (id.startsWith('sx-hand') ? 7 : 5)) errs.push('step list ' + l) }
  }
  console.log(scheme, width, errs.length ? errs : 'clean'); if (errs.length) fail = 1; await p.close();
}
// data check outside the browser: the embedded recompute equals inputs/recompute.json, and prose numbers match it
const html = fs.readFileSync(file, 'utf8');
const m = html.match(/window\.ARTICLE=(\{.*?\});\n/s); const A = JSON.parse(m[1]);
const E = JSON.parse(fs.readFileSync(src + '/inputs/recompute.json', 'utf8'));
const same = JSON.stringify(A.recompute) === JSON.stringify(E);
const c7 = E.cases.find(c => c.L === 700000 && c.pool === 'launch' && !c.fixed_engine);
const f = n => n.toLocaleString('en-US');
const prose = [['past 681,274 tokens', 'past ' + f(E.limit_launch) + ' tokens'], ['prompt reserves 10,938 pages', 'prompt reserves ' + f(c7.reserved) + ' pages'],
  ['conditioned on 699,999 tokens', 'conditioned on ' + f(c7.stale_tokens) + ' tokens'], ['65% of it', Math.round(100 * E.pool_over_ctx_launch) + '% of it']];
for (const [onPage, fromData] of prose) if (onPage !== fromData || !html.includes(onPage)) { console.log('prose number', onPage, 'data says', fromData); fail = 1 }
console.log('embedded data', same ? 'matches inputs/recompute.json' : 'DIFFERS'); if (!same) fail = 1;
// reduced motion: nothing on this page moves by itself (no autoplay animations); confirm no RD.anim controls exist
const p = await b.newPage(); await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto('file://' + file);
await p.$eval('#ck-hand', e => e.scrollIntoView({ block: 'center' })); await new Promise(r => setTimeout(r, 1500));
const moved = await p.$$eval('.an-ctl input[type=range]', rs => rs.map(r => +r.value).filter(v => v > 0).length);
console.log('reduced motion:', moved ? 'an animation MOVED' : 'nothing moves by itself'); if (moved) fail = 1;
await b.close(); console.log(fail ? 'FAIL' : 'all checks passed'); process.exit(fail);
