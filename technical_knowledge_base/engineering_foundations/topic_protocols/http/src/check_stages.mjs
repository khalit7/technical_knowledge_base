// The 2026-11-06 rollout checks for the HTTP page: every 3D stage and the header-compression animation play by themselves once scrolled into view,
// step to their last step with one step-list item per step, stop redrawing off screen and never move under reduced motion; the three widgets
// (frame viewer, flow control, timeout chain) never play by themselves; no errors, NaN, undefined or sideways scroll; the splits are two columns
// at 1400 px and one below 1100 px. The recorded values written into the step lists are checked against the page's own data (window.HD and the
// values the scenes compute from it: HOL_MED, LOSS_ROWS, HERO_RES).
// usage (from the repo root): node technical_knowledge_base/engineering_foundations/topic_protocols/http/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = [['stg-hero', 'sx-hero'], ['stg-hol', 'sx-hol'], ['stg-loss', 'sx-loss'], ['stg-to', 'sx-to']];
const WIDGETS = ['fr-ctl', 'rd-fc-ctl', 'ch-ctl'];
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
    const r = await p.evaluate(() => { const c = document.getElementById('t-read').cloneNode(true); c.querySelectorAll('pre,code').forEach(x => x.remove());
      return { bad: (c.innerText.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } });
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (!cols.length || cols.some(c => c !== 'grid'))) problems.push(`${tag}: a split is not two columns (${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  // autoplay on view: stages (data-frames rises) and the compression animation (its play button reads Pause)
  for (const [id] of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
  }
  await p.$eval('#rd-hp', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
  if (!/Pause/.test(await p.$eval('#rd-hp-ctl-p', e => e.textContent))) problems.push(`${tag}: the compression animation did not play when scrolled into view`);
  // widgets never play by themselves
  for (const w of WIDGETS) {
    await p.$eval('#' + w, e => e.scrollIntoView({ block: 'center' })); const v0 = await p.$eval(`#${w}-s`, e => e.value); await wait(1800);
    const [v1, lab] = await p.$eval(`#${w}-s`, e => [e.value, document.getElementById(e.id.slice(0, -1) + 'p').textContent]);
    if (v1 !== v0 || /Pause/.test(lab)) problems.push(`${tag}: widget ${w} moved by itself`);
  }
  // flows stop off screen: draws do not rise while every stage is out of view
  await p.evaluate(() => window.scrollTo(0, document.getElementById('rd-s12').getBoundingClientRect().top + scrollY)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  // step every stage to its last step; list length; screenshots mid-way and at the end
  for (const [id, lid] of STAGES) {
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length);
    if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but list ${lid} shows ${lis}`);
    for (let k = 1; k < n; k++) {
      await p.$eval(`#${id}-f`, e => e.click()); await wait(80);
      if (k === Math.floor(n / 2)) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(4600); const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}-mid-${scheme}-${width}.png` }) }
    }
    await wait(4600);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
    { const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}-last-${scheme}-${width}.png` }) }
    await audit(`${id} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
  }
  // the compression animation: every header set and mode to its last step, with its list
  for (const [m, lid] of [['h2', 'sx-hp'], ['h1', 'sx-hp'], ['h3', 'sx-hp3']]) for (const set of ['running', 'bearer', 'sdk']) {
    await p.evaluate((m, set) => { document.querySelector(`#rd-hp-set [data-m="${set}"]`).click(); document.querySelector(`#rd-hp-mode [data-m="${m}"]`).click() }, m, set);
    const n = await p.$eval('#rd-hp-ctl-s', e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.hidden ? -1 : e.children.length);
    if (lis !== n) problems.push(`${tag}: compression ${m} ${set} has ${n} steps but ${lid} shows ${lis}`);
    for (let k = 1; k < n; k++) await p.$eval('#rd-hp-ctl-f', e => e.click());
    await audit(`compression ${m} ${set}`);
  }
  if (width === 1400) { const el = await p.$('#rd-hp'); await el.screenshot({ path: `${shots}/x-rd-hp-${scheme}-${width}.png` }) }
  if (width === 1400) { // the step lists' recorded values are the page's data
    const r = await p.evaluate(() => { const out = [], li = (id, k) => document.getElementById(id).children[k].textContent.replace(/\s+/g, ' ');
      const need = (id, xs) => xs.forEach(([k, x]) => { if (!li(id, k).includes(String(x))) out.push(`${id} item ${k + 1} lacks "${x}"`) });
      const f1 = v => (Math.round(v * 10) / 10).toLocaleString('en-US'), M = HOL_MED;
      need('sx-hol', [[1, f1(M.h1_pipelined.A_last) + ' ms'], [1, f1(M.h1_pipelined.B_last) + ' ms'], [1, f1(M.h1_pipelined.B_last - 10) + ' ms'], [2, f1(M.h1_two_conns.B_last) + ' ms'], [3, f1(M.h2_one_conn.B_last) + ' ms']]);
      const L = LOSS_ROWS, d = (p, s) => Math.round(L[p][s][1].d);
      need('sx-loss', [[1, `${d('h2', 0)}, ${d('h2', 1)} and ${d('h2', 2)} ms late`], [3, `${d('h3', 0)} ms late`]]);
      if (Math.abs(L.h3[1][1].d) > 8 || Math.abs(L.h3[2][1].d) > 8) out.push('HTTP/3 loss run: streams 4 and 8 were delayed');
      const H = HERO_RES; need('sx-hero', [[3, 'At ' + Math.round(H[3].at) + ' s'], [4, 'completes at ' + Math.round(H[4].end) + ' s'], [5, 'cut at ' + Math.round(H[5].at) + ' s']]);
      if (H[3].best.hop !== 2 || H[4].best || H[5].best.kind !== 'total') out.push('hero outcomes are not the ones described');
      const C = HD.timeouts.cases, s2 = v => v.toFixed(2) + ' s';
      need('sx-to', [[0, 'Complete in ' + s2(C[0].curl.seconds)], [1, 'at ' + s2(C[1].curl.seconds)], [1, 'exit ' + C[1].curl.exit], [1, C[1].curl.err.replace(/^curl: \(18\) /, '')], [1, s2(C[7].httpx.seconds)],
        [2, 'Complete in ' + s2(C[2].curl.seconds)], [3, s2(C[3].curl.seconds)], [3, C[6].httpx.seconds + ' s'], [4, 'cut at ' + s2(C[4].curl.seconds)], [4, 'exit ' + C[4].curl.exit], [5, C[5].curl.http + ' Gateway Time-out'], [5, 'at ' + s2(C[5].curl.seconds)]]);
      if (C[4].curl.tokens !== 3) out.push('total-limit case: not three tokens');
      const S = HD.hpack.sets.running; need('sx-hp', [[1, `from ${S.hpack[0].block} to ${S.hpack[1].block} bytes`]]);
      need('sx-hp3', [[0, `(${S.qpack.dynamic_4096[0].block} bytes`], [1, `(${S.qpack.dynamic_4096[1].encoder_stream} bytes, once)`], [1, `block is ${S.qpack.dynamic_4096[1].block} bytes`], [2, `(${S.qpack.dynamic_4096[2].block} bytes)`]]);
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
  await p.$eval('#rd-hp', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
  if (/Pause/.test(await p.$eval('#rd-hp-ctl-p', e => e.textContent)) || (await p.$eval('#rd-hp-ctl-s', e => e.value)) !== '0') problems.push('reduced motion: the compression animation moved by itself');
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
