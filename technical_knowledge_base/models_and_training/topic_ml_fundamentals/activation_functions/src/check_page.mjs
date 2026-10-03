// Exercise every control on the built page: both animations through every step in every mode and gate, the Shazeer
// toggles, the atlas (every function on and off, shading, thresholds, ranges, hover), the real-model tab (every model,
// measure, threshold and layer). Fails on script errors, NaN, undefined or Infinity in visible text; saves close-up
// screenshots of the main visuals to ../.shots/ (light 920 px and dark 390 px).
// usage: node src/check_page.mjs (needs html_utils/node_modules)
import { createRequire } from 'module';import path from 'path';import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(HERE, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = path.resolve(HERE, '../index.html'), shots = path.resolve(HERE, '../.shots');
const b = await puppeteer.launch({ headless: 'shell' });
const out = {};
for (const [scheme, w] of [['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.setViewport({ width: w, height: 900 });
  await p.goto('file://' + file);
  const bad = async (where) => { const t = await p.evaluate(() => { const c = document.body.cloneNode(true); c.querySelectorAll('script,style,.tab[hidden]').forEach(e => e.remove()); c.querySelectorAll('#dsSvg text').forEach(e => { if (e.textContent === 'NaN') e.remove() }); const d = c.querySelector('#dr'); if (d) d.querySelectorAll('#drSvg,#drN,#drP,#drT').forEach(e => e.remove()); return c.textContent.split('not-a-number (NaN)').join('') }); for (const x of ['NaN', 'undefined', 'Infinity']) { const i = t.indexOf(x); if (i >= 0) errs.push(where + ': ' + x + ' near "' + t.slice(Math.max(0, i - 40), i + 20).replace(/\n/g, ' ') + '"') } };
  const badDead = async where => { const t = await p.evaluate(() => ['drN', 'drP'].map(i => document.getElementById(i).textContent).join(' ')); if (/undefined|Infinity|null/.test(t)) errs.push(where + ': ' + t.slice(0, 80)) };
  const click = s => p.evaluate(s => document.querySelector(s).click(), s);
  const slide = async (sel, vals) => { for (const v of vals) await p.evaluate((s, v) => { const e = document.querySelector(s); e.value = v; e.dispatchEvent(new Event('input')) }, sel, v) };
  const shot = async (sel, name) => { try { const e = await p.$(sel); await e.scrollIntoView(); await e.screenshot({ path: shots + '/x-' + name + '-' + scheme + '-' + w + '.png' }) } catch (x) { errs.push('shot ' + sel + ': ' + x.message + ' tab ' + await p.evaluate(() => [...document.querySelectorAll('.tab')].filter(t => !t.hidden).map(t => t.id).join())) } };
  await p.evaluate(() => document.querySelector('button[data-t="t-read"]').click());
  const caps = [];
  // dead units: every run, every epoch
  for (const r of [0, 1, 2]) { await click('#drM [data-r="' + r + '"]'); await click('#drC-p'); const n = await p.evaluate(() => +document.getElementById('drC-s').max);
    for (let i = 0; i <= n; i++) { await p.evaluate(i => { const e = document.getElementById('drC-s'); e.value = i; e.dispatchEvent(new Event('input')) }, i); }
    caps.push(await p.evaluate(() => document.getElementById('drP').innerText)); await bad('dead run ' + r); await badDead('dead run ' + r); if (r === 1) await shot('#dr', 'dead') }
  await click('#drM [data-r="1"]'); await p.evaluate(() => { const e = document.getElementById('drC-s'); e.value = 6; e.dispatchEvent(new Event('input')) });
  caps.push(await p.evaluate(() => document.getElementById('drP').innerText));
  await shot('#ds', 'sweep');
  // gated FFN: both modes, every gate, every step
  for (const m of ['plain', 'glu']) { await click('#gfM [data-m="' + m + '"]');
    for (const g of (m === 'glu' ? ['silu', 'sigmoid', 'relu', 'gelu', 'id'] : ['silu'])) { await p.evaluate(g => { const e = document.getElementById('gfG'); e.value = g; e.dispatchEvent(new Event('change')) }, g);
      const n = await p.evaluate(() => +document.getElementById('gfC-s').max);
      for (let i = 0; i <= n; i++) { await p.evaluate(i => { const e = document.getElementById('gfC-s'); e.value = i; e.dispatchEvent(new Event('input')) }, i); await bad('glu ' + m + ' ' + g + ' ' + i) }
      if (g === 'silu') { caps.push(await p.evaluate(() => document.getElementById('gfP').innerText)); await shot('#gf', 'ffn-' + m) } } }
  await p.evaluate(() => { const e = document.getElementById('gfG'); e.value = 'silu'; e.dispatchEvent(new Event('change')) });
  for (const k of ['p65', 'p524', 'glue', 'sglue']) { await click('#szM [data-k="' + k + '"]'); await bad('sz ' + k) }
  await click('#szM [data-k="p65"]'); await shot('#sz', 'shazeer'); await shot('#fw', 'widths');
  const inside = await p.evaluate(() => ['in-opt', 'in-gpt', 'in-smol', 'in-mir', 'dr-opt'].map(i => document.getElementById(i).innerText));
  // atlas
  await click('button[data-t="t-atlas"]');
  const ids = await p.$$eval('#atB input', a => a.map(x => x.dataset.k));
  for (const k of ids) { await p.evaluate(k => document.querySelector('#atB input[data-k="' + k + '"]').click(), k) }
  for (const r of ['2', '4', '10', '6']) { await p.evaluate(r => { const e = document.getElementById('atR'); e.value = r; e.dispatchEvent(new Event('change')) }, r); await bad('atlas range ' + r) }
  for (const k of ids) { await p.evaluate(k => { const e = document.getElementById('atS'); e.value = k; e.dispatchEvent(new Event('change')) }, k); await slide('#atE', [0, 40, 20]); await bad('atlas shade ' + k) }
  const svg = await p.$('#atF svg'); const bb = await svg.boundingBox(); await p.mouse.move(bb.x + bb.width * 0.3, bb.y + bb.height / 2); await bad('atlas hover');
  for (const k of ids) { await p.evaluate(k => document.querySelector('#atB input[data-k="' + k + '"]').click(), k) } // all off
  await bad('atlas none'); for (const k of ['sigmoid', 'relu', 'gelu', 'silu']) await p.evaluate(k => document.querySelector('#atB input[data-k="' + k + '"]').click(), k);
  await p.evaluate(() => { const e = document.getElementById('atS'); e.value = 'relu'; e.dispatchEvent(new Event('change')) });
  await shot('#at', 'atlas'); const tbl = await p.evaluate(() => document.getElementById('atT').innerText); await shot('#atT', 'atlas-table');
  // real models
  await click('button[data-t="t-real"]');
  for (const m of ['opt', 'gpt2', 'smol']) { await click('#rlM [data-m="' + m + '"]');
    for (const k of ['near', 'neg', 'dead']) { await click('#rlK [data-k="' + k + '"]');
      if (k === 'near') await slide('#rlT', [0, 40, 13, 30]); if (k === 'dead') await slide('#rlP', [0, 31, 10, 0]);
      await p.evaluate(() => { const r = document.querySelectorAll('#rlSvg rect[data-i]'); r[2].dispatchEvent(new Event('click')) });
      await bad('real ' + m + ' ' + k) } }
  await click('#rlM [data-m="opt"]'); await click('#rlK [data-k="dead"]'); await p.evaluate(() => document.querySelectorAll('#rlSvg rect[data-i]')[3].dispatchEvent(new Event('click')));
  await shot('#rl', 'real');
  await click('button[data-t="t-more"]'); await bad('more');
  const box = await p.evaluate(() => { const d = document.getElementById('jsErr'); return d && !d.hidden ? d.textContent : '' }); if (box) errs.push('errbox: ' + box);
  out[scheme] = { errs, caps, inside, tbl: tbl.split('\n').slice(0, 6) };
  await p.close();
}
console.log(JSON.stringify(out, null, 1));
await b.close();
