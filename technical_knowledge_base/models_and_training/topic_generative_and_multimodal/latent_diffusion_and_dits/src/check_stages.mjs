// The 2026-11-06 rollout checks for Latent diffusion and diffusion transformers (2026-11-09), adapted from Autoencoders and VAEs' check_stages.mjs:
// the eight 3D stages (Fig. 1 hero, Fig. 2 pixels against latent, Fig. 3 U-Net, Fig. 4 text in, Fig. 5 DiT, Fig. 6 MMDiT, Fig. 7 FLUX, Fig. 8 RoPE)
// play by themselves once scrolled into view, step to their last step with one step-list item per step, stop redrawing off screen and never move
// under reduced motion; no errors, NaN, undefined or sideways scroll; the splits are two columns at 1400 px and one below 1100 px; the only other
// play control (the cross-attention viewer, a widget) never plays by itself; the numbers the step lists write are what the page's data gives.
// Screenshots of every step (mid-tween and settled) at 1400 light, and of the middle step at 390 dark, go to the shots dir.
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_generative_and_multimodal/latent_diffusion_and_dits/src/check_stages.mjs [shots dir] [--all]
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
const STAGES = ['stg-hero', 'stg-lat', 'stg-unet', 'stg-xa', 'stg-dit', 'stg-mm', 'stg-flux', 'stg-rope'];
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
  // the only play control outside the stages is the cross-attention viewer, a widget the reader drives: it must not have played by itself
  const plays = await p.$$eval('.an-play', xs => xs.filter(x => !x.closest('.stg')).map(x => x.id + ':' + x.getAttribute('aria-label')));
  if (plays.some(x => !/^xa-ctl-p:Play$/.test(x))) problems.push(`${tag}: play controls outside the stages: ${plays}`);
  if (width === 1400) { // the numbers the step lists write are what the scenes compute from the page's data
    const r = await p.evaluate(() => { const out = [], li = (lid, k) => document.getElementById(lid).children[k].textContent.replace(/\s+/g, ' ');
      const need = (lid, k, x) => { if (!li(lid, k).includes(String(x))) out.push(`${lid} item ${k + 1} lacks "${x}"`) };
      const U = LDU, L = U.L, f1 = (v, d) => v.toFixed(d == null ? 1 : d), M1 = v => (v / 1e6).toLocaleString('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'M', I = v => Math.round(v).toLocaleString('en-GB');
      const sd = U.byKey.sd15, g512 = U.grid('sd15', 512)[2];
      need('sx-hero', 2, U.M(sd.params) + ' parameters'); need('sx-hero', 2, f1(g512 / 1e12, 2) + ' TFLOP per pass');
      const T = L.flops.sd15.T, k3 = L.flops.sd15.fit[3], lat = U.flops('sd15', 4096, T), pix = U.flops('sd15', 512 * 512, T);
      need('sx-lat', 2, f1(lat / 1e12, 2) + ' TFLOP on the latent'); need('sx-lat', 2, f1(pix / 1e12, 0) + ' TFLOP on a 512'); need('sx-lat', 2, Math.round(pix / lat) + ' times as much');
      need('sx-lat', 3, Math.round(100 * k3 * 4096 * 4096 / lat) + '% of the latent pass'); need('sx-lat', 3, Math.round(100 * k3 * 262144 * 262144 / pix) + '% of the pixel pass');
      const S = L.stages.sd15, sh = (n, w) => f1(100 * (w === 'p' ? S.params[n] / sd.params : S.flops[n] / S.total)) + '%';
      need('sx-unet', 5, sh('down_blocks.0', 'p') + ' of the parameters and does ' + sh('down_blocks.0', 'f')); need('sx-unet', 5, sh('up_blocks.3', 'p') + ' and ' + sh('up_blocks.3', 'f')); need('sx-unet', 5, sh('up_blocks.1', 'p') + ' and ' + sh('up_blocks.1', 'f'));
      need('sx-unet', 5, f1(S.total / 1e9) + ' GFLOP'); need('sx-unet', 3, f1(S.params['up_blocks.1'] / 1e6) + 'M');
      const c = sd.config.block_out_channels; need('sx-unet', 1, '64 × 64 × ' + c[0] + ', 32 × 32 × ' + c[1] + ', 16 × 16 × ' + I(c[2]) + ', 8 × 8 × ' + I(c[3]));
      const Ms = L.xa.g01.mass['16']; need('sx-xa', 3, 'start token takes ' + Math.round(100 * Ms.start) + '%'); need('sx-xa', 3, Math.round(100 * Ms.words) + '%, the end token and padding ' + Math.round(100 * Ms.end_and_padding) + '%');
      const D = L.stages.dit; need('sx-dit', 4, f1(D.params['blocks.0'] / 1e6) + 'M parameters and ' + f1(D.flops['blocks.0'] / 1e9) + ' GFLOP'); if (Math.abs(4 * 1024 * 1024 * 1152 / D.flops['blocks.0'] - 1 / 8) > .02) out.push('DiT attention share is not about an eighth');
      const m3 = U.byKey.sd35l, n3 = U.tokens('sd35l', 1024, 1024), t3 = L.flops.sd35l.T; need('sx-mm', 0, I(n3) + ' patch tokens'); need('sx-mm', 0, 'Text: ' + t3 + ' tokens'); need('sx-mm', 2, I(n3 + t3) + ' tokens'); need('sx-mm', 4, M1(m3.params)); need('sx-mm', 4, '64 × ' + m3.config.num_layers + ' = ' + I(64 * m3.config.num_layers));
      const fx = U.byKey.flux1, nf = U.tokens('flux1', 1024, 1024), tf = L.flops.flux1.T, dd = fx.top.transformer_blocks, ss = fx.top.single_transformer_blocks;
      need('sx-flux', 0, I(nf) + ' image tokens and ' + tf + ' T5'); need('sx-flux', 0, M1(dd) + ' parameters in all, about ' + Math.round(dd / fx.config.num_layers / 1e7) * 10 + 'M'); need('sx-flux', 1, I(nf + tf) + ' tokens');
      need('sx-flux', 3, M1(ss) + ' parameters in all, about ' + Math.round(ss / fx.config.num_single_layers / 1e6) + 'M'); if (!(ss / fx.config.num_single_layers < dd / fx.config.num_layers / 2)) out.push('single block not less than half a double block');
      const ax = fx.config.axes_dims_rope; need('sx-rope', 4, ax[0] + ' time, ' + ax[1] + ' row, ' + ax[2] + ' column'); need('sx-rope', 1, ax[1] + ' of each head\'s ' + fx.config.attention_head_dim);
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  await audit('end');
  for (const t of ['t-ldarch', 't-ldcalc', 't-more']) { await p.click(`#tabs button[data-t="${t}"]`); await wait(300); await audit(t, t) }
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
