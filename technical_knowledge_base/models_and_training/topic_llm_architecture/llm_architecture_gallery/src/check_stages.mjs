// The 2026-11-06 rollout checks for LLM Architecture Gallery (2026-11-09), adapted from Families and objectives' check_stages.mjs: the six 3D
// stages (Fig. 1 five stacks, Fig. 6 bytes per layer, Fig. 8 windows, Fig. 10 state against cache, Fig. 12 experts, Fig. 14 stack shape) play by
// themselves once scrolled into view, step to their last step with one step-list item per step (at most about 8), stop redrawing off screen and
// never move under reduced motion; the Decode a config animation is a widget (up to 94 frames, the reader picks the model): it never plays by
// itself and opens on its last frame; no errors, NaN, undefined or sideways scroll; the splits are two columns at 1400 px and one below
// 1100 px; the numbers the step lists write are what the page's data (window.AG) gives. Screenshots of every step (mid-tween and settled) at
// 1400 light, and of the middle step at 390 dark, go to the shots dir (outside the repo).
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_llm_architecture/llm_architecture_gallery/src/check_stages.mjs <shots dir> [--all]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const args = process.argv.slice(2), ALL = args.includes('--all');
const file = 'file://' + path.resolve(here, '../index.html'), shots = args.find(a => !a.startsWith('--'));
if (!shots) { console.log('usage: check_stages.mjs <shots dir outside the repo> [--all]'); process.exit(2); }
fs.mkdirSync(shots, { recursive: true });
const STAGES = ['stg-hero', 'stg-store', 'stg-win', 'stg-lin', 'stg-moe', 'stg-stack'];
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
    if (shoot) { await wait(300); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-autoplay-${scheme}-${width}.png` }) }
  }
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(800);
  const offs = () => p.$$eval('.stg', xs => xs.map(x => { const r = x.getBoundingClientRect(); return r.bottom < 0 || r.top > innerHeight ? +x.dataset.draws || 0 : -1 }));
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
      if (shoot && (ALL || width === 1400 || k === Math.floor(n / 2))) {
        await wait(700); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}-midtween-${scheme}-${width}.png` });
        await wait(2700); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-s${k + 1}-${scheme}-${width}.png` })
      } else await wait(250);
    }
    await wait(2800);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
    await audit(`${id} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id} list ${lid} does not mark the last step`);
  };
  for (const id of STAGES) await stepAll(id, 'sx-' + id.slice(4));
  if (width === 1400) { // the numbers the step lists write are what the page's data gives
    const r = await p.evaluate(() => { const out = [], G = window.AG, by = G.by, B = G.fmtB, KiB = 1024, MiB = 2 ** 20, GiB = 2 ** 30, T = 131072;
      const li = (lid, k) => document.getElementById(lid).children[k].textContent.replace(/\s+/g, ' ');
      const need = (lid, k, x) => { if (!li(lid, k).includes(String(x))) out.push(`${lid} item ${k + 1} lacks "${x}"`) };
      const cnt = (r, c) => (r.mix.match(new RegExp('[' + c + ']', 'g')) || []).length, n = v => v.toLocaleString('en-GB');
      const g1 = v => (Math.round(v * 10) / 10).toString(), held = (r, t) => G.cache(r, t, true);
      const L8 = by['Llama 3.1 8B'], V3 = by['DeepSeek V3'], G3 = by['Gemma 3 27B'], QN = by['Qwen3 Next 80B-A3B'], K3 = by['Kimi K3'];
      need('sx-hero', 0, L8.L + ' full-attention layers'); need('sx-hero', 0, B(L8.per.G)); need('sx-hero', 0, B(L8.kv));
      need('sx-hero', 1, V3.L + ' MLA layers'); need('sx-hero', 1, n(V3.per.M) + ' bytes'); need('sx-hero', 1, B(V3.kv)); need('sx-hero', 1, V3.tot + 'B parameters');
      need('sx-hero', 2, cnt(G3, 'S') + ' of its ' + G3.L); need('sx-hero', 2, n(G3.W) + '-token'); need('sx-hero', 2, B(G3.kv)); need('sx-hero', 2, B(G3.kvw));
      need('sx-hero', 3, cnt(QN, 'L') + ' of its ' + QN.L); need('sx-hero', 3, cnt(QN, 'G') + ' attention layers'); need('sx-hero', 3, B(QN.per.G) + ' each'); need('sx-hero', 3, B(QN.kv));
      need('sx-hero', 4, cnt(K3, 'L') + ' Kimi Delta'); need('sx-hero', 4, cnt(K3, 'M') + ' MLA layers'); need('sx-hero', 4, B(K3.kv));
      const L70 = by['Llama 3.1 70B'], Q235 = by['Qwen3 235B-A22B'], OSS = by['GPT-OSS 120B'], G4 = by['Gemma 4 31B'], NL = by['Nemotron 3.5 Lightning 30B-A3B'], V32 = by['DeepSeek V3.2'];
      need('sx-store', 0, B(NL.per.G) + ' (Nemotron 3.5 Lightning, ' + NL.Hkv + ' KV heads of ' + NL.dh); need('sx-store', 0, B(G4.per.S) + " (Gemma 4 31B's windowed layers, " + G4.Hkv + ' KV heads of ' + G4.dh);
      need('sx-store', 1, L70.L + ' × ' + B(L70.per.G) + ' = ' + B(L70.kv)); need('sx-store', 1, Q235.L + ' × ' + B(Q235.per.G) + ' = ' + B(Q235.kv)); need('sx-store', 1, OSS.L + ' × ' + B(OSS.per.G) + ' = ' + B(OSS.kv));
      need('sx-store', 1, cnt(G4, 'S') + ' × ' + G4.per.S / KiB + ' + ' + cnt(G4, 'G') + ' × ' + G4.per.G / KiB + ' = ' + B(G4.kv)); need('sx-store', 1, 'only ' + cnt(NL, 'G') + ' of ' + NL.L); need('sx-store', 1, B(NL.kv) + ' per token');
      need('sx-store', 2, Math.round(G4.kv / NL.kv) + ' times'); need('sx-store', 2, OSS.tot + 'B parameters'); if (!(OSS.kv < L70.kv / 4)) out.push('sx-store item 3: gpt-oss is not under a quarter of Llama 3.1 70B');
      need('sx-store', 3, V32.idx / KiB + ' KiB of indexer keys (' + V32.L + ' × 128 × 2 bytes)');
      const G3s = cnt(G3, 'S') * G3.per.S * G3.W;
      need('sx-win', 0, G3.L + ' layers of ' + B(G3.per.G)); need('sx-win', 0, B(G3.L * G3.per.G * 1024)); need('sx-win', 1, 'Held ' + B(held(G3, 8192))); need('sx-win', 1, B(G3.kv * 8192));
      need('sx-win', 2, B(G3s)); need('sx-win', 2, g1(held(G3, T) / GiB) + ' GiB held'); need('sx-win', 2, '= ' + G3.kv * T / GiB + ' GiB');
      need('sx-win', 3, cnt(OSS, 'S') + ' windowed and ' + cnt(OSS, 'G') + ' global'); need('sx-win', 3, g1(held(OSS, T) / GiB) + ' GiB held against ' + OSS.kv * T / GiB + ' GiB');
      need('sx-win', 4, cnt(G4, 'S') + ' windowed layers keep ' + B(G4.per.S)); need('sx-win', 4, g1(held(G4, T) / GiB) + ' GiB held against ' + G4.kv * T / GiB + ' GiB'); need('sx-win', 4, Math.round(G4.kv / G4.kvw) + ' times');
      const sK = G.stateB(K3), NS = by['Nemotron 3 Super 120B-A12B'];
      need('sx-lin', 0, cnt(K3, 'L') + ' of its ' + K3.L); need('sx-lin', 0, n(K3.st) + ' numbers'); need('sx-lin', 0, Math.round(K3.kv * 4096 / MiB) + ' MiB of cache against ' + Math.round(sK / MiB) + ' MiB');
      need('sx-lin', 1, n(Math.round(sK / K3.kv / 100) * 100)); need('sx-lin', 2, g1(K3.kv * T / GiB) + ' GiB'); if (Math.round(K3.kv * T / sK) !== 8) out.push('sx-lin item 3: the state is not an eighth of the cache');
      need('sx-lin', 3, cnt(NS, 'L') + ' Mamba-2 layers of ' + NS.st * 4 / MiB + ' MiB (' + B(G.stateB(NS)) + ') against ' + (NS.L - cnt(NS, 'LF')) + ' attention layers of ' + B(NS.per.G)); need('sx-lin', 3, n(G.stateB(NS) / NS.kv) + ' tokens');
      const OS = OSS, MO = [[1, OS], [2, V3], [3, K3]];
      need('sx-moe', 0, L8.tot + 'B parameters in all, ' + L8.act + 'B active');
      MO.forEach(([k, r]) => { need('sx-moe', k, r.E + ' experts, ' + r.k + ' per token'); need('sx-moe', k, (r.act % 1 ? r.act.toFixed(1) : r.act) + 'B of ' + (r.tot >= 1000 ? (r.tot / 1000).toFixed(1) + 'T' : r.tot + 'B')) });
      need('sx-moe', 2, 'plus ' + V3.sh + ' shared'); need('sx-moe', 2, 'first ' + (V3.ffn.match(/^d*/)[0].length) + ' of its ' + V3.L); need('sx-moe', 3, 'plus ' + K3.sh + ' shared'); need('sx-moe', 3, (100 * K3.act / K3.tot).toFixed(1) + '%');
      need('sx-moe', 4, V3.k + " of DeepSeek V3's " + V3.E);
      const OU = by['Ouro-Thinking 2.6B'], E2 = by['Gemma 4 E2B'], E4 = by['Gemma 4 E4B'], LC = by['LongCat-Flash-Lite 68.5B-A3B'], NB = by['Nanbeige 4.2 3B'];
      const cfgL = r => (r.fields && (r.fields.num_hidden_layers || r.fields.num_layers)) || r.L, kept = r => (r.L - (r.shared || 0)) * (r.passes || 1);
      need('sx-stack', 0, '(' + L8.L + ' × ' + n(L8.D) + ')'); need('sx-stack', 0, '(' + K3.L + ' × ' + n(K3.D) + ')');
      need('sx-stack', 1, OU.L + ' layers ' + OU.passes + ' times'); need('sx-stack', 1, B(OU.kv / OU.passes) + ' per pass, ' + B(OU.kv)); need('sx-stack', 1, NB.L + ' layers twice');
      need('sx-stack', 2, 'last ' + E2.shared + ' of ' + E2.L); need('sx-stack', 2, kept(E2) + ' caches, ' + B(E2.kv)); need('sx-stack', 2, 'last ' + E4.shared + ' of ' + E4.L);
      need('sx-stack', 3, cfgL(LC) + ' layers in the config, ' + LC.L + ' caches, ' + B(LC.kv));
      need('sx-stack', 4, cfgL(OU) + ' layers and ' + kept(OU) + ' caches'); [[NB, 'Nanbeige 4.2'], [LC, 'LongCat-Flash-Lite'], [E4, 'Gemma 4 E4B'], [E2, 'Gemma 4 E2B']].forEach(([r, nm]) => need('sx-stack', 4, nm + ' ' + cfgL(r) + ' and ' + kept(r)));
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  await audit('end');
  // the Decode a config animation is a widget: it never plays by itself and opens on its last frame
  await p.click('#tabs button[data-t="t-dec"]'); await wait(300); await p.$eval('#dc-an', e => e.scrollIntoView({ block: 'center' })); await wait(1800);
  if ((await p.$eval('#dc-anCtl-p', e => e.getAttribute('aria-label'))) === 'Pause') problems.push(`${tag}: the Decode a config animation played by itself`);
  { const at = await p.$eval('#dc-anCtl-s', s => [+s.value, +s.max]); if (at[0] !== at[1]) problems.push(`${tag}: the Decode a config animation does not open on its last frame (${at})`) }
  const dcols = await p.$$eval('#t-dec .s3sp, #t-cmp .s3sp', xs => xs.map(x => getComputedStyle(x).display)); if (width === 1400 && dcols.some(c => c !== 'grid')) problems.push(`${tag}: a Decode or Compare split is not two columns`);
  await audit('t-dec', 't-dec');
  await p.click('#tabs button[data-t="t-cmp"]'); await wait(300); await audit('t-cmp', 't-cmp');
  await p.click('#tabs button[data-t="t-more"]'); await wait(300); await audit('t-more', 't-more'); await p.click('#tabs button[data-t="t-read"]');
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
  await p.click('#tabs button[data-t="t-dec"]'); await wait(300); await p.$eval('#dc-an', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
  if ((await p.$eval('#dc-anCtl-p', e => e.getAttribute('aria-label'))) === 'Pause') problems.push('reduced motion: the Decode a config animation plays by itself');
  await p.close();
}
} finally { await b.close(); }
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
