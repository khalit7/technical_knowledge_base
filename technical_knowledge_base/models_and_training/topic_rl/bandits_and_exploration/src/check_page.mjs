// Drive every control of the built page in headless Chrome: no script errors, no NaN or undefined in any text; element screenshots in ../.shots/.
// usage: node src/check_page.mjs [light|dark] [width]   (from the page folder; needs html_utils' node_modules)
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const [scheme = 'light', width = '920'] = process.argv.slice(2);
const out = path.resolve(here, '../.shots'), file = path.resolve(here, '../index.html');
const b = await puppeteer.launch({ headless: 'shell' });
const p = await b.newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
await p.setViewport({ width: +width, height: 1000 });
await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
await p.goto('file://' + file);
const wait = ms => new Promise(r => setTimeout(r, ms));
const bad = async (where) => { const t = await p.evaluate(() => document.body.innerText); const m = t.match(/.{0,40}(NaN|undefined|Infinity).{0,40}/g); if (m) errs.push(where + ': ' + m.slice(0, 3).join(' | ')) };
const shot = async (sel, name) => { const el = await p.$(sel); if (el) await el.screenshot({ path: path.join(out, name + '-' + scheme + '-' + width + '.png') }) };
// Reading: bandit animation, every mode at several steps
await p.evaluate(() => document.getElementById('bd').scrollIntoView()); await wait(400);
for (const k of ['greedy', 'eps', 'opt', 'ucb', 'ts']) { await p.click(`#bd-M button[data-k=${k}]`);
  for (const v of [0, 1, 7, 60, 300]) { await p.evaluate(v => { const s = document.getElementById('bd-C-s'); s.value = v; s.dispatchEvent(new Event('input')) }, v); await bad('bd ' + k + ' ' + v) }
  if (k === 'ts' || k === 'ucb') { await p.evaluate(() => { const s = document.getElementById('bd-C-s'); s.value = 40; s.dispatchEvent(new Event('input')) }); await shot('#bd', 'bd-' + k) } }
for (const sd of ['1', '5']) { await p.select('#bd-S', sd); await bad('bd seed ' + sd) }
// regret chart
await p.evaluate(() => document.getElementById('rg').scrollIntoView()); await p.waitForFunction(() => /Arms/.test(document.getElementById('rg-X').textContent), { timeout: 120000 });
await bad('rg close'); await shot('#rg', 'rg-close'); const rgN = await p.evaluate(() => document.getElementById('rg-N').innerText.replace(/\n+/g, ' / '));
await p.click('#rg-pre button[data-p=far]'); await p.waitForFunction(() => /0\.9, 0\.8/.test(document.getElementById('rg-X').textContent), { timeout: 120000 }); await bad('rg far');
const rgF = await p.evaluate(() => document.getElementById('rg-N').innerText.replace(/\n+/g, ' / '));
// gridworld
await p.evaluate(() => document.getElementById('gx').scrollIntoView()); await wait(300);
for (const m of ['eps', 'cnt', 'opt']) { await p.click(`#gx-M button[data-m=${m}]`); for (const v of [0, 1, 30, 200, 500]) { await p.evaluate(v => { const s = document.getElementById('gx-C-s'); s.value = v; s.dispatchEvent(new Event('input')) }, v); await bad('gx ' + m + ' ' + v) } await shot('#gx', 'gx-' + m) }
await p.select('#gx-S', '3'); await bad('gx seed');
const gxY = await p.evaluate(() => document.getElementById('gx-Y').innerText.replace(/\n+/g, ' / '));
// testbed tab: every figure at 200 tasks, then Fig 2.2 at 2000
await p.click('button[data-t=t-test]'); await wait(200); await p.select('#tb-runs', '200');
const repro = {};
for (const f of ['f22', 'f23', 'f24', 'f25', 'f26', 'fall', 'fns']) { await p.click(`#tb-fig button[data-f=${f}]`);
  await p.waitForFunction(() => /^Done/.test(document.getElementById('tb-stat').textContent), { timeout: 300000 }); await wait(100);
  await bad('tb ' + f); repro[f] = await p.evaluate(() => document.getElementById('tb-repro').innerText); await shot('#t-test', 'tb-' + f) }
await p.click('#tb-fig button[data-f=f22]'); await p.select('#tb-runs', '2000');
await p.waitForFunction(() => /^Done/.test(document.getElementById('tb-stat').textContent), { timeout: 300000 }); await wait(100);
repro.f22_2000 = await p.evaluate(() => document.getElementById('tb-repro').innerText);
await p.click('button[data-t=t-more]'); await bad('more');
const box = await p.evaluate(() => { const d = document.getElementById('jsErr'); return d && !d.hidden ? d.textContent : '' }); if (box) errs.push('errbox: ' + box);
console.log(JSON.stringify({ errs, rgN, rgF, gxY, repro }, null, 1));
await b.close();
