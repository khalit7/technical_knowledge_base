// The 2026-11-06 rollout checks for Distillation and Small Language Models (2026-11-10), adapted from Alignment's check_stages.mjs:
// the four 3D stages (Fig. 1 soft targets, Fig. 2 forward against reverse KL, Fig. 3 whose text, Fig. 4 prune then distil) play by themselves once
// scrolled into view, step to their last step with one step-list item per step, stop redrawing off screen and never move under reduced motion;
// the prompt chips (Fig. 1) and the sliders (Fig. 2) replay their stage; the toy and small-models replays are widgets that never play by themselves;
// no errors, NaN, undefined or sideways scroll; splits are two columns at 1400 px and one below 1100 px; the numbers written in the step lists as static
// text equal what the page's scripts compute from its data, and a few of them are recomputed here independently.
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_llm_training_and_post_training/distillation_and_small_language_models/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const html = path.resolve(here, '../index.html'), file = 'file://' + html, shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = [['stg-dk', 'sx-dk'], ['stg-kl', 'sx-kl'], ['stg-fl', 'sx-fl'], ['stg-pr', 'sx-pr']];
const WIDGETS = [['t-toy', 'tw', 'twC'], ['t-small', 'sm', 'smA']];
const wait = ms => new Promise(r => setTimeout(r, ms));
const problems = [];
// the static numbers in the step lists, as written in index.html before any script runs
const raw = fs.readFileSync(html, 'utf8'), staticSpans = {};
for (const m of raw.matchAll(/<span data-(dk|kl|fl|pr)="(\w+)">(.*?)<\/span>/g)) staticSpans[m[1] + ':' + m[2]] = m[3].replace(/<[^>]+>/g, '');
if (Object.keys(staticSpans).length < 30) problems.push(`only ${Object.keys(staticSpans).length} data spans found in the step lists`);
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
  if (width === 1400) { const over = await p.$$eval('#t-read .s3R', xs => xs.map(x => { const r = x.getBoundingClientRect(), k = x.firstElementChild && x.firstElementChild.getBoundingClientRect(); return k && (k.right > r.right + 1 || k.left < r.left - 1) ? x.innerHTML.slice(0, 40) : '' }).filter(Boolean));
    over.forEach(o => problems.push(`${tag}: right-column content wider than its column: ${o}`));
    // the static step-list numbers are what the scripts write from the data
    const live = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-dk],[data-kl],[data-fl],[data-pr]')].map(e => { const k = ['dk', 'kl', 'fl', 'pr'].find(x => e.dataset[x] != null); return [k + ':' + e.dataset[k], e.textContent] })));
    for (const [k, v] of Object.entries(live)) if (staticSpans[k] == null) problems.push(`span ${k} missing from the static page`); else if (staticSpans[k].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&') !== v) problems.push(`span ${k}: static "${staticSpans[k]}" but the data gives "${v}"`);
    // independent recomputes: Minitron parameter counts, Qwen2.5 softmax at T = 1 for the capital prompt
    const r = await p.evaluate(() => { const out = [], V = 128256, pr = (L, h, m) => L * (2 * h * 4096 + 2 * h * 1024 + 3 * h * m) + 2 * V * h;
      [['t', 32, 4096, 14336, '8.03B'], ['w', 32, 3072, 9216, '4.51B'], ['d', 16, 4096, 14336, '4.54B']].forEach(([k, L, h, m, s]) => { if ((pr(L, h, m) / 1e9).toFixed(2) + 'B' !== s) out.push('param count ' + k) });
      const p = DS.logits.prompts[0]; let s = 0; p.top.forEach(a => s += Math.exp(a[1])); p.tail.forEach(bn => s += bn[1] * Math.exp(p.lo + (bn[0] + .5) * DS.logits.bw));
      const q0 = Math.exp(p.top[0][1]) / s; if ((100 * q0).toFixed(1) !== '96.9') out.push('capital top token at T = 1 is ' + (100 * q0).toFixed(2));
      const A = DS.toy.anim, sum = A.routes.student.pos.reduce((a, x) => a + x.rkl, 0); if (!document.getElementById('sx-fl').textContent.includes(sum.toFixed(1) + ' nats')) out.push('Fig. 3 total reverse KL');
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
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
    if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but list ${lid} shows ${lis}`);
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' }));
    for (let k = 0; k < n; k++) {
      if (k) await p.$eval(`#${id}-f`, e => e.click());
      if (shoot) {
        await wait(700); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${label}-s${k + 1}-midtween-${scheme}-${width}.png` });
        await wait(1500); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${label}-s${k + 1}-${scheme}-${width}.png` })
      } else await wait(250);
    }
    await wait(2600);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id}${label} ended on ${sh}`);
    await audit(`${id}${label} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id}${label} list does not mark the last step`);
  };
  for (const [id, lid] of STAGES) await stepAll(id, lid, '');
  // Fig. 1: every prompt replays from step 1 and rewrites its numbers; the temperature slider stops the stage and redraws
  const ps = await p.$$eval('#dkP button', bs => bs.length); if (ps !== 4) problems.push(`${tag}: ${ps} prompts in Fig. 1`);
  for (let i = 0; i < ps; i++) { await p.evaluate(i => document.querySelectorAll('#dkP button')[i].click(), i); await wait(150);
    const st = await p.$eval('#stg-dk .stg-st', e => e.textContent); if (!/^step 1 of 5/.test(st)) problems.push(`${tag}: prompt ${i} did not restart Fig. 1 (${st})`);
    for (const v of [-2, 0, 1, 3]) { await p.$eval('#dkT', (e, v) => { e.value = v; e.dispatchEvent(new Event('input')) }, v); await wait(60) }
    if (shoot && i === 2) { await p.$eval('#stg-dk', e => e.scrollIntoView({ block: 'center' })); await wait(600); await (await p.$('#stg-dk')).screenshot({ path: `${shots}/x-stg-dk-animal-T8-${scheme}-${width}.png` }) }
    await audit(`Fig. 1 prompt ${i}`) }
  await p.evaluate(() => document.querySelectorAll('#dkP button')[0].click());
  // Fig. 2: the sliders rerun both fits and replay
  for (const [id, v] of [['klW', .3], ['klS', 8], ['klS', 30], ['klW', .6], ['klS', 22]]) { await p.$eval('#' + id, (e, v) => { e.value = v; e.dispatchEvent(new Event('input')) }, v); await wait(120);
    const st = await p.$eval('#stg-kl .stg-st', e => e.textContent); if (!/^step 1 of 5/.test(st)) problems.push(`${tag}: ${id}=${v} did not restart Fig. 2 (${st})`) }
  await audit('Fig. 2 sliders');
  await audit('end');
  // the tab widgets never play by themselves
  for (const [t, card, ctl] of WIDGETS) { await p.click(`#tabs button[data-t="${t}"]`); await wait(300); await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(2500);
    const fr = await p.$eval('#' + card, c => c.querySelector('.an-play').getAttribute('aria-label')); if (fr !== 'Play') problems.push(`${tag}: ${card} played by itself`);
    await audit(t, t) }
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
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
