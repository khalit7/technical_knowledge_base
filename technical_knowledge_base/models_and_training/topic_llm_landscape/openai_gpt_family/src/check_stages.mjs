// The 2026-11-06 rollout checks for OpenAI: GPT family (2026-11-10), adapted from Anthropic: Claude family's check_stages.mjs. The three 3D stages
// (Fig. 3 what one request costs, window.OGRQ; Fig. 6 gpt-oss-120b's layers and experts, window.OGOSS; Fig. 7 gpt-oss on one card, window.OGFIT)
// and the 2D harness animation (Fig. 4, #hx, the page's own makeAnim) play by themselves once scrolled into view, step to their last step with one
// step-list item per step, stop redrawing off screen and never move under reduced motion; no errors, NaN, undefined or sideways scroll in any tab;
// the splits are two columns at 1400 px and one below 1100 px; every number the step lists print is what the page's own data gives.
// Screenshots of every step (mid-tween and settled) at 1400 light, and of the middle step at 390 dark, go to the shots dir (outside the repo).
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_llm_landscape/openai_gpt_family/src/check_stages.mjs <shots dir>
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2];
if (!shots) { console.log('usage: check_stages.mjs <shots dir outside the repo>'); process.exit(2); }
fs.mkdirSync(shots, { recursive: true });
const STAGES = ['stg-rq', 'stg-oss', 'stg-fit'];
const wait = ms => new Promise(r => setTimeout(r, ms));
const problems = [];
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
try {
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
  // autoplay on view: stages count tweens in data-frames; the harness animation sets data-playing and counts frames
  for (const id of [...STAGES, 'hx']) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
  }
  if (!(await p.$eval('#hx', e => e.dataset.playing === '1' && /Pause/.test(document.getElementById('hxPlay').textContent)))) problems.push(`${tag}: hx is not playing in view`);
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(800);
  const offs = () => p.$$eval('.stg,#hx', xs => xs.map(x => { const r = x.getBoundingClientRect(); return r.bottom < 0 || r.top > innerHeight ? (+x.dataset.draws || 0) + (+x.dataset.frames || 0) : -1 }));
  const d0 = await offs(); await wait(1200); const d1 = await offs();
  if (d1.some((v, i) => v >= 0 && v !== d0[i])) problems.push(`${tag}: an animation redrew while off screen (${d0} -> ${d1})`);
  const stepAll = async (id, lid) => {
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length);
    if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but list ${lid} shows ${lis}`);
    if (n > 8) problems.push(`${tag}: ${id} has ${n} steps, more than about 8`);
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' }));
    for (let k = 0; k < n; k++) {
      if (k) await p.$eval(`#${id}-f`, e => e.click());
      if (shoot && (width === 1400 || k === Math.floor(n / 2))) {
        await wait(700); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}-midtween-${scheme}-${width}.png` });
        await wait(2000); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}-${scheme}-${width}.png` })
      } else await wait(250);
    }
    await wait(2000);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
    await audit(`${id} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id} list ${lid} does not mark the last step`);
  };
  for (const id of STAGES) await stepAll(id, 'sx-' + id.slice(4));
  { // the harness animation: forward to its last step, one list item per step, both modes
    await p.$eval('#hx', e => e.scrollIntoView({ block: 'center' }));
    for (const mode of [0, 1]) {
      await p.evaluate(m => document.querySelector('#hxM button[data-i="' + m + '"]').click(), mode); await wait(300);
      await p.$eval('#hxBack', e => e.click());
      const lis = await p.$eval('#sx-hx', e => e.children.length);
      for (let k = 0; k < 8; k++) await p.$eval('#hxFwd', e => e.click());
      await wait(3000);
      const st = await p.$eval('#hxStep', e => e.textContent); if (st !== `step ${lis} of ${lis}`) problems.push(`${tag}: hx mode ${mode} ended on "${st}" (list has ${lis})`);
      if (shoot) await (await p.$('#hx')).screenshot({ path: `${shots}/x-hx-m${mode}-last-${scheme}-${width}.png` });
      if (await p.$eval('#hx', e => e.dataset.playing === '1')) problems.push(`${tag}: hx still playing after the reader stepped`);
    }
    if (shoot) { await p.evaluate(() => document.getElementById('sx-hx').children[3].click()); await wait(400); await (await p.$('#hx')).screenshot({ path: `${shots}/x-hx-s4-${scheme}-${width}.png` }) }
  }
  if (width === 1400) { // every number the step lists print is what the page's data gives
    const r = await p.evaluate(() => { const out = [], n = v => v.toLocaleString('en-GB');
      const li = (lid, k) => document.getElementById(lid).children[k].textContent.replace(/\s+/g, ' ');
      const need = (lid, k, x) => { if (!li(lid, k).includes(String(x))) out.push(`${lid} item ${k + 1} lacks "${x}"`) };
      const $u = (v, d) => '$' + v.toFixed(d), Q = OGRQ, T = Q.T, pct = v => Math.round(100 * v) + '%', r3 = v => n(Math.round(v / 1000) * 1000), r2 = v => n(Math.round(v / 100) * 100);
      if (Math.abs(Q.tot(Q.r1) - reqCost(Q.A, 50000, 5000, 0, 1, false)) > 1e-9 || Math.abs(Q.tot(Q.b300) - reqCost(Q.A, 300000, 10000, 0, 1, false)) > 1e-9 || Math.abs(Q.tot(Q.ag) - reqCost(Q.A, 200000, 5000, .75, 1, false)) > 1e-9) out.push('the scene split does not add up to reqCost');
      need('sx-rq', 1, $u(Q.tot(Q.r1), 2)); need('sx-rq', 1, $u(Q.r1.in, 2) + ' of input'); need('sx-rq', 1, $u(Q.r1.out, 2) + ' of output');
      need('sx-rq', 2, $u(Q.tot(Q.r2), 2)); need('sx-rq', 2, $u(Q.tot(Q.r3), 4));
      need('sx-rq', 3, $u(Q.tot(Q.b300), 2)); need('sx-rq', 3, $u(Q.std300, 2)); need('sx-rq', 3, $u(Q.tot(Q.b272), 2));
      need('sx-rq', 4, $u(Q.ag.in, 2) + ' uncached'); need('sx-rq', 4, $u(Q.ag.cache, 2) + ' cached'); need('sx-rq', 4, $u(Q.ag.out, 2) + ' of output'); need('sx-rq', 4, $u(Q.tot(Q.ag), 2)); need('sx-rq', 4, $u(Q.tot(Q.ag0), 2));
      need('sx-rq', 5, r3(T.A.I)); need('sx-rq', 5, r2(T.A.O)); need('sx-rq', 5, r3(T.S.I)); need('sx-rq', 5, r3(T.S.O)); need('sx-rq', 5, (T.L.I / 1e6).toFixed(2) + ' million'); need('sx-rq', 5, r2(T.L.O));
      need('sx-rq', 5, pct(T.A.h) + ', ' + pct(T.S.h) + ' and ' + pct(T.L.h));
      need('sx-rq', 6, $u(T.A.cpt, 2)); [T.A.usd.in, T.A.usd.cache, T.A.usd.rsn, T.A.usd.vis].forEach(v => need('sx-rq', 6, $u(v, 2)));
      if (Math.abs(T.A.usd.in + T.A.usd.cache + T.A.usd.rsn + T.A.usd.vis - T.A.cpt) > 1e-6) out.push('Astra task parts do not add to AA cost per task');
      need('sx-rq', 6, $u(T.S.cpt, 2)); need('sx-rq', 6, $u(T.L.cpt, 3)); need('sx-rq', 6, pct(T.S.cpt / T.A.cpt)); need('sx-rq', 6, (100 * T.L.cpt / T.A.cpt).toFixed(1) + '%');
      need('sx-rq', 6, pct(T.A.rs) + ' of Astra'); need('sx-rq', 6, pct(T.L.rs) + ' of Luna');
      const G = OGOSS; need('sx-oss', 1, (G.EXP / 1e6).toFixed(1) + 'M'); need('sx-oss', 3, (G.readMX / 1e6).toFixed(1) + ' MB'); need('sx-oss', 3, (G.denseBF / 1e9).toFixed(2) + ' GB'); need('sx-oss', 3, 'About ' + Math.round(G.ratio));
      need('sx-oss', 4, (G.act['120b'] / 1e9).toFixed(2) + 'B active of ' + (G.tot['120b'] / 1e9).toFixed(2) + 'B'); need('sx-oss', 5, n(G.kvTok) + ' bytes'); need('sx-oss', 5, Math.round(G.full / 1e6) + ' MB'); need('sx-oss', 5, Math.round(G.band / 1e3) + ' KB');
      need('sx-oss', 5, G.nF120 + ' full layers hold ' + (G.cache120 / 1e9).toFixed(2) + ' GB'); need('sx-oss', 6, (G.act['20b'] / 1e9).toFixed(2) + 'B active of ' + (G.tot['20b'] / 1e9).toFixed(2) + 'B');
      if (G.nF120 !== 18 || G.nF20 !== 12) out.push('full-layer counts from the configs changed');
      const F = OGFIT, g1 = v => (v / 1e9).toFixed(1) + ' GB', a = OSS['120b'];
      need('sx-fit', 0, g1(F.bf)); need('sx-fit', 0, g1(a.mlp * 2)); need('sx-fit', 0, g1(F.rest)); need('sx-fit', 1, g1(a.mlp * 4.25 / 8)); need('sx-fit', 1, g1(F.mx)); need('sx-fit', 1, (F.mx / 2 ** 30).toFixed(2) + ' GiB');
      need('sx-fit', 2, (F.kv / 1e9).toFixed(2) + ' GB'); need('sx-fit', 2, g1(F.left) + ' are left'); need('sx-fit', 2, 'room for ' + F.seqs + ' such');
      need('sx-fit', 3, g1(F.kvNoWin)); need('sx-fit', 3, g1(F.kvNoGqa)); need('sx-fit', 3, g1(F.kvNone));
      need('sx-fit', 4, g1(F.mx20)); need('sx-fit', 4, (F.kv20 / 1e9).toFixed(2) + ' GB'); need('sx-fit', 4, g1(F.mx20 + F.kv20)); need('sx-fit', 4, 'about ' + r2(F.tok20) + ' tokens');
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  await audit('end');
  for (const t of ['t-oss', 't-more']) { await p.click(`#tabs button[data-t="${t}"]`); await wait(300); await audit(t, t); }
  await p.click('#tabs button[data-t="t-read"]');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file);
  for (const id of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  await p.$eval('#hx', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
  const h = await p.$eval('#hx', e => [+e.dataset.frames || 0, document.getElementById('hxStep').textContent]); if (h[0] > 0 || !/^step 1 of/.test(h[1])) problems.push(`reduced motion: hx moved by itself (${h})`);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
} finally { await b.close(); }
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
