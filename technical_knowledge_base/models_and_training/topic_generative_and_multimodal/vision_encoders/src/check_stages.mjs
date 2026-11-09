// The 2026-11-06 rollout checks for Vision encoders (2026-11-09), adapted from Latent diffusion and DiTs' check_stages.mjs:
// the five 3D stages (Fig. 1 hero, Fig. 2 pixels to tokens, Fig. 3 position table, Fig. 4 token norms, Fig. 5 contrastive loss) play by
// themselves once scrolled into view, step to their last step with one step-list item per step, stop redrawing off screen and never move
// under reduced motion; the dense-feature stepper (2D, RD.anim) plays in view and has one list item per block; no errors, NaN, undefined or
// sideways scroll; the splits are two columns at 1400 px and one below 1100 px; the numbers the step lists write are what the page's data
// gives. Screenshots of every step (mid-tween and settled) at 1400 light, and of the middle step at 390 dark, go to the shots dir.
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_generative_and_multimodal/vision_encoders/src/check_stages.mjs [shots dir] [--all]
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
const STAGES = ['stg-hero', 'stg-patch', 'stg-pos', 'stg-reg', 'stg-loss'];
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
    const r = await p.evaluate(tab => { const c = document.getElementById(tab).cloneNode(true); c.querySelectorAll('pre,code,[data-nanok]').forEach(x => x.remove());
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
  // only the stages that are off screen now (the top-of-page hero is on screen at scroll 0 and rightly keeps its flows moving)
  const offs = () => p.$$eval('.stg', xs => xs.map(x => { const r = x.getBoundingClientRect(); return r.bottom < 0 || r.top > innerHeight ? +x.dataset.draws || 0 : -1 }));
  const d0 = await offs(); await wait(1200); const d1 = await offs();
  if (d1.some((v, i) => v >= 0 && v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  for (const id of STAGES) {
    const lid = 'sx-' + id.slice(4);
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length);
    if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but list ${lid} shows ${lis}`);
    if (n > 8) problems.push(`${tag}: ${id} has ${n} steps, more than about 8`);
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' }));
    for (let k = 0; k < n; k++) {
      if (k) await p.$eval(`#${id}-f`, e => e.click());
      if (shoot && (ALL || width === 1400 || k === Math.floor(n / 2))) {
        await wait(650); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}-midtween-${scheme}-${width}.png` });
        await wait(2700); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}-${scheme}-${width}.png` })
      } else await wait(250);
    }
    await wait(3000);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
    await audit(`${id} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id} list does not mark the last step`);
  }
  // the dense-feature stepper (2D, RD.anim): one list item per block, and it plays by itself once in view
  { const r = await p.evaluate(() => [document.getElementById('sx-la').children.length, +document.getElementById('ve-la-ctl-s').max + 1]); if (r[0] !== r[1]) problems.push(`${tag}: dense stepper has ${r[1]} steps but ${r[0]} list items`);
    await p.$eval('#ve-la', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const pl = await p.$eval('#ve-la .an-play', e => e.getAttribute('aria-label')); if (pl !== 'Pause') problems.push(`${tag}: dense stepper did not play in view (${pl})`);
    if (shoot) await (await p.$('#ve-la')).screenshot({ path: `${shots}/x-ve-la-${scheme}-${width}.png` }); }
  if (width === 1400) { // the numbers the step lists write are what the page's data gives
    const r = await p.evaluate(() => { const out = [], li = (lid, k) => document.getElementById(lid).children[k].textContent.replace(/\s+/g, ' ');
      const need = (lid, k, x) => { if (!li(lid, k).includes(String(x))) out.push(`${lid} item ${k + 1} lacks "${x}"`) };
      const A = window.VE_LOSS8, f3 = v => v.toFixed(3), L = VEL.loss, PR = VE.probes.encoders, pc = v => (100 * v).toFixed(1) + '%';
      need('sx-loss', 1, f3(A.clip.diag)); need('sx-loss', 1, f3(A.clip.off)); need('sx-loss', 4, f3(A.siglip.diag)); need('sx-loss', 4, f3(-A.siglip.off));
      need('sx-loss', 3, f3(A.clip.soft)); need('sx-loss', 5, f3(A.siglip.sl)); need('sx-loss', 3, f3(L.ln8));
      if (Math.abs(A.clip.soft - L.clip_soft8_t100) > 6e-4) out.push('CLIP softmax loss on 8 pairs differs from the recorded ' + L.clip_soft8_t100);
      if (Math.abs(A.siglip.sl - L.siglip_sig8_learned) > 6e-4) out.push('SigLIP sigmoid loss on 8 pairs differs from the recorded ' + L.siglip_sig8_learned);
      const r8 = A.clip.row[7]; need('sx-loss', 2, Math.round(100 * r8[7]) + '% to its own caption and ' + Math.round(100 * Math.max(...r8)) + '%');
      const dg = A.siglip.sig.map((r, i) => r[i]), off = Math.max(...A.siglip.sig.flatMap((r, i) => r.filter((_, j) => j !== i)));
      need('sx-loss', 5, Math.min(...dg).toFixed(2) + ' to ' + Math.max(...dg).toFixed(2)); need('sx-loss', 5, off.toFixed(2));
      need('sx-hero', 3, pc(PR.siglip.linear_probe['16'].mean)); need('sx-hero', 4, pc(PR.dino_mean.linear_probe['16'].mean)); need('sx-hero', 5, pc(PR.mae_mean.linear_probe['16'].mean));
      const m = VEU.macs, g224 = m(224, 32, 768, 12, 3072, 1).total / 1e9, g448 = m(448, 32, 768, 12, 3072, 1).total / 1e9; need('sx-pos', 4, g224.toFixed(2) + ' to ' + g448.toFixed(2) + ' GMACs');
      need('sx-patch', 1, '49'); need('sx-patch', 2, '3,072'); need('sx-patch', 6, '2,500');
      const D = VE.dense, u8 = s => VEU.u8(s), g = 16, a = u8(D.enc.dino.normRatio); let mx = 0, j = 0; for (let p = 0; p < 256; p++) if (a[p] > mx) { mx = a[p]; j = p }
      need('sx-reg', 2, 'row ' + (j / g | 0) + ', column ' + (j % g)); let mr = 0; const b = u8(D.enc.dinoreg.normRatio); for (const v of b) mr = Math.max(mr, v); need('sx-reg', 3, (mr / 10).toFixed(1) + ' times');
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  await audit('end');
  for (const t of ['t-vecmp', 't-veret', 't-vecalc', 't-more']) { await p.click(`#tabs button[data-t="${t}"]`); await wait(300); await audit(t, t) }
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
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
