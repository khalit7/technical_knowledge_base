// The 2026-11-06 rollout checks for Positional Encodings (2026-11-10), adapted from Long context's check_stages.mjs: the six 3D stages (Fig. 1 hero,
// Fig. 2 shuffle and probe, Fig. 3 four lanes, Fig. 4 RoPE from zero, Fig. 5 past the trained length, Fig. 6 the methods, the last two for every
// config chip) play by themselves once scrolled into view, step to their last step with one step-list item per step, stop redrawing off screen and
// never move under reduced motion; the running-sequence animation (2D, RD.anim) plays in view and has one list item per step; no errors, NaN,
// undefined or sideways scroll; the splits are two columns at 1400 px and one below 1100 px; the numbers the step lists write are what the page's
// data and RoPE ports give, and the static numbers in the built page equal what the scripts fill in for the default config.
// Screenshots of every step (mid-tween and settled) at 1400 light, and of the middle step at 390 dark, go to the shots dir.
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_llm_architecture/positional_encodings/src/check_stages.mjs [shots dir] [--all] [--only=stg-x] [--fast]
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
const STAGES = ['stg-hero', 'stg-why', 'stg-abs', 'stg-rope', 'stg-past', 'stg-ext'].filter(s => !only || s === only);
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
  const stepAll = async (id, lid, sfx, noshot) => {
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length);
    if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but list ${lid} shows ${lis}`);
    if (n > 8) problems.push(`${tag}: ${id} has ${n} steps, more than about 8`);
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' }));
    for (let k = 0; k < n; k++) {
      if (k) await p.$eval(`#${id}-f`, e => e.click());
      if (shoot && !noshot && (ALL || width === 1400 || k === Math.floor(n / 2))) {
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
  for (const [id, chips] of [['stg-past', 'pe-pastC'], ['stg-ext', 'pe-extC']]) if (STAGES.includes(id)) { // every config chip: same list, replays from step 1
    const ks = await p.$$eval('#' + chips + ' button', bs => bs.map(b => b.dataset.k));
    for (const k of ks.slice(1)) { await p.$eval(`#${chips} button[data-k="${k}"]`, e => e.click()); await wait(200); await stepAll(id, 'sx-' + id.slice(4), '-' + k, ALL ? null : 'none') }
    await p.$eval(`#${chips} button[data-k="${ks[0]}"]`, e => e.click()); await wait(200);
  }
  if (!only) { // the running sequence (2D, RD.anim): one list item per step, plays by itself once in view
    const r = await p.evaluate(() => [document.getElementById('sx-pa').children.length, +document.getElementById('pe-paC-s').max + 1]);
    if (r[0] !== r[1]) problems.push(`${tag}: running-sequence animation has ${r[1]} steps but ${r[0]} list items`);
    await p.evaluate(() => window.scrollTo(0, 0)); await wait(300); await p.$eval('#pe-pa', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const pl = await p.$eval('#pe-paC-p', e => e.getAttribute('aria-label')); if (pl !== 'Pause') problems.push(`${tag}: running-sequence animation did not play in view (${pl})`);
    if (shoot) await (await p.$('#pe-pa')).screenshot({ path: `${shots}/x-pe-pa-${scheme}-${width}.png` });
  }
  if (width === 1400 && !only) { // the numbers the step lists write are what the page's data gives
    const r = await p.evaluate(() => { const out = [], li = (lid, k) => document.getElementById(lid).children[k].textContent.replace(/\s+/g, ' ');
      const need = (lid, k, x) => { if (!li(lid, k).includes(String(x))) out.push(`${lid} item ${k + 1} lacks "${x}"`) };
      const D = PE_DATA, T = 2 * Math.PI, f2 = (v, d) => (+v).toFixed(d == null ? 2 : d), pc = v => Math.round(100 * v) + '%', mn = v => (v < 0 ? '\u2212' : '') + f2(Math.abs(v), 2);
      // Fig. 1: the tiny GPT
      const tp = D.presets.tiny, inv = ROPE.baseInv(tp.base, tp.dim), seen = ROPE.seenArc(tp), nf = seen.filter(a => a >= T - 1e-9).length, y = ROPE.yarn(tp, 8);
      need('sx-hero', 0, Math.round(T / inv[15]).toLocaleString('en-US')); need('sx-hero', 1, 'pairs 0 to ' + (nf - 1)); need('sx-hero', 1, f2(seen[15] * 180 / Math.PI, 1) + ' degrees');
      need('sx-hero', 3, '÷' + f2(inv[1] / y[1], 2)); need('sx-hero', 3, '÷' + Math.round(inv[6] / y[6]));
      const out300 = inv.filter((f, i) => seen[i] < T - 1e-9 && (300 * f) % T > seen[i]).length; if (out300 !== 16 - nf) out.push('hero: ' + out300 + ' pairs out at 300');
      if (y.some((f, i) => seen[i] < T - 1e-9 && (300 * f) % T > seen[i] * (1 + 1e-9)) || y.some((f, i) => seen[i] < T - 1e-9 && (2048 * f) % T > seen[i] * (1 + 1e-9))) out.push('hero: YaRN leaves a pair out');
      // Fig. 2: the probe
      const PM = D.probe.permutation_rel_change_token255_by_block, R2 = D.probe.position_probe_r2_by_block;
      need('sx-why', 0, Math.round(PM.nope[1] * 1e7) + ' × 10'); need('sx-why', 1, pc(PM.nope[2])); need('sx-why', 1, pc(PM.nope[6]));
      need('sx-why', 2, pc(PM.learned[1])); need('sx-why', 2, pc(PM.sinusoidal[1])); need('sx-why', 2, pc(PM.alibi[1])); need('sx-why', 2, pc(PM.rope[1]));
      need('sx-why', 3, f2(R2.learned[0])); need('sx-why', 3, f2(R2.sinusoidal[0])); need('sx-why', 3, mn(R2.nope[0])); need('sx-why', 3, f2(R2.nope[3])); need('sx-why', 3, f2(R2.nope[4]));
      if (Math.max(...R2.rope, ...R2.alibi) > 0.275) out.push('why: RoPE or ALiBi R2 above 0.27');
      // Fig. 3: the four lanes
      need('sx-abs', 0, f2(PESC.content)); need('sx-abs', 1, '+' + f2(PESC.at('sin', 20, 4))); need('sx-abs', 2, mn(PESC.at('alibi', 20, 4)));
      need('sx-abs', 3, f2(-PESC.at('rope', 20, 4))); need('sx-abs', 5, '+' + f2(PESC.at('sin', 276, 4)));
      if (Math.abs(PESC.at('rope', 276, 4) - PESC.at('rope', 20, 4)) > 1e-12) out.push('abs: RoPE moved with the shift');
      // Fig. 4: the same seeded vectors as the scene
      const rng = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 };
      const g = r => { const u = Math.max(1e-12, r()), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) }, Rq = rng(3), Rk = rng(5), q = [], k = [];
      for (let i = 0; i < 32; i++) { q.push(g(Rq)); k.push(g(Rk)) }
      const dot = (m, n) => { let s = 0; for (let i = 0; i < 16; i++) { const a = m * inv[i], b = n * inv[i], q0 = q[2 * i] * Math.cos(a) - q[2 * i + 1] * Math.sin(a), q1 = q[2 * i] * Math.sin(a) + q[2 * i + 1] * Math.cos(a), k0 = k[2 * i] * Math.cos(b) - k[2 * i + 1] * Math.sin(b), k1 = k[2 * i] * Math.sin(b) + k[2 * i + 1] * Math.cos(b); s += q0 * k0 + q1 * k1 } return s };
      need('sx-rope', 2, mn(dot(0, 0))); need('sx-rope', 3, mn(dot(20, 24))); need('sx-rope', 4, mn(dot(120, 124))); need('sx-rope', 5, mn(dot(120, 180)));
      need('sx-rope', 0, f2(Math.cos(1.5), 4)); need('sx-rope', 0, f2(Math.sin(2.5), 4)); need('sx-rope', 0, f2(Math.cos(1), 4));
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
    // the static numbers of the config-driven lists (Llama 3.1 8B in Figs. 5 and 6, YaRN x8 in the running sequence) equal what the scripts fill in
    const src = fs.readFileSync(path.resolve(here, '../index.html'), 'utf8');
    for (const [lid, attr] of [['sx-past', 'pp'], ['sx-ext', 'pp'], ['sx-pa', 'pa']]) {
      const ol = src.slice(src.indexOf('<ol class="sx" id="' + lid + '"'), src.indexOf('</ol>', src.indexOf('id="' + lid + '"')));
      const stat = [...ol.matchAll(new RegExp('data-' + attr + '="([^"]+)">([^<]*)<', 'g'))].map(m => [m[1], m[2]]);
      const live = await p.$$eval('#' + lid + ' [data-' + attr + ']', (xs, attr) => xs.map(x => [x.dataset[attr], x.textContent]), attr);
      if (stat.length !== live.length || !stat.length) problems.push(`${tag}: ${lid} has ${stat.length} static and ${live.length} live numbers`);
      stat.forEach(([k, v], i) => { if (!live[i] || live[i][1] !== v) problems.push(`${tag}: ${lid} ${k} is "${v}" in the page but the data gives "${live[i] && live[i][1]}"`) });
    }
  }
  if (!only) { await audit('end'); for (const t of ['t-spec', 't-more']) { await p.click(`#tabs button[data-t="${t}"]`); await wait(300); await audit(t, t) } await p.click('#tabs button[data-t="t-read"]'); }
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
  if (!only) { await p.$eval('#pe-pa', e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    if ((await p.$eval('#pe-paC-p', e => e.getAttribute('aria-label'))) === 'Pause') problems.push('reduced motion: the running-sequence animation plays by itself'); }
  await p.close();
}
} finally { await b.close(); }
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
