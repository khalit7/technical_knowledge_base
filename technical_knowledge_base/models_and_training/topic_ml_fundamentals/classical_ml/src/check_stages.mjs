// The 2026-11-06 rollout checks for Classical ML (2026-11-10), adapted from Activation functions' check_stages.mjs.
// Four 3D stages (Fig. 1 a tree grown depth by depth, Fig. 2 one tree, a forest and boosting, Fig. 3 the SVM score as a height, Fig. 4 PCA on
// three wine measurements) and two 2D step animations (clustering, isolation forest) play by themselves once scrolled into view, step to their
// last step with one step-list item per step in every mode, stop redrawing off screen and never move under reduced motion; the search figure is a
// widget (no autoplay, no step list) that opens on its last trial. No errors, NaN, undefined or sideways scroll; splits are two columns at 1400 px
// and one below 1100 px. The numbers written in the step lists as static text (data-tr, data-en, data-sv, data-pc, data-if spans) equal what the
// scenes compute from the page's data, and some are compared with scikit-learn's numbers in inputs/recompute.json or recomputed here.
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_ml_fundamentals/classical_ml/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const html = path.resolve(here, '../index.html'), file = 'file://' + html, shots = process.argv[2] || path.resolve(here, '../.shots');
const REF = JSON.parse(fs.readFileSync(path.resolve(here, 'inputs/recompute.json'), 'utf8'));
fs.mkdirSync(shots, { recursive: true });
// 3D stages and their modes: [mode button selector or '', step list]
const STAGES = [['stg-tr', [['', 'sx-tr']]],
  ['stg-en', [['', 'sx-en-rf'], ['#enM [data-m="gb"]', 'sx-en-gb'], ['#enM [data-m="tree"]', 'sx-en-tree'], ['#enM [data-m="rf"]', 'sx-en-rf']]],
  ['stg-sv', [['', 'sx-svl'], ['#svM [data-k="svmr"]', 'sx-svr'], ['#svM [data-k="svml"]', 'sx-svl']]],
  ['stg-pc', [['', 'sx-pc']]]];
// 2D step animations (RD.anim): card, controls id, modes
const ANIMS = [['rd-cl', 'rd-clC', [['', 'sx-cl-km'], ['#rd-clM [data-m="kmpp"]', 'sx-cl-kmpp'], ['#rd-clM [data-m="gmm"]', 'sx-cl-gmm'], ['#rd-clM [data-m="dbscan"]', 'sx-cl-db'], ['#rd-clM [data-m="km"]', 'sx-cl-km']]],
  ['rd-if', 'rd-ifC', [['', 'sx-if']]]];
