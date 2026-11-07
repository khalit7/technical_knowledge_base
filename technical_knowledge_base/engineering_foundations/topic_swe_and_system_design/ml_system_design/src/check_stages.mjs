// The 2026-11-06 rollout checks for ML system design: every 3D stage and 2D animation plays by itself once scrolled into view, steps to its last
// step (in every mode) with one step-list item per step, stops redrawing off screen and never moves under reduced motion; no errors, NaN, undefined
// or sideways scroll; the splits are two columns at 1400 px and one below 1100 px. Every number written into the step lists is checked against the
// page's own models (window.MSD_LAT, MSD_SERVE, MSD_SKEW, MSD_GW through MSD_LLMPATH, MSD_PREFIX) and the LiteLLM recording in src/inputs.
// usage (from the repo root): node technical_knowledge_base/engineering_foundations/topic_swe_and_system_design/ml_system_design/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const REC = JSON.parse(fs.readFileSync(path.resolve(here, 'inputs/litellm_fallback_run.json'), 'utf8'));
const STAGES = ['stg-hero', 'stg-skew', 'stg-serve', 'stg-llm'];
// 2D animations: card, control id, mode buttons (selector), modes, step list for each mode
const ANIMS = [['rd-fb-card', 'rd-fb-ctl', null, [null], () => 'sx-fb'], ['rd-pc-card', 'rd-pc-ctl', '#rd-pc-seg', ['before', 'after'], m => 'sx-pc-' + m]];
const wait = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const problems = [];
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(400);
  const tag = `${scheme} ${width}`;
  const audit = async where => {
    const r = await p.evaluate(() => { const c = document.getElementById('t-read').cloneNode(true); c.querySelectorAll('pre,code,.code').forEach(x => x.remove());
      return { bad: (c.innerText.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } });
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (!cols.length || cols.some(c => c !== 'grid'))) problems.push(`${tag}: a split is not two columns (${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  // autoplay on view: a stage's data-frames rises; a 2D animation's play button reads Pause
  for (const id of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
  }
  for (const [card, ctl] of ANIMS) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const t = await p.$eval(`#${ctl}-p`, e => e.textContent); if (!/Pause/.test(t)) problems.push(`${tag}: ${card} did not play when scrolled into view (${t})`);
  }
  // flows stop off screen: draws do not rise while every stage is out of view
  await p.evaluate(() => { const d = document.getElementById('rd-interview'); window.scrollTo(0, d.getBoundingClientRect().top + scrollY) }); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  // every stage to its last step; list length; screenshots mid-way (during a transition and settled) and at the end
  for (const id of STAGES) {
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const lid = await p.evaluate(id => ({ 'stg-hero': 'sx-hero', 'stg-skew': 'sx-skew', 'stg-serve': 'sx-serve', 'stg-llm': 'sx-llm' })[id], id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.hidden ? -1 : e.children.length);
    if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but list ${lid} shows ${lis}`);
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(300);
    for (let k = 1; k < n; k++) {
      await p.$eval(`#${id}-f`, e => e.click());
      if (k === Math.floor(n / 2)) { await wait(650); let el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}-tween${k}-${scheme}-${width}.png` });
        await wait(1400); el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}-mid${k}-${scheme}-${width}.png` }) } else await wait(120);
    }
    await wait(2000);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
    if (width === 1400 || width === 390) { const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}-last-${scheme}-${width}.png` }) }
    await audit(`${id} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
  }
  for (const [card, ctl, sel, modes, lidOf] of ANIMS) for (const m of modes) {
    if (sel) { await p.$eval(`${sel} [data-m="${m}"]`, e => e.click()); await wait(100); }
    const lid = lidOf(m), sfx = m == null ? '' : '-' + m;
    await p.$eval(`#${ctl}-b`, e => e.click());
    const n = await p.$eval(`#${ctl}-s`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.hidden ? -1 : e.children.length);
    if (lis !== n) problems.push(`${tag}: ${card}${sfx} has ${n} steps but list ${lid} shows ${lis}`);
    for (let k = 1; k < n; k++) await p.$eval(`#${ctl}-f`, e => e.click());
    const at = await p.$eval(`#${ctl}-s`, e => +e.value); if (at !== n - 1) problems.push(`${tag}: ${card}${sfx} ended on step ${at + 1}`);
    const on = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on'))); if (on !== n - 1) problems.push(`${tag}: ${card}${sfx} list marks item ${on + 1}`);
    if (width === 1400 || width === 390) { const el = await p.$('#' + card); await el.screenshot({ path: `${shots}/x-${card}${sfx}-last-${scheme}-${width}.png` }) }
    await audit(`${card}${sfx} last step`);
  }
  if (width === 1400) { // the step lists' numbers are the page's models
    const r = await p.evaluate(rec => { const out = [], li = (id, k) => document.getElementById(id).children[k].textContent.replace(/\s+/g, ' ');
      const need = (id, xs) => xs.forEach(([k, x]) => { if (!li(id, k).includes(String(x))) out.push(`${id} item ${k + 1} lacks "${x}"`) });
      const fmt = v => Math.round(v).toLocaleString('en-US');
      const K = MSD_SKEW, today = K.T.filter(t => t >= K.TODAY).length, words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six'];
      need('sx-skew', [[0, words[K.T.length] + ' tickets'], [0, words[today] + ' of them today'], [0, K.NOW_H + ':00 UTC'], [1, 'counts ' + K.off], [2, 'counts ' + K.on], [3, 'Trained on ' + K.off], [3, 'served ' + K.on]]);
      const S = MSD_SERVE;
      need('sx-serve', [[2, S.prefill.toFixed(2) + ' s'], [2, (S.tpot * 1000).toFixed(1) + ' ms'], [2, S.N + '-token'], [2, S.e2e.toFixed(1) + ' s'], [3, fmt(S.REP)], [3, S.BATCH + ' conversations'], [3, Math.round(S.perUser) + ' tokens'], [3, fmt(S.GPU)],
        [4, Math.round(S.MSG) + ' messages'], [4, S.e2e.toFixed(1) + ' s']]);
      if (Math.abs(S.openStream - 700) > 50) out.push(`sx-serve says about 700 open, the model gives ${S.openStream}`);
      if (!(S.openWeb >= 2 && S.openWeb <= 3)) out.push(`sx-serve says 2 or 3 open, the model gives ${S.openWeb}`);
      if (!li('sx-serve', 4).includes('about 700') || !li('sx-serve', 4).includes('2 or 3')) out.push('sx-serve item 5 lacks its counts');
      const L = MSD_LLMPATH.RUN, pc = v => (v * 100).toFixed(1).replace(/\.0$/, '') + '%', usd = v => '$' + v.toFixed(2), s2 = v => v.toFixed(2) + ' s';
      need('sx-llm', [[0, usd(L[0].per_k)], [0, s2(L[0].ttft)], [1, pc(L[1].share.exact)], [1, pc(L[1].share.small)], [1, pc(L[1].share.big)], [1, usd(L[1].per_k)], [1, s2(L[1].ttft)], [1, pc(L[1].wrong)],
        [2, pc(L[2].err)], [2, usd(L[2].per_k)], [2, s2(L[2].ttft)], [3, 'errors ' + pc(L[3].err)], [3, usd(L[3].per_k)], [3, s2(L[3].ttft)], [3, MSD_GW.D.detect_s + ' s to detect'], [4, usd(L[4].per_k)],
        [1, Math.round(MSD_GW.D.prefix * 100) + '% of input']]);
      const T = MSD_LITELLM, ev = x => x.events.filter(e => e[0] !== 'call').map(e => e[0] + ' ' + e[1] + (e[0] === 'fail' ? ' ' + e[2] : ''));
      const mine = o => o.events.map(e => e[0] + ' ' + e[1] + (e[0] === 'fail' ? ' ' + e[2] : ''));
      if (T.version !== rec.litellm_version) out.push('LiteLLM version differs from the recording');
      [['big', 'chat-big'], ['small', 'chat-small']].forEach(([k, nm]) => { if (JSON.stringify(mine(T[k])) !== JSON.stringify(ev(rec[nm]))) out.push(`LiteLLM ${k} events differ from the recording`);
        if (T[k].seconds !== rec[nm].seconds || T[k].served !== rec[nm].served_by) out.push(`LiteLLM ${k} seconds or server differ from the recording`) });
      need('sx-llm', [[3, 'LiteLLM ' + T.version], [3, 'failed twice'], [3, T.big.seconds + ' s measured'], [3, T.pause + ' s is a pause'], [3, 'about ' + (T.big.seconds - T.pause).toFixed(1) + ' s'], [3, T.small.seconds + ' s measured'], [3, 'about ' + (T.small.seconds - T.pause).toFixed(2) + ' s']]);
      if (T.big.events.filter(e => e[0] === 'fail').length !== 2) out.push('the recording does not show two failures');
      ['before', 'after'].forEach(m => MSD_PREFIX.turns(m).forEach((t, k) => need('sx-pc-' + m, [[k, 'Turn ' + t.k + ': ' + fmt(t.input) + ' input tokens, ' + (t.cached ? fmt(t.cached) : 'none') + ' from the cache']])));
      const B = MSD_PREFIX.turns('before'), A = MSD_PREFIX.turns('after');
      need('sx-pc-before', [[5, fmt(B[5].cumTok) + ' input tokens'], [5, '$' + B[5].cum.toFixed(4)]]);
      need('sx-pc-after', [[1, fmt(A[1].fresh) + ' tokens'], [5, fmt(A[5].cumTok) + ' input tokens'], [5, '$' + A[5].cum.toFixed(4)]]);
      return out }, REC);
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  await audit('end');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file);
  for (const id of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  for (const [card, ctl] of ANIMS) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval(`#${ctl}-s`, e => +e.value), t = await p.$eval(`#${ctl}-p`, e => e.textContent); if (r !== 0 || /Pause/.test(t)) problems.push(`reduced motion: ${card} moved by itself`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
