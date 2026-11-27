// Check every control of the page, both themes and three widths, and the data it embeds.
// usage (from the repo root): node <page folder>/src/check_page.mjs <page index.html>
// Fails (exit 1) on a page error, console error, visible #jsErr, sideways scroll, NaN/undefined/Infinity in a tab's
// text, SVG text under 11 px, a figure label past its card's edge, or a recomputed number the prose does not print.
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
  // the three figures are drawn and every label sits inside its card (no SVG text past either edge)
  for (const id of ['tc-hero-svg', 'tc-iia-svg', 'tc-rlcr-svg']) {
    const r = await p.evaluate(id => { const svg = document.querySelector('#' + id + ' svg'); if (!svg) return 'no svg in ' + id;
      const b = svg.getBoundingClientRect(); const out = [...svg.querySelectorAll('text')].filter(t => { const q = t.getBoundingClientRect(); return q.right > b.right + 1 || q.left < b.left - 1 }).map(t => t.textContent);
      return out.length ? id + ' labels past the edge: ' + out.join(' | ') : '' }, id);
    if (r) errs.push(r);
  }
  console.log(scheme, width, errs.length ? errs : 'clean'); if (errs.length) fail = 1; await p.close();
}
// prose and caption numbers that come from recompute.json (src/recompute.py)
const RC = JSON.parse(fs.readFileSync(src + '/inputs/recompute.json', 'utf8'));
const html = fs.readFileSync(file, 'utf8');
const f2 = x => x.toFixed(2), J = RC.jev, I = RC.iia;
const want = [f2(J.choice.acc) + '%', f2(J.noul.acc) + '%', '$' + J.choice.cost, '$' + J.noul.cost, J.choice.se_pp.toFixed(2) + ' points', RC.jev_gap.reviews + ' reviews', f2(RC.jev_gap.pp) + ' points',
  RC.jev_gap.token_gap_per_review + ' per review', J.choice.reviews_per_s.toFixed(1) + ' reviews per second', '$' + RC.jev_cost_per_1000.toFixed(3) + ' per 1,000', RC.ulmfit_gain_over_lstm.toFixed(2) + ' points',
  'earns ' + RC.rlcr.wrong_09.toFixed(2).replace('-', '\u2212'), 'earns ' + RC.rlcr.wrong_02.toFixed(2).replace('-', '\u2212'), 'earns ' + f2(RC.rlcr.right_09), 'earns ' + f2(RC.rlcr_expected.q07) + ' by saying 0.7',
  f2(RC.rlcr_expected.q09) + ' by saying 0.9', f2(RC.rlcr_expected.q10) + ' by saying 1.0', 'confidence ' + f2(RC.confidence.binary_p074),
  'customer ' + I.p4.customer.toFixed(3) + ' to ' + I.p5.customer.toFixed(3), 'unknown ' + I.p4.unknown.toFixed(3) + ' to ' + I.p5.unknown.toFixed(3), '+' + I.logodds_toy.toFixed(2),
  '+' + I.jev_measured.before + ' to +' + I.jev_measured.after, String(RC.btzsc.emotion_ece_jev), String(RC.btzsc.emotion_ece_gliner), RC.enterprise.right_at_one + '%'];
for (const r of RC.ladder) want.push(String(r.a));
for (const w of want) if (!html.includes(w)) { console.log('prose number missing:', w); fail = 1 }
console.log('prose numbers checked', want.length);
// reduced motion: nothing on this page moves by itself (no autoplay animations); confirm no RD.anim controls exist
{ const p = await b.newPage(); await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto('file://' + file);
console.log('animations', await p.$$eval('.an-ctl', x => x.length), '(none expected: three static figures)'); }
await b.close(); console.log(fail ? 'FAIL' : 'all checks passed'); process.exit(fail);
