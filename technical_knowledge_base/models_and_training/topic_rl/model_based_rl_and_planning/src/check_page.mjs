// Drive every control of the built page in headless Chrome: no script errors, no NaN or undefined in any text; element screenshots in ../.shots/.
// usage (from src/): node check_page.mjs [light|dark] [width]   (needs html_utils' node_modules)
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
const shot = async (sel, name) => { const el = await p.$(sel); if (el) await el.screenshot({ path: path.join(out, 'c-' + name + '-' + scheme + '-' + width + '.png') }) };
const slide = async (id, v) => p.evaluate((id, v) => { const s = document.getElementById(id); s.value = v; s.dispatchEvent(new Event('input')) }, id, v);
const view = async id => { await p.evaluate(id => document.getElementById(id).scrollIntoView(), id); await wait(500) };
// Reading: Dyna animation
await view('rd-dq');
for (const n of ['0', '5', '50']) { await p.click(`#rd-dqM button[data-n="${n}"]`); for (const v of [0, 5, 20, 1e6]) { await slide('rd-dqC-s', v); await bad('dq ' + n + ' ' + v) } await slide('rd-dqC-s', 12); await shot('#rd-dq', 'dq-' + n) }
await view('rd-f82'); await shot('#rd-f82', 'f82');
await view('rd-f845'); await p.waitForFunction(() => /Blocking maze at step/.test(document.getElementById('rd-f845R').textContent), { timeout: 120000 }); await bad('f845'); await shot('#rd-f845', 'f845');
const f845 = await p.evaluate(() => document.getElementById('rd-f845R').innerText);
// MCTS stepper
await view('rd-mc');
for (const m of ['uct', 'p0', 'p60']) { await p.click(`#rd-mcM button[data-m="${m}"]`); for (const v of [0, 1, 2, 3, 10, 30, 1e6]) { await slide('rd-mcC-s', v); await bad('mc ' + m + ' ' + v) } await slide('rd-mcC-s', 2); await shot('#rd-mc', 'mc-' + m + '-sim'); await slide('rd-mcC-s', 1e6); await shot('#rd-mc', 'mc-' + m + '-end') }
const mcR = await p.evaluate(() => document.getElementById('rd-mcR').innerText);
// MuZero diagram
await view('rd-mz');
for (const m of ['az', 'mu']) { await p.click(`#rd-mzM button[data-m="${m}"]`); for (const v of [0, 2, 4, 5, 6, 7]) { await slide('rd-mzC-s', v); await bad('mz ' + m + ' ' + v); if (v === 4 || v === 7) await shot('#rd-mz', 'mz-' + m + '-' + v) } }
// pendulum
await view('rd-pd');
for (const m of ['open', 'k5']) { await p.click(`#rd-pdM button[data-m="${m}"]`); for (const v of [0, 10, 30, 50]) { await slide('rd-pdC-s', v); await bad('pd ' + m + ' ' + v) } await shot('#rd-pd', 'pd-' + m) }
await view('rd-pc'); await wait(800); await bad('pc'); await shot('#rd-pc', 'pc');
const pcR = await p.evaluate(() => document.getElementById('rd-pcR').innerText);
// Dyna lab
await p.click('button[data-t=t-dyna]'); await p.waitForFunction(() => /Computed in/.test(document.getElementById('dl-aRep').textContent) && /Computed in/.test(document.getElementById('dl-bRep').textContent), { timeout: 120000 });
await bad('dyna lab'); await shot('#dl-a', 'dla'); await shot('#dl-b', 'dlb');
await p.click('#dl-aN button[data-n="200"]'); await slide('dl-aA', 50); await p.click('#dl-aGo'); await p.waitForFunction(() => /Not the book/.test(document.getElementById('dl-aRep').textContent), { timeout: 120000 }); await bad('dla custom');
await p.click('#dl-bM button[data-m="short"]'); await p.waitForFunction(() => /Shortcut|Page defaults/.test(document.getElementById('dl-bRep').textContent) && document.getElementById('dl-bO').textContent.length > 10, { timeout: 120000 }); await wait(1500); await bad('dlb short'); await shot('#dl-b', 'dlb-short');
await slide('dl-bK', 0); await p.click('#dl-bGo'); await wait(4000); await bad('dlb k0');
// Self-play lab
await p.click('button[data-t=t-zero]'); await wait(1500); await bad('zero'); await shot('#zl-a', 'zla'); await shot('#zl-b', 'zlb'); await shot('#zl-c', 'zlc'); await shot('#zl-d', 'zld');
for (const k of ['0', '1', '3', '10', '60']) { await p.click(`#zl-bK button[data-k="${k}"]`); for (const pr of ['show', 'empty', 'fork', 'win']) { await p.click(`#zl-bP button[data-p="${pr}"]`); await bad('zlb ' + k + ' ' + pr) } }
await p.select('#zl-bS', 'uct'); await p.select('#zl-bN', '800'); await bad('zlb uct 800');
// play a whole game by clicking
await p.click('#zl-bP button[data-p="empty"]'); for (const c of [4, 0, 8, 2, 6, 3, 5, 7, 1]) { const r = await p.$(`#zl-bB rect[data-c="${c}"]`); if (r) await r.click(); await bad('play ' + c) }
await shot('#zl-b', 'zlb-end'); await p.click('#zl-bU'); await bad('undo');
const zc = await p.evaluate(() => document.getElementById('zl-cT').innerText.replace(/\t/g, ' | '));
await p.click('button[data-t=t-more]'); await wait(200); await bad('more');
console.log(JSON.stringify({ scheme, width, errors: errs, f845, mcR, pcR, zc }, null, 1));
await b.close();
