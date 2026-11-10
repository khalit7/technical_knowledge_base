// The 2026-11-06 rollout checks for Contrastive and self-supervised learning (2026-11-10), adapted from Activation functions' check_stages.mjs:
// the 3D stages (Fig. 1 hero bar field, Fig. 2 one anchor through InfoNCE, Fig. 3 two branches and six designs, Fig. 4 digits on the sphere)
// and the masking animation play by themselves once scrolled into view, step to their last step with one step-list item per step in every
// mode, stop redrawing off screen and never move under reduced motion; the triplet lab, the InfoNCE lab and the collapse lab are widgets
// (no autoplay, no step list); no errors, NaN, undefined or sideways scroll; splits are two columns at 1400 px and one below 1100 px; the
// numbers written in the step lists as static text (data-hr, data-nc, data-sp, data-mk spans) equal what the scenes compute from the page's
// data, and a few are recomputed here independently. Writes mid-step screenshots.
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_ml_fundamentals/contrastive_and_self_supervised_learning/src/check_stages.mjs [shots dir]
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
const STAGES = [['stg-hr', [['', 'sx-hr']]], ['stg-nce', [['', 'sx-nce']]], ['stg-ar', [['', 'sx-ar']]],
  ['stg-sp', [['#spM [data-k="infonce_t05"]', 'sx-sp'], ['#spM [data-k="infonce"]', 'sx-sp']]]];
