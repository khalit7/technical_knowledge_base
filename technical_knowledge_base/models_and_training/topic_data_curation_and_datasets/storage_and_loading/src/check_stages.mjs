// The 2026-11-06 rollout checks for Storage and loading (2026-11-09), adapted from the Post-training data sibling's check_stages.mjs: the five 3D
// stages (Fig. 1 documents to a GPU batch, Fig. 3 rows against columns, Fig. 6 packing, Fig. 7 sharding, Fig. 8 the shuffle buffer) and the 2D
// Megatron stepper (both modes) play by themselves once scrolled into view, step to their last step with one step-list item per step, stop redrawing
// off screen and never move under reduced motion; no errors, NaN, undefined or sideways scroll; the splits are two columns at 1400 px and one below
// 1100 px; the numbers written in the step lists equal what the page computes from its own data (window.SL and the scenes' window.SLSC).
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_data_curation_and_datasets/storage_and_loading/src/check_stages.mjs [shots dir] [--all]
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
const STAGES = ['stg-hero', 'stg-pq', 'stg-pack', 'stg-shard', 'stg-buf'];
const ANIMS = [['sl-meg', 'sl-meg-ctl', 'sx-meg', null], ['sl-meg', 'sl-meg-ctl', 'sx-nano', 'nano']];
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
  // every section sits inside the Reading tab, and the splits have the right shape
  const outside = await p.$$eval('section', xs => xs.filter(x => !x.closest('.tab')).map(x => x.id)); if (outside.length) problems.push(`${tag}: sections outside a tab ${outside}`);
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
      if (shoot && (ALL || width === 1400 || k === Math.floor(n / 2))) {
        await wait(650); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}-midtween-${scheme}-${width}.png` });
        await wait(1300); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}-${scheme}-${width}.png` })
      } else await wait(250);
    }
    await wait(1900);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
    await audit(`${id} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id} list does not mark the last step`);
  }
  // the 2D Megatron stepper, in both modes (the mode toggle swaps the step list and replays)
  for (const [card, ctl, lid, mode] of ANIMS) {
    if (mode) await p.$eval(`#sl-meg-seg button[data-m="${mode}"]`, e => e.click());
    await p.evaluate(() => window.scrollTo(0, 0)); await wait(300);
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(2600);
    const pl = await p.$eval(`#${card} .an-play`, e => e.getAttribute('aria-label')); if (pl !== 'Pause') problems.push(`${tag}: ${card} ${lid} did not play when scrolled into view`);
    if (shoot) { await wait(1200); await (await p.$('#' + card)).screenshot({ path: `${shots}/x-${card}-${lid}-playing-${scheme}-${width}.png` }) }
    const n = await p.$eval(`#${ctl}-s`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length), vis = await p.$eval('#' + lid, e => !e.hidden);
    if (n !== lis) problems.push(`${tag}: ${card} has ${n} steps, list ${lid} ${lis}`); if (!vis) problems.push(`${tag}: ${lid} hidden in its own mode`);
    if (n > 12) problems.push(`${tag}: ${card} has ${n} steps, more than the long-replay limit`);
    for (let k = 0; k < n; k++) { await p.$eval(`#${ctl}-f`, e => e.click()); if (ALL && shoot) { await wait(4200); await (await p.$('#' + card)).screenshot({ path: `${shots}/x-${card}-${lid}-s${k + 2}-${scheme}-${width}.png` }) } }
    const at = await p.$eval(`#${ctl}-s`, e => +e.value); if (at !== n - 1) problems.push(`${tag}: ${card} ended at ${at}`);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on'))); if (cur !== n - 1) problems.push(`${tag}: ${lid} does not mark the last step`);
    if (shoot) { await wait(1500); await (await p.$('#' + card)).screenshot({ path: `${shots}/x-${card}-${lid}-last-${scheme}-${width}.png` }) }
    await audit(`${card} ${lid} last step`);
  }
  await p.$eval('#sl-meg-seg button[data-m="meg"]', e => e.click());
  // the widgets never play by themselves and have no play control
  for (const id of ['sl-p-card', 'sl-s-card', 'sl-r-card', 'sl-pf-card', 'sl-c-card']) { const n = await p.$$eval(`#${id} .an-play`, x => x.length); if (n) problems.push(`${tag}: widget ${id} has a play control`) }
  if (width === 1400) { // the step lists' numbers are what the page computes
    const r = await p.evaluate(() => { const out = [], li = (lid, k) => document.getElementById(lid).children[k].textContent.replace(/\s+/g, ' ');
      const need = (lid, k, x) => { if (!li(lid, k).includes(String(x))) out.push(`${lid} item ${k + 1} lacks "${x}"`) }, f = n => Math.round(n).toLocaleString('en-US');
      const B = k => SL.bpt.find(r => r.what.indexOf(k) === 0).bpt.toFixed(2);
      need('sx-hero', 0, B('UTF-8')); need('sx-hero', 0, B('JSONL, unc')); need('sx-hero', 0, B('JSONL + zstd')); need('sx-hero', 0, B('Parquet'));
      need('sx-hero', 1, B('Token file, uint32')); need('sx-hero', 1, B('Token file, uint16')); need('sx-hero', 4, f(SL.resume.megatron_consumed_samples.stopped_after));
      const FW = SL.fw, cb = Object.values(FW.columns).reduce((a, c) => a + c.comp, 0), jl = SL.fmt2k.sizes.find(s => s.fmt === 'jsonl').bytes;
      need('sx-pq', 0, (jl / 1e6).toFixed(2) + ' MB'); need('sx-pq', 1, f(FW.row_groups) + ' of ' + f(FW.rows_per_group[0]) + ' to ' + f(FW.rows_per_group[2]) + ' rows');
      need('sx-pq', 2, (FW.footer_bytes / 1e6).toFixed(2) + ' MB for ' + f(FW.row_groups) + ' × ' + FW.schema.length);
      need('sx-pq', 3, (FW.columns.language_score.comp / 1e6).toFixed(2) + ' MB of the ' + (FW.file_bytes / 1e9).toFixed(2) + ' GB file, ' + (100 * FW.columns.language_score.comp / FW.file_bytes).toFixed(2) + '%');
      need('sx-pq', 4, (100 * FW.columns.text.comp / cb).toFixed(1) + '%');
      if (!document.getElementById('t-read').textContent.includes(f(FW.rows) + ' rows')) out.push('Fig. 3 note lacks the row count');
      // packing: the twelve documents from the recorded demo, the 2,000 from packing.py
      const D = SL.pack.demo, ds = D.stats, K2 = SL.pack.k2['2048'], X = SLSC.pack, pc = (x, d) => (100 * x).toFixed(d) + '%';
      need('sx-pack', 0, f(Math.min(...D.lens)) + ' to ' + f(Math.max(...D.lens))); need('sx-pack', 0, 'L = ' + f(D.L));
      if (D.lens.filter(n => n > D.L).length !== 2 || D.lens[1] <= D.L || D.lens[9] <= D.L) out.push('packing: the long documents are no longer the 2nd and 10th');
      need('sx-pack', 1, ds.pad.windows + ' windows'); need('sx-pack', 1, pc(ds.pad.pad_frac, 1) + ' of positions are padding'); if (X.padW !== ds.pad.windows) out.push('pad windows differ from packing.py');
      need('sx-pack', 1, f(K2.pad.windows) + ' windows, ' + pc(K2.pad.pad_frac, 1));
      need('sx-pack', 2, f(D.lens[1] - D.L) + ' and ' + f(D.lens[9] - D.L) + ' tokens, ' + pc(ds.trunc.tokens_lost_frac, 1)); need('sx-pack', 2, pc(K2.trunc.tokens_lost_frac, 1));
      need('sx-pack', 3, ds.concat.windows + ' windows, ' + pc(ds.concat.fill, 1) + ' real tokens, but ' + ds.concat.docs_cut + ' of the 12'); if (X.cutConcat !== ds.concat.docs_cut) out.push('concat cuts differ');
      need('sx-pack', 3, f(K2.concat.windows) + ' windows, ' + pc(K2.concat.fill, 2)); need('sx-pack', 3, f(K2.concat.docs_cut) + ' of the 2,000');
      need('sx-pack', 4, 'only the ' + ds.bfd.docs_cut + ' long'); if (X.cutBfd !== ds.bfd.docs_cut || ds.bfd.windows !== ds.concat.windows) out.push('bfd differs');
      need('sx-pack', 4, f(K2.bfd.windows) + ' windows; only the ' + f(K2.bfd.docs_cut));
      need('sx-pack', 5, ['', '', '', '', '', 'five'][X.awPieces] + ' pieces'); need('sx-pack', 5, Math.round(100 * X.awCross) + '%');
      // sharding: the dealing rule
      const S = SLSC.shard; need('sx-shard', 3, S.busy2 + ' workers read a second shard while the other ' + S.idle2); need('sx-shard', 1, '(' + ['', '', '', '', '', '', 'six'][S.r0] + ')'); need('sx-shard', 1, 'odd ' + ['', '', '', '', '', 'five'][S.r1]);
      // shuffling: measured shards per batch
      const M = k => SL.shuf.m[k].batch_distinct_mean.toFixed(1);
      need('sx-buf', 0, M('none') + ' buckets'); need('sx-buf', 1, M('hf_buf1_mbis1') + ' buckets'); need('sx-buf', 3, M('hf_buf1000_mbis1') + ' buckets');
      need('sx-buf', 4, M('hf_buf100_mbis1') + ' buckets'); need('sx-buf', 4, M('dl4_hf_buf1000_mbis1') + ' buckets'); need('sx-buf', 4, M('global'));
      need('sx-buf', 2, 'five shards'); if (1000 / SL.shuf.S !== 5) out.push('buffer is no longer five shards');
      // the Megatron stepper
      const G = SL.meg, Z = SLSC.meg; need('sx-meg', 0, f(Z.epoch) + ' tokens'); need('sx-meg', 1, G.document_index.length + ' entries for ' + G.epochs + ' epochs');
      need('sx-meg', 2, f(Z.stream) + ' tokens'); need('sx-meg', 2, f(G.seq) + ' tokens'); need('sx-meg', 2, G.num_samples + ' samples'); need('sx-meg', 2, f(G.seq + 1) + ' tokens');
      need('sx-meg', 3, 'sample ' + G.shuffle_index[0] + ' of the stream'); need('sx-meg', 3, 'sample ' + G.shuffle_index[1] + ','); need('sx-meg', 6, '(' + f(Z.tail) + ' tokens)');
      const docsOf = k => { const s = G.shuffle_index[k], e = G.sample_index[s], e2 = G.sample_index[s + 1], o = []; for (let q = e[0]; q <= e2[0]; q++) o.push(G.document_index[q]); return o };
      need('sx-meg', 3, 'document ' + docsOf(0).join(', ')); need('sx-meg', 3, 'documents ' + docsOf(1).slice(0, -1).join(', ') + ' and ' + docsOf(1).slice(-1));
      if (Z.GR.meg.flat().length !== Z.nSteps.meg || Z.GR.nano.flat().length !== Z.nSteps.nano) out.push('Megatron stretches do not cover every frame');
      need('sx-meg', 3, 'samples 1 to ' + Z.GR.meg[3].length); need('sx-meg', 4, 'Samples ' + (Z.GR.meg[3].length + 1) + ' to ' + (Z.GR.meg[3].length + Z.GR.meg[4].length));
      need('sx-nano', 2, ['', '', '', '', '', '', '', '', '', '', '', '', '', 'Thirteen'][G.nanogpt.samples] + ' windows'); need('sx-nano', 3, pc(G.nanogpt.unseen_frac, 1)); need('sx-nano', 3, pc(G.nanogpt.twice_or_more_frac, 1));
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  await audit('end');
  for (const t of ['t-fmt', 't-more']) { await p.click(`#tabs button[data-t="${t}"]`); await wait(300); await audit(t, t) }
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
  await p.$eval('#sl-meg', e => e.scrollIntoView({ block: 'center' })); await wait(2000);
  const fr = await p.$eval('#sl-meg', c => [c.querySelector('.an-play').getAttribute('aria-label'), +c.querySelector('input[type=range]').value]); if (fr[0] !== 'Play' || fr[1] !== 0) problems.push(`reduced motion: sl-meg moved by itself (${fr})`);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
