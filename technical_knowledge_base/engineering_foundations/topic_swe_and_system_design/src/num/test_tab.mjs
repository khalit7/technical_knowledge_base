// Exercise every control of the Numbers to know tab (t-num) at 390 px dark and 920 px light.
// Reports page errors, NaN/undefined/Infinity in visible text, sideways scroll, and writes the calculator's
// results for every drill plus the time-budget totals to test_out.json (recompute.py compares them).
// Run from the repo root: node technical_knowledge_base/engineering_foundations/topic_swe_and_system_design/src/num/test_tab.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../../..');
const require = createRequire(path.join(root, 'html_utils', 'package.json'));
const puppeteer = require('puppeteer');
const page = path.resolve(here, '../../index.html');
const shots = process.argv[2] || path.resolve(here, '../../.shots');
fs.mkdirSync(shots, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const result = { runs: [] };
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + page);
  await p.click('button[data-t=t-num]');
  await sleep(300);
  const clickAll = async sel => { const n = await p.$$eval(sel, e => e.length); for (let i = 0; i < n; i++) { await p.evaluate((s, i) => document.querySelectorAll(s)[i].click(), sel, i); await sleep(40) } return n };
  const counts = {};
  counts.nav = await clickAll('#nm-nav button');
  counts.grp = await clickAll('#nm-lad-grp button');
  await p.evaluate(() => document.querySelector('#nm-lad-grp button[data-m=all]').click());
  counts.rungs = await clickAll('#nm-lad .nm-rung');
  for (const id of ['nm-lad-cl', 'nm-lad-hu']) { await p.click('#' + id); await sleep(50) }
  await p.screenshot({ path: `${shots}/nm-ladder-human-${scheme}-${width}.png`, clip: await p.$eval('#nm-lad', e => { const r = e.getBoundingClientRect(); return { x: 0, y: r.top + scrollY, width: innerWidth, height: Math.min(1400, r.height) } }) }).catch(() => {});
  for (const id of ['nm-lad-cl', 'nm-lad-hu']) { await p.click('#' + id); await sleep(50) }
  // budget: every scenario, step to the end, back, scrub, play/pause, speed
  const budget = {};
  for (const sc of ['conn', 'offpath', 'cache']) {
    await p.evaluate(s => document.querySelector('#nm-bud-sc button[data-m=' + s + ']').click(), sc);
    await sleep(60);
    const n = await p.$eval('#nm-bud-ctl-s', e => +e.max + 1);
    for (let i = 0; i < n; i++) { await p.click('#nm-bud-ctl-f'); await sleep(20) }
    budget[sc] = JSON.parse(await p.$eval('#nm-bud-card', e => e.dataset.totals));
    if (sc === 'offpath') await p.$eval('#nm-bud-card', e => e.scrollIntoView()).then(() => sleep(100)).then(async () => { const el = await p.$('#nm-bud-card'); await el.screenshot({ path: `${shots}/nm-budget-${scheme}-${width}.png` }) });
    await p.click('#nm-bud-ctl-b'); await p.click('#nm-bud-ctl-p'); await sleep(150); await p.click('#nm-bud-ctl-p');
    await p.$eval('#nm-bud-ctl-s', e => { e.value = 2; e.dispatchEvent(new Event('input')) });
    await p.select('#nm-bud-ctl-v', '2');
  }
  counts.app = await clickAll('#nm-app-t button');
  // availability
  for (let v = 0; v <= 5; v++) await p.$eval('#nm-av', (e, v) => { e.value = v; e.dispatchEvent(new Event('input')) }, v);
  const chain = {};
  chain.default = +(await p.$eval('#nm-chain-out', e => e.dataset.tot));
  await p.$$eval('#nm-chain .nm-cr', es => es.forEach(e => { e.value = '2'; e.dispatchEvent(new Event('change', { bubbles: true })) }));
  chain.all2 = +(await p.$eval('#nm-chain-out', e => e.dataset.tot));
  await p.$$eval('#nm-chain .nm-cin', es => { es[4].checked = false; es[4].dispatchEvent(new Event('change', { bubbles: true })) });
  chain.all2_noapi = +(await p.$eval('#nm-chain-out', e => e.dataset.tot));
  for (const s of ['0.99', '0.9999', '0.999']) await p.select('#nm-eb-slo', s);
  await p.$eval('#nm-eb-req', e => { e.value = '2500000'; e.dispatchEvent(new Event('input')) });
  // drills
  const drills = {};
  const ids = await p.$$eval('#nm-drills button', es => es.map(e => e.dataset.id));
  for (const id of ids) {
    await p.evaluate(i => document.querySelector('#nm-drills button[data-id=' + i + ']').click(), id); await sleep(60);
    drills[id] = JSON.parse(await p.$eval('#nm-est-out', e => e.dataset.json));
    if (id === 'chat') { const el = await p.$('#nm-est-out'); await el.screenshot({ path: `${shots}/nm-est-${scheme}-${width}.png` }) }
  }
  // typing junk into an input must not produce NaN
  await p.$eval('#nm-i-dau', e => { e.value = ''; e.dispatchEvent(new Event('input')) });
  await p.$eval('#nm-i-peak', e => { e.value = '-3'; e.dispatchEvent(new Event('input')) });
  await p.evaluate(() => document.querySelector('#nm-drills button[data-id=chat]').click());
  counts.fix = await clickAll('#nm-fix summary');
  const bad = await p.evaluate(() => { const t = document.getElementById('t-num').innerText; return (t.match(/.{0,40}\b(NaN|undefined|Infinity|null)\b.{0,40}/g) || []) });
  const sideways = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  const box = await p.evaluate(() => { const d = document.getElementById('jsErr'); return d && !d.hidden ? d.textContent : '' });
  if (box) errs.push('error box: ' + box);
  await p.screenshot({ path: `${shots}/nm-full-${scheme}-${width}.png`, fullPage: true });
  result.runs.push({ scheme, width, errs, bad, sideways, counts });
  result.budget = budget; result.drills = drills; result.chain = chain;
  console.log(scheme, width, 'errors', errs, 'bad', bad, 'sideways', sideways, JSON.stringify(counts));
  await p.close();
}
fs.writeFileSync(path.join(here, 'test_out.json'), JSON.stringify(result, null, 1));
await b.close();
