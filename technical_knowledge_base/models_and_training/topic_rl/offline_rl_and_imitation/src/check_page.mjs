// Drive every control of the built page in headless Chrome at 390 px dark, 920 px light and 1400 px light: no script errors, no NaN, undefined or Infinity
// in the visible tab's text, no sideways scroll, error box hidden. Element screenshots land in ../.shots/el-*.png.
// Motion (Khalid, 2026-11-06; replaces the old no-autoplay assertion): every 3D stage plays by itself once scrolled into view, stepping reaches its last step,
// its step list has one item per step, and under prefers-reduced-motion nothing moves by itself. The step lists' default numbers are checked against the engine.
// usage (from the page folder or anywhere): node src/check_page.mjs [quick]
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../../../../..');
const puppeteer = createRequire(path.join(root, 'html_utils/package.json'))('puppeteer');
const page = path.resolve(here, '../index.html'), shots = path.resolve(here, '../.shots'); fs.mkdirSync(shots, { recursive: true });
const quick = process.argv[2] === 'quick';
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
let fails = 0, probes = 0; const say = (...a) => console.log(...a), sleep = ms => new Promise(r => setTimeout(r, ms));
const STAGES = ['stg-hero', 'stg-dv', 'stg-xq'];
for (const [scheme, width] of (quick ? [['dark', 390]] : [['dark', 390], ['light', 920], ['light', 1400]])) {
  const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + page); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.reload(); await sleep(400);
  let cur = 't-read';
  const tab = async t => { cur = t; await p.click('button[data-t=' + t + ']'); await sleep(250) };
  const probe = async what => { probes++; const r = await p.evaluate(t => { const x = document.getElementById(t).innerText; return { nan: /\bNaN\b/.test(x), und: /undefined/.test(x), inf: /Infinity/.test(x), side: document.documentElement.scrollWidth > innerWidth, box: (() => { const d = document.getElementById('jsErr'); return d && !d.hidden ? d.textContent : '' })() } }, cur);
    const bad = r.nan || r.und || r.inf || r.side || r.box || errs.length; if (bad) { fails++; say('FAIL', scheme, width, what, JSON.stringify(r), errs.splice(0)) } return !bad };
  const click = async sel => { await p.$eval(sel, e => e.click()) };
  const pick = async (id, v) => { await p.evaluate((id, v) => { const e = document.getElementById(id); e.value = String(v); e.dispatchEvent(new Event('change', { bubbles: true })) }, id, v) };
  const slide = async (id, v) => { await p.evaluate((id, v) => { const e = document.getElementById(id); e.value = String(v); e.dispatchEvent(new Event('input', { bubbles: true })) }, id, v) };
  const shot = async (sel, name) => { const el = await p.$(sel); if (el) { await el.scrollIntoView(); await sleep(150); await el.screenshot({ path: path.join(shots, 'el-' + name + '-' + scheme + '-' + width + '.png') }) } };
  const listOf = id => p.evaluate(id => { const L = document.getElementById(id).closest('.s3sp').querySelector('ol.sx:not(.xq-off)'); return L.id }, id);
  await probe('read open');
  // the split layout at 1400 px: every .s3sp in the Reading tab is two columns
  if (width >= 1100) { probes++; const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display)); if (!cols.length || cols.some(d => d !== 'grid')) { fails++; say('FAIL split', scheme, width, cols) } }
  // the numbers the step lists quote (static text at the defaults) against the page's engine
  if (width === 920) { probes++; const got = await p.evaluate(() => { const O = window.OF3, n = v => RD.n(v, 2), H = O.hero, D = O.dv, X = O.xq;
      return [n(H.aN), n(H.qN), n(H.rN), n(H.aC), n(H.qC), D.bcL, D.dagL, D.cps.join(','), RD.n(D.at[1].bcOut, 3), RD.n(D.at[1].dagOut, 3), n(D.at[3].bcCum), n(D.at[3].dagCum), n(D.bcJ), n(D.dagJ),
        ...['naive', 'bcq', 'cql', 'iql'].flatMap(m => [n(X[m][1].bel), n(X[m][1].tru), n(X[m][1].mode), n(X[m][2].bel), n(X[m][3].bel), n(X[m][3].tru)]), n(X.beh), n(X.bestSup)].join(' ') });
    const want = '1.00 3.26 −0.44 −0.20 0.77 1 15 0,10,25,40,60 0.183 0.040 12.83 1.58 25.55 2.38 2.94 −0.14 1.00 12.03 28.94 −0.14 0.79 7.31 −0.06 3.24 7.80 7.31 0.53 6.36 −0.20 2.17 5.21 6.36 0.73 6.92 −0.09 3.11 7.55 6.92 5.46 9.12';
    if (got !== want) { fails++; say('FAIL step-list numbers\n got  ' + got + '\n want ' + want) }
    // and every number span still shows what the engine gives at the defaults
    probes++; const sp = await p.evaluate(() => [...document.querySelectorAll('[data-dv],[data-xq]')].map(s => s.textContent).join(' ')); if (/NaN|undefined/.test(sp)) { fails++; say('FAIL spans', sp) } }
  // 3D stages: autoplay on view, one list item per step, every item, step to the end, mid and last screenshots, stopped stays stopped, play after reset
  for (const id of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await sleep(2400); probes++;
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) { fails++; say('FAIL stage did not play', scheme, width, id) }
    const modes = id === 'stg-xq' ? ['naive', 'bcq', 'cql', 'iql'] : [null];
    for (const m of modes) {
      if (m) { await click('#xq-M button[data-m="' + m + '"]'); await sleep(300) }
      const lid = await listOf(id), n = await p.$eval('#' + id + ' .stg-r', e => +e.max + 1), lis = await p.$eval('#' + lid, L => L.children.length); probes++;
      if (n !== lis || (m && lid !== 'sx-xq-' + m)) { fails++; say('FAIL stage list', scheme, width, id, m, lid, n, lis) }
      for (let k = 0; k < n; k++) { await p.evaluate((l, k) => document.getElementById(l).children[k].click(), lid, k); await sleep(120); await probe(id + ' ' + (m || '') + ' step ' + (k + 1)) }
      await click('#' + id + '-b'); for (let k = 0; k < n + 1; k++)await click('#' + id + '-f'); await sleep(3800); probes++;
      const shown = await p.$eval('#' + id + ' .stg-st', e => e.textContent); if (shown !== 'step ' + n + ' of ' + n) { fails++; say('FAIL stage end', scheme, width, id, shown) }
      const mid = Math.floor((n - 1) / 2);
      await p.evaluate((l, k) => document.getElementById(l).children[k].click(), lid, mid); await sleep(1800); await shot('#' + id, id + (m ? '-' + m : '') + '-mid');
      await p.evaluate((l, k) => document.getElementById(l).children[k].click(), lid, n - 1); await sleep(1800); await shot('#' + id, id + (m ? '-' + m : '') + '-last');
      const f0 = await p.$eval('#' + id, e => +e.dataset.frames || 0); await sleep(1200); probes++; if ((await p.$eval('#' + id, e => +e.dataset.frames || 0)) !== f0) { fails++; say('FAIL stage kept moving', scheme, width, id) }
    }
    await click('#' + id + '-b'); const f0 = await p.$eval('#' + id, e => +e.dataset.frames || 0); await click('#' + id + '-p'); await sleep(1000); probes++;
    if ((await p.$eval('#' + id, e => +e.dataset.frames || 0)) <= f0) { fails++; say('FAIL stage did not play on play', scheme, width, id) } await click('#' + id + '-p')
  }
  // Fig. 3: a click on an inactive learner's list switches the figure to that learner and that step; the in-text links switch it too
  await click('#xq-M button[data-m="naive"]'); await sleep(200);
  await p.evaluate(() => document.getElementById('sx-xq-cql').children[3].click()); await sleep(400); probes++;
  { const r = await p.evaluate(() => ({ on: document.querySelector('#xq-M button.on').dataset.m, st: document.querySelector('#stg-xq .stg-st').textContent, cur: document.querySelector('#sx-xq-cql li.on') ? [...document.getElementById('sx-xq-cql').children].indexOf(document.querySelector('#sx-xq-cql li.on')) : -1 }));
    if (r.on !== 'cql' || r.st !== 'step 4 of 5' || r.cur !== 3) { fails++; say('FAIL list switch', JSON.stringify(r)) } }
  for (const m of ['bcq', 'iql', 'cql']) { await click('a[data-xq-go="' + m + '"]'); await sleep(200); probes++; if ((await p.$eval('#xq-M button.on', e => e.dataset.m)) !== m) { fails++; say('FAIL link switch', m) } }
  // settings of Figs. 2 and 3 redraw the stages and refill the step lists
  for (const [id, vals] of [['dv-E', ['0.01', '0.05', '0.1', '0.02']], ['dv-H', ['30', '120', '60']], ['dv-R', ['2', '3', '8', '5']]]) for (const v of vals) { await pick(id, v); await sleep(60); await probe('dv ' + id + ' ' + v) }
  await pick('dv-R', '2'); probes++; { const j = await p.evaluate(() => RD.n(window.OF3.dv.dagJ, 1)); if (j !== '21.9') { fails++; say('FAIL dv R2', j) } } await pick('dv-R', '5');
  for (const [id, vals] of [['xq-a', ['1', '10', '0.1']], ['xq-t', ['0.7', '0.99', '0.9']], ['xq-b', ['1', '10', '3']], ['xq-s', ['2', '3', '1']]]) for (const v of (quick ? [vals[0], vals[vals.length - 1]] : vals)) { await pick(id, v); await sleep(60); await probe('xq ' + id + ' ' + v) }
  await pick('xq-a', '10'); probes++; { const r = await p.evaluate(() => { const c = window.OF3.xq.cql[3]; return [RD.n(c.bel, 1), RD.n(c.tru, 1)].join(' ') }); if (r !== '5.4 5.5') { fails++; say('FAIL cql alpha 10', r) } } await pick('xq-a', '0.1');
  // the expectile slider, the static figures, the one-screen table, every closed block
  for (const v of ['0.5', '0.7', '0.99', '0.9']) { await slide('rd-ex', v); await probe('ex ' + v) }
  for (const id of ['rd-exC', 'hz', 'rd-loopC', 'rd-dtC']) await shot('#' + id, id);
  await p.$eval('#rd-spine tr[data-go="rd-cql"]', e => e.click()); await sleep(200); await probe('spine click');
  await p.$$eval('#t-read details', ds => ds.forEach(d => d.open = true)); await probe('details open');
  if (width === 1400) { await p.evaluate(() => scrollTo(0, 0)); await sleep(300); await p.screenshot({ path: path.join(shots, 'el-top-' + scheme + '-' + width + '.png') }) }
  // ---------------- D4RL results ----------------
  await tab('t-d4rl');
  if (width >= 1100) { probes++; const cols = await p.$$eval('#t-d4rl .s3sp', xs => xs.map(x => getComputedStyle(x).display)); if (!cols.length || cols.some(d => d !== 'grid')) { fails++; say('FAIL d4rl split', cols) } }
  for (const s of ['corl_last', 'corl_best', 'corl_o2o', 'iql_t1', 'cql_t1', 'd4rl_t2']) { await click(`#dt-src button[data-s=${s}]`); await probe('dt ' + s);
    if (!quick) { const doms = await p.$$eval('#dt-dom button', bs => bs.map(b => b.dataset.d)); for (const d of doms) { await click(`#dt-dom button[data-d="${d}"]`); await probe('dt ' + s + ' ' + d) } }
    await click('#dt-dom button[data-d=all]'); await click('#dt-tab th[data-c="1"]'); await probe('dt sort ' + s) }
  const ms = await p.$$eval('#dt-m option', o => o.map(x => x.value));
  for (const m of ms) { await pick('dt-m', m); const ds = await p.$$eval('#dt-d option', o => o.map(x => x.value)); for (const d of ds.slice(0, quick ? 1 : 4)) { await pick('dt-d', d); await probe('dt x ' + m + ' ' + d) } }
  await pick('dt-m', 'CQL'); await pick('dt-d', 'hopper-medium-expert'); await shot('#t-d4rl', 'd4rl');
  // ---------------- Further reading ----------------
  await tab('t-more'); await probe('more open');
  await p.close();
}
{ // reduced motion: no stage moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + page); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto('file://' + page);
  for (const id of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await sleep(1500); probes++;
    const r = await p.$eval('#' + id, e => ({ f: +e.dataset.frames || 0, d: +e.dataset.draws || 0, st: e.querySelector('.stg-st').textContent, n: +e.querySelector('.stg-r').max + 1 }));
    await sleep(800); const d2 = await p.$eval('#' + id, e => +e.dataset.draws || 0);
    if (r.f > 0 || r.st !== 'step 1 of ' + r.n || d2 !== r.d) { fails++; say('FAIL reduced motion', id, JSON.stringify(r), d2) } }
  await p.close() }
await b.close(); say('probes', probes, 'fails', fails); process.exit(fails ? 1 : 0);
