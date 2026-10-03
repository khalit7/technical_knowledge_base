// Check the page's JS against recompute.json and exercise every control (NaN, undefined, errors).
// Run from the repo root: node technical_knowledge_base/models_and_training/topic_llm_training_and_post_training/training_infrastructure/src/check_page.mjs
// Needs html_utils/node_modules (cd html_utils && npm ci). Element screenshots go to ../.shots/.
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const page_ = path.resolve(here, '../index.html');
const shots = path.resolve(here, '../.shots'); fs.mkdirSync(shots, { recursive: true });
const R = JSON.parse(fs.readFileSync(path.resolve(here, 'recompute.json'), 'utf8'));
let fail = 0; const bad = m => { fail++; console.log('FAIL', m) };
const clk = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); if (!e) throw new Error('missing ' + s); e.click() }, sel);
const near = (a, b, tol, m) => { if (!(Math.abs(a - b) <= tol)) bad(`${m}: page ${a} vs recompute ${b}`) };

const b = await puppeteer.launch({ headless: 'shell', args: process.platform === 'linux' ? ['--no-sandbox'] : [] });
for (const [scheme, width] of [['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + page_);
  await clk(p, 'button[data-t=t-read]');
  // 1. model against recompute.json
  const got = await p.evaluate(() => {
    const o = { fails: IM.FAILS, sims: {}, calc: {} };
    for (const k of ['sync', 'async', 'mem', 'ft']) { const s = IM.SIM[k]; o.sims[k] = { useful: s.useful, lost: s.lost, stall: s.stall, down: s.down, I: IM.D[k].I } }
    const rf = 419 / (2048 * 54) * 1000;
    for (const g of [16384, 131072]) for (const [w, u] of [[10, 10], [300, 10], [10, 1]]) o.calc[`${g}_${w}s_${u}m`] = IM.calc(g, rf, w, u, true, 60).e;
    return o;
  });
  if (JSON.stringify(got.fails) !== JSON.stringify(R.anim_failures)) bad('failure list differs from recompute.py');
  for (const [k, v] of Object.entries(R.anim.designs)) {
    const s = got.sims[k];
    near(100 * s.useful / 1440, v.goodput_day, 0.051, k + ' goodput'); near(s.lost, v.lost_min, 0.051, k + ' lost');
    near(s.stall, v.stall_min, 0.051, k + ' stall'); near(s.down, v.down_min, 0.051, k + ' down');
    if (v.I_min !== null) near(s.I, v.I_min, 0.006, k + ' interval');
  }
  for (const [k, v] of Object.entries(R.calc)) near(got.calc[k], v, 0.0006, 'calc ' + k);
  // 2. controls
  const scan = async label => {
    const t = await p.evaluate(() => document.body.innerText);
    if (/\bNaN\b|undefined|Infinity/.test(t)) bad(`${label}: NaN/undefined/Infinity in text`);
  };
  // Reading: stack walk, both modes, every step
  for (const m of ['job', 'ft']) {
    await clk(p, `#st-modes button[data-m=${m}]`);
    for (let i = 0; i < 7; i++) { await clk(p, '#st-ctl-f'); }
    await scan('stack ' + m);
  }
  await clk(p, '#st-ctl-b');
  for (const l of ['hw', 'hc', 'sch', 'mg', 'ln', 'cl', 'fw', 'ex']) { await clk(p, `#st-layers .ly[data-l=${l}]`); }
  await scan('stack layers');
  // Reading: day animation, every step, then scrub
  for (let i = 0; i < 10; i++) { await clk(p, '#dy-ctl-f'); await new Promise(r => setTimeout(r, 30)); await scan('day step ' + (i + 1)); }
  await p.$eval('#dy-ctl-s', el => { el.value = 3; el.dispatchEvent(new Event('input')) });
  await new Promise(r => setTimeout(r, 50));
  const cap = await p.$eval('#dy-c', el => el.textContent);
  if (!/Synchronous/.test(cap)) bad('day caption at step 3 missing');
  const card = await p.$('#dy-card'); await card.screenshot({ path: `${shots}/day-${scheme}-${width}.png` });
  await clk(p, '#st-ctl-f'); await clk(p, '#st-ctl-f');
  const sc = await p.$('#st-card'); await sc.screenshot({ path: `${shots}/stack-${scheme}-${width}.png` });
  // Calculator
  await clk(p, 'button[data-t=t-calc]'); await new Promise(r => setTimeout(r, 100));
  for (const sel of ['#cGp button', '#cRp button', '#cWp button']) {
    const n = await p.$$eval(sel, x => x.length);
    for (let i = 0; i < n; i++) { await p.evaluate((s, i) => document.querySelectorAll(s)[i].click(), sel, i); await scan('calc ' + sel + i) }
  }
  for (const id of ['cG', 'cR', 'cW', 'cU', 'cI']) for (const v of ['0', '500', '1000', '1', '60']) {
    await p.$eval('#' + id, (el, v) => { el.value = v; el.dispatchEvent(new Event('input')) }, v); await scan('calc slider ' + id + '=' + v);
  }
  await p.$eval('#cOpt', el => { el.checked = true; el.dispatchEvent(new Event('change')) });
  for (const [id, v] of [['kP', '7'], ['kB', '2'], ['kS', '0.0025'], ['kP', '']]) { await p.$eval('#' + id, (el, v) => { el.value = v; el.dispatchEvent(new Event('input')) }, v); await scan('size ' + id) }
  await p.$eval('#kP', el => { el.value = '405.853'; el.dispatchEvent(new Event('input')) });
  await clk(p, '#cGp button[data-g="16384"]'); await clk(p, '#cRp button[data-r="3.79"]'); await clk(p, '#cWp button[data-w="10"]');
  await p.$eval('#cU', el => { el.value = 10; el.dispatchEvent(new Event('input')) });
  const calc = await p.$('#s-calc'); await calc.screenshot({ path: `${shots}/calc-${scheme}-${width}.png` });
  const sw = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  if (sw) bad(scheme + ' sideways scroll');
  if (errs.length) bad(scheme + ' errors ' + errs.join(' | '));
  const box = await p.evaluate(() => { const d = document.getElementById('jsErr'); return d && !d.hidden ? d.textContent : '' });
  if (box) bad('error box: ' + box);
  await p.close();
}
await b.close();
console.log(fail ? `check_page: ${fail} failures` : 'check_page: all checks pass');
process.exit(fail ? 1 : 0);
