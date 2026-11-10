// The 2026-11-06 rollout checks for Normalisation and initialisation (2026-11-10), adapted from Activation functions' check_stages.mjs.
// At 1400 px light, 920 px light and 390 px dark: the three 3D stages (Fig. 1 the signal through 20 layers, Fig. 3 the loss bowl, Fig. 5 the
// tensor's axes) play by themselves once scrolled into view, step to their last step with one step-list item per step, stop redrawing off screen
// and never move under reduced motion; the two 2D animations (Fig. 2 kNN on the wines, Fig. 6 BatchNorm) play on view (their play button reads
// Pause), have one list item per step in every mode and replay on a mode switch; the placement toy in its closed block is a widget and never
// plays by itself; no errors, NaN, undefined or sideways scroll; splits are two columns at 1400 px and one below 1100 px. The numbers written
// in the step lists as static text (data-hr, data-bw, data-ax spans) equal what the scenes compute, and are recomputed here independently:
// the hero's factors from recompute_output.json and signal_output.json, the bowl from data/wine.json, the axes from the page's own tensor.
// Writes mid-step screenshots of every stage at 1400 light and 390 dark.
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_ml_fundamentals/normalisation_and_initialisation/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const html = path.resolve(here, '../index.html'), file = 'file://' + html, shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = [['stg-hr', 'sx-hr'], ['stg-bw', 'sx-bw'], ['stg-ax', 'sx-ax']];
// 2D animations: card, controls id, modes [button selector or '', list]
const ANIMS = [['sc-card', 'sc-ctl', [['#sc-modes [data-m="std"]', 'sx-sc'], ['#sc-modes [data-m="mm"]', 'sx-sc']]],
  ['bn-card', 'bn-ctl', [['#bn-modes [data-m="b8"]', 'sx-bn-b8'], ['#bn-modes [data-m="b2"]', 'sx-bn-b2'], ['#bn-modes [data-m="ln"]', 'sx-bn-ln']]]];
