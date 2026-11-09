// The 2026-11-06 rollout checks for Pretraining corpora (2026-11-09), adapted from Deduplication's check_stages.mjs: the two 3D stages
// (Fig. 1 the lineage on one crawl, Fig. 2 total against unique tokens) and the 2D animation of section 4 (what each corpus kept, in both
// cut modes) play by themselves once scrolled into view, step to their last step with one step-list item per step, stop redrawing off
// screen and never move under reduced motion; the lineage tree is a widget that never plays by itself and opens on its full tree; no
// errors, NaN, undefined or sideways scroll; the splits are two columns at 1400 px and one below 1100 px; the numbers in the step lists
// equal what the page computes from its own data (window.PC, window.PCS, window.PCK).
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_data_curation_and_datasets/pretraining_corpora/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = ['stg-lin', 'stg-uq'];
const TABS = ['t-read', 't-pccmp', 't-pcpick'];
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
  for (const tab of TABS) {
    if (tab !== 't-read') { await p.click(`#tabs button[data-t="${tab}"]`); await wait(300) }
    const cols = await p.$$eval(`#${tab} .s3sp`, xs => xs.map(x => getComputedStyle(x).display));
    if (width === 1400 && (!cols.length || cols.some(c => c !== 'grid'))) problems.push(`${tag} ${tab}: a split is not two columns (${cols})`);
    if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag} ${tab}: a split is two columns below 1100 px`);
    if (width === 1400) { const over = await p.$$eval(`#${tab} .s3R`, xs => xs.map(x => { const r = x.getBoundingClientRect(), k = x.firstElementChild && x.firstElementChild.getBoundingClientRect(); return k && (k.right > r.right + 1 || k.left < r.left - 1) ? x.innerHTML.slice(0, 50) : '' }).filter(Boolean));
      over.forEach(o => problems.push(`${tag} ${tab}: right-column content wider than its column: ${o}`)) }
    await audit(tab, tab);
  }
  await p.click('#tabs button[data-t="t-read"]'); await wait(300);
  // the lineage tree is a widget (39 frames): it opens on its last frame and never plays by itself
  { await p.$eval('#pl-card', e => e.scrollIntoView({ block: 'center' })); await wait(2500);
    const r = await p.$eval('#pl-card', c => [c.querySelector('.an-play').getAttribute('aria-label'), +c.querySelector('input[type=range]').value, +c.querySelector('input[type=range]').max]);
    if (r[0] !== 'Play' || r[1] !== r[2]) problems.push(`${tag}: the lineage tree moved by itself or did not open on its full tree (${r})`) }
  // autoplay on view
  for (const id of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
    if (width === 1400 || width === 390) { await wait(300); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-autoplay-tween-${scheme}-${width}.png` }) }
  }
  { await p.$eval('#pc-kp-card', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#pc-kp-card', c => c.querySelector('.an-play').getAttribute('aria-label')); if (r !== 'Pause') problems.push(`${tag}: section 4's animation did not play when scrolled into view (${r})`) }
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
    const shoot = width === 1400 || width === 390;
    for (let k = 0; k < n; k++) {
      if (k) await p.$eval(`#${id}-f`, e => e.click());
      if (shoot) {
        await wait(700); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}-midtween-${scheme}-${width}.png` });
        await wait(1800); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}-${scheme}-${width}.png` })
      } else await wait(250);
    }
    await wait(1700);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
    await audit(`${id} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id} list does not mark the last step`);
  }
  // section 4, both cut modes: one list item per step, stepping to the end, screenshots of every step
  for (const md of ['3', '2']) {
    await p.$eval(`#pc-kp-seg button[data-m="${md}"]`, e => e.click()); await wait(200);
    const lid = 'sx-kp' + md, n = await p.$eval('#pc-kp-ctl-s', e => +e.max + 1);
    const vis = await p.$$eval('#sx-kp3, #sx-kp2', xs => xs.map(x => x.hidden));
    if (vis[md === '3' ? 0 : 1] || !vis[md === '3' ? 1 : 0]) problems.push(`${tag}: kept, mode ${md}: the wrong step list is shown (${vis})`);
    const lis = await p.$eval('#' + lid, e => e.children.length); if (lis !== n) problems.push(`${tag}: kept, mode ${md}: ${n} steps but ${lis} list items`);
    await p.$eval('#pc-kp-ctl-b', e => e.click()); await p.evaluate(() => { const e = document.getElementById('pc-kp-ctl-s'); e.value = 0; e.dispatchEvent(new Event('input')) });
    await p.$eval('#pc-kp-card', e => e.scrollIntoView({ block: 'center' }));
    for (let k = 0; k < n; k++) { if (k) await p.$eval('#pc-kp-ctl-f', e => e.click()); await wait(width === 1400 ? 500 : 120);
      if ((width === 1400 || width === 390) && (md === '3' || k === 2)) await (await p.$('#pc-kp-card')).screenshot({ path: `${shots}/x-kept${md}-s${k + 1}-${scheme}-${width}.png` }) }
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: kept, mode ${md}: list does not mark the last step`);
    await audit(`kept mode ${md}`);
  }
  await p.$eval('#pc-kp-seg button[data-m="3"]', e => e.click());
  if (width === 1400) { // the step lists' numbers are what the page computes
    const r = await p.evaluate(() => { const out = [], li = (lid, k) => document.getElementById(lid).children[k].textContent.replace(/\s+/g, ' ');
      const need = (lid, k, x) => { if (!li(lid, k).includes(String(x))) out.push(`${lid} item ${k + 1} lacks "${x}"`) };
      const f = n => n.toLocaleString('en-US');
      const L = PCS.lin; L.gens.forEach((g, gi) => g.forEach(c => { need('sx-lin', gi, c.name); if (c.size) need('sx-lin', gi, c.size) }));
      need('sx-lin', 4, 'about ' + L.ratio + ' times');
      const U = PCS.uq; U.rows.forEach((r, i) => { need('sx-uq', 0, r[0] + (i ? ' (score' : ' ') ); need('sx-uq', 0, r[1].toFixed(1) + 'T'); need('sx-uq', 1, r[2].toFixed(1) + 'T of'); need('sx-uq', 1, r[1].toFixed(1) + 'T (' + U.pct[i] + '%)') });
      need('sx-uq', 1, Math.min(...U.dup) + ' to ' + Math.max(...U.dup) + '%'); need('sx-uq', 2, 'a tenth'); if (Math.abs(U.run / U.rows[0][2] - .1) > 1e-9) out.push('uq: 100B is no longer a tenth of the core');
      need('sx-uq', 3, U.copies + ' times'); need('sx-uq', 3, 'about ' + U.bigOverTotal + ' times');
      const K = PCK; for (const lid of ['sx-kp3', 'sx-kp2']) { need(lid, 0, f(K.html)); need(lid, 0, f(K.responses)); need(lid, 1, f(K.fw)); need(lid, 1, (100 * K.fw / K.html).toFixed(1) + '%');
        need(lid, 3, f(K.mine3)); need(lid, 3, f(K.mine2)); need(lid, 3, f(K.edu));
        need(lid, 4, K.nmFilesDone + ' of ' + K.nmFiles); need(lid, 4, K.nmCov); need(lid, 4, f(K.nmFound)); need(lid, 4, f(K.nmBoth) + ' of them'); need(lid, 4, 'about ' + f(K.nmEst)) }
      need('sx-kp3', 2, 'the ' + K.edu + ' the classifier'); need('sx-kp3', 2, (100 * K.edu / K.html).toFixed(2) + '%'); need('sx-kp2', 2, f(K.mine2) + ' pages'); need('sx-kp2', 2, 'about ' + Math.round(K.mine2 / K.edu) + ' times');
      if (K.steps !== 5) out.push('kept: the animation no longer has 5 steps');
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  await audit('end');
  for (const t of ['t-pccmp', 't-pcpick', 't-more']) { await p.click(`#tabs button[data-t="${t}"]`); await wait(300); await audit(t, t) }
  await p.click('#tabs button[data-t="t-read"]');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file);
  for (const id of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  { await p.$eval('#pc-kp-card', e => e.scrollIntoView({ block: 'center' })); await wait(2500);
    const r = await p.$eval('#pc-kp-card', c => [c.querySelector('.an-play').getAttribute('aria-label'), +c.querySelector('input[type=range]').value]); if (r[0] !== 'Play' || r[1] !== 0) problems.push(`reduced motion: section 4's animation moved by itself (${r})`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
