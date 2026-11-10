// The 2026-11-06 rollout checks for xAI / SpaceXAI: Grok (2026-11-10), adapted from OpenAI: GPT family's check_stages.mjs. The three 3D stages
// (Fig. 3 Colossus builds, window.XCX; Fig. 4 Grok-1's layers and experts, window.XG1; Fig. 5 Heavy's parallel agents, window.XHVS) and the 2D
// injection animation (Fig. 9, #ij, RD.anim with one step list per scenario) play by themselves once scrolled into view, step to their last step
// with one step-list item per step, stop redrawing off screen and never move under reduced motion; no errors, NaN, undefined or sideways scroll in
// any tab; the splits are two columns at 1400 px and one below 1100 px; every number the step lists print is what the page's own data gives.
// Screenshots of every step (mid-tween and settled) at 1400 light, and of the middle step at 390 dark, go to the shots dir (outside the repo).
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_llm_landscape/xai_spacexai_grok/src/check_stages.mjs <shots dir>
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
const STAGES = ['stg-cx', 'stg-g1', 'stg-hv'];
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
  // autoplay on view: stages count tweens in data-frames; the injection animation's play button reads Pause and the card carries data-playing
  for (const id of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
  }
  await p.$eval('#ij', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
  if (!(await p.$eval('#ij', e => e.dataset.playing === '1' && /Pause/.test(document.getElementById('ijCtl-p').textContent)))) problems.push(`${tag}: ij is not playing in view`);
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(800);
  const offs = () => p.$$eval('.stg', xs => xs.map(x => { const r = x.getBoundingClientRect(); return r.bottom < 0 || r.top > innerHeight ? (+x.dataset.draws || 0) + (+x.dataset.frames || 0) : -1 }));
  const d0 = await offs(); await wait(1200); const d1 = await offs();
  if (d1.some((v, i) => v >= 0 && v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  const ijStep = () => p.$eval('#ijStep', e => e.textContent);
  await wait(4600); const ijOff = await ijStep(); await wait(4800);
  if ((await ijStep()) !== ijOff) problems.push(`${tag}: ij moved while off screen`);
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
        await wait(1800); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}-${scheme}-${width}.png` })
      } else await wait(250);
    }
    await wait(1800);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
    await audit(`${id} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id} list ${lid} does not mark the last step`);
  };
  for (const id of STAGES) await stepAll(id, 'sx-' + id.slice(4));
  { // the injection animation: every scenario to its last step, one visible list item per step
    await p.$eval('#ij', e => e.scrollIntoView({ block: 'center' }));
    for (const [m, lid] of [['enc', 'sx-ij'], ['plain', 'sx-ij-plain'], ['gate', 'sx-ij-gate']]) {
      await p.$eval(`#ijM button[data-m="${m}"]`, e => e.click()); await wait(300);
      const vis = await p.$$eval('#t-read ol.sx[id^="sx-ij"]', xs => xs.filter(x => !x.hidden).map(x => x.id));
      if (vis.length !== 1 || vis[0] !== lid) problems.push(`${tag}: ij ${m} shows lists ${vis}`);
      await p.$eval('#ijCtl-b', e => e.click());
      const lis = await p.$eval('#' + lid, e => e.children.length), n = await p.$eval('#ijCtl-s', e => +e.max + 1);
      if (lis !== n) problems.push(`${tag}: ij ${m} has ${n} steps but its list ${lid} shows ${lis}`);
      for (let k = 0; k < 9; k++) await p.$eval('#ijCtl-f', e => e.click());
      await wait(1300);
      const st = await ijStep(); if (st !== `step ${lis} of ${lis}`) problems.push(`${tag}: ij ${m} ended on "${st}" (list has ${lis})`);
      if (shoot) await (await p.$('#ij')).screenshot({ path: `${shots}/x-ij-${m}-last-${scheme}-${width}.png` });
      if (await p.$eval('#ijCtl-p', e => /Pause/.test(e.textContent))) problems.push(`${tag}: ij still playing after the reader stepped`);
      const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on'))); if (cur !== lis - 1) problems.push(`${tag}: ij list ${lid} does not mark the last step`);
    }
    if (shoot) { await p.$eval('#ijM button[data-m="enc"]', e => e.click()); await p.evaluate(() => document.getElementById('sx-ij').children[3].click()); await wait(1400); await (await p.$('#ij')).screenshot({ path: `${shots}/x-ij-s4-${scheme}-${width}.png` }) }
  }
  if (width === 1400) { // every number the step lists print is what the page's data gives
    const r = await p.evaluate(() => { const out = [], n = v => v.toLocaleString('en-GB');
      const li = (lid, k) => document.getElementById(lid).children[k].textContent.replace(/\s+/g, ' ');
      const need = (lid, k, x) => { if (!li(lid, k).includes(String(x))) out.push(`${lid} item ${k + 1} lacks "${x}"`) };
      const B = XCX.B; B.forEach((b, i) => { need('sx-cx', i, b.mw + ' MW'); need('sx-cx', i, b.rate.toFixed(2) + ' MW a day'); need('sx-cx', 4, b.rate.toFixed(2)); if (b.gpd) need('sx-cx', 4, n(Math.round(b.gpd))) });
      need('sx-cx', 0, '730 days'); [1, 2, 3].forEach(i => need('sx-cx', i, B[i].d + ' days'));
      need('sx-cx', 4, Math.round(XCX.times(B[3])) + ' times');
      const g = XG1.g1, h = XG1.g2, bn = v => (v / 1e9).toFixed(1) + 'B', pc = (a, b) => (100 * a / b).toFixed(1) + '%';
      need('sx-g1', 1, Math.round(g.one / 1e6) + 'M'); need('sx-g1', 3, bn(g.act) + ' active of ' + bn(g.tot));
      need('sx-g1', 4, bn(g.exp) + ' of the ' + bn(g.tot)); need('sx-g1', 4, bn(g.expAct)); need('sx-g1', 4, '(' + bn(g.attn) + ')'); need('sx-g1', 4, '(' + bn(g.emb) + ')'); need('sx-g1', 4, pc(g.act, g.tot));
      need('sx-g1', 5, '(' + bn(h.dense) + ')'); need('sx-g1', 5, bn(h.tot) + ' total'); need('sx-g1', 5, bn(h.act) + ' active'); need('sx-g1', 5, pc(h.act, h.tot));
      const [a4, a16] = XHVS, A = XHV.A, S = XHV.S;
      need('sx-hv', 1, n(A * 1000) + ' reasoning tokens'); need('sx-hv', 1, n(4 * A * 1000) + ' tokens in ' + A + ' units'); need('sx-hv', 2, n(S * 1000) + ' tokens');
      need('sx-hv', 2, 'Done at ' + a4.par + ' units, with ' + n(a4.billed)); need('sx-hv', 3, n(a4.billed) + ' tokens'); need('sx-hv', 3, a4.ser + ' units, ' + a4.ratio.toFixed(1) + ' times');
      need('sx-hv', 4, n(a16.billed) + ' tokens billed'); need('sx-hv', 4, 'done at ' + a16.par + ' units'); need('sx-hv', 4, a16.ser + ' units, ' + a16.ratio + ' times');
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  await audit('end');
  for (const t of ['t-more']) { await p.click(`#tabs button[data-t="${t}"]`); await wait(300); await audit(t, t); }
  await p.click('#tabs button[data-t="t-read"]');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file);
  for (const id of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  await p.$eval('#ij', e => e.scrollIntoView({ block: 'center' })); await wait(5000);
  const h = await p.$eval('#ij', e => [e.dataset.playing, document.getElementById('ijStep').textContent]); if (h[0] === '1' || !/^step 1 of/.test(h[1])) problems.push(`reduced motion: ij moved by itself (${h})`);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
} finally { await b.close(); }
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
