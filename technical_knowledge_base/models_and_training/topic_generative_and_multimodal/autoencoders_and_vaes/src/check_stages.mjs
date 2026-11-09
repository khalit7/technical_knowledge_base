// The 2026-11-06 rollout checks for Autoencoders and VAEs (2026-11-09), adapted from Storage and loading's check_stages.mjs: the six 3D stages
// (Fig. 1 hourglass, Fig. 2 latent spaces, Fig. 3 reparameterisation, Fig. 4 collapse, Fig. 5 quantizers, Fig. 6 tokens per image) play by
// themselves once scrolled into view, step to their last step with one step-list item per step, stop redrawing off screen and never move under
// reduced motion; no errors, NaN, undefined or sideways scroll; the splits are two columns at 1400 px and one below 1100 px; no widget has a play
// control; the numbers the step lists write are what the scenes compute from the page's data (window.AVSC, AVSC3, AVQ_TXT, AVD, AVL), and the
// toy's numbers written in the static HTML equal what its engine computes. Screenshots of every step (mid-tween and settled) go to the shots dir.
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_generative_and_multimodal/autoencoders_and_vaes/src/check_stages.mjs [shots dir] [--all]
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
const STAGES = ['stg-hero', 'stg-lat', 'stg-rep', 'stg-col', 'stg-vq', 'stg-tok'];
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
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
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
  // nothing but the stages has a play control (the beta slider, the toggles, the calculator and the comparator are widgets)
  const plays = await p.$$eval('.an-play', xs => xs.filter(x => !x.closest('.stg')).length); if (plays) problems.push(`${tag}: ${plays} play controls outside the stages`);
  if (width === 1400) { // the numbers the step lists write are what the scenes compute
    const html = fs.readFileSync(path.resolve(here, '../index.html'), 'utf8'), avq = {}; for (const m of html.matchAll(/data-avq="([^"]+)">([^<]*)</g)) avq[m[1]] = m[2];
    const r = await p.evaluate(avq => { const out = [], li = (lid, k) => document.getElementById(lid).children[k].textContent.replace(/\s+/g, ' ');
      const need = (lid, k, x) => { if (!li(lid, k).includes(String(x))) out.push(`${lid} item ${k + 1} lacks "${x}"`) };
      const H = AVSC.hero, f1 = v => v.toFixed(1), f2 = v => v.toFixed(2);
      need('sx-hero', 2, f1(H.ae_min) + ' to ' + f1(H.ae_max)); need('sx-hero', 2, f1(H.psnr_ae16) + ' dB'); need('sx-hero', 3, f1(H.psnr_vae) + ' dB'); need('sx-hero', 4, f1(H.psnr_vq) + ' dB');
      const c = AVSC.ae16_code[0]; if (Math.min(...c) !== H.ae_min || Math.max(...c) !== H.ae_max) out.push('hero range differs from the code');
      need('sx-rep', 5, f2(AVSC3.KL) + ' nats'); if (Math.abs(AVSC3.KL - H.kl_img) > .006) out.push('Fig. 3 KL differs from make_scene_data.py');
      need('sx-rep', 0, f2(H.mu_min) + ' to ' + f2(H.mu_max));
      const PC = AVD.pc.runs; need('sx-col', 1, f2(PC.c_b1.curve[1][1]) + ' nats at step 100'); need('sx-col', 2, Math.round(PC.c_anneal.curve[1][1]) + ' nats at step 100');
      need('sx-col', 3, f2(PC.c_freebits.kl_nats) + ' nats in all'); need('sx-col', 4, String(PC.c_freebits.z_gain_nats));
      // the toy's numbers: the static page must say what the engine computes
      Object.entries(AVQ_TXT).forEach(([k, v]) => { if (!(k in avq)) out.push('toy span ' + k + ' missing'); else if (avq[k] !== String(v)) out.push(`toy span ${k}: page says ${avq[k]}, engine ${v}`) });
      need('sx-vq', 6, AVD.quant.runs.vq_plain.codes_used_test + ' codes in use');
      need('sx-lat', 3, String(AVL.runs.vae2.posterior_sigma_mean));
      const T = AVD.tok.m; need('sx-tok', 1, T.movq_fp32.numbers.toLocaleString('en-GB') + ' tokens'); need('sx-tok', 2, T.amused_fp32.numbers.toLocaleString('en-GB') + ' tokens');
      if (T.movq_fp32.latent_shape[1] !== 64 || T.amused_fp32.latent_shape[1] !== 32) out.push('tokenizer grids changed');
      return out }, avq);
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  await audit('end');
  for (const t of ['t-avtok', 't-more']) { await p.click(`#tabs button[data-t="${t}"]`); await wait(300); await audit(t, t) }
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
