// Click every control of the Method atlas (t-atlas) and Taxonomy (t-tax) tabs at 390 px dark and 920 px light:
// no console errors, no NaN / undefined / null / Infinity in the text or SVG attributes, no sideways page scroll,
// no text sticking out of an SVG, error box hidden. Also checks the grid against data/atlas.json.
// Screenshots go to ../../.shots/at-*.png and tx-*.png (gitignored).
// usage: node src/atlas/check_atlas.mjs   (puppeteer from html_utils/node_modules)
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../../..');
const require = createRequire(path.join(root, 'html_utils', 'package.json'));
const puppeteer = require('puppeteer');
const page = path.resolve(here, '../../index.html');
const shots = path.resolve(here, '../../.shots');
fs.mkdirSync(shots, { recursive: true });
const data = JSON.parse(fs.readFileSync(path.resolve(here, '../data/atlas.json'), 'utf8'));
const wait = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined, args: process.platform === 'linux' ? ['--no-sandbox'] : [] });
let clicks = 0;
const allProbs = [];
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.evaluateOnNewDocument(() => { try { localStorage.clear() } catch (e) {} });
  await p.goto('file://' + page);
  const probs = [];
  const check = async (label, tab) => {
    const r = await p.evaluate(tab => {
      const el = document.getElementById(tab);
      const t = el.innerText;
      const m = t.match(/.{0,30}\b(NaN|undefined|null|Infinity)\b.{0,30}/);
      const box = document.getElementById('jsErr');
      const svgBad = [...el.querySelectorAll('svg *')].some(e => [...e.attributes].some(a => /NaN|undefined|Infinity/.test(a.value)));
      let out = 0;
      el.querySelectorAll('svg').forEach(s => { const sb = s.getBoundingClientRect(); s.querySelectorAll('text').forEach(tx => { const r = tx.getBoundingClientRect(); if (r.width && (r.left < sb.left - 1 || r.right > sb.right + 1)) out++ }) });
      return { bad: m ? m[0] : '', side: document.documentElement.scrollWidth > innerWidth, box: box && !box.hidden ? box.textContent : '', svgBad, out };
    }, tab);
    if (r.bad) probs.push(label + ': text "' + r.bad + '"');
    if (r.side) probs.push(label + ': sideways scroll');
    if (r.box) probs.push(label + ': error box ' + r.box);
    if (r.svgBad) probs.push(label + ': NaN in an SVG attribute');
    if (r.out) probs.push(label + ': ' + r.out + ' SVG labels outside their SVG');
  };
  const clickAll = async (sel, label, tab, max = 9999) => {
    const n = await p.$$eval(sel, es => es.length);
    for (let i = 0; i < Math.min(n, max); i++) {
      await p.evaluate((s, i) => { const e = document.querySelectorAll(s)[i]; if (e) e.dispatchEvent(new MouseEvent('click', { bubbles: true })) }, sel, i);
      clicks++;
    }
    await check(label, tab);
    return n;
  };
  // ---------------- atlas ----------------
  await p.click('button[data-t=t-atlas]');
  await wait(300);
  await check('atlas open', 't-atlas');
  const g = await p.evaluate(() => ({ rows: document.querySelectorAll('#at-wrap tbody tr').length, cells: document.querySelectorAll('#at-wrap td[data-c]').length, nodes: document.querySelectorAll('#at-lin g.nd').length, edges: document.querySelectorAll('#at-lin path.eh').length, mapc: document.querySelectorAll('#at-map .mc').length }));
  const nEdges = data.rows.reduce((s, r) => s + (r.cells.fixed.from || []).length, 0);
  if (g.rows !== data.rows.length || g.cells !== data.rows.length * data.columns.length) probs.push(`grid ${g.rows} rows ${g.cells} cells, data ${data.rows.length} x ${data.columns.length}`);
  if (g.nodes !== data.rows.length || g.edges !== nEdges) probs.push(`lineage ${g.nodes} nodes ${g.edges} edges, data ${data.rows.length} / ${nEdges}`);
  if (g.mapc !== data.rows.length) probs.push(`map shows ${g.mapc} methods`);
  await p.$eval('#at-s', e => e.scrollIntoView());
  await p.screenshot({ path: `${shots}/at-grid-${scheme}-${width}.png` });
  await clickAll('#at-wrap td[data-c]', 'cells', 't-atlas');
  await clickAll('#at-wrap button.nm', 'names', 't-atlas');
  await clickAll('#at-wrap .sb', 'sort', 't-atlas');
  await clickAll('#at-wrap .sb', 'sort again', 't-atlas');
  await clickAll('#at-det [data-go]', 'detail links', 't-atlas');
  await p.evaluate(() => document.getElementById('at-corr').open = true);
  await clickAll('#at-corr-b button', 'corrections', 't-atlas');
  for (const id of ['store', 'model', 'data', 'act', 'lane', 'needs']) {
    await clickAll(`#at-f-${id} button`, 'filter ' + id, 't-atlas');
    await clickAll(`#at-f-${id} button`, 'filter ' + id + ' off', 't-atlas');
  }
  await p.evaluate(() => { const q = document.getElementById('at-q'); q.value = 'zzzz'; q.dispatchEvent(new Event('input', { bubbles: true })) });
  await check('search none', 't-atlas');
  await p.evaluate(() => { const q = document.getElementById('at-q'); q.value = 'replay'; q.dispatchEvent(new Event('input', { bubbles: true })) });
  await check('search replay', 't-atlas');
  await clickAll('#at-clr', 'clear', 't-atlas');
  // ticks: untick all, tick four (the fourth refused)
  await p.evaluate(() => document.querySelectorAll('#at-wrap input[data-r]:checked').forEach(c => { c.checked = false; c.dispatchEvent(new Event('change', { bubbles: true })) }));
  for (const id of ['qlearn', 'dqn15', 'sac', 'grpo']) await p.evaluate(id => { const c = document.querySelector(`#at-wrap input[data-r=${id}]`); c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true })) }, id);
  const ticked = await p.$$eval('#at-wrap input[data-r]:checked', es => es.length);
  if (ticked !== 3) probs.push('ticks ' + ticked + ' (expected 3)');
  await check('ticks', 't-atlas');
  await p.$eval('#at-cmp', e => e.scrollIntoView());
  await p.screenshot({ path: `${shots}/at-cmp-${scheme}-${width}.png` });
  await clickAll('#at-map-ctl button', 'map model', 't-atlas');
  await p.evaluate(() => document.querySelector('#at-map-ctl button[data-v=all]').click());
  await clickAll('#at-map .mc', 'map chips', 't-atlas');
  await p.$eval('#at-map-s', e => e.scrollIntoView());
  await p.screenshot({ path: `${shots}/at-map-${scheme}-${width}.png` });
  await clickAll('#at-lin g.nd', 'lineage nodes', 't-atlas');
  await clickAll('#at-lin path.eh', 'lineage edges', 't-atlas');
  await p.evaluate(() => document.querySelector('#at-lin g.nd[data-r=ppo]').dispatchEvent(new MouseEvent('click', { bubbles: true })));
  await p.$eval('#at-lin-s', e => e.scrollIntoView());
  await p.screenshot({ path: `${shots}/at-lin-${scheme}-${width}.png`, fullPage: false });
  for (const ch of ['value', 'llm']) {
    await p.evaluate(ch => document.querySelector(`#at-chain button[data-c=${ch}]`).click(), ch);
    await clickAll('#at-steps button', 'steps ' + ch, 't-atlas');
    await clickAll('#at-prev', 'prev', 't-atlas'); await clickAll('#at-next', 'next', 't-atlas');
    for (let i = 0; i < 9; i++) await p.click('#at-next');
    await p.evaluate(() => { const s = document.getElementById('at-scrub'); s.value = 2; s.dispatchEvent(new Event('input', { bubbles: true })) });
    await check('scrub ' + ch, 't-atlas');
    await p.$eval('#at-anim-s', e => e.scrollIntoView());
    await p.screenshot({ path: `${shots}/at-anim-${ch}-${scheme}-${width}.png` });
  }
  await p.select('#at-speed', '1400');
  await p.click('#at-play'); await wait(3200); await p.click('#at-play');
  const moved = await p.$eval('#at-scrub', s => +s.value);
  if (moved === 2) probs.push('play did not advance');
  await check('play', 't-atlas');
  // axis links into the taxonomy
  await p.evaluate(() => document.querySelector('#at-wrap a.axl').click());
  await wait(100);
  const onTax = await p.$eval('#t-tax', e => !e.hidden);
  if (!onTax) probs.push('axis link did not open t-tax');
  // ---------------- taxonomy ----------------
  await p.click('button[data-t=t-tax]');
  await wait(300);
  await check('tax open', 't-tax');
  const nAx = await p.$$eval('#tx-axes .axsec', e => e.length);
  if (nAx !== data.axes.length) probs.push(`tax sections ${nAx}, axes ${data.axes.length}`);
  const oneRows = await p.$$eval('#tx-one tr', e => e.length);
  if (oneRows !== data.axes.length) probs.push(`one-method table ${oneRows} rows`);
  await p.$eval('#tx-s', e => e.scrollIntoView());
  await p.screenshot({ path: `${shots}/tx-top-${scheme}-${width}.png` });
  const ids = data.rows.map(r => r.id);
  for (const id of ids) { await p.select('#tx-m', id); clicks++ }
  await check('tax every method', 't-tax');
  const axIds = data.axes.map(a => a.id);
  for (const x of axIds) { await p.select('#tx-x', x); clicks++; await check('tax x ' + x, 't-tax') }
  for (const y of axIds) { await p.select('#tx-y', y); clicks++ }
  await check('tax y', 't-tax');
  await p.select('#tx-x', 'model'); await p.select('#tx-y', 'data');
  await clickAll('#tx-swap', 'swap', 't-tax');
  await p.$eval('#tx-two-h', e => e.scrollIntoView());
  await p.screenshot({ path: `${shots}/tx-two-${scheme}-${width}.png` });
  await p.$eval('#tx-uv-h', e => e.scrollIntoView());
  await p.screenshot({ path: `${shots}/tx-uv-${scheme}-${width}.png` });
  await clickAll('#tx-nav a', 'nav', 't-tax');
  await clickAll('#t-tax .mc', 'tax chips', 't-tax', 60);
  await clickAll('#tx-one a[data-sec]', 'axis links', 't-tax');
  await p.$eval('#tx-ax-reward', e => e.scrollIntoView());
  await p.screenshot({ path: `${shots}/tx-axis-${scheme}-${width}.png` });
  await p.click('#tx-open'); await wait(100);
  const back = await p.$eval('#t-atlas', e => !e.hidden);
  if (!back) probs.push('"Open it in the atlas" did not switch tab');
  await check('back to atlas', 't-atlas');
  if (errs.length) probs.push(...errs.map(e => 'console: ' + e));
  console.log(`${scheme} ${width}: ${probs.length ? probs.length + ' problems' : 'ok'}`);
  allProbs.push(...probs.map(x => `${scheme} ${width}: ${x}`));
  await p.close();
}
await b.close();
console.log('clicks', clicks);
if (allProbs.length) { console.log(allProbs.slice(0, 40).join('\n')); process.exit(1) }
console.log('ALL OK');
