// The 2026-11-06 rollout checks for Mistral AI (2026-11-10), adapted from Meta: Llama and MSL's check_stages.mjs: the two 3D stages (Fig. 2 Mistral 7B
// to Mixtral, Fig. 3 the current line) and the 2D cache animation (#swa, its own controller, three modes) play by themselves once scrolled into view,
// step to their last step with one step-list item per step, stop redrawing off screen and never move under reduced motion; no errors, NaN, undefined
// or sideways scroll in any tab; the splits are two columns at 1400 px and one below 1100 px; the numbers the step lists write are what the page's
// data (window.MI) gives, and MI's layer sums equal parts_params.json (written by recompute.py). Screenshots of every step (mid-tween and settled) at
// 1400 light, and of the middle step at 390 dark, go to the shots dir (outside the repo).
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_llm_landscape/mistral_ai/src/check_stages.mjs <shots dir>
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
const PP = JSON.parse(fs.readFileSync(path.resolve(here, 'parts_params.json'), 'utf8'));
const STAGES = ['stg-mix', 'stg-now'], LISTS = { 'stg-mix': 'sx-mix', 'stg-now': 'sx-now' };
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
  for (const id of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
  }
  // the 2D cache animation: plays in view (data-frames rises, the button reads Pause, data-playing set)
  await p.$eval('#swa', e => e.scrollIntoView({ block: 'center' })); await wait(2000);
  { const r = await p.$eval('#swa', e => [+e.dataset.frames || 0, document.getElementById('swaPlay').getAttribute('aria-label'), e.dataset.playing]);
    if (!(r[0] > 0) || r[1] !== 'Pause' || r[2] !== '1') problems.push(`${tag}: #swa did not play when scrolled into view (${r})`) }
  if (shoot) { await wait(5200); await (await p.$('#swa')).screenshot({ path: `${shots}/x-swa-playing-${scheme}-${width}.png` }) }
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(800);
  const offs = () => p.$$eval('.stg, #swa', xs => xs.map(x => { const r = x.getBoundingClientRect(); return r.bottom < 0 || r.top > innerHeight ? (+x.dataset.draws || 0) + (+x.dataset.frames || 0) : -1 }));
  const d0 = await offs(); await wait(1200); const d1 = await offs();
  if (d1.some((v, i) => v >= 0 && v !== d0[i])) problems.push(`${tag}: a stage or the 2D animation redrew while off screen (${d0} -> ${d1})`);
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
  for (const id of STAGES) await stepAll(id, LISTS[id]);
  // the 2D cache animation in its three modes: the toggle swaps the list and replays; stepping reaches the last step; a control stops it
  for (const m of ['gqa', 'mha', 'swa']) {
    await p.$eval('#swa', e => e.scrollIntoView({ block: 'center' }));
    await p.$eval(`#swaM button[data-m=${m}]`, e => e.click()); await wait(1200);
    if (await p.$eval('#swaPlay', e => e.getAttribute('aria-label')) !== 'Pause') problems.push(`${tag}: #swa mode ${m} did not replay after the toggle`);
    const lid = 'sx-swa-' + m, n = await p.$eval('#' + lid, e => e.children.length);
    if (await p.$eval('#' + lid, e => e.hidden)) problems.push(`${tag}: ${lid} hidden in its own mode`);
    if (await p.$$eval('ol[id^=sx-swa-]', xs => xs.filter(x => !x.hidden).length) !== 1) problems.push(`${tag}: more than one swa list shown`);
    if (await p.$eval('#swaScrub', e => +e.max) !== n * 100) problems.push(`${tag}: #swa ${m} scrubber covers a different number of steps than its list (${n})`);
    for (let k = 0; k < n; k++) await p.$eval('#swaFwd', e => e.click());
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${lid} does not mark the last step (${cur})`);
    if (await p.$eval('#swaPlay', e => e.getAttribute('aria-label')) === 'Pause') problems.push(`${tag}: #swa kept playing after a reader control`);
    if (shoot && m === 'mha') await (await p.$('#swa')).screenshot({ path: `${shots}/x-swa-mha-last-${scheme}-${width}.png` });
  }
  if (width === 1400) { // the numbers the step lists write are what the page's data gives
    const r = await p.evaluate(PP => { const out = [], M = v => (v / 1e6).toFixed(1) + 'M', Mi = v => Math.round(v / 1e6).toLocaleString('en-GB') + 'M', B = (v, d) => (v / 1e9).toFixed(d) + 'B', G = v => (v / 2 ** 30).toFixed(v < 50 * 2 ** 30 ? 1 : 0) + ' GiB';
      const li = (lid, k) => document.getElementById(lid).children[k].textContent.replace(/\s+/g, ' ');
      const need = (lid, k, x) => { if (!li(lid, k).includes(String(x))) out.push(`${lid} item ${k + 1} lacks "${x}"`) };
      const { m7, x7, l3, s4, m35 } = MI;
      for (const k of ['m7', 'x7', 'l3', 's4', 'm35']) { if (Math.abs(MI[k].lt / 1e9 - PP[k].lt) > 1e-3) out.push(`${k} layer total ${MI[k].lt} against parts_params ${PP[k].lt}`); if (Math.abs(MI[k].la / 1e9 - PP[k].la) > 1e-3) out.push(`${k} layer active ${MI[k].la} against parts_params ${PP[k].la}`) }
      need('sx-mix', 0, M(m7.attn)); need('sx-mix', 0, M(m7.ex)); need('sx-mix', 0, 'all ' + m7.L);
      need('sx-mix', 1, m7.nh + ' query heads'); need('sx-mix', 1, m7.nkv + ' key-value heads'); need('sx-mix', 1, m7.win.toLocaleString('en-GB'));
      need('sx-mix', 2, '3 × 4,096 × 14,336 = ' + M(x7.ex)); need('sx-mix', 2, x7.E + ' experts');
      need('sx-mix', 3, '4,096 × 8 = ' + x7.router.toLocaleString('en-GB')); need('sx-mix', 3, M(2 * x7.ex)); need('sx-mix', 3, Mi(6 * x7.ex));
      need('sx-mix', 4, B(x7.tot, 1) + ' stored'); need('sx-mix', 4, B(x7.act, 1) + ' read'); need('sx-mix', 4, B(m7.tot, 2)); need('sx-mix', 4, B(m7.emb, 2));
      need('sx-now', 0, '3 × 7,168 × 4,096 = ' + M(l3.ex)); need('sx-now', 0, B(l3.moeLayerT, 2)); need('sx-now', 0, M(s4.ex) + ' against ' + M(x7.ex)); need('sx-now', 0, Mi(s4.moeLayerT));
      need('sx-now', 0, '3 × 12,288 × 28,672 = ' + Mi(m35.ex)); need('sx-now', 0, Mi(m35.moeLayerA) + ' with attention'); need('sx-now', 0, 'first 3 are dense');
      need('sx-now', 1, Mi(l3.moeLayerA) + ' of a layer\'s ' + B(l3.moeLayerT, 2)); need('sx-now', 1, Mi(s4.moeLayerA) + ' of ' + Mi(s4.moeLayerT));
      if (Math.abs(l3.moeLayerA / l3.moeLayerT - .05) > .01 || Math.abs(s4.moeLayerA / s4.moeLayerT - .05) > .01) out.push('the "about 5%" is off');
      need('sx-now', 2, Mi(m35.moeLayerA)); need('sx-now', 2, (m35.moeLayerA / l3.moeLayerA).toFixed(1) + ' times'); need('sx-now', 2, m35.L + ' layers to Large 3\'s ' + l3.L);
      need('sx-now', 3, B(l3.lt, 1) + ' stored and ' + B(l3.la, 1) + ' read'); need('sx-now', 3, B(s4.lt, 1) + ' and ' + B(s4.la, 1)); need('sx-now', 3, B(m35.lt, 1) + ', all read'); need('sx-now', 3, Math.round(m35.la / s4.la) + ' times the work');
      need('sx-now', 4, (l3.kvTok / 1024).toFixed(1) + ' KiB, ' + (s4.kvTok / 1024).toFixed(1) + ' KiB and ' + m35.kvTok / 1024 + ' KiB'); need('sx-now', 4, G(l3.kv256) + ', ' + G(s4.kv256) + ' and ' + G(m35.kv256));
      return out }, PP);
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  await audit('end');
  for (const t of ['t-fit', 't-more']) { await p.click(`#tabs button[data-t="${t}"]`); await wait(300); await audit(t, t); }
  await p.click('#tabs button[data-t="t-read"]');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file);
  for (const id of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  await p.$eval('#swa', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
  { const r = await p.$eval('#swa', e => [+e.dataset.frames || 0, document.getElementById('swaPlay').getAttribute('aria-label')]); if (r[0] > 0 || r[1] === 'Pause') problems.push(`reduced motion: #swa moved by itself (${r})`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
} finally { await b.close(); }
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
