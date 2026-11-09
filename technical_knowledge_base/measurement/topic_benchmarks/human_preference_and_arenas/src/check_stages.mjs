// The 2026-11-06 rollout checks for Human preference and arenas (2026-11-09): every 3D stage (Fig. 1 hero, Fig. 2 votes to a rating, Fig. 4 bootstrap)
// and every 2D step animation (Fig. 3 Elo against Bradley-Terry, Fig. 5 style control, in both of its modes) plays by itself once scrolled into view,
// steps to its last step with one step-list item per step, stops redrawing off screen and never moves under reduced motion; no errors, NaN, undefined
// or sideways scroll; the splits are two columns at 1400 px and one below 1100 px. The numbers written in the step lists are checked against what the
// scenes compute (window.HPN) and against src/recompute_out.json. Adapted from the Coding benchmarks page's check_stages.mjs.
// usage (from the repo root): node technical_knowledge_base/measurement/topic_benchmarks/human_preference_and_arenas/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
const RO = JSON.parse(fs.readFileSync(path.join(here, 'recompute_out.json')));
fs.mkdirSync(shots, { recursive: true });
const STAGES = [['stg-hero', 'sx-hero'], ['stg-vote', 'sx-vote'], ['stg-boot', 'sx-boot']];
const ANIMS = [['rd-elo-card', 'rd-elo-ctl', 'sx-elo', null], ['rd-sty-card', 'rd-sty-ctl', 'sx-sty', ['overall', 'hard']]];
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
  if (width === 1400 && (!cols.length || cols.some(c => c !== 'grid'))) problems.push(`${tag}: a split is not two columns (${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  // autoplay on view
  for (const [id] of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
    if (width === 1400 || width === 390) { await wait(300); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-autoplay-tween-${scheme}-${width}.png` }) }
  }
  for (const [card, ctl] of ANIMS) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const lbl = await p.$eval(`#${ctl}-p`, e => e.textContent + '|' + (e.getAttribute('aria-label') || ''));
    if (!/Pause/.test(lbl)) problems.push(`${tag}: ${card} did not start playing when scrolled into view (${lbl})`);
  }
  // flows stop off screen
  await p.evaluate(() => window.scrollTo(0, document.getElementById('rd-read').getBoundingClientRect().top + scrollY)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  // every stage to its last step, with one list item per step; screenshots of each step at 1400 and 390
  for (const [id, lid] of STAGES) {
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length);
    if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but list ${lid} shows ${lis}`);
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' }));
    for (let k = 0; k < n; k++) {
      if (k) await p.$eval(`#${id}-f`, e => e.click());
      if (width === 1400 || width === 390) {
        if (k) { await wait(700); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}-midtween-${scheme}-${width}.png` }) }
        await wait(1500); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}-${scheme}-${width}.png` })
      }
    }
    await wait(1700);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
    await audit(`${id} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id} list does not mark the last step`);
  }
  // the 2D animations: every mode, every step, list length
  for (const [card, ctl, lid, modes] of ANIMS) for (const m of modes || ['']) {
    if (m) { await p.$eval(`#rd-sty-seg [data-m="${m}"]`, e => e.click()); await wait(150) }
    const n = await p.$eval(`#${ctl}-s`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length);
    if (lis !== n) problems.push(`${tag}: ${card} ${m} has ${n} steps but list ${lid} shows ${lis}`);
    await p.$eval(`#${ctl}-p`, e => e.click()); // the reader's control: stop autoplay
    for (let k = 0; k < n; k++) { await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k); await wait(60); await audit(`${card} ${m} step ${k + 1}`) }
    if (width === 1400 || width === 390) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'start' })); await wait(300); await (await p.$('#' + card)).screenshot({ path: `${shots}/x-${card}${m ? '-' + m : ''}-last-${scheme}-${width}.png` }) }
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${card} ${m} list does not mark the last step`);
  }
  if (width === 1400) { // the step lists' numbers are the page's data
    const r = await p.evaluate(RO => { const out = [], li = (id, k) => document.getElementById(id).children[k].textContent.replace(/\s+/g, ' ');
      const need = (id, xs) => xs.forEach(([k, x]) => { if (!li(id, k).includes(String(x))) out.push(`${id} item ${k + 1} lacks "${x}"`) });
      const NM = { 'chatgpt-4o-latest': 'ChatGPT-4o latest', 'gpt-4o-2024-05-13': 'GPT-4o (May)', 'claude-3-5-sonnet-20240620': 'Claude 3.5 Sonnet', 'llama-3.1-405b-instruct': 'Llama 3.1 405B', 'gemma-2-27b-it': 'Gemma 2 27B', 'claude-3-opus-20240229': 'Claude 3 Opus', 'claude-3-haiku-20240307': 'Claude 3 Haiku' };
      // Fig. 1
      const H = HPN.hero; need('sx-hero', [[0, '8,626,731 votes'], [0, '413 models'], [0, String(Math.round(H.leader[1]))], [1, 'odds of ' + H.odds.toFixed(2)], [1, (H.pw * 100).toFixed(1) + '%'],
        [2, 'about ' + Math.round(H.infl) + ' points'], [3, H.opus[0].toFixed(1) + ' without'], [3, H.opus[1].toFixed(1) + ' with'], [4, Math.round(H.leader[2]) + ' to ' + Math.round(H.leader[3])], [4, H.fourth[1][0] + 'nd to ' + H.fourth[1][1] + 'th']]);
      if (Math.abs(H.infl - RO.bon.inflation_50_3000) > .02) out.push('hero inflation ' + H.infl);
      if (H.leader[4][0] !== 1 || H.leader[4][1] !== 1) out.push('leader spread ' + H.leader[4]);
      // Fig. 2
      const V = HPN.vote, S = RO.stage, mi = m => HPD.lab.models.indexOf(m);
      V.bt.forEach((v, i) => { if (Math.abs(v - RO.lab.bt[i]) > .05) out.push('vote bt ' + i) });
      need('sx-vote', [[0, NM[V.first[0]] + ' gives answer A'], [0, NM[V.first[1]] + ' answer B'], [0, V.first[2] === 1 ? 'picks B' : 'picks A'],
        [2, 'The ' + V.pairs + ' pairs'], [2, NM[V.pMax[0]] + ' and ' + NM[V.pMax[1]] + ' ' + V.pMax[2] + ' times'], [2, NM[V.pMin[0]] + ' and ' + NM[V.pMin[1]] + ' only ' + V.pMin[2]],
        [4, 'with ' + Math.round(V.bt[mi(V.ord[0])])], [4, 'with ' + Math.round(V.bt[mi(V.ord[9])])], [4, 'within ' + Math.ceil(V.bt[mi(V.ord[1])] - V.bt[mi(V.ord[7])]) + ' points'],
        [5, (V.gap * 100).toFixed(1) + ' points'], [5, NM[V.miss[0]] + ' won ' + Math.round(V.miss[3] * 100) + '% of its ' + V.miss[2] + ' battles with ' + NM[V.miss[1]]], [5, 'predicts ' + Math.round(V.miss[4] * 100) + '%']]);
      const a = mi(V.miss[0]), bb = mi(V.miss[1]), oth = S.nb6[a].reduce((x, y) => x + y, 0) + S.nb6[bb].reduce((x, y) => x + y, 0) - 2 * S.nb6[a][bb];
      need('sx-vote', [[5, oth.toLocaleString('en-US') + ' other votes']]);
      if (S.first.i !== 1) out.push('first decisive vote ' + S.first.i);
      // Fig. 4
      const B = HPN.boot, hw = B.w6.map(w => w / 2), top = mi(B.ord[0]), others = hw.filter((_, i) => i !== top);
      need('sx-boot', [[3, '±' + Math.round(hw[top]) + ' points for ' + NM[B.ord[0]]], [3, '±' + Math.round(Math.min(...others)) + ' to ±' + Math.round(Math.max(...others))], [3, 'within ' + Math.ceil(RO.stage.boot_vs_sand) + ' points'],
        [4, '1st in all ' + B.n], [4, 'GPT-4o (May) is 2nd in ' + (B.rank6[mi('gpt-4o-2024-05-13')][1] / B.n * 100).toFixed(1) + '%'], [4, 'Llama 3.1 405B 2nd in ' + (B.rank6[mi('llama-3.1-405b-instruct')][1] / B.n * 100).toFixed(1) + '%'],
        [5, B.ratio.toFixed(2) + ' times'], [5, 'from 1st to ' + B.sp1[top][1] + 'th']]);
      const son = B.rank6[mi('claude-3-5-sonnet-20240620')], fs = son.findIndex(x => x > 0) + 1, ls = son.length - [...son].reverse().findIndex(x => x > 0);
      need('sx-boot', [[4, 'from ' + fs + 'th to ' + ls + 'th']]);
      if (B.rank6[top][0] !== B.n) out.push('leader not first in every refit');
      // the bootstrap in Fit the votes uses the same draws
      return out }, RO);
    r.forEach(x => problems.push(`${tag}: ${x}`));
    // Fit the votes' bootstrap intervals equal the stage's (same seed and draws)
    await p.click('button[data-t=t-lab]'); await wait(200); await p.$eval('#lb-ci button[data-m=boot]', e => e.click()); await wait(1500);
    const L = await p.evaluate(() => window.HP_CHECK.lab);
    L.ci.forEach((c, i) => { if (Math.abs(c[0] - RO.stage.boot6.ci[i][0]) > .06 || Math.abs(c[1] - RO.stage.boot6.ci[i][1]) > .06) problems.push(`${tag}: lab bootstrap ${i} ${c} vs stage ${RO.stage.boot6.ci[i]}`) });
    await p.$eval('#lb-ci button[data-m=sand]', e => e.click()); await p.click('button[data-t=t-read]'); await wait(200);
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
  for (const [card, ctl] of ANIMS) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(2500);
    const r = await p.$eval(`#${ctl}-s`, e => e.value); if (r !== '0') problems.push(`reduced motion: ${card} moved by itself (step ${r})`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
