// The 2026-11-06 rollout checks for Long context (2026-11-09), adapted from Attention variants' check_stages.mjs: the four 3D stages (Fig. 1 hero,
// Fig. 2 prefill against decode, Fig. 3 eviction with its budget chips, Fig. 4 the position wall) play by themselves once scrolled into view, step
// to their last step with one step-list item per step, stop redrawing off screen and never move under reduced motion; the design stepper (2D,
// RD.anim) plays in view and has one list item per step; no errors, NaN, undefined or sideways scroll; the splits are two columns at 1400 px and
// one below 1100 px; the numbers the step lists write are what the page's data gives.
// Screenshots of every step (mid-tween and settled) at 1400 light, and of the middle step at 390 dark, go to the shots dir.
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_llm_architecture/long_context/src/check_stages.mjs [shots dir] [--all] [--only=stg-x] [--fast]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const args = process.argv.slice(2), ALL = args.includes('--all'), FAST = args.includes('--fast');
const only = (args.find(a => a.startsWith('--only=')) || '').slice(7);
const file = 'file://' + path.resolve(here, '../index.html'), shots = args.find(a => !a.startsWith('--')) || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = ['stg-hero', 'stg-pd', 'stg-ev', 'stg-past'].filter(s => !only || s === only);
const wait = ms => new Promise(r => setTimeout(r, ms));
const problems = [];
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
try {
for (const [scheme, width] of (FAST ? [['light', 1400]] : [['light', 1400], ['light', 920], ['dark', 390]])) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(400);
  const tag = `${scheme} ${width}`, shoot = width === 1400 || width === 390;
  const audit = async (where, tab = 't-read') => {
    const r = await p.evaluate(tab => { const c = document.getElementById(tab).cloneNode(true); c.querySelectorAll('pre,code').forEach(x => x.remove());
      return { bad: (c.innerText.match(/.{0,30}\b(NaN|undefined|Infinity|pending)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } }, tab);
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  const outside = await p.$$eval('section', xs => xs.filter(x => !x.closest('.tab')).map(x => x.id)); if (outside.length) problems.push(`${tag}: sections outside a tab ${outside}`);
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (!cols.length || cols.some(c => c !== 'grid'))) problems.push(`${tag}: a split is not two columns (${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  if (width === 1400) { const over = await p.$$eval('#t-read .s3R', xs => xs.map(x => { const r = x.getBoundingClientRect(), k = x.firstElementChild && x.firstElementChild.getBoundingClientRect(); return k && (k.right > r.right + 1 || k.left < r.left - 1) ? x.innerHTML.slice(0, 40) : '' }).filter(Boolean));
    over.forEach(o => problems.push(`${tag}: right-column content wider than its column: ${o}`)) }
  for (const id of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
    if (shoot) { await wait(300); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-autoplay-${scheme}-${width}.png` }) }
  }
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await wait(800);
  // only the stages that are off screen now
  const offs = () => p.$$eval('.stg', xs => xs.map(x => { const r = x.getBoundingClientRect(); return r.bottom < 0 || r.top > innerHeight ? +x.dataset.draws || 0 : -1 }));
  const d0 = await offs(); await wait(1200); const d1 = await offs();
  if (d1.some((v, i) => v >= 0 && v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  const stepAll = async (id, lid, sfx) => {
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length);
    if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but list ${lid} shows ${lis}`);
    if (n > 8) problems.push(`${tag}: ${id} has ${n} steps, more than about 8`);
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' }));
    for (let k = 0; k < n; k++) {
      if (k) await p.$eval(`#${id}-f`, e => e.click());
      if (shoot && (ALL || width === 1400 || k === Math.floor(n / 2))) {
        await wait(650); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${sfx}-s${k + 1}-midtween-${scheme}-${width}.png` });
        await wait(2700); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${sfx}-s${k + 1}-${scheme}-${width}.png` })
      } else await wait(250);
    }
    await wait(1800);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
    await audit(`${id}${sfx} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id} list ${lid} does not mark the last step`);
  };
  for (const id of STAGES) await stepAll(id, 'sx-' + id.slice(4), '');
  if (STAGES.includes('stg-ev')) { // Fig. 3's other budget: same list, replays from step 1
    await p.$eval('#ev-bud button[data-m="0.125"]', e => e.click()); await wait(300); await stepAll('stg-ev', 'sx-ev', '-125');
    await p.$eval('#ev-bud button[data-m="0.25"]', e => e.click()); await wait(300);
  }
  if (!only) { // the design stepper (2D, RD.anim): one list item per step, plays by itself once in view
    const r = await p.evaluate(() => [document.getElementById('sx-dz').children.length, +document.getElementById('lc-dz-ctl-s').max + 1]);
    if (r[0] !== r[1]) problems.push(`${tag}: design stepper has ${r[1]} steps but ${r[0]} list items`);
    await p.evaluate(() => window.scrollTo(0, 0)); await wait(300); await p.$eval('#lc-dz', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const pl = await p.$eval('#lc-dz-ctl-p', e => e.getAttribute('aria-label')); if (pl !== 'Pause') problems.push(`${tag}: design stepper did not play in view (${pl})`);
    if (shoot) await (await p.$('#lc-dz')).screenshot({ path: `${shots}/x-lc-dz-${scheme}-${width}.png` });
  }
  if (width === 1400 && !only) { // the numbers the step lists write are what the page's data gives
    const r = await p.evaluate(() => { const out = [], li = (lid, k) => document.getElementById(lid).children[k].textContent.replace(/\s+/g, ' ');
      const need = (lid, k, x) => { if (!li(lid, k).includes(String(x))) out.push(`${lid} item ${k + 1} lacks "${x}"`) };
      const fmt = v => Math.round(v).toLocaleString('en-GB'), pc = v => Math.round(100 * v) + '%';
      const pr = KC.byKey['llama-3.1-8b'], mha = KC.redesign(pr, 'mha'), tok = KC.seq(pr, 1).total, W8 = pr.params * 2, CAP = 80e9 * .92;
      need('sx-hero', 0, fmt(tok / 2)); need('sx-hero', 0, fmt(tok)); need('sx-hero', 0, tok / 1024 + ' KiB');
      need('sx-hero', 1, (KC.seq(pr, 8192).total / 2 ** 30) + ' GiB'); need('sx-hero', 1, (KC.seq(pr, 32768).total / 1e9).toFixed(2) + ' GB');
      need('sx-hero', 2, (KC.seq(pr, 131072).total / 1e9).toFixed(2) + ' GB'); need('sx-hero', 2, (W8 / 1e9).toFixed(2) + ' GB'); need('sx-hero', 2, fmt(W8 / tok));
      const fit = T => Math.floor((CAP - W8) / KC.seq(pr, T).total), words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen'];
      need('sx-hero', 3, words[fit(131072)] + ' such sequences'); need('sx-hero', 3, words[fit(32768)] + ' at 32K');
      need('sx-hero', 4, fmt(KC.reach(mha, CAP - W8))); need('sx-hero', 4, KC.seq(mha, 1).total / 1024 + ' KiB');
      const f = KCD.vis.flops8b, at = T => f.find(r => r[0] === T);
      need('sx-pd', 1, pc(at(4096)[2])); need('sx-pd', 1, pc(at(131072)[2])); need('sx-pd', 3, pc(at(131072)[1]));
      const i = f.findIndex(r => r[1] >= .5), a = f[i - 1], c = f[i], x = Math.exp(Math.log(a[0]) + (Math.log(c[0]) - Math.log(a[0])) * (.5 - a[1]) / (c[1] - a[1]));
      if (Math.abs(x - 28600) > 600) out.push('decode crossover ' + Math.round(x) + ' is not about 28,600');
      need('sx-pd', 0, (131072 * 131073 / 2 / 1e9).toFixed(1) + ' billion');
      need('sx-ev', 0, (EVD.length * EVD.bpt / 2 ** 20) + ' MiB'); need('sx-ev', 0, EVD.feat.key);
      // the position runs: the facts the list writes are the recorded runs
      const g = (m, s) => EFD.past.runs.find(r => r.model === m && r.scaling === s);
      [['at_mha', 'plain'], ['at_mha', 'linear x4'], ['at_mha', 'ntk x8'], ['at_mha', 'yarn x8'], ['lc_pi_ft', 'linear x4'], ['lc_plain_ft', 'plain'], ['at_swa64', 'plain']].forEach(([m, s]) => {
        const r = g(m, s); if (!r) { out.push('no run ' + m + ' ' + s); return }
        const key = 'past_' + m + '_' + s.replace(' x', '') + '_'; ['0-255', '512-1023', '1024-2047'].forEach(bn => { const v = LCF[key + bn.replace('-', '_')]; if (v !== undefined && Math.abs(v - r[bn]) > 1e-9) out.push(key + bn + ' differs from EFD') }) });
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  if (!only) { await audit('end'); for (const t of ['t-kv', 't-more']) { await p.click(`#tabs button[data-t="${t}"]`); await wait(300); await audit(t, t) } await p.click('#tabs button[data-t="t-read"]'); }
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
if (!FAST) { // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file);
  for (const id of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  if (!only) { await p.$eval('#lc-dz', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    if ((await p.$eval('#lc-dz-ctl-p', e => e.getAttribute('aria-label'))) === 'Pause') problems.push('reduced motion: the design stepper plays by itself'); }
  await p.close();
}
} finally { await b.close(); }
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
