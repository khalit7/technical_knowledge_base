// The 2026-11-06 rollout checks for Optimisers and learning-rate schedulers (2026-11-10), adapted from Loss functions' check_stages.mjs:
// the six 3D stages (Fig. 1 momentum on the ravine, Fig. 2 per-coordinate steps and the rotated ravine, Fig. 3 optimiser state to scale,
// Fig. 4 Newton-Schulz, Fig. 5 the noisy ravine under three schedules, Fig. 6 three endpoints) play by themselves once scrolled into view,
// step to their last step with one step-list item per step, stop redrawing off screen and never move under reduced motion; the 2D widgets
// (bias correction, the race) never play by themselves; no errors, NaN, undefined or sideways scroll; splits are two columns at 1400 px and
// one below 1100 px; the numbers written in the step lists as static text (data-mo, data-ad, data-pr, data-ns, data-nz, data-en spans)
// equal what the scenes compute, and a few are recomputed here independently (from checks/race_facts.json and the raw page data). Writes mid-step shots.
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_ml_fundamentals/optimisers_and_learning_rate_schedulers/src/check_stages.mjs [shots dir]
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
const STAGES = [['stg-mom', [['', 'sx-mom']]], ['stg-ad', [['', 'sx-ad']]], ['stg-pre', [['', 'sx-pre']]], ['stg-ns', [['', 'sx-ns']]], ['stg-nz', [['', 'sx-nz']]], ['stg-en', [['', 'sx-en']]]];
const PFX = ['mo', 'ad', 'pr', 'ns', 'nz', 'en'];
const facts = JSON.parse(fs.readFileSync(path.resolve(here, 'checks/race_facts.json'), 'utf8'));
const wait = ms => new Promise(r => setTimeout(r, ms));
const problems = [];
const raw = fs.readFileSync(html, 'utf8'), staticSpans = {};
for (const m of raw.matchAll(/<span data-(mo|ad|pr|ns|nz|en)="([\w.-]+)">(.*?)<\/span>/g)) staticSpans[m[1] + ':' + m[2]] = m[3].replace(/<[^>]+>/g, '');
if (Object.keys(staticSpans).length < 70) problems.push(`only ${Object.keys(staticSpans).length} data spans found in the step lists`);
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(400);
  const tag = `${scheme} ${width}`, shoot = width === 1400 || width === 390;
  const audit = async (where, tab = 't-read') => {
    const r = await p.evaluate(tab => { const c = document.getElementById(tab).cloneNode(true); c.querySelectorAll('pre,code').forEach(x => x.remove());
      const t = c.innerText.split('oscillation, NaN, plateaus').join('');
      return { bad: (t.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } }, tab);
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (cols.length < 11 || cols.some(c => c !== 'grid'))) problems.push(`${tag}: a split is not two columns (${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  if (width === 1400) {
    const over = await p.$$eval('.tab .s3R', xs => xs.map(x => { const r = x.getBoundingClientRect(), k = x.firstElementChild && x.firstElementChild.getBoundingClientRect(); return k && r.width && (k.right > r.right + 1 || k.left < r.left - 1) ? x.innerHTML.slice(0, 40) : '' }).filter(Boolean));
    over.forEach(o => problems.push(`${tag}: right-column content wider than its column: ${o}`));
    const live = await p.evaluate(PFX => Object.fromEntries([...document.querySelectorAll(PFX.map(x => '[data-' + x + ']').join(','))].map(e => { const k = PFX.find(x => e.dataset[x] != null); return [k + ':' + e.dataset[k], e.textContent] })), PFX);
    for (const [k, v] of Object.entries(live)) if (staticSpans[k] == null) problems.push(`span ${k} missing from the static page`); else if (staticSpans[k].replace(/\^/g, '') !== v.replace(/\^/g, '')) problems.push(`span ${k}: static "${staticSpans[k]}" but the data gives "${v}"`);
    // independent recomputes: the race's first steps below 1e-3 and the noisy floor from checks/race_facts.json (written by checks/race_facts.mjs);
    // the Newton-Schulz ranges from NS_SV; SOAP per weight from the counting rule; the endpoint costs from the run lengths
    const r = await p.evaluate(F => { const out = [], q = s => document.querySelector(s).textContent;
      if (+q('[data-mo="mf"]') !== F.ravine.mom.to1e3 || +q('[data-mo="nf"]') !== F.ravine.nes.to1e3) out.push('momentum or Nesterov steps against race_facts');
      if (+q('[data-ad="agf"]') !== F.ravine.adagrad.to1e3 || +q('[data-ad="adfr"]') !== F.rotated.adam.to1e3 || +q('[data-ad="shf"]') !== F.rotated.shampoo.to1e3) out.push('Fig. 2 steps against race_facts');
      if (F.rotated.adagrad.to1e3 !== null || F.rotated.rmsprop.to1e3 !== null) out.push('race_facts: AdaGrad or RMSProp reaches 1e-3 on the rotated ravine');
      if (Math.abs(+q('[data-nz="afl"]') - F.noisy.adam.floor20) > 6e-4 || Math.abs(+q('[data-nz="acos20"]') - F.noisy.adam.cos20) > 6e-4) out.push('Fig. 5 floor or cosine against race_facts');
      let v = NS_SV.slice(); const a = 3.4445, b = -4.775, c = 2.0315; for (let i = 0; i < 5; i++) v = v.map(s => a * s + b * s ** 3 + c * s ** 5);
      if (Math.min(...v).toFixed(2) !== q('[data-ns="lo5"]') || Math.max(...v).toFixed(2) !== q('[data-ns="hi5"]')) out.push('Newton-Schulz range after five iterations');
      const m = 2048, n = 7168; if ((2 + 2 * (m * m + n * n) / (m * n)).toFixed(2) !== q('[data-pr="sp"]')) out.push('SOAP values per weight');
      if (q('[data-en="cc"]') !== '1,750' || q('[data-en="cw"]') !== '1,150') out.push('endpoint costs');
      return out }, facts);
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
        await wait(800); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${label}-s${k + 1}-midtween-${scheme}-${width}.png` });
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
  // the 2D figures are widgets the reader drives: the bias-correction widget never plays by itself and has no step list
  await p.$eval('#bc-card', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
  if ((await p.$eval('#bc-ctl-p', e => e.getAttribute('aria-label'))) !== 'Play' || (await p.$eval('#bc-ctl-s', e => +e.value)) !== 11) problems.push(`${tag}: the bias-correction widget moved by itself`);
  await audit('end');
  for (const t of ['t-race', 't-more']) { await p.click(`#tabs button[data-t="${t}"]`); await wait(300); await audit(t, t) }
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
