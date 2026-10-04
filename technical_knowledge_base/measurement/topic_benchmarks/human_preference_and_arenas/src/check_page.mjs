// Exercise every control at 390 dark and 920 light, compare the page's numbers with recompute_out.json,
// and screenshot each visual into ../.shots/. Run from src/: node check_page.mjs
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const require = createRequire(path.resolve('../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const here = path.dirname(new URL(import.meta.url).pathname);
const page = path.resolve(here, '../index.html');
const R = JSON.parse(fs.readFileSync(path.join(here, 'recompute_out.json')));
const shots = path.resolve(here, '../.shots'); fs.mkdirSync(shots, { recursive: true });
let fails = 0; const bad = m => { fails++; console.log('FAIL', m) };
const close = (a, b, tol, what) => { if (!(Math.abs(a - b) <= tol)) bad(`${what}: page ${a} vs recompute ${b}`) };
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + page);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const clk = sel => p.$eval(sel, e => e.click());
  const tab = async t => { await clk(`button[data-t=${t}]`); await wait(250) };
  const txt = async sel => p.$eval(sel, e => e.textContent);
  const noBad = async (sel, what) => { const t = await txt(sel); if (/NaN|undefined|Infinity/.test(t)) bad(`${what} shows NaN/undefined`) };
  const shot = async (sel, name) => { const el = await p.$(sel); if (el) await el.screenshot({ path: path.join(shots, `${name}-${scheme}-${width}.png`) }) };
  // Reading
  await tab('t-read');
  const E = await p.evaluate(() => window.HP_CHECK.elo);
  E.bt.forEach((v, i) => close(v, R.lab.bt[i], 0.05, 'elo card BT ' + i));
  const mb = R.lab.mean_bt;
  for (const k of ['time', 'rev', 'shuf']) E.finals[k].forEach((v, i) => close(v, R.lab['elo_' + k][i] - 1000 + mb, 0.05, `elo ${k} ${i}`));
  for (const m of ['time', 'rev', 'shuf']) { await clk(`#rd-elo-seg button[data-m=${m}]`); await wait(100); await noBad('#rd-elo-card', 'elo ' + m) }
  await clk('#rd-elo-ctl-b'); await clk('#rd-elo-ctl-f'); await p.$eval('#rd-elo-ctl-s', e => { e.value = 0; e.dispatchEvent(new Event('input')) }); await noBad('#rd-elo-card', 'elo step0');
  await p.$eval('#rd-elo-ctl-s', e => { e.value = 12; e.dispatchEvent(new Event('input')) });
  await shot('#rd-elo-card', 'elo');
  for (const m of ['raw', 'sc']) { await clk(`#rd-sp-seg button[data-m=${m}]`); await wait(80); await shot('#rd-sp-card', 'spread-' + m) }
  for (const m of ['hard', 'overall']) {
    await clk(`#rd-sty-seg button[data-m=${m}]`); await wait(100);
    for (let s = 0; s < 4; s++) { await p.$eval('#rd-sty-ctl-s', (e, s) => { e.value = s; e.dispatchEvent(new Event('input')) }, s); await wait(60); await noBad('#rd-sty-card', `style ${m} ${s}`) }
    // positions at the last computed step match recompute
    const pos = await p.$$eval('#rd-sty-wrap .sty-row', rs => rs.map(r => [r.querySelector('.nm').title, +r.querySelector('.rk').textContent]));
    const want = R['style_pos_' + m]; pos.forEach(([nm, rk]) => { if (want[nm] && want[nm].osc !== rk) bad(`style ${m} ${nm} pos ${rk} vs ${want[nm].osc}`) });
    await p.$eval('#rd-sty-ctl-s', e => { e.value = 2; e.dispatchEvent(new Event('input')) }); await wait(1000);
    const pos2 = await p.$$eval('#rd-sty-wrap .sty-row', rs => rs.map(r => [r.querySelector('.nm').title, +r.querySelector('.rk').textContent]));
    pos2.forEach(([nm, rk]) => { if (want[nm] && want[nm].sc !== rk) bad(`style ${m} ${nm} sc pos ${rk} vs ${want[nm].sc}`) });
    await shot('#rd-sty-card', 'style-' + m);
  }
  for (const [n, v] of [[1, 500], [50, 3000], [60, 20000]]) {
    await p.$eval('#rd-bon-n', (e, n) => { e.value = n; e.dispatchEvent(new Event('input')) }, n);
    await p.$eval('#rd-bon-v', (e, v) => { e.value = v; e.dispatchEvent(new Event('input')) }, v); await noBad('#rd-bon-card', 'bon');
  }
  await p.$eval('#rd-bon-n', e => { e.value = 50; e.dispatchEvent(new Event('input')) }); await p.$eval('#rd-bon-v', e => { e.value = 3000; e.dispatchEvent(new Event('input')) });
  const bon = await p.evaluate(() => window.HP_CHECK.bon()); close(bon.emax50, R.bon.emax50, 0.002, 'E[max 50]'); close(bon.inf, R.bon.inflation_50_3000, 0.02, 'inflation');
  await shot('#rd-bon-card', 'bon'); await shot('#rd-null-card', 'null');
  for (const m of ['hp', 'r']) for (const same of [true, false]) {
    await clk(`#rd-cap-seg button[data-m=${m}]`); await p.$eval('#rd-cap-same', (e, s) => { e.checked = s; e.dispatchEvent(new Event('change')) }, same); await wait(60);
    await noBad('#rd-cap-card', 'cap'); const t = await txt('#rd-cap-out');
    const key = same ? 'same' : 'all'; const want = m === 'r' ? R.pvc[key].r : R.pvc[key].hp;
    if (!t.includes(want.toFixed(2))) bad(`cap ${m} ${key} expected ${want.toFixed(2)} in "${t}"`);
    if (m === 'r' && !same) { const fw = R.pvc.frontier.r.toFixed(2); if (!t.includes(fw)) bad('cap frontier ' + fw); await shot('#rd-cap-card', 'cap') }
  }
  // Lab
  await tab('t-lab');
  let L = await p.evaluate(() => window.HP_CHECK.lab);
  L.rating.forEach((v, i) => close(v, R.lab.bt[i], 0.05, 'lab BT ' + i));
  L.ci.forEach((c, i) => close((c[1] - c[0]) / 2 / 1.96, R.lab.bt_se[i], 0.01, 'lab BT se ' + i));
  for (const k of [0, 1, 2, 3]) await p.$eval('#lb-s' + k, e => { e.checked = true; e.dispatchEvent(new Event('change')) }); await wait(150);
  L = await p.evaluate(() => window.HP_CHECK.lab);
  L.rating.forEach((v, i) => close(v, R.lab.sc[i], 0.05, 'lab SC ' + i)); L.gamma.forEach((g, i) => close(g, R.lab.gamma[i], 0.0005, 'gamma ' + i));
  L.ci.forEach((c, i) => close((c[1] - c[0]) / 2 / 1.96, R.lab.sc_se[i], 0.01, 'lab SC se ' + i));
  await noBad('#t-lab', 'lab sc'); await shot('#t-lab', 'lab-sc');
  await clk('#lb-ci button[data-m=boot]'); await wait(300); await noBad('#t-lab', 'lab boot');
  await clk('#lb-ties button[data-m=drop]'); await wait(200); await noBad('#t-lab', 'lab drop');
  await p.$eval('#lb-n', e => { e.value = 1000; e.dispatchEvent(new Event('input')) }); await wait(200); await noBad('#t-lab', 'lab n1000');
  await clk('#lb-ci button[data-m=sand]'); await clk('#lb-ties button[data-m=half]'); await p.$eval('#lb-n', e => { e.value = 6000; e.dispatchEvent(new Event('input')) });
  for (const k of [0, 1, 2, 3]) await p.$eval('#lb-s' + k, e => { e.checked = false; e.dispatchEvent(new Event('change')) });
  await clk('#lb-meth button[data-m=elo]'); await wait(100);
  for (const o of ['time', 'rev', 'shuf']) {
    await clk(`#lb-ord button[data-m=${o}]`); await wait(80);
    L = await p.evaluate(() => window.HP_CHECK.lab); L.rating.forEach((v, i) => close(v, R.lab['elo_' + o][i] - 1000 + mb, 0.05, `lab elo ${o} ${i}`));
  }
  await p.$eval('#lb-k', e => { e.value = 32; e.dispatchEvent(new Event('input')) }); await clk('#lb-reshuf'); await wait(80); await noBad('#t-lab', 'lab elo k32'); await shot('#t-lab', 'lab-elo');
  // Board
  await tab('t-board');
  const cats = await p.$$eval('#bd-cat option', o => o.map(x => x.value));
  for (const c of cats) { await p.select('#bd-cat', c); for (const l of ['raw', 'fact', 'sc']) { await clk(`#bd-lens button[data-m=${l}]`); await wait(40); await noBad('#t-board', `board ${c} ${l}`) } }
  await p.select('#bd-cat', 'overall'); await clk('#bd-lens button[data-m=raw]'); await wait(1100); await shot('#t-board', 'board-raw');
  const sw = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth); if (sw) bad('sideways scroll ' + scheme);
  const box = await p.evaluate(() => { const d = document.getElementById('jsErr'); return d && !d.hidden ? d.textContent : '' }); if (box) bad('error box: ' + box);
  if (errs.length) bad(scheme + ' errors ' + errs.join(' | '));
  await p.close();
}
await b.close();
console.log(fails ? `check_page: ${fails} failures` : 'check_page: all checks passed');
process.exit(fails ? 1 : 0);
