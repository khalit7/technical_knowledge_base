// The 2026-11-06 rollout checks for Attention variants (2026-11-09), adapted from Vision encoders' check_stages.mjs: the seven 3D stages
// (Fig. 1 hero, Fig. 2 the cache, Fig. 3 GQA, Fig. 4 MLA with its MHA mode, Fig. 5 windows, Fig. 6 DSA, Fig. 7 sinks) play by themselves once
// scrolled into view, step to their last step with one step-list item per step, stop redrawing off screen and never move under reduced motion;
// the V4 stepper (2D, RD.anim) plays in view and has one list item per step in both modes; no errors, NaN, undefined or sideways scroll; the
// splits are two columns at 1400 px and one below 1100 px; the numbers the step lists and prose write are what the page's data gives.
// Screenshots of every step (mid-tween and settled) at 1400 light, and of the middle step at 390 dark, go to the shots dir.
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_llm_architecture/attention_variants/src/check_stages.mjs [shots dir] [--all]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const args = process.argv.slice(2), ALL = args.includes('--all');
const file = 'file://' + path.resolve(here, '../index.html'), shots = args.find(a => !a.startsWith('--')) || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = ['stg-hero', 'stg-cache', 'stg-gqa', 'stg-mla', 'stg-win', 'stg-dsa', 'stg-sink'];
const wait = ms => new Promise(r => setTimeout(r, ms));
const problems = [];
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
  const outside = await p.$$eval('section', xs => xs.filter(x => !x.closest('.tab')).map(x => x.id)); if (outside.length) problems.push(`${tag}: sections outside a tab ${outside}`);
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (!cols.length || cols.some(c => c !== 'grid'))) problems.push(`${tag}: a split is not two columns (${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  if (width === 1400) { const over = await p.$$eval('#t-read .s3R', xs => xs.map(x => { const r = x.getBoundingClientRect(), k = x.firstElementChild && x.firstElementChild.getBoundingClientRect(); return k && (k.right > r.right + 1 || k.left < r.left - 1) ? x.innerHTML.slice(0, 40) : '' }).filter(Boolean));
    over.forEach(o => problems.push(`${tag}: right-column content wider than its column: ${o}`)) }
  for (const id of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
    if (shoot) { await wait(300); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-autoplay-${scheme}-${width}.png` }) }
  }
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(800);
  // only the stages that are off screen now (the hero is on screen at scroll 0 and rightly keeps its flows moving)
  const offs = () => p.$$eval('.stg', xs => xs.map(x => { const r = x.getBoundingClientRect(); return r.bottom < 0 || r.top > innerHeight ? +x.dataset.draws || 0 : -1 }));
  const d0 = await offs(); await wait(1200); const d1 = await offs();
  if (d1.some((v, i) => v >= 0 && v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  const stepAll = async (id, lid, sfx) => {
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length);
    if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but list ${lid} shows ${lis}`);
    if (n > 8) problems.push(`${tag}: ${id} has ${n} steps, more than about 8`);
    if (await p.$eval('#' + lid, e => e.hidden)) problems.push(`${tag}: ${lid} is hidden while it drives ${id}`);
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' }));
    for (let k = 0; k < n; k++) {
      if (k) await p.$eval(`#${id}-f`, e => e.click());
      if (shoot && (ALL || width === 1400 || k === Math.floor(n / 2))) {
        await wait(650); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${sfx}-s${k + 1}-midtween-${scheme}-${width}.png` });
        await wait(2700); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${sfx}-s${k + 1}-${scheme}-${width}.png` })
      } else await wait(250);
    }
    await wait(1800);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
    await audit(`${id}${sfx} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id} list ${lid} does not mark the last step`);
  };
  for (const id of STAGES) await stepAll(id, 'sx-' + id.slice(4), '');
  // Fig. 4's other mode: standard MHA, its own list; then back to MLA
  await p.$eval('#av-mlaM button[data-v="mha"]', e => e.click()); await wait(300); await stepAll('stg-mla', 'sx-mha', '-mha');
  await p.$eval('#av-mlaM button[data-v="mla"]', e => e.click()); await wait(300);
  if ((await p.$eval('#stg-mla-r', e => +e.max + 1)) !== 7) problems.push(`${tag}: MLA mode did not restore 7 steps`);
  // the V4 stepper (2D, RD.anim): one list item per step in both modes, and it plays by itself once in view
  for (const m of ['csa', 'hca']) {
    await p.$eval(`#av-v4-mode button[data-m="${m}"]`, e => e.click()); await wait(200);
    const lid = m === 'csa' ? 'sx-v4c' : 'sx-v4h';
    const r = await p.evaluate(lid => [document.getElementById(lid).children.length, +document.getElementById('av-v4-ctl-s').max + 1, document.getElementById(lid).hidden], lid);
    if (r[0] !== r[1]) problems.push(`${tag}: V4 ${m} has ${r[1]} steps but ${r[0]} list items`); if (r[2]) problems.push(`${tag}: V4 ${m} list hidden`);
  }
  await p.$eval('#av-v4-mode button[data-m="csa"]', e => e.click());
  { await p.evaluate(() => window.scrollTo(0, 0)); await wait(300); await p.$eval('#av-v4-card', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const pl = await p.$eval('#av-v4-ctl-p', e => e.getAttribute('aria-label')); if (pl !== 'Pause') problems.push(`${tag}: V4 stepper did not play in view (${pl})`);
    if (shoot) await (await p.$('#av-v4-card')).screenshot({ path: `${shots}/x-av-v4-${scheme}-${width}.png` }); }
  if (width === 1400) { // the numbers the step lists and prose write are what the page's data gives
    const r = await p.evaluate(() => { const out = [], li = (lid, k) => document.getElementById(lid).children[k].textContent.replace(/\s+/g, ' ');
      const need = (lid, k, x) => { if (!li(lid, k).includes(String(x))) out.push(`${lid} item ${k + 1} lacks "${x}"`) };
      const fmt = v => Math.round(v).toLocaleString('en-GB'), R = id => AVL.rungs.find(r => r.id === id).groups[0];
      const l2 = R('llama2'), l31 = R('llama31'), v3 = R('dsv3'), v32 = R('dsv32'), v4 = R('dsv4');
      need('sx-hero', 0, fmt(2 * l2.nkv * l2.hd)); need('sx-hero', 1, fmt(2 * l31.nkv * l31.hd)); need('sx-hero', 2, fmt(v3.dc + v3.dr)); need('sx-hero', 4, fmt(v32.topk)); need('sx-hero', 5, fmt(v4.topk));
      need('sx-cache', 0, fmt(2 * l31.nkv * l31.hd * l31.n)); need('sx-cache', 3, String(l31.nq / l31.nkv)); need('sx-cache', 3, String(Math.round(AVL.gpu.bf16_dense_tflops / AVL.gpu.hbm_tb_s)));
      const s1 = document.getElementById('s1').textContent, nm = { mha: 'MHA', gqa8: 'GQA-8', mla_absorbed: 'absorbed MLA', mqa: 'MQA' };
      AVB.rows.filter(x => nm[x.variant]).forEach(x => { const t = nm[x.variant] + ' ' + x.ms_median.toFixed(2) + ' ms'; if (!s1.includes(t)) out.push('section 1 lacks "' + t + '"') });
      const s2 = document.getElementById('s2').textContent, L = n => AVR.runs[n].val_loss_100win.toFixed(3);
      for (const n of ['at_gqa4', 'at_gqa2', 'at_mqa', 'at_mha', 'at_mha_s1']) if (!s2.includes(L(n))) out.push('section 2 lacks the loss of ' + n + ' ' + L(n));
      need('sx-mla', 3, fmt((v3.dc + v3.dr) * v3.n * 2)); need('sx-mha', 3, fmt(2 * 128 * 128 * v3.n * 2));
      need('sx-win', 2, '90'); need('sx-win', 1, '30');
      const D = window.AVDSA; need('sx-dsa', 3, Math.round(100 * D.kept) + '%'); need('sx-dsa', 4, (D.idxR / 1e6).toFixed(1) + 'M'); need('sx-dsa', 4, (D.attR / 1e6).toFixed(2) + 'M'); need('sx-dsa', 4, (D.dense / 1e6).toFixed(1) + 'M'); need('sx-dsa', 4, Math.round(100 * (D.idxR + D.attR) / D.dense) + '%');
      const S = window.AVSINK; need('sx-sink', 0, S.tok0max.toFixed(3)); need('sx-sink', 0, S.tok0lo.toFixed(2) + ' to ' + S.tok0hi.toFixed(2)); need('sx-sink', 2, S.win.full.toFixed(2)); need('sx-sink', 2, S.win.window.toFixed(2)); need('sx-sink', 2, S.win.window_sink1.toFixed(2));
      need('sx-sink', 3, Math.round(100 * S.sinkW) + '%'); need('sx-sink', 3, 'layer ' + S.l4 + ', head ' + S.h); need('sx-sink', 4, S.full.toFixed(3)); need('sx-sink', 4, S.removed.toFixed(3));
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  await audit('end');
  for (const t of ['t-keys', 't-more']) { await p.click(`#tabs button[data-t="${t}"]`); await wait(300); await audit(t, t) }
  await p.click('#tabs button[data-t="t-read"]');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file);
  for (const id of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.$eval('#av-v4-card', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
  if ((await p.$eval('#av-v4-ctl-p', e => e.getAttribute('aria-label'))) === 'Pause') problems.push('reduced motion: the V4 stepper plays by itself');
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
