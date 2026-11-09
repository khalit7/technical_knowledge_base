// The 2026-11-06 rollout checks for Extraction and filtering (2026-11-09), adapted from Decontamination, PII and data governance's check_stages.mjs:
// the three 3D stages (Fig. 1 one real page through jusText, with its comparison mode; Fig. 2 six extractors and the same filters; Fig. 3 the rule
// gates) and the 2D line-level animation (Fig. 4, three modes) play by themselves once scrolled into view, step to their last step with one
// step-list item per step, stop redrawing off screen and never move under reduced motion; no errors, NaN, undefined or sideways scroll; the
// splits are two columns at 1400 px and one below 1100 px; the numbers written in the step lists equal what the page computes from window.EF.
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_data_curation_and_datasets/extraction_and_filtering/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
// stage id -> list of [mode button selector or null, step list id]
const STAGES = { 'stg-jt': [[null, 'sx-jt'], ['#ef-jt-mode button[data-m="cmp"]', 'sx-jtc']], 'stg-x6': [[null, 'sx-x6']], 'stg-gate': [[null, 'sx-gate']] };
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
  // autoplay on view
  for (const id of Object.keys(STAGES)) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2600);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
    if (shoot) await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-autoplay-${scheme}-${width}.png` });
  }
  await p.$eval('#ef-ln-card', e => e.scrollIntoView({ block: 'center' })); await wait(2200);
  if ((await p.$eval('#ef-ln-card .an-play', e => e.getAttribute('aria-label'))) !== 'Pause') problems.push(`${tag}: ef-ln-card did not play when scrolled into view`);
  // flows and timers stop off screen
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  // step every stage and mode to its end
  for (const [id, modes] of Object.entries(STAGES)) {
    for (const [sel, lid] of modes) {
      if (sel) { await p.$eval(sel, e => e.click()); await wait(250) }
      const hid = await p.$eval('#' + lid, e => e.hidden); if (hid) problems.push(`${tag}: ${id} list ${lid} hidden in its own mode`);
      await p.$eval(`#${id}-b`, e => e.click());
      await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
      const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length);
      if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but list ${lid} has ${lis}`);
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' }));
      for (let k = 0; k < n; k++) {
        if (k) await p.$eval(`#${id}-f`, e => e.click());
        if (shoot) {
          await wait(900); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${lid}-s${k + 1}-mid-${scheme}-${width}.png` });
          await wait(1900); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${lid}-s${k + 1}-${scheme}-${width}.png` })
        } else await wait(300);
      }
      await wait(2600);
      const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ${lid} ended on ${sh}`);
      await audit(`${id} ${lid} last step`);
      for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
      const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
      if (cur !== n - 1) problems.push(`${tag}: ${id} ${lid} does not mark the last step`);
    }
    if (id === 'stg-jt') { await p.$eval('#ef-jt-mode button[data-m="jt"]', e => e.click()); await wait(200) }
  }
  // the 2D line-level animation, three modes
  for (const m of ['fw', 'c4', 'rw']) {
    await p.$eval(`#ef-ln-mode button[data-m="${m}"]`, e => e.click()); await wait(200);
    const vis = await p.$$eval('ol.sx[id^="sx-ln-"]', xs => xs.filter(x => !x.hidden).map(x => x.id)); if (vis.join() !== 'sx-ln-' + m) problems.push(`${tag}: line mode ${m} shows lists ${vis}`);
    const n = await p.$eval('#ef-ln-ctl-s', e => +e.max + 1), lis = await p.$eval('#sx-ln-' + m, e => e.children.length); if (n !== lis) problems.push(`${tag}: line mode ${m} has ${n} steps, list ${lis}`);
    for (let k = 0; k < n; k++) await p.$eval('#ef-ln-ctl-f', e => e.click());
    if ((await p.$eval('#ef-ln-ctl-s', e => +e.value)) !== n - 1) problems.push(`${tag}: line mode ${m} did not reach its last step`);
    const cur = await p.$eval('#sx-ln-' + m, e => [...e.children].findIndex(li => li.classList.contains('on'))); if (cur !== n - 1) problems.push(`${tag}: sx-ln-${m} does not mark the last step`);
    if (shoot) { await p.$eval('#ef-ln-card', e => e.scrollIntoView({ block: 'center' })); await (await p.$('#ef-ln-card')).screenshot({ path: `${shots}/x-ef-ln-${m}-last-${scheme}-${width}.png` }) }
  }
  await p.$eval('#ef-ln-mode button[data-m="fw"]', e => e.click());
  if (width === 1400) { // the step lists' numbers are what the page computes
    const r = await p.evaluate(() => { const out = [], li = (lid, k) => document.getElementById(lid).children[k].textContent.replace(/\s+/g, ' ');
      const need = (lid, k, x) => { if (!li(lid, k).includes(String(x))) out.push(`${lid} item ${k + 1} lacks "${x}"`) }, f = n => Number(n).toLocaleString('en-US');
      // Fig. 1
      const J = EFS.jt, c = J.cls;
      need('sx-jt', 0, f(J.html) + ' characters of HTML'); need('sx-jt', 0, J.np + ' blocks');
      need('sx-jt', 1, c[0].good + ' good'); need('sx-jt', 1, c[0].short + ' short'); need('sx-jt', 1, c[0].bad + ' bad');
      if (JSON.stringify(c[1]) !== JSON.stringify(c[0])) out.push('pass 1 changes something now'); if (JSON.stringify(c[3]) !== JSON.stringify(c[2])) out.push('pass 3 changes something now');
      need('sx-jt', 5, c[4].good + ' blocks stay'); need('sx-jt', 5, f(J.keptChars) + ' of the blocks\' ' + f(J.allChars));
      need('sx-jtc', 0, 'The ' + J.kept[0] + ' good blocks'); if (!J.trafSame) out.push('trafilatura no longer keeps exactly jusText\'s blocks'); if (J.resExtra.join() !== '2') out.push('resiliparse extra blocks changed: ' + J.resExtra);
      // Fig. 2
      const C = EF.chain, m1 = v => (v / 1e6).toFixed(1);
      for (const [k, x] of [['wet', 'WET'], ['res', 'resiliparse'], ['traf111', 'trafilatura 1.11'], ['traf231', 'trafilatura 2.3.1'], ['readability', 'readability'], ['justext', 'jusText']]) need('sx-x6', 0, x + (k === 'justext' ? ' only ' : ' ') + f(C[k].with_text));
      need('sx-x6', 1, m1(C.wet.chars) + ' million'); need('sx-x6', 1, m1(C.traf111.chars) + ' million'); ['res', 'traf231', 'readability', 'justext'].forEach(k => need('sx-x6', 1, m1(C[k].chars)));
      ['traf111', 'traf231', 'res', 'wet', 'readability', 'justext'].forEach(k => { need('sx-x6', 2, f(C[k].english)); need('sx-x6', 3, f(C[k].kept)); need('sx-x6', 4, f(C[k].kept_in_fineweb)) });
      need('sx-x6', 4, 'without the timeout it keeps ' + f(C.traf111_dedup.kept)); need('sx-x6', 4, 'FineWeb kept ' + f(EF.pipe.run0.fineweb_kept));
      // Fig. 3
      const G = EFS.gate, s = G.surv;
      need('sx-gate', 0, f(s[0]) + ' English documents');
      for (let g = 0; g < 4; g++) { need('sx-gate', g + 1, f(G.drops[g]) + ' drop'); need('sx-gate', g + 1, f(s[g + 1])) }
      need('sx-gate', 4, f(s[0] - s[4]) + ' of the ' + f(s[0]) + ', ' + Math.round(100 * (s[0] - s[4]) / s[0]) + '%');
      for (const [k, i] of [['dup_line_frac', 1], ['top_4_gram', 1], ['duplicated_5_n_grams', 1], ['top_3_gram', 1], ['dup_line_char_frac', 1], ['top_2_gram', 1], ['gopher_below_alpha_threshold', 2], ['gopher_short_doc', 2], ['gopher_too_many_end_ellipsis', 2], ['gopher_enough_stop_words', 2], ['gopher_too_many_bullets', 2], ['too_few_sentences', 3], ['curly_bracket', 3], ['lorem_ipsum', 3], ['line_punct_ratio', 4], ['char_dup_ratio', 4], ['short_line_ratio', 4]]) need('sx-gate', i, '(' + f(G.rs[k]));
      need('sx-gate', 1, 'take ' + [6, 7, 8, 9, 10].reduce((a, n) => a + G.rs['duplicated_' + n + '_n_grams'], 0) + ' together');
      const L = G.ls; for (const k of ['gopher_too_many_bullets', 'curly_bracket', 'char_dup_ratio']) need('sx-gate', 5, L['drop:' + k].W + ' of ' + L['drop:' + k].n);
      for (const k of ['gopher_short_doc', 'gopher_enough_stop_words', 'top_2_gram', 'top_4_gram', 'gopher_too_many_end_ellipsis']) if (L['drop:' + k].W !== 0 || L['drop:' + k].n !== 28) out.push(k + ' is no longer 0 of 28');
      // Fig. 4
      const X = EF.linesEx, Ls = X.lines.filter(l => l.t), cnt = k => Ls.filter(l => l[k]).length;
      ['sx-ln-fw', 'sx-ln-c4', 'sx-ln-rw'].forEach(l => need(l, 0, Ls.length + ' lines')); need('sx-ln-fw', 1, 'The ' + cnt('c4') + ' lines'); need('sx-ln-c4', 1, cnt('c4p') + ' of ' + Ls.length + ' lines'); need('sx-ln-rw', 1, cnt('rw') + ' lines are flagged');
      need('sx-ln-rw', 2, (100 * X.rw_share).toFixed(1) + '% of its words'); if (!X.rw_drop || X.c4p_doc !== 'too_few_sentences' || X.c4_doc) out.push('the line example\'s document decisions changed');
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  await audit('end');
  for (const t of ['t-ext', 't-rules', 't-labels', 't-more']) { await p.click(`#tabs button[data-t="${t}"]`); await wait(300); await audit(t, t) }
  await p.click('#tabs button[data-t="t-read"]');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file);
  for (const id of Object.keys(STAGES)) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.$eval('#ef-ln-card', e => e.scrollIntoView({ block: 'center' })); await wait(2000);
  const fr = await p.$eval('#ef-ln-card', c => [c.querySelector('.an-play').getAttribute('aria-label'), +c.querySelector('input[type=range]').value]); if (fr[0] !== 'Play' || fr[1] !== 0) problems.push(`reduced motion: ef-ln-card moved by itself (${fr})`);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
