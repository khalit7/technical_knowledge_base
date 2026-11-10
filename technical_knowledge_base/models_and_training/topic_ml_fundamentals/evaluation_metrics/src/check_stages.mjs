// The 2026-11-06 rollout checks for Evaluation metrics (2026-11-10), adapted from Activation functions' check_stages.mjs:
// the three 3D stages (Fig. 1 one threshold through the SST-2 scores, Fig. 2 one ranked list, Fig. 3 one text under three tokenizers) and the two
// 2D step animations (calibration, the five scorers) play by themselves once scrolled into view, step to their last step with one step-list item
// per step in every mode, stop redrawing off screen and never move under reduced motion; the widgets (hero, averaging, regression, k slider,
// editor) have no step list; no errors, NaN, undefined or sideways scroll; splits are two columns at 1400 px and one below 1100 px; the numbers
// written in the step lists as static text (data-tc, data-rk, data-px spans) equal what the scenes compute, and a few are recomputed here
// independently with the page's metric engine. Writes mid-step screenshots.
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_ml_fundamentals/evaluation_metrics/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const html = path.resolve(here, '../index.html'), file = 'file://' + html, shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
// 3D stages and their modes: [mode button selector or '', step list]
const STAGES = [['stg-thr', [['', 'sx-thr']]], ['stg-rk', [['', 'sx-rk']]],
  ['stg-px', [['', 'sx-px'], ['#rd-pxT [data-k="fr"]', 'sx-px'], ['#rd-pxT [data-k="code"]', 'sx-px'], ['#rd-pxT [data-k="en"]', 'sx-px']]]];
// 2D animations (RD.anim): card, controls id, modes [button selector or '', step list]
const ANIMS = [['rd-cal', 'rd-calC', [['', 'sx-cal']]],
  ['rd-tx', 'rd-txC', [['', 'sx-tx-bleu'], ['#rd-txM [data-m="rl"]', 'sx-tx-rl'], ['#rd-txM [data-m="met"]', 'sx-tx-met'], ['#rd-txM [data-m="chrf"]', 'sx-tx-chrf'], ['#rd-txM [data-m="bs"]', 'sx-tx-bs']]]];
