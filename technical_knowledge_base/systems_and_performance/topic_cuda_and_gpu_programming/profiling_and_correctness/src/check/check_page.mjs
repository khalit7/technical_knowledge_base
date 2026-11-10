// Clicks every control of the page at 390 px (dark) and 920 px (light); reports page errors, NaN, undefined,
// sideways scroll, prose numbers whose literal differs from the data (data-was), and missing values;
// checks that every 3D stage plays by itself once in view (inverted 2026-11-10); saves element screenshots to the folder given as the first argument (default: ./shots).
// Run from the repo root: node <page>/src/check/check_page.mjs <outdir>
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
const require = createRequire(path.resolve('html_utils/package.json'));
const puppeteer = require('puppeteer');
const here = path.dirname(new URL(import.meta.url).pathname);
const page_ = 'file://' + path.resolve(here, '../../index.html');
const out = process.argv[2] || 'shots';
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
let fail = 0;
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (const [w, scheme] of [[390, 'dark'], [920, 'light']]) {
  const p = await browser.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
  await p.setViewport({ width: w, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(page_, { waitUntil: 'load' });
  await p.click('#tabs button[data-t="t-read"]');
  const shot = async (sel, name) => { const el = await p.$(sel); if (el) { await el.evaluate(x => x.scrollIntoView({ block: 'center' })); await sleep(250); await el.screenshot({ path: `${out}/${name}-${scheme}-${w}.png` }); } else { fail++; console.log('FAIL no element', sel); } };
  const check = async (tag) => {
    const r = await p.evaluate(() => {
      const vis = [...document.querySelectorAll('.tab')].find(t => !t.hidden);
      const txt = vis ? [...vis.querySelectorAll('svg, .stat, td, [data-v], .an-cap, .bars, .out')].map(e => e.textContent).join(' ') : ''; // generated text only: the prose itself mentions NaN
      return { nan: /\bNaN\b/.test(txt), undef: /\bundefined\b/.test(txt), inf: /\bInfinity\b/.test(txt), side: document.documentElement.scrollWidth > innerWidth + 1, err: !document.getElementById('jsErr').hidden ? document.getElementById('jsErr').textContent : '' };
    });
    if (r.nan || r.undef || r.inf || r.side || r.err) { fail++; console.log('FAIL', scheme, w, tag, JSON.stringify(r)); }
  };
  const clickAll = async (sel) => { for (const b of await p.$$(sel)) { await b.evaluate(x => x.scrollIntoView({ block: 'center' })); await b.click(); await sleep(120); } };
  // prose numbers
  const vals = await p.evaluate(() => ({ miss: window.RDV_MISSING, was: [...document.querySelectorAll('[data-was]')].map(e => e.dataset.v + ': html "' + e.dataset.was + '" data "' + e.textContent + '"') }));
  if (vals.miss.length || vals.was.length) { fail++; console.log('FAIL prose values', JSON.stringify(vals)); }
  // the three 3D stages (their own checks are in check_stages.mjs): every mode, stepped to its last step
  for (const [seg, id] of [['#rd-tl-mode', 'stg-time'], ['#rd-walk-mode', 'stg-walk'], ['#rd-sum-mode', 'stg-sum']]) {
    const btns = await p.$$(seg + ' button');
    for (let b = 0; b < btns.length; b++) {
      await btns[b].evaluate(x => x.scrollIntoView({ block: 'center' })); await btns[b].click(); await sleep(100);
      const n = await p.$eval(`#${id}-r`, e => +e.max + 1);
      for (let i = 0; i < n; i++) await p.click(`#${id}-f`);
      await sleep(400); await check(seg + ' ' + b);
      if (id === 'stg-sum' && b === 2) { await p.click('#rd-sum-again'); await sleep(200); await check('another run'); }
    }
  }
  await clickAll('#rd-prof-seg button'); await shot('#rd-prof-card', 'prof-mps'); await p.click('#rd-prof-seg button[data-m="cpu"]'); await shot('#rd-prof-card', 'prof-cpu');
  await clickAll('#t-read .pr button[data-a]'); await check('predict');
  // timeline shapes (rows of the symptom table) and warp stalls (pair switch)
  for (const r of await p.$$('#rd-sym-tab tbody tr')) { await r.evaluate(x => x.scrollIntoView({ block: 'center' })); await r.click(); await sleep(80); await check('sym'); }
  await shot('#rd-sym-card', 'sym');
  await clickAll('#rd-stall-seg button'); await check('stall'); await shot('#rd-stall-card', 'stall');
  await p.click('#rd-stall-seg button[data-m="1"]'); await shot('#rd-hero', 'hero');
  // closed details: open them all (the workbench draws when opened)
  for (const d of await p.$$('#t-read details')) await d.evaluate(x => x.open = true);
  await sleep(400);
  await clickAll('#rd-anat span'); await check('anat');
  for (const s of ['#rd-warm', '#rd-cache', '#rd-dist', '#rd-acc', '#rd-order', '#rd-atom-tab', '#rd-fp8-tab', '#rd-fmt-tab', '#rd-one']) await shot(s, s.slice(1));
  await check('reading');
  // Report reader
  await p.click('#tabs button[data-t="t-ncu"]'); await sleep(200);
  for (const b of await p.$$('#nc-pair button')) { await b.click(); await sleep(150); for (const d of await p.$$('#t-ncu details.sec')) await d.evaluate(x => x.open = true); await clickAll('#t-ncu [data-mn]'); await check('ncu'); }
  await shot('#nc-head', 'ncu-head'); await shot('#nc-body details.sec', 'ncu-sol');
  // Workbench (closed details in Reading section 5, opened above)
  await p.click('#tabs button[data-t="t-read"]'); await sleep(300);
  for (const [id, vs] of [['#nl-fin', ['fp32', 'tf32', 'bf16', 'e4m3', 'e5m2', 'fp16']], ['#nl-fa', ['bf16', 'fp16', 'fp32']], ['#nl-acc', ['pair', 'split', 'seq']], ['#nl-fout', ['bf16', 'fp16', 'fp32']]]) {
    for (const v of vs) { await p.select(id, v); await sleep(250); await check('num ' + id + ' ' + v); }
  }
  await p.$eval('#nl-K', e => { e.value = 16; e.dispatchEvent(new Event('input')); }); await sleep(1500); await check('num K16');
  await p.$eval('#nl-K', e => { e.value = 12; e.dispatchEvent(new Event('input')); }); await sleep(800);
  await shot('#rd-nl-det', 'numlab');
  await p.click('#tabs button[data-t="t-more"]'); await sleep(150); await check('more');
  // inverted 2026-11-10 (the autoplay rule of 2026-11-06): every stage plays by itself once scrolled into view
  const p2 = await browser.newPage(); await p2.setViewport({ width: w, height: 900 }); await p2.goto(page_, { waitUntil: 'load' }); await p2.click('#tabs button[data-t="t-read"]'); await sleep(300);
  for (const c of ['#stg-time', '#stg-walk', '#stg-sum']) { await p2.$eval(c, x => x.scrollIntoView({ block: 'center' })); await sleep(2200); const fr = await p2.$eval(c, x => +x.dataset.frames || 0); if (!(fr > 0)) { fail++; console.log('FAIL no autoplay', c); } }
  await p2.close(); await shot('#t-more', 'more');
  if (errs.length) { fail++; console.log('FAIL console', scheme, w, errs.slice(0, 5)); }
  await p.close();
}
await browser.close();
console.log('check_page:', fail ? fail + ' failures' : 'ok');
process.exit(fail ? 1 : 0);
