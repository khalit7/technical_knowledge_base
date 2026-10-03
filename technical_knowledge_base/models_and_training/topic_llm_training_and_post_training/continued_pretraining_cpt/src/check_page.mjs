// Exercise every control of the CPT page in light 920 px and dark 390 px; screenshot each card; report errors and NaN/undefined text.
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_llm_training_and_post_training/continued_pretraining_cpt/src/check_page.mjs [outdir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const require = createRequire(path.resolve('html_utils/package.json'));
const puppeteer = require('puppeteer');
const here = path.dirname(new URL(import.meta.url).pathname);
const file = path.resolve(here, '../index.html');
const out = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(out, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell', args: process.platform === 'linux' ? ['--no-sandbox'] : [] });
const problems = []; let actions = 0;
const wait = ms => new Promise(r => setTimeout(r, ms));
for (const [scheme, width] of [['light', 920], ['dark', 390]]) {
  const p = await b.newPage();
  p.on('pageerror', e => problems.push(scheme + ' pageerror ' + e.message));
  p.on('console', m => { if (m.type() === 'error') problems.push(scheme + ' console ' + m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + file);
  await p.evaluate(() => { try { localStorage.clear() } catch (e) {} document.querySelector('button[data-t=t-read]').click() });
  const bad = async where => { const t = await p.evaluate(() => document.body.innerText); const m = t.match(/.{0,40}(NaN|undefined|Infinity|null%|\?%).{0,40}/); if (m) problems.push(scheme + ' ' + where + ': ' + m[0]); };
  const click = async (sel, where) => { const els = await p.$$(sel); if (!els.length && !sel.includes(':not')) problems.push(scheme + ' missing ' + sel); for (const e of els) { await e.evaluate(x => { x.scrollIntoView({ block: 'center' }); x.click() }); actions++; await wait(50); await bad(where + ' ' + sel) } };
  const shot = async (sel, name) => { const e = await p.$(sel); if (!e) { problems.push(scheme + ' no ' + sel); return } const h = await e.evaluate(x => x.getBoundingClientRect().height); if (!h) { problems.push(scheme + ' hidden ' + sel); return } await e.evaluate(x => x.scrollIntoView({ block: 'start' })); await wait(150); await e.screenshot({ path: path.join(out, name + '-' + scheme + '.png') }) };
  const setRange = async (sel, v) => { await p.$eval(sel, (e, v) => { e.value = v; e.dispatchEvent(new Event('input')) }, String(v)); actions++; await bad(sel + '=' + v) };
  // forgetting animation: every mode, every step
  for (const m of ['p1.0_r0.0', 'p1.0_r0.25', 'p0.1_r0.0']) {
    await click(`#fgMode button[data-m="${m}"]`, 'fg');
    for (let i = 0; i < 9; i++) await click('#fgCtl-f', 'fg step');
    await shot('#fgCard', 'fg-' + m);
    problems.push('INFO ' + scheme + ' fg ' + m + ': ' + (await p.$eval('#fgCap', e => e.innerText)).replace(/\n/g,' | ').slice(0, 600));
  }
  await click('#fgCtl-b', 'fg back'); await setRange('#fgCtl-s', 3);
  await click('#fgCtl-p', 'play'); await wait(300); await click('#fgCtl-p', 'pause');
  // frontier chart: every set, every point
  for (const s of ['ger405', 'sp405', 'sp10b', 'toy']) {
    await click(`#frSet button[data-s=${s}]`, 'fr');
    const n = await p.$$eval('#frPlot .frp', es => es.length);
    for (let i = 0; i < n; i++) { await p.$$eval('#frPlot .frp', (es, i) => es[i].dispatchEvent(new MouseEvent('click', { bubbles: true })), i); actions++; await bad('fr point ' + s + i) }
    await shot('#frCard', 'fr-' + s);
  }
  for (const m of ['cos', 'const', 'inf']) { await click(`#scMode button[data-m=${m}]`, 'sc'); await shot('#scCard', 'sc-' + m) }
  for (const z of ['460M', '940M', '1.6B', '3.1B']) { await p.select('#cmSize', z); actions++; for (const t of [2, 4, 10, 20, 45, 60]) await setRange('#cmT', t);
    await setRange('#cmT', 20); problems.push('INFO ' + scheme + ' cmr ' + z + ': ' + (await p.$eval('#cmOut', e => e.innerText)).replace(/\n/g, ' | ')) }
  await shot('#cmCard', 'cm');
  for (const t of [1.6, 2, 3, 4, 4.3]) await setRange('#dcT', t);
  await setRange('#dcT', 3); problems.push('INFO ' + scheme + ' dcpt: ' + await p.$eval('#dcOut', e => e.innerText));
  await shot('#dcCard', 'dc');
  // toy tab
  await click('button[data-t=t-toy]', 'tab');
  const cells = await p.$$('#tyGrid .c');
  for (let i = 0; i < cells.length; i++) { await p.$$eval('#tyGrid .c', (es, i) => es[i].click(), i); actions++; await bad('toy cell ' + i);
    for (const s of ['m', '0', '1', '2']) await click(`#tySeed button[data-s="${s}"]:not([hidden])`, 'seed');
    for (const r of ['all', 'cpt']) await click(`#tyRange button[data-r=${r}]`, 'range') }
  await shot('#tyCard', 'toy');
  problems.push('INFO ' + scheme + ' toy findings: ' + (await p.$eval('#tyFind', e => e.innerText)).replace(/\n/g,' | '));
  // recipes tab
  await click('button[data-t=t-rcp]', 'tab');
  for (const v of ['general', 'tok', 'lrr', 'date']) { await p.select('#rcpSort', v); actions++; await bad('sort ' + v) }
  const nrow = await p.$$eval('#rcpTbl tbody tr', es => es.length);
  for (let i = 0; i < nrow; i++) { await p.$$eval('#rcpTbl tbody tr', (es, i) => es[i].click(), i); actions++; await bad('row ' + i) }
  for (const k of ['cpt', 'mid', 'scratch']) { await click(`#t-rcp input[data-k=${k}]`, 'filter'); await click(`#t-rcp input[data-k=${k}]`, 'filter') }
  await shot('#rcpPlot', 'rcp-plot');
  await click('button[data-t=t-more]', 'tab');
  const err = await p.$eval('#jsErr', e => e.hidden ? '' : e.textContent); if (err) problems.push(scheme + ' errbox: ' + err);
  await p.close();
}
await b.close();
console.log(problems.join('\n'));
console.log('actions', actions, 'problems', problems.filter(x => !x.startsWith('INFO')).length);