const wait = ms => new Promise(r => setTimeout(r, ms));
const problems = [];
const raw = fs.readFileSync(html, 'utf8'), staticSpans = {};
for (const m of raw.matchAll(/<span data-(hr|bw|ax)="([\w.]+)">(.*?)<\/span>/g)) staticSpans[m[1] + ':' + m[2]] = m[3].replace(/<[^>]+>/g, '');
if (Object.keys(staticSpans).length < 25) problems.push(`only ${Object.keys(staticSpans).length} data spans found in the step lists`);
// ---- independent recomputes, in node ----
{ const rc = JSON.parse(fs.readFileSync(path.resolve(here, 'recompute_output.json'))), sg = JSON.parse(fs.readFileSync(path.resolve(here, 'signal_output.json')));
  const per = { default: rc.relu_mlp.default.per_layer, xavier: rc.relu_mlp.xavier.per_layer, he: rc.relu_mlp.he.per_layer, he2: sg.he2.per_layer };
  for (const [k, v] of Object.entries(per)) if (staticSpans['hr:' + k + '.f'] !== v.toFixed(3)) problems.push(`hero ${k} factor: page ${staticSpans['hr:' + k + '.f']}, recorded ${v.toFixed(3)}`);
  const sup = s => s.replace('-', '⁻').split('').map(c => '⁰¹²³⁴⁵⁶⁷⁸⁹'['0123456789'.indexOf(c)] || c).join('');
  const fe = v => v >= .1 && v < 1000 ? v.toFixed(v < 10 ? 2 : 1) : v.toExponential(1).replace(/e\+?(-?)(\d+)/, (m, s, d) => ' × 10' + sup(s + d));
  const end = { default: rc.relu_mlp.default.ms[20], xavier: rc.relu_mlp.xavier.ms[20], he: rc.relu_mlp.he.ms[20], he2: sg.he2.ms[20], default_ln: sg.default_ln.ms[20] };
  for (const [k, v] of Object.entries(end)) if (staticSpans['hr:' + k + '.end'] !== fe(v)) problems.push(`hero ${k} after 20 layers: page ${staticSpans['hr:' + k + '.end']}, recorded ${fe(v)}`);
  // the bowl: hue = w proline + b on the training wines, the Hessian's eigenvalues and 30 gradient steps at 1.2 / lambda_max
  const W = JSON.parse(fs.readFileSync(path.resolve(here, 'data/wine.json'))).pts.filter(p => p[3] === 1), pr = W.map(p => p[0]), hu = W.map(p => p[1]);
  const mean = a => a.reduce((s, v) => s + v, 0) / a.length, mu = mean(pr), sd = Math.sqrt(mean(pr.map(v => (v - mu) ** 2))), lo = Math.min(...pr), hi = Math.max(...pr);
  const X = { raw: pr, mm: pr.map(v => (v - lo) / (hi - lo)), std: pr.map(v => (v - mu) / sd) };
  for (const [m, x] of Object.entries(X)) {
    const a = mean(x.map(v => v * v)), c = mean(x), ev = [(a + 1) / 2 + Math.sqrt(((a - 1) / 2) ** 2 + c * c), (a + 1) / 2 - Math.sqrt(((a - 1) / 2) ** 2 + c * c)];
    const L = (w, b) => .5 * mean(x.map((v, i) => (w * v + b - hu[i]) ** 2));
    let w = 0, b = 0; const lr = 1.2 / ev[0];
    for (let t = 0; t < 30; t++) { const r = x.map((v, i) => w * v + b - hu[i]), gw = mean(r.map((e, i) => e * x[i])), gb = mean(r); w -= lr * gw; b -= lr * gb }
    const k = ev[0] / ev[1], ks = k < 10 ? k.toFixed(1) : k < 1000 ? String(Math.round(k)) : k.toExponential(1).replace(/e\+?(-?)(\d+)/, (q, s, d) => ' × 10' + sup(s + d));
    if (staticSpans['bw:' + m + '.kappa'] !== ks) problems.push(`bowl ${m} kappa: page ${staticSpans['bw:' + m + '.kappa']}, recomputed ${ks}`);
    if (staticSpans['bw:' + m + '.Ln'] !== L(w, b).toFixed(3)) problems.push(`bowl ${m} loss after 30: page ${staticSpans['bw:' + m + '.Ln']}, recomputed ${L(w, b).toFixed(3)}`);
  }
}
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
  if (width === 1400 && (cols.length < 7 || cols.some(c => c !== 'grid'))) problems.push(`${tag}: a split is not two columns (${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  if (width === 1400) {
    const over = await p.$$eval('.tab .s3R', xs => xs.map(x => { const r = x.getBoundingClientRect(), k = x.firstElementChild && x.firstElementChild.getBoundingClientRect(); return k && r.width && (k.right > r.right + 1 || k.left < r.left - 1) ? x.innerHTML.slice(0, 40) : '' }).filter(Boolean));
    over.forEach(o => problems.push(`${tag}: right-column content wider than its column: ${o}`));
    const live = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-hr],[data-bw],[data-ax]')].map(e => { const k = ['hr', 'bw', 'ax'].find(x => e.dataset[x] != null); return [k + ':' + e.dataset[k], e.textContent] })));
    for (const [k, v] of Object.entries(live)) if (staticSpans[k] == null) problems.push(`span ${k} missing from the static page`); else if (staticSpans[k] !== v) problems.push(`span ${k}: static "${staticSpans[k]}" but the data gives "${v}"`);
    // the axes, recomputed with a BatchNorm and a LayerNorm written here on the page's own tensor
    const r = await p.evaluate(() => { const out = [], { N, C, H, W } = NI.IMG, HW = H * W, x = NI.makeImage(3), y = new Float64Array(x); for (let i = 0; i < C * HW; i++) y[i] *= 3;
      const bn = v => { const o = new Float64Array(v.length); for (let c = 0; c < C; c++) { const ix = []; for (let n = 0; n < N; n++) for (let q = 0; q < HW; q++) ix.push((n * C + c) * HW + q);
        const m = ix.reduce((s, i) => s + v[i], 0) / ix.length, s2 = ix.reduce((s, i) => s + (v[i] - m) ** 2, 0) / ix.length; ix.forEach(i => o[i] = (v[i] - m) / Math.sqrt(s2 + 1e-5)) } return o };
      const ln = v => { const o = new Float64Array(v.length), P = C * HW; for (let n = 0; n < N; n++) { const s = v.slice(n * P, (n + 1) * P), m = s.reduce((a, b) => a + b, 0) / P, s2 = s.reduce((a, b) => a + (b - m) ** 2, 0) / P; for (let i = 0; i < P; i++) o[n * P + i] = (s[i] - m) / Math.sqrt(s2 + 1e-5) } return o };
      const cnt = f => { const a = f(x), b2 = f(y); let k = 0; for (let i = C * HW; i < x.length; i++) if (Math.abs(a[i] - b2[i]) > 1e-9) k++; return k };
      if (String(cnt(bn)) !== document.querySelector('[data-ax="bn.chg"]').textContent) out.push('BatchNorm changed count ' + cnt(bn));
      if (String(cnt(ln)) !== document.querySelector('[data-ax="ln.chg"]').textContent) out.push('LayerNorm changed count ' + cnt(ln));
      const bnr = NI.normalise(x, 'img', 'bn', 3).y, mx = Math.max(...bn(x).map((v, i) => Math.abs(v - bnr[i]))); if (mx > 1e-12) out.push('NI.normalise BatchNorm differs by ' + mx);
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  // every stage and 2D animation plays once scrolled into view; the placement widget does not
  for (const [id] of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
    if (shoot) { await wait(300); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-autoplay-${scheme}-${width}.png` }) }
  }
  for (const [card, ctl] of ANIMS) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1800);
    if ((await p.$eval(`#${ctl}-p`, e => e.getAttribute('aria-label'))) !== 'Pause') problems.push(`${tag}: ${card} did not play when scrolled into view`);
  }
  await p.evaluate(() => document.querySelectorAll('details.dp').forEach(d => d.open = true)); await wait(300);
  await p.$eval('#pl-card', e => e.scrollIntoView({ block: 'center' })); await wait(1800);
  if ((await p.$eval('#pl-ctl-p', e => e.getAttribute('aria-label'))) !== 'Play') problems.push(`${tag}: the placement widget played by itself`);
  await p.$eval('#s-deep', e => e.scrollIntoView({ block: 'start' })); await wait(800);
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
        await wait(900); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}-midtween-${scheme}-${width}.png` });
        await wait(2400); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}-${scheme}-${width}.png` })
      } else await wait(250);
    }
    await wait(3300);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
    await audit(`${id} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id} list does not mark the last step`);
  }
  for (const [card, ctl, modes] of ANIMS) for (const [btn, lid] of modes) {
    await p.evaluate(s => document.querySelector(s).click(), btn); await wait(200);
    if (await p.$eval('#' + lid, e => e.hidden)) problems.push(`${tag}: ${lid} hidden while its mode is on`);
    if (width === 1400) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(700); if ((await p.$eval(`#${ctl}-p`, e => e.getAttribute('aria-label'))) !== 'Pause') problems.push(`${tag}: ${card} did not replay after ${btn}`) }
    const n = await p.$eval(`#${ctl}-s`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length);
    if (lis !== n) problems.push(`${tag}: ${card} ${btn} has ${n} steps but list ${lid} shows ${lis}`);
    for (let k = 0; k < n; k++) { await p.evaluate((c, k) => { const s = document.getElementById(c + '-s'); s.value = k; s.dispatchEvent(new Event('input')) }, ctl, k); await wait(60) }
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${card} ${btn} list does not mark the last step`);
    await audit(`${card} ${btn} last step`);
    if (shoot) await (await p.$('#' + card)).screenshot({ path: `${shots}/x-${card}-${lid}-last-${scheme}-${width}.png` });
  }
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file);
  for (const [id] of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  for (const [card, ctl] of ANIMS) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval(`#${ctl}-s`, e => +e.value); if (r !== 0 || (await p.$eval(`#${ctl}-p`, e => e.getAttribute('aria-label'))) !== 'Play') problems.push(`reduced motion: ${card} moved by itself`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
