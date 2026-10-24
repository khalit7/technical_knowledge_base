// Exercise every control on the built page (both themes' logic is the same), step through the animation in both
// scenarios and all three robust losses, and fail on any script error, NaN, undefined or Infinity in visible text.
// usage: node src/check_page.mjs (needs html_utils/node_modules)
import { createRequire } from 'module';import path from 'path';import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(HERE, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = path.resolve(HERE, '../index.html');
const b = await puppeteer.launch({ headless: 'shell' });
const p = await b.newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
await p.setViewport({ width: 390, height: 900 });
await p.goto('file://' + file);
const bad = async (where) => { const t = await p.evaluate(() => document.body.innerText); for (const w of ['NaN', 'undefined', 'Infinity']) if (t.includes(w)) errs.push(where + ': ' + w) };
const slide = async (sel, vals) => { for (const v of vals) { await p.evaluate((s, v) => { const e = document.querySelector(s); e.value = v; e.dispatchEvent(new Event('input')) }, sel, v) } };
const clickAll = async sel => { const n = await p.$$eval(sel, a => a.length); for (let i = 0; i < n; i++) await p.evaluate((s, i) => document.querySelectorAll(s)[i].click(), sel, i) };
let steps = 0;
// nothing may move before the reader acts: scroll the animation into view, wait, and its step must still be 0
await p.evaluate(() => document.getElementById('oa-card').scrollIntoView()); await new Promise(r => setTimeout(r, 3500));
const still = await p.evaluate(() => document.getElementById('oa-ctl-s').value); if (still !== '0') errs.push('animation moved by itself: step ' + still);
// Reading
await slide('#pk-t', [1, 50, 99, 90]); await slide('#pk-d', [0, 60, 40]);
await p.evaluate(() => document.getElementById('pk-z').click()); await bad('picker zero');
const mape0 = await p.evaluate(() => document.getElementById('pk-out').innerText);
await p.evaluate(() => document.getElementById('pk-z').click());
for (const sc of ['a', 's']) for (const l of ['huber', 'mae', 'logcosh']) {
  await p.evaluate((sc, l) => { document.querySelector('#oa-sc [data-s="' + sc + '"]').click(); document.querySelector('#oa-l [data-l="' + l + '"]').click() }, sc, l);
  for (let i = 0; i < 6; i++) { await p.evaluate(() => document.getElementById('oa-ctl-f').click()); steps++ }
  await bad('anim ' + sc + ' ' + l);
}
const after = await p.evaluate(() => document.getElementById('oa-cap').innerText);
await p.evaluate(() => document.querySelectorAll('details').forEach(d => d.open = true));
await slide('#zl-c', [0, 24, 3, 12]); await slide('#gn-d', [0, 1000, 500, 171]); await bad('reading');
// Fit a line
await p.evaluate(() => document.querySelector('button[data-t="t-fit"]').click());
await clickAll('#ft-ls input');
for (const d of ['a3', 'a3c', 'st', 'stm', 'own']) { await p.evaluate(d => document.querySelector('#ft-ds [data-d="' + d + '"]').click(), d); await slide('#ft-d', [0, 100, 50]); await slide('#ft-t', [1, 99, 50]); await bad('fit ' + d) }
await clickAll('#ft-ls input'); // all off, then on again
await bad('fit all off'); await clickAll('#ft-ls input');
const svg = await p.$('#ft-svg svg'); const bb = await svg.boundingBox();
for (const [fx, fy] of [[0.5, 0.2], [0.9, 0.9], [0.3, 0.5]]) await p.mouse.click(bb.x + bb.width * fx, bb.y + bb.height * fy);
await bad('fit clicks');
const fitTbl = await p.evaluate(() => document.getElementById('ft-tbl').innerText);
// Loss shapes (Reading since 2026-10-24)
await p.evaluate(() => document.querySelector('button[data-t="t-read"]').click());
for (const v of ['rho', 'psi', 'h']) { await p.evaluate(v => document.querySelector('#sh-rv [data-v="' + v + '"]').click(), v); await clickAll('#sh-rl input'); await slide('#sh-u', [0, 60, 120]); await slide('#sh-d', [0, 100]); await slide('#sh-t', [1, 99]); await clickAll('#sh-rl input') }
for (const v of ['phi', 'pull']) { await p.evaluate(v => document.querySelector('#sh-cv [data-v="' + v + '"]').click(), v); await clickAll('#sh-cl input'); await slide('#sh-m', [0, 80, 160]); await slide('#sh-g', [0, 50, 20]); await clickAll('#sh-cl input') }
await p.evaluate(() => document.getElementById('sh-j2').click());
const focal = await p.evaluate(() => document.getElementById('sh-focal').innerText);
await slide('#sh-e', [51, 75, 99, 90]); await slide('#sh-g2', [0, 50, 20]); await bad('shapes');
// gradient on the logits, ranking
for (const t of ['0', '4']) for (const k of ['ls', 'focal', 'brier']) { await p.evaluate((t, k) => { document.querySelector('#lg-in [data-m="' + t + '"]').click(); document.querySelector('#lg-l [data-m="' + k + '"]').click() }, t, k); await bad('logits ' + t + ' ' + k) }
const lgcap = await p.evaluate(() => document.getElementById('lg-cap').innerText);
await slide('#rk-p', [3, 4, 5, 6, 7, 8, 9, 10]); await bad('ranking');
const rk = await p.evaluate(() => document.getElementById('rk-out').innerText);

await p.evaluate(() => document.querySelector('button[data-t="t-more"]').click()); await bad('more');
const box = await p.evaluate(() => { const d = document.getElementById('jsErr'); return d && !d.hidden ? d.textContent : '' }); if (box) errs.push('errbox: ' + box);
console.log(JSON.stringify({ errs, steps, mape_with_zero_river: mape0.replace(/\n/g, ' ').slice(-60), anim_last_caption: after, fit_table: fitTbl.split('\n').slice(0, 8), focal_at_0968: focal.replace(/\n/g, ' '), logits_last_caption: lgcap, ranking: rk.replace(/\n/g, ' ') }, null, 1));
await b.close();
