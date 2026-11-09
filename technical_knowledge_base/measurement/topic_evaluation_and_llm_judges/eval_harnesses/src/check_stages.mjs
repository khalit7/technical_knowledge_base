// The 2026-11-06 rollout checks for Eval harnesses: every 3D stage (Fig. 1 the chain of decisions, Fig. 2 the two designs, Fig. 4 the extraction rules)
// and the 2D step animation Fig. 3 (one MMLU item read three ways, RD.anim) play by themselves once scrolled into view; each stage steps to its last
// step with one step-list item per step, stops redrawing off screen and never moves under reduced motion; the GSM8K stepper (a reader-driven widget)
// opens on its scoring step and never plays by itself; no errors, NaN, undefined or sideways scroll; the splits are two columns at 1400 px and one
// below 1100 px. The numbers written in the step lists are checked against what the scenes compute from the page's data (window.HXN).
// usage (from the repo root): node technical_knowledge_base/measurement/topic_evaluation_and_llm_judges/eval_harnesses/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = [['stg-hero', 'sxl-hero'], ['stg-unit', 'sxl-unit'], ['stg-ext', 'sxl-ext']];
const wait = ms => new Promise(r => setTimeout(r, ms));
const problems = [];
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(400);
  const tag = `${scheme} ${width}`;
  const audit = async where => {
    const r = await p.evaluate(() => { const c = document.getElementById('t-read').cloneNode(true); c.querySelectorAll('pre,code').forEach(x => x.remove());
      return { bad: (c.innerText.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } });
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (cols.length < 9 || cols.some(c => c !== 'grid'))) problems.push(`${tag}: a split is not two columns (${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  // the GSM8K stepper is a widget: it opens on step 6 of 7 (scoring) and never plays by itself
  { await p.$eval('#an', e => e.scrollIntoView({ block: 'center' })); await wait(2200);
    const r = await p.evaluate(() => [document.getElementById('an-scrub').value, document.getElementById('an-play').textContent]);
    if (r[0] !== '5' || r[1] !== 'Play') problems.push(`${tag}: the GSM8K widget moved by itself or did not open on its scoring step (${r})`); }
  // Fig. 3 (RD.anim): plays once in view, its list has one item per step in every mode
  { await p.$eval('#hn-s-anim', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    if (!/Pause/.test(await p.$eval('#hn-ctl-p', e => e.textContent))) problems.push(`${tag}: Fig. 3 did not play when scrolled into view`);
    if (width === 1400 || width === 390) await (await p.$('#hn-s-anim')).screenshot({ path: `${shots}/x-hn-autoplay-${scheme}-${width}.png` });
    for (const m of ['ll', 'gen', 'txt']) { await p.click(`#hn-mode button[data-m="${m}"]`); await wait(100);
      const r = await p.evaluate(m => [document.getElementById('hn-ctl-s').max, document.getElementById('sxl-hn-' + m).children.length, ['ll', 'gen', 'txt'].filter(x => !document.getElementById('sxl-hn-' + x).hidden).join()], m);
      if (+r[0] + 1 !== r[1] || r[2] !== m) problems.push(`${tag}: Fig. 3 mode ${m}: ${+r[0] + 1} steps, list ${r[1]} items, visible list ${r[2]}`);
      await p.$eval('#hn-ctl-f', e => e.click()); await p.$eval('#hn-ctl-f', e => e.click()); await wait(200);
      const on = await p.$eval('#sxl-hn-' + m, e => [...e.children].findIndex(li => li.classList.contains('on'))); if (on !== 2) problems.push(`${tag}: Fig. 3 mode ${m} list marks item ${on + 1} on step 3`);
      if (width === 1400 && m === 'gen') await (await p.$('#hn-s-anim')).screenshot({ path: `${shots}/x-hn-gen-s3-${scheme}-${width}.png` }); }
    await p.click('#hn-mode button[data-m="ll"]'); }
  for (const [id] of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
    if (!/Pause/.test(await p.$eval(`#${id}-p`, e => e.textContent))) problems.push(`${tag}: ${id} is not playing after it came into view`);
    if (width === 1400 || width === 390) { await wait(300); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-autoplay-tween-${scheme}-${width}.png` }) }
  }
  // flows stop off screen
  await p.evaluate(() => window.scrollTo(0, document.getElementById('rd-each').getBoundingClientRect().top + scrollY)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  for (const [id, lid] of STAGES) {
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length);
    if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but list ${lid} shows ${lis}`);
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' }));
    for (let k = 0; k < n; k++) {
      if (k) await p.$eval(`#${id}-f`, e => e.click());
      if (width === 1400 || width === 390) {
        await wait(650); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}-midtween-${scheme}-${width}.png` });
        await wait(1100); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}-${scheme}-${width}.png` })
      }
    }
    await wait(1700);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
    await audit(`${id} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id} list does not mark the last step`);
  }
  if (width === 1400) { // the step lists' numbers are the page's data
    const r = await p.evaluate(() => { const out = [], li = (id, k) => document.getElementById(id).children[k].textContent.replace(/\s+/g, ' ');
      const need = (id, xs) => xs.forEach(([k, x]) => { if (!li(id, k).includes(String(x))) out.push(`${id} item ${k + 1} lacks "${x}"`) });
      const f = d => (d > 0 ? '+' : '') + d.toFixed(1), H = HXN.hero, B = H.bars;
      need('sxl-hero', [[1, B[0][0][0].toFixed(1) + ' points'], [1, f(B[1][0][0])], [2, f(B[2][0][0])], [2, f(B[2][1][0])], [3, f(B[3][0][0])], [3, f(H.llama)], [4, f(B[4][0][0])],
        [4, H.strict + ' and ' + H.flex + ' correct out of 10'], [5, f(B[5][0][0])], [5, H.macro], [5, H.micro]]);
      const sig = B.map(b => b.map(x => x[1])); if (!(sig[2][0] && sig[2][1] && sig[4][0]) || sig[0][0] || sig[1][0] || sig[3][0] || sig[5][0]) out.push('hero: the links outside their interval are not chat template, its fix and extraction: ' + JSON.stringify(sig));
      const U = HXN.unit, t = v => v.toLocaleString('en-GB');
      need('sxl-unit', [[0, t(U.prompt[0]) + ' to ' + t(U.prompt[1]) + ' tokens'], [1, U.out[0] + ' to ' + U.out[1] + ' tokens'], [2, 'in ' + U.strictRead + ' of them'], [2, U.strictOK === 0 ? 'none is correct' : 'XX'], [2, 'gets ' + U.flexOK + ' right'],
        [3, '(' + U.em[0].toFixed(1) + ' and ' + U.em[1].toFixed(1) + ')'], [3, U.resKB + ' KB'], [3, U.smpKB + ' KB'], [4, (U.events[0] === U.events[1] ? U.events[0] : 'XX') + ' per sample'], [5, U.inOK + ' of 10'],
        [6, U.lmKB[0] + ' to ' + U.lmKB[1] + ' KB'], [6, U.inKB[0] + ' to ' + U.inKB[1] + ' KB']]);
      const E = HXN.ext, T = E.tot;
      need('sxl-ext', [[1, 'in ' + E.strictRead + ' of the lm-eval outputs'], [1, (T[0][0] + T[0][1]) + ' correct']]);
      if (E.strictReadIn !== 0) out.push('ext: strict-match read an Inspect output');
      [1, 2, 3].forEach(i => { if (T[i][0] !== T[1][0] || T[i][1] !== T[1][1]) out.push('ext: the last-number rules disagree on totals ' + JSON.stringify(T)) });
      need('sxl-ext', [[2, T[1][0] + ' correct of the lm-eval outputs and ' + T[1][1] + ' of'], [3, 'the same ' + T[4][0] + ' and ' + T[4][1]], [4, 'in ' + E.simpleRead + ' Inspect outputs'], [4, E.simpleOK === 0 ? 'both wrong' : 'XX'], [4, E.openOK + ' of 20'],
        [5, 'problem ' + E.close.problem + ' (gold ' + E.close.gold + ')'], [5, E.close.ok + ' of the 7 rules'], [5, E.close.run === 'lmeval' ? "lm-eval's output" : "Inspect's output"],
        [6, 'from ' + Math.min(...T.flat()) + ' to ' + Math.max(...T.flat()) + ' correct out of 10']]);
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  await audit('end');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file);
  for (const [id] of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  const an = await p.evaluate(() => [document.getElementById('an-scrub').value, document.getElementById('an-play').textContent]); if (an[0] !== '5' || an[1] !== 'Play') problems.push('reduced motion: the GSM8K widget moved ' + an);
  await p.$eval('#hn-s-anim', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
  const hn = await p.evaluate(() => [document.getElementById('hn-ctl-s').value, document.getElementById('hn-ctl-p').textContent]); if (hn[0] !== '0' || /Pause/.test(hn[1])) problems.push('reduced motion: Fig. 3 moved by itself ' + hn);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
