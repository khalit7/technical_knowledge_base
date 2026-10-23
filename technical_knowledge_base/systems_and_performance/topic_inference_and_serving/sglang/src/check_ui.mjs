// Click every control at 390 px dark and 920 px light; fail on page errors, NaN/undefined/Infinity in visible text,
// sideways scroll, or any animation that moves before the reader acts (normal motion). Usage: node check_ui.mjs [shots dir]
import {createRequire} from 'module'; import path from 'path'; import {fileURLToPath} from 'url'; import fs from 'fs';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, '..', '..', '..', '..', '..', 'html_utils', 'package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.join(here, '..', 'index.html'), shots = process.argv[2];
if (shots) fs.mkdirSync(shots, {recursive: true});
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ANIMS = ['sg-tree-ctl', 'sgs-ctl', 'sg-ovl-ctl'];
let fails = 0;
const b = await puppeteer.launch({headless: 'shell', executablePath: process.env.CHROME_PATH || undefined});
// 1. nothing moves before the reader acts (normal motion, every card scrolled into view)
{ const p = await b.newPage(); await p.setViewport({width: 920, height: 900}); await p.goto(file); await sleep(500);
  for (const c of ANIMS) { await p.$eval('#' + c, e => e.scrollIntoView({block: 'center'})); await sleep(1500);
    const v = await p.$eval('#' + c + '-s', e => +e.value); if (v !== 0) { fails++; console.log('FAIL autoplay', c, v); } }
  // a mode toggle must not start playing either
  for (const [seg, c] of [['#sg-tree-mode', 'sg-tree-ctl'], ['#sgs-mode', 'sgs-ctl'], ['#sg-ovl-mode', 'sg-ovl-ctl']]) {
    await p.evaluate(s => document.querySelectorAll(s + ' button')[1].click(), seg); await sleep(1600);
    const v = await p.$eval('#' + c + '-s', e => +e.value); if (v !== 0) { fails++; console.log('FAIL toggle autoplay', c, v); } }
  await p.close(); }
for (const [w, scheme] of [[390, 'dark'], [920, 'light']]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.setViewport({width: w, height: 900}); await p.emulateMediaFeatures([{name: 'prefers-color-scheme', value: scheme}, {name: 'prefers-reduced-motion', value: 'reduce'}]);
  await p.goto(file); await sleep(700);
  const bad = async label => {const t = await p.evaluate(() => [...document.querySelectorAll('.tab:not([hidden])')].map(e => e.innerText).join(' '));
    const m = t.match(/\bNaN\b|\bundefined\b|Infinity|\bnull\b/g); const sw = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const box = await p.$eval('#jsErr', e => e.hidden ? '' : e.textContent);
    if (m || sw > 0 || errs.length || box) { fails++; console.log('FAIL', w, scheme, label, m, 'sideways', sw, errs.slice(0, 3), box); errs.length = 0; } };
  const clickAll = async sel => { const n = await p.$$eval(sel, e => e.length); for (let i = 0; i < n; i++) { await p.evaluate((s, i) => document.querySelectorAll(s)[i].click(), sel, i); await sleep(60); } return n; };
  const setRange = async (id, v) => { await p.$eval('#' + id, (e, v) => { e.value = v; e.dispatchEvent(new Event('input')); }, v); await sleep(120); };
  await p.click('#tabs button[data-t="t-read"]'); await sleep(400);
  await p.$$eval('#t-read details', d => d.forEach(x => { x.open = true; x.dispatchEvent(new Event('toggle')); })); await sleep(300);
  // section 2 and 5 animations: both modes, every step
  for (const [seg, c] of [['#sg-tree-mode', 'sg-tree-ctl'], ['#sg-ovl-mode', 'sg-ovl-ctl']]) {
    const n = await p.$$eval(seg + ' button', e => e.length);
    for (let i = 0; i < n; i++) { await p.evaluate((s, i) => document.querySelectorAll(s + ' button')[i].click(), seg, i); await sleep(80);
      for (let k = 0; k < 20; k++) await p.click('#' + c + '-f'); for (let k = 0; k < 3; k++) await p.click('#' + c + '-b'); await p.select('#' + c + '-v', '2'); } }
  // section 3 lab: every trace, pool sizes
  for (const tr of ['chat', 'agent', 'rag', 'unique']) { await p.click('#sgt-trace button[data-m="' + tr + '"]'); await sleep(150);
    const mx = await p.$eval('#sgt-cap', e => +e.max); for (let v = 0; v <= mx; v += 3) await setRange('sgt-cap', v); await setRange('sgt-cap', mx); }
  await bad('section 3 lab');
  // section 4 lab: sliders, every policy to its last round
  for (const [id, vals] of [['sgs-nq', [32, 144, 256, 96]], ['sgs-nd', [2, 16, 8]], ['sgs-dl', [200, 1600, 800]], ['sgs-cap', [1000, 12000, 3000]], ['sgs-seed', [10, 1]]])
    for (const v of vals) await setRange(id, v);
  for (const m of ['fcfs', 'lpm', 'dfs-weight', 'random']) { await p.click('#sgs-mode button[data-m="' + m + '"]'); await sleep(100); for (let i = 0; i < 25; i++) await p.click('#sgs-ctl-f'); await p.click('#sgs-ctl-b'); }
  await bad('section 4 lab');
  // section 10 chart: every selector
  for (const g of ['#sgv-hw', '#sgv-prec', '#sgv-isl']) { const n = await p.$$eval(g + ' button', e => e.length); for (let i = 0; i < n; i++) { await p.evaluate((g, i) => document.querySelectorAll(g + ' button')[i].click(), g, i); await sleep(120); await bad('vs ' + g + i); } }
  await clickAll('#t-read .pr .opts button');
  await bad('reading');
  if (shots) { await p.click('#sgv-hw button'); await sleep(150);
    for (const id of ['sg-hero-card', 'sg-tree-card', 'sgt-card', 'sgt-diff-det', 'sgm-mt-det', 'sgs-anim-card', 'sg-ovl-card', 'sg-gram-card', 'sg-route-card', 'sgv-card', 'sgm-bug-det']) {
      const el = await p.$('#' + id); if (el) { await el.scrollIntoView(); await sleep(150); await el.screenshot({path: path.join(shots, `${id}_${w}.png`)}); } } }
  await p.click('#tabs button[data-t="t-more"]'); await sleep(300); await bad('more');
  await p.close();
}
await b.close();
console.log(fails ? `FAIL ${fails}` : 'UI OK');
process.exit(fails ? 1 : 0);