const wait = ms => new Promise(r => setTimeout(r, ms));
const problems = [];
const raw = fs.readFileSync(html, 'utf8'), staticSpans = {};
for (const m of raw.matchAll(/<span data-(tc|rk|px)="(\w+)">(.*?)<\/span>/g)) staticSpans[m[1] + ':' + m[2]] = m[3].replace(/<[^>]+>/g, '');
if (Object.keys(staticSpans).length < 45) problems.push(`only ${Object.keys(staticSpans).length} data spans found in the step lists`);
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
      return { bad: (t.match(/.{0,30}\b(NaN|Infinity)\b.{0,30}/g) || []).concat((t.match(/.{0,30}\bundefined\b.{0,30}/g) || []).filter(x => !/precision undefined|\bundefined<|>undefined|\| undefined/.test(x) && !/Precision\s+undefined/i.test(x) && !/undefined\s+0\.0/.test(x))),
        side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } }, tab);
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (cols.length < 12 || cols.some(c => c !== 'grid'))) problems.push(`${tag}: a split is not two columns (${cols.length}: ${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  if (width === 1400) {
    const over = await p.$$eval('.tab .s3R', xs => xs.map(x => { const r = x.getBoundingClientRect(), k = x.firstElementChild && x.firstElementChild.getBoundingClientRect(); return k && r.width && (k.right > r.right + 1 || k.left < r.left - 1) ? x.innerHTML.slice(0, 60) : '' }).filter(Boolean));
    over.forEach(o => problems.push(`${tag}: right-column content wider than its column: ${o}`));
    const live = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-tc],[data-rk],[data-px]')].map(e => { const k = ['tc', 'rk', 'px'].find(x => e.dataset[x] != null); return [k + ':' + e.dataset[k], e.textContent] })));
    for (const [k, v] of Object.entries(live)) if (staticSpans[k] == null) problems.push(`span ${k} missing from the static page`); else if (staticSpans[k] !== v) problems.push(`span ${k}: static "${staticSpans[k]}" but the data gives "${v}"`);
    // independent recomputes with the page's engine MX and data EM: the trap table's rows, the ranked list from rank_example.json's grades, bits per byte
    const r = await p.evaluate(() => { const out = [], Y = [...EM.sst2.y].map(Number), P = MX.prob(EM.sst2.logit.lr), q = s => document.querySelector(s).textContent;
      const all = MX.confusion(Y, P, .5); if (String(all.tp) !== q('[data-tc="tp1"]') || String(all.fp) !== q('[data-tc="fp1"]')) out.push('threshold 0.5 counts');
      const idx = MX.sst(true), y = idx.map(i => Y[i]), pr = idx.map(i => P[i]), c = MX.confusion(y, pr, .5); if (String(c.fp) !== q('[data-tc="fp4"]') || String(c.tp) !== q('[data-tc="tp4"]')) out.push('rare 0.5 counts');
      const trap = document.getElementById('rd-trapT').innerText; ['94.7%', '90.5%', '75.7%'].forEach(v => { if (!trap.includes(v)) out.push('trap table lacks ' + v) });
      if (!trap.includes(q('[data-tc="tb6"]'))) out.push('trap threshold differs from the stage: ' + q('[data-tc="tb6"]'));
      const G = EM.rank.grades, ideal = G.filter(g => g > 0).concat(EM.rank.missing).sort((a, b) => b - a), dcg = gr => gr.slice(0, 5).reduce((s, g, i) => s + g / Math.log2(i + 2), 0);
      if ((dcg(G) / dcg(ideal)).toFixed(3) !== '0.517') out.push('nDCG@5 ' + dcg(G) / dcg(ideal));
      const lp = EM.ppl.models.smol.scores.num.lp, bpb = -lp.reduce((a, b) => a + b, 0) / Math.LN2 / EM.ppl.texts.num.bytes; if (bpb.toFixed(3) !== q('[data-px="y1"]')) out.push('SmolLM2 bits per byte ' + bpb);
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  // every stage and animation plays once scrolled into view
  for (const [id] of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
    if (shoot) { await wait(300); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-autoplay-${scheme}-${width}.png` }) }
  }
  for (const [card, ctl] of ANIMS) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(700);
    if ((await p.$eval(`#${ctl}-p`, e => e.getAttribute('aria-label'))) !== 'Pause') problems.push(`${tag}: ${card} did not play when scrolled into view`);
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
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' }));
    for (let k = 0; k < n; k++) {
      if (k) await p.$eval(`#${id}-f`, e => e.click());
      if (shoot && !label) {
        await wait(800); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}-midtween-${scheme}-${width}.png` });
        await wait(1800); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}-${scheme}-${width}.png` })
      } else await wait(250);
    }
    await wait(2600);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id}${label} ended on ${sh}`);
    if (shoot && label) await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${label}-last-${scheme}-${width}.png` });
    await audit(`${id}${label} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id}${label} list does not mark the last step`);
  };
  for (const [id, modes] of STAGES) for (const [btn, lid] of modes) {
    if (btn) { await p.evaluate(s => document.querySelector(s).click(), btn); await wait(200) }
    if (btn && width === 1400) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(600); if ((await p.$eval(`#${id}-p`, e => e.getAttribute('aria-label'))) !== 'Pause') problems.push(`${tag}: ${id} did not replay after ${btn}`) }
    await stepAll(id, lid, btn ? '-' + btn.replace(/\W+/g, '') : '');
  }
  // the 2D animations: one list item per step in every mode, the list follows the scrubber, the last step is reachable
  for (const [card, ctl, modes] of ANIMS) for (const [btn, lid] of modes) {
    if (btn) { await p.evaluate(s => document.querySelector(s).click(), btn); await wait(200) }
    if (await p.$eval('#' + lid, e => e.hidden)) problems.push(`${tag}: ${lid} hidden while its mode is on`);
    const n = await p.$eval(`#${ctl}-s`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length);
    if (n !== lis) problems.push(`${tag}: ${card} ${lid} has ${n} steps but ${lis} list items`);
    for (let k = 0; k < n; k++) { await p.$eval(`#${ctl}-s`, (e, k) => { e.value = k; e.dispatchEvent(new Event('input')) }, k); await wait(60) }
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${card} ${lid} does not mark the last step`);
    if (shoot) { await p.$eval(`#${ctl}-s`, (e, k) => { e.value = k; e.dispatchEvent(new Event('input')) }, Math.floor(n / 2)); await wait(1000); await (await p.$('#' + card)).screenshot({ path: `${shots}/x-${card}-${lid}-mid-${scheme}-${width}.png` }) }
    await audit(`${card} ${lid}`);
  }
  // widgets: no step list, every control once
  for (const v of [0, 1000]) { await p.$eval('#rd-rgD', (e, v) => { e.value = v; e.dispatchEvent(new Event('input')) }, v) }
  for (let v = 1; v <= 10; v++) await p.$eval('#rd-rkK', (e, v) => { e.value = v; e.dispatchEvent(new Event('input')) }, v);
  for (const a of ['weighted', 'micro', 'macro']) await p.evaluate(a => document.querySelector(`#rd-mcM button[data-a="${a}"]`).click(), a);
  await audit('end');
  if (shoot) await p.screenshot({ path: `${shots}/x-page-${scheme}-${width}.png`, fullPage: true });
  for (const t of ['t-more']) { await p.click(`#tabs button[data-t="${t}"]`); await wait(300); await audit(t, t) }
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
    const r = await p.$eval(`#${ctl}-s`, e => +e.value), pl = await p.$eval(`#${ctl}-p`, e => e.getAttribute('aria-label')); if (r !== 0 || pl !== 'Play') problems.push(`reduced motion: ${card} moved by itself (${r}, ${pl})`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
