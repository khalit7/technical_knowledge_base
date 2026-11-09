// The 2026-11-06 rollout checks for Diffusion from zero (2026-11-09), adapted from Autoencoders and VAEs' check_stages.mjs: the five 3D stages
// (Fig. 1 hero, Fig. 2 schedules, Fig. 3 score field, Fig. 4 samplers, Fig. 5 guidance) and the two grouped 2D animations (the exact-score toy,
// the two-moons forward-and-back in its closed block) play by themselves once scrolled into view, step to their last step with one step-list
// item per step, stop redrawing off screen and never move under reduced motion; the widgets (the image trajectories and every other card)
// have no autoplay; no errors, NaN, undefined or sideways scroll; the splits are two columns at 1400 px and one below 1100 px; every number the
// step lists write (data-hs, data-ss spans) is what the scenes compute from the page's data and engines. Screenshots of every step go to the shots dir.
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_generative_and_multimodal/diffusion_from_zero/src/runs/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const args = process.argv.slice(2);
const file = 'file://' + path.resolve(here, '../../index.html'), shots = args.find(a => !a.startsWith('--')) || path.resolve(here, '../../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = ['stg-hero', 'stg-sched', 'stg-score', 'stg-samp', 'stg-cfg'];
const ANIMS = [['dz-toyan', 'dz-toyan-ctl', 'sx-toyan', null], ['dzm-fr-card', 'dzm-fr-ctl', 'sx-dzm-fr', 'dzm-blk']];   // card, controls, list, closed block to open
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
      const t = c.innerText.replace(/latents become NaN|NaN or black images/g, '');
      return { bad: (t.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } }, tab);
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (!cols.length || cols.some(c => c !== 'grid'))) problems.push(`${tag}: a split is not two columns (${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  if (width === 1400) { const over = await p.$$eval('#t-read .s3R', xs => xs.map(x => { const r = x.getBoundingClientRect(), k = x.firstElementChild && x.firstElementChild.getBoundingClientRect(); return k && (k.right > r.right + 1 || k.left < r.left - 1) ? x.innerHTML.slice(0, 40) : '' }).filter(Boolean));
    over.forEach(o => problems.push(`${tag}: right-column content wider than its column: ${o}`)) }
  // autoplay on view: stages (data-frames rises) and the grouped animations (their play button reads Pause, or they have moved on)
  for (const id of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
    if (shoot) { await wait(300); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-autoplay-${scheme}-${width}.png` }) }
  }
  for (const [card, ctl, list, blk] of ANIMS) {
    if (blk) await p.$eval('#' + blk, e => { e.open = true }); await wait(300);
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const st = await p.$eval('#' + ctl + '-p', e => e.textContent), i = await p.$eval('#' + ctl + '-s', e => +e.value);
    if (!/Pause/.test(st) && i === 0) problems.push(`${tag}: ${card} did not play when scrolled into view`);
  }
  // the image trajectories are a widget: they must not have moved by themselves
  { await p.$eval('#dz-traj-card', e => e.scrollIntoView({ block: 'center' })); await wait(2000);
    const r = await p.$eval('#dz-traj-ctl-s', e => +e.value), pl = await p.$eval('#dz-traj-ctl-p', e => e.textContent);
    if (r !== 5 || /Pause/.test(pl)) problems.push(`${tag}: the trajectory widget moved by itself (${r}, ${pl})`) }
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i] && i > 0)) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
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
      if (shoot && (width === 1400 || k === Math.floor(n / 2))) {
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
  for (const [card, ctl, list, blk] of ANIMS) {
    const n = await p.$eval('#' + ctl + '-s', e => +e.max + 1), lis = await p.$eval('#' + list, e => e.children.length);
    if (lis !== n) problems.push(`${tag}: ${card} has ${n} steps but list ${list} shows ${lis}`);
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' }));
    for (let k = 0; k < n; k++) { await p.evaluate((l, k) => document.getElementById(l).children[k].click(), list, k); await wait(width === 1400 ? 900 : 200);
      if (width === 1400) await (await p.$('#' + card)).screenshot({ path: `${shots}/x-${card}-s${k + 1}-${scheme}-${width}.png` }) }
    const cur = await p.$eval('#' + list, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${card} list does not mark the last step`);
    await audit(card + ' last step');
  }
  if (width === 1400) { // the numbers the step lists write are what the scenes compute from the page's data
    const r = await p.evaluate(() => { const out = [], m = v => String(v).replace('-', '−'), pc = v => (Math.round(v * 1000) / 10).toFixed(1) + '%';
      const sq = t => Math.sqrt(DZM.abar('linear', t)), p2 = v => v < .1 ? v.toPrecision(2) : v.toFixed(2), S2 = window.DZS2, S3x = window.DZS3, SM = DZSC.samp, G = DZSC.cfg;
      const want = { hs: { sq250: p2(sq(250)), sq500: p2(sq(500)), sq750: p2(sq(750)), sq1000: p2(sq(1000)), calls: (c => c.slice(0, -1).join(', ') + ' and ' + c[c.length - 1])(DZSC.hero.back.map(f => f.calls)), on: pc(DZSC.hero.on) },
        ss: { cross_linear: String(S2.cross.linear), cross_cosine: String(S2.cross.cosine), cross_scaled: String(S2.cross.scaled), sq_linear: S2.sqLast.linear.toPrecision(2), sq_cosine: S2.sqLast.cosine.toPrecision(2),
          sq_scaled: S2.sqLast.scaled.toPrecision(2), snr_last: S2.snrLast.toPrecision(2), snr_mean: S2.snrMean.toFixed(1), loss: S3x ? S3x.loss.toFixed(2) : '?', loss_mean: S3x ? S3x.mean.toFixed(2) : '?',
          on_ddim100: pc(SM.ddim100.on), on_ddpm100: pc(SM.ddpm100.on), on_ddim1: pc(SM.ddim1.on), on_ddim5: pc(SM.ddim5.on), on_ddim5cos: pc(SM.ddim5cos.on),
          lam_lin: SM.ddim5.lam.slice().reverse().map(v => m(v.toFixed(1))).join(', '), lam_cos: SM.ddim5cos.lam.slice().reverse().map(v => m(v.toFixed(1))).join(', '),
          sd_p0: G.p0.sd.toFixed(2), sd_p1: G.p1.sd.toFixed(2), sd_p4: G.p4.sd.toFixed(2), sd_i4: G.i4.sd.toFixed(2), on_i4: pc(G.i4.on) } };
      for (const a of ['hs', 'ss']) { const seen = new Set(); document.querySelectorAll('[data-' + a + ']').forEach(e => { const k = e.dataset[a]; seen.add(k);
        if (!(k in want[a])) out.push(`data-${a} ${k}: no expected value`); else if (e.textContent !== want[a][k]) out.push(`data-${a} ${k}: page says "${e.textContent}", scene computes "${want[a][k]}"`) });
        Object.keys(want[a]).forEach(k => { if (!seen.has(k)) out.push(`data-${a} ${k}: missing from the page`) }) }
      // the schedule numbers are the ones recompute.py derived (quoted elsewhere on the page)
      if (S2.cross.linear !== 259 || S2.cross.cosine !== 496 || S2.cross.scaled !== 354) out.push('schedule crossings differ from recompute.py');
      if (S2.snrMean.toFixed(1) !== String(DZ.f.mean_snr)) out.push('channel-average SNR differs from DZ.f.mean_snr');
      if (!S3x || S3x.below < 135 || S3x.below > 165) out.push('Fig. 3 example is not close to the median loss (' + (S3x && S3x.below) + ' of 300 below it)');
      if (DZMN.eps.log[DZMN.eps.log.length - 1][1].toFixed(2) !== '0.49') out.push('the toy\'s last logged training loss is not 0.49');
      // every recorded sampler share equals the measured table in the closed block (moons/sampler_ref.json, asserted by make_scene_data.mjs)
      if (DZSC.samp.ddim5.on !== .27 || DZSC.samp.ddim5cos.on !== .787 || DZSC.cfg.i4.on !== .913) out.push('scene runs differ from the measured table');
      // the guided arrow the scene draws is u + (1 + w)(c - u), the network's own guided call
      const g = window.DZS5; if (!g || Math.hypot(g.g[0] - g.gx[0], g.g[1] - g.gx[1]) > 1e-9) out.push('guided arrow is not the extrapolation');
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  await audit('end');
  await p.click('#tabs button[data-t="t-more"]'); await wait(300); await audit('t-more', 't-more'); await p.click('#tabs button[data-t="t-read"]');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file);
  for (const id of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  for (const [card, ctl, list, blk] of ANIMS) { if (blk) await p.$eval('#' + blk, e => { e.open = true }); await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const i = await p.$eval('#' + ctl + '-s', e => +e.value); if (i !== 0) problems.push(`reduced motion: ${card} moved by itself`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
