// Check the Scaling calculator tab: JS outputs against scale/recompute.py (data/scale.json), every control and preset
// moved at 390 px dark and 920 px light, no console errors, no NaN/undefined, no sideways page scroll.
// usage: node scale/check_scale.mjs [page.html]   (default: an isolated build from scale/build_iso.sh, so the check
// does not depend on the other tabs being finished; pass ../index.html to check the full page)
import puppeteer from '../../../../../html_utils/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';
import { execSync } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
const HERE = path.dirname(new URL(import.meta.url).pathname), SRC = path.dirname(HERE);
let page = process.argv[2];
if (!page) { page = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sc-')), 'index.html'); execSync(`sh "${HERE}/build_iso.sh" "${page}"`) }
const DATA = JSON.parse(fs.readFileSync(path.join(SRC, 'data', 'scale.json'), 'utf8'));
const LOOSE = new Set(['sN', 'sD', 'sTot', 's_saving', 'cN', 'cD', 'cC', 'breakeven', 'extra']);
let fails = 0, checks = 0;
const bad = m => { fails++; if (fails < 60) console.log('FAIL', m) };
const close = (k, a, b) => { checks++; if (b === null || b === undefined) return a === null || a === undefined;
  const tol = LOOSE.has(k) ? 1e-6 : 1e-9; return Math.abs(a - b) <= tol * Math.max(Math.abs(b), 1e-12) || Math.abs(a - b) < 1e-12 };

const b = await puppeteer.launch({ headless: 'shell', args: process.platform === 'linux' ? ['--no-sandbox'] : [] });
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + path.resolve(page)); await p.click('button[data-t=t-scale]'); await new Promise(r => setTimeout(r, 300));
  const tag = `${scheme} ${width}`;
  const health = async what => {
    const h = await p.evaluate(() => { const t = document.getElementById('t-scale'), txt = t.innerText;
      return { nan: /\bNaN\b|undefined|Infinity/.test(txt), side: document.documentElement.scrollWidth > innerWidth,
        box: (d => d && !d.hidden ? d.textContent : '')(document.getElementById('jsErr')), svgnan: /NaN/.test(t.innerHTML) } });
    if (h.nan || h.svgnan) bad(`${tag} ${what}: NaN/undefined in the tab`); if (h.side) bad(`${tag} ${what}: sideways scroll`);
    if (h.box) bad(`${tag} ${what}: error box: ${h.box}`); checks++ };
  const set = (sel, v, ev) => p.evaluate((sel, v, ev) => { const e = document.querySelector(sel); if (e.type === 'checkbox') e.checked = v; else e.value = v; e.dispatchEvent(new Event(ev || 'input', { bubbles: true })) }, sel, v, ev);
  // 1. presets through the UI, at the state recompute.py used (fit hoff, no inference)
  await set('#sc-fit', 'hoff', 'change'); await set('#sc-inf', 0);
  for (const c of DATA.cases.filter(c => DATA.presets.some(q => q.id === c.name))) {
    await p.click(`#sc-pre button[data-p="${c.name}"]`);
    const got = await p.evaluate(() => [...document.querySelectorAll('#sc-o1 [data-k],#sc-o2 [data-k],#sc-o3 [data-k],#sc-o4 [data-k],#sc-res [data-k]')].map(e => [e.dataset.k, +e.dataset.v]));
    const pr = DATA.presets.find(q => q.id === c.name), o = c.out;
    for (const [k, v] of got) {
      const want = k === 'resC' ? o.C / pr.pubC - 1 : k === 'resH' ? o.hours / pr.pubH - 1 : k === 'mfuImp' ? o.C / (pr.pubH * 3600 * o.peak) : o[k];
      if (!close(k, v, want)) bad(`${tag} preset ${c.name} ${k}: JS ${v} python ${want}`) }
    if (got.length < 18) bad(`${tag} preset ${c.name}: only ${got.length} outputs found`);
    await health('preset ' + c.name) }
  // 2. the presets table against each preset's residuals
  const rows = await p.evaluate(() => [...document.querySelectorAll('#sc-tb tbody tr')].map(r => [r.dataset.p, [...r.querySelectorAll('[data-k]')].map(e => [e.dataset.k, +e.dataset.v, e.dataset.v2 === undefined ? null : +e.dataset.v2])]));
  for (const [id, cells] of rows) { const res = DATA.presets.find(q => q.id === id).res;
    for (const [k, v, v2] of cells) { const k2 = { resC6: 'resCfull', mfu_implied: 'mfu_implied_full' }[k];
      if (!close(k, v, res[k])) bad(`${tag} table ${id} ${k}: JS ${v} python ${res[k]}`);
      if (k2 && !close(k2, v2, res[k2])) bad(`${tag} table ${id} ${k2}: JS ${v2} python ${res[k2]}`) } }
  if (rows.length !== DATA.presets.length) bad(`${tag} table has ${rows.length} rows`);
  // 3. every recompute.py case through SC.compute, and the animation's three allocations for every fit and budget
  const js = await p.evaluate(cases => cases.map(c => window.SC.compute(c.state)), DATA.cases);
  DATA.cases.forEach((c, i) => { for (const k of Object.keys(c.out)) if (!close(k, js[i][k], c.out[k])) bad(`${tag} case ${c.name} ${k}: JS ${js[i][k]} python ${c.out[k]}`) });
  const an = await p.evaluate(D => { const o = {}; for (const fk of Object.keys(D.FITS)) for (const [bk, C] of D.ANIM_BUDGETS) for (const m of ['kap', 'chin', 'over']) o[fk + '|' + bk + '|' + m] = window.SC.animMode(D.FITS[fk], C, m); return o }, DATA);
  for (const [key, modes] of Object.entries(DATA.anim)) for (const [m, want] of Object.entries(modes)) for (const k of Object.keys(want))
    if (!close(k, an[key + '|' + m][k], want[k])) bad(`${tag} anim ${key} ${m} ${k}: JS ${an[key + '|' + m][k]} python ${want[k]}`);
  // 4. move every control
  await p.click('#sc-pre button[data-p="dsv3"]'); await health('dsv3');
  for (const id of ['sc-N', 'sc-Ntot', 'sc-D', 'sc-gpus', 'sc-inf']) for (const v of [0, 1, 250, 500, 999, 1000]) { await set('#' + id, v); await health(id + '=' + v) }
  for (const v of [5, 22.5, 80]) { await set('#sc-mfu', v); await health('mfu ' + v) }
  for (const v of [0.5, 3.35, 12]) { await set('#sc-usd', v); await health('usd ' + v) }
  for (const m of ['dense', 'moe', 'dense', 'moe']) { await p.click(`#sc-kind button[data-m=${m}]`); await health('kind ' + m) }
  for (const m of ['fp8', 'bf16']) for (const a of Object.keys(DATA.ACC)) { await p.click(`#sc-prec button[data-m=${m}]`); await set('#sc-acc', a, 'change'); await health(`acc ${a} ${m}`) }
  for (const f of Object.keys(DATA.FITS)) { await set('#sc-fit', f, 'change'); await health('fit ' + f) }
  await p.evaluate(() => { document.querySelector('#t-scale details.sc-adv').open = true });
  await set('#sc-attn', true, 'change'); for (const [id, v] of [['sc-L', 1], ['sc-L', 400], ['sc-L', 'x'], ['sc-dattn', 64], ['sc-dattn', 131072], ['sc-dattn', -5]]) { await set('#' + id, v, 'change'); await health(id + '=' + v) }
  for (const v of ['2048', '131072', '8192']) { await set('#sc-ctx', v, 'change'); await health('ctx ' + v) }
  await p.click('#sc-pre button[data-p=""]'); await health('custom');
  for (const pr of DATA.presets) { await p.click(`#sc-pre button[data-p="${pr.id}"]`); await health('chip ' + pr.id) }
  await p.click(`#sc-tb button[data-p="smol3"]`); await health('table load');
  // 5. the animation: every mode and budget, scrub through, step, play
  for (const bk of DATA.ANIM_BUDGETS.map(x => x[0])) { await set('#sc-anB', bk, 'change');
    for (const m of ['kap', 'chin', 'over']) { await p.click(`#sc-anM button[data-m=${m}]`);
      for (const v of [0, 50, 120, 199, 260, 333, 420, 499, 500]) { await set('#sc-anScrub', v); await health(`anim ${bk} ${m} ${v}`) } } }
  await p.click('#sc-anBack'); await p.click('#sc-anFwd'); await p.click('#sc-anFwd'); await set('#sc-anSpd', '2', 'change');
  await p.evaluate(() => document.getElementById('sc-an').scrollIntoView()); await p.click('#sc-anPlay'); await new Promise(r => setTimeout(r, 1200));
  const fr = await p.evaluate(() => +document.getElementById('sc-an').dataset.frames || 0); if (!(fr > 5)) bad(`${tag} animation did not advance (${fr} frames)`);
  await health('anim play');
  // 6. resize across the breakpoint
  await p.setViewport({ width: width === 390 ? 700 : 390, height: 900 }); await new Promise(r => setTimeout(r, 200)); await health('resized');
  if (errs.length) bad(`${tag} console: ${errs.join(' | ')}`);
  await p.close() }
await b.close();
console.log(`check_scale: ${checks} checks, ${fails} failures`); process.exit(fails ? 1 : 0);