const ANIMS = [['mk-card', 'mk-ctl', [['#mk-m [data-v="mae"]', 'sx-mk-mae'], ['#mk-m [data-v="ij"]', 'sx-mk-ij']]]];
const WIDGETS = ['tr-card', 'rb-card', 'cl-card'], SPANS = ['hr', 'nc', 'sp', 'mk'];
const wait = ms => new Promise(r => setTimeout(r, ms));
const problems = [];
const raw = fs.readFileSync(html, 'utf8'), staticSpans = {};
for (const m of raw.matchAll(/<span data-(hr|nc|sp|mk)="([\w.]+)">(.*?)<\/span>/g)) staticSpans[m[1] + ':' + m[2]] = m[3].replace(/<[^>]+>/g, '');
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
  if (width === 1400 && (cols.length < 7 || cols.some(c => c !== 'grid'))) problems.push(`${tag}: a split is not two columns (${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  if (width === 1400) {
    const over = await p.$$eval('.tab .s3R', xs => xs.map(x => { const r = x.getBoundingClientRect(), k = x.firstElementChild && x.firstElementChild.getBoundingClientRect(); return k && r.width && (k.right > r.right + 1 || k.left < r.left - 1) ? x.innerHTML.slice(0, 40) : '' }).filter(Boolean));
    over.forEach(o => problems.push(`${tag}: right-column content wider than its column: ${o}`));
    const live = await p.evaluate(S => Object.fromEntries([...document.querySelectorAll(S.map(s => '[data-' + s + ']').join(','))].map(e => { const k = S.find(x => e.dataset[x] != null); return [k + ':' + e.dataset[k], e.textContent] })), SPANS);
    for (const [k, v] of Object.entries(live)) if (staticSpans[k] == null) problems.push(`span ${k} missing from the static page`); else if (staticSpans[k] !== v) problems.push(`span ${k}: static "${staticSpans[k]}" but the data gives "${v}"`);
    // independent recomputes: the hero's off-diagonal mean, anchor 31's softmax share on candidate 42, the sphere's final uniformity
    const r = await p.evaluate(() => { const out = [], D = CSD.rb, N = 48, c = (m, i, j) => D.M[m][i * N + j] / 1000;
      let s = 0; for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) if (i !== j) s += c('simcse', i, j); if ((s / 56).toFixed(2) !== document.querySelector('[data-hr="sneg"]').textContent) out.push('hero negatives ' + s / 56);
      const z = [...Array(N).keys()].map(j => Math.exp(c('bert', 30, j) / .05)), Z = z.reduce((a, b) => a + b, 0); if (Math.round(100 * z[41] / Z) + '%' !== document.querySelector('[data-nc="pf05"]').textContent) out.push('softmax on 42 ' + z[41] / Z);
      if (window.CS_SP) { const u = CS_SP.unif('pos_only', CSD.sp.snap_steps.length - 1); if (!(u > -0.05)) out.push('positives-only run did not end collapsed: uniformity ' + u) }
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  // every stage and animation plays once scrolled into view; widgets never do
  for (const [id] of STAGES) {
    if (!(await p.$('#' + id))) { problems.push(`${tag}: ${id} missing`); continue }
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
  }
  for (const [card, ctl] of ANIMS) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    if ((await p.$eval(`#${ctl}-p`, e => e.getAttribute('aria-label'))) !== 'Pause' && (await p.$eval(`#${ctl}-s`, e => e.value)) === '0') problems.push(`${tag}: ${card} did not play when scrolled into view`);
  }
  for (const w of WIDGETS) {
    const ctl = await p.$(`#${w} .an-ctl`); await p.$eval('#' + w, e => e.scrollIntoView({ block: 'center' })); await wait(1200);
    if (ctl) { const v0 = await p.$eval(`#${w} .an-ctl input[type=range]`, e => e.value); await wait(1500); const v1 = await p.$eval(`#${w} .an-ctl input[type=range]`, e => e.value); if (v0 !== v1) problems.push(`${tag}: widget ${w} moved by itself`) }
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
        await wait(2400); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${label}-s${k + 1}-${scheme}-${width}.png` })
      } else await wait(250);
    }
    await wait(3200);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id}${label} ended on ${sh}`);
    await audit(`${id}${label} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id}${label} list does not mark the last step`);
  };
  for (const [id, modes] of STAGES) for (const [btn, lid] of modes) {
    if (!(await p.$('#' + id))) continue;
    if (btn) { await p.evaluate(s => document.querySelector(s).click(), btn); await wait(200) }
    // a mode switch replays the stage from step 1 (the one exception to stopping for good)
    if (btn && width === 1400) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(600); if ((await p.$eval(`#${id}-p`, e => e.getAttribute('aria-label'))) !== 'Pause') problems.push(`${tag}: ${id} did not replay after ${btn}`) }
    await stepAll(id, lid, btn ? '-' + btn.replace(/\W+/g, '').slice(-8) : '');
  }
  // the masking animation in both modes and at every ratio: one list item per step, last step reached
  for (const [card, ctl, modes] of ANIMS) for (const [btn, lid] of modes) {
    await p.evaluate(s => document.querySelector(s).click(), btn); await wait(200);
    const n = await p.$eval(`#${ctl}-s`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length);
    if (lis !== n) problems.push(`${tag}: ${card} ${lid} has ${n} steps but ${lis} list items`);
    if (await p.$eval('#' + lid, e => e.hidden)) problems.push(`${tag}: ${lid} hidden while its mode is on`);
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' }));
    for (let k = 0; k < n; k++) { if (k) await p.$eval(`#${ctl}-f`, e => e.click()); await wait(shoot && k === 2 ? 600 : 120); if (shoot && k === 2) await (await p.$('#' + card)).screenshot({ path: `${shots}/x-${card}-${lid}-s3-${scheme}-${width}.png` }) }
    if ((await p.$eval(`#${ctl}-s`, e => e.value)) !== String(n - 1)) problems.push(`${tag}: ${card} ${lid} did not reach its last step`);
    await audit(`${card} ${lid}`);
  }
  for (const r of ['0.5', '0.9', '0.75']) { await p.evaluate(r => { document.querySelector('#mk-m [data-v="mae"]').click(); document.querySelector(`#mk-r [data-v="${r}"]`).click() }, r); await wait(100); await audit('mae ' + r) }
  // the widgets: every collapse pair, the InfoNCE and triplet sliders at their ends
  const np = await p.$$eval('#cl-pair button', a => a.length);
  for (let i = 0; i < np; i++) { await p.evaluate(i => document.querySelectorAll('#cl-pair button')[i].click(), i); await wait(80);
    if ((await p.$eval('#cl-ctl-s', e => e.value)) !== '15') problems.push(`${tag}: collapse pair ${i} does not open on the last snapshot`); await audit('collapse pair ' + i) }
  if (shoot) { await p.$eval('#cl-card', e => e.scrollIntoView({ block: 'center' })); await wait(300); await (await p.$('#cl-card')).screenshot({ path: `${shots}/x-cl-card-${scheme}-${width}.png` });
    await p.$eval('#rb-card', e => e.scrollIntoView({ block: 'center' })); await wait(300); await (await p.$('#rb-card')).screenshot({ path: `${shots}/x-rb-card-${scheme}-${width}.png` });
    await p.$eval('#tr-card', e => e.scrollIntoView({ block: 'center' })); await wait(300); await (await p.$('#tr-card')).screenshot({ path: `${shots}/x-tr-card-${scheme}-${width}.png` }) }
  for (const [id, v] of [['rb-t', 0], ['rb-t', 100], ['rb-n', 2], ['tr-al', 100], ['tr-a', 48]]) { await p.evaluate((id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input')) }, id, v); await audit(id + ' ' + v) }
  await p.click('#tabs button[data-t="t-more"]'); await wait(300); await audit('t-more', 't-more');
  await p.click('#tabs button[data-t="t-read"]');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file);
  for (const [id] of STAGES) { if (!(await p.$('#' + id))) continue; await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
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
