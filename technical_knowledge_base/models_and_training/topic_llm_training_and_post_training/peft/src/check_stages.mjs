// The 2026-11-06 rollout checks for Parameter-Efficient Fine-Tuning (2026-11-10), adapted from Distillation's check_stages.mjs:
// the five 3D stages (Fig. 2 LoRA on a real matrix, Fig. 3 the update's singular values, Fig. 4 which matrices, Fig. 5 memory, Fig. 8 serving many adapters)
// and the 2D DoRA figure (Fig. 7, RD.anim) play by themselves once scrolled into view, step to their last step with one step-list item per step,
// stop redrawing off screen and never move under reduced motion; the rank chips (Fig. 2) and the model and rank selects (Fig. 5) stop the stage and redraw;
// no errors, NaN, undefined or sideways scroll; splits are two columns at 1400 px and one below 1100 px; the numbers written in the step lists as static
// text equal what the page's scripts compute from its data, and a few of them are recomputed here independently.
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_llm_training_and_post_training/peft/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const html = path.resolve(here, '../index.html'), file = 'file://' + html, shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = [['stg-lora', 'sx-lora'], ['stg-sv', 'sx-sv'], ['stg-where', 'sx-where'], ['stg-mem', 'sx-mem'], ['stg-serve', 'sx-serve']];
const ANIMS = [['dr', 'drCtl', 'sx-dr']];
const SPANS = ['lo', 'sv', 'wh', 'mm', 'sv2', 'dr'];
const wait = ms => new Promise(r => setTimeout(r, ms));
const problems = [];
// the static numbers in the step lists, as written in index.html before any script runs
const raw = fs.readFileSync(html, 'utf8'), staticSpans = {};
for (const m of raw.matchAll(/<span data-(lo|sv|wh|mm|sv2|dr)="(\w+)">(.*?)<\/span>/g)) (staticSpans[m[1] + ':' + m[2]] = staticSpans[m[1] + ':' + m[2]] || new Set()).add(m[3].replace(/<[^>]+>/g, ''));
if (Object.keys(staticSpans).length < 35) problems.push(`only ${Object.keys(staticSpans).length} data spans found in the step lists`);
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
    const over = await p.$$eval('#t-read .s3R', xs => xs.map(x => { const r = x.getBoundingClientRect(), k = x.firstElementChild && x.firstElementChild.getBoundingClientRect(); return k && (k.right > r.right + 1 || k.left < r.left - 1) ? x.innerHTML.slice(0, 40) : '' }).filter(Boolean));
    over.forEach(o => problems.push(`${tag}: right-column content wider than its column: ${o}`));
    // the static step-list numbers are what the scripts write from the data (defaults: rank 16, Llama 3 8B)
    const live = await p.evaluate(sp => [...document.querySelectorAll(sp.map(s => '[data-' + s + ']').join(','))].map(e => { const k = sp.find(x => e.getAttribute('data-' + x) != null); return [k + ':' + e.getAttribute('data-' + k), e.textContent] }), SPANS);
    for (const [k, v] of live) if (!staticSpans[k]) problems.push(`span ${k} missing from the static page`); else if (![...staticSpans[k]].some(s => s.replace(/&amp;/g, '&') === v)) problems.push(`span ${k}: static "${[...staticSpans[k]]}" but the data gives "${v}"`);
    // independent recomputes from the configs and the probe
    const r = await p.evaluate(() => { const out = [], M = PF_DATA.models['Llama 3 8B'], r = 16, kv = M.KV * M.hd, L = M.L;
      const q = r * (M.d + M.H * M.hd), k = r * (M.d + kv), o = q, mlp = 3 * r * (M.d + M.ff), all = L * (q + 2 * k + o + mlp);
      if (all !== M.peft.lora_r16_all) out.push('all-linear count ' + all + ' against PEFT ' + M.peft.lora_r16_all);
      if (L * (q + k) !== 2 * M.peft.lora_r8_qv) out.push('q and v count');
      const m = PF_DATA.mem.models['Llama 3 8B'], tot = [16 * m.N, 2 * m.N + 16 * r * m.u, m.NL * PF_DATA.mem.nf4 / 8 + (m.N - m.NL) * 2 + 16 * r * m.u].map(x => (x / 1e9).toFixed(1));
      if (tot.join() !== '128.5,16.7,6.4') out.push('memory totals ' + tot);
      const m65 = PF_DATA.mem.models['LLaMA 65B'], q65 = (m65.NL * PF_DATA.mem.nf4 / 8 + (m65.N - m65.NL) * 2 + 16 * 64 * m65.u) / 1e9; if (Math.round(q65) !== 47) out.push('QLoRA 65B r64 ' + q65);
      const E = PF_DATA.show.E; if ([1, 4, 16, 64].map(x => (100 * E[x - 1]).toFixed(x <= 4 ? 1 : 0)).join() !== '2.3,7.8,23,57') out.push('energy shares');
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  for (const [id] of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
    if (shoot) { await wait(300); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-autoplay-${scheme}-${width}.png` }) }
  }
  for (const [card, ctl] of ANIMS) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const lab = await p.$eval(`#${ctl}-p`, e => e.getAttribute('aria-label')); if (lab !== 'Pause') problems.push(`${tag}: ${card} did not play when scrolled into view (${lab})`);
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
    await wait(1800);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id}${label} ended on ${sh}`);
    await audit(`${id}${label} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id}${label} list does not mark the last step`);
  };
  for (const [id, lid] of STAGES) await stepAll(id, lid, '');
  // the DoRA figure: every step, the list marks it
  for (const [card, ctl, lid] of ANIMS) {
    await p.$eval(`#${ctl}-b`, e => e.click()); await p.evaluate(c => { const e = document.getElementById(c + '-s'); e.value = 0; e.dispatchEvent(new Event('input')) }, ctl);
    const n = await p.$eval(`#${ctl}-s`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length); if (lis !== n) problems.push(`${tag}: ${card} has ${n} steps but list ${lid} shows ${lis}`);
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' }));
    for (let k = 0; k < n; k++) { if (k) await p.$eval(`#${ctl}-f`, e => e.click()); await wait(300); if (shoot) await (await p.$('#' + card)).screenshot({ path: `${shots}/x-${card}-s${k + 1}-${scheme}-${width}.png` }) }
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on'))); if (cur !== n - 1) problems.push(`${tag}: ${card} list does not mark the last step`);
    await audit(card + ' last step');
  }
  // Fig. 2: every rank redraws, stops the stage and rewrites its numbers
  for (const r of ['1', '4', '64', '16']) { await p.evaluate(r => document.querySelector(`#loraR button[data-r="${r}"]`).click(), r); await wait(120);
    const t = await p.$eval('#sx-lora [data-lo="tr"]', e => e.textContent); if (t !== (2 * +r * 576).toLocaleString('en-US')) problems.push(`${tag}: rank ${r} trainable ${t}`);
    if (shoot && r === '64') { await p.evaluate(() => document.getElementById('sx-lora').children[2].click()); await p.$eval('#stg-lora', e => e.scrollIntoView({ block: 'center' })); await wait(900); await (await p.$('#stg-lora')).screenshot({ path: `${shots}/x-stg-lora-r64-s3-${scheme}-${width}.png` }) }
    await audit('Fig. 2 rank ' + r) }
  // Fig. 5: every model and rank
  for (const m of ['Qwen3-8B', 'Mistral 7B v0.3', 'LLaMA 7B', 'LLaMA 13B', 'Qwen3-30B-A3B', 'LLaMA 65B', 'Llama 3 8B']) { await p.select('#memM', m);
    for (const r of ['1', '64', '256', '16']) { await p.select('#memR', r); await wait(40) }
    if (m === 'LLaMA 65B') { await p.select('#memR', '64'); const q = await p.$eval('#sx-mem [data-mm="qlora"]', e => e.textContent); if (q !== '47.3 GB') problems.push(`${tag}: LLaMA 65B r64 QLoRA ${q}`);
      if (shoot) for (const k of [2, 4]) { await p.evaluate(k => document.getElementById('sx-mem').children[k].click(), k); await p.$eval('#stg-mem', e => e.scrollIntoView({ block: 'center' })); await wait(1900); await (await p.$('#stg-mem')).screenshot({ path: `${shots}/x-stg-mem-65b-r64-s${k + 1}-${scheme}-${width}.png` }) }
      await p.select('#memR', '16') }
    await audit('Fig. 5 ' + m) }
  await audit('end');
  for (const t of ['t-count', 't-more']) { await p.click(`#tabs button[data-t="${t}"]`); await wait(300); await audit(t, t) }
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
    const r = await p.$eval(`#${ctl}-s`, e => e.value); if (r !== '0') problems.push(`reduced motion: ${card} moved by itself (step ${r})`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
