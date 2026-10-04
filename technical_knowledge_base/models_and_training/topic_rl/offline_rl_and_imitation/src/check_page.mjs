// Drive every control of the built page in headless Chrome: no script errors, no NaN or undefined in any text; element screenshots in ../.shots/.
// usage: node src/check_page.mjs [light|dark] [width]   (from the page folder; needs html_utils' node_modules)
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const [scheme = 'light', width = '920'] = process.argv.slice(2);
const out = path.resolve(here, '../.shots'), file = path.resolve(here, '../index.html'); fs.mkdirSync(out, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell' });
const p = await b.newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
await p.setViewport({ width: +width, height: 1000 });
await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
await p.goto('file://' + file);
const wait = ms => new Promise(r => setTimeout(r, ms));
const bad = async (where) => { const t = await p.evaluate(() => document.body.innerText); const m = t.match(/.{0,40}(NaN|undefined|Infinity).{0,40}/g); if (m) errs.push(where + ': ' + m.slice(0, 3).join(' | ')) };
const shot = async (sel, name) => { const el = await p.$(sel); if (el) await el.screenshot({ path: path.join(out, name + '-' + scheme + '-' + width + '.png') }) };
const scrub = async (id, v) => p.evaluate((id, v) => { const s = document.getElementById(id); s.value = v; s.dispatchEvent(new Event('input')) }, id, v);
const info = {};
// driving animation
await p.evaluate(() => document.getElementById('dv').scrollIntoView()); await wait(300);
for (const m of ['bc', 'dag']) { await p.click(`#dv-M button[data-m=${m}]`);
  for (const v of [0, 1, 15, 30, 60]) { await scrub('dv-C-s', v); await bad('dv ' + m + ' ' + v) }
  await scrub('dv-C-s', 40); await shot('#dv', 'dv-' + m); info['dv ' + m] = await p.evaluate(() => document.getElementById('dv-N').innerText.replace(/\n+/g, ' / ')) }
for (const [id, vals] of [['dv-E', ['0.01', '0.05', '0.1', '0.02']], ['dv-H', ['30', '120', '60']], ['dv-R', ['2', '3', '8', '5']]]) for (const v of vals) { await p.select('#' + id, v); await scrub('dv-C-s', 20); await bad('dv ' + id + ' ' + v) }
await p.select('#dv-R', '2'); await scrub('dv-C-s', 60); info['dv dag R2'] = await p.evaluate(() => document.getElementById('dv-N').innerText.replace(/\n+/g, ' / ')); await p.select('#dv-R', '5');
await p.evaluate(() => document.getElementById('hz').scrollIntoView()); await wait(200); await shot('#hz', 'hz'); await bad('hz');
// extrapolation animation
await p.evaluate(() => document.getElementById('xq').scrollIntoView()); await wait(300);
for (const m of ['naive', 'bcq', 'cql', 'iql']) { await p.click(`#xq-M button[data-m=${m}]`);
  for (const v of [0, 1, 5, 40]) { await scrub('xq-C-s', v); await bad('xq ' + m + ' ' + v) }
  await shot('#xq', 'xq-' + m); info['xq ' + m] = await p.evaluate(() => document.getElementById('xq-N').innerText.replace(/\n+/g, ' / ')) }
for (const [id, vals] of [['xq-a', ['1', '10', '0.1']], ['xq-t', ['0.7', '0.99', '0.9']], ['xq-b', ['1', '10', '3']], ['xq-s', ['2', '3', '1']]]) for (const v of vals) { await p.select('#' + id, v); for (const m of ['cql', 'iql', 'naive']) { await p.click(`#xq-M button[data-m=${m}]`); await scrub('xq-C-s', 40); await bad('xq ' + id + ' ' + v + ' ' + m) } }
// play briefly
await p.click('#xq-C-p'); await wait(1500); await p.click('#xq-C-p'); await bad('xq play');
// D4RL tab
await p.click('button[data-t=t-d4rl]'); await wait(200);
for (const s of ['corl_last', 'corl_best', 'corl_o2o', 'iql_t1', 'cql_t1', 'd4rl_t2']) { await p.click(`#dt-src button[data-s=${s}]`); await bad('dt ' + s);
  const doms = await p.$$eval('#dt-dom button', bs => bs.map(b => b.dataset.d)); for (const d of doms) { await p.click(`#dt-dom button[data-d=${d}]`); await bad('dt ' + s + ' ' + d) }
  await p.click('#dt-dom button[data-d=all]'); await p.click('#dt-tab th[data-c="1"]'); await bad('dt sort ' + s); await shot('#t-d4rl', 'dt-' + s) }
const ms = await p.$$eval('#dt-m option', o => o.map(x => x.value));
for (const m of ms) { await p.select('#dt-m', m); const ds = await p.$$eval('#dt-d option', o => o.map(x => x.value)); for (const d of ds.slice(0, 4)) { await p.select('#dt-d', d); await bad('dt x ' + m + ' ' + d) } }
await p.select('#dt-m', 'CQL'); await p.select('#dt-d', 'hopper-medium-expert'); info.x = await p.evaluate(() => document.getElementById('dt-x').innerText.replace(/\n+/g, ' / ')); await shot('#dt-x', 'dt-x');
await p.click('button[data-t=t-more]'); await bad('more'); await shot('#t-more', 'more');
const box = await p.evaluate(() => { const d = document.getElementById('jsErr'); return d && !d.hidden ? d.textContent : '' }); if (box) errs.push('errbox: ' + box);
console.log(JSON.stringify({ errs, info }, null, 1));
await b.close();
