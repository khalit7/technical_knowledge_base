// Clicks every control on every tab at 390 dark and 920 light; reports errors, NaN/undefined/(missing) text, sideways scroll;
// screenshots every Reading section and every visual. Writes page_numbers.json (numbers the page computed) for recompute.py.
// Run from the repo root: node technical_knowledge_base/engineering_foundations/topic_databases/caching/src/check_ui.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const require = createRequire(path.resolve('html_utils/package.json'));
const puppeteer = require('puppeteer');
const here = path.dirname(new URL(import.meta.url).pathname);
const file = path.resolve(here, '..', 'index.html');
const out = process.argv[2] || path.resolve(here, '..', '.shots', 'ui');
fs.mkdirSync(out, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell' });
let problems = 0, clicks = 0;
const nums = {};
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + file);
  await sleep(300);
  const bad = async label => {
    const r = await p.evaluate(() => {
      const t = document.body.innerText; const m = t.match(/.{0,40}(NaN|undefined|Infinity|\[object|\(missing\)).{0,40}/);
      const box = document.getElementById('jsErr');
      return { m: m ? m[0] : '', side: document.documentElement.scrollWidth > innerWidth + 1, box: box && !box.hidden ? box.textContent : '' };
    });
    if (r.m || r.side || r.box || errs.length) { problems++; console.log('PROBLEM', scheme, width, label, JSON.stringify(r), errs.splice(0)); }
  };
  const shot = async (sel, name) => { const el = await p.$(sel); if (el) await el.screenshot({ path: `${out}/${name}-${scheme}-${width}.png` }); };
  const setV = async (id, v) => { await p.evaluate((id, v) => { const s = document.getElementById(id); s.value = v; s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true })); }, id, v); clicks++; };
  const clickSeg = async (sel, m) => { await p.evaluate((sel, m) => document.querySelector(`${sel} button[data-m="${m}"]`).click(), sel, m); clicks++; };
  const txt = async sel => p.$eval(sel, e => e.innerText);
  await p.click('button[data-t=t-read]'); await sleep(200);
  const secs = await p.$$eval('#t-read section', es => es.map(e => e.id));
  for (const id of secs) await shot('#' + id, 'sec-' + id);
  if (width === 920) nums.nv = await p.$$eval('.nv[data-n]', es => es.map(e => [e.dataset.n, e.textContent]));
  // section 1
  for (const m of ['rank', 'lorenz']) { await clickSeg('#rd-skew-mode', m); await shot('#rd-skew-card', 'skew-' + m); }
  await bad('skew');
  // section 3: race animation, every mode, every step
  for (const m of ['delete', 'lease', 'version', 'double_delete']) {
    await clickSeg('#rd-race-mode', m);
    const n = await p.$eval('#rd-race-ctl-s', e => +e.max + 1);
    for (let i = 0; i < n; i++) { await setV('rd-race-ctl-s', i); if (i === n - 1 || i === 2) await shot('#rd-race-card', `race-${m}-${i}`); }
    await bad('race ' + m);
  }
  for (const id of ['rd-race-ctl-p', 'rd-race-ctl-f', 'rd-race-ctl-b', 'rd-race-ctl-p']) { await p.click('#' + id); clicks++; await sleep(40); }
  await setV('rd-race-ctl-v', '2');
  if (width === 920) nums.race_tbl = await txt('#rd-race-tbl');
  // section 5: eviction chart per workload
  for (const w of ['wiki6h', 'zipf0.7', 'zipf0.9', 'zipf1.1', 'wiki']) { await clickSeg('#rd-ev-work', w); await shot('#rd-ev-card', 'ev-' + w); }
  await bad('ev');
  if (width === 920) { nums.ev_find = await txt('#rd-ev-find'); nums.cw_tbl = await txt('#rd-cw-tbl'); }
  // section 10: KV calculator
  const nm = await p.$$eval('#rd-kv-model option', o => o.length);
  for (let m = 0; m < nm; m++) for (const c of [0, 3, 5, 7]) { await setV('rd-kv-model', m); await setV('rd-kv-ctx', c); if (width === 920) nums['kv_' + m + '_' + c] = await txt('#rd-kv-out'); }
  await setV('rd-kv-n', 64); await setV('rd-kv-n', 8); await setV('rd-kv-model', 0); await setV('rd-kv-ctx', 5); await shot('#rd-kv-card', 'kv'); await bad('kv');
  // section 11: break-even calculator
  const pm = await p.$$eval('#rd-be-model option', o => o.length);
  for (let m = 0; m < pm; m++) for (const t of [0, 3, 6]) for (const n of [1, 2, 10, 50]) { await setV('rd-be-model', m); await setV('rd-be-tok', t); await setV('rd-be-n', n); if (width === 920 && n === 2 && t === 3) nums['be_' + m] = await txt('#rd-be-out'); }
  await setV('rd-be-model', 0); await setV('rd-be-tok', 3); await setV('rd-be-n', 10); await shot('#rd-be-card', 'be'); await bad('be');
  // section 12: semantic curves
  for (const m of ['bge', 'mini']) for (const d of ['paws', 'qqp']) { await clickSeg('#rd-sem-model', m); await clickSeg('#rd-sem-data', d); await shot('#rd-sem-card', `sem-${m}-${d}`); }
  await bad('sem');
  await p.evaluate(() => document.querySelectorAll('#t-read details').forEach(d => d.open = true)); await bad('details');
  // Cache lab
  await p.click('button[data-t=t-lab]'); await sleep(200); clicks++;
  const works = await p.$$eval('#lab-work option', o => o.map(x => x.value));
  for (const w of works) {
    await setV('lab-work', w);
    for (const c of [0, 1, 2, 3]) {
      await setV('lab-cap', c);
      const pols = await p.$$eval('#lab-pol button', bs => bs.map(x => x.dataset.k));
      for (const k of pols) { await p.evaluate(k => document.querySelector(`#lab-pol button[data-k="${k}"]`).click(), k); clicks++; if (width === 920 && w === 'wiki' && c === 1) nums['lab_' + k] = await txt('#lab-out'); }
    }
  }
  for (const c of [0, 5, 10]) { await setV('lab-c1', c); await setV('lab-c2', c); }
  await setV('lab-work', 'wiki'); await setV('lab-cap', 1); await setV('lab-c1', 2); await setV('lab-c2', 7);
  await p.evaluate(() => document.querySelector('#lab-pol button[data-k="allkeys-lfu"]').click());
  await shot('#t-lab', 'lab'); await bad('lab');
  // Threshold lab
  await p.click('button[data-t=t-sem]'); await sleep(200); clicks++;
  for (const m of ['mini', 'bge']) for (const d of ['qqp', 'paws']) for (const t of [0, 20, 40, 45, 50]) for (const q of [1, 37, 95]) {
    await setV('sem-model', m); await setV('sem-data', d); await setV('sem-t', t); await setV('sem-p', q);
    if (width === 920 && q === 37 && (t === 40 || t === 45)) nums[`semlab_${m}_${d}_${t}`] = await txt('#sem-out');
  }
  for (const c of [0, 5]) for (const w of [0, 6]) { await setV('sem-c', c); await setV('sem-w', w); }
  await setV('sem-model', 'mini'); await setV('sem-data', 'qqp'); await setV('sem-t', 40); await setV('sem-p', 37); await setV('sem-c', 2); await setV('sem-w', 3);
  await shot('#t-sem', 'semlab'); await bad('semlab');
  await p.click('button[data-t=t-more]'); await sleep(200); await shot('#t-more', 'more'); await bad('more');
  await p.close();
}
await b.close();
fs.writeFileSync(path.resolve(here, 'page_numbers.json'), JSON.stringify(nums, null, 1));
console.log('clicks', clicks, 'problems', problems);
