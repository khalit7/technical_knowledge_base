// Click every control at 390 px dark and 920 px light; fail on page errors, NaN/undefined/Infinity in visible text,
// sideways scroll. Usage: node check_ui.mjs [shots dir]
import {createRequire} from 'module'; import path from 'path'; import {fileURLToPath} from 'url'; import fs from 'fs';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, '..', '..', '..', '..', '..', 'html_utils', 'package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.join(here, '..', 'index.html'), shots = process.argv[2];
if (shots) fs.mkdirSync(shots, {recursive: true});
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
for (const [w, scheme] of [[390, 'dark'], [920, 'light']]) {
  const b = await puppeteer.launch({headless: 'shell'}); const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.setViewport({width: w, height: 900}); await p.emulateMediaFeatures([{name: 'prefers-color-scheme', value: scheme}, {name: 'prefers-reduced-motion', value: 'reduce'}]);
  await p.goto(file); await sleep(700);
  const bad = async label => {const t = await p.evaluate(() => { const v = [...document.querySelectorAll('.tab:not([hidden])')].map(e => e.innerText).join(' '); return v; });
    const m = t.match(/\bNaN\b|\bundefined\b|Infinity|\bnull\b/g); const sw = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const box = await p.$eval('#jsErr', e => e.hidden ? '' : e.textContent);
    if (m || sw > 0 || errs.length || box) { fails++; console.log('FAIL', w, scheme, label, m, 'sideways', sw, errs.slice(0, 3), box); errs.length = 0; } };
  const clickAll = async sel => { const n = await p.$$eval(sel, e => e.length); for (let i = 0; i < n; i++) { await p.evaluate((s, i) => document.querySelectorAll(s)[i].click(), sel, i); await sleep(60); } return n; };
  const tab = async t => { await p.click('#tabs button[data-t="' + t + '"]'); await sleep(500); };
  // Reading
  await tab('t-read');
  for (const seg of ['#sg-tree-mode', '#sg-ovl-mode', '#sg-cmp-cap']) await clickAll(seg + ' button');
  for (const c of ['sg-tree-ctl', 'sg-ovl-ctl']) { for (let i = 0; i < 20; i++) await p.click('#' + c + '-f'); for (let i = 0; i < 3; i++) await p.click('#' + c + '-b'); await p.select('#' + c + '-v', '2'); }
  await clickAll('#t-read .pr .opts button'); await p.$$eval('#t-read details', d => d.forEach(x => x.open = true)); await sleep(200);
  await bad('reading');
  if (shots) { for (const id of ['sg-tree-card', 'sg-cmp-card', 'sg-ovl-card', 'sg-s4', 'sg-s10']) { const el = await p.$('#' + id); if (el) { await el.scrollIntoView(); await el.screenshot({path: path.join(shots, `${id}_${w}.png`)}); } } }
  // Radix lab
  await tab('t-sgtree');
  for (const tr of ['chat', 'agent', 'rag', 'unique']) { await p.click('#sgt-trace button[data-m="' + tr + '"]'); await sleep(150);
    const mx = await p.$eval('#sgt-cap', e => +e.max); for (let v = 0; v <= mx; v += 3) { await p.$eval('#sgt-cap', (e, v) => { e.value = v; e.dispatchEvent(new Event('input')); }, v); await sleep(120); } }
  await bad('radix lab'); if (shots) await (await p.$('#t-sgtree')).screenshot({path: path.join(shots, `tree_${w}.png`)});
  // Scheduling lab
  await tab('t-sgsched');
  for (const [id, vals] of [['sgs-nq', [32, 144, 256, 96]], ['sgs-nd', [2, 16, 8]], ['sgs-dl', [200, 1600, 800]], ['sgs-cap', [1000, 12000, 3000]], ['sgs-seed', [10, 1]]])
    for (const v of vals) { await p.$eval('#' + id, (e, v) => { e.value = v; e.dispatchEvent(new Event('input')); }, v); await sleep(150); }
  for (const m of ['fcfs', 'lpm', 'dfs-weight', 'random']) { await p.click('#sgs-mode button[data-m="' + m + '"]'); await sleep(100); for (let i = 0; i < 25; i++) await p.click('#sgs-ctl-f'); await p.click('#sgs-ctl-b'); }
  await bad('sched lab'); if (shots) await (await p.$('#t-sgsched')).screenshot({path: path.join(shots, `sched_${w}.png`)});
  // M1
  await tab('t-sgm1'); await bad('m1'); if (shots) await (await p.$('#t-sgm1')).screenshot({path: path.join(shots, `m1_${w}.png`)});
  // vs
  await tab('t-sgvs');
  for (const g of ['#sgv-hw', '#sgv-prec', '#sgv-isl']) { const n = await p.$$eval(g + ' button', e => e.length); for (let i = 0; i < n; i++) { await p.evaluate((g, i) => document.querySelectorAll(g + ' button')[i].click(), g, i); await sleep(120); await bad('vs ' + g + i); } }
  if (shots) await (await p.$('#t-sgvs')).screenshot({path: path.join(shots, `vs_${w}.png`)});
  await tab('t-more'); await bad('more');
  await b.close();
}
console.log(fails ? `FAIL ${fails}` : 'UI OK');
process.exit(fails ? 1 : 0);
