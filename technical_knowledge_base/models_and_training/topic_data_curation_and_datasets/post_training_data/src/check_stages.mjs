// The 2026-11-06 rollout checks for Post-training data (2026-11-09), adapted from the Decontamination sibling's check_stages.mjs: the three 3D stages
// (Fig. 1 rejection sampling and the judge, Fig. 2 what a row becomes, Fig. 3 binarization and length) and the three 2D animations (Self-Instruct's filter,
// six checkers on five answers, a trajectory in five stretches) play by themselves once scrolled into view, step to their last step with one step-list item
// per step, stop redrawing off screen and never move under reduced motion; no errors, NaN, undefined or sideways scroll; the splits are two columns at
// 1400 px and one below 1100 px; the numbers written in the step lists equal what the page computes from its own data (window.PD).
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_data_curation_and_datasets/post_training_data/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = ['stg-rs', 'stg-row', 'stg-pref'];
const ANIMS = [['pd-si-card', 'pd-si-ctl', 'sx-si'], ['pd-ex-card', 'pd-ex-ctl', 'sx-ex'], ['pd-traj-card', 'pd-traj-ctl', 'sx-traj']];
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
  // the prompt picker of Fig. 3 replays the stage and leaves no NaN
  if (width === 1400) {
    for (const m of ['0', '5', '7', '4']) { await p.$eval(`#pd-pref-p button[data-m="${m}"]`, e => e.click()); await wait(200);
      const st = await p.$eval('#stg-pref .stg-st', e => e.textContent); if (!/^step 1 of/.test(st)) problems.push(`${tag}: prompt ${m} did not restart Fig. 3 (${st})`) }
    await p.$eval('#stg-pref', e => e.scrollIntoView({ block: 'center' })); await wait(2600);
    if (shoot) await (await p.$('#stg-pref')).screenshot({ path: `${shots}/x-stg-pref-prompt5-${scheme}-${width}.png` });
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
      // Fig. 1: the funnel from OpenR1's recorded flags
      const C = PD.check, K = C.answer.ok.rec_mv, J = C.llama;
      need('sx-rs', 0, f(C.problems) + ' problems give ' + f(C.n) + ' generations'); need('sx-rs', 1, f(C.n - K) + ' drop');
      need('sx-rs', 2, f(J.n)); need('sx-rs', 2, f(J.true)); need('sx-rs', 2, f(C.n - K - J.n) + ' rejects were never judged');
      need('sx-rs', 2, 'accept ' + f(K + J.true) + ' of'); need('sx-rs', 2, '(' + Math.round(100 * (K + J.true) / C.n) + '%)');
      const JL = Object.fromEntries(PD.judge); need('sx-rs', 3, JL['Multiple choice: letter against value'] + ' an option letter'); need('sx-rs', 3, JL['Equivalent form or answer set'] + ' an equivalent form');
      need('sx-rs', 3, JL['Garbled label'] + ' a label garbled'); need('sx-rs', 3, JL['Rounding'] + ' rounding'); need('sx-rs', 3, ['', 'One', 'Two', 'Three'][JL['Judge wrong or unclear']] + ' look wrong');
      if (PD.judge.reduce((s, x) => s + x[1], 0) !== 30) out.push('judge labels no longer 30');
      // Fig. 2: the token roles, recomputed from the pieces
      const T = PD.tok, full = T.pieces.map(x => x[0]).join(''), ua = full.indexOf('<|assistant|>'), ee = full.indexOf('<|endoftext|>');
      let o = 0; const cnt = { uh: 0, u: 0, ah: 0, a: 0, e: 0 }; T.pieces.forEach(x => { const a = o, b2 = a + x[0].length; o = b2;
        const inH = (s, l) => a < s + l && b2 > s; if (inH(0, 9)) cnt.uh++; else if (inH(ua, 14)) cnt.ah++; else if (inH(ee, 13)) cnt.e++; else if (a >= ua) cnt.a++; else cnt.u++ });
      const g = T.pieces.filter(x => x[1] === 1).length;
      need('sx-row', 2, f(T.n) + ' tokens'); need('sx-row', 2, cnt.uh + ' for each header'); if (cnt.uh !== cnt.ah) out.push('header token counts differ ' + cnt.uh + ' ' + cnt.ah);
      need('sx-row', 2, cnt.u + ' for the problem'); need('sx-row', 2, cnt.a + ' for the answer'); need('sx-row', 2, cnt.e + ' end token');
      need('sx-row', 3, f(g) + ' of ' + f(T.n) + ' tokens, ' + Math.round(100 * g / T.n) + '%'); if (g !== cnt.a + cnt.e || g !== T.trained) out.push('graded tokens are not answer plus end');
      // Fig. 3: every rule's chosen-longer share
      const RS = PD.pref.ub.rule_stats, sh = k => Math.round(100 * RS[k].chosen_longer / RS[k].diff) + '%';
      need('sx-pref', 4, sh('h4') + ' of pairs (overall_score)'); need('sx-pref', 4, sh('argilla') + ' (mean of aspects)'); need('sx-pref', 4, sh('maxmin') + ' (best against worst)');
      // Self-Instruct: pool sizes and rejections at each stretch, recomputed with the page's own rule
      const TK = s => (s.toLowerCase().match(/[a-z0-9]+/g) || []);
      const lcs = (a, b) => { if (a.length < b.length) [a, b] = [b, a]; let pr = new Array(b.length + 1).fill(0); for (const x of a) { const c = [0]; for (let j = 0; j < b.length; j++) c.push(x === b[j] ? pr[j] + 1 : Math.max(pr[j + 1], c[j])); pr = c } return pr[b.length] };
      const rl = (a, b) => a.length && b.length ? 2 * lcs(a, b) / (a.length + b.length) : 0;
      const run = filt => { const pool = PD.si.seeds.map(TK); const sz = []; let rej = 0; PD.si.stream.forEach(s => { const t = TK(s); const best = Math.max(...pool.map(q => rl(t, q))); if (!filt || best <= .7 + 1e-9) pool.push(t); else rej++; sz.push([pool.length, rej]) }); return sz };
      const on = run(true), off = run(false), B = [5, 9, 13, 17, 21, 26];
      need('sx-si', 1, 'pool ' + on[B[0] - 1][0]); need('sx-si', 2, 'pool ' + on[B[1] - 1][0]); need('sx-si', 3, 'Pool ' + on[B[2] - 1][0]); if (on[B[3] - 1][1] - on[B[2] - 1][1] !== 4) out.push('stretch 5 no longer rejects four');
      need('sx-si', 5, 'pool ' + on[B[4] - 1][0]); need('sx-si', 6, 'ends at ' + on[B[5] - 1][0] + ' with ' + on[B[5] - 1][1] + ' rejected'); need('sx-si', 6, 'all 26 join (' + off[B[5] - 1][0] + ')');
      // the trajectory: characters per stretch
      const S = PD.env.traj.steps, c = i => f(S[i].chars);
      need('sx-traj', 0, c(0)); need('sx-traj', 1, c(1)); need('sx-traj', 2, c(2) + ' and ' + c(4)); need('sx-traj', 2, c(3) + ' and ' + c(5));
      need('sx-traj', 3, c(6) + ' and ' + c(8)); need('sx-traj', 3, c(7) + ' and ' + c(9)); need('sx-traj', 4, c(10) + ' and ' + c(12)); need('sx-traj', 4, '(' + c(11) + ')');
      const tr = S.filter(s => s.trained).reduce((a, s) => a + s.chars, 0), all = S.reduce((a, s) => a + s.chars, 0);
      need('sx-traj', 4, f(tr) + ' of ' + f(all) + ' characters, ' + Math.round(100 * tr / all) + '%');
      // the extractor walk: labels of the five answers
      const X = ['mv_only', 'versions', 'thinking_vs_answer', 'tulu_only', 'mcq'].map(k => C.examples.find(e => e.cat === k && /boxed/.test(e.tail)) || C.examples.find(e => e.cat === k));
      if (X[0].v.math_verify[1] !== true || X[0].v.tulu_math[1] !== false || X[1].rec_mv !== true || X[1].v.math_verify[1] !== false || X[2].v.math_verify[1] !== true || X[2].vf.math_verify[1] !== false || X[2].vf.answer_is[1] !== true || X[3].v.math_verify[1] !== false || X[3].v.tulu_math[1] !== true || X[3].llama !== false || X[4].v.boxed_exact[1] !== false || X[4].v.math_verify[1] !== true) out.push('an extractor example no longer matches its step text');
      need('sx-ex', 3, 'Label ' + X[3].gold); need('sx-ex', 2, 'Label ' + X[2].gold);
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  await audit('end');
  for (const t of ['t-pdat', 't-more']) { await p.click(`#tabs button[data-t="${t}"]`); await wait(300); await audit(t, t) }
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
  for (const [card] of ANIMS) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(2000);
    const fr = await p.$eval('#' + card, c => [c.querySelector('.an-play').getAttribute('aria-label'), +c.querySelector('input[type=range]').value]); if (fr[0] !== 'Play' || fr[1] !== 0) problems.push(`reduced motion: ${card} moved by itself (${fr})`) }
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
