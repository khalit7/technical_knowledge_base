// The 2026-11-06 rollout checks for Loss functions (2026-11-10), adapted from Activation functions' check_stages.mjs:
// the four 3D stages (Fig. 1 a padded batch, Fig. 2 outliers in two datasets, Fig. 3 one prediction through cross entropy, Fig. 4 the logit level)
// play by themselves once scrolled into view, step to their last step with one step-list item per step in every mode, stop redrawing off screen
// and never move under reduced motion; the 2D widgets are reader-driven and have no step list; no errors, NaN, undefined or sideways scroll;
// splits are two columns at 1400 px and one below 1100 px; the numbers written in the step lists as static text (data-bt, data-ol, data-ce,
// data-zl spans) equal what the scenes compute from the page's data, and a few are recomputed here independently. Writes mid-step screenshots.
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_ml_fundamentals/loss_functions/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const html = path.resolve(here, '../index.html'), file = 'file://' + html, shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
// stage, its modes: [mode button selector or '', step list]
const STAGES = [['stg-bt', [['', 'sx-bt']]], ['stg-ol', [['#olM [data-m="a"]', 'sx-ol-a'], ['#olM [data-m="s"]', 'sx-ol-s']]],
  ['stg-ce', [['', 'sx-ce']]], ['stg-zl', [['', 'sx-zl']]]];
const PFX = ['bt', 'ol', 'ce', 'zl'];
const wait = ms => new Promise(r => setTimeout(r, ms));
const problems = [];
const raw = fs.readFileSync(html, 'utf8'), staticSpans = {};
for (const m of raw.matchAll(/<span data-(bt|ol|ce|zl)="([\w.-]+)">(.*?)<\/span>/g)) staticSpans[m[1] + ':' + m[2]] = m[3].replace(/<[^>]+>/g, '');
if (Object.keys(staticSpans).length < 60) problems.push(`only ${Object.keys(staticSpans).length} data spans found in the step lists`);
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(400);
  const tag = `${scheme} ${width}`, shoot = width === 1400 || width === 390;
  const audit = async (where, tab = 't-read') => {
    const r = await p.evaluate(tab => { const c = document.getElementById(tab).cloneNode(true); c.querySelectorAll('pre,code').forEach(x => x.remove());
      const t = c.innerText.split('not-a-number (NaN)').join('');
      return { bad: (t.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } }, tab);
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (cols.length < 12 || cols.some(c => c !== 'grid'))) problems.push(`${tag}: a split is not two columns (${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  if (width === 1400) {
    const over = await p.$$eval('.tab .s3R', xs => xs.map(x => { const r = x.getBoundingClientRect(), k = x.firstElementChild && x.firstElementChild.getBoundingClientRect(); return k && r.width && (k.right > r.right + 1 || k.left < r.left - 1) ? x.innerHTML.slice(0, 40) : '' }).filter(Boolean));
    over.forEach(o => problems.push(`${tag}: right-column content wider than its column: ${o}`));
    const live = await p.evaluate(PFX => Object.fromEntries([...document.querySelectorAll(PFX.map(x => '[data-' + x + ']').join(','))].map(e => { const k = PFX.find(x => e.dataset[x] != null); return [k + ':' + e.dataset[k], e.textContent] })), PFX);
    for (const [k, v] of Object.entries(live)) if (staticSpans[k] == null) problems.push(`span ${k} missing from the static page`); else if (staticSpans[k].replace(/\^/g, '') !== v.replace(/\^/g, '')) problems.push(`span ${k}: static "${staticSpans[k]}" but the data gives "${v}"`);
    // independent recomputes: the batch's two means from the raw token losses; Anscombe III's least-squares slope in closed form; the
    // prediction's cross entropy and the zero sum of its gradient over the whole vocabulary; z-loss at the model's level
    const r = await p.evaluate(() => { const out = [], B = LT.batch, all = B.rows.flatMap(r => r.ce), mt = all.reduce((a, b) => a + b, 0) / all.length;
      if (Math.abs(mt - B.torch_mean_ignore_index) > 1e-3) out.push('per-token mean ' + mt + ' against torch ' + B.torch_mean_ignore_index);
      const ms = B.rows.map(r => r.ce.reduce((a, b) => a + b, 0) / r.ce.length).reduce((a, b) => a + b, 0) / B.rows.length; if (ms.toFixed(2) !== document.querySelector('[data-bt="ms"]').textContent) out.push('mean of means ' + ms);
      const X = LD.anscombe3.x, Y = LD.anscombe3.y, n = X.length, mx = X.reduce((a, b) => a + b) / n, my = Y.reduce((a, b) => a + b) / n;
      const bb = X.reduce((s, x, i) => s + (x - mx) * (Y[i] - my), 0) / X.reduce((s, x) => s + (x - mx) ** 2, 0); if (bb.toFixed(3) !== document.querySelector('[data-ol="a-mse-b1"]').textContent) out.push('Anscombe slope ' + bb);
      const P = LT.pred, t = P.tokens.find(x => x.id === P.target_id); if ((P.logZ - t.logit).toFixed(2) !== document.querySelector('[data-ce="ce"]').textContent) out.push('cross entropy');
      const ps = P.tokens.map(x => Math.exp(x.logit - P.logZ)), rest = 1 - ps.reduce((a, b) => a + b, 0); if (Math.abs(rest - P.rest_p) > 1e-4) out.push('rest of the vocabulary ' + rest + ' against ' + P.rest_p);
      if (Math.abs((1e-4 * P.logZ * P.logZ) - P.zloss) > 1e-6) out.push('z-loss');
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  // every stage plays once scrolled into view
  for (const [id] of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
    if (shoot) { await wait(300); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-autoplay-${scheme}-${width}.png` }) }
  }
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  const stepAll = async (id, lid, label) => {
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length);
    if (lis !== n) problems.push(`${tag}: ${id}${label} has ${n} steps but list ${lid} shows ${lis}`);
    if (await p.$eval('#' + lid, e => e.hidden)) problems.push(`${tag}: ${lid} hidden while its mode is on`);
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' }));
    for (let k = 0; k < n; k++) {
      if (k) await p.$eval(`#${id}-f`, e => e.click());
      if (shoot) {
        await wait(700); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${label}-s${k + 1}-midtween-${scheme}-${width}.png` });
        await wait(2000); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${label}-s${k + 1}-${scheme}-${width}.png` })
      } else await wait(250);
    }
    await wait(2800);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id}${label} ended on ${sh}`);
    await audit(`${id}${label} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id}${label} list does not mark the last step`);
  };
  for (const [id, modes] of STAGES) for (const [btn, lid] of modes) {
    if (btn) { await p.evaluate(s => document.querySelector(s).click(), btn); await wait(200) }
    // a mode switch replays the stage from step 1 (the one exception to stopping for good)
    if (btn && width === 1400) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(600); if ((await p.$eval(`#${id}-p`, e => e.getAttribute('aria-label'))) !== 'Pause') problems.push(`${tag}: ${id} did not replay after ${btn}`) }
    await stepAll(id, lid, btn ? '-' + lid.split('-').pop() : '');
  }
  // the 2D figures are widgets the reader drives: none carries a step list or an autoplaying control
  const w = await p.$$eval('#t-read .card .an-play', xs => xs.length); if (w) problems.push(`${tag}: ${w} 2D animation controls left in Reading`);
  await audit('end');
  for (const t of ['t-fit', 't-more']) { await p.click(`#tabs button[data-t="${t}"]`); await wait(300); await audit(t, t) }
  await p.click('#tabs button[data-t="t-read"]');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file);
  for (const [id] of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
