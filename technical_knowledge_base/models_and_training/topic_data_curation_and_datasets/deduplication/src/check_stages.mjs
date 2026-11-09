// The 2026-11-06 rollout checks for Deduplication (2026-11-09), adapted from Data mixing's check_stages.mjs: the four 3D stages
// (Fig. 1 MinHash and LSH, Fig. 2 union-find, Fig. 3 a suffix array, Fig. 4 a Bloom filter) play by themselves once scrolled into view,
// step to their last step with one step-list item per step, stop redrawing off screen and never move under reduced motion; the comparer
// is a widget that never plays by itself; no errors, NaN, undefined or sideways scroll; the splits are two columns at 1400 px and one below
// 1100 px; the numbers written in the step lists equal what the page computes from its own data (window.DP), for every MinHash pair.
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_data_curation_and_datasets/deduplication/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = ['stg-mh', 'stg-uf', 'stg-sa', 'stg-bl'];
const wait = ms => new Promise(r => setTimeout(r, ms));
const problems = [];
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(400);
  const tag = `${scheme} ${width}`;
  const audit = async (where, tab = 't-read') => {
    const r = await p.evaluate(tab => { const c = document.getElementById(tab).cloneNode(true); c.querySelectorAll('pre,code').forEach(x => x.remove());
      return { bad: (c.innerText.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } }, tab);
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  for (const tab of ['t-read', 't-cmp']) {
    if (tab !== 't-read') { await p.click(`#tabs button[data-t="${tab}"]`); await wait(300) }
    const cols = await p.$$eval(`#${tab} .s3sp`, xs => xs.map(x => getComputedStyle(x).display));
    if (width === 1400 && (!cols.length || cols.some(c => c !== 'grid'))) problems.push(`${tag} ${tab}: a split is not two columns (${cols})`);
    if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag} ${tab}: a split is two columns below 1100 px`);
    if (width === 1400) { const over = await p.$$eval(`#${tab} .s3R`, xs => xs.map(x => { const r = x.getBoundingClientRect(), k = x.firstElementChild && x.firstElementChild.getBoundingClientRect(); return k && (k.right > r.right + 1 || k.left < r.left - 1) ? x.innerHTML.slice(0, 40) : '' }).filter(Boolean));
      over.forEach(o => problems.push(`${tag} ${tab}: right-column content wider than its column: ${o}`)) }
  }
  // the comparer is a widget: it opens on its last step and never plays by itself
  { await p.$eval('#dp-cmp-card', e => e.scrollIntoView({ block: 'center' })); await wait(2500);
    const r = await p.$eval('#dp-cmp-card', c => [c.querySelector('.an-play').getAttribute('aria-label'), +c.querySelector('input[type=range]').value]);
    if (r[0] !== 'Play' || r[1] !== 4) problems.push(`${tag}: the comparer moved by itself or did not open on its result (${r})`);
    if (width === 1400 || width === 390) await (await p.$('#dp-cmp-card')).screenshot({ path: `${shots}/x-cmp-${scheme}-${width}.png` });
    await audit('t-cmp', 't-cmp'); await p.click('#tabs button[data-t="t-read"]'); await wait(300) }
  for (const id of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
    if (width === 1400 || width === 390) { await wait(300); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-autoplay-tween-${scheme}-${width}.png` }) }
  }
  // flows stop off screen
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  const pairs = ['forum', 'agilent', 'stack'];
  for (const id of STAGES) {
    const modes = id === 'stg-mh' ? pairs : [''];
    for (const md of modes) {
      const lid = 'sx-' + id.slice(4);
      if (md) { await p.$eval(`#dp-mh-pair button[data-m="${md}"]`, e => e.click()); await wait(200) }
      await p.$eval(`#${id}-b`, e => e.click());
      await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
      const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length);
      if (lis !== n) problems.push(`${tag}: ${id} ${md} has ${n} steps but list ${lid} shows ${lis}`);
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' }));
      const shoot = (width === 1400 || width === 390) && (!md || md === 'forum' || width === 1400);
      for (let k = 0; k < n; k++) {
        if (k) await p.$eval(`#${id}-f`, e => e.click());
        if (shoot) {
          await wait(650); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${md}-s${k + 1}-midtween-${scheme}-${width}.png` });
          await wait(1800); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${md}-s${k + 1}-${scheme}-${width}.png` })
        } else await wait(250);
      }
      await wait(1700);
      const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ${md} ended on ${sh}`);
      await audit(`${id} ${md} last step`);
      for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
      const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
      if (cur !== n - 1) problems.push(`${tag}: ${id} ${md} list does not mark the last step`);
      if (width === 1400) { // the step lists' numbers are what the page computes
        const r = await p.evaluate(md => { const out = [], li = (lid, k) => document.getElementById(lid).children[k].textContent.replace(/\s+/g, ' ');
          const need = (lid, k, x) => { if (!li(lid, k).includes(String(x))) out.push(`${lid} item ${k + 1} lacks "${x}"`) };
          if (md) { const q = DP.mhdemo.pairs[md], A = q.docs[0], B = q.docs[1], ne = q.eq.reduce((a, b) => a + b, 0), mb = q.bands.map((v, i) => v ? i + 1 : 0).filter(Boolean);
            need('sx-mh', 0, A.host + "'s " + A.shingles.length); need('sx-mh', 0, B.host + "'s " + B.shingles.length); need('sx-mh', 0, 'the ' + q.inter + ' they share');
            need('sx-mh', 0, (A.shingles.length - q.inter) + ' belong only to A and ' + (B.shingles.length - q.inter) + ' only to B');
            need('sx-mh', 1, q.inter + ' / ' + q.union + ' = ' + q.j.toFixed(3)); need('sx-mh', 1, DP.band.n_pairs.toLocaleString('en-GB') + ' pairs'); need('sx-mh', 1, 'only ' + DP.band.n_share.toLocaleString('en-GB'));
            need('sx-mh', 2, A.shingles[A.argmin8[0]]); if (A.shingles[A.argmin8[0]] !== B.shingles[B.argmin8[0]]) out.push(md + ': hash 1 minimums differ, the step text says they agree');
            need('sx-mh', 3, q.eq.slice(0, 8).reduce((a, b) => a + b, 0) + ' of these first 8');
            need('sx-mh', 4, ne + ' / 112 = ' + q.est.toFixed(3)); if (Math.abs(ne / 112 - q.est) > 5e-4) out.push(md + ': estimate is not equal slots / 112'); need('sx-mh', 4, Math.sqrt(q.j * (1 - q.j) / 112).toFixed(3));
            need('sx-mh', 5, mb.length === 1 ? 'only band ' + mb[0] : mb.join(', ')); need('sx-mh', 6, DPU.pct(DPU.P(q.j, 14, 8)));
            q.bands.forEach((v, b) => { const all = q.eq.slice(8 * b, 8 * b + 8).every(x => x); if (!!v !== all) out.push(md + ': band ' + (b + 1) + ' flag disagrees with its 8 slots') });
            if (md === 'forum') { if (Math.abs(DPU.P(q.j, 14, 8) - 0.185) > 5e-4) out.push('forum P(candidate) is no longer 18.5%') } }
          else { const U = DP.uf, A = U.anim[0], kept = A.members.indexOf(A.kept), jk = A.jk.filter((j, k) => k !== kept), b1 = A.ops.filter(o => o.b === 0).length;
            if (A.members.length !== 25 || A.ops.length !== 24 || b1 !== 19) out.push('union-find: the largest cluster changed (25 pages, 24 unions, 19 in band 1)');
            need('sx-uf', 0, A.hosts[kept]); const late = A.ops.slice(b1).map(o => o.b + 1); need('sx-uf', 3, '2 in band 2, 2 in band 5, 1 in band 9'); if (late.join() !== '2,2,5,5,9') out.push('union-find: late bands changed ' + late);
            const noop = Object.values(A.noop).reduce((a, b) => a + b, 0); need('sx-uf', 3, noop + ' pair records'); need('sx-uf', 3, A.n_ops + ' records');
            const mi = A.jk.reduce((b, j, k) => k !== kept && (b < 0 || j < A.jk[b]) ? k : b, -1); need('sx-uf', 5, A.jk[mi].toFixed(2) + ' (' + A.hosts[mi] + ')'); need('sx-uf', 5, U.clusters[0].j_min.toFixed(2) + ' apart');
            const back = jk.filter(j => j < 0.8).length; need('sx-uf', 6, 'The ' + back + ' pages below it come back and ' + (jk.length - back) + ' are removed'); if (U.clusters[0].chk !== jk.length - back) out.push('union-find: check count disagrees with cluster table');
            need('sx-uf', 6, U.removed_with_check08 + ' instead of ' + U.removed) }
          return out }, md);
        r.forEach(x => problems.push(`${tag}: ${x}`));
      }
    }
    if (id === 'stg-mh') { await p.$eval('#dp-mh-pair button[data-m="forum"]', e => e.click()); await wait(200) }
  }
  await audit('end');
  for (const t of ['t-cmp', 't-more']) { await p.click(`#tabs button[data-t="${t}"]`); await wait(300); await audit(t, t) }
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
