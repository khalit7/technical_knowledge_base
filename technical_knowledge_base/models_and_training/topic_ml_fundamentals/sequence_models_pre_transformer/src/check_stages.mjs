// The 2026-11-06 rollout checks for Sequence models: the pre-transformer lineage (2026-11-10), adapted from Contrastive and self-supervised
// learning's check_stages.mjs: the four 3D stages (Fig. 2 the plain RNN unrolled and BPTT, Fig. 3 one LSTM cell, Fig. 4 seq2seq and attention,
// Fig. 5 WaveNet's stacks) and the gradient animation play by themselves once scrolled into view, step to their last step with one step-list
// item per step in every mode, stop redrawing off screen and never move under reduced motion; the four-cell widget (mm) never moves by itself
// and opens on its last step; no errors, NaN, undefined or sideways scroll in any tab; splits are two columns at 1400 px and one below 1100 px;
// the numbers written in the step lists as static text (data-rn, data-gt, data-ls, data-s2, data-wv spans) equal what the scenes compute from
// the page's data, and a few are recomputed here independently. Writes mid-step screenshots.
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_ml_fundamentals/sequence_models_pre_transformer/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const html = path.resolve(here, '../index.html'), file = 'file://' + html, shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = ['stg-rnn', 'stg-lstm', 'stg-s2s', 'stg-wave'];
const ANIMS = [['gt', 'gt-ctl', [['#gt-mode [data-m="rnn"]', 'sx-gt'], ['#gt-mode [data-m="lstm"]', 'sx-gt'], ['#gt-mode [data-m="all"]', 'sx-gt']]]];
const SPANS = ['rn', 'gt', 'ls', 's2', 'wv'];
const wait = ms => new Promise(r => setTimeout(r, ms));
const problems = [];
const raw = fs.readFileSync(html, 'utf8'), staticSpans = {};
for (const m of raw.matchAll(/<span data-(rn|gt|ls|s2|wv)="(\w+)">(.*?)<\/span>/g)) staticSpans[m[1] + ':' + m[2]] = m[3].replace(/<[^>]+>/g, '').replace(/&minus;/g, '−').replace(/&asymp;/g, '≈');
if (Object.keys(staticSpans).length < 50) problems.push(`only ${Object.keys(staticSpans).length} data spans found in the step lists`);
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
  if (width === 1400 && (cols.length < 9 || cols.some(c => c !== 'grid'))) problems.push(`${tag}: a split is not two columns (${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  if (width === 1400) {
    const over = await p.$$eval('.tab:not([hidden]) .s3R', xs => xs.map(x => { const r = x.getBoundingClientRect(), k = x.firstElementChild && x.firstElementChild.getBoundingClientRect(); return k && r.width && (k.right > r.right + 1 || k.left < r.left - 1) ? x.innerHTML.slice(0, 40) : '' }).filter(Boolean));
    over.forEach(o => problems.push(`${tag}: right-column content wider than its column: ${o}`));
    const live = await p.evaluate(S => Object.fromEntries([...document.querySelectorAll(S.map(s => '[data-' + s + ']').join(','))].map(e => { const k = S.find(x => e.dataset[x] != null); return [k + ':' + e.dataset[k], e.textContent] })), SPANS);
    for (const [k, v] of Object.entries(live)) if (staticSpans[k] == null) problems.push(`span ${k} missing from the static page`); else if (staticSpans[k] !== v) problems.push(`span ${k}: static "${staticSpans[k]}" but the data gives "${v}"`);
    for (const k of Object.keys(staticSpans)) if (live[k] == null) problems.push(`static span ${k} is not written by any scene`);
    // independent recomputes from the raw data, not the scenes' code
    const r = await p.evaluate(() => { const out = [], S = SQ.mem.summ, T = S.rnn_50.gi.length, at = (k, b) => S[k + '_50'].gi[T - 1 - b];
      // the gradient factor per step, 10 to 50 steps back, straight from grad_init
      if (Math.pow(10, (at('lstm', 50) - at('lstm', 10)) / 40).toFixed(2) !== document.querySelector('[data-gt="flstm"]').textContent) out.push('LSTM factor per step');
      // the LSTM's cell update on unit 4 at the first distractor: C = f C_old + i C~, from the printed numbers (rounding allowed)
      const q = k => +document.querySelector('[data-ls="' + k + '"]').textContent.replace('−', '-');
      if (Math.abs(q('f1') * q('c0') + q('i1') * q('g1') - q('c1')) > .015) out.push('LSTM cell update does not add up');
      // the product of forget gates equals exp(sum of log f) over steps 2 to 40, from a fresh run of the cell
      const m = CELL.models.lstm, r1 = CELL.run(m, CELL.sequence(1, 40, 7)); let lf = 0; for (let t = 1; t < 40; t++) lf += Math.log(r1.tr[t].f[3]);
      if (Math.exp(lf).toFixed(2) !== q('pf').toFixed(2)) out.push('product of forget gates ' + Math.exp(lf));
      // WaveNet: 1 + (2 - 1) x sum of dilations
      if (String(1 + 1 + 2 + 4 + 8) !== document.querySelector('[data-wv="rd"]').textContent) out.push('dilated receptive field');
      // seq2seq: the counts of right digits from the stored decoded strings, recounted
      const D = window.SQ_S2S.D, X = window.SQ_S2S.X, cnt = o => o.out.slice(0, X.length).filter((y, t) => y === X[t]).length;
      if (String(cnt(D.fx)) !== document.querySelector('[data-s2="fr"]').textContent || String(cnt(D.at)) !== document.querySelector('[data-s2="ar"]').textContent) out.push('seq2seq right counts');
      // the attention weights of every output row sum to 1
      D.at.atts.forEach((w, t) => { const s = w.reduce((a, b) => a + b, 0); if (Math.abs(s - 1) > 1e-6) out.push('attention row ' + t + ' sums to ' + s) });
      // the RNN's answer is a distribution
      const pa = window.SQ_RNN.PA; if (Math.abs(pa.reduce((a, b) => a + b, 0) - 1) > 1e-9) out.push('RNN answer does not sum to 1');
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  // every stage and animation plays once scrolled into view; the widget never does and opens on its last step
  for (const id of STAGES) {
    if (!(await p.$('#' + id))) { problems.push(`${tag}: ${id} missing`); continue }
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
  }
  for (const [card, ctl] of ANIMS) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    if ((await p.$eval(`#${ctl}-p`, e => e.getAttribute('aria-label'))) !== 'Pause' && (await p.$eval(`#${ctl}-s`, e => e.value)) === '0') problems.push(`${tag}: ${card} did not play when scrolled into view`);
  }
  { await p.$eval('#mm', e => e.scrollIntoView({ block: 'center' })); await wait(800); const v0 = await p.$eval('#mm-ctl-s', e => [e.value, e.max]); await wait(1800);
    const v1 = await p.$eval('#mm-ctl-s', e => e.value); if (v0[0] !== v1) problems.push(`${tag}: widget mm moved by itself`); if (v0[0] !== v0[1]) problems.push(`${tag}: widget mm does not open on its last step`) }
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
      if (shoot) {
        await wait(650); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${label}-s${k + 1}-midtween-${scheme}-${width}.png` });
        await wait(1700); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${label}-s${k + 1}-${scheme}-${width}.png` })
      } else await wait(250);
    }
    await wait(1800);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id}${label} ended on ${sh}`);
    await audit(`${id}${label} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id}${label} list does not mark the last step`);
  };
  for (const id of STAGES) await stepAll(id, id.replace('stg-', 'sx-'), '');
  // the reader's digits: past the training lengths, and back; the stage replays and its step-list numbers follow
  for (const x of ['9876543210987654321012345', '12', '314159265358']) {
    await p.evaluate(x => { const e = document.getElementById('sa-in'); e.value = x; e.dispatchEvent(new Event('change')) }, x); await wait(150);
    const L = await p.$eval('[data-s2="L"]', e => e.textContent); if (L !== String(x.length)) problems.push(`${tag}: digits ${x}: step list says ${L} digits`);
    if (x.length === 25 && shoot) { await p.$eval('#stg-s2s', e => e.scrollIntoView({ block: 'center' })); await p.evaluate(() => document.getElementById('sx-s2s').children[4].click()); await wait(1800); await (await p.$('#stg-s2s')).screenshot({ path: `${shots}/x-stg-s2s-25digits-s5-${scheme}-${width}.png` }) }
    await audit('digits ' + x);
  }
  await p.evaluate(() => { const e = document.getElementById('sa-in'); e.value = 'abc'; e.dispatchEvent(new Event('change')) }); if (!(await p.$eval('#sa-msg', e => e.textContent))) problems.push(`${tag}: bad digits not refused`);
  await p.evaluate(() => document.getElementById('sa-rand').click()); await wait(100); await audit('random digits');
  // the gradient animation in every mode: one list item per step, last step reached
  for (const [card, ctl, modes] of ANIMS) for (const [btn, lid] of modes) {
    await p.evaluate(s => document.querySelector(s).click(), btn); await wait(200);
    const n = await p.$eval(`#${ctl}-s`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length);
    if (lis !== n) problems.push(`${tag}: ${card} ${lid} has ${n} steps but ${lis} list items`);
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' }));
    for (let k = 0; k < n; k++) { if (k) await p.$eval(`#${ctl}-f`, e => e.click()); await wait(shoot && k === 3 ? 1300 : 120); if (shoot && k === 3) await (await p.$('#' + card)).screenshot({ path: `${shots}/x-${card}-${btn.replace(/\W+/g, '').slice(-4)}-s4-${scheme}-${width}.png` }) }
    if ((await p.$eval(`#${ctl}-s`, e => e.value)) !== String(n - 1)) problems.push(`${tag}: ${card} ${btn} did not reach its last step`);
    await audit(`${card} ${btn}`);
  }
  if (shoot) for (const id of ['hr', 'mm', 'mr', 'sr']) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(300); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-${scheme}-${width}.png` }) }
  for (const t of ['t-vec', 't-more']) { await p.click(`#tabs button[data-t="${t}"]`); await wait(400); await audit(t, t);
    if (t === 't-vec') { const c = await p.$$eval('#t-vec .s3sp', xs => xs.map(x => getComputedStyle(x).display)); if (width === 1400 && c.some(v => v !== 'grid')) problems.push(`${tag}: Word vectors split not two columns`) } }
  await p.click('#tabs button[data-t="t-read"]');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file);
  for (const id of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  for (const [card, ctl] of ANIMS) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(4800);
    if ((await p.$eval(`#${ctl}-s`, e => e.value)) !== '0') problems.push(`reduced motion: ${card} moved by itself`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