const KINDS = ['tr', 'en', 'sv', 'pc', 'if'];
const wait = ms => new Promise(r => setTimeout(r, ms));
const problems = [];
const raw = fs.readFileSync(html, 'utf8'), staticSpans = {};
for (const m of raw.matchAll(/<span data-(tr|en|sv|pc|if)="([\w.]+)">(.*?)<\/span>/g)) staticSpans[m[1] + ':' + m[2]] = m[3].replace(/<[^>]+>/g, '');
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
      const t = c.innerText;
      return { bad: (t.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } }, tab);
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (cols.length < 12 || cols.some(c => c !== 'grid'))) problems.push(`${tag}: a split is not two columns (${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  if (width === 1400) {
    const over = await p.$$eval('.tab .s3R', xs => xs.map(x => { const r = x.getBoundingClientRect(), k = x.firstElementChild && x.firstElementChild.getBoundingClientRect(); return k && r.width && (k.right > r.right + 1 || k.left < r.left - 1) ? x.innerHTML.slice(0, 40) : '' }).filter(Boolean));
    over.forEach(o => problems.push(`${tag}: right-column content wider than its column: ${o}`));
    const live = await p.evaluate(K => Object.fromEntries([...document.querySelectorAll(K.map(k => '[data-' + k + ']').join(','))].map(e => { const k = K.find(x => e.dataset[x] != null); return [k + ':' + e.dataset[k], e.textContent] })), KINDS);
    for (const [k, v] of Object.entries(live)) if (staticSpans[k] == null) problems.push(`span ${k} missing from the static page`); else if (staticSpans[k] !== v) problems.push(`span ${k}: static "${staticSpans[k]}" but the data gives "${v}"`);
    // against scikit-learn (recompute.py) and independent recomputes
    const r = await p.evaluate(REF => { const out = [], q = s => (document.querySelector(s) || {}).textContent, pc = v => (100 * v).toFixed(1) + '%';
      // tree depths: scikit-learn's accuracies and leaf counts
      [[1, 1], [2, 2], [3, 3], [4, 4], [6, 5]].forEach(([dep, i]) => { const t = REF.tree_depth.find(x => x.depth === dep); if (pc(t.test) !== q(`[data-tr="te${i}"]`)) out.push(`tree depth ${dep} test ${q(`[data-tr="te${i}"]`)} vs sklearn ${pc(t.test)}`); if (q(`[data-tr="l${i}"]`) != null && String(t.leaves) !== q(`[data-tr="l${i}"]`)) out.push(`tree depth ${dep} leaves`) });
      if (pc(REF.cancer_majority_test) !== q('[data-tr="te0"]')) out.push('depth 0 test accuracy');
      // mcycle: one tree and boosting equal scikit-learn's held-out errors
      [['tree', 0, '1'], ['tree', 1, '2'], ['tree', 2, '4'], ['gb', 0, '1'], ['gb', 1, '2'], ['gb', 2, '5'], ['gb', 3, '20']].forEach(([m, i, k]) => { const v = REF.mcycle[m][k][1].toFixed(0); if (v !== q(`[data-en="${m}${i}b"]`)) out.push(`mcycle ${m} ${k}: ${q(`[data-en="${m}${i}b"]`)} vs sklearn ${v}`) });
      // SVM: support vectors within 2 of libsvm's, margins within 0.02, accuracies equal at C = 1 (libsvm's borderline points differ, README)
      [['l', 'linear', [0.01, 0.1, 1, 100]], ['r', 'rbf', [0.01, 0.1, 1, 100]]].forEach(([s, k, C]) => C.forEach((c, i) => { const ref = REF.svm_moons[k + '_' + c];
        if (Math.abs(ref.nsv - +q(`[data-sv="${s}${i}n"]`)) > 2) out.push(`svm ${k} C ${c}: ${q(`[data-sv="${s}${i}n"]`)} support vectors vs ${ref.nsv}`);
        if (ref.margin && Math.abs(ref.margin - +q(`[data-sv="${s}${i}m"]`)) > .02) out.push(`svm ${k} C ${c}: margin`);
        const tr = q(`[data-sv="${s}${i}tr"]`); if (tr && tr !== pc(ref.train)) out.push(`svm ${k} C ${c}: training ${tr} vs ${pc(ref.train)}`) }));
      // PCA on the three wine measurements: power iteration on their correlation matrix
      { const W = CD.wine, FI = [6, 5, 11], X = W.X.map(r => FI.map(j => r[j])), n = X.length, mu = [0, 1, 2].map(j => X.reduce((a, r) => a + r[j], 0) / n), sd = [0, 1, 2].map(j => Math.sqrt(X.reduce((a, r) => a + (r[j] - mu[j]) ** 2, 0) / n)), Z = X.map(r => r.map((v, j) => (v - mu[j]) / sd[j]));
        const Cm = [0, 1, 2].map(a => [0, 1, 2].map(b => Z.reduce((s, r) => s + r[a] * r[b], 0) / n)); let v = [1, 1, 1]; for (let it = 0; it < 200; it++) { const w = Cm.map(r => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]), l = Math.hypot(...w); v = w.map(x => x / l) }
        const lam = Cm.map(r => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]).reduce((s, x, i) => s + x * v[i], 0); if (pc(lam / 3) !== q('[data-pc="r1"]')) out.push(`pca PC1 ${q('[data-pc="r1"]')} vs ${pc(lam / 3)}`);
        const cs = [[0, 1], [0, 2], [1, 2]].map(([a, b]) => Cm[a][b]); if (Math.min(...cs).toFixed(2) !== '0.70' || Math.max(...cs).toFixed(2) !== '0.86') out.push('wine correlations ' + cs) }
      // isolation forest: c(256)
      { const H = i => Math.log(i) + 0.5772156649, c = 2 * H(255) - 2 * 255 / 256; if (c.toFixed(2) !== q('[data-if="c"]')) out.push('c(256)') }
      return out }, REF);
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  // every stage and animation plays once scrolled into view; the search widget does not
  for (const [id] of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
    if (shoot) await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-autoplay-${scheme}-${width}.png` });
  }
  for (const [card, ctl] of ANIMS) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1200);
    if ((await p.$eval(`#${ctl}-p`, e => e.getAttribute('aria-label'))) !== 'Pause') problems.push(`${tag}: ${card} did not play when scrolled into view`);
  }
  { await p.$eval('#rd-hpc', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.evaluate(() => [document.getElementById('rd-hpC-p').getAttribute('aria-label'), +document.getElementById('rd-hpC-s').value, +document.getElementById('rd-hpC-s').max]);
    if (r[0] !== 'Play') problems.push(`${tag}: the search widget played by itself`); if (r[1] !== r[2]) problems.push(`${tag}: the search widget does not open on its last trial (${r[1]} of ${r[2]})`) }
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
      if (shoot && k === Math.floor(n / 2)) { await wait(650); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${label}-s${k + 1}-midtween-${scheme}-${width}.png` }); await wait(1200); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${label}-s${k + 1}-${scheme}-${width}.png` }) }
      else await wait(width === 1400 ? 450 : 200);
    }
    await wait(1800);
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
  // 2D animations: every mode, one list item per step, stepped to the end
  for (const [card, ctl, modes] of ANIMS) for (const [btn, lid] of modes) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' }));
    if (btn) { await p.evaluate(s => document.querySelector(s).click(), btn); await wait(300); if (width === 1400 && (await p.$eval(`#${ctl}-p`, e => e.getAttribute('aria-label'))) !== 'Pause') problems.push(`${tag}: ${card} did not replay after ${btn}`) }
    const n = await p.$eval(`#${ctl}-s`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.hidden ? -1 : e.children.length);
    if (lis !== n) problems.push(`${tag}: ${card} ${lid}: ${n} steps but the list shows ${lis}`);
    for (let k = 0; k < n; k++) { await p.$eval(`#${ctl}-f`, e => e.click()); await wait(120) }
    await wait(2800);
    if (shoot && lid === 'sx-cl-km' && !btn) await (await p.$('#' + card)).screenshot({ path: `${shots}/x-${card}-last-${scheme}-${width}.png` });
    if (shoot && card === 'rd-if') { await p.evaluate(() => document.getElementById('sx-if').children[3].click()); await wait(300); await (await p.$('#' + card)).screenshot({ path: `${shots}/x-${card}-s4-${scheme}-${width}.png` }) }
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== (card === 'rd-if' && shoot ? 3 : n - 1)) problems.push(`${tag}: ${card} ${lid} marks step ${cur + 1}`);
    await audit(`${card} ${lid}`);
  }
  // the clustering controls and the search widget's controls, every value
  await p.select('#rd-clD', 'faithful'); await wait(200); await p.select('#rd-clD', 'moons'); await p.evaluate(() => document.querySelector('#rd-clM [data-m="dbscan"]').click()); await wait(200);
  await p.$eval('#rd-clE', e => { e.value = e.min; e.dispatchEvent(new Event('input')) }); await wait(150); await p.$eval('#rd-clE', e => { e.value = e.max; e.dispatchEvent(new Event('input')) }); await wait(150);
  await p.select('#rd-clD', 'six'); await p.evaluate(() => document.querySelector('#rd-clM [data-m="km"]').click()); await p.evaluate(() => document.getElementById('rd-clNew').click()); await wait(200); await audit('clustering controls');
  for (const m of ['random', 'bo', 'grid']) { await p.evaluate(m => document.querySelector(`#rd-hpM [data-m="${m}"]`).click(), m); for (const v of ['0', '1', '2', '3']) { await p.select('#rd-hpS', v); await wait(60) } }
  await audit('search controls');
  for (const t of ['t-lab', 't-more']) { await p.click(`#tabs button[data-t="${t}"]`); await wait(300); await audit(t, t) }
  await p.click('#tabs button[data-t="t-read"]');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file);
  for (const [id] of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  for (const [card, ctl] of ANIMS) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.evaluate(ctl => [document.getElementById(ctl + '-p').getAttribute('aria-label'), +document.getElementById(ctl + '-s').value], ctl); if (r[0] !== 'Play' || r[1] !== 0) problems.push(`reduced motion: ${card} moved by itself (${r})`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: a stage kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
