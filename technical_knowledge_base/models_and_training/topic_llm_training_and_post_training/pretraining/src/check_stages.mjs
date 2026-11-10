// The 2026-11-06 rollout checks for Pretraining (2026-11-10), adapted from Distillation's check_stages.mjs:
// the two 3D stages (Fig. 2 the loss per character, Fig. 3 the loss surface) and the three 2D step animations (the five objectives,
// the three runs stage by stage, the inference-aware optimum in both modes) play by themselves once scrolled into view, step to their
// last step with one step-list item per step, stop redrawing off screen and never move under reduced motion; the speedrun replay is a widget
// that never plays by itself; no errors, NaN, undefined or sideways scroll; splits are two columns at 1400 px and one below 1100 px; the numbers
// written in the step lists as static text equal what the page's scripts compute from its data, and a few are recomputed here independently.
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_llm_training_and_post_training/pretraining/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const html = path.resolve(here, '../index.html'), file = 'file://' + html, shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = [['stg-ls', 'sx-ls'], ['stg-sc', 'sx-sc']];
const ANIMS = [['ob-card', 'ob-ctl', 'sx-ob-clm'], ['rn-card', 'rn-ctl', 'sx-rn-gpt3'], ['sa-card', 'sa-ctl', 'sx-sa-chin']];
const wait = ms => new Promise(r => setTimeout(r, ms));
const problems = [];
const raw = fs.readFileSync(html, 'utf8'), staticSpans = {};
for (const m of raw.matchAll(/<span data-(ls|sc|sa)="(\w+)">(.*?)<\/span>/g)) staticSpans[m[1] + ':' + m[2]] = m[3].replace(/<[^>]+>/g, '');
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
      return { bad: (c.innerText.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } }, tab);
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (!cols.length || cols.some(c => c !== 'grid'))) problems.push(`${tag}: a split is not two columns (${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  if (width === 1400) {
    const over = await p.$$eval('.tab .s3R', xs => xs.map(x => { const r = x.getBoundingClientRect(), k = x.firstElementChild && x.firstElementChild.getBoundingClientRect(); return k && r.width && (k.right > r.right + 1 || k.left < r.left - 1) ? x.innerHTML.slice(0, 40) : '' }).filter(Boolean));
    over.forEach(o => problems.push(`${tag}: right-column content wider than its column: ${o}`));
    const live = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-ls],[data-sc],[data-sa]')].map(e => { const k = ['ls', 'sc', 'sa'].find(x => e.dataset[x] != null); return [k + ':' + e.dataset[k], e.textContent] })));
    for (const [k, v] of Object.entries(live)) if (staticSpans[k] == null) problems.push(`span ${k} missing from the static page`); else if (staticSpans[k].replace(/&amp;/g, '&').replace(/&times;/g, '×') !== v) problems.push(`span ${k}: static "${staticSpans[k]}" but the data gives "${v}"`);
    // independent recomputes: the Besiroglu optimum at Chinchilla's budget in closed form; the toy's answer-digit loss after the maths-heavy anneal; Sardana's example
    const r = await p.evaluate(() => { const out = [], E = 1.8172, A = 482.01, B = 2085.43, al = .3478, be = .3658, C = 5.76e23, a = be / (al + be), G = Math.pow(al * A / (be * B), 1 / (al + be)), N = G * Math.pow(C / 6, a);
      if ((N / 1e9).toFixed(1) !== '72.2' || (C / 6 / N / 1e12).toFixed(2) !== '1.33') out.push('Besiroglu optimum ' + N);
      const d = TOY.meta.display, h = TOY.seeds[0].heat.decay_maths; let seen = false; const v = [];
      for (let j = 1; j < d.length; j++) { if (d[j - 1] === '\n') seen = false; if (d[j] === '=') seen = true; if (/[0-9]/.test(d[j]) && seen) v.push(h[j - 1]) }
      const m = v.reduce((x, y) => x + y, 0) / v.length; if (!document.getElementById('sx-ls').textContent.includes(m.toFixed(2) + ' bits')) out.push('Fig. 2 answer loss ' + m);
      const s = PTS.sardana(PTS.FITS.hoff, 13e9, 2e12); if ((s.N / 1e9).toFixed(1) !== '7.1' || Math.round(100 * s.saving_frac) !== 16) out.push('Sardana example ' + s.N + ' ' + s.saving_frac);
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  // every stage and 2D animation plays once scrolled into view
  for (const [id] of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
    if (shoot) { await wait(300); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-autoplay-${scheme}-${width}.png` }) }
  }
  for (const [card, ctl] of ANIMS) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const lab = await p.$eval(`#${ctl}-p`, e => e.getAttribute('aria-label')); if (lab !== 'Pause') problems.push(`${tag}: ${card} did not play when scrolled into view`);
    const s1 = await p.$eval(`#${ctl}-s`, e => +e.value); await wait(4600); const s2 = await p.$eval(`#${ctl}-s`, e => +e.value);
    if (!(s2 > s1)) problems.push(`${tag}: ${card} did not advance (${s1} -> ${s2})`);
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
      if (shoot) {
        await wait(700); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${label}-s${k + 1}-midtween-${scheme}-${width}.png` });
        await wait(1200); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${label}-s${k + 1}-${scheme}-${width}.png` })
      } else await wait(250);
    }
    await wait(2000);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id}${label} ended on ${sh}`);
    await audit(`${id}${label} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id}${label} list does not mark the last step`);
  };
  for (const [id, lid] of STAGES) await stepAll(id, lid, '');
  // the 2D animations: every mode swaps its list (one item per step) and replays; step each to the end
  const anim = async (card, ctl, lid, label) => {
    const n = await p.$eval(`#${ctl}-s`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length);
    if (lis !== n) problems.push(`${tag}: ${card}${label} has ${n} steps but list ${lid} shows ${lis}`);
    if (await p.$eval('#' + lid, e => e.hidden)) problems.push(`${tag}: ${lid} hidden`);
    for (let k = 0; k < n; k++) { await p.$eval(`#${ctl}-f`, e => e.click()); await wait(120) }
    await wait(900); const v = await p.$eval(`#${ctl}-s`, e => +e.value); if (v !== n - 1) problems.push(`${tag}: ${card}${label} ended on step ${v + 1}`);
    if (shoot) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(300); await (await p.$('#' + card)).screenshot({ path: `${shots}/x-${card}${label}-last-${scheme}-${width}.png` }) }
    await audit(`${card}${label}`);
  };
  for (const m of ['mlm', 'span', 'ul2', 'fim', 'clm']) { await p.evaluate(m => document.querySelector(`#ob-mode button[data-m="${m}"]`).click(), m); await wait(150); await anim('ob-card', 'ob-ctl', 'sx-ob-' + m, '-' + m) }
  for (const m of ['olmo2', 'smol', 'gpt3']) { await p.evaluate(m => document.querySelector(`#rn-mode button[data-m="${m}"]`).click(), m); await wait(150);
    if (await p.$eval('[data-rn-src="' + m + '"]', e => e.hidden)) problems.push(`${tag}: sources for ${m} hidden`); await anim('rn-card', 'rn-ctl', 'sx-rn-' + m, '-' + m) }
  for (const m of ['sard', 'chin']) {
    await p.evaluate(m => document.querySelector(`#sa-mode button[data-m="${m}"]`).click(), m); await wait(150);
    for (const [q, f] of [['7e9', 'besi'], ['70e9', 'hoff'], ['13e9', 'hoff']]) { await p.select('#sa-q', q); await p.select('#sa-fit', f); await wait(60) }
    await anim('sa-card', 'sa-ctl', 'sx-sa-' + m, '-' + m) }
  await audit('end');
  // the speedrun replay is a widget: it never plays by itself
  await p.click('#tabs button[data-t="t-speed"]'); await wait(300); await p.$eval('#sp-card', e => e.scrollIntoView({ block: 'center' })); await wait(2500);
  if ((await p.$eval('#sp-ctl-p', e => e.getAttribute('aria-label'))) !== 'Play') problems.push(`${tag}: the speedrun replay played by itself`);
  const spc = await p.$$eval('#t-speed .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && spc.some(c => c !== 'grid')) problems.push(`${tag}: a speedrun split is not two columns`);
  await audit('t-speed', 't-speed');
  await p.click('#tabs button[data-t="t-more"]'); await wait(200); await audit('t-more', 't-more');
  await p.click('#tabs button[data-t="t-read"]');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file);
  for (const [id] of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  for (const [card, ctl] of ANIMS) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(3000);
    const r = await p.$eval(`#${ctl}-s`, e => +e.value); if (r !== 0) problems.push(`reduced motion: ${card} moved by itself (step ${r + 1})`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
