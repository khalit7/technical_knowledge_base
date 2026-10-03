// Click every control of the Defaults across models tab (t-defaults) at 390 px dark and 920 px light:
// no console errors, no NaN / undefined / null / Infinity in the text, no sideways page scroll, error box hidden.
// Also checks the grid against data/defaults.json (every row and column drawn, every not-disclosed cell coloured).
// Screenshots go to ../../.shots/df-*.png (gitignored).
// usage: node src/defaults/check_defaults.mjs   (puppeteer from html_utils/node_modules)
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
const data = JSON.parse(fs.readFileSync(path.resolve(here, '../data/defaults.json'), 'utf8'));
const wait = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined, args: process.platform === 'linux' ? ['--no-sandbox'] : [] });
let bad = 0, clicks = 0;
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + page);
  await p.click('button[data-t=t-defaults]');
  await wait(300);
  const probs = [];
  const check = async label => {
    const r = await p.evaluate(() => {
      const t = document.getElementById('t-defaults').innerText;
      const m = t.match(/.{0,30}\b(NaN|undefined|null|Infinity)\b.{0,30}/);
      const box = document.getElementById('jsErr');
      const svgBad = [...document.querySelectorAll('#t-defaults svg *')].some(e => [...e.attributes].some(a => /NaN|undefined|Infinity/.test(a.value)));
      return { bad: m ? m[0] : '', side: document.documentElement.scrollWidth > innerWidth, box: box && !box.hidden ? box.textContent : '', svgBad };
    });
    if (r.bad) probs.push(label + ': text "' + r.bad + '"');
    if (r.side) probs.push(label + ': sideways scroll');
    if (r.box) probs.push(label + ': error box ' + r.box);
    if (r.svgBad) probs.push(label + ': NaN in an SVG attribute');
  };
  // click each element matching sel, one at a time (re-query each time: renders replace the DOM)
  const clickAll = async (sel, label, max = 9999) => {
    const n = await p.$$eval(sel, es => es.length);
    for (let i = 0; i < Math.min(n, max); i++) {
      await p.evaluate((s, i) => { const e = document.querySelectorAll(s)[i]; if (e) e.dispatchEvent(new MouseEvent('click', { bubbles: true })) }, sel, i);
      clicks++;
    }
    await check(label);
    return n;
  };
  await check('open');
  // grid matches the data
  const g = await p.evaluate(() => ({ rows: document.querySelectorAll('#df-wrap tbody tr').length, cells: document.querySelectorAll('#df-wrap td[data-c]').length, nd: document.querySelectorAll('#df-wrap td.k-nd').length }));
  const nd = data.rows.reduce((s, r) => s + Object.values(r.cells).filter(x => x.kind === 'nd').length, 0);
  if (g.rows !== data.rows.length || g.cells !== data.rows.length * data.columns.length) probs.push(`grid ${g.rows} rows ${g.cells} cells, data ${data.rows.length} x ${data.columns.length}`);
  if (g.nd !== nd) probs.push(`not-disclosed cells coloured ${g.nd}, data ${nd}`);
  await p.$eval('#df-s', e => e.scrollIntoView());
  await p.screenshot({ path: `${shots}/df-grid-${scheme}-${width}.png` });
  await clickAll('#df-wrap td[data-c]', 'cells');
  await clickAll('#df-wrap button.nm', 'model names');
  await clickAll('#df-wrap .dfsb', 'sort headers');
  await clickAll('#df-wrap .dfsb', 'sort headers again');
  for (const id of ['df-era', 'df-col', 'df-grp']) await clickAll(`#${id} button`, id);
  await p.evaluate(() => document.querySelector('#df-era button[data-v=all]').click());
  await p.evaluate(() => document.querySelector('#df-grp button[data-v=all]').click());
  await clickAll('#df-clr', 'clear');
  // tick three, then a fourth (refused)
  for (const id of ['alexnet', 'bert', 'smollm3', 'dsv3']) {
    await p.evaluate(id => { const c = document.querySelector(`#df-wrap input[data-r=${id}]`); c.checked = !c.checked; c.dispatchEvent(new Event('change', { bubbles: true })) }, id);
  }
  const ticked = await p.$$eval('#df-wrap input[data-r]:checked', es => es.length);
  if (ticked !== 3) probs.push('ticks ' + ticked + ' (expected 3)');
  await check('ticks');
  await p.$eval('#df-cmp', e => e.scrollIntoView());
  await p.screenshot({ path: `${shots}/df-cmp-${scheme}-${width}.png` });
  // morph
  await clickAll('#df-mo-pre button', 'morph presets');
  await p.select('#df-mo-a', 'resnet50'); await p.select('#df-mo-b', 'qwen3'); await check('morph selects');
  for (let i = 0; i < 16; i++) await p.click('#df-mo-fwd');
  await check('morph forward');
  for (let i = 0; i < 4; i++) await p.click('#df-mo-back');
  await p.$eval('#df-mo-scr', e => { e.value = 7; e.dispatchEvent(new Event('input')) });
  await clickAll('#df-mo-pre button', 'morph presets again', 1);
  await p.select('#df-mo-sp', '2');
  await p.$eval('#df-mo', e => e.scrollIntoView({ block: 'center' }));
  await p.click('#df-mo-play'); await wait(2600); await check('morph playing');
  const k = await p.$eval('#df-mo-scr', e => +e.value);
  if (k < 1) probs.push('morph did not advance while playing');
  await p.click('#df-mo-play');
  await p.$eval('#df-mo-pre', e => e.scrollIntoView());
  await p.screenshot({ path: `${shots}/df-morph-${scheme}-${width}.png` });
  // timeline, convergence, disclosure
  await clickAll('#df-tl circle[data-r]', 'timeline dots', 40);
  await p.$eval('#df-tl', e => e.scrollIntoView());
  await p.screenshot({ path: `${shots}/df-timeline-${scheme}-${width}.png` });
  const nch = await p.$$eval('#df-cv-ch button', es => es.length);
  for (let i = 0; i < nch; i++) {
    await p.evaluate(i => document.querySelectorAll('#df-cv-ch button')[i].click(), i);
    await clickAll('#df-cv circle[data-r]', 'convergence dots ' + i, 6);
  }
  await p.evaluate(() => document.querySelector('#df-cv-ch button').click());
  await p.$eval('#df-cv-ch', e => e.scrollIntoView());
  await p.screenshot({ path: `${shots}/df-converge-${scheme}-${width}.png` });
  await clickAll('#df-dv button', 'disclosure view');
  await p.evaluate(() => document.querySelector('#df-dv button[data-v=col]').click());
  await p.$eval('#df-disc', e => e.scrollIntoView());
  await p.screenshot({ path: `${shots}/df-disc-${scheme}-${width}.png` });
  await p.$eval('#df-corr', e => e.scrollIntoView());
  await p.screenshot({ path: `${shots}/df-corr-${scheme}-${width}.png` });
  // resize while open
  await p.setViewport({ width: width === 390 ? 360 : 1100, height: 900 }); await wait(300); await check('resized');
  if (errs.length) probs.push('errors: ' + errs.join(' | '));
  console.log(`${scheme} ${width}: ${probs.length ? probs.join('\n  ') : 'ok'}`);
  bad += probs.length;
  await p.close();
}
await b.close();
console.log('clicks', clicks, 'problems', bad);
process.exit(bad ? 1 : 0);
