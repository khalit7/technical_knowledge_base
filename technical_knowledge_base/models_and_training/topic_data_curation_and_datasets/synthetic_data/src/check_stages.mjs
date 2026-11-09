// The 2026-11-06 rollout checks for Synthetic data (2026-11-09), adapted from the Post-training data sibling's check_stages.mjs: the three 3D stages
// (Fig. 1 openings, Fig. 2 one page through four rephrasing prompts, Fig. 4 the categorical collapse toy) and the 2D animation Fig. 3 (Nemotron-CC's
// pipeline) play by themselves once scrolled into view, step to their last step with one step-list item per step, stop redrawing off screen and never
// move under reduced motion; the three widgets (rewrite viewer, categorical toy, bigram toy) never play by themselves; no errors, NaN, undefined or
// sideways scroll; the splits are two columns at 1400 px and one below 1100 px; the numbers written in the step lists equal what the page computes from
// its own data (window.SY, window.SYC).
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_data_curation_and_datasets/synthetic_data/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = ['stg-op', 'stg-rw', 'stg-col'];
const ANIMS = [['sy-nm-card', 'sy-nm-ctl', 'sx-nm']];
const WIDGETS = [['re-wr', 're-wr-ctl', 1], ['sc-card', 'sc-ctl', 30], ['sy-bg-card', 'sy-bg-ctl', 10]];
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
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (!cols.length || cols.some(c => c !== 'grid'))) problems.push(`${tag}: a split is not two columns (${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  if (width === 1400) { const over = await p.$$eval('#t-read .s3R', xs => xs.map(x => { const r = x.getBoundingClientRect(), k = x.firstElementChild && x.firstElementChild.getBoundingClientRect(); return k && (k.right > r.right + 1 || k.left < r.left - 1) ? x.innerHTML.slice(0, 40) : '' }).filter(Boolean));
    over.forEach(o => problems.push(`${tag}: right-column content wider than its column: ${o}`)) }
  // every stage plays once in view
  for (const id of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
    if (shoot) { await wait(300); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-autoplay-${scheme}-${width}.png` }) }
  }
  // flows stop off screen
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
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' }));
    for (let k = 0; k < n; k++) {
      if (k) await p.$eval(`#${id}-f`, e => e.click());
      if (shoot) {
        await wait(700); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}-midtween-${scheme}-${width}.png` });
        await wait(1200); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}-${scheme}-${width}.png` })
      } else await wait(250);
    }
    await wait(1900);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
    await audit(`${id} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id} list does not mark the last step`);
  }
  // the page picker of Fig. 2 replays the stage and leaves no NaN
  if (width === 1400) {
    for (const m of ['1', '0']) { await p.$eval(`#sy-rw-doc button[data-m="${m}"]`, e => e.click()); await wait(200);
      const st = await p.$eval('#stg-rw .stg-st', e => e.textContent); if (!/^step 1 of/.test(st)) problems.push(`${tag}: page ${m} did not restart Fig. 2 (${st})`) }
    await p.$eval('#stg-rw', e => e.scrollIntoView({ block: 'center' })); await wait(2600);
    if (shoot) await (await p.$('#stg-rw')).screenshot({ path: `${shots}/x-stg-rw-page1-${scheme}-${width}.png` });
  }
  // the widgets never play by themselves and open where they should
  for (const [card, ctl, v0] of WIDGETS) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(2200);
    const r = await p.$eval('#' + card, c => [c.querySelector('.an-play').getAttribute('aria-label'), +c.querySelector('input[type=range]').value]);
    if (r[0] !== 'Play' || r[1] !== v0) problems.push(`${tag}: widget ${card} moved by itself or opened on ${r[1]} (${r})`);
    if (shoot) await (await p.$('#' + card)).screenshot({ path: `${shots}/x-${card}-widget-${scheme}-${width}.png` });
  }
  // the 2D animations
  for (const [card, ctl, lid] of ANIMS) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(2600);
    const pl = await p.$eval(`#${card} .an-play`, e => e.getAttribute('aria-label')); if (pl !== 'Pause') problems.push(`${tag}: ${card} did not play when scrolled into view`);
    if (shoot) await (await p.$('#' + card)).screenshot({ path: `${shots}/x-${card}-playing-${scheme}-${width}.png` });
    const n = await p.$eval(`#${ctl}-s`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length); if (n !== lis) problems.push(`${tag}: ${card} has ${n} steps, list ${lis}`);
    if (n > 12) problems.push(`${tag}: ${card} has ${n} steps, more than the long-replay limit`);
    for (let k = 0; k < n; k++) await p.$eval(`#${ctl}-f`, e => e.click());
    const at = await p.$eval(`#${ctl}-s`, e => +e.value); if (at !== n - 1) problems.push(`${tag}: ${card} ended at ${at}`);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on'))); if (cur !== n - 1) problems.push(`${tag}: ${lid} does not mark the last step`);
    if (shoot) { await wait(2500); await (await p.$('#' + card)).screenshot({ path: `${shots}/x-${card}-last-${scheme}-${width}.png` }) }
    await audit(`${card} last step`);
  }
  if (width === 1400) { // the step lists' numbers are what the page computes
    const r = await p.evaluate(() => { const out = [], li = (lid, k) => document.getElementById(lid).children[k].textContent.replace(/\s+/g, ' ');
      const need = (lid, k, x) => { if (!li(lid, k).includes(String(x))) out.push(`${lid} item ${k + 1} lacks "${x}"`) }, f = n => Math.round(n).toLocaleString('en-US');
      const S = {}; SY.sets.forEach(s => S[s.key] = s); const pc = x => Math.round(100 * x) + '%', pc1 = x => (100 * x).toFixed(1) + '%';
      // Fig. 1: openings of TinyStories, Cosmopedia's stories by prompt, FineWeb; near-duplicates
      const T = S.tinystories, o = T.openings_top3, t10 = Math.round(T.openings_top10_share * 1000);
      need('sx-op', 1, o[0][1] + ' start "' + o[0][0] + '" (' + pc(o[0][1] / 1000) + ')'); need('sx-op', 1, o[1][1] + ' "' + o[1][0] + '"'); need('sx-op', 1, o[2][1] + ' "' + o[2][0] + '"');
      need('sx-op', 1, 'add ' + (t10 - o[0][1] - o[1][1] - o[2][1]) + ' more'); need('sx-op', 1, pc(T.openings_top10_share) + ' of the stories share ten'); need('sx-op', 1, (1000 - t10) + ' start any other way');
      const A = SY.cosmo.avoid; need('sx-op', 2, 'of the ' + A.told[0] + ' whose'); need('sx-op', 2, A.told[1] + ' start that way (' + pc1(A.told[1] / A.told[0]) + ')');
      need('sx-op', 2, 'of the ' + A.not_told[0] + ' whose prompt does not, ' + A.not_told[1] + ' do (' + pc1(A.not_told[1] / A.not_told[0]) + ')');
      if (S.cosmo_stories.openings_top3[0][1] !== A.told[1] + A.not_told[1]) out.push('Cosmopedia stories: once-upon counts no longer add up');
      const W = S.fineweb, w10 = Math.round(W.openings_top10_share * 1000); need('sx-op', 3, '("' + W.openings_top3.map(x => x[0]).join('", "').replace(/", "([^"]*)$/, '", "$1') + '")');
      if (W.openings_top3.some(x => x[1] !== 3)) out.push('FineWeb top openings are no longer 3 pages each'); need('sx-op', 3, 'cover ' + pc1(W.openings_top10_share)); need('sx-op', 3, (1000 - w10) + ' pages begin');
      need('sx-op', 4, '(' + pc1(T.neardup_share) + ')');
      // Fig. 2: the two pages' rewrites, and the 200-page run
      const R0 = SY.rephrase_smoke, ids = [...new Set(R0.map(r => r.id))];
      ids.forEach(id => { const g = st => { const r = R0.find(x => x.id === id && x.style === st); return SYRE.stats(r.source, r.output) }, E = g('easy'), M = g('medium'), H = g('hard'), Q = g('qa');
        if (!(E.ratio < .65 && E.names < .5)) out.push('Fig. 2: Easy is no longer about half as long with most names dropped on ' + id);
        if (!(M.ratio > .95 && M.ratio < 1.2 && M.names >= .8)) out.push('Fig. 2: Medium no longer as long, keeping nearly all names, on ' + id);
        if (!(Q.copied > Math.max(E.copied, M.copied, H.copied) && Q.aw > Math.max(E.aw, M.aw, H.aw))) out.push('Fig. 2: Q/A no longer copies the most and comes back longest on ' + id);
        if (!(1 - H.copied > .85)) out.push('Fig. 2: Hard no longer rewrites almost every phrase on ' + id) });
      const ST = SY.rephrase_stats.styles, N = { easy: 'Easy', medium: 'Medium', hard: 'Hard', qa: 'Q/A' };
      Object.keys(N).forEach(s => need('sx-rw', 4, N[s] + ' ' + pc(ST[s].num_kept) + ', ' + pc(ST[s].names_kept) + ', ' + pc(ST[s].novel4)));
      // Fig. 4: the recorded categorical run and the 50-seed summary
      const C = SY.collapse_ref, rep = C.runs.replace.map(x => x.alive), m = C.alive_at_G_50_seeds;
      need('sx-col', 0, 'sees only ' + rep[0] + ' types (' + Math.round(C.expected_alive_gen0) + ' expected)'); need('sx-col', 1, 'generation 10 keeps ' + rep[10] + ' types');
      need('sx-col', 2, 'generation 30 of this run keeps ' + rep[30] + ' types'); need('sx-col', 2, 'median is ' + m.replace.median + ' (' + m.replace.min + ' to ' + m.replace.max + ')');
      if (C.runs.accumulate.some(x => x.alive !== rep[0])) out.push('accumulate no longer keeps every type of the real sample'); need('sx-col', 3, 'keeps all ' + rep[0]);
      need('sx-col', 4, 'replace ' + m.replace.median + ', accumulate ' + m.accumulate.median + ', accumulate-subsample ' + m.subsample.median); need('sx-col', 4, 'fresh real data ' + m.fresh.median);
      const js = SYC.run('replace', 1000, 1.1, 2000, 30, .1, 1, false).m.map(x => x.alive); if (js.join() !== rep.join()) out.push('the JavaScript collapse run no longer matches the recorded one');
      // Fig. 3: six steps, segment limits as published
      need('sx-nm', 2, '512 tokens for Wikipedia-style, 2,000 for Distill, 1,400 for Extract knowledge and 1,000 for Diverse QA pairs and Knowledge list');
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  await audit('end');
  for (const t of ['t-sydi', 't-more']) { await p.click(`#tabs button[data-t="${t}"]`); await wait(300); await audit(t, t) }
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
  for (const [card] of ANIMS.concat(WIDGETS)) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(2000);
    const fr = await p.$eval('#' + card, c => [c.querySelector('.an-play').getAttribute('aria-label'), +c.querySelector('input[type=range]').value]); const w0 = (WIDGETS.find(x => x[0] === card) || [0, 0, 0])[2]; if (fr[0] !== 'Play' || fr[1] !== w0) problems.push(`reduced motion: ${card} moved by itself (${fr})`) }
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
