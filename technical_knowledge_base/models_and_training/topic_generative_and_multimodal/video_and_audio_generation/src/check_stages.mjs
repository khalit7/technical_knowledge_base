// The 2026-11-06 rollout checks for Video and audio generation (2026-11-09), adapted from Latent diffusion and DiTs' check_stages.mjs:
// the five 3D stages (Fig. 1 clip to tokens, Fig. 2 attention, Fig. 3 conditioning, Fig. 4 RVQ, Fig. 5 codebook orders) play by themselves once
// scrolled into view, step to their last step with one step-list item per step, stop redrawing off screen and never move under reduced motion;
// no errors, NaN, undefined or sideways scroll; the splits are two columns at 1400 px and one below 1100 px; the only other play control (the
// measured RVQ widget) never plays by itself; the numbers the step lists write are what the page's data gives.
// Screenshots of every step (mid-tween and settled) at 1400 light, and of the middle step at 390 dark, go to the shots dir.
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_generative_and_multimodal/video_and_audio_generation/src/check_stages.mjs [shots dir] [--all]
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
const STAGES = ['stg-lat', 'stg-att', 'stg-cond', 'stg-rvq', 'stg-delay'];
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
  // the only play control outside the stages is the measured RVQ widget, which the reader drives: it must not have played by itself
  const plays = await p.$$eval('.an-play', xs => xs.filter(x => !x.closest('.stg')).map(x => x.id + ':' + x.getAttribute('aria-label')));
  if (plays.some(x => !/^va-rvq-ctl-p:Play$/.test(x))) problems.push(`${tag}: play controls outside the stages: ${plays}`);
  if (width === 1400) { // the numbers the step lists write are what the scenes compute from the page's data
    const r = await p.evaluate(() => { const out = [], li = (lid, k) => document.getElementById(lid).children[k].textContent.replace(/\s+/g, ' ');
      const need = (lid, k, x) => { if (!li(lid, k).includes(String(x))) out.push(`${lid} item ${k + 1} lacks "${x}"`) };
      const U = VAU, I = v => Math.round(v).toLocaleString('en-GB'), m = U.mById.wan13, c = U.calc(m), lx = U.mById.ltx;
      need('sx-lat', 0, m.F + ' frames of ' + m.H + ' × ' + m.W); need('sx-lat', 0, I(m.F * m.H * m.W * 3) + ' numbers');
      need('sx-lat', 1, '1 + 80 / ' + m.ct + ' = ' + c.lf + ' latent frames');
      const lat = c.lf * c.lh * c.lw * m.ch; need('sx-lat', 2, c.lh + ' × ' + c.lw); need('sx-lat', 2, c.lf + ' × ' + c.lh + ' × ' + c.lw + ' × ' + m.ch + ' latent of ' + I(lat)); need('sx-lat', 2, Math.round(m.F * m.H * m.W * 3 / lat) + ' times fewer');
      need('sx-lat', 3, c.th + ' × ' + c.tw + ' = ' + I(c.s));
      need('sx-lat', 4, c.lf + ' × ' + I(c.s) + ' = ' + I(c.N)); need('sx-lat', 4, I(c.full / 1e6) + ' million pairs'); need('sx-lat', 4, m.F + ' × ' + I(c.s) + ' = ' + I(m.F * c.s));
      const ll = 1 + (m.F - 1) / lx.ct, lh = m.H / lx.cs, lw = m.W / lx.cs; need('sx-lat', 4, ll + ' × ' + lh + ' × ' + lw + ' = ' + I(ll * lh * lw));
      need('sx-att', 1, 'all ' + I(c.N) + ' tokens'); need('sx-att', 2, I(c.s) + ' keys'); need('sx-att', 3, c.lf + ' keys');
      need('sx-att', 5, I(c.full / 1e6) + ' million'); need('sx-att', 5, I(c.fact / 1e6) + ' million'); need('sx-att', 5, (c.full / c.fact).toFixed(1) + ' times fewer');
      need('sx-cond', 0, c.lf + ' latent frames, ' + I(c.N) + ' tokens');
      const S = U.V.codecs.speech, R = S.encodec.rows, P2 = v => (100 * v).toFixed(v < .001 ? 3 : 2) + '%', f2 = v => v.toFixed(2);
      need('sx-rvq', 0, S.encodec.frames + ' frames'); need('sx-rvq', 1, 'entry ' + S.encodec.codes_first8_stage1[0]); need('sx-rvq', 1, P2(R[0].resid)); need('sx-rvq', 1, R[0].kbps + ' kbps');
      need('sx-rvq', 2, P2(R[1].resid) + ' left at ' + R[1].kbps + ' kbps'); need('sx-rvq', 3, P2(R[7].resid) + ' left at 8 codebooks, ' + R[7].kbps + ' kbps'); need('sx-rvq', 4, P2(R[31].resid) + ' at ' + R[31].kbps + ' kbps');
      need('sx-rvq', 5, f2(R[0].mel_l1) + ' with one codebook, ' + f2(R[1].mel_l1) + ' with two, ' + f2(R[7].mel_l1) + ' with eight, ' + f2(R[31].mel_l1) + ' with 32'); need('sx-rvq', 5, f2(S.opus6.mel_l1) + ' at 6 kbps and ' + f2(S.opus12.mel_l1) + ' at 12 kbps');
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  await audit('end');
  for (const t of ['t-vapatch', 't-varvq', 't-more']) { await p.click(`#tabs button[data-t="${t}"]`); await wait(300); await audit(t, t) }
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
