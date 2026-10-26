// node technical_knowledge_base/reference/papers/scaffold_computational_separations/src/check_page.mjs   (from the repo root; set CHROME_PATH if needed)
// Every control of every tab at 390 px dark and 920 px light: no page errors, no visible #jsErr, no NaN/undefined/Infinity,
// no sideways scroll, no SVG or HTML text under 11 px. Also: the live sweep equals inputs/sweep.json, the hero numbers equal
// the engine's, every prose number listed below is in tables.json or recompute.json, and nothing animates by itself.
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs';
const here = path.dirname(new URL(import.meta.url).pathname);
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const page = path.join(here, '..', 'index.html');
const SW = JSON.parse(fs.readFileSync(path.join(here, 'inputs', 'sweep.json')));
const T = JSON.parse(fs.readFileSync(path.join(here, 'tables.json')));
const problems = [];
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined, args: ['--no-sandbox'] });
for (const [scheme, width, rm] of [['dark', 390, false], ['light', 920, false], ['light', 920, true]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: rm ? 'reduce' : 'no-preference' }]);
  await p.goto('file://' + page);
  const tag = scheme + ' ' + width + (rm ? ' reduced-motion' : '');
  const tabs = await p.$$eval('button[data-t]', bs => bs.map(x => x.dataset.t));
  for (const t of tabs) {
    await p.evaluate(t => document.querySelector('button[data-t=' + t + ']').click(), t);
    await new Promise(r => setTimeout(r, 150));
    // click every button in the tab (predict options, segments, steppers), move every range, try every select option
    await p.evaluate(async t => {
      const root = document.getElementById(t), sleep = ms => new Promise(r => setTimeout(r, ms));
      for (const btn of [...root.querySelectorAll('button')]) { if (btn.isConnected) { btn.click(); await sleep(15) } }
      for (const r of [...root.querySelectorAll('input[type=range]')]) for (const v of [r.min, r.max, r.defaultValue]) { r.value = v; r.dispatchEvent(new Event('input')); await sleep(15) }
      for (const s of [...root.querySelectorAll('select')]) for (const o of [...s.options]) { s.value = o.value; s.dispatchEvent(new Event('change')); await sleep(40) }
      // step the harness to its end and back
      if (t === 't-run') { for (let i = 0; i < 40; i++) document.getElementById('rnStep').click(); for (let i = 0; i < 40; i++) document.getElementById('rnBack').click() }
    }, t);
    await new Promise(r => setTimeout(r, 200));
    const r = await p.evaluate(t => {
      const el = document.getElementById(t), out = [];
      if (/\bNaN\b|\bundefined\b|\bInfinity\b/.test(el.innerText)) out.push('NaN/undefined in text');
      if (document.documentElement.scrollWidth > innerWidth + 1) out.push('sideways scroll ' + document.documentElement.scrollWidth);
      for (const x of el.querySelectorAll('svg text')) { const fs = parseFloat(x.getAttribute('font-size') || getComputedStyle(x).fontSize); if (fs < 11 && x.getBBox().width > 0) { out.push('svg text ' + fs + 'px: ' + x.textContent); break } }
      for (const x of el.querySelectorAll('p,li,td,th,dd,dt,label,span,div.cap')) { if (x.offsetParent && x.textContent.trim() && parseFloat(getComputedStyle(x).fontSize) < 11) { out.push('html text under 11px: ' + x.textContent.slice(0, 40)); break } }
      return out;
    }, t);
    r.forEach(x => problems.push(tag + ' ' + t + ': ' + x));
  }
  const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) problems.push(tag + ' jsErr: ' + box);
  errs.forEach(e => problems.push(tag + ' error: ' + e));
  if (scheme === 'light' && !rm) {
    // the live sweep against the node run
    const live = await p.evaluate(() => ({ local: window.RUN_SWEEP('local'), random: window.RUN_SWEEP('random') }));
    for (const fam of ['local', 'random']) for (const k of ['acc', 'calls', 'rounds', 'reach', 'dist']) {
      const a = JSON.stringify(live[fam][k]), c = JSON.stringify(SW.fam[fam][k]); if (a !== c) problems.push('sweep ' + fam + ' ' + k + ' differs');
    }
    const hero = await p.evaluate(() => window.HERO);
    if (hero.dist !== 7 || hero.calls !== 43 || hero.reader2 !== false || hero.reader3 !== true) problems.push('hero numbers changed: ' + JSON.stringify(hero));
    // prose numbers: each must be in the data
    const text = await p.evaluate(() => document.getElementById('t-read').innerText + document.getElementById('t-run').innerText);
    const f5 = T.fig5a, f13 = T.fig13, f3 = T.fig3;
    const need = [['43.6%', f5.teacher[8] === 43.6], ['35.8%', Math.max(...f5.student.filter(x => x != null)) === 35.8], ['26.8%', f5.student[7] === 26.8],
      ['31.8%', f13.capacity.v[1] === 31.8], ['33.6%', f13.capacity.v[2] === 33.6], ['34.0%', f13.capacity.v[3] === 34.0], ['41.6%', f13.backbone.v[2] === 41.6], ['40.0%', f13.backbone.v[0] === 40.0],
      ['0.984 ID and 0.770 OOD', T.fig2b.id[4] === 0.984 && T.fig2b.ood[4] === 0.77], ['from 26% to 97%', f3.greedy[4] === 26 && f3.greedy[5] === 97],
      ['0.970 against 0.996', T.table2.rows[2][1][3] === 0.970 && T.table2.rows[2][1][1] === 0.996], ['0.677', T.table2.rows[3][1][3] === 0.677],
      ['34.2, 35.0, 34.6, 31.4, 29.2', JSON.stringify(T.fig12.clean_ratio.student) === '[34.2,35,34.6,31.4,29.2]'],
      ['k = 3, 4, 5, 6, 7, 8', JSON.stringify(SW.Ns.map((N, i) => SW.Ks.find(k => SW.fam.local.acc[k][i] === 1))) === '[3,4,5,6,7,8]']];
    for (const [s, ok] of need) { if (!text.includes(s)) problems.push('prose missing ' + s); if (!ok) problems.push('prose number not in data: ' + s) }
    const z = JSON.parse(fs.readFileSync(path.join(here, 'inputs', 'recompute.json'))).gaps;
    const zs = z.filter(g => ['(2,3)', '(4,2)', '(3,3)'].includes(g.shape)).map(g => g.z);
    if (!(text.includes('2.7 to 5.4 standard errors') && zs[0] === 2.7 && Math.max(...zs) === 5.4)) problems.push('z range prose: ' + zs);
  }
  if (rm) { const fr = await p.evaluate(() => [...document.querySelectorAll('[data-frames]')].length); if (fr) problems.push('animation frames under reduced motion') }
  await p.close();
}
await b.close();
console.log(problems.length ? problems.join('\n') : 'check_page: 0 problems');
process.exit(problems.length ? 1 : 0);
