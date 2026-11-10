// The 2026-11-06 rollout checks for Regularisation (2026-11-10), adapted from Loss functions' check_stages.mjs:
// the three 3D stages (Fig. 2 the L1 and L2 geometry, Fig. 3 Adam with L2 against AdamW, Fig. 4 dropout's thinned networks) and the one 2D
// step animation (train against inference, #da-card) play by themselves once scrolled into view, step to their last step with one step-list item
// per step, stop redrawing off screen and never move under reduced motion; the two explorers (#ge-card, #dr-card) are widgets that never play by
// themselves; no errors, NaN, undefined or sideways scroll; splits are two columns at 1400 px and one below 1100 px; the numbers written in the
// step lists as static text (data-ge, data-wd, data-dr spans) equal what the scenes compute from the page's data, and the key ones are recomputed
// here independently. Writes mid-step screenshots.
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_ml_fundamentals/regularisation/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const html = path.resolve(here, '../index.html'), file = 'file://' + html, shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = [['stg-ge', 'sx-ge'], ['stg-wd', 'sx-wd'], ['stg-dr', 'sx-dr']];
const PFX = ['ge', 'wd', 'dr'];
const wait = ms => new Promise(r => setTimeout(r, ms));
const problems = [];
const raw = fs.readFileSync(html, 'utf8'), staticSpans = {};
for (const m of raw.matchAll(/<span data-(ge|wd|dr)="([\w.-]+)">(.*?)<\/span>/g)) staticSpans[m[1] + ':' + m[2]] = m[3].replace(/<[^>]+>/g, '');
if (Object.keys(staticSpans).length < 40) problems.push(`only ${Object.keys(staticSpans).length} data spans found in the step lists`);
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(400);
  const tag = `${scheme} ${width}`, shoot = width === 1400 || width === 390;
  const audit = async (where, tab = 't-read') => {
    const r = await p.evaluate(tab => { const c = document.getElementById(tab).cloneNode(true); c.querySelectorAll('pre,code').forEach(x => x.remove());
      const t = c.innerText;
      return { bad: (t.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } }, tab);
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (cols.length < 12 || cols.some(c => c !== 'grid'))) problems.push(`${tag}: a split is not two columns (${cols.length}: ${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  if (width === 1400) {
    const over = await p.$$eval('#t-read .s3R', xs => xs.map(x => { const r = x.getBoundingClientRect(), k = x.firstElementChild && x.firstElementChild.getBoundingClientRect(); return k && r.width && (k.right > r.right + 1 || k.left < r.left - 1) ? x.innerHTML.slice(0, 40) : '' }).filter(Boolean));
    over.forEach(o => problems.push(`${tag}: right-column content wider than its column: ${o}`));
    const live = await p.evaluate(PFX => Object.fromEntries([...document.querySelectorAll(PFX.map(x => '[data-' + x + ']').join(','))].map(e => { const k = PFX.find(x => e.dataset[x] != null); return [k + ':' + e.dataset[k], e.textContent] })), PFX);
    for (const [k, v] of Object.entries(live)) if (staticSpans[k] == null) problems.push(`span ${k} missing from the static page`); else if (staticSpans[k] !== v) problems.push(`span ${k}: static "${staticSpans[k]}" but the data gives "${v}"`);
    // independent recomputes, from the raw data with this script's own arithmetic:
    // Fig. 2: standardise bmi and bp to unit length, least squares by a 2 x 2 solve; the ridge fit solves (G/n + λI) b = c/n at its λ;
    // both fits have the same training error (the one ellipse); the lasso fit has bp exactly 0.
    // Fig. 3: decay alone is (1 − 10⁻⁴)^t. Fig. 4: the 30 votes and the average recounted from the thinned networks' outputs.
    const r = await p.evaluate(() => { const out = [], rows = DIAB.raw.split(';').map(r => r.split(',').map(Number)), n = rows.length;
      const col = j => rows.map(r => r[j]), std = v => { const m = v.reduce((a, b) => a + b) / n, c = v.map(x => x - m), l = Math.hypot(...c); return c.map(x => x / l) };
      const yv = col(rows[0].length - 1), ym = yv.reduce((a, b) => a + b) / n, y = yv.map(v => v - ym), X = [std(col(2)), std(col(3))];
      const G = [[0, 1].map(k => X[0].reduce((s, v, i) => s + v * X[k][i], 0)), [0, 1].map(k => X[1].reduce((s, v, i) => s + v * X[k][i], 0))], c = X.map(x => x.reduce((s, v, i) => s + v * y[i], 0));
      const solve = (A, v) => { const d = A[0][0] * A[1][1] - A[0][1] * A[1][0]; return [(v[0] * A[1][1] - A[0][1] * v[1]) / d, (A[0][0] * v[1] - A[1][0] * v[0]) / d] };
      const ols = solve(G, c), rss = bb => y.reduce((s, v, i) => s + (v - bb[0] * X[0][i] - bb[1] * X[1][i]) ** 2, 0), E = window.RG_GE;
      if (Math.round(ols[0]) !== +document.querySelector('[data-ge="ols0"]').textContent || Math.round(ols[1]) !== +document.querySelector('[data-ge="ols1"]').textContent) out.push('Fig. 2 least squares ' + ols);
      const rr = solve([[G[0][0] / n + E.ri.lam, G[0][1] / n], [G[1][0] / n, G[1][1] / n + E.ri.lam]], c.map(v => v / n));
      if (Math.abs(rr[0] - E.ri.b[0]) > 1e-6 || Math.abs(rr[1] - E.ri.b[1]) > 1e-6) out.push('Fig. 2 ridge fit ' + rr + ' against ' + E.ri.b);
      const lv = rss(ols) + .55 * (rss([0, 0]) - rss(ols));
      if (Math.abs(rss(E.ri.b) - lv) / lv > 1e-6 || Math.abs(rss(E.la.b) - lv) / lv > 1e-6) out.push('Fig. 2 the two fits are not on one ellipse');
      if (E.la.b[1] !== 0) out.push('Fig. 2 lasso bp is ' + E.la.b[1]);
      if (Math.pow(1 - 1e-4, 2000).toFixed(2) !== document.querySelector('[data-wd="pure2"]').textContent) out.push('Fig. 3 decay alone');
      const D = window.RG_DR, am = q => q.indexOf(Math.max(...q)), v = new Array(10).fill(0), av = new Array(10).fill(0);
      D.runs.forEach(o => { v[am(o.p)]++; o.p.forEach((x, k) => av[k] += x / D.runs.length) });
      if (String(Math.max(...v)) !== document.querySelector('[data-dr="vt"]').textContent || String(am(av)) !== document.querySelector('[data-dr="avg"]').textContent) out.push('Fig. 4 votes or average');
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  // every stage, and the 2D step animation, plays once scrolled into view; the explorers do not
  for (const [id] of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
    if (shoot) { await wait(300); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-autoplay-${scheme}-${width}.png` }) }
  }
  await p.$eval('#da-card', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
  if ((await p.$eval('#da-ctl .an-play', e => e.getAttribute('aria-label') || e.textContent)).indexOf('Pause') < 0) problems.push(`${tag}: da-card did not play when scrolled into view`);
  for (const id of ['ge-ctl', 'dr-ctl']) {
    const v0 = await p.$eval(`#${id}-s`, e => e.value); await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2200);
    if ((await p.$eval(`#${id}-s`, e => e.value)) !== v0) problems.push(`${tag}: the explorer ${id} moved by itself`);
  }
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  for (const [id, lid] of STAGES) {
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length);
    if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but list ${lid} shows ${lis}`);
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' }));
    for (let k = 0; k < n; k++) {
      if (k) await p.$eval(`#${id}-f`, e => e.click());
      if (shoot) {
        await wait(600); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}-midtween-${scheme}-${width}.png` });
        await wait(id === 'stg-wd' ? 3400 : 1400); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}-${scheme}-${width}.png` })
      } else await wait(250);
    }
    await wait(id === 'stg-wd' ? 3800 : 1800);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
    await audit(`${id} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id} list does not mark the last step`);
  }
  // the 2D step animation: every mode, every step, one list item per step
  for (const m of ['inv', 'orig', 'bug']) {
    await p.click(`#da-m button[data-v="${m}"]`); await wait(100);
    const n = await p.$eval('#da-ctl-s', e => +e.max + 1), lis = await p.$eval('#sx-da', e => e.children.length);
    if (n !== lis) problems.push(`${tag}: da-card ${m} has ${n} steps, list ${lis}`);
    for (let k = 0; k < n; k++) { await p.$eval('#da-ctl-s', (e, k) => { e.value = k; e.dispatchEvent(new Event('input')) }, k); if (shoot && m === 'bug' && k === 7) await (await p.$('#da-card')).screenshot({ path: `${shots}/x-da-bug-s8-${scheme}-${width}.png` }) }
    const cur = await p.$eval('#sx-da', e => [...e.children].findIndex(li => li.classList.contains('on'))); if (cur !== n - 1) problems.push(`${tag}: sx-da does not mark the last step (${m})`);
  }
  await audit('end');
  for (const t of ['t-path', 't-more']) { await p.click(`#tabs button[data-t="${t}"]`); await wait(300); await audit(t, t);
    if (t === 't-path') { const c = await p.$$eval('#t-path .s3sp', xs => xs.map(x => getComputedStyle(x).display)); if (width === 1400 && c[0] !== 'grid') problems.push(`${tag}: Coefficient paths is not split`) } }
  await p.click('#tabs button[data-t="t-read"]');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file);
  for (const [id] of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  await p.$eval('#da-card', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
  if ((await p.$eval('#da-ctl-s', e => +e.value)) !== 0) problems.push('reduced motion: da-card moved by itself');
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
