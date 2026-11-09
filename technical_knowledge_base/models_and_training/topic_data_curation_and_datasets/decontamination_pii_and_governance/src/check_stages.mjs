// The 2026-11-06 rollout checks for Decontamination, PII and data governance (2026-11-09), adapted from Data mixing's check_stages.mjs: the three 3D stages
// (Fig. 1 one real pair through the n-gram rules, Fig. 2 what each rule lifts out of the running example, Fig. 3 nearest prompts in embedding space)
// and the 2D provenance stepper (Fig. 4) play by themselves once scrolled into view, step to their last step with one step-list item per step,
// stop redrawing off screen and never move under reduced motion; no errors, NaN, undefined or sideways scroll; the splits are two columns at
// 1400 px and one below 1100 px; the numbers written in the step lists equal what the page computes from its own data (window.DG).
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_data_curation_and_datasets/decontamination_pii_and_governance/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = ['stg-ng', 'stg-fld', 'stg-emb'];
const MODES = Object.fromEntries(STAGES.map(id => [id, [null, [''], () => 'sx-' + id.slice(4)]]));
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
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (!cols.length || cols.some(c => c !== 'grid'))) problems.push(`${tag}: a split is not two columns (${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  // the figure or stage of every split stays inside the right column at 1400 px
  if (width === 1400) { const over = await p.$$eval('#t-read .s3R', xs => xs.map(x => { const r = x.getBoundingClientRect(), k = x.firstElementChild && x.firstElementChild.getBoundingClientRect(); return k && (k.right > r.right + 1 || k.left < r.left - 1) ? x.innerHTML.slice(0, 40) : '' }).filter(Boolean));
    over.forEach(o => problems.push(`${tag}: right-column content wider than its column: ${o}`)) }
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
  for (const id of STAGES) {
    const [seg, modes, lof] = MODES[id];
    for (const md of modes) {
      const lid = lof(md);
      if (seg) { await p.$eval(`${seg} button[data-m="${md}"]`, e => e.click()); await wait(200);
        const vis = await p.$$eval(`#${lof(md)} .pe-m${md}`, xs => xs.every(x => !x.hidden)), hid = await p.$$eval(`#${lof(md)} .pe-m${md === 'a' ? 's' : 'a'}`, xs => xs.every(x => x.hidden));
        if (!vis || !hid) problems.push(`${tag}: ${id} mode ${md} shows the other mode's step text`) }
      await p.$eval(`#${id}-b`, e => e.click());
      await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
      const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.hidden ? -1 : e.children.length);
      if (lis !== n) problems.push(`${tag}: ${id} mode ${md} has ${n} steps but list ${lid} shows ${lis}`);
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' }));
      const shoot = width === 1400 || width === 390;
      for (let k = 0; k < n; k++) {
        if (k) await p.$eval(`#${id}-f`, e => e.click());
        if (shoot) {
          await wait(650); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${md}-s${k + 1}-midtween-${scheme}-${width}.png` });
          await wait(1100); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${md}-s${k + 1}-${scheme}-${width}.png` })
        } else await wait(250);
      }
      await wait(1700);
      const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} mode ${md} ended on ${sh}`);
      await audit(`${id} ${md} last step`);
      for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
      const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
      if (cur !== n - 1) problems.push(`${tag}: ${id} mode ${md} list does not mark the last step`);
    }
    if (seg) { await p.$eval(`${seg} button[data-m="${modes[0]}"]`, e => e.click()); await wait(200) }
  }
  if (width === 1400) { // the step lists' numbers are what the page computes
    const r = await p.evaluate(() => { const out = [], li = (lid, k) => document.getElementById(lid).children[k].textContent.replace(/\s+/g, ' ');
      const need = (lid, k, x) => { if (!li(lid, k).includes(String(x))) out.push(`${lid} item ${k + 1} lacks "${x}"`) }, f = n => n.toLocaleString('en-GB');
      // Fig. 2: every rule's pairs and copies, web and post-training
      const sp = (k, g) => { const r = DG.rules[k + '|' + g], c = r.cats, t = r.pairs_label || r.pairs; return [t, c.copy || 0, (c.variant || 0) + (c.source || 0)] };
      const tot = g => DG.corpora.filter(c => c.group === g).reduce((s, c) => s + c.docs, 0);
      need('sx-fld', 0, f(tot('web')) + ' documents'); need('sx-fld', 0, f(tot('post')) + ' rows');
      let [t, c, gz] = sp('gpt3_13', 'web'); need('sx-fld', 1, 'on the web ' + t + ', of which ' + c + ' is a copy'); need('sx-fld', 1, gz + ' a variant');
      [t, c] = sp('gpt3_13', 'post'); need('sx-fld', 1, 'post-training ' + t + ', of which ' + c + ' are copies'); need('sx-fld', 5, c + ' of ' + t + ' flags');
      [t, c] = sp('tulu_8_50', 'web'); need('sx-fld', 2, t + ' web pairs (' + c + ' copies)'); [t, c] = sp('tulu_8_50', 'post'); need('sx-fld', 2, t + ' post-training pairs (' + c + ' copies)');
      [t, c] = sp('longest_50', 'web'); need('sx-fld', 3, t + ' web pairs (' + c + ' copies)'); [t, c] = sp('longest_50', 'post'); need('sx-fld', 3, t + ' post-training pairs (' + c + ' copies)'); need('sx-fld', 5, c + ' of ' + t + ' for the longest');
      [t, c, gz] = sp('datatrove', 'web'); need('sx-fld', 4, t + ' web documents'); if (c !== 0 || gz !== 1) out.push('datatrove web copies or sources changed'); [t, c] = sp('datatrove', 'post'); need('sx-fld', 4, t + ' post-training rows (' + c + ' copy)');
      const mxw = Math.max(...['gpt3_13', 'tulu_8_50', 'longest_50', 'datatrove'].map(k => sp(k, 'web')[1])); need('sx-fld', 5, 'more than ' + mxw + ' copies');
      // Fig. 3: the embedding counts and the judge
      const T = DG.emb.top, J = DG.gpu.judge.table, hi = T.filter(r => r.s >= .95 && !r.ng), mid = T.filter(r => r.s < .95 && !r.ng && r.lab);
      need('sx-emb', 2, T.filter(r => r.ng).length + ' copies the n-gram rules'); need('sx-emb', 2, hi.length + ' pairs they missed');
      const n = (rs, l) => rs.filter(r => (r.lab || 'unlabelled') === l).length; need('sx-emb', 2, n(hi, 'copy') + ' copies, ' + n(hi, 'variant') + ' variants');
      need('sx-emb', 3, n(mid, 'copy') + ' copy, ' + n(mid, 'variant') + ' variants and ' + n(mid, 'similar') + ' similar');
      need('sx-emb', 4, J['copy|SAME'] + ' of ' + (J['copy|SAME'] + J['copy|DIFFERENT'])); if (T.length !== 72) out.push('emb.top is no longer 72 pairs');
      // Fig. 1: the default pair's numbers (8-grams), recomputed from its tokens
      const A = DG.anim[0], g = (t, k) => { const s = new Set(); for (let i = 0; i + k <= t.length; i++) s.add(t.slice(i, i + k).join(' ')); return s }, G = g(A.doc, 8);
      let hits = 0; const m = new Array(A.item.length).fill(false); for (let i = 0; i + 8 <= A.item.length; i++) if (G.has(A.item.slice(i, i + 8).join(' '))) { hits++; for (let j = i; j < i + 8; j++) m[j] = true }
      need('sx-ng', 1, (A.item.length - 7) + ' n-grams'); need('sx-ng', 2, hits + ' of the item'); need('sx-ng', 3, Math.round(100 * m.filter(Boolean).length / A.item.length) + '%');
      need('sx-ng', 4, A.v.m13 + ' shared 13-grams');
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
    // the pair and n switches rewrite the step list and replay the stage
    for (const sel of ['#dg-ng-pair button[data-m="2"]', '#dg-ng-pair button[data-n="13"]', '#dg-ng-pair button[data-m="3"]', '#dg-ng-pair button[data-n="8"]', '#dg-ng-pair button[data-m="0"]']) {
      await p.$eval(sel, e => e.click()); await wait(300);
      const t = await p.$eval('#sx-ng', e => e.textContent); if (/NaN|undefined/.test(t)) problems.push(`${tag}: ${sel} left NaN or undefined in the step list`);
      if (sel.includes('m="2"')) { await p.$eval('#stg-ng', e => e.scrollIntoView({ block: 'center' })); await wait(2600); await (await p.$('#stg-ng')).screenshot({ path: `${shots}/x-stg-ng-phrase-${scheme}-${width}.png` }) }
    }
  }
  { // the 2D provenance stepper (Fig. 4): plays once in view, one list item per step, reaches its last step
    await p.$eval('#dg-prov', e => e.scrollIntoView({ block: 'center' })); await wait(2600);
    const pl = await p.$eval('#dg-prov .an-play', e => e.getAttribute('aria-label')); if (pl !== 'Pause') problems.push(`${tag}: dg-prov did not play when scrolled into view`);
    const n = await p.$eval('#pv-ctl-s', e => +e.max + 1), lis = await p.$eval('#sx-pv', e => e.children.length); if (n !== lis) problems.push(`${tag}: dg-prov has ${n} steps, list ${lis}`);
    if (width === 1400 || width === 390) await (await p.$('#dg-prov')).screenshot({ path: `${shots}/x-dg-prov-playing-${scheme}-${width}.png` });
    for (let k = 0; k < n; k++) await p.$eval('#pv-ctl-f', e => e.click());
    const at = await p.$eval('#pv-ctl-s', e => +e.value); if (at !== n - 1) problems.push(`${tag}: dg-prov ended at ${at}`);
    const cur = await p.$eval('#sx-pv', e => [...e.children].findIndex(li => li.classList.contains('on'))); if (cur !== n - 1) problems.push(`${tag}: sx-pv does not mark the last step`);
    if (width === 1400) { const r = await p.$eval('#dg-prov', e => e.getBoundingClientRect().height); if (r > 860) problems.push(`${tag}: dg-prov is ${Math.round(r)} px tall, more than the window`) }
    if (width === 1400 || width === 390) await (await p.$('#dg-prov')).screenshot({ path: `${shots}/x-dg-prov-last-${scheme}-${width}.png` });
  }
  await audit('end');
  for (const t of ['t-dgcc', 't-more']) { await p.click(`#tabs button[data-t="${t}"]`); await wait(300); await audit(t, t) }
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
  await p.$eval('#dg-prov', e => e.scrollIntoView({ block: 'center' })); await wait(2000);
  const fr = await p.$eval('#dg-prov', c => [c.querySelector('.an-play').getAttribute('aria-label'), +c.querySelector('input[type=range]').value]); if (fr[0] !== 'Play' || fr[1] !== 0) problems.push(`reduced motion: dg-prov moved by itself (${fr})`);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
