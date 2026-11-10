// The 2026-11-06 rollout checks for Other notable providers (2026-11-10), adapted from Moonshot AI: Kimi's check_stages.mjs: the three 3D stages (what each
// layer holds, Qwen3-30B-A3B against Nemotron 3 Nano; one 27B model at four precisions; the Olmo 3 model flow, both modes) and the 2D DiLoCo animation play by
// themselves once scrolled into view, step to their last step with one step-list item per step, stop redrawing off screen and never move under reduced motion;
// no errors, NaN, undefined or sideways scroll in any tab; the splits are two columns at 1400 px and one below 1100 px; the numbers the step lists write are
// what the scenes compute (window.ONP_MEM, ONP_BITS, ONP_FA). Screenshots of every step (mid-tween and settled) at 1400 light, and of the middle step at
// 390 dark, go to the shots dir (outside the repo).
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_llm_landscape/other_notable_providers/src/check_stages.mjs <shots dir>
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
const STAGES = [['stg-mem', 'sx-mem'], ['stg-bits', 'sx-bits'], ['stg-fa', 'sx-fa-open']];
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
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
  const present = []; for (const s of STAGES) if (await p.$('#' + s[0]) && (!only || only.includes(s[0]))) present.push(s);
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
  // autoplay: each stage plays once scrolled into view
  for (const [id] of present) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
  }
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(800);
  const offs = () => p.$$eval('.stg', xs => xs.map(x => { const r = x.getBoundingClientRect(); return r.bottom < 0 || r.top > innerHeight ? (+x.dataset.draws || 0) + (+x.dataset.frames || 0) : -1 }));
  const d0 = await offs(); await wait(1200); const d1 = await offs();
  if (d1.some((v, i) => v >= 0 && v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
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
        await wait(650); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}-midtween-${scheme}-${width}.png` });
        await wait(1800); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}-${scheme}-${width}.png` })
      } else await wait(250);
    }
    await wait(1900);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
    await audit(`${id} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id} list ${lid} does not mark the last step`);
  };
  for (const [id, lid] of present) await stepAll(id, lid);
  if (present.find(x => x[0] === 'stg-fa')) { await p.$eval('#faM button[data-m="ow"]', e => e.click()); await wait(300);
    if (await p.$eval('#sx-fa-ow', e => e.hidden)) problems.push(`${tag}: the open-weights step list is not shown after the toggle`);
    await stepAll('stg-fa', 'sx-fa-ow'); await p.$eval('#faM button[data-m="open"]', e => e.click()); await wait(200) }
  if (!only || only.includes('dl')) { // the 2D DiLoCo animation (its own controller, the same motion rules)
    const fresh = await b.newPage(); await fresh.setViewport({ width, height: 900 }); await fresh.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
    await fresh.goto(file); await wait(300); await fresh.$eval('#dl', e => e.scrollIntoView({ block: 'center' })); await wait(2000);
    const r = await fresh.$eval('#dl', e => [+e.dataset.frames || 0, document.getElementById('dlPlay').textContent]);
    if (!(r[0] > 0) || !/Pause/.test(r[1])) problems.push(`${tag}: dl did not play when scrolled into view (${r})`);
    await fresh.evaluate(() => window.scrollTo(0, 0)); await wait(400); const f0 = await fresh.$eval('#dl', e => +e.dataset.frames || 0); await wait(1000);
    if ((await fresh.$eval('#dl', e => +e.dataset.frames || 0)) !== f0) problems.push(`${tag}: dl kept moving off screen`);
    for (const m of ['dp', 'dl']) { await fresh.$eval(`#dlM button[data-m="${m}"]`, e => e.click()); await wait(100);
      const lis = await fresh.$eval(`#sx-dl-${m}`, e => [e.children.length, e.hidden]); if (lis[0] !== 6 || lis[1]) problems.push(`${tag}: dl list ${m} (${lis})`);
      await fresh.$eval('#dl', e => e.scrollIntoView({ block: 'center' }));
      for (let k = 0; k < 7; k++) { await fresh.$eval('#dlFwd', e => e.click()); await wait(k === 2 && shoot && m === 'dl' ? 3600 : 120); if (k === 2 && shoot && m === 'dl') await (await fresh.$('#dl')).screenshot({ path: `${shots}/x-dl-${m}-s3-${scheme}-${width}.png` }) }
      await wait(3600); const cur = await fresh.$eval(`#sx-dl-${m}`, e => [...e.children].findIndex(li => li.classList.contains('on')));
      if (cur !== 5) problems.push(`${tag}: dl ${m} did not reach step 6 (${cur + 1})`) }
    await fresh.close() }
  if (width === 1400) { // the numbers the step lists write are what the scenes compute
    const r = await p.evaluate(() => { const out = [], n = v => v.toLocaleString('en-GB');
      const li = (lid, k) => { const l = document.getElementById(lid); return l ? l.children[k].textContent.replace(/\s+/g, ' ') : null };
      const need = (lid, k, x) => { const t = li(lid, k); if (t !== null && !t.includes(String(x))) out.push(`${lid} item ${k + 1} lacks "${x}"`) };
      if (window.ONP_MEM) ONP_MEM.need.forEach(([k, x]) => need('sx-mem', k, x));
      if (window.ONP_BITS) ONP_BITS.need.forEach(([k, x]) => need('sx-bits', k, x));
      if (window.ONP_FA) { ONP_FA.need.open.forEach(([k, x]) => need('sx-fa-open', k, x)); ONP_FA.need.ow.forEach(([k, x]) => need('sx-fa-ow', k, x)) }
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  await audit('end');
  for (const t of ['t-cmp', 't-run', 't-more']) { await p.click(`#tabs button[data-t="${t}"]`); await wait(300); await audit(t, t); }
  await p.click('#tabs button[data-t="t-read"]');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file);
  for (const [id] of STAGES) { if (!(await p.$('#' + id))) continue; await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  await p.$eval('#dl', e => e.scrollIntoView({ block: 'center' })); await wait(1500); if ((await p.$eval('#dl', e => +e.dataset.frames || 0)) > 0) problems.push('reduced motion: dl moved by itself');
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
} finally { await b.close(); }
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
