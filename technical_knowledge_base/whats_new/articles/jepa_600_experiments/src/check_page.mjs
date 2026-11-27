// Check every control of the page, both themes and three widths, and the data it embeds.
// usage (from the repo root): node <page folder>/src/check_page.mjs <page index.html> [shots folder outside the repo]
// Fails (exit 1) on a page error, console error, visible #jsErr, sideways scroll, NaN/undefined/Infinity in a tab's
// text, SVG text under 11 px, a toy that disagrees with src/recompute.py, or a prose number that differs from it.
// (Copied from the reference article page; the toy, calculator and prose checks are this page's own.)
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const file = path.resolve(process.argv[2]); const shots = process.argv[3] ? path.resolve(process.argv[3]) : null; if (shots) fs.mkdirSync(shots, { recursive: true }); const src = path.dirname(file) + '/src';
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
    // the toy against src/recompute.py (inputs/recompute.json): jumps, states and length of every route on the slider's grid
    const RC = JSON.parse(fs.readFileSync(src + '/inputs/recompute.json', 'utf8'));
    const got = await p.evaluate(rc => { const o = {}; for (const k of Object.keys(rc.toy.routes)) { o[k] = {}; for (const l of rc.toy.lambdas) { const r = window.JW_TOY.route(l, k); o[k][l.toFixed(2)] = r && [r.jumps, r.states, r.length] } } return o }, RC);
    let n = 0;
    for (const [k, ls] of Object.entries(RC.toy.routes)) for (const [l, r] of Object.entries(ls)) {
      n++; const g = got[k][l], w = r && [r.jumps, r.states, r.length];
      if (JSON.stringify(g) !== JSON.stringify(w)) errs.push(`toy ${k} lambda ${l}: page ${JSON.stringify(g)} recompute ${JSON.stringify(w)}`) }
    console.log('toy routes compared with recompute.json:', n);
  }
  if (shots) { await p.$eval('#tabs button[data-t=t-read]', b => b.click()); await new Promise(r => setTimeout(r, 300));
    await p.$eval('#jw-toy-g button[data-m=with]', b => b.click()); await p.$eval('#jw-toy-r', r => { r.value = 0; r.dispatchEvent(new Event('input')) });
    { const el = await p.$('#jw-toy'); await el.scrollIntoView(); await el.screenshot({ path: `${shots}/jw-toy0-${scheme}-${width}.png` }) }
    for (const id of ['jw-hero', 'jw-toy', 'jw-dir', 'jw-pair', 's-trust']) { const el = await p.$('#' + id); if (el) { await el.scrollIntoView(); await new Promise(r => setTimeout(r, 150)); await el.screenshot({ path: `${shots}/${id}-${scheme}-${width}.png` }) } } }
  console.log(scheme, width, errs.length ? errs : 'clean'); if (errs.length) fail = 1; await p.close();
}
// prose numbers against the recomputed data (inputs/recompute.json)
const html = fs.readFileSync(file, 'utf8');
const RC = JSON.parse(fs.readFileSync(src + '/inputs/recompute.json', 'utf8')), RT = RC.toy.routes;
const rng = k => { const js = Object.values(RT[k]).map(r => r.jumps); return [Math.min(...js), Math.max(...js)] };
const prose = [
  ['free jumps give a ' + RT.with['0.00'].jumps + '-jump shortcut', 'free jumps give a 3-jump shortcut'],
  ['0.25 or more gives ' + RT.with['0.25'].jumps + ' jump', '0.25 or more gives 1 jump'],
  ['flow, ' + rng('across')[0] + ' or ' + rng('across')[1] + ' jumps', 'flow, 4 or 5 jumps'],
  ['against it, ' + rng('against')[0] + ' at every cost', 'against it, 9 at every cost'],
  ['about ' + (RC.sign_p * 1e9).toFixed(1) + ' in a billion', 'about 1.9 in a billion'],
  ['= ' + (RC.sign_p * 1e9).toFixed(2) + ' × 10', '= 1.86 × 10'],
  ['√38 / 250 = ' + RC.flip_sd_pts + ' points', '√38 / 250 = 2.5 points'],
  ['z = ' + RC.gap_68_44_z, 'z = 3.3'],
  ['− 46 = ' + RC.flow_implied + '%', '− 46 = 68%'], ['implies ' + RC.flow_implied + '% with copies', 'implies 68% with copies'],
  ['and ' + RC.ratio_block_only.toFixed(1) + ' times', 'and 4.3 times'], ['the "' + RC.pusher_points + ' points"', 'the "60 points"'],
  ['about ' + Math.round(RC.subgoal_gain / RC.flip_sd_pts) + ' times the ' + RC.flip_sd_pts, 'about 23 times the 2.5'],
  ['is about ' + Math.round(RC.physics_gain / RC.flip_sd_pts) + ' times', 'is about 8 times'],
  ['on 50, ' + RC.se_50_78 + ' points', 'on 50, 5.9 points'], ['250 tasks, ' + RC.se_250_80 + ' points', '250 tasks, 2.5 points'],
  ['disagree on ' + Math.round(RC.flip_share) + '% of tasks', 'disagree on 15% of tasks'],
  ['250 are ' + RC.pts_89_7_on_250[0] + '% and ' + RC.pts_89_7_on_250[1].toFixed(1) + '%', '250 are 89.6% and 90.0%']];
for (const [fromData, onPage] of prose) if (fromData !== onPage || !html.includes(onPage)) { console.log('prose number', JSON.stringify(onPage), 'data says', JSON.stringify(fromData), html.includes(onPage) ? '' : '(not on page)'); fail = 1 }
console.log('prose numbers checked', prose.length);
// reduced motion: nothing on this page moves by itself (no autoplay animations); confirm no RD.anim controls exist
const p = await b.newPage(); await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto('file://' + file);
console.log('animations', await p.$$eval('.an-ctl', x => x.length), '(none expected: the figures are static, the toy is a widget)');
await b.close(); console.log(fail ? 'FAIL' : 'all checks passed'); process.exit(fail);
