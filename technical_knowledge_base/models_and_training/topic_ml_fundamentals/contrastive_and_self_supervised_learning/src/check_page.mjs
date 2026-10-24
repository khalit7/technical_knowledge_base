// Exercise every control on the built page, all in the Reading tab: the hero's model switch, the triplet lab (model,
// anchor, margin; its batch counts against recompute.py), the InfoNCE lab (sliders, model switch, symmetric box, row
// clicks), the two-branch diagram's six designs, the circle animation, the masking animation (MAE at three ratios,
// I-JEPA), every collapse-lab pair through every snapshot, and the family-tree chips. Checks that nothing plays before
// the reader acts (also under reduced motion); fails on any script error, NaN, undefined or Infinity in visible text,
// or sideways scroll. usage: node src/check_page.mjs (needs html_utils/node_modules)
import { createRequire } from 'module'; import path from 'path'; import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(HERE, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = path.resolve(HERE, '../index.html');
const b = await puppeteer.launch({ headless: 'shell' });
const p = await b.newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
let checks = 0;
for (const w of [390, 920]) {
  await p.setViewport({ width: w, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: w === 390 ? 'dark' : 'light' }, { name: 'prefers-reduced-motion', value: w === 390 ? 'reduce' : 'no-preference' }]);
  await p.goto('file://' + file);
  const bad = async (where) => { checks++; const t = await p.evaluate(() => document.body.innerText + (document.getElementById('jsErr').hidden ? '' : ' JSERR')); for (const x of ['NaN', 'undefined', 'Infinity', 'JSERR']) if (t.includes(x)) errs.push(w + ' ' + where + ': ' + x) };
  const tab = async t => p.evaluate(t => document.querySelector('#tabs button[data-t="' + t + '"]').click(), t);
  const fwd = async (id, n) => { for (let i = 0; i < n; i++) await p.evaluate(id => document.getElementById(id + '-f').click(), id) };
  await tab('t-read');
  // nothing moves before the reader acts: every animation still on its first step after scrolling through
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise(r => setTimeout(r, 120)) } scrollTo(0, 0) });
  await new Promise(r => setTimeout(r, 1500));
  for (const id of ['sp-ctl', 'mk-ctl', 'cl-ctl']) { const v = await p.evaluate(id => document.getElementById(id + '-s').value, id); checks++; if (v !== '0') errs.push(w + ' ' + id + ' moved by itself to step ' + v) }
  const side = async (where) => { checks++; if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) errs.push(w + ' ' + where + ': sideways scroll') };
  for (const m of ['bert', 'simcse']) { await p.evaluate(m => document.querySelector('#hr-m [data-m="' + m + '"]').click(), m); await bad('hero ' + m) }
  // triplet lab: batch counts must match recompute.py
  const want = { 'bert 0.2': 21, 'simcse 0.2': 1, 'bert 0.8': 1825, 'simcse 0.8': 153 };
  for (const k in want) { const [m, a] = k.split(' '); const got = await p.evaluate((m, a) => CS_TRIP(m, +a).active, m, a); checks++; if (got !== want[k]) errs.push('triplet active ' + k + ' = ' + got + ', want ' + want[k]) }
  for (const m of ['bert', 'simcse']) {
    await p.evaluate(m => document.querySelector('#tr-m [data-m="' + m + '"]').click(), m);
    for (const an of [1, 31, 48]) for (const al of [0, 20, 100]) {
      await p.evaluate((an, al) => { const a = document.getElementById('tr-a'); a.value = an; a.dispatchEvent(new Event('input')); const c = document.getElementById('tr-al'); c.value = al; c.dispatchEvent(new Event('input')) }, an, al);
      await bad('triplet ' + m + ' ' + an + ' ' + al); await side('triplet');
    }
  }
  for (const m of ['bert', 'simcse']) {
    await p.evaluate(m => document.querySelector('#rb-m [data-m="' + m + '"]').click(), m);
    for (const sym of [false, true]) {
      await p.evaluate(s => { const e = document.getElementById('rb-sym'); e.checked = s; e.dispatchEvent(new Event('change')) }, sym);
      for (const n of [2, 3, 16, 48]) for (const t of [0, 35, 100]) {
        await p.evaluate((n, t) => { const a = document.getElementById('rb-n'); a.value = n; a.dispatchEvent(new Event('input')); const c = document.getElementById('rb-t'); c.value = t; c.dispatchEvent(new Event('input')) }, n, t);
        await bad('batch ' + m + ' ' + sym + ' ' + n + ' ' + t);
      }
    }
  }
  await p.evaluate(() => { const s = document.querySelector('#rb-hm svg'), r = s.getBoundingClientRect(); s.dispatchEvent(new MouseEvent('click', { clientX: r.left + 5, clientY: r.bottom - 2, bubbles: true })) });
  const ai = await p.evaluate(() => document.getElementById('rb-ai').textContent); if (!ai.startsWith('48')) errs.push(w + ' row click gave ' + ai); await bad('row click');
  for (const m of ['simclr', 'moco', 'byol', 'simsiam', 'dino', 'vicreg']) { await p.evaluate(m => document.querySelector('#ar-seg [data-m="' + m + '"]').click(), m); await bad('arch ' + m); await side('arch ' + m) }
  for (const k of ['infonce_t05', 'infonce']) { await p.evaluate(k => document.querySelector('#sp-seg [data-k="' + k + '"]').click(), k); await fwd('sp-ctl', 24); await bad('sphere ' + k) }
  for (const r of ['0.5', '0.75', '0.9']) { await p.evaluate(r => { document.querySelector('#mk-m [data-v="mae"]').click(); document.querySelector('#mk-r [data-v="' + r + '"]').click() }, r); await fwd('mk-ctl', 6); await bad('mae ' + r) }
  await p.evaluate(() => document.querySelector('#mk-m [data-v="ij"]').click()); await fwd('mk-ctl', 6); await bad('ijepa');
  const np = await p.$$eval('#cl-pair button', a => a.length);
  for (let i = 0; i < np; i++) { await p.evaluate(i => document.querySelectorAll('#cl-pair button')[i].click(), i); await fwd('cl-ctl', 16); await bad('collapse pair ' + i); await side('collapse') }
  await p.evaluate(() => document.querySelectorAll('details').forEach(d => d.open = true));
  await p.evaluate(() => document.querySelectorAll('#ft-chips button').forEach(x => { x.click(); x.click() })); await bad('tree'); await side('details open');
  await tab('t-more'); await bad('more');
}
await b.close();
console.log('checks', checks, 'errors', errs.length ? errs : 'none');
process.exit(errs.length ? 1 : 0);
